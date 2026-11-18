"""
Backfill historical earnings dates, estimates, and EPS surprises into DuckDB.
Ensures earnings markers ([E]) appear on historical study charts (e.g. 2015 setups).

Usage:
    # Backfill specific symbols
    ./.venv/bin/python tools/backfill_earnings.py --symbols AMBA,SWKS,NVDA,AAPL

    # Backfill all setups currently saved in the Model Book
    ./.venv/bin/python tools/backfill_earnings.py --model-book

    # Backfill all symbols in watchlists
    ./.venv/bin/python tools/backfill_earnings.py --watchlists

    # Backfill all symbols from both Model Book and watchlists with 4 threads
    ./.venv/bin/python tools/backfill_earnings.py --model-book --watchlists --concurrency 4
"""
import sys
import os
import json
import logging
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Set

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from application.services.database import db_service
from application.database import DatabaseManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill_earnings")


def get_model_book_symbols(model_book_path: str = "data/saved_model_book.json") -> Set[str]:
    """Extracts unique stock symbols from saved model book."""
    if not os.path.exists(model_book_path):
        return set()
    try:
        with open(model_book_path, "r", encoding="utf-8") as f:
            items = json.load(f)
            return {
                item["symbol"].upper().strip()
                for item in items
                if isinstance(item, dict) and item.get("symbol")
            }
    except Exception as e:
        logger.warning(f"Error reading model book symbols: {e}")
        return set()


def get_watchlist_symbols(db_path: str = "data.db") -> Set[str]:
    """Extracts unique stock symbols from user watchlists."""
    try:
        db = DatabaseManager(db_path)
        with db.get_connection() as conn:
            rows = conn.execute("SELECT DISTINCT symbol FROM watchlist_items").fetchall()
            return {r[0].upper().strip() for r in rows if r[0]}
    except Exception as e:
        logger.warning(f"Error reading watchlist symbols: {e}")
        return set()


def get_all_active_symbols(db_path: str = "data.db", limit: int = None) -> List[str]:
    """Retrieves symbols from the symbols directory table."""
    try:
        db = DatabaseManager(db_path)
        with db.get_connection() as conn:
            query = "SELECT symbol FROM symbols WHERE active = TRUE ORDER BY market_cap DESC NULLS LAST"
            if limit:
                query += f" LIMIT {int(limit)}"
            rows = conn.execute(query).fetchall()
            return [r[0].upper().strip() for r in rows if r[0]]
    except Exception as e:
        logger.warning(f"Error reading symbols table: {e}")
        return []


def backfill_symbol(symbol: str, limit: int = 100) -> int:
    """Fetches up to `limit` quarterly earnings reports for a single symbol and returns record count."""
    try:
        records = db_service.fetch_earnings_history(symbol, limit=limit)
        return len(records)
    except Exception as e:
        logger.warning(f"[{symbol}] Failed to backfill earnings: {e}")
        return 0


def run_backfill(symbols: List[str], limit: int = 100, concurrency: int = 4, db_path: str = "data.db"):
    if not symbols:
        logger.warning("No symbols provided to backfill.")
        return

    logger.info(f"Starting earnings backfill for {len(symbols)} symbols (up to {limit} quarters each, concurrency={concurrency})...")

    total = len(symbols)
    successful = 0
    total_records = 0

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        future_to_symbol = {
            executor.submit(backfill_symbol, sym, limit): sym
            for sym in symbols
        }

        for i, future in enumerate(as_completed(future_to_symbol), 1):
            sym = future_to_symbol[future]
            try:
                count = future.result()
                if count > 0:
                    successful += 1
                    total_records += count
                    logger.info(f"[{i}/{total}] {sym}: saved {count} earnings dates")
                else:
                    logger.info(f"[{i}/{total}] {sym}: 0 earnings dates found")
            except Exception as e:
                logger.error(f"[{i}/{total}] {sym}: error {e}")

    logger.info("=" * 60)
    logger.info(f"Earnings backfill complete: {successful}/{total} symbols updated, {total_records} total earnings dates cached.")
    logger.info("=" * 60)

    # Verification in DuckDB
    db = DatabaseManager(db_path)
    with db.get_connection() as conn:
        for sym in symbols[:5]:
            min_d, max_d, cnt = conn.execute(
                "SELECT MIN(earnings_date), MAX(earnings_date), COUNT(*) FROM earnings_calendar WHERE symbol = ?", [sym]
            ).fetchone()
            logger.info(f"Verified {sym} in DB: {cnt} records from {min_d} to {max_d}")


def main():
    parser = argparse.ArgumentParser(description="Backfill historical earnings dates into PivotTrader DuckDB")
    parser.add_argument("--symbols", type=str, help="Comma-separated ticker symbols (e.g. AMBA,SWKS,NVDA)")
    parser.add_argument("--model-book", action="store_true", help="Include all symbols in saved Model Book")
    parser.add_argument("--watchlists", action="store_true", help="Include all symbols in user watchlists")
    parser.add_argument("--all-active", action="store_true", help="Backfill all active stocks in symbols database")
    parser.add_argument("--limit-symbols", type=int, help="Limit number of symbols when using --all-active")
    parser.add_argument("--limit", type=int, default=100, help="Max quarterly earnings dates to fetch per symbol (default: 100 = 25 years)")
    parser.add_argument("--concurrency", type=int, default=4, help="Number of worker threads (default: 4)")
    parser.add_argument("--db-path", type=str, default="data.db", help="Path to DuckDB database file")

    args = parser.parse_args()

    target_symbols = set()

    if args.symbols:
        for s in args.symbols.split(","):
            s_clean = s.strip().upper()
            if s_clean:
                target_symbols.add(s_clean)

    if args.model_book:
        mb_syms = get_model_book_symbols()
        logger.info(f"Loaded {len(mb_syms)} symbols from Model Book.")
        target_symbols.update(mb_syms)

    if args.watchlists:
        wl_syms = get_watchlist_symbols(args.db_path)
        logger.info(f"Loaded {len(wl_syms)} symbols from Watchlists.")
        target_symbols.update(wl_syms)

    if args.all_active:
        active_syms = get_all_active_symbols(args.db_path, limit=args.limit_symbols)
        logger.info(f"Loaded {len(active_syms)} active symbols from database.")
        target_symbols.update(active_syms)

    if not target_symbols:
        # Default fallback to common 2014-2015 historical study setups
        default_study = ["AMBA", "SWKS", "AXON", "NVDA", "AAPL", "NFLX", "TSLA", "META"]
        logger.info(f"No specific symbols requested. Defaulting to historical study candidates: {default_study}")
        target_symbols.update(default_study)

    symbol_list = sorted(list(target_symbols))
    run_backfill(symbol_list, limit=args.limit, concurrency=args.concurrency, db_path=args.db_path)


if __name__ == "__main__":
    main()
