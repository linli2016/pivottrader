import unittest
from tests.test_db_helper import IsolatedDatabaseTestCase
from application.services.model_book_service import model_book_service

class TestModelBookService(IsolatedDatabaseTestCase):
    def test_scan_setups_returns_candidates(self):
        result = model_book_service.scan_setups(
            setup_type="breakout",
            start_date="2026-05-01",
            end_date="2026-07-01"
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
            self.assertIn("exchange", c)

    def test_scan_setups_power_play(self):
        result = model_book_service.scan_setups(
            setup_type="power_play",
            start_date="2026-01-01",
            end_date="2026-06-01"
        )
        self.assertIn("candidates", result)
        self.assertIsInstance(result["candidates"], list)

    def test_scan_setups_unique_symbol_per_result_first_occurrence(self):
        result = model_book_service.scan_setups(
            setup_type="breakout",
            start_date="2026-01-01",
            end_date="2026-08-01"
        )
        candidates = result.get("candidates", [])
        symbols = [c["symbol"] for c in candidates]
        self.assertEqual(len(symbols), len(set(symbols)), "Each stock should appear just once in scan results")

    def test_historical_rs_line_calculation(self):
        from application.services.database import db_service
        db_service.clear_caches()
        bars = db_service.get_stock_prices("AAPL", limit=200)
        self.assertGreater(len(bars), 0, "AAPL should have daily bars")
        for b in bars:
            self.assertIsNotNone(b.get("rs_line"), f"Bar on {b.get('time')} should have rs_line")
            self.assertIsInstance(b.get("rs_line"), float)

    def test_saved_trades_enrichment(self):
        from application.services.saved_trades_service import saved_trades_service
        trades = saved_trades_service.load_saved_trades()
        self.assertIsInstance(trades, list)

    def test_save_trade_resolves_screener_to_setup_tag(self):
        from application.services.saved_trades_service import saved_trades_service
        # Test direct tag resolution
        t_type, t_name = saved_trades_service.resolve_setup_tag("ipo_base")
        self.assertEqual(t_type, "IPO")
        self.assertEqual(t_name, "IPO Base")

        t_type_ep, t_name_ep = saved_trades_service.resolve_setup_tag("episodic_pivot")
        self.assertEqual(t_type_ep, "EP")

        t_type_bo, t_name_bo = saved_trades_service.resolve_setup_tag("power_play")
        self.assertEqual(t_type_bo, "BO")
        self.assertEqual(t_name_bo, "Breakout")

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

    def test_scan_setups_gainers_respects_screeners_yaml(self):
        res = model_book_service.scan_setups(
            setup_type="gainers",
            start_date="2026-05-01",
            end_date="2026-08-01"
        )
        candidates = res.get("candidates", [])
        self.assertIsInstance(candidates, list)
        symbols = [c["symbol"] for c in candidates]
        self.assertEqual(len(symbols), len(set(symbols)), "Each stock should appear just once")
        for c in candidates:
            self.assertEqual(c["setup_type"], "gainers")
            self.assertEqual(c["setup_tag"], "BO")

if __name__ == '__main__':
    unittest.main()

if __name__ == '__main__':
    unittest.main()

