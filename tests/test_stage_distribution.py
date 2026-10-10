import unittest
from application.services import db_service

class TestStageDistribution(unittest.TestCase):
    def test_stage_distribution_summary_and_history(self):
        # 1. Fetch stage distribution data
        res = db_service.get_stage_distribution(limit=10)
        self.assertIn("summary", res)
        self.assertIn("history", res)

        summary = res["summary"]
        self.assertIn("stage1", summary)
        self.assertIn("stage2", summary)
        self.assertIn("stage3", summary)
        self.assertIn("stage4", summary)
        self.assertIn("total_stocks", summary)
        self.assertIn("net_expansion", summary)

        # Check stage properties
        for stg_key in ["stage1", "stage2", "stage3", "stage4"]:
            stg = summary[stg_key]
            self.assertIn("count", stg)
            self.assertIn("pct", stg)
            self.assertIn("color", stg)
            self.assertIn("name", stg)
            self.assertGreaterEqual(stg["count"], 0)
            self.assertGreaterEqual(stg["pct"], 0.0)

        # Ensure total stocks matches sum of stages (approximately or exact)
        sum_counts = summary["stage1"]["count"] + summary["stage2"]["count"] + summary["stage3"]["count"] + summary["stage4"]["count"]
        self.assertEqual(summary["total_stocks"], sum_counts)

        # Check history time series
        history = res["history"]
        self.assertGreater(len(history), 0)
        latest_bar = history[-1]
        self.assertIn("date", latest_bar)
        self.assertIn("stage1_count", latest_bar)
        self.assertIn("stage2_count", latest_bar)
        self.assertIn("stage3_count", latest_bar)
        self.assertIn("stage4_count", latest_bar)
        self.assertIn("stage2_pct", latest_bar)
        self.assertIn("stage4_pct", latest_bar)
        self.assertIn("stage_net_pct", latest_bar)
        self.assertIn("spy_close", latest_bar)

    def test_market_monitor_includes_stage_fields(self):
        res = db_service.get_market_monitor(limit=5, force_refresh=True)
        summary = res.get("summary", {})
        self.assertIn("stage_distribution", summary)

        # Ensure daily_data rows also include stage counts
        self.assertGreater(len(res["daily_data"]), 0)
        row = res["daily_data"][0]
        self.assertIn("stage1_count", row)
        self.assertIn("stage2_count", row)
        self.assertIn("stage3_count", row)
        self.assertIn("stage4_count", row)
        self.assertIn("stage2_pct", row)
        self.assertIn("stage4_pct", row)
        self.assertIn("stage_net_pct", row)

if __name__ == "__main__":
    unittest.main()
