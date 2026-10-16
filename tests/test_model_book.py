import unittest
from application.services.model_book_service import model_book_service

class TestModelBookService(unittest.TestCase):
    def test_scan_setups_returns_candidates(self):
        result = model_book_service.scan_setups(
            setup_type="breakout",
            start_date="2025-06-01",
            end_date="2025-07-01"
        )
        self.assertIn("candidates", result)
        self.assertIn("trades", result)
        candidates = result["candidates"]
        self.assertIsInstance(candidates, list)
        if len(candidates) > 0:
            c = candidates[0]
            self.assertIn("symbol", c)
            self.assertIn("setup_date", c)
            self.assertIn("adr_20d", c)
            self.assertIn("pivot_price", c)
            self.assertIn("ti_65", c)
            self.assertIn("ret_1m", c)
            self.assertIn("exchange", c)

    def test_scan_setups_power_play(self):
        result = model_book_service.scan_setups(
            setup_type="power_play",
            start_date="2025-01-01",
            end_date="2025-06-01"
        )
        self.assertIn("candidates", result)
        self.assertIsInstance(result["candidates"], list)

if __name__ == '__main__':
    unittest.main()

