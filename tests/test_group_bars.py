import unittest
from application.services.group_radar_service import GroupRadarService


class TestGroupBars(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = GroupRadarService(db_path="data.db")

    def test_get_group_bars_weekly_industry(self):
        """Test weekly synthetic bars with 40-week SMA and Mansfield RS for an industry."""
        res = self.service.get_group_bars(
            group_type="industries",
            group_name="Major Banks",
            timeframe="weekly",
            limit=100
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["name"], "Major Banks")
        self.assertEqual(res["type"], "industries")
        self.assertEqual(res["timeframe"], "weekly")
        self.assertIn("stage_summary", res)
        self.assertIn("breadth", res)
        self.assertIn("bars", res)

        bars = res["bars"]
        self.assertGreater(len(bars), 20)
        self.assertLessEqual(len(bars), 100)

        # Verify bar attributes and math integrity
        for bar in bars:
            self.assertIn("date", bar)
            self.assertIn("open", bar)
            self.assertIn("high", bar)
            self.assertIn("low", bar)
            self.assertIn("close", bar)
            self.assertIn("volume", bar)
            self.assertIn("sma_40w", bar)
            self.assertIn("sma_10w", bar)
            self.assertIn("rs_line", bar)
            self.assertIn("mansfield_rs", bar)
            self.assertIn("stage", bar)

            # Bar price geometry
            self.assertLessEqual(bar["low"], bar["high"])
            self.assertGreaterEqual(bar["high"], bar["open"])
            self.assertGreaterEqual(bar["high"], bar["close"])
            self.assertLessEqual(bar["low"], bar["open"])
            self.assertLessEqual(bar["low"], bar["close"])

        # Check stage summary
        summary = res["stage_summary"]
        self.assertIn("stage", summary)
        self.assertIn("stage_badge", summary)
        self.assertIn(summary["stage_badge"], ["Stage 1", "Stage 2", "Stage 3", "Stage 4"])
        self.assertIn("ma_val", summary)
        self.assertIn("ma_slope_pct", summary)
        self.assertIn("mansfield_rs", summary)
        self.assertIn("bias", summary)

        # Check breadth
        breadth = res["breadth"]
        self.assertGreater(breadth["total_stocks"], 0)
        self.assertIn("pct_above_200d", breadth)
        self.assertIn("pct_in_stage2", breadth)
        self.assertIn("leaders", breadth)
        self.assertGreater(len(breadth["leaders"]), 0)

    def test_get_group_bars_daily_industry(self):
        """Test daily synthetic bars with 200-day SMA and Mansfield RS."""
        res = self.service.get_group_bars(
            group_type="industries",
            group_name="Major Banks",
            timeframe="daily",
            limit=120
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["timeframe"], "daily")
        bars = res["bars"]
        self.assertGreater(len(bars), 50)
        latest = bars[-1]
        self.assertIn("sma_200d", latest)
        self.assertIn("sma_50d", latest)
        self.assertIn("mansfield_rs", latest)
        self.assertIn("stage", latest)

    def test_get_group_bars_sector(self):
        """Test weekly synthetic bars for a sector."""
        res = self.service.get_group_bars(
            group_type="sectors",
            group_name="Software",
            timeframe="weekly",
            limit=52
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["name"], "Software")
        self.assertGreater(len(res["bars"]), 20)
        self.assertIn(res["stage_summary"]["stage_badge"], ["Stage 1", "Stage 2", "Stage 3", "Stage 4"])

    def test_get_group_bars_theme(self):
        """Test weekly synthetic bars for a theme from themes.yaml."""
        res = self.service.get_group_bars(
            group_type="themes",
            group_name="AI Compute Silicon",
            timeframe="weekly",
            limit=52
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["name"], "AI Compute Silicon")
        self.assertGreater(len(res["bars"]), 20)
        self.assertIn(res["stage_summary"]["stage_badge"], ["Stage 1", "Stage 2", "Stage 3", "Stage 4"])

    def test_group_bars_endpoint(self):
        """Test the router endpoint get_group_bars_endpoint."""
        from application.router import get_group_bars_endpoint
        res = get_group_bars_endpoint(type="industries", name="Major Banks", timeframe="weekly", limit=50)
        self.assertIsNotNone(res)
        self.assertEqual(res["name"], "Major Banks")
        self.assertGreater(len(res["bars"]), 0)


if __name__ == "__main__":
    unittest.main()

