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

