import unittest
from application.engine.setups.parabolic_extension import detect_parabolic_extension


class TestParabolicShort(unittest.TestCase):

    def test_parabolic_short_success(self):
        # 12 bars: base around 10.0, then fast surge over 5 bars to 16.0 (+60% runup)
        # Closes: 10, 10, 10, 10, 10, 10, 10, 11, 12.5, 14.0, 15.5, 16.0 (5 consecutive up days)
        # Highs: 10.2, ..., 16.2. Lows: 9.8, ..., 15.2. Min low in last 10 bars = 9.8.
        # Runup = (16.2 - 9.8) / 9.8 * 100 = 65.3% >= 40%
        # EMA 10 = 12.0. Dist EMA10 = (16.0 - 12.0) / 12.0 * 100 = +33.3% >= 18%
        highs = [10.2] * 7 + [11.5, 13.0, 14.5, 15.8, 16.2]
        lows = [9.8] * 7 + [10.2, 11.8, 13.2, 14.8, 15.2]
        closes = [10.0] * 7 + [11.0, 12.5, 14.0, 15.5, 16.0]
        dates = [f"2026-06-{i+1:02d}" for i in range(len(closes))]
        ema_10 = 12.0

        res = detect_parabolic_extension(highs, lows, closes, dates, ema_10)

        self.assertIsNotNone(res)
        self.assertTrue(res["parabolic_short_is_setup"])
        self.assertFalse(res["parabolic_long_is_setup"])
        self.assertGreaterEqual(res["parabolic_runup_pct"], 40.0)
        self.assertGreaterEqual(res["dist_ema10_pct"], 18.0)
        self.assertGreaterEqual(res["parabolic_up_days"], 3)

    def test_parabolic_long_ignored(self):
        # Stock plunging -40% in 5 days below 10 EMA
        # Should NOT trigger any setup (long side removed)
        highs = [100.0] * 7 + [90.0, 80.0, 70.0, 62.0, 58.0]
        lows = [98.0] * 7 + [85.0, 75.0, 65.0, 58.0, 52.0]
        closes = [99.0] * 7 + [88.0, 78.0, 68.0, 60.0, 55.0]
        dates = [f"2026-06-{i+1:02d}" for i in range(len(closes))]
        ema_10 = 85.0

        res = detect_parabolic_extension(highs, lows, closes, dates, ema_10)

        self.assertIsNone(res)

    def test_insufficient_consecutive_up_days(self):
        # High runup and extended above EMA, but last day closed down (red day)
        highs = [10.2] * 7 + [11.5, 13.0, 14.5, 16.5, 16.2]
        lows = [9.8] * 7 + [10.2, 11.8, 13.2, 15.2, 15.0]
        closes = [10.0] * 7 + [11.0, 12.5, 14.0, 16.2, 15.8]  # 15.8 < 16.2 => 0 consecutive up days ending at current bar
        dates = [f"2026-06-{i+1:02d}" for i in range(len(closes))]
        ema_10 = 12.0

        res = detect_parabolic_extension(highs, lows, closes, dates, ema_10)

        self.assertIsNone(res)

    def test_parabolic_minimum_liquidity_filters(self):
        from application.services.setup_service import SetupService
        svc = SetupService()
        config = svc.load_config()
        parabolic = svc.get_setup_by_id("parabolic")

        self.assertIsNotNone(parabolic)
        self.assertEqual(parabolic["name"], "Parabolic Short")
        self.assertIn("PARABOLIC_SHORT", parabolic.get("expression", ""))
        self.assertIn("C >= 1.0", parabolic.get("expression", ""))
        self.assertIn("DIST_EMA10 >= 18.0", parabolic.get("expression", ""))


    def test_custom_parabolic_window_days(self):
        # 12 bars: flat at 10.0 for 7 bars, then jumps to 12.0 for 2 bars, then jumps to 16.0 for 3 bars
        # Last 5 bars: lows = [12.0, 12.0, 13.5, 14.8, 15.2] -> min low in last 5 bars is 12.0. Max high = 16.2.
        # Runup over 5 bars = (16.2 - 12.0) / 12.0 * 100 = 35%
        # Last 10 bars: min low in last 10 bars is 9.8. Runup over 10 bars = (16.2 - 9.8) / 9.8 * 100 = 65.3%
        highs = [10.2] * 7 + [12.2, 12.5, 14.0, 15.8, 16.2]
        lows = [9.8] * 7 + [12.0, 12.0, 13.5, 14.8, 15.2]
        closes = [10.0] * 7 + [12.0, 12.3, 14.0, 15.5, 16.0]
        dates = [f"2026-06-{i+1:02d}" for i in range(len(closes))]
        ema_10 = 12.0

        # With 10-day window, runup is 65.3% >= 40% -> triggers setup
        res_10 = detect_parabolic_extension(highs, lows, closes, dates, ema_10, min_runup_pct=40.0, window_days=10)
        self.assertIsNotNone(res_10)
        self.assertTrue(res_10["parabolic_short_is_setup"])
        self.assertEqual(res_10["parabolic_window_days"], 10)

        # With 5-day window, runup is only 35% < 40% -> does NOT trigger setup
        res_5 = detect_parabolic_extension(highs, lows, closes, dates, ema_10, min_runup_pct=40.0, window_days=5)
        self.assertIsNone(res_5)

        # But with 5-day window and min_runup_pct=30%, it triggers!
        res_5_low = detect_parabolic_extension(highs, lows, closes, dates, ema_10, min_runup_pct=30.0, window_days=5)
        self.assertIsNotNone(res_5_low)
        self.assertTrue(res_5_low["parabolic_short_is_setup"])
        self.assertEqual(res_5_low["parabolic_window_days"], 5)


if __name__ == "__main__":
    unittest.main()

