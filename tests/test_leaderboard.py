import unittest
from application.services.leaderboard_service import LeaderboardService
from application.router import get_leaderboard


class TestLeaderboardService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = LeaderboardService(db_path="data.db")
        cls.test_date = "2026-09-18"

    def test_board_near_52w_high(self):
        res = self.service.get_leaderboard(target_date=self.test_date, board="near_52w_high", min_rs=90)
        self.assertEqual(res["board"], "near_52w_high")
        self.assertEqual(res["board_title"], "Near 52w high")
        self.assertGreater(len(res["stocks"]), 0)
        self.assertGreater(len(res["sector_distribution"]), 0)
        
        # Verify that stocks meet Near-Highs criteria
        for s in res["stocks"]:
            self.assertLessEqual(s["dist_from_52w_high"], 10.0)
            self.assertGreaterEqual(s["rs_rank"], 90)
            self.assertIsNotNone(s.get("ret_1w"))
            self.assertIsNotNone(s.get("change_pct"))

    def test_board_new_highs(self):
        res = self.service.get_leaderboard(target_date=self.test_date, board="new_highs", min_rs=0)
        self.assertEqual(res["board"], "new_highs")
        self.assertEqual(res["board_title"], "New highs")
        self.assertGreater(len(res["stocks"]), 0)
        
        # Verify all stocks are at or right near new 52w highs
        for s in res["stocks"]:
            self.assertTrue(s.get("dist_from_52w_high") <= 0.2 or s.get("days_at_highs") is not None)

    def test_board_gainers(self):
        res = self.service.get_leaderboard(target_date=self.test_date, board="gainers", min_rs=0)
        self.assertEqual(res["board"], "gainers")
        self.assertEqual(res["board_title"], "Gainers")
        self.assertGreater(len(res["stocks"]), 0)

        # Verify sorted by change_pct descending and positive gain
        stocks = res["stocks"]
        self.assertGreater(stocks[0]["change_pct"], 0)
        for i in range(min(10, len(stocks) - 1)):
            self.assertGreaterEqual(stocks[i]["change_pct"], stocks[i + 1]["change_pct"])

    def test_board_strongest(self):
        res = self.service.get_leaderboard(target_date=self.test_date, board="strongest", min_rs=90)
        self.assertEqual(res["board"], "strongest")
        self.assertEqual(res["board_title"], "Strongest")
        self.assertGreater(len(res["stocks"]), 0)

        for s in res["stocks"]:
            self.assertGreaterEqual(s["rs_rank"], 90)
            self.assertGreaterEqual(s["close"], 5.0)

    def test_board_pre_market(self):
        res = self.service.get_leaderboard(target_date=self.test_date, board="pre_market", min_rs=0)
        self.assertEqual(res["board"], "pre_market")
        self.assertEqual(res["board_title"], "Pre-market")
        self.assertGreater(len(res["stocks"]), 0)

        for s in res["stocks"]:
            self.assertGreaterEqual(s["gap_pct"], 1.0)

    def test_exact_1w_return_benchmark(self):
        res = self.service.get_leaderboard(target_date=self.test_date, board="near_52w_high", min_rs=80)
        stocks_by_sym = {s["symbol"]: s for s in res["stocks"]}
        
        # TWST, NTRA, HZO benchmark from KovaView screenshot
        if "TWST" in stocks_by_sym:
            self.assertAlmostEqual(stocks_by_sym["TWST"]["ret_1w"], 31.26, delta=0.5)
            self.assertAlmostEqual(stocks_by_sym["TWST"]["change_pct"], 7.35, delta=0.5)
        if "NTRA" in stocks_by_sym:
            self.assertAlmostEqual(stocks_by_sym["NTRA"]["ret_1w"], 12.30, delta=0.5)
            self.assertAlmostEqual(stocks_by_sym["NTRA"]["change_pct"], 0.84, delta=0.5)
        if "HZO" in stocks_by_sym:
            self.assertAlmostEqual(stocks_by_sym["HZO"]["ret_1w"], 0.67, delta=0.5)
            self.assertAlmostEqual(stocks_by_sym["HZO"]["change_pct"], 0.46, delta=0.5)

    def test_router_get_leaderboard(self):
        res = get_leaderboard(date=self.test_date, board="gainers")
        self.assertEqual(res["board"], "gainers")
        self.assertIn("summary", res)
        self.assertIn("sector_distribution", res)
        self.assertIn("stocks", res)


if __name__ == "__main__":
    unittest.main()
