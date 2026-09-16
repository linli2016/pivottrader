import unittest
from application.services.setup_service import setup_service
from application.services.database import db_service
from application.services.model_book_service import model_book_service

class TestMyUniverse(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Refresh setups config
        setup_service.load_config()

    def test_setup_configuration(self):
        """Test that momentum setup is properly configured as My Universe with 6 subviews."""
        config = setup_service.get_setups_config()
        momentum_setup = next((s for s in config["setups"] if s["id"] == "momentum"), None)
        self.assertIsNotNone(momentum_setup, "Setup 'momentum' should exist")
        self.assertEqual(momentum_setup["name"], "My Universe")
        self.assertEqual(momentum_setup["icon"], "🌌")
        self.assertEqual(momentum_setup.get("sub_title"), "Universe View:")

        sub_ids = [sub["id"] for sub in momentum_setup.get("sub_setups", [])]
        expected_subs = ["all", "stage2", "gainers", "1m", "3m", "6m"]
        self.assertEqual(sub_ids, expected_subs, f"Sub-setups should match {expected_subs}")

    def test_subviews_and_top_n(self):
        """Test subview filtering and verification that Top per scan applies to Gainers and not Stage 2."""
        base_filters = {
            "require_momentum": True,
            "min_price": 2.0,
            "min_dollar_vol": 3000000.0,
            "qm_top_n": 100
        }

        # 1. Test 1M gainers
        res_1m = db_service.get_candidates(filters={**base_filters, "qm_subview": "1m"})
        self.assertLessEqual(len(res_1m), 100)
        for c in res_1m:
            self.assertIn("1M", c.get("qm_timeframes", []))
            self.assertIsNotNone(c.get("ret_1m"))
            self.assertGreater(c["ret_1m"], 0)

        # 2. Test 3M gainers
        res_3m = db_service.get_candidates(filters={**base_filters, "qm_subview": "3m"})
        self.assertLessEqual(len(res_3m), 100)
        for c in res_3m:
            self.assertIn("3M", c.get("qm_timeframes", []))
            self.assertIsNotNone(c.get("ret_3m"))
            self.assertGreater(c["ret_3m"], 0)

        # 3. Test 6M gainers
        res_6m = db_service.get_candidates(filters={**base_filters, "qm_subview": "6m"})
        self.assertLessEqual(len(res_6m), 100)
        for c in res_6m:
            self.assertIn("6M", c.get("qm_timeframes", []))
            self.assertIsNotNone(c.get("ret_6m"))
            self.assertGreater(c["ret_6m"], 0)

        # 4. Test All Gainers
        res_gainers = db_service.get_candidates(filters={**base_filters, "qm_subview": "gainers"})
        self.assertGreater(len(res_gainers), 0)
        for c in res_gainers:
            self.assertGreater(len(c.get("qm_timeframes", [])), 0)

        # 5. Test Stage 2 view (all stocks matching stage template + base filter conditions)
        res_stage2 = db_service.get_candidates(filters={**base_filters, "qm_subview": "stage2"})
        self.assertGreater(len(res_stage2), 0)
        for c in res_stage2:
            self.assertTrue(c.get("is_stage2"), f"Ticker {c['symbol']} should have is_stage2=True")

        # 6. Test All view (union of Stage 2 + Gainers)
        res_all = db_service.get_candidates(filters={**base_filters, "qm_subview": "all"})
        self.assertGreaterEqual(len(res_all), len(res_stage2))
        self.assertGreaterEqual(len(res_all), len(res_gainers))

        # Check that symbols in All include all symbols from Stage 2 and All Gainers
        all_syms = {c["symbol"] for c in res_all}
        stage2_syms = {c["symbol"] for c in res_stage2}
        gainers_syms = {c["symbol"] for c in res_gainers}
        self.assertTrue(stage2_syms.issubset(all_syms))
        self.assertTrue(gainers_syms.issubset(all_syms))
        self.assertEqual(all_syms, stage2_syms | gainers_syms)

        # 7. Test that Top per scan affects gainers but does NOT affect Stage 2
        res_gainers_50 = db_service.get_candidates(filters={**base_filters, "qm_subview": "gainers", "qm_top_n": 50})
        res_stage2_50 = db_service.get_candidates(filters={**base_filters, "qm_subview": "stage2", "qm_top_n": 50})

        self.assertLess(len(res_gainers_50), len(res_gainers))
        self.assertEqual(len(res_stage2_50), len(res_stage2), "Stage 2 count should remain unchanged when qm_top_n changes")

    def test_rs_rank_filter(self):
        """Test that enable_rs and min_rs_percentile filters work correctly in My Universe."""
        config = setup_service.get_setups_config()
        momentum_setup = next((s for s in config["setups"] if s["id"] == "momentum"), None)
        self.assertIn("enable_rs", momentum_setup.get("visible_filters", []))
        self.assertIn("min_rs_percentile", momentum_setup.get("visible_filters", []))

        base_filters = {
            "require_momentum": True,
            "min_price": 2.0,
            "min_dollar_vol": 3000000.0,
            "qm_subview": "all",
            "enable_rs": True,
            "min_rs_percentile": 85
        }
        res = db_service.get_candidates(filters=base_filters)
        self.assertGreater(len(res), 0)
        for c in res:
            self.assertGreaterEqual(c["rs_rank"], 85)

    def test_model_book_scan_my_universe(self):
        """Test that model_book_service.scan_setups runs cleanly for My Universe across subviews."""
        # 1. Test default scan
        res = model_book_service.scan_setups(
            setup_type="momentum",
            start_date="2025-05-01",
            end_date="2025-05-31"
        )
        self.assertIn("summary", res)
        self.assertIn("winners", res)
        self.assertIn("all_candidates", res)
        self.assertGreater(res["summary"]["total_setups"], 0)

        # 2. Test each subview to ensure no BinderError or parameter mismatch
        for sub in ["all", "stage2", "gainers", "1m", "3m", "6m"]:
            sub_res = model_book_service.scan_setups(
                setup_type="momentum",
                start_date="2025-05-01",
                end_date="2025-05-31",
                filters={"qm_subview": sub}
            )
            self.assertGreater(sub_res["summary"]["total_setups"], 0, f"Expected setups for subview {sub}")

        # 3. Test with enable_rs disabled
        no_rs_res = model_book_service.scan_setups(
            setup_type="momentum",
            start_date="2025-05-01",
            end_date="2025-05-31",
            filters={"enable_rs": False}
        )
        self.assertGreater(no_rs_res["summary"]["total_setups"], res["summary"]["total_setups"])

if __name__ == "__main__":
    unittest.main()
