import os
import tempfile
import unittest
import pandas as pd
from application.database import DatabaseManager
from application.engine.expression import ScanExpressionEngine


class TestInstitutionalSponsorship(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_data.db")
        self.db = DatabaseManager(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_schema_and_upsert(self):
        """Verifies institutional_sponsorship table and quarterly_fundamentals columns exist and can be upserted."""
        df = pd.DataFrame([
            {
                "symbol": "NVDA",
                "report_date": "2024-03-31",
                "fiscal_quarter": "2024-Q1",
                "holders_count": 3000,
                "ownership_pct": 65.5,
                "source": "yfinance"
            },
            {
                "symbol": "NVDA",
                "report_date": "2024-06-30",
                "fiscal_quarter": "2024-Q2",
                "holders_count": 3250,
                "ownership_pct": 66.2,
                "source": "yfinance"
            }
        ])
        self.db.upsert_institutional_sponsorship(df)
        
        history = self.db.get_symbol_sponsorship_history("NVDA")
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["fiscal_quarter"], "2024-Q2")
        self.assertEqual(history[0]["holders_count"], 3250)
        self.assertEqual(history[1]["fiscal_quarter"], "2024-Q1")
        self.assertEqual(history[1]["holders_count"], 3000)

    def test_streak_calculation_logic(self):
        """
        Tests consecutive quarters growth streak logic:
        - ALPHA: 100 -> 120 -> 150 -> 180 (Streak = 4 if 4 quarters increasing or 3 if 3 steps)
        - BETA: 200 -> 250 -> 230 -> 260 (Dipper: Q3 dropped, so Q4 has only 1 quarter increase -> Streak = 1)
        - GAMMA: 50 -> 60 -> 75 (Streak = 2)
        """
        records = [
            # ALPHA: 4 quarters strictly increasing
            {"symbol": "ALPHA", "report_date": "2024-03-31", "fiscal_quarter": "2024-Q1", "holders_count": 100, "ownership_pct": 40.0, "source": "yfinance"},
            {"symbol": "ALPHA", "report_date": "2024-06-30", "fiscal_quarter": "2024-Q2", "holders_count": 120, "ownership_pct": 42.0, "source": "yfinance"},
            {"symbol": "ALPHA", "report_date": "2024-09-30", "fiscal_quarter": "2024-Q3", "holders_count": 150, "ownership_pct": 45.0, "source": "yfinance"},
            {"symbol": "ALPHA", "report_date": "2024-12-31", "fiscal_quarter": "2024-Q4", "holders_count": 180, "ownership_pct": 48.0, "source": "yfinance"},
            
            # BETA: Q3 dropped, Q4 rebounded
            {"symbol": "BETA", "report_date": "2024-03-31", "fiscal_quarter": "2024-Q1", "holders_count": 200, "ownership_pct": 50.0, "source": "yfinance"},
            {"symbol": "BETA", "report_date": "2024-06-30", "fiscal_quarter": "2024-Q2", "holders_count": 250, "ownership_pct": 52.0, "source": "yfinance"},
            {"symbol": "BETA", "report_date": "2024-09-30", "fiscal_quarter": "2024-Q3", "holders_count": 230, "ownership_pct": 49.0, "source": "yfinance"},
            {"symbol": "BETA", "report_date": "2024-12-31", "fiscal_quarter": "2024-Q4", "holders_count": 260, "ownership_pct": 53.0, "source": "yfinance"},

            # GAMMA: 3 quarters strictly increasing
            {"symbol": "GAMMA", "report_date": "2024-03-31", "fiscal_quarter": "2024-Q1", "holders_count": 50, "ownership_pct": 20.0, "source": "yfinance"},
            {"symbol": "GAMMA", "report_date": "2024-06-30", "fiscal_quarter": "2024-Q2", "holders_count": 60, "ownership_pct": 22.0, "source": "yfinance"},
            {"symbol": "GAMMA", "report_date": "2024-09-30", "fiscal_quarter": "2024-Q3", "holders_count": 75, "ownership_pct": 25.0, "source": "yfinance"},
        ]
        self.db.upsert_institutional_sponsorship(pd.DataFrame(records))
        self.db.recalculate_sponsorship_metrics()

        # Check ALPHA in quarterly_fundamentals
        with self.db.get_connection() as conn:
            alpha_q4 = conn.execute("""
                SELECT inst_holders_count, inst_holders_qoq_change, sponsorship_streak 
                FROM quarterly_fundamentals 
                WHERE symbol = 'ALPHA' AND fiscal_quarter = '2024-Q4'
            """).fetchone()
            self.assertIsNotNone(alpha_q4)
            self.assertEqual(alpha_q4[0], 180)
            self.assertEqual(alpha_q4[1], 30) # 180 - 150
            self.assertEqual(alpha_q4[2], 3) # 180 > 150 > 120 > 100 -> 3 prior steps of growth

            # Check BETA Q4: 260 > 230, but 230 was not > 250 -> streak = 1
            beta_q4 = conn.execute("""
                SELECT inst_holders_count, inst_holders_qoq_change, sponsorship_streak 
                FROM quarterly_fundamentals 
                WHERE symbol = 'BETA' AND fiscal_quarter = '2024-Q4'
            """).fetchone()
            self.assertIsNotNone(beta_q4)
            self.assertEqual(beta_q4[0], 260)
            self.assertEqual(beta_q4[1], 30) # 260 - 230
            self.assertEqual(beta_q4[2], 1)

            # Check GAMMA Q3: 75 > 60 > 50 -> streak = 2
            gamma_q3 = conn.execute("""
                SELECT inst_holders_count, inst_holders_qoq_change, sponsorship_streak 
                FROM quarterly_fundamentals 
                WHERE symbol = 'GAMMA' AND fiscal_quarter = '2024-Q3'
            """).fetchone()
            self.assertIsNotNone(gamma_q3)
            self.assertEqual(gamma_q3[0], 75)
            self.assertEqual(gamma_q3[1], 15) # 75 - 60
            self.assertEqual(gamma_q3[2], 2)

    def test_expression_engine_institutional_variables(self):
        """Verifies custom expression parser recognizes INST_STREAK, INST_HOLDERS, INST_QOQ_CHANGE, INST_OWN_PCT."""
        expr = "RS_RANK >= 80 AND INST_STREAK >= 2 AND INST_HOLDERS >= 200 AND INST_OWN_PCT >= 40.0"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("INST_STREAK", res["variables"])
        self.assertIn("INST_HOLDERS", res["variables"])
        self.assertIn("INST_OWN_PCT", res["variables"])
        self.assertIn("f.sponsorship_streak", res["sql"])
        self.assertIn("f.inst_holders_count", res["sql"])
        self.assertIn("f.inst_ownership_pct", res["sql"])

    def test_expression_inst_qoq_change(self):
        """Verifies expressions using INST_QOQ_CHANGE transpile properly."""
        expr = "INST_QOQ_CHANGE > 20 AND INST_STREAK >= 1"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("f.inst_holders_qoq_change", res["sql"])


if __name__ == "__main__":
    unittest.main()

