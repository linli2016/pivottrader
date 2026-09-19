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
        expr = "POWER_PLAY AND PP_RUNUP >= 100 AND PP_DRAWDOWN <= 25 AND PP_DAYS >= 10"
        res = ScanExpressionEngine.validate(expr)
        self.assertTrue(res["valid"])
        self.assertIn("pp_runup_pct", res["sql"])
        self.assertIn("pp_drawdown_pct", res["sql"])

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

if __name__ == "__main__":
    unittest.main()


