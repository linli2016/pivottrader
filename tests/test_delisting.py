import os
import unittest
import tempfile
import pandas as pd
from application.database import DatabaseManager
from application.services.database import DatabaseService


class TestDelistingHandling(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_delisting.db")
        self.db = DatabaseManager(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_universe_reconciliation_deactivates_missing_symbols(self):
        initial_symbols = [
            {"symbol": "AAPL", "exchange": "NASDAQ", "name": "Apple Inc", "asset_type": "Common Stock", "active": True},
            {"symbol": "MSFT", "exchange": "NASDAQ", "name": "Microsoft Corp", "asset_type": "Common Stock", "active": True},
            {"symbol": "WBS", "exchange": "NYSE", "name": "Webster Financial", "asset_type": "Common Stock", "active": True},
            {"symbol": "NTZ", "exchange": "NYSE", "name": "Natuzzi", "asset_type": "Common Stock", "active": True},
        ]
        self.db.upsert_symbols(initial_symbols)

        # All 4 should be active
        active_syms = self.db.get_active_symbols()
        self.assertEqual(active_syms, ["AAPL", "MSFT", "NTZ", "WBS"])

        # Reconcile with a new universe that no longer has WBS or NTZ
        new_active_universe = ["AAPL", "MSFT"]
        deactivated_count = self.db.deactivate_missing_symbols(new_active_universe)
        self.assertEqual(deactivated_count, 2)

        # Only AAPL and MSFT should remain active
        active_syms_after = self.db.get_active_symbols()
        self.assertEqual(active_syms_after, ["AAPL", "MSFT"])

        # Check database records for deactivated symbols
        with self.db.get_connection() as conn:
            wbs_row = conn.execute("SELECT active, delisted_date FROM symbols WHERE symbol = 'WBS'").fetchone()
            self.assertFalse(wbs_row[0])
            self.assertIsNotNone(wbs_row[1])

            aapl_row = conn.execute("SELECT active, delisted_date FROM symbols WHERE symbol = 'AAPL'").fetchone()
            self.assertTrue(aapl_row[0])
            self.assertIsNone(aapl_row[1])

    def test_symbol_reactivation_on_upsert(self):
        initial_symbols = [
            {"symbol": "AAPL", "exchange": "NASDAQ", "name": "Apple Inc", "asset_type": "Common Stock", "active": True},
            {"symbol": "WBS", "exchange": "NYSE", "name": "Webster Financial", "asset_type": "Common Stock", "active": True},
        ]
        self.db.upsert_symbols(initial_symbols)

        # Deactivate WBS
        self.db.deactivate_missing_symbols(["AAPL"])
        self.assertEqual(self.db.get_active_symbols(), ["AAPL"])

        # Reactivate WBS by upserting it in an incoming active universe
        relisted_symbols = [
            {"symbol": "WBS", "exchange": "NYSE", "name": "Webster Financial Re-listed", "asset_type": "Common Stock", "active": True}
        ]
        self.db.upsert_symbols(relisted_symbols)

        # WBS should be active again and delisted_date reset to None
        self.assertEqual(self.db.get_active_symbols(), ["AAPL", "WBS"])
        with self.db.get_connection() as conn:
            wbs_row = conn.execute("SELECT active, delisted_date FROM symbols WHERE symbol = 'WBS'").fetchone()
            self.assertTrue(wbs_row[0])
            self.assertIsNone(wbs_row[1])

    def test_deactivate_symbols_batch(self):
        symbols = [
            {"symbol": "AAPL", "exchange": "NASDAQ", "name": "Apple", "asset_type": "Common Stock", "active": True},
            {"symbol": "GOOG", "exchange": "NASDAQ", "name": "Google", "asset_type": "Common Stock", "active": True},
            {"symbol": "AMZN", "exchange": "NASDAQ", "name": "Amazon", "asset_type": "Common Stock", "active": True},
        ]
        self.db.upsert_symbols(symbols)

        count = self.db.deactivate_symbols(["GOOG", "AMZN"])
        self.assertEqual(count, 2)
        self.assertEqual(self.db.get_active_symbols(), ["AAPL"])

        # Calling it again on already inactive symbols should deactivate 0
        count_again = self.db.deactivate_symbols(["GOOG"])
        self.assertEqual(count_again, 0)

    def test_watchlist_items_return_active_status_and_last_trade_date(self):
        symbols = [
            {"symbol": "AAPL", "exchange": "NASDAQ", "name": "Apple", "asset_type": "Common Stock", "active": True},
            {"symbol": "DELISTED", "exchange": "NYSE", "name": "Old Co", "asset_type": "Common Stock", "active": True},
        ]
        self.db.upsert_symbols(symbols)

        # Deactivate DELISTED
        self.db.deactivate_symbols(["DELISTED"])

        # Create dummy daily bars
        bars_df = pd.DataFrame([
            {"symbol": "AAPL", "date": "2026-09-18", "open": 220.0, "high": 225.0, "low": 219.0, "close": 224.0, "volume": 50000000},
            {"symbol": "DELISTED", "date": "2026-08-01", "open": 10.0, "high": 10.5, "low": 9.8, "close": 10.2, "volume": 120000},
        ])
        self.db.upsert_daily_bars(bars_df)

        # Add both to Default watchlist (ID 1)
        self.db.add_watchlist_item(1, "AAPL")
        self.db.add_watchlist_item(1, "DELISTED")

        items = self.db.get_watchlist_items(1)
        item_map = {item["symbol"]: item for item in items}

        self.assertIn("AAPL", item_map)
        self.assertIn("DELISTED", item_map)

        self.assertTrue(item_map["AAPL"]["active"])
        self.assertEqual(item_map["AAPL"]["last_trade_date"], "2026-09-18")

        self.assertFalse(item_map["DELISTED"]["active"])
        self.assertEqual(item_map["DELISTED"]["last_trade_date"], "2026-08-01")


if __name__ == "__main__":
    unittest.main()

