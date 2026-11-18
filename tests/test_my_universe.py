import unittest
from tests.test_db_helper import IsolatedDatabaseTestCase
from application.services.setup_service import setup_service
from application.services.database import db_service
from application.services.model_book_service import model_book_service

class TestMyUniverse(IsolatedDatabaseTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Refresh setups config
        setup_service.load_config()

    def test_setup_configuration(self):
        """Test that momentum screener definitions are properly configured."""
        leaders = setup_service.get_setup_by_id("gainers")
        self.assertIsNotNone(leaders, "Screener 'gainers' should exist")
        self.assertIn("RS_RANK", leaders["expression"])

        all_screener = setup_service.get_setup_by_id("all")
        self.assertIsNotNone(all_screener, "Screener 'all' should exist")
        self.assertIn("RET_1M", all_screener["expression"])
        self.assertTrue("STAGE2" in all_screener["expression"] or "CONFIRMED_STAGED" in all_screener["expression"])

    def test_subviews_and_top_n(self):
        """Test subview filtering and verification of candidate retrieval."""
        base_filters = {
            "require_momentum": True,
            "min_price": 2.0,
            "min_dollar_vol": 3000000.0,
            "qm_top_n": 100
        }

        # 1. Test 1M gainers
        res_1m = db_service.get_candidates(filters={**base_filters, "qm_subview": "1m"})
        self.assertIsInstance(res_1m, list)
        for c in res_1m:
            self.assertIn("1M", c.get("qm_timeframes", []))
            self.assertIsNotNone(c.get("ret_1m"))

        # 2. Test 3M gainers
        res_3m = db_service.get_candidates(filters={**base_filters, "qm_subview": "3m"})
        self.assertIsInstance(res_3m, list)
        for c in res_3m:
            self.assertIn("3M", c.get("qm_timeframes", []))
            self.assertIsNotNone(c.get("ret_3m"))

        # 3. Test 6M gainers
        res_6m = db_service.get_candidates(filters={**base_filters, "qm_subview": "6m"})
        self.assertIsInstance(res_6m, list)
        for c in res_6m:
            self.assertIn("6M", c.get("qm_timeframes", []))
            self.assertIsNotNone(c.get("ret_6m"))

        # 4. Test All Gainers
        res_gainers = db_service.get_candidates(filters={**base_filters, "qm_subview": "gainers"})
        self.assertIsInstance(res_gainers, list)
        for c in res_gainers:
            self.assertGreater(len(c.get("qm_timeframes", [])), 0)

        # 5. Test Stage 2 view (all stocks matching stage template + base filter conditions)
        res_stage2 = db_service.get_candidates(filters={**base_filters, "qm_subview": "stage2"})
        self.assertIsInstance(res_stage2, list)
        for c in res_stage2:
            self.assertTrue(c.get("is_stage2"), f"Ticker {c['symbol']} should have is_stage2=True")

        # 6. Test All view (union of Stage 2 + Gainers)
        res_all = db_service.get_candidates(filters={**base_filters, "qm_subview": "all"})
        self.assertIsInstance(res_all, list)

        # 7. Test top_n parameter does not cause SQL errors
        res_gainers_50 = db_service.get_candidates(filters={**base_filters, "qm_subview": "gainers", "qm_top_n": 50})
        self.assertIsInstance(res_gainers_50, list)

    def test_rs_rank_filter(self):
        """Test that enable_rs and min_rs_percentile filters work correctly in My Universe."""
        leaders = setup_service.get_setup_by_id("gainers")
        self.assertIsNotNone(leaders, "Screener 'gainers' should exist")
        self.assertIn("RS_RANK", leaders["expression"])

        base_filters = {
            "require_momentum": True,
            "min_price": 2.0,
            "min_dollar_vol": 3000000.0,
            "qm_subview": "all",
            "enable_rs": True,
            "min_rs_percentile": 85
        }
        res = db_service.get_candidates(filters=base_filters)
        self.assertIsInstance(res, list)
        for c in res:
            self.assertGreaterEqual(c["rs_rank"], 85)

    def test_min_breakout_days_filter(self):
        """Test that min_breakout_days filters candidates by consolidation days."""
        base_filters = {
            "require_momentum": True,
            "min_price": 2.0,
            "min_dollar_vol": 3000000.0,
            "qm_subview": "all"
        }
        res_0 = db_service.get_candidates(filters={**base_filters, "min_breakout_days": 0})
        self.assertIsInstance(res_0, list)

        res_10 = db_service.get_candidates(filters={**base_filters, "min_breakout_days": 10})
        self.assertIsInstance(res_10, list)
        for c in res_10:
            days = c.get("pp_days_since_peak") or c.get("breakout_consolidation_days") or 0
            self.assertGreaterEqual(days, 10, f"Candidate {c['symbol']} has fewer than 10 consolidation days: {days}")

    def test_leaders_subview(self):
        """Test Leaders subview satisfies all rules (Price>=10, ADR>=4%, RS>=90, Close>SMA50, EMA10>EMA20, Surge>=70%, Consolidation>=10d)."""
        base_filters = {
            "require_momentum": True,
            "min_dollar_vol": 3000000.0,
            "qm_subview": "leaders",
            "min_breakout_days": 10
        }
        res_leaders = db_service.get_candidates(filters=base_filters)
        self.assertIsInstance(res_leaders, list)
        for c in res_leaders:
            self.assertIsNotNone(c.get("close"), f"Candidate {c['symbol']} missing close")
            self.assertGreaterEqual(c["close"], 10.0, f"{c['symbol']} Close {c['close']} < $10.0")
            self.assertIsNotNone(c.get("adr_20d"), f"Candidate {c['symbol']} missing adr_20d")
            self.assertGreaterEqual(c["adr_20d"], 4.0, f"{c['symbol']} ADR {c['adr_20d']} < 4.0")
            self.assertIsNotNone(c.get("rs_rank"), f"Candidate {c['symbol']} missing rs_rank")
            self.assertGreaterEqual(c["rs_rank"], 90, f"{c['symbol']} RS {c['rs_rank']} < 90")
            self.assertIsNotNone(c.get("sma_50"), f"Candidate {c['symbol']} missing sma_50")
            self.assertGreater(c["close"], c["sma_50"], f"{c['symbol']} Close {c['close']} <= SMA50 {c['sma_50']}")
            self.assertIsNotNone(c.get("ema_10"), f"Candidate {c['symbol']} missing ema_10")
            self.assertIsNotNone(c.get("ema_20"), f"Candidate {c['symbol']} missing ema_20")
            self.assertGreater(c["ema_10"], c["ema_20"], f"{c['symbol']} EMA10 {c['ema_10']} <= EMA20 {c['ema_20']}")
            self.assertIsNotNone(c.get("surge_off_low_pct"), f"Candidate {c['symbol']} missing surge_off_low_pct")
            self.assertGreaterEqual(c["surge_off_low_pct"], 70.0, f"{c['symbol']} Surge {c['surge_off_low_pct']} < 70%")
            days = c.get("pp_days_since_peak") or c.get("breakout_consolidation_days") or 0
            self.assertGreaterEqual(days, 10, f"Candidate {c['symbol']} has fewer than 10 consolidation days: {days}")

    def test_model_book_scan_my_universe(self):
        """Test that model_book_service.scan_setups runs cleanly for My Universe across subviews."""
        # 1. Test default scan on fixture date range
        res = model_book_service.scan_setups(
            setup_type="momentum",
            start_date="2026-05-01",
            end_date="2026-05-31"
        )
        self.assertIn("summary", res)
        self.assertIn("winners", res)
        self.assertIn("all_candidates", res)

        # 2. Test each subview to ensure no BinderError or parameter mismatch
        for sub in ["all", "stage2", "leaders", "gainers", "1m", "3m", "6m"]:
            sub_res = model_book_service.scan_setups(
                setup_type="momentum",
                start_date="2026-05-01",
                end_date="2026-05-31",
                filters={"qm_subview": sub}
            )
            self.assertIn("summary", sub_res)
            self.assertIn("winners", sub_res)

        # 3. Test with enable_rs disabled
        no_rs_res = model_book_service.scan_setups(
            setup_type="momentum",
            start_date="2026-05-01",
            end_date="2026-05-31",
            filters={"enable_rs": False}
        )
        self.assertIn("summary", no_rs_res)

if __name__ == "__main__":
    unittest.main()

if __name__ == "__main__":
    unittest.main()
