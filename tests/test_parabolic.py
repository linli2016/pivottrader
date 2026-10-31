import unittest
from application.services.setup_service import SetupService
from application.engine.expression import ScanExpressionEngine
from application.services.database import db_service


class TestParabolicScreeners(unittest.TestCase):

    def setUp(self):
        self.setup_service = SetupService()
        self.config = self.setup_service.load_config()

    def test_parabolic_short_screener_config(self):
        parabolic = self.setup_service.get_setup_by_id("parabolic_short")
        self.assertIsNotNone(parabolic)
        self.assertEqual(parabolic["name"], "Parabolic Short")
        self.assertEqual(parabolic["tag"], "SHORT")
        expr = parabolic.get("expression", "")
        self.assertIn("C >= 1.0", expr)
        self.assertIn("DIST_EMA10 >= 20.0", expr)
        self.assertIn("ADR20 >= 5.0", expr)
        self.assertIn("MARKET_CAP", expr)
        self.assertIn("C > C1", expr)
        self.assertIn("C1 > C2", expr)

    def test_parabolic_long_screener_config(self):
        parabolic_long = self.setup_service.get_setup_by_id("parabolic_long")
        self.assertIsNotNone(parabolic_long)
        self.assertEqual(parabolic_long["name"], "Parabolic Long")
        self.assertEqual(parabolic_long["tag"], "BO")
        expr = parabolic_long.get("expression", "")
        self.assertIn("C >= 1.0", expr)
        self.assertIn("DIST_EMA10 <= -20.0", expr)
        self.assertIn("ADR20 >= 5.0", expr)
        self.assertIn("MARKET_CAP", expr)
        self.assertIn("C < C1", expr)
        self.assertIn("C1 < C2", expr)
        self.assertIn("C2 < C3", expr)

    def test_parabolic_short_alias_transpilation(self):
        res = ScanExpressionEngine.validate("PARABOLIC_SHORT")
        self.assertTrue(res["valid"])
        self.assertTrue(res["has_lags"])
        self.assertIn("dist_ema10_pct >= 20.0", res["sql"])
        self.assertIn("market_cap", res["sql"])
        self.assertIn("lag_c1", res["sql"])
        self.assertIn("lag_c2", res["sql"])

    def test_parabolic_long_alias_transpilation(self):
        res = ScanExpressionEngine.validate("PARABOLIC_LONG")
        self.assertTrue(res["valid"])
        self.assertTrue(res["has_lags"])
        self.assertIn("dist_ema10_pct <= (-20.0)", res["sql"])
        self.assertIn("market_cap", res["sql"])
        self.assertIn("lag_c1", res["sql"])
        self.assertIn("lag_c2", res["sql"])
        self.assertIn("lag_c3", res["sql"])

    def test_parabolic_candidate_query_execution(self):
        # Query candidates for parabolic_long on known capitulation date
        res_long = db_service.get_candidates(screener_id="parabolic_long", target_date="2026-09-15")
        self.assertIsInstance(res_long, list)
        if res_long:
            first = res_long[0]
            self.assertEqual(first["setup_name"], "Parabolic Long")
            self.assertEqual(first["setup_tag"], "BO")
            self.assertTrue(first.get("parabolic_long_is_setup"))
            self.assertLessEqual(first.get("dist_ema10_pct", 0), -20.0)

        # Query candidates for parabolic_short on date with blow-off top candidates (e.g. 2026-09-30)
        res_short = db_service.get_candidates(screener_id="parabolic_short", target_date="2026-09-30")
        self.assertIsInstance(res_short, list)
        if res_short:
            first = res_short[0]
            self.assertEqual(first["setup_name"], "Parabolic Short")
            self.assertEqual(first["setup_tag"], "SHORT")
            self.assertTrue(first.get("parabolic_short_is_setup"))
            self.assertGreaterEqual(first.get("dist_ema10_pct", 0), 20.0)


if __name__ == "__main__":
    unittest.main()
