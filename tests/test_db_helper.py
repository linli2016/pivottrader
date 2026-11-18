"""Test database isolation helper for PivotTrader unit tests.

Ensures that unit tests NEVER touch or modify the production database (data.db).
Provides utilities for creating lightweight, fast in-memory or temporary DuckDB fixtures.
"""
import os
import tempfile
import unittest
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd

from application.database import DatabaseManager
from application.services.database import db_service


_DEFAULT_TEST_DIR: Optional[tempfile.TemporaryDirectory] = None
_DEFAULT_TEST_DB_PATH: Optional[str] = None


def get_or_create_default_test_db() -> str:
    """Returns the path to a shared isolated test database, creating and seeding it if necessary."""
    global _DEFAULT_TEST_DIR, _DEFAULT_TEST_DB_PATH
    if _DEFAULT_TEST_DB_PATH and os.path.exists(_DEFAULT_TEST_DB_PATH):
        return _DEFAULT_TEST_DB_PATH

    env_path = os.environ.get("PIVOTTRADER_DB_PATH")
    if env_path and os.path.exists(env_path):
        _DEFAULT_TEST_DB_PATH = env_path
        return env_path

    _DEFAULT_TEST_DIR = tempfile.TemporaryDirectory(prefix="pivottrader_default_test_")
    _DEFAULT_TEST_DB_PATH = os.path.join(_DEFAULT_TEST_DIR.name, "test_data.db")
    seed_test_database(_DEFAULT_TEST_DB_PATH)
    os.environ["PIVOTTRADER_DB_PATH"] = _DEFAULT_TEST_DB_PATH
    return _DEFAULT_TEST_DB_PATH


