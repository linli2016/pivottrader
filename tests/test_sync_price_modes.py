import os
import unittest
import tempfile
import datetime
import pandas as pd
from unittest.mock import patch, MagicMock
from application.database import DatabaseManager
from application.providers.yfinance_prov import YFinanceProvider


class TestSyncPriceModes(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_sync.db")
        self.db = DatabaseManager(self.db_path)
        self.provider = YFinanceProvider()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_database_manager_get_all_watchlist_symbols(self):
        # Create watchlist and items
        with self.db.get_connection() as conn:
            conn.execute("INSERT OR IGNORE INTO watchlist_items (watchlist_id, symbol) VALUES (1, 'AAPL'), (1, 'NVDA')")
        
        syms = self.db.get_all_watchlist_symbols()
        self.assertIn("AAPL", syms)
        self.assertIn("NVDA", syms)

    @patch("yfinance.download")
    @patch("application.providers.yfinance_prov.YFinanceProvider.get_market_session_status")
    def test_fetch_daily_bars_when_market_open_uses_latest_price(self, mock_status, mock_download):
        mock_status.return_value = {
            "state": "REGULAR",
            "target_date": "2026-11-16",
            "trading_date": "2026-11-16",
            "base_date": "2026-11-13",
            "reason": "Regular market open"
        }
        # Mock yf.download returning completed bars up to yesterday (2026-11-13)
        yesterday_df = pd.DataFrame([{
            "Date": pd.Timestamp("2026-11-13"),
            "Open": 100.0, "High": 105.0, "Low": 99.0, "Close": 104.0, "Volume": 500000,
            "Stock Splits": 0.0
        }])
        mock_download.return_value = yesterday_df

        # Mock quote response with latest intraday price for today
        with patch("yfinance.data.YfData.get_raw_json") as mock_json:
            mock_json.return_value = {
                "quoteResponse": {
                    "result": [{
                        "symbol": "AAPL",
                        "regularMarketPrice": 108.5,
                        "regularMarketOpen": 105.0,
                        "regularMarketDayHigh": 109.0,
                        "regularMarketDayLow": 104.5,
                        "regularMarketVolume": 1200000,
                        "regularMarketTime": int(datetime.datetime(2026, 11, 16, 14, 0).timestamp())
                    }]
                }
            }
            bars = self.provider.fetch_daily_bars(["AAPL"], start_date="2026-11-10")
            
            self.assertFalse(bars.empty)
            today_bars = bars[bars["date"] == datetime.date(2026, 11, 16)]
            self.assertEqual(len(today_bars), 1)
            # Must have latest price (108.5)
            self.assertEqual(today_bars.iloc[0]["close"], 108.5)
            self.assertEqual(today_bars.iloc[0]["volume"], 1200000)

    @patch("yfinance.download")
    @patch("application.providers.yfinance_prov.YFinanceProvider.get_market_session_status")
    def test_fetch_daily_bars_when_market_closed_uses_close_price(self, mock_status, mock_download):
        mock_status.return_value = {
            "state": "CLOSED",
            "target_date": "2026-11-13",
            "trading_date": "2026-11-13",
            "base_date": "2026-11-13",
            "reason": "Market closed for weekend"
        }
        completed_df = pd.DataFrame([{
            "Date": pd.Timestamp("2026-11-13"),
            "Open": 100.0, "High": 105.0, "Low": 99.0, "Close": 104.0, "Volume": 500000,
            "Stock Splits": 0.0
        }])
        mock_download.return_value = completed_df

        with patch("yfinance.data.YfData.get_raw_json") as mock_json:
            mock_json.return_value = {
                "quoteResponse": {
                    "result": [{
                        "symbol": "AAPL",
                        "regularMarketPrice": 104.0,
                        "regularMarketOpen": 100.0,
                        "regularMarketDayHigh": 105.0,
                        "regularMarketDayLow": 99.0,
                        "regularMarketVolume": 500000,
                    }]
                }
            }
            bars = self.provider.fetch_daily_bars(["AAPL"], start_date="2026-11-10")
            self.assertFalse(bars.empty)
            self.assertEqual(bars.iloc[-1]["date"], datetime.date(2026, 11, 13))
            self.assertEqual(bars.iloc[-1]["close"], 104.0)

    @patch("application.providers.yfinance_prov.YFinanceProvider.get_market_session_status")
    def test_fetch_premarket_or_intraday_bars_always_pulls_latest(self, mock_status):
        mock_status.return_value = {
            "state": "CLOSED",
            "target_date": "2026-11-16",
            "trading_date": "2026-11-16",
            "base_date": "2026-11-13"
        }
        with patch("yfinance.data.YfData.get_raw_json") as mock_json:
            mock_json.return_value = {
                "quoteResponse": {
                    "result": [{
                        "symbol": "TSLA",
                        "regularMarketPrice": 250.0,
                        "regularMarketOpen": 245.0,
                        "regularMarketDayHigh": 252.0,
                        "regularMarketDayLow": 244.0,
                        "regularMarketVolume": 850000
                    }]
                }
            }
            bars = self.provider.fetch_premarket_or_intraday_bars(["TSLA"], session_state="CLOSED", target_date="2026-11-16")
            self.assertFalse(bars.empty)
            self.assertEqual(bars.iloc[0]["symbol"], "TSLA")
            self.assertEqual(bars.iloc[0]["close"], 250.0)


    def test_upsert_daily_bars_handles_nan_high_open_low(self):
        # Create symbols first to satisfy foreign key or directory if needed
        self.db.upsert_symbols([{"symbol": "TEST", "exchange": "NASDAQ", "name": "Test Co", "asset_type": "Common Stock", "active": True}])
        
        # Test dataframe with NaN in high, open, low
        df = pd.DataFrame([{
            "symbol": "TEST",
            "date": "2026-11-16",
            "open": None,
            "high": float("nan"),
            "low": None,
            "close": 150.0,
            "volume": None
        }])
        
        # Should NOT raise ConstraintException: NOT NULL constraint failed: daily_bars.high
        self.db.upsert_daily_bars(df)
        
        with self.db.get_connection() as conn:
            row = conn.execute("SELECT symbol, date, open, high, low, close, volume FROM daily_bars WHERE symbol = 'TEST'").fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[0], "TEST")
            self.assertEqual(row[2], 150.0) # open filled with close
            self.assertEqual(row[3], 150.0) # high filled with max(open, close)
            self.assertEqual(row[4], 150.0) # low filled with min(open, close)
            self.assertEqual(row[5], 150.0) # close
            self.assertEqual(row[6], 0)     # volume filled with 0


if __name__ == "__main__":
    unittest.main()
