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

    def test_saved_trades_enrichment(self):
        from application.services.saved_trades_service import saved_trades_service
        trades = saved_trades_service.load_saved_trades()
        self.assertIsInstance(trades, list)
        if len(trades) > 0:
            t = trades[0]
            self.assertIn("symbol", t)
            self.assertIn("name", t)
            self.assertIn("exchange", t)
            self.assertIn("sector", t)
            self.assertIn("industry", t)
            self.assertIn("rs_rank", t)
            self.assertIn("adr_20d", t)
            self.assertIn("ti_65", t)
            self.assertIn("ret_1m", t)

if __name__ == '__main__':
    unittest.main()

