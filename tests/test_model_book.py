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

    def test_save_trade_resolves_screener_to_setup_tag(self):
        from application.services.saved_trades_service import saved_trades_service
        # Test direct tag resolution
        t_type, t_name = saved_trades_service.resolve_setup_tag("ipo_base")
        self.assertEqual(t_type, "IPO")
        self.assertEqual(t_name, "IPO Base")

        t_type_ep, t_name_ep = saved_trades_service.resolve_setup_tag("episodic_pivot")
        self.assertEqual(t_type_ep, "EP")

        t_type_htf, t_name_htf = saved_trades_service.resolve_setup_tag("power_play")
        self.assertEqual(t_type_htf, "HTF")

        # Test saving trade with screener id or tag
        saved = saved_trades_service.save_trade({
            "symbol": "TEST_IPO",
            "setup_date": "2026-01-05",
            "setup_type": "ipo_base",
            "notes": "Test IPO setup tag mapping"
        })
        try:
            self.assertEqual(saved["setup_type"], "IPO")
            self.assertEqual(saved["setup_name"], "IPO Base")
            self.assertIn("IPO", saved["tags"])
        finally:
            saved_trades_service.delete_saved_trade(saved["id"])

if __name__ == '__main__':
    unittest.main()

