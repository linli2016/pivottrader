import unittest
from application.services.database import db_service


class TestStockPrices(unittest.TestCase):
    def test_get_stock_prices_daily(self):
        prices = db_service.get_stock_prices("AAPL", limit=50, timeframe="daily")
        self.assertGreater(len(prices), 0)
        self.assertLessEqual(len(prices), 50)
        p = prices[-1]
        self.assertIn("time", p)
        self.assertIn("open", p)
        self.assertIn("high", p)
        self.assertIn("low", p)
        self.assertIn("close", p)
        self.assertIn("volume", p)
        self.assertIn("rs_line", p)
        self.assertIn("is_rs_blue_dot", p)

    def test_get_stock_prices_weekly(self):
        prices = db_service.get_stock_prices("AAPL", limit=50, timeframe="weekly")
        self.assertGreater(len(prices), 0)
        self.assertLessEqual(len(prices), 50)
        p = prices[-1]
        self.assertIn("time", p)
        self.assertIn("open", p)
        self.assertIn("high", p)
        self.assertIn("low", p)
        self.assertIn("close", p)
        self.assertIn("volume", p)
        self.assertIn("sma_10w", p)
        self.assertIn("sma_30w", p)
        self.assertIn("sma_40w", p)
        self.assertIn("rs_line", p)
        self.assertIn("is_rs_blue_dot", p)

        # Check geometry of weekly bars
        for bar in prices:
            self.assertLessEqual(bar["low"], bar["high"])
            self.assertGreaterEqual(bar["high"], bar["open"])
            self.assertGreaterEqual(bar["high"], bar["close"])
            self.assertLessEqual(bar["low"], bar["open"])
            self.assertLessEqual(bar["low"], bar["close"])


if __name__ == "__main__":
    unittest.main()

