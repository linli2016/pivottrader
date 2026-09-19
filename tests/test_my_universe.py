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
        self.assertIn(momentum_setup["name"], ["My Universe", "Momentum Universe", "Momentum"])
        self.assertEqual(momentum_setup["icon"], "🌌")
        self.assertIn(momentum_setup.get("sub_title"), ["Momentum View:", "Universe View:"])

        sub_ids = [sub["id"] for sub in momentum_setup.get("sub_setups", [])]
        expected_subs = ["all", "stage2", "leaders", "gainers", "1m", "3m", "6m"]
        self.assertEqual(sub_ids, expected_subs, f"Sub-setups should match {expected_subs}")

        # Test expression configuration
        self.assertIn("RET_1M", momentum_setup["expression"])
        self.assertIn("STAGE2", momentum_setup["expression"])

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
        leaders_sub = next(s for s in momentum_setup["sub_setups"] if s["id"] == "leaders")
        self.assertIn("RS_RANK >= 90", leaders_sub["expression"])

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

    def test_min_breakout_days_filter(self):
        """Test that min_breakout_days filters candidates by consolidation days (excluding stocks at ATH like VLO)."""
        base_filters = {
            "require_momentum": True,
            "min_price": 2.0,
            "min_dollar_vol": 3000000.0,
            "qm_subview": "all"
        }
        # 1. With min_breakout_days = 0, VLO at ATH is included
        res_0 = db_service.get_candidates(filters={**base_filters, "min_breakout_days": 0})
        vlo_0 = next((c for c in res_0 if c["symbol"] == "VLO"), None)
        self.assertIsNotNone(vlo_0, "VLO should be present when min_breakout_days=0")

        # 2. With min_breakout_days = 10, VLO (days_since_peak=0) must be excluded
        res_10 = db_service.get_candidates(filters={**base_filters, "min_breakout_days": 10})
        vlo_10 = next((c for c in res_10 if c["symbol"] == "VLO"), None)
        self.assertIsNone(vlo_10, "VLO at ATH (days_since_peak=0) must be excluded when min_breakout_days=10")

        # Verify all candidates in res_10 satisfy pp_days_since_peak >= 10
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
        self.assertGreater(len(res_leaders), 0, "Expected candidates in Leaders subview")

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
        for sub in ["all", "stage2", "leaders", "gainers", "1m", "3m", "6m"]:
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
