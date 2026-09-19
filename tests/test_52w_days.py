import os
import tempfile
import unittest
import pandas as pd
from application.database import DatabaseManager
from application.engine.momentum import MomentumEngine
from application.engine.expression import ScanExpressionEngine


class TestDays52wHigh(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_momentum.db")
        self.db = DatabaseManager(self.db_path)
        self.momentum_engine = MomentumEngine(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_expression_catalog(self):
        """Verifies DAYS_52W_HIGH and aliases are recognized in ScanExpressionEngine."""
        for var in ["DAYS_52W_HIGH", "DAYS_SINCE_52W_HIGH", "HIGH_52W_DAYS"]:
            expr = f"{var} <= 15 AND DIST_52W_HIGH <= 5.0"
            res = ScanExpressionEngine.validate(expr)
            self.assertTrue(res["valid"])
            self.assertIn("b.days_since_52w_high <= 15", res["sql"])

    def test_batch_days_since_52w_high_and_ties(self):
        """
        Verifies:
        - Day 0 when today's high hits a new 52-week peak.
        - Increments on pullback/consolidation days.
        - Resolves ties to the most recent day.
        - Properly updates is_52w_high.
        """
        # Create symbol entry
        with self.db.get_connection() as conn:
            conn.execute("INSERT INTO symbols (symbol, name, exchange, asset_type) VALUES ('TEST', 'Test Co', 'NASDAQ', 'stock')")

        # 7 daily bars for TEST
        bars_data = [
            # Day 1: High 50.0 -> peak is 50.0 (day 0)
            {"symbol": "TEST", "date": "2025-01-01", "open": 49.0, "high": 50.0, "low": 48.0, "close": 49.5, "volume": 10000},
            # Day 2: High 60.0 -> new peak 60.0 (day 0)
            {"symbol": "TEST", "date": "2025-01-02", "open": 50.0, "high": 60.0, "low": 49.0, "close": 59.0, "volume": 12000},
            # Day 3: High 70.0 -> new peak 70.0 (day 0)
            {"symbol": "TEST", "date": "2025-01-03", "open": 59.0, "high": 70.0, "low": 58.0, "close": 68.0, "volume": 15000},
            # Day 4: High 65.0 -> peak remains 70.0 from Day 3 (day 1)
            {"symbol": "TEST", "date": "2025-01-06", "open": 67.0, "high": 65.0, "low": 63.0, "close": 64.0, "volume": 8000},
            # Day 5: High 68.0 -> peak remains 70.0 from Day 3 (day 2)
            {"symbol": "TEST", "date": "2025-01-07", "open": 64.0, "high": 68.0, "low": 63.5, "close": 67.0, "volume": 9000},
            # Day 6: High 70.0 -> ties peak 70.0, should resolve to Day 6 (day 0)
            {"symbol": "TEST", "date": "2025-01-08", "open": 67.0, "high": 70.0, "low": 66.0, "close": 69.5, "volume": 14000},
            # Day 7: High 69.0 -> peak is Day 6 (day 1)
            {"symbol": "TEST", "date": "2025-01-09", "open": 69.0, "high": 69.0, "low": 67.0, "close": 68.0, "volume": 8500},
        ]
        df = pd.DataFrame(bars_data)
        self.db.upsert_daily_bars(df)

        # Run vectorized batch calculation
        self.momentum_engine.calculate_and_store_momentum_metrics()

        # Check calculated values
        with self.db.get_connection() as conn:
            rows = conn.execute("""
                SELECT date, high, high_52w, days_since_52w_high, is_52w_high 
                FROM daily_bars 
                WHERE symbol = 'TEST' 
                ORDER BY date
            """).fetchall()

        self.assertEqual(len(rows), 7)

        # Day 1: high=50.0, peak=50.0, days=0, is_52w=True
        self.assertEqual(rows[0][1], 50.0)
        self.assertEqual(rows[0][2], 50.0)
        self.assertEqual(rows[0][3], 0)
        self.assertTrue(rows[0][4])

        # Day 2: high=60.0, peak=60.0, days=0, is_52w=True
        self.assertEqual(rows[1][1], 60.0)
        self.assertEqual(rows[1][2], 60.0)
        self.assertEqual(rows[1][3], 0)
        self.assertTrue(rows[1][4])

        # Day 3: high=70.0, peak=70.0, days=0, is_52w=True
        self.assertEqual(rows[2][1], 70.0)
        self.assertEqual(rows[2][2], 70.0)
        self.assertEqual(rows[2][3], 0)
        self.assertTrue(rows[2][4])

        # Day 4: high=65.0, peak=70.0, days=1, is_52w=False
        self.assertEqual(rows[3][1], 65.0)
        self.assertEqual(rows[3][2], 70.0)
        self.assertEqual(rows[3][3], 1)
        self.assertFalse(rows[3][4])

        # Day 5: high=68.0, peak=70.0, days=2, is_52w=False
        self.assertEqual(rows[4][1], 68.0)
        self.assertEqual(rows[4][2], 70.0)
        self.assertEqual(rows[4][3], 2)
        self.assertFalse(rows[4][4])

        # Day 6: high=70.0 (tie), peak=70.0, days=0 (tie resolves to latest bar), is_52w=True
        self.assertEqual(rows[5][1], 70.0)
        self.assertEqual(rows[5][2], 70.0)
        self.assertEqual(rows[5][3], 0)
        self.assertTrue(rows[5][4])

        # Day 7: high=69.0, peak=70.0, days=1, is_52w=False
        self.assertEqual(rows[6][1], 69.0)
        self.assertEqual(rows[6][2], 70.0)
        self.assertEqual(rows[6][3], 1)
        self.assertFalse(rows[6][4])

    def test_intraday_incremental_update(self):
        """Verifies update_intraday_metrics accurately maintains days_since_52w_high."""
        with self.db.get_connection() as conn:
            conn.execute("INSERT INTO symbols (symbol, name, exchange, asset_type) VALUES ('XYZ', 'XYZ Inc', 'NASDAQ', 'stock')")

        # Initial history ending with 52w high on Day 2
        initial_bars = [
            {"symbol": "XYZ", "date": "2025-01-01", "open": 100.0, "high": 105.0, "low": 99.0, "close": 102.0, "volume": 10000},
            {"symbol": "XYZ", "date": "2025-01-02", "open": 102.0, "high": 110.0, "low": 101.0, "close": 109.0, "volume": 15000},
        ]
        self.db.upsert_daily_bars(pd.DataFrame(initial_bars))
        self.momentum_engine.calculate_and_store_momentum_metrics()

        # Day 3 (intraday): High = 108.0 (< 110.0) -> days_since_52w_high should be 1
        day3_bar = [{"symbol": "XYZ", "date": "2025-01-03", "open": 107.0, "high": 108.0, "low": 106.0, "close": 107.5, "volume": 11000}]
        self.db.upsert_daily_bars(pd.DataFrame(day3_bar))
        self.momentum_engine.update_intraday_metrics(target_date="2025-01-03")

        with self.db.get_connection() as conn:
            row = conn.execute("SELECT high_52w, days_since_52w_high, is_52w_high FROM daily_bars WHERE symbol = 'XYZ' AND date = '2025-01-03'").fetchone()
            self.assertEqual(row[0], 110.0)
            self.assertEqual(row[1], 1)
            self.assertFalse(row[2])

        # Day 4 (intraday): High = 115.0 (> 110.0) -> new 52w high, days_since_52w_high should be 0
        day4_bar = [{"symbol": "XYZ", "date": "2025-01-06", "open": 110.0, "high": 115.0, "low": 109.0, "close": 114.0, "volume": 20000}]
        self.db.upsert_daily_bars(pd.DataFrame(day4_bar))
        self.momentum_engine.update_intraday_metrics(target_date="2025-01-06")

        with self.db.get_connection() as conn:
            row = conn.execute("SELECT high_52w, days_since_52w_high, is_52w_high FROM daily_bars WHERE symbol = 'XYZ' AND date = '2025-01-06'").fetchone()
            self.assertEqual(row[0], 115.0)
            self.assertEqual(row[1], 0)
            self.assertTrue(row[2])


if __name__ == "__main__":
    unittest.main()
