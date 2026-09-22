import os
import tempfile
import datetime
import unittest
from unittest.mock import MagicMock
import numpy as np
import pandas as pd
from application.providers.yfinance_prov import YFinanceProvider
from application.database import DatabaseManager
from application.pipeline import heal_split_anomalies

class TestSplitAdjustment(unittest.TestCase):
    def setUp(self):
        self.provider = YFinanceProvider()

    def test_unadjusted_reverse_split(self):
        """Tests that a 1-for-50 reverse split (e.g., NFE) where historical prices were unadjusted is properly scaled."""
        dates = [datetime.date(2026, 9, 10), datetime.date(2026, 9, 11), datetime.date(2026, 9, 14), datetime.date(2026, 9, 15)]
        # Yahoo returned pre-split prices at ~$0.30, and post-split price at ~$13.50.
        # On split date 2026-09-14, close was NaN and Stock Splits was 0.02.
        df = pd.DataFrame({
            "date": dates,
            "open": [0.29, 0.30, np.nan, 14.0],
            "high": [0.31, 0.33, np.nan, 14.5],
            "low": [0.28, 0.29, np.nan, 13.0],
            "close": [0.30, 0.32, np.nan, 13.5],
            "volume": [1000000.0, 1500000.0, 0.0, 50000.0],
            "stock_splits": [0.0, 0.0, 0.02, 0.0]
        })

        adjusted = self.provider._adjust_unadjusted_splits(df, symbol="NFE")

        # Verify pre-split prices multiplied by 50.0 (1.0 / 0.02)
        self.assertAlmostEqual(adjusted.loc[0, "close"], 15.0)   # 0.30 * 50
        self.assertAlmostEqual(adjusted.loc[1, "close"], 16.0)   # 0.32 * 50
        self.assertAlmostEqual(adjusted.loc[0, "open"], 14.5)    # 0.29 * 50

        # Verify pre-split volume scaled down by 0.02
        self.assertEqual(adjusted.loc[0, "volume"], 20000.0)     # 1,000,000 * 0.02
        self.assertEqual(adjusted.loc[1, "volume"], 30000.0)     # 1,500,000 * 0.02

        # Verify post-split prices remain unchanged
        self.assertAlmostEqual(adjusted.loc[3, "close"], 13.5)
        self.assertEqual(adjusted.loc[3, "volume"], 50000.0)

        # Verify stock_splits ratio 0.02 propagated to post-split bar index 3
        self.assertEqual(adjusted.loc[3, "stock_splits"], 0.02)

        # Verify dropna keeps the post-split bar with the split ratio
        cleaned = adjusted.dropna(subset=["close"])
        self.assertEqual(len(cleaned), 3)
        self.assertIn(0.02, cleaned["stock_splits"].values)

    def test_already_adjusted_split(self):
        """Tests that a 10-for-1 forward split (e.g., NVDA) that Yahoo already back-adjusted is NOT modified."""
        dates = [datetime.date(2024, 6, 6), datetime.date(2024, 6, 7), datetime.date(2024, 6, 10), datetime.date(2024, 6, 11)]
        df = pd.DataFrame({
            "date": dates,
            "open": [120.0, 120.5, 121.0, 121.5],
            "high": [122.0, 122.5, 123.0, 123.5],
            "low": [119.0, 119.5, 120.0, 120.5],
            "close": [120.5, 121.0, 121.5, 122.0],
            "volume": [50000000.0, 52000000.0, 48000000.0, 51000000.0],
            "stock_splits": [0.0, 0.0, 10.0, 0.0]
        })

        adjusted = self.provider._adjust_unadjusted_splits(df, symbol="NVDA")

        # Prices and volumes must be untouched
        self.assertAlmostEqual(adjusted.loc[0, "close"], 120.5)
        self.assertAlmostEqual(adjusted.loc[1, "close"], 121.0)
        self.assertEqual(adjusted.loc[0, "volume"], 50000000.0)
        self.assertAlmostEqual(adjusted.loc[2, "close"], 121.5)

    def test_unadjusted_forward_split(self):
        """Tests an unadjusted 2-for-1 forward split (stock halves, volume doubles)."""
        dates = [datetime.date(2025, 3, 3), datetime.date(2025, 3, 4), datetime.date(2025, 3, 5)]
        # Pre-split trading at 100, post-split at 50, split ratio 2.0
        df = pd.DataFrame({
            "date": dates,
            "open": [99.0, 100.0, 49.0],
            "high": [101.0, 102.0, 51.0],
            "low": [98.0, 99.0, 48.0],
            "close": [100.0, 100.0, 50.0],
            "volume": [100000.0, 120000.0, 200000.0],
            "stock_splits": [0.0, 0.0, 2.0]
        })

        adjusted = self.provider._adjust_unadjusted_splits(df, symbol="TEST")

        # Pre-split prices should be halved (1.0 / 2.0 = 0.5)
        self.assertAlmostEqual(adjusted.loc[0, "close"], 50.0)
        self.assertAlmostEqual(adjusted.loc[1, "close"], 50.0)
        # Pre-split volume should be doubled
        self.assertEqual(adjusted.loc[0, "volume"], 200000.0)
        self.assertEqual(adjusted.loc[1, "volume"], 240000.0)
        # Post-split prices remain unchanged
        self.assertAlmostEqual(adjusted.loc[2, "close"], 50.0)

    def test_already_adjusted_split_with_nan_on_split_date(self):
        """Tests that if a split date bar has NaN close for an already-adjusted split, ratio propagates without modifying prices."""
        dates = [datetime.date(2025, 1, 2), datetime.date(2025, 1, 3), datetime.date(2025, 1, 4)]
        df = pd.DataFrame({
            "date": dates,
            "open": [50.0, np.nan, 51.0],
            "high": [52.0, np.nan, 53.0],
            "low": [49.0, np.nan, 50.0],
            "close": [50.5, np.nan, 51.5],
            "volume": [10000.0, 0.0, 12000.0],
            "stock_splits": [0.0, 2.0, 0.0]
        })

        adjusted = self.provider._adjust_unadjusted_splits(df, symbol="TEST")

        # Prices must not change (51.5 / 50.5 = 1.02, not 0.5)
        self.assertAlmostEqual(adjusted.loc[0, "close"], 50.5)
        # But split ratio 2.0 must propagate to bar index 2
        self.assertEqual(adjusted.loc[2, "stock_splits"], 2.0)

    def test_multiple_splits_with_unadjusted_recent_split(self):
        """Tests multiple splits: an older adjusted split followed by a newer unadjusted split (like UCAR)."""
        dates = [
            datetime.date(2024, 1, 1),
            datetime.date(2024, 1, 2), # Split 1: 0.1 ratio, already adjusted (~10 -> ~10)
            datetime.date(2026, 9, 8),
            datetime.date(2026, 9, 9), # Split 2: 0.05 ratio, unadjusted (~0.50 -> ~10.0)
            datetime.date(2026, 9, 10),
        ]
        df = pd.DataFrame({
            "date": dates,
            "open": [9.9, 10.0, 0.48, np.nan, 9.8],
            "high": [10.2, 10.5, 0.52, np.nan, 10.2],
            "low": [9.8, 9.7, 0.45, np.nan, 9.5],
            "close": [10.0, 10.1, 0.50, np.nan, 10.0],
            "volume": [100000.0, 100000.0, 100000.0, 0.0, 5000.0],
            "stock_splits": [0.0, 0.1, 0.0, 0.05, 0.0]
        })

        adjusted = self.provider._adjust_unadjusted_splits(df, symbol="UCAR")

        # Split 2 was unadjusted (ratio 0.05, factor 20x).
        # Bars before 2026-09-09 should be scaled by 20x.
        # Date 2026-09-08 close: 0.50 * 20 = 10.0
        self.assertAlmostEqual(adjusted.loc[2, "close"], 10.0)
        # Date 2024-01-02 close: 10.1 * 20 = 202.0
        self.assertAlmostEqual(adjusted.loc[1, "close"], 202.0)
        # Date 2024-01-01 close: 10.0 * 20 = 200.0
        self.assertAlmostEqual(adjusted.loc[0, "close"], 200.0)
        # Post-split bar at 2026-09-10 close remains 10.0
        self.assertAlmostEqual(adjusted.loc[4, "close"], 10.0)
        # Split ratio 0.05 propagated to bar index 4
        self.assertEqual(adjusted.loc[4, "stock_splits"], 0.05)


