import unittest
from application.engine.expression import ScanExpressionEngine, ExpressionError

class TestScanExpressionEngine(unittest.TestCase):
    def test_user_prompt_expression(self):
        expr = "((C - C1) >= 5 AND V > 10000 AND C >= 62.50 AND V > V1) OR ((( 100 * (C - C1) / C1) >= 8 AND V > 3000 AND (100 * V / AVGV50) >= 300) AND C > 1)"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIsNone(res["error"])
        self.assertTrue(res["has_lags"])
        self.assertIn("C", res["variables"])
        self.assertIn("C1", res["variables"])
        self.assertIn("V", res["variables"])
        self.assertIn("V1", res["variables"])
        self.assertIn("AVGV50", res["variables"])
        # Check generated SQL
        sql = res["sql"]
        self.assertIn("b.close", sql)
        self.assertIn("b.lag_c1", sql)
        self.assertIn("b.volume", sql)
        self.assertIn("b.lag_v1", sql)

    def test_boolean_flags_and_stage2(self):
        expr = "STAGE2 AND C >= 10.0 AND DOLLAR_VOL >= 3000000"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertFalse(res["has_lags"])
        self.assertIn("STAGE2", res["variables"])
        self.assertIn("sma_50", res["sql"])

    def test_pattern_primitives(self):
        expr = "RUNUP >= 100 AND RUNUP_DAYS <= 40 AND PULLBACK <= 25 AND DAYS_SINCE_PEAK >= 10"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("pp_runup_pct", res["sql"])
        self.assertIn("pp_runup_days", res["sql"])
        self.assertIn("pp_drawdown_pct", res["sql"])
        self.assertIn("pp_days_since_peak", res["sql"])

        # Test backward-compatible aliases
        compat_expr = "PP_RUNUP >= 100 AND PP_DRAWDOWN <= 25 AND PP_DAYS >= 10"
        res_compat = ScanExpressionEngine.validate(compat_expr)
        self.assertTrue(res_compat["valid"])
        self.assertIn("pp_runup_pct", res_compat["sql"])

    def test_52w_high_days_expressions(self):
        # Test primary name DAYS_52W_HIGH and aliases DAYS_SINCE_52W_HIGH, HIGH_52W_DAYS
        expr1 = "DAYS_52W_HIGH <= 20 AND DIST_52W_HIGH <= 10.0"
        res1 = ScanExpressionEngine.validate(expr1)
        self.assertTrue(res1["valid"])
        self.assertIn("b.days_since_52w_high <= 20", res1["sql"])
        self.assertIn("b.dist_from_52w_high <= 10.0", res1["sql"])

        expr2 = "DAYS_SINCE_52W_HIGH >= 5 AND DAYS_SINCE_52W_HIGH <= 30"
        res2 = ScanExpressionEngine.validate(expr2)
        self.assertTrue(res2["valid"])
        self.assertIn("b.days_since_52w_high >= 5", res2["sql"])
        self.assertIn("b.days_since_52w_high <= 30", res2["sql"])

        expr3 = "HIGH_52W_DAYS == 0"
        res3 = ScanExpressionEngine.validate(expr3)
        self.assertTrue(res3["valid"])
        self.assertIn("b.days_since_52w_high = 0", res3["sql"])

    def test_single_equal_operator(self):
        expr = "C = 50.0 AND V >= 10000"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("b.close = 50.0", res["sql"])

    def test_case_insensitivity(self):
        expr = "c >= 5.0 and v > 50000 and (c - c1) / c1 * 100 >= 5"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("C", res["variables"])
        self.assertIn("C1", res["variables"])

    def test_functions_abs_max_min(self):
        expr = "ABS(C - C1) >= 2.0 AND MAX(C, O) >= 25.0"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("ABS(", res["sql"])
        self.assertIn("GREATEST(", res["sql"])

    def test_unknown_variable_rejection(self):
        expr = "C >= 5 AND INVALID_VAR_NAME > 100"
        res = ScanExpressionEngine.validate(expr)
        self.assertFalse(res["valid"])
        self.assertIn("Unknown variable 'INVALID_VAR_NAME'", res["error"])

    def test_malicious_or_disallowed_syntax(self):
        expr = "__import__('os').system('ls')"
        res = ScanExpressionEngine.validate(expr)
        self.assertFalse(res["valid"])

    def test_syntax_error_handling(self):
        expr = "C >= AND V > 100"
        res = ScanExpressionEngine.validate(expr)
        self.assertFalse(res["valid"])
        self.assertIn("Syntax error", res["error"])

    def test_variables_by_category(self):
        categories = ScanExpressionEngine.get_variables_by_category()
        self.assertIn("price", categories)
        self.assertIn("volume", categories)
        self.assertIn("averages", categories)
        self.assertIn("pattern", categories)
        self.assertTrue(len(categories["price"]) > 0)

    def test_xavgc50_and_ema_variables(self):
        expr = "C > XAVGC50 AND XAVGC10 > XAVGC20 AND XAVGC20 > XAVGC50"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("b.ema_50", res["sql"])
        self.assertIn("b.ema_10", res["sql"])
        self.assertIn("b.ema_20", res["sql"])
        self.assertIn("XAVGC50", res["variables"])

    def test_order_by_and_limit_parsing(self):
        expr = "C >= 5.0 AND DOLLAR_VOL >= 10000000 AND RET_1M >= 20.0 ORDER BY RET_1M DESC LIMIT 50"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertEqual(res["order_by_sql"], "b.ret_1m DESC")
        self.assertEqual(res["limit"], 50)
        self.assertIn("b.close >= 5.0", res["sql"])
        self.assertIn("b.ret_1m >= 20.0", res["sql"])
        self.assertIsNone(res["qualify_sql"])

    def test_top_window_function_qualify_separation(self):
        expr = "C >= 5.0 AND DOLLAR_VOL >= 10000000 AND TOP(RET_1M, 50)"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        # WHERE should contain liquid/price filters only
        self.assertIn("b.close >= 5.0", res["sql"])
        self.assertNotIn("DENSE_RANK", res["sql"])
        # QUALIFY should contain window rank
        self.assertIsNotNone(res["qualify_sql"])
        self.assertIn("DENSE_RANK() OVER (ORDER BY b.ret_1m DESC NULLS LAST) <= 50", res["qualify_sql"])

    def test_all_gainers_compound_top_qualify(self):
        expr = "C >= 5.0 AND DOLLAR_VOL >= 10000000 AND ((RET_1M >= 20.0 AND TOP(RET_1M, 50)) OR (RET_3M >= 30.0 AND TOP(RET_3M, 50)) OR (RET_6M >= 50.0 AND TOP(RET_6M, 50)))"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("b.close >= 5.0", res["sql"])
        self.assertNotIn("DENSE_RANK", res["sql"])
        # Window functions partitioned into qualify
        self.assertIn("DENSE_RANK() OVER (ORDER BY b.ret_1m DESC NULLS LAST) <= 50", res["qualify_sql"])
        self.assertIn("DENSE_RANK() OVER (ORDER BY b.ret_3m DESC NULLS LAST) <= 50", res["qualify_sql"])
        self.assertIn("DENSE_RANK() OVER (ORDER BY b.ret_6m DESC NULLS LAST) <= 50", res["qualify_sql"])
        self.assertEqual(sorted(res["variables"]), ["C", "DOLLAR_VOL", "RET_1M", "RET_3M", "RET_6M"])

    def test_rank_function(self):
        expr = "C >= 5.0 AND RANK(RET_1M) <= 10"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("DENSE_RANK() OVER (ORDER BY b.ret_1m DESC NULLS LAST)", res["qualify_sql"])

    def test_invalid_top_syntax(self):
        # TOP requires 2 arguments: (metric, N)
        expr = "C >= 5.0 AND TOP(RET_1M)"
        res = ScanExpressionEngine.validate(expr)
        self.assertFalse(res["valid"])
        self.assertIn("TOP() requires at least 2 arguments", res["error"])

    def test_alias_stage2_expansion(self):
        res = ScanExpressionEngine.validate("STAGE2")
        self.assertTrue(res["valid"])
        self.assertIn("STAGE2", res["variables"])
        self.assertIn("SMA_50", res["variables"])
        self.assertIn("SMA_150", res["variables"])
        self.assertIn("SMA_200", res["variables"])
        self.assertIn("SMA_200_20D_AGO", res["variables"])
        self.assertIn("DIST_52W_HIGH", res["variables"])
        self.assertIn("DIST_52W_LOW", res["variables"])
        sql = res["sql"]
        self.assertIn("b.sma_50 IS NOT NULL", sql)
        self.assertIn("b.close > b.sma_50", sql)
        self.assertIn("b.sma_50 > b.sma_150", sql)
        self.assertIn("b.sma_150 > b.sma_200", sql)
        self.assertIn("b.sma_200_20d_ago IS NULL", sql)
        self.assertIn("b.dist_from_52w_low >= 25.0", sql)

    def test_dist_52w_low_and_surge_off_low(self):
        # DIST_52W_LOW direct expression
        res_low = ScanExpressionEngine.validate("DIST_52W_LOW >= 25.0")
        self.assertTrue(res_low["valid"])
        self.assertIn("DIST_52W_LOW", res_low["variables"])
        self.assertEqual(res_low["sql"], "(b.dist_from_52w_low >= 25.0)")

        # Backward compatibility with SURGE_OFF_LOW
        res_surge = ScanExpressionEngine.validate("SURGE_OFF_LOW >= 25.0")
        self.assertTrue(res_surge["valid"])
        self.assertIn("SURGE_OFF_LOW", res_surge["variables"])
        self.assertEqual(res_surge["sql"], "(b.dist_from_52w_low >= 25.0)")

        # Both present in catalog
        cat = ScanExpressionEngine.get_catalog()
        self.assertIn("DIST_52W_LOW", cat)
        self.assertIn("SURGE_OFF_LOW", cat)

    def test_alias_low_cheat(self):
        res = ScanExpressionEngine.validate("LOW_CHEAT")
        self.assertTrue(res["valid"])
        self.assertIn("LOW_CHEAT", res["variables"])
        self.assertIn("SMA_50", res["variables"])
        self.assertIn("SMA_150", res["variables"])
        self.assertIn("SMA_200", res["variables"])
        # Must NOT require C > SMA_50
        self.assertNotIn("b.close > b.sma_50", res["sql"])
        # Must retain macro trend template
        self.assertIn("b.sma_50 > b.sma_150", res["sql"])
        self.assertIn("b.sma_150 > b.sma_200", res["sql"])

    def test_alias_breakout_and_episodic_pivot(self):
        res_bo = ScanExpressionEngine.validate("BREAKOUT")
        self.assertTrue(res_bo["valid"])
        self.assertIn("BREAKOUT", res_bo["variables"])
        self.assertIn("RUNUP", res_bo["variables"])
        self.assertIn("b.pp_runup_pct", res_bo["sql"])

        res_ep = ScanExpressionEngine.validate("EPISODIC_PIVOT")
        self.assertTrue(res_ep["valid"])
        self.assertIn("EPISODIC_PIVOT", res_ep["variables"])
        self.assertIn("GAP_PCT", res_ep["variables"])
        self.assertIn("REL_VOL", res_ep["variables"])

        res_ipo = ScanExpressionEngine.validate("IPO_BASE")
        self.assertTrue(res_ipo["valid"])
        self.assertIn("IPO_BASE", res_ipo["variables"])
        self.assertIn("IPO_DAYS", res_ipo["variables"])

    def test_is_null_and_is_not_null_syntax(self):
        # IS NOT NULL / IS NULL
        res1 = ScanExpressionEngine.validate("SMA_50 IS NOT NULL AND SMA_200_20D_AGO IS NULL")
        self.assertTrue(res1["valid"])
        self.assertIn("b.sma_50 IS NOT NULL", res1["sql"])
        self.assertIn("b.sma_200_20d_ago IS NULL", res1["sql"])

        # != NULL and == NULL
        res2 = ScanExpressionEngine.validate("SMA_50 != NULL AND SMA_200_20D_AGO == NULL")
        self.assertTrue(res2["valid"])
        self.assertIn("b.sma_50 IS NOT NULL", res2["sql"])
        self.assertIn("b.sma_200_20d_ago IS NULL", res2["sql"])

    def test_composite_expression_with_stage2(self):
        expr = "C >= 15 AND STAGE2 AND V > 100000"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("STAGE2", res["variables"])
        self.assertIn("C", res["variables"])
        self.assertIn("V", res["variables"])
        self.assertIn("b.close >= 15", res["sql"])
        self.assertIn("b.volume > 100000", res["sql"])
        self.assertIn("b.sma_50 IS NOT NULL", res["sql"])

    def test_alias_negation(self):
        expr = "NOT STAGE2"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("NOT", res["sql"])

    def test_circular_alias_detection(self):
        from application.engine.expression import ALIAS_CATALOG
        # Temporarily inject circular alias
        ALIAS_CATALOG["_TEST_CIRC_A"] = {"expr": "_TEST_CIRC_B > 1", "type": "boolean", "label": "A"}
        ALIAS_CATALOG["_TEST_CIRC_B"] = {"expr": "_TEST_CIRC_A > 1", "type": "boolean", "label": "B"}
        try:
            with self.assertRaises(ExpressionError):
                ScanExpressionEngine.expand_aliases("_TEST_CIRC_A")
        finally:
            del ALIAS_CATALOG["_TEST_CIRC_A"]
            del ALIAS_CATALOG["_TEST_CIRC_B"]

    def test_get_alias_sql_table_aliases(self):
        sql_b = ScanExpressionEngine.get_alias_sql("STAGE2", table_alias="b")
        self.assertIn("b.close > b.sma_50", sql_b)

        sql_db = ScanExpressionEngine.get_alias_sql("STAGE2", table_alias="db")
        self.assertIn("db.close > db.sma_50", sql_db)

        sql_none = ScanExpressionEngine.get_alias_sql("STAGE2", table_alias="")
        self.assertIn("close > sma_50", sql_none)

    def test_catalog_and_category_metadata(self):
        cat = ScanExpressionEngine.get_catalog()
        self.assertIn("STAGE2", cat)
        self.assertTrue(cat["STAGE2"]["is_alias"])
        self.assertIn("expr", cat["STAGE2"])

        grouped = ScanExpressionEngine.get_variables_by_category()
        trend_symbols = [item["symbol"] for item in grouped["trend"]]
        self.assertIn("STAGE2", trend_symbols)


    def test_minervini_trend_templates(self):
        # Test STAGE2_1M
        res_1m = ScanExpressionEngine.validate("STAGE2_1M AND RS_RANK >= 70 AND C >= 5.0 AND DOLLAR_VOL >= 10000000")
        self.assertTrue(res_1m["valid"])
        self.assertIn("STAGE2_1M", res_1m["variables"])
        self.assertIn("b.sma_200_20d_ago", res_1m["sql"])
        self.assertIn("b.sma_200_80d_ago", res_1m["sql"])

        # Test STAGE2_1_4M
        res_1_4m = ScanExpressionEngine.validate("STAGE2_1_4M AND RS_RANK >= 70 AND C >= 5.0 AND DOLLAR_VOL >= 10000000")
        self.assertTrue(res_1_4m["valid"])
        self.assertIn("STAGE2_1_4M", res_1_4m["variables"])
        self.assertIn("b.sma_200_80d_ago", res_1_4m["sql"])
        self.assertIn("b.sma_200_100d_ago", res_1_4m["sql"])

        # Test STAGE2_5M
        res_5m = ScanExpressionEngine.validate("STAGE2_5M AND RS_RANK >= 70 AND C >= 5.0 AND DOLLAR_VOL >= 10000000")
        self.assertTrue(res_5m["valid"])
        self.assertIn("STAGE2_5M", res_5m["variables"])
        self.assertIn("b.sma_200_100d_ago", res_5m["sql"])

    def test_sma200_lags_catalog(self):
        cat = ScanExpressionEngine.get_catalog()
        self.assertIn("SMA_200_80D_AGO", cat)
        self.assertIn("SMA200_80D", cat)
        self.assertIn("SMA_200_100D_AGO", cat)
        self.assertIn("SMA200_100D", cat)
        self.assertIn("STAGE2_1M", cat)
        self.assertIn("STAGE2_1_4M", cat)
        self.assertIn("STAGE2_5M", cat)

        res = ScanExpressionEngine.validate("SMA200 > SMA200_80D AND SMA200 > SMA200_100D")
        self.assertTrue(res["valid"])
        self.assertIn("b.sma_200_80d_ago", res["sql"])
        self.assertIn("b.sma_200_100d_ago", res["sql"])


if __name__ == "__main__":
    unittest.main()


