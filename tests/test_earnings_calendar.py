import unittest
from unittest.mock import patch, MagicMock
import pandas as pd
import datetime
from tests.test_db_helper import IsolatedDatabaseTestCase
from application.services.database import db_service


class TestEarningsCalendar(IsolatedDatabaseTestCase):
    def test_get_stock_earnings_cached_format(self):
        """Verify that get_stock_earnings returns properly formatted records from DuckDB."""
        # AAPL is expected to exist in the database
        records = db_service.get_stock_earnings("AAPL", fetch_live=False)
        self.assertIsInstance(records, list)
        if records:
            r = records[0]
            self.assertIn("date", r)
            self.assertIn("eps_estimate", r)
            self.assertIn("eps_actual", r)
            self.assertIn("surprise_pct", r)
            self.assertIn("time_of_day", r)
            # Verify dates are in ascending order
            for i in range(len(records) - 1):
                self.assertLessEqual(records[i]["date"], records[i + 1]["date"])

    @patch("yfinance.Ticker")
    def test_fetch_earnings_history_dedup_and_structure(self, mock_ticker_cls):
        """Test fetch_earnings_history with mocked yfinance response to verify deduping and time_of_day classification."""
        mock_ticker = MagicMock()
        mock_ticker_cls.return_value = mock_ticker

        # Create sample dataframe with 2015 dates and multiple timestamps
        index = pd.to_datetime([
            "2015-06-02 16:30:00-04:00",
            "2015-06-02 17:00:00-04:00", # duplicate date
            "2015-03-03 08:30:00-05:00", # bmo
        ])
        df = pd.DataFrame({
            "EPS Estimate": [0.58, 0.58, 0.49],
            "Reported EPS": [0.71, None, 0.68],
            "Surprise(%)": [21.65, None, 37.91]
        }, index=index)
        mock_ticker.get_earnings_dates.return_value = df
        mock_ticker.calendar = None

        test_symbol = "TEST_EARNINGS_SYM"
        records = db_service.fetch_earnings_history(test_symbol, limit=100)

        # Should have deduplicated the two 2015-06-02 entries, keeping the one with Reported EPS
        self.assertEqual(len(records), 2)

        dates = {r["date"]: r for r in records}
        self.assertIn("2015-06-02", dates)
        self.assertIn("2015-03-03", dates)

        # AMC verification (> 15h)
        self.assertEqual(dates["2015-06-02"]["time_of_day"], "amc")
        self.assertEqual(dates["2015-06-02"]["eps_actual"], 0.71)
        self.assertEqual(dates["2015-06-02"]["surprise_pct"], 21.65)

        # BMO verification (<= 10h)
        self.assertEqual(dates["2015-03-03"]["time_of_day"], "bmo")
        self.assertEqual(dates["2015-03-03"]["eps_actual"], 0.68)

        # Clean up test symbol from DuckDB
        try:
            with db_service.get_write_conn() as conn:
                conn.execute("DELETE FROM earnings_calendar WHERE symbol = ?", [test_symbol])
        except Exception:
            pass


if __name__ == "__main__":
    unittest.main()
