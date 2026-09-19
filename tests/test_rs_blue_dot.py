import unittest
from application.services import db_service


class TestRSBlueDot(unittest.TestCase):
    def test_stock_prices_has_rs_line_and_blue_dot(self):
        # Fetch NVDA prices
        prices = db_service.get_stock_prices("NVDA", limit=50)

        self.assertIsInstance(prices, list)
        self.assertGreater(len(prices), 0)

        # Check that rs_line and is_rs_blue_dot exist in bar dicts
        first = prices[-1]
        self.assertIn("rs_line", first)
        self.assertIn("is_rs_blue_dot", first)
        self.assertIsInstance(first["is_rs_blue_dot"], bool)

    def test_rs_blue_dot_triggered_for_known_stock(self):
        # WTBA triggered RS blue dot on 2026-09-15
        prices = db_service.get_stock_prices("WTBA", limit=252)
        self.assertGreater(len(prices), 0)
        blue_dot_bars = [p for p in prices if p.get("is_rs_blue_dot")]
        self.assertGreater(len(blue_dot_bars), 0)



if __name__ == "__main__":
    unittest.main()
