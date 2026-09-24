import unittest
from application.services import db_service

class TestMarketMonitorAsOf(unittest.TestCase):
    def test_get_market_monitor_as_of_date(self):
        dates = db_service.get_available_trading_dates()
        self.assertIsInstance(dates, list)
        self.assertGreater(len(dates), 1, "Expected multiple available trading dates in database")

        latest_date = dates[0]
        hist_date = dates[1]

        # 1. Fetch latest data
        res_latest = db_service.get_market_monitor(limit=30)
        self.assertIn("summary", res_latest)
        self.assertEqual(res_latest["summary"]["latest_date"], latest_date)

        # 2. Fetch historical as_of_date
        res_hist = db_service.get_market_monitor(limit=30, as_of_date=hist_date)
        self.assertIn("summary", res_hist)
        self.assertEqual(res_hist["summary"]["latest_date"], hist_date)
        self.assertGreater(len(res_hist["daily_data"]), 0)
        self.assertEqual(res_hist["daily_data"][0]["date"], hist_date)

    def test_get_cross_asset_as_of_date(self):
        dates = db_service.get_available_trading_dates()
        if len(dates) > 1:
            hist_date = dates[1]
            cross = db_service.get_cross_asset_data(as_of_date=hist_date)
            self.assertIsInstance(cross, list)
            self.assertGreater(len(cross), 0)
            spy = next((x for x in cross if x["symbol"] == "SPY"), None)
            self.assertIsNotNone(spy)
            self.assertIn("price", spy)

    def test_market_participation_and_capital_flow(self):
        res = db_service.get_market_monitor(limit=5, force_refresh=True)
        summary = res.get("summary", {})
        self.assertIn("latest_advancers", summary)
        self.assertIn("latest_decliners", summary)
        self.assertIn("latest_cap_increased", summary)
        self.assertIn("latest_cap_decreased", summary)
        self.assertIn("latest_net_cap_flow", summary)
        self.assertIn("latest_up_dollar_vol", summary)
        self.assertIn("latest_down_dollar_vol", summary)

        self.assertGreater(summary["latest_total_active"], 1000)
        self.assertGreater(summary["latest_advancers"], 0)
        self.assertGreater(summary["latest_decliners"], 0)
        self.assertGreater(summary["latest_cap_increased"], 0.0)
        self.assertGreater(summary["latest_cap_decreased"], 0.0)

        # Check daily data fields
        first_row = res["daily_data"][0]
        self.assertIn("advancers", first_row)
        self.assertIn("decliners", first_row)
        self.assertIn("net_advancers", first_row)
        self.assertIn("net_cap_flow", first_row)
        self.assertIn("cap_advance_pct", first_row)
        self.assertIn("up_vol_pct", first_row)
        self.assertIn("regime", first_row)
        self.assertIn(first_row["regime"], ["BULLISH", "BEARISH", "NEUTRAL"])

        # Validate Stockbee Market Monitor primary logic:
        # up_25pct_3m > down_25pct_3m => BULLISH, up_25pct_3m < down_25pct_3m => BEARISH
        for r in res["daily_data"]:
            if r["up_25pct_3m"] > r["down_25pct_3m"]:
                self.assertEqual(r["regime"], "BULLISH")
            elif r["up_25pct_3m"] < r["down_25pct_3m"]:
                self.assertEqual(r["regime"], "BEARISH")
            else:
                self.assertEqual(r["regime"], "NEUTRAL")