def seed_test_database(db_path: str) -> None:
    """Initializes schema and seeds rich fixture data into an isolated test database."""
    db = DatabaseManager(db_path, init_schema=True)

    with db.get_connection() as conn:
        # 1. Seed Symbols
        test_symbols = [
            ("AAPL", "NASDAQ", "Apple Inc", "Common Stock", True, "1980-12-12", "Technology", "Consumer Electronics", "2026-11-20", 3000000000000.0),
            ("HPQ", "NYSE", "HP Inc", "Common Stock", True, "1980-01-01", "Technology", "Consumer Electronics", "2026-11-22", 35000000000.0),
            ("MSFT", "NASDAQ", "Microsoft Corp", "Common Stock", True, "1986-03-13", "Software", "Computer Software: Prepackaged Software", "2026-11-25", 3100000000000.0),
            ("NVDA", "NASDAQ", "NVIDIA Corp", "Common Stock", True, "1999-01-22", "Technology", "Semiconductors", "2026-11-28", 2900000000000.0),
            ("TSLA", "NASDAQ", "Tesla Inc", "Common Stock", True, "2010-06-29", "Consumer Cyclical", "Auto Manufacturers", "2026-12-05", 80000000000.0),
            ("SPY", "NYSE", "SPDR S&P 500 ETF", "ETF", True, "1993-01-22", "Financial", "Exchange Traded Fund", None, 500000000000.0),
            ("QQQ", "NASDAQ", "Invesco QQQ Trust", "ETF", True, "1999-03-10", "Financial", "Exchange Traded Fund", None, 250000000000.0),
            ("WTBA", "NASDAQ", "West Bancorporation", "Common Stock", True, "2002-03-01", "Financial", "Regional Banks", "2026-12-01", 500000000.0),
            ("JPM", "NYSE", "JPMorgan Chase & Co", "Common Stock", True, "1980-01-01", "Financial", "Major Banks", "2026-12-10", 600000000000.0),
            ("BAC", "NYSE", "Bank of America Corp", "Common Stock", True, "1980-01-01", "Financial", "Major Banks", "2026-12-12", 300000000000.0),
            ("GLD", "NYSE", "SPDR Gold Shares", "ETF", True, "2004-11-18", "Financial", "Exchange Traded Fund", None, 70000000000.0),
            ("TLT", "NASDAQ", "iShares 20+ Year Treasury Bond ETF", "ETF", True, "2002-07-22", "Financial", "Exchange Traded Fund", None, 50000000000.0),
            ("BGIN", "NASDAQ", "Bigin Corp", "Common Stock", True, "2020-01-01", "Software", "Computer Software: Prepackaged Software", "2026-12-15", 1000000000.0),
            ("KO", "NYSE", "Coca-Cola Co", "Common Stock", True, "1980-01-01", "Consumer Defensive", "Beverages (Production/Distribution)", "2026-12-01", 250000000000.0),
            ("PEP", "NASDAQ", "PepsiCo Inc", "Common Stock", True, "1980-01-01", "Consumer Defensive", "Beverages (Production/Distribution)", "2026-12-01", 200000000000.0),
            ("MET", "NYSE", "MetLife Inc", "Common Stock", True, "1980-01-01", "Financial", "Life Insurance", "2026-12-05", 50000000000.0),
            ("PRU", "NYSE", "Prudential Financial", "Common Stock", True, "1980-01-01", "Financial", "Life Insurance", "2026-12-05", 40000000000.0),
        ]

        conn.executemany("""
            INSERT OR REPLACE INTO symbols (
                symbol, exchange, name, asset_type, active, ipo_date, sector, industry, next_earnings_date, market_cap
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, test_symbols)

        # 2. Seed Watchlists
        conn.execute("""
            INSERT OR IGNORE INTO watchlists (name) VALUES ('Mag 7')
        """)
        mag7_row = conn.execute("SELECT id FROM watchlists WHERE name = 'Mag 7'").fetchone()
        mag7_id = mag7_row[0] if mag7_row else 4
        focus_row = conn.execute("SELECT id FROM watchlists WHERE name = 'Focus List'").fetchone()
        focus_id = focus_row[0] if focus_row else 1

        # Seed Watchlist items
        watchlist_items = [
            (mag7_id, "AAPL", "MEGA,TECH"),
            (mag7_id, "MSFT", "MEGA,TECH"),
            (mag7_id, "NVDA", "MEGA,AI"),
            (mag7_id, "TSLA", "MEGA,AUTO"),
            (focus_id, "AAPL", "LEADER"),
            (focus_id, "NVDA", "LEADER"),
        ]
        conn.executemany("""
            INSERT OR REPLACE INTO watchlist_items (watchlist_id, symbol, tags)
            VALUES (?, ?, ?)
        """, watchlist_items)

        # 3. Seed Historical Daily Bars
        # Generate 252 trading days up to 2026-09-24
        end_date = datetime(2026, 9, 24)
        dates = []
        curr = end_date - timedelta(days=400)
        while curr <= end_date:
            if curr.weekday() < 5:  # Monday to Friday
                dates.append(curr.strftime("%Y-%m-%d"))
            curr += timedelta(days=1)

        # Keep last 260 dates
        dates = dates[-260:]

        base_prices = {
            "AAPL": 220.0,
            "HPQ": 35.0,
            "MSFT": 420.0,
            "NVDA": 120.0,
            "TSLA": 250.0,
            "SPY": 560.0,
            "QQQ": 480.0,
            "WTBA": 28.0,
            "JPM": 210.0,
            "BAC": 40.0,
            "GLD": 240.0,
            "TLT": 95.0,
            "BGIN": 88.0,
            "KO": 65.0,
            "PEP": 160.0,
            "MET": 70.0,
            "PRU": 110.0,
            "HPQ": 35.0,
        }

        bars_to_insert = []
        for sym, base in base_prices.items():
            for idx, dt in enumerate(dates):
                # Add slight trend
                mult = 1.0 + (idx / len(dates)) * 0.15
                close_val = round(base * mult, 2)
                open_val = round(close_val * 0.995, 2)
                high_val = round(close_val * 1.015, 2)
                low_val = round(close_val * 0.985, 2)
                vol_val = 50000000 if sym in ("SPY", "QQQ", "NVDA", "AAPL") else 1500000
                sma50 = round(close_val * 0.96, 2)
                sma150 = round(close_val * 0.92, 2)
                sma200 = round(close_val * 0.90, 2)
                ema10 = round(close_val * 0.99, 2)
                ema20 = round(close_val * 0.98, 2)
                ema50 = round(close_val * 0.96, 2)
                atr20 = round(close_val * 0.02, 2)
                adr20 = 2.5
                rs_score = 1.25
                rs_rank = 85
                dollar_vol = round(close_val * vol_val, 2)

                if sym in ("KO", "PEP"):
                    # Declining trend: drops by 30% over 260 days -> Stage 4
                    mult = 1.15 - (idx / len(dates)) * 0.30
                    close_val = round(base * mult, 2)
                    open_val = round(close_val * 1.005, 2)
                    high_val = round(close_val * 1.015, 2)
                    low_val = round(close_val * 0.985, 2)
                    sma50 = round(close_val * 1.05, 2)
                    sma150 = round(close_val * 1.10, 2)
                    sma200 = round(close_val * 1.15, 2)
                elif sym in ("MET", "PRU"):
                    # Advancing trend: gains by 35% over 260 days -> Stage 2
                    mult = 0.85 + (idx / len(dates)) * 0.35
                    close_val = round(base * mult, 2)
                    open_val = round(close_val * 0.995, 2)
                    high_val = round(close_val * 1.015, 2)
                    low_val = round(close_val * 0.985, 2)
                    sma50 = round(close_val * 0.96, 2)
                    sma150 = round(close_val * 0.92, 2)
                    sma200 = round(close_val * 0.90, 2)
                    sma150 = round(close_val * 0.92, 2)
                    sma200 = round(close_val * 0.90, 2)

                # Special condition for BAC to trigger RS Blue Dot near end of history (2026-09-22)
                if sym == "BAC":
                    if idx == 100:
                        close_val = 55.0  # prior close peak
                    elif dt == "2026-09-22":
                        close_val = 50.0  # < 55.0
                        rs_score = 4.0
                    open_val = round(close_val * 0.99, 2)
                    high_val = round(close_val * 1.01, 2)
                    low_val = round(close_val * 0.98, 2)

                # Special condition for SPY on 2026-09-22 as well
                if sym == "SPY" and dt in ("2026-09-15", "2026-09-22"):
                    close_val = 250.0  # Drop creates RS breakout
                    open_val = 255.0
                    high_val = 260.0
                    low_val = 245.0

                # Special condition for WTBA to trigger RS Blue Dot on 2026-09-15
                if sym == "WTBA":
                    if dt < "2026-09-01":
                        close_val = 35.0 if dt == "2026-05-15" else 25.0
                    elif dt == "2026-09-15":
                        close_val = 28.0  # < 35.0 (prior max close)
                        rs_score = 3.0
                        rs_rank = 99
                    else:
                        close_val = 26.0
                    open_val = round(close_val * 0.99, 2)
                    high_val = round(close_val * 1.01, 2)
                    low_val = round(close_val * 0.98, 2)

                # Special condition for SPY on 2026-09-15 to drop, spiking RS line
                if sym == "SPY" and dt == "2026-09-15":
                    close_val = 300.0  # Sharp drop in benchmark creates RS breakout for WTBA
                    open_val = 305.0
                    high_val = 310.0
                    low_val = 295.0

                # Special condition for BGIN: Low Cheat setup (both mid-history and at end)
                if sym == "BGIN":
                    lc_highs = [82.0]*4 + [100.0] + [82.0, 80.0, 78.0, 77.0, 76.0, 75.0, 74.5] + [76.0, 78.0, 80.0, 82.0] + [81.5, 81.0, 80.5, 81.0] + [83.5]
                    lc_lows  = [80.0]*4 + [97.0]  + [79.0, 78.0, 76.0, 75.5, 74.5, 74.0, 73.5] + [74.5, 76.0, 78.0, 80.0] + [80.0, 79.5, 79.0, 79.5] + [81.0]
                    lc_closes= [81.0]*4 + [99.0]  + [80.5, 79.0, 77.0, 76.5, 75.0, 74.5, 74.0] + [75.5, 77.5, 79.5, 81.5] + [80.5, 80.2, 80.0, 80.5] + [83.2]
                    lc_opens = [80.5]*4 + [97.5]  + [81.0, 79.5, 77.5, 77.0, 75.5, 74.8, 74.2] + [75.0, 76.5, 78.5, 80.5] + [81.0, 80.5, 80.2, 80.0] + [81.2]
                    lc_vols  = [1000000]*5 + [1000000]*3 + [700000, 500000, 300000, 350000] + [500000, 600000, 700000, 800000] + [600000, 500000, 400000, 450000] + [2200000]
                    seq_len = len(lc_highs)
                    k = None
                    if 180 <= idx < 180 + seq_len:
                        k = idx - 180
                    elif 180 + seq_len <= idx < 180 + seq_len + 5:
                        # Forward gain days to reward low cheat breakout
                        close_val = 89.0 + (idx - 180 - seq_len)
                        open_val = close_val * 0.99
                        high_val = close_val * 1.02
                        low_val = close_val * 0.98
                        vol_val = 1500000
                        sma50 = 80.0
                        sma150 = 75.0
                        sma200 = 70.0
                    elif idx >= len(dates) - seq_len:
                        k = idx - (len(dates) - seq_len)

                    if k is not None:
                        high_val = lc_highs[k]
                        low_val = lc_lows[k]
                        close_val = lc_closes[k]
                        open_val = lc_opens[k]
                        vol_val = lc_vols[k]
                        sma50 = 80.0
                        sma150 = 75.0
                        sma200 = 70.0

                vol_50d_val = 1000000.0 if sym in ("BGIN", "HPQ") else vol_val
                dollar_vol = round(close_val * vol_50d_val, 2)

                # Special condition for HPQ: Cheat (3-C) setup on last 26 bars
                if sym == "HPQ" and idx >= len(dates) - 26:
                    k = idx - (len(dates) - 26)
                    ch_highs = [88.0]*12 + [90.0, 95.0, 100.0] + [98.0, 92.0, 85.0, 80.0, 77.0, 75.5] + [78.0, 88.0, 87.0, 86.5, 89.5]
                    ch_lows  = [88.0]*12 + [88.0, 92.0, 97.0]  + [91.0, 84.0, 78.0, 76.0, 75.0, 74.5] + [75.0, 77.0, 84.5, 84.0, 86.0]
                    ch_closes= [89.0]*12 + [89.0, 94.0, 99.0]  + [92.0, 85.0, 79.0, 76.5, 75.2, 75.0] + [77.5, 87.5, 86.2, 86.0, 89.2]
                    ch_opens = [88.5]*12 + [88.5, 93.0, 98.0]  + [97.0, 91.0, 84.0, 79.0, 76.0, 75.1] + [75.5, 77.5, 87.0, 85.8, 87.2]
                    ch_vols  = [1000000]*12 + [1000000]*3      + [1200000, 1100000, 900000, 700000, 300000, 350000] + [500000, 700000, 600000, 500000, 2200000]
                    high_val = ch_highs[k]
                    low_val = ch_lows[k]
                    close_val = ch_closes[k]
                    open_val = ch_opens[k]
                    vol_val = ch_vols[k]
                    sma50 = 80.0
                    sma150 = 75.0
                    sma200 = 70.0

                # Ensure TSLA is down on the latest date so market participation metrics have decliners
                if sym == "TSLA" and idx == len(dates) - 1:
                    close_val = round(base * 0.92, 2)
                    open_val = round(close_val * 1.02, 2)
                    high_val = round(open_val * 1.01, 2)
                    low_val = round(close_val * 0.99, 2)

                is_52w_val = False
                dist_52w_val = 3.0
                gap_pct_val = 0.5
                if sym == "NVDA":
                    rs_rank = 96
                    adr20 = 4.5
                    if dt == "2026-09-18":
                        close_val = 320.0
                        open_val = 315.0
                        high_val = 322.0
                        low_val = 314.0
                        is_52w_val = True
                        dist_52w_val = 0.0
                        gap_pct_val = 2.5
                elif sym == "AAPL":
                    rs_rank = 92
                    adr20 = 3.5
                    dist_52w_val = 2.0

                bars_to_insert.append((
                    sym, dt, open_val, high_val, low_val, close_val, vol_val,
                    vol_50d_val, vol_50d_val, rs_score, rs_rank, adr20, 1.0, atr20,
                    15.0, 5.0, sma50, sma150, sma200, True, 3, "15,8,4",
                    500, close_val * 1.1, 5.0, 10.0, 10, 25, high_val * 1.05,
                    5, low_val * 0.8, dist_52w_val, 40.0, 40.0, sma200 * 0.95, sma200 * 0.90, sma200 * 0.85,
                    is_52w_val, vol_val * 2, False, 5.0, 15.0, 30.0, ema10, ema20, ema50,
                    1.0, 2.0, 4.0, gap_pct_val, 1.2, False, 0.0, 1.0, False, False,
                    0.0, 0.0, 0, 1.5, 0.8, 1.1, 65.0, dollar_vol,
                    True, round(close_val * 1.02, 2), round(close_val * 0.95, 2), 7.0, 15.0,
                    15, 2, 85.0
                ))

        bar_columns = [
            "symbol", "date", "open", "high", "low", "close", "volume",
            "vol_20d_ma", "vol_50d_ma", "rs_score", "rs_rank", "adr_20d", "er_20d", "atr_20d",
            "pp_runup_pct", "pp_drawdown_pct", "sma_50", "sma_150", "sma_200", "vcp_is_setup", "vcp_troughs", "vcp_depths",
            "ipo_days_count", "ipo_all_time_high", "ipo_drawdown_from_high", "ipo_base_depth", "pp_days_since_peak", "pp_runup_days", "high_52w",
            "days_since_52w_high", "low_52w", "dist_from_52w_high", "dist_from_52w_low", "surge_off_low_pct", "sma_200_20d_ago", "sma_200_80d_ago", "sma_200_100d_ago",
            "is_52w_high", "vol_52w_high", "is_52w_high_vol", "ret_1m", "ret_3m", "ret_6m", "ema_10", "ema_20", "ema_50",
            "dist_ema10_pct", "dist_ema20_pct", "dist_ema50_pct", "gap_pct", "rel_vol_50d", "ep_is_setup", "ep_gap_pct", "ep_rel_vol", "parabolic_short_is_setup", "parabolic_long_is_setup",
            "parabolic_runup_pct", "parabolic_drop_pct", "parabolic_up_days", "pivot_spread_pct", "pivot_close_clustering_pct", "pivot_vol_ratio", "ti_65", "dollar_vol_50d_ma",
            "low_cheat_is_setup", "low_cheat_pivot_price", "low_cheat_stop_loss", "low_cheat_risk_pct", "low_cheat_base_depth",
            "stage2_days", "weinstein_stage", "normalized_rs"
        ]
        df_bars = pd.DataFrame(bars_to_insert, columns=bar_columns)
        conn.register("df_bars_view", df_bars)
        conn.execute("INSERT OR REPLACE INTO daily_bars SELECT * FROM df_bars_view")
        conn.unregister("df_bars_view")

        # 4. Seed Earnings
        conn.execute("""
            CREATE TABLE IF NOT EXISTS earnings (
                symbol VARCHAR NOT NULL,
                date VARCHAR NOT NULL,
                eps_estimate DOUBLE,
                eps_actual DOUBLE,
                surprise_pct DOUBLE,
                time_of_day VARCHAR,
                PRIMARY KEY (symbol, date)
            )
        """)
        sample_earnings = [
            ("AAPL", "2024-05-02", 1.50, 1.53, 2.0, "amc"),
            ("AAPL", "2024-08-01", 1.35, 1.40, 3.7, "amc"),
            ("AAPL", "2024-10-31", 1.60, 1.64, 2.5, "amc"),
            ("MSFT", "2024-04-25", 2.80, 2.94, 5.0, "amc"),
            ("NVDA", "2024-05-22", 0.60, 0.68, 13.3, "amc"),
        ]
        conn.executemany("""
            INSERT OR REPLACE INTO earnings (symbol, date, eps_estimate, eps_actual, surprise_pct, time_of_day)
            VALUES (?, ?, ?, ?, ?, ?)
        """, sample_earnings)


class IsolatedDatabaseTestCase(unittest.TestCase):
    """Base class for unit tests requiring an isolated DuckDB instance with seeded data."""

    temp_dir: Optional[tempfile.TemporaryDirectory] = None
    test_db_path: Optional[str] = None

    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.test_db_path = os.path.join(cls.temp_dir.name, "test_isolated.db")
        seed_test_database(cls.test_db_path)
        db_service.set_db_path(cls.test_db_path)

    def setUp(self):
        super().setUp()
        try:
            from application.services.group_radar_service import _GLOBAL_STRENGTH_CACHE
            _GLOBAL_STRENGTH_CACHE.clear()
        except Exception:
            pass

    @classmethod
    def tearDownClass(cls):
        db_service.set_db_path(None)
        if cls.temp_dir:
            try:
                cls.temp_dir.cleanup()
            except Exception:
                pass
            cls.temp_dir = None
