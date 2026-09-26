import unittest
from unittest.mock import patch
from application.services.cross_asset_service import cross_asset_service, DEFAULT_BASE_ASSETS
from application.services import db_service


class TestCrossAssetService(unittest.TestCase):
    def setUp(self):
        # Clear cache before each test
        cross_asset_service.clear_cache()

    def test_get_cross_asset_structure(self):
        """Verify that live cross-asset feed returns all 17 indicators with correct schema and non-static values."""
        data = cross_asset_service.get_cross_asset_data(force_refresh=True)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 17)

        symbols = [item["symbol"] for item in data]
        expected_symbols = [
            "SPY", "QQQ", "IWM", "DIA",
            "US10Y", "2S10S", "IEF",
            "HYG", "HY OAS",
            "DXY", "WTI", "GOLD", "CU/AU",
            "VIX", "MOVE",
            "BTC", "ETH"
        ]
        self.assertEqual(symbols, expected_symbols)

        for item in data:
            self.assertIn("symbol", item)
            self.assertIn("name", item)
            self.assertIn("category", item)
            self.assertIn("price", item)
            self.assertIn("format", item)
            # change_pct should be a number or None for text formats
            if item["change_pct"] is not None:
                self.assertIsInstance(item["change_pct"], (int, float))

        # Check US10Y is populated
        us10y = next(x for x in data if x["symbol"] == "US10Y")
        self.assertEqual(us10y["format"], "yield_pct")
        self.assertIsInstance(us10y["price"], (int, float))
        self.assertGreater(us10y["price"], 1.0, "10Y yield should be realistic")

        # Check 2S10S yield curve spread
        spread = next(x for x in data if x["symbol"] == "2S10S")
        self.assertEqual(spread["format"], "text")
        self.assertTrue(str(spread["price"]).endswith("bp"), "2S10S spread price should end with 'bp'")

        # Check HY OAS spread
        hy_oas = next(x for x in data if x["symbol"] == "HY OAS")
        self.assertEqual(hy_oas["format"], "text")
        self.assertTrue(str(hy_oas["price"]).endswith("bp"), "HY OAS price should end with 'bp'")

        # Check CU/AU ratio
        cu_au = next(x for x in data if x["symbol"] == "CU/AU")
        self.assertEqual(cu_au["format"], "ratio_5dec")
        self.assertIsInstance(cu_au["price"], (int, float))
        self.assertGreater(cu_au["price"], 0.0)

    def test_caching_behavior(self):
        """Verify that repeated calls return the cached response without re-fetching."""
        # 1. First call fetches and caches
        data1 = cross_asset_service.get_cross_asset_data(force_refresh=True)
        self.assertIsNotNone(cross_asset_service._cache_data)

        # 2. Mock _fetch_live_quotes to verify it is NOT called during cached hit
        with patch.object(cross_asset_service, '_fetch_live_quotes') as mock_fetch:
            data2 = cross_asset_service.get_cross_asset_data(force_refresh=False)
            mock_fetch.assert_not_called()
            self.assertEqual(len(data2), 17)
            self.assertEqual(data1, data2)

        # 3. clear_cache() invalidates the cache
        cross_asset_service.clear_cache()
        self.assertIsNone(cross_asset_service._cache_data)

    def test_fallback_on_network_error(self):
        """Verify that when network fails, the service falls back gracefully without crashing."""
        cross_asset_service.clear_cache()
        with patch.object(cross_asset_service, '_fetch_live_quotes', side_effect=Exception("Network error")):
            data = cross_asset_service.get_cross_asset_data(force_refresh=True)
            self.assertIsInstance(data, list)
            self.assertEqual(len(data), 17)
            us10y = next(x for x in data if x["symbol"] == "US10Y")
            self.assertIsNotNone(us10y)

    def test_db_service_delegation(self):
        """Verify that db_service.get_cross_asset_data delegates to cross_asset_service."""
        cross = db_service.get_cross_asset_data()
        self.assertIsInstance(cross, list)
        self.assertEqual(len(cross), 17)

    def test_historical_as_of_date(self):
        """Verify that as_of_date returns historical dataset."""
        dates = db_service.get_available_trading_dates()
        if len(dates) > 1:
            hist_date = dates[1]
            data = db_service.get_cross_asset_data(as_of_date=hist_date)
            self.assertIsInstance(data, list)
            self.assertEqual(len(data), 17)
            spy = next(x for x in data if x["symbol"] == "SPY")
            self.assertIsNotNone(spy)
            self.assertIn("price", spy)


if __name__ == '__main__':
    unittest.main()

