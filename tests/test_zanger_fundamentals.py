import datetime
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import pandas as pd

from application.database import DatabaseManager
from application.providers.tradingview_prov import TradingViewScannerProvider
from application.services.database import DatabaseService


class _DummyConfigService:
    def __init__(self, db_path: str):
        self._db_path = db_path

    def load_config_raw(self):
        return {"database": {"db_path": self._db_path}}

    def get_db_path(self) -> str:
        return self._db_path

    def get_config(self):
        return {
            "min_price": 5.0,
            "min_volume_sma_50": 100000,
            "min_dollar_volume_50d": 5000000.0,
            "min_rs_percentile": 70,
            "min_eps_growth_qoq": 25.0,
        }


class TestZangerFundamentals(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp_dir.name, "test_zanger.duckdb")
        self.db = DatabaseManager(self.db_path)

    def tearDown(self):
        self.tmp_dir.cleanup()

    @patch("application.providers.tradingview_prov.requests.post")
    def test_tradingview_bulk_provider_zero_lookahead_and_parsing(self, mock_post):
        # Simulate two stocks:
        # 1) NVDA reported 2026-08-26 ET (+128% EPS YoY, +105% Sales YoY)
        # 2) PRCH has an upcoming/UTC-rolled timestamp 2026-10-30 (> as_of_date 2026-10-28), must clamp to 2026-10-28
        ts_aug26 = int(datetime.datetime(2026, 8, 26, 16, 30, tzinfo=datetime.timezone.utc).timestamp())
        ts_nov17 = int(datetime.datetime(2026, 11, 17, 16, 30, tzinfo=datetime.timezone.utc).timestamp())
        ts_future = int(datetime.datetime(2026, 10, 30, 12, 0, tzinfo=datetime.timezone.utc).timestamp())

        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {
            "totalCount": 2,
            "data": [
                {
                    "s": "NASDAQ:NVDA",
                    "d": [
                        "NVDA", "NASDAQ", 2.22, 128.2, 14.5, 110.0,
                        96_221_000_000.0, 105.9, 17.9, 98.4,
                        23_188_500_000.0, 5_190_000_000_000.0, ts_aug26, ts_nov17
                    ],
                },
                {
                    "s": "NASDAQ:PRCH",
                    "d": [
                        "PRCH", "NASDAQ", 0.35, 65.0, 12.0, 45.0,
                        140_000_000.0, 48.0, 9.0, 42.0,
                        85_000_000.0, 1_500_000_000.0, ts_future, ts_nov17
                    ],
                },
            ],
        }
        mock_post.return_value = mock_resp

        prov = TradingViewScannerProvider()
        as_of = datetime.date(2026, 10, 28)
        fund_df, meta = prov.fetch_bulk_fundamentals(target_symbols=["NVDA", "PRCH"], as_of_date=as_of)

        self.assertEqual(len(fund_df), 2)
        self.assertEqual(len(meta), 2)

        nvda_row = fund_df[fund_df["symbol"] == "NVDA"].iloc[0]
        self.assertEqual(nvda_row["report_date"], datetime.date(2026, 8, 26))
        self.assertEqual(nvda_row["fiscal_quarter"], "2026-Q3")
        self.assertAlmostEqual(nvda_row["eps_qoq_growth"], 128.2)
        self.assertAlmostEqual(nvda_row["sales_yoy_growth"], 105.9)

        prch_row = fund_df[fund_df["symbol"] == "PRCH"].iloc[0]
        # Clamped to as_of_date (2026-10-28) -> zero lookahead bias!
        self.assertEqual(prch_row["report_date"], as_of)

    def test_database_upsert_preserves_sponsorship_and_filters_zanger_candidates(self):
        # 1. Seed symbols
        self.db.upsert_symbols([
            {"symbol": "APP", "exchange": "NASDAQ", "name": "AppLovin Corp", "asset_type": "Common Stock", "active": True, "sector": "Software", "industry": "Application Software"},
            {"symbol": "SLOW", "exchange": "NYSE", "name": "Slow Growth Inc", "asset_type": "Common Stock", "active": True, "sector": "Industrials", "industry": "Machinery"},
        ])
        self.db.update_symbol_fundamentals_meta([
            {"symbol": "APP", "float_shares": 266_600_000.0, "market_cap": 87_000_000_000.0, "next_earnings_date": "2026-11-04"},
            {"symbol": "SLOW", "float_shares": 450_000_000.0, "market_cap": 12_000_000_000.0, "next_earnings_date": "2026-11-10"},
        ])

        # 2. Seed institutional sponsorship for APP in 2026-Q3 first
        inst_df = pd.DataFrame([
            {"symbol": "APP", "report_date": "2026-06-30", "fiscal_quarter": "2026-Q2", "holders_count": 620, "ownership_pct": 68.0, "source": "yfinance"},
            {"symbol": "APP", "report_date": "2026-08-05", "fiscal_quarter": "2026-Q3", "holders_count": 710, "ownership_pct": 72.5, "source": "yfinance"},
        ])
        self.db.upsert_institutional_sponsorship(inst_df)
        self.db.recalculate_sponsorship_metrics()

        # 3. Upsert bulk EPS & Sales fundamentals on 2026-08-05 (must preserve sponsorship_streak = 1!)
        fund_df = pd.DataFrame([
            {
                "symbol": "APP",
                "report_date": "2026-08-05",
                "fiscal_quarter": "2026-Q3",
                "eps_diluted": 3.76,
                "eps_qoq_growth": 80.3,
                "total_revenue": 1_923_700_000.0,
                "sales_yoy_growth": 52.8,
                "eps_seq_qoq_growth": 5.6,
                "sales_seq_qoq_growth": 4.4,
            },
            {
                "symbol": "SLOW",
                "report_date": "2026-08-05",
                "fiscal_quarter": "2026-Q3",
                "eps_diluted": 1.10,
                "eps_qoq_growth": 55.0,
                "total_revenue": 800_000_000.0,
                "sales_yoy_growth": 18.0,  # Fails Zanger >= 40% Sales YoY rule
                "eps_seq_qoq_growth": 2.0,
                "sales_seq_qoq_growth": 1.0,
            },
        ])
        self.db.upsert_quarterly_fundamentals(fund_df)

        # 4. Insert daily_bars on two dates:
        #    - 2026-08-01 (BEFORE 2026-08-05 earnings release -> must NOT see Q3 report due to zero lookahead bias!)
        #    - 2026-08-10 (AFTER 2026-08-05 earnings release -> APP passes Zanger 40/40+, SLOW fails Sales >= 40%)
        with self.db.get_connection() as conn:
            conn.execute("""
                INSERT INTO daily_bars (symbol, date, open, high, low, close, volume, vol_50d_ma, dollar_vol_50d_ma, rs_score, rs_rank, adr_20d)
                VALUES
                    ('APP',  '2026-08-01', 150, 156, 149, 155, 4000000, 2500000, 387500000, 32.5, 96, 4.8),
                    ('SLOW', '2026-08-01',  45,  46,  44,  45, 1200000, 1000000,  45000000,  4.2, 75, 2.5),
                    ('APP',  '2026-08-10', 168, 175, 167, 174, 6500000, 2600000, 452400000, 38.0, 98, 5.1),
                    ('SLOW', '2026-08-10',  46,  47,  45,  46, 1100000, 1000000,  46000000,  3.8, 72, 2.4)
            """)

        svc = DatabaseService(_DummyConfigService(self.db_path))

        # Before report_date (2026-08-01): zero lookahead bias -> 0 matches
        pre_cands = svc.get_candidates(
            target_date="2026-08-01",
            expression="SCREENER_ZANGER_MONSTER_GROWTH",
        )
        self.assertEqual(len(pre_cands), 0)

        # After report_date (2026-08-10): APP matches, SLOW excluded, and sponsorship_streak preserved!
        post_cands = svc.get_candidates(
            target_date="2026-08-10",
            expression="SCREENER_ZANGER_MONSTER_GROWTH AND FLOAT <= 300M AND INST_STREAK >= 1",
        )
        self.assertEqual(len(post_cands), 1)
        self.assertEqual(post_cands[0]["symbol"], "APP")
        self.assertAlmostEqual(post_cands[0]["eps_qoq_growth"], 80.3)
        self.assertAlmostEqual(post_cands[0]["sales_yoy_growth"], 52.8)
        self.assertEqual(post_cands[0]["sponsorship_streak"], 1)
        self.assertAlmostEqual(post_cands[0]["float_shares"], 266_600_000.0)
        svc.close_connection()


if __name__ == "__main__":
    unittest.main()
