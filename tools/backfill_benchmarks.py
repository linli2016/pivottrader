"""
Backfill historical benchmark daily bars (SPY, QQQ) into DuckDB.
Ensures RS line calculations work for historical study periods (e.g. 2015).
"""
import sys
import os
import logging
from datetime import datetime

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import yfinance as yf
from application.database import DatabaseManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill_benchmarks")

def backfill_benchmarks(db_path: str = "data.db", symbols=None, start_date: str = "2011-09-01", end_date: str = "2021-10-01"):
    if symbols is None:
        symbols = ["SPY", "QQQ"]

    db = DatabaseManager(db_path)
    logger.info(f"Downloading historical bars for {symbols} from {start_date} to {end_date}...")

    all_dfs = []
    for sym in symbols:
        logger.info(f"Fetching {sym} via yfinance...")
        ticker = yf.Ticker(sym)
        hist = ticker.history(start=start_date, end=end_date, auto_adjust=False)
        if hist.empty:
            logger.warning(f"No data returned for {sym}")
            continue

        hist = hist.reset_index()
        # Normalize column names
        hist.columns = [str(c).lower() for c in hist.columns]
        hist["symbol"] = sym
        hist["date"] = pd.to_datetime(hist["date"]).dt.date

        # Keep standard OHLCV
        required = ["symbol", "date", "open", "high", "low", "close", "volume"]
        missing = [c for c in required if c not in hist.columns]
        if missing:
            logger.error(f"Missing columns {missing} for {sym}")
            continue

        df_clean = hist[required].copy()
        logger.info(f"Retrieved {len(df_clean)} bars for {sym} ({df_clean['date'].min()} to {df_clean['date'].max()})")
        all_dfs.append(df_clean)

    if not all_dfs:
        logger.error("No benchmark data retrieved.")
        sys.exit(1)

    combined = pd.concat(all_dfs, ignore_index=True)
    logger.info(f"Upserting {len(combined)} benchmark rows into {db_path}...")
    db.upsert_daily_bars(combined)
    logger.info("Upsert completed successfully.")

    # Verify DuckDB records
    with db.get_connection() as conn:
        for sym in symbols:
            min_d, max_d, cnt = conn.execute(
                "SELECT MIN(date), MAX(date), COUNT(*) FROM daily_bars WHERE symbol = ?", [sym]
            ).fetchone()
            logger.info(f"Verified {sym} in database: {cnt} bars ({min_d} to {max_d})")

if __name__ == "__main__":
    backfill_benchmarks()