class TestSplitHealingPipeline(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_split.db")
        self.db = DatabaseManager(self.db_path)
        with self.db.get_connection() as conn:
            conn.execute("""
                INSERT INTO symbols (symbol, name, exchange, asset_type) 
                VALUES ('MNST', 'Monster', 'NASDAQ', 'stock'),
                       ('BIOT', 'Biotech Inc', 'NASDAQ', 'stock');
            """)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_heal_split_anomalies_resolves_unadjusted_split(self):
        """Tests that an unadjusted stock split jump is detected, verified against provider, and healed."""
        # Unadjusted bars in DB: 2:1 split occurred on 2026-09-03, but pre-split close was 100/102 and post-split is 51/52
        db_bars = pd.DataFrame({
            "symbol": ["MNST"] * 4,
            "date": [datetime.date(2026, 9, 1), datetime.date(2026, 9, 2), datetime.date(2026, 9, 3), datetime.date(2026, 9, 4)],
            "open": [99.0, 100.0, 50.0, 51.0],
            "high": [101.0, 103.0, 52.0, 53.0],
            "low": [98.0, 99.0, 49.0, 50.0],
            "close": [100.0, 102.0, 51.0, 52.0],
            "volume": [1000.0, 1200.0, 2400.0, 2200.0]
        })
        self.db.upsert_daily_bars(db_bars)

        # Mock provider returns properly back-adjusted clean bars
        clean_bars = pd.DataFrame({
            "symbol": ["MNST"] * 4,
            "date": [datetime.date(2026, 9, 1), datetime.date(2026, 9, 2), datetime.date(2026, 9, 3), datetime.date(2026, 9, 4)],
            "open": [49.5, 50.0, 50.0, 51.0],
            "high": [50.5, 51.5, 52.0, 53.0],
            "low": [49.0, 49.5, 49.0, 50.0],
            "close": [50.0, 51.0, 51.0, 52.0],
            "volume": [2000.0, 2400.0, 2400.0, 2200.0],
            "stock_splits": [0.0, 0.0, 2.0, 0.0]
        })

        mock_provider = MagicMock()
        mock_provider.fetch_daily_bars.return_value = clean_bars

        repaired = heal_split_anomalies(
            db=self.db,
            price_provider=mock_provider,
            full_lookback_date=datetime.date(2025, 1, 1),
            full_scan=True
        )

        self.assertEqual(repaired, ["MNST"])

        # Verify bars in DB are now healed to clean prices
        with self.db.get_connection() as conn:
            rows = conn.execute("SELECT date, close, volume FROM daily_bars WHERE symbol = 'MNST' ORDER BY date").fetchall()
        self.assertEqual(len(rows), 4)
        # Pre-split closes are now 50.0 and 51.0 (healed), not 100.0 and 102.0
        self.assertAlmostEqual(rows[0][1], 50.0)
        self.assertAlmostEqual(rows[1][1], 51.0)
        self.assertAlmostEqual(rows[2][1], 51.0)
        self.assertAlmostEqual(rows[3][1], 52.0)

    def test_heal_split_anomalies_ignores_genuine_market_volatility(self):
        """Tests that a genuine crash/surge (without split resolution in clean data) is recognized and not modified."""
        db_bars = pd.DataFrame({
            "symbol": ["BIOT"] * 3,
            "date": [datetime.date(2026, 9, 1), datetime.date(2026, 9, 2), datetime.date(2026, 9, 3)],
            "open": [10.0, 5.0, 4.8],
            "high": [10.2, 5.2, 5.0],
            "low": [9.8, 4.6, 4.5],
            "close": [10.0, 4.9, 4.8],
            "volume": [100000.0, 500000.0, 200000.0]
        })
        self.db.upsert_daily_bars(db_bars)

        # Provider also returns the genuine crash (ratio is still 4.9 / 10.0 = 0.49, no stock_splits)
        clean_bars = pd.DataFrame({
            "symbol": ["BIOT"] * 3,
            "date": [datetime.date(2026, 9, 1), datetime.date(2026, 9, 2), datetime.date(2026, 9, 3)],
            "open": [10.0, 5.0, 4.8],
            "high": [10.2, 5.2, 5.0],
            "low": [9.8, 4.6, 4.5],
            "close": [10.0, 4.9, 4.8],
            "volume": [100000.0, 500000.0, 200000.0],
            "stock_splits": [0.0, 0.0, 0.0]
        })

        mock_provider = MagicMock()
        mock_provider.fetch_daily_bars.return_value = clean_bars

        repaired = heal_split_anomalies(
            db=self.db,
            price_provider=mock_provider,
            full_lookback_date=datetime.date(2025, 1, 1),
            full_scan=True
        )

        # Must not repair genuine market moves
        self.assertEqual(repaired, [])

        # Bars remain unchanged
        with self.db.get_connection() as conn:
            rows = conn.execute("SELECT date, close FROM daily_bars WHERE symbol = 'BIOT' ORDER BY date").fetchall()
        self.assertEqual(len(rows), 3)
        self.assertAlmostEqual(rows[0][1], 10.0)
        self.assertAlmostEqual(rows[1][1], 4.9)


if __name__ == "__main__":
    unittest.main()

