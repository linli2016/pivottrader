import unittest
from application.services import db_service
from application.engine.market_pulse import (
    calculate_distribution_days,
    calculate_ftd_status,
    calculate_breadth_moving_averages,
    get_market_pulse
)


class TestMarketPulse(unittest.TestCase):
    def test_calculate_distribution_days(self):
        with db_service.get_read_only_conn() as conn:
            dist = calculate_distribution_days(conn, as_of_date="2026-09-24")
        self.assertIn("pressure_score", dist)
        self.assertIn("trend", dist)
        self.assertIn("trend_label", dist)
        self.assertIn("near_exemption_count", dist)
        self.assertIn("indices", dist)
        self.assertIn("marks", dist)

        # SPY and QQQ should be evaluated
        self.assertIn("SPY", dist["indices"])
        self.assertIn("QQQ", dist["indices"])

        spy = dist["indices"]["SPY"]
        self.assertEqual(spy["symbol"], "SPY")
        self.assertGreaterEqual(spy["active_count"], 0)
        self.assertIsInstance(spy["active_marks"], list)

    def test_calculate_ftd_status(self):
        with db_service.get_read_only_conn() as conn:
            ftd = calculate_ftd_status(conn, as_of_date="2026-09-24")
        self.assertIn("has_active_ftd", ftd)
        self.assertIn("headline", ftd)
        self.assertIn("badge_color", ftd)
        self.assertIsInstance(ftd["has_active_ftd"], bool)
        self.assertIn("details", ftd)

    def test_calculate_breadth_moving_averages(self):
        with db_service.get_read_only_conn() as conn:
            breadth = calculate_breadth_moving_averages(conn, as_of_date="2026-09-24", lookback_sessions=252)
        self.assertIn("total_symbols", breadth)
        self.assertGreater(breadth["total_symbols"], 1000)
        self.assertIn("metrics", breadth)
        self.assertEqual(len(breadth["metrics"]), 3)

        keys = [m["key"] for m in breadth["metrics"]]
        self.assertIn("pct_above_21", keys)
        self.assertIn("pct_above_50", keys)
        self.assertIn("pct_above_200", keys)

        for m in breadth["metrics"]:
            self.assertGreaterEqual(m["current_pct"], 0.0)
            self.assertLessEqual(m["current_pct"], 100.0)
            self.assertIn("percentile_label", m)
            self.assertIn("bar_color", m)

    def test_get_market_pulse_standalone_and_summary(self):
        # 1. Standalone via db_service
        pulse = db_service.get_market_pulse_data(as_of_date="2026-09-24", force_refresh=True)
        self.assertIn("ftd_status", pulse)
        self.assertIn("distribution_pressure", pulse)
        self.assertIn("distribution_trend_label", pulse)
        self.assertIn("near_exemption_label", pulse)
        self.assertIn("breadth_metrics", pulse)
        self.assertEqual(len(pulse["breadth_metrics"]), 3)

        # 2. Embedded in get_market_monitor summary
        res = db_service.get_market_monitor(limit=5, force_refresh=True, as_of_date="2026-09-24")
        self.assertIn("market_pulse", res.get("summary", {}))
        summary_pulse = res["summary"]["market_pulse"]
        self.assertEqual(summary_pulse["distribution_pressure"], pulse["distribution_pressure"])


if __name__ == "__main__":
    unittest.main()

