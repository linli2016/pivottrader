import unittest
from application.engine.setups.low_cheat import detect_low_cheat
from application.services.config import config_service
from application.services.model_book_service import ModelBookService
from application.services.database import db_service


class TestMinerviniLowCheat(unittest.TestCase):

    def test_synthetic_valid_low_cheat_trigger(self):
        # 25+ bars simulating prior trend, runup to $100, correction down to $74.5 (25.5% depth),
        # low volume at bottom, pivot at $82 (29% of base), and a breakout day at $83.5 on 2.2x volume.
        base_prefix = [88.0] * 12
        highs = base_prefix + [90.0, 95.0, 100.0] + [98.0, 92.0, 85.0, 80.0, 77.0, 75.5] + [78.0, 82.0, 81.0, 80.5, 83.5]
        lows =  base_prefix + [88.0, 92.0, 97.0]  + [91.0, 84.0, 78.0, 76.0, 75.0, 74.5] + [75.0, 77.0, 79.5, 79.0, 81.0]
        closes = base_prefix + [89.0, 94.0, 99.0] + [92.0, 85.0, 79.0, 76.5, 75.2, 75.0] + [77.5, 81.5, 80.2, 80.0, 83.2]
        opens =  base_prefix + [88.5, 93.0, 98.0] + [97.0, 91.0, 84.0, 79.0, 76.0, 75.1] + [75.5, 77.5, 81.0, 79.8, 81.2]
        volumes = [1000] * 12 + [1000] * 3        + [1200, 1100, 900, 700, 300, 350]     + [500, 700, 600, 500, 2200]
        dates = [f"2026-05-{i+1:02d}" for i in range(len(highs))]

        res = detect_low_cheat(
            opens=opens,
            highs=highs,
            lows=lows,
            closes=closes,
            volumes=volumes,
            dates=dates,
            vol_50d_ma=1000.0,
            sma_200=70.0,
            min_base_depth=12.0,
            max_base_depth=45.0,
            max_base_position=50.0,
            require_exhaustion_or_shakeout=True
        )

        self.assertTrue(res["low_cheat_is_setup"])
        self.assertTrue(res["low_cheat_is_trigger"])
        self.assertEqual(res["base_peak_price"], 100.0)
        self.assertEqual(res["base_trough_price"], 74.5)
        self.assertAlmostEqual(res["base_depth_pct"], 25.5, places=1)
        self.assertEqual(res["low_cheat_pivot_price"], 82.0)
        # Position: (82.0 - 74.5) / (100.0 - 74.5) = 7.5 / 25.5 = ~29.4%
        self.assertLessEqual(res["base_position_pct"], 50.0)
        self.assertIn(res["exhaustion_type"], ["volume_dry_up", "shakeout", "both"])
        self.assertGreater(res["reward_risk_ratio"], 1.5)

    def test_reject_when_pivot_is_too_high_in_base(self):
        # Peak $100, Trough $70 (height = 30), Pivot at $90 -> Position = 20/30 = 66.7% (> 50%)
        highs = [90.0, 95.0, 100.0] + [90.0, 80.0, 72.0] + [78.0, 85.0, 90.0, 88.0, 91.0]
        lows =  [88.0, 92.0, 97.0]  + [82.0, 73.0, 70.0] + [73.0, 77.0, 84.0, 86.0, 88.0]
        closes = [89.0, 94.0, 99.0] + [85.0, 74.0, 71.0] + [77.0, 84.0, 89.0, 87.0, 90.5]
        opens =  [88.5, 93.0, 98.0] + [89.0, 79.0, 72.0] + [74.0, 78.0, 85.0, 89.0, 88.5]
        volumes = [1000] * len(highs)
        volumes[5] = 200  # dryup at trough
        volumes[-1] = 2000 # trigger volume
        dates = [f"2026-05-{i+1:02d}" for i in range(len(highs))]

        res = detect_low_cheat(
            opens=opens,
            highs=highs,
            lows=lows,
            closes=closes,
            volumes=volumes,
            dates=dates,
            vol_50d_ma=1000.0,
            max_base_position=50.0
        )

        # Should NOT qualify as a Low Cheat because pivot is in upper base
        self.assertFalse(res["low_cheat_is_setup"])

    def test_stage2_trend_filtering(self):
        base_prefix = [88.0] * 12
        highs = base_prefix + [90.0, 95.0, 100.0] + [98.0, 92.0, 85.0, 80.0, 77.0, 75.5] + [78.0, 82.0, 81.0, 80.5, 83.5]
        lows =  base_prefix + [88.0, 92.0, 97.0]  + [91.0, 84.0, 78.0, 76.0, 75.0, 74.5] + [75.0, 77.0, 79.5, 79.0, 81.0]
        closes = base_prefix + [89.0, 94.0, 99.0] + [92.0, 85.0, 79.0, 76.5, 75.2, 75.0] + [77.5, 81.5, 80.2, 80.0, 83.2]
        opens =  base_prefix + [88.5, 93.0, 98.0] + [97.0, 91.0, 84.0, 79.0, 76.0, 75.1] + [75.5, 77.5, 81.0, 79.8, 81.2]
        volumes = [1000] * 12 + [1000] * 3        + [1200, 1100, 900, 700, 300, 350]     + [500, 700, 600, 500, 2200]
        dates = [f"2026-05-{i+1:02d}" for i in range(len(highs))]

        # Case A: Downtrend / Stage 4: sma_150 (65.0) < sma_200 (75.0)
        res_downtrend = detect_low_cheat(
            opens=opens, highs=highs, lows=lows, closes=closes, volumes=volumes, dates=dates,
            vol_50d_ma=1000.0, sma_50=70.0, sma_150=65.0, sma_200=75.0,
            enforce_stage2=True
        )
        self.assertFalse(res_downtrend["low_cheat_is_setup"])

        # Case B: Below 200 SMA: close (83.2) < sma_200 (95.0)
        res_below_200 = detect_low_cheat(
            opens=opens, highs=highs, lows=lows, closes=closes, volumes=volumes, dates=dates,
            vol_50d_ma=1000.0, sma_50=100.0, sma_150=98.0, sma_200=95.0,
            enforce_stage2=True
        )
        self.assertFalse(res_below_200["low_cheat_is_setup"])

        # Case C: Stage 2 Uptrend: 50 SMA (82) > 150 SMA (72) > 200 SMA (68), Close (83.2) > 200 SMA
        res_stage2 = detect_low_cheat(
            opens=opens, highs=highs, lows=lows, closes=closes, volumes=volumes, dates=dates,
            vol_50d_ma=1000.0, sma_50=82.0, sma_150=72.0, sma_200=68.0,
            enforce_stage2=True
        )
        self.assertTrue(res_stage2["low_cheat_is_setup"])
        self.assertTrue(res_stage2["stage2_qualified"])

        # Case D: IPO base (< 350 days) with young moving averages
        res_ipo = detect_low_cheat(
            opens=opens, highs=highs, lows=lows, closes=closes, volumes=volumes, dates=dates,
            vol_50d_ma=1000.0, sma_50=82.0, sma_150=None, sma_200=None, ipo_days=180,
            enforce_stage2=True
        )
        self.assertTrue(res_ipo["low_cheat_is_setup"])
        self.assertTrue(res_ipo["stage2_qualified"])

    def test_model_book_low_cheat_scan(self):
        mb = ModelBookService(config_service)
        res = mb.scan_setups(setup_type="low_cheat", forward_days=25, filters={"enforce_stage2": True})
        self.assertIn("summary", res)
        self.assertEqual(res["summary"]["setup_type"], "low_cheat")
        self.assertGreater(res["summary"]["total_trades"], 0)
        self.assertGreater(res["summary"]["win_rate_pct"], 0)
        self.assertGreater(len(res["winners"]), 0)

    def test_database_screening_low_cheat(self):
        candidates = db_service.get_candidates(
            target_date="latest",
            filters={
                "enable_low_cheat": True,
                "enforce_stage2": True,
                "min_price": 5.0,
                "min_volume_sma_50": 100000,
                "min_dollar_vol": 3000000.0
            }
        )
        self.assertIsInstance(candidates, list)
        if candidates:
            cand = candidates[0]
            self.assertTrue(cand.get("low_cheat_is_setup"))
            self.assertIsNotNone(cand.get("low_cheat_pivot_price"))
            self.assertIsNotNone(cand.get("low_cheat_stop_loss"))

    def test_database_screening_legacy_require_low_cheat(self):
        candidates = db_service.get_candidates(
            target_date="latest",
            filters={
                "require_low_cheat": True,
                "enforce_stage2": True,
                "min_price": 5.0,
                "min_volume_sma_50": 100000,
                "min_dollar_vol": 3000000.0
            }
        )
        self.assertIsInstance(candidates, list)
        if candidates:
            cand = candidates[0]
            self.assertTrue(cand.get("low_cheat_is_setup"))


if __name__ == "__main__":
    unittest.main()
