import argparse
import os
import sys
from datetime import datetime, timedelta, timezone
import pandas as pd

from src.config import Config
from src.database import DatabaseManager
from src.providers.yfinance_prov import YFinanceProvider
from src.providers.ibkr_prov import IBKRProvider
from src.engine.momentum import MomentumEngine


def main():
    parser = argparse.ArgumentParser(description="PivotTrader: High-Performance Momentum & Fundamental Screener")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml configuration file")
    parser.add_argument("--provider", choices=["YFINANCE", "IBKR"], help="Override data provider specified in config")
    parser.add_argument("--limit-tickers", type=int, help="Limit the universe size for rapid testing/debugging")
    parser.add_argument("--force-full", action="store_true", help="Force fetch full history for all active tickers")
    parser.add_argument("--force-backfill", action="store_true", help="Alias for --force-full (backfill multi-year history)")
    parser.add_argument("--history-years", type=int, help="Number of historical years of daily price bars to fetch (e.g., 2, 5, 10)")
    parser.add_argument("--skip-prices", action="store_true", help="Skip historical daily bars price synchronization")
    parser.add_argument("--skip-fundamentals", action="store_true", help="Skip quarterly fundamental statements synchronization")
    parser.add_argument("--include-premarket", action="store_true", help="Fetch pre-market quotes for current trading session")
    args = parser.parse_args()

    print("=" * 60)
    print("                PIVOTTRADER SCREENING PIPELINE                 ")
    print("=" * 60)

    # 1. Load Configurations
    try:
        config = Config(args.config)
        print(f"Loaded configuration from: {args.config}")
    except Exception as e:
        print(f"Error: Failed to load config: {e}")
        sys.exit(1)

    # Resolve active providers
    selected_provider = args.provider if args.provider else config.provider_selected
    price_provider_name = args.provider if args.provider else config.price_provider_selected
    
    print(f"Primary / Fundamental Provider: {selected_provider}")
    print(f"Price Ingestion Provider: {price_provider_name}")

    # 2. Initialize Database Manager
    db_path = config.db_path
    print(f"Database location: {os.path.abspath(db_path)}")
    db = DatabaseManager(db_path)

    # 3. Instantiate Data Providers
    def make_provider(name):
        if name == "YFINANCE":
            return YFinanceProvider()
        elif name == "IBKR":
            return IBKRProvider(
                host=config.ibkr_host,
                port=config.ibkr_port,
                client_id=config.ibkr_client_id
            )
        else:
            print(f"Error: Unsupported provider '{name}'")
            sys.exit(1)

    price_provider = make_provider(price_provider_name)
    if price_provider_name == selected_provider:
        fundamental_provider = price_provider
    else:
        fundamental_provider = make_provider(selected_provider)

    try:
        print("Connecting price provider...")
        price_provider.connect()
        if fundamental_provider is not price_provider:
            print("Connecting fundamental provider...")
            fundamental_provider.connect()
    except Exception as e:
        print(f"Error connecting to providers: {e}")
        sys.exit(1)

    try:
        # 4. Synchronize Symbol Directory
        print("\n[Step 1/5] Fetching NYSE/NASDAQ active stock universe...")
        universe = price_provider.fetch_universe()
        if not universe:
            print("Error: Empty universe retrieved. Exiting screening.")
            sys.exit(1)
            
        print(f"Retrieved {len(universe)} symbols from the active universe.")
        
        # Apply testing limits if specified
        if args.limit_tickers:
            print(f"Applying debug limits: restricting run to first {args.limit_tickers} tickers.")
            universe = universe[:args.limit_tickers]

        # Insert/sync symbol metadata into DuckDB
        print("Upserting ticker directories into database...")
        db.upsert_symbols(universe)
        
        # Synchronize IPO Dates from yfinance (Incremental & Parallelized)
        missing_ipo_symbols = db.get_symbols_missing_ipo_date()
        if missing_ipo_symbols:
            print(f"\nEvaluating IPO Dates: {len(missing_ipo_symbols)} symbols missing IPO date in database...")
            from concurrent.futures import ThreadPoolExecutor, as_completed
            import yfinance as yf
            
            def fetch_single_ipo_date(symbol: str):
                try:
                    import requests
                    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}"
                    headers = {"User-Agent": "Mozilla/5.0"}
                    r = requests.get(url, headers=headers, timeout=5)
                    if r.status_code == 200:
                        data = r.json()
                        result = data.get("chart", {}).get("result")
                        if result and len(result) > 0:
                            first_trade_sec = result[0].get("meta", {}).get("firstTradeDate")
                            if first_trade_sec:
                                dt = datetime.fromtimestamp(first_trade_sec, tz=timezone.utc)
                                return symbol, dt.strftime("%Y-%m-%d")
                except Exception:
                    pass
                return symbol, None

            print(f"Fetching IPO dates from Yahoo Finance using parallel workers...")
            results = []
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = {executor.submit(fetch_single_ipo_date, sym): sym for sym in missing_ipo_symbols}
                
                for i, future in enumerate(as_completed(futures), 1):
                    sym, ipo_date = future.result()
                    if ipo_date:
                        results.append((ipo_date, sym))
                    
                    if i % 100 == 0 or i == len(missing_ipo_symbols):
                        print(f"Progress: {i}/{len(missing_ipo_symbols)} symbols evaluated, {len(results)} dates retrieved.")
            
            if results:
                print(f"Saving {len(results)} IPO dates to database...")
                db.update_multiple_symbol_ipo_dates(results)
        
        active_symbols = [item["symbol"] for item in universe]

        # 5. Incremental Daily Bars Ingestion
        if args.include_premarket:
            print("\n[Step 2/5] Syncing pre-market quotes for active universe...")
            pm_bars = price_provider.fetch_premarket_bars(active_symbols)
            if not pm_bars.empty:
                print(f"Upserting {len(pm_bars)} pre-market daily bars into DuckDB...")
                db.upsert_daily_bars(pm_bars)
            else:
                print("No pre-market quotes returned.")
        elif args.skip_prices:
            print("\n[Step 2/5] Skipping daily bars price synchronization as requested (--skip-prices).")
        else:
            print("\n[Step 2/5] Syncing historical daily bars...")
            last_dates = db.get_last_bar_dates()
            first_dates = db.get_first_bar_dates()
            
            history_years = args.history_years if args.history_years is not None else config.history_lookback_years
            force_full = args.force_full or args.force_backfill
            full_lookback_date = (datetime.now() - timedelta(days=365 * history_years)).strftime("%Y-%m-%d")
            
            print(f"Target historical lookback window: {history_years} years (since {full_lookback_date})")
            
            # Split tickers into new/backfill vs existing to optimize downloads
            new_symbols = []
            existing_symbols = []
            
            for symbol in active_symbols:
                if symbol not in last_dates or force_full:
                    new_symbols.append(symbol)
                elif symbol in first_dates and first_dates[symbol] > full_lookback_date:
                    # Stored history does not extend back to full_lookback_date -> needs backfill
                    new_symbols.append(symbol)
                else:
                    existing_symbols.append(symbol)

            # Ingest new/backfill symbols
            if new_symbols:
                print(f"Fetching full lookback ({full_lookback_date}) for {len(new_symbols)} tickers (new or backfilling)...")
                new_bars = price_provider.fetch_daily_bars(new_symbols, full_lookback_date)
                if not new_bars.empty:
                    print(f"Upserting {len(new_bars)} rows for new/backfilled tickers...")
                    db.upsert_daily_bars(new_bars)
                else:
                    print("No new price bars fetched.")

            # Ingest existing symbols incrementally
            if existing_symbols:
                # Find earliest date among existing symbols to request delta
                earliest_last_date = min(last_dates[sym] for sym in existing_symbols)
                # Subtract 5 days overlap buffer to avoid missing adjustments or weekend gaps
                delta_start_date = (datetime.strptime(earliest_last_date, "%Y-%m-%d") - timedelta(days=5)).strftime("%Y-%m-%d")
                
                print(f"Syncing daily bars incrementally since {delta_start_date} for {len(existing_symbols)} tickers...")
                delta_bars = price_provider.fetch_daily_bars(existing_symbols, delta_start_date)
                if not delta_bars.empty:
                    # Detect if any tickers underwent stock splits in the delta window
                    split_symbols = []
                    if "stock_splits" in delta_bars.columns:
                        split_rows = delta_bars[delta_bars["stock_splits"] > 0]
                        if not split_rows.empty:
                            split_symbols = split_rows["symbol"].unique().tolist()
                    
                    if split_symbols:
                        print(f"\n⚠️ Stock splits detected for: {split_symbols}")
                        print(f"Purging and refetching full {full_lookback_date} history for split-adjusted consistency...")
                        
                        # 1. Fetch full lookback for the split tickers
                        adjusted_bars = price_provider.fetch_daily_bars(split_symbols, full_lookback_date)
                        if not adjusted_bars.empty:
                            # 2. Delete existing history for these tickers from the database to purge unadjusted data
                            with db.get_connection() as conn:
                                symbols_str = ", ".join(f"'{s}'" for s in split_symbols)
                                conn.execute(f"DELETE FROM daily_bars WHERE symbol IN ({symbols_str})")
                            
                            # 3. Upsert the fully adjusted historical prices
                            db.upsert_daily_bars(adjusted_bars)
                            print(f"Updated full split-adjusted history for: {split_symbols}")
                            
                            # 4. Remove these split tickers' incremental rows from delta_bars to avoid redundant upserts
                            delta_bars = delta_bars[~delta_bars["symbol"].isin(split_symbols)]
                    
                    if not delta_bars.empty:
                        print(f"Upserting {len(delta_bars)} rows for existing tickers...")
                        db.upsert_daily_bars(delta_bars)
                else:
                    print("No incremental bars fetched.")

        # 6. Relative Strength Scoring & Ranking
        print("\n[Step 3/5] Computing momentum scores & percentile ranks...")
        mom_engine = MomentumEngine(db_path)
        mom_engine.calculate_and_store_momentum_metrics()
        momentum_candidates = mom_engine.get_momentum_candidates(
            min_price=config.min_price,
            min_vol_sma=config.min_volume_sma_50,
            min_rank=config.min_rs_percentile
        )
        
        print(f"Identified {len(momentum_candidates)} tickers satisfying Minervini's base Relative Strength Template.")
        
        if not momentum_candidates:
            print("No candidates passed the relative strength momentum scans. Terminating run.")
            return

        # 7. Targeted Fundamental Acceleration Screening
        if args.skip_fundamentals:
            print("\n[Step 4/5] Skipping quarterly fundamental statements synchronization as requested (--skip-fundamentals).")
        else:
            print("\n[Step 4/5] Fetching and evaluating quarterly fundamental statement changes...")
            cand_symbols = [c["symbol"] for c in momentum_candidates]
            
            # Dynamic optimization: Fetch statements specifically for top RS candidates
            print(f"Fetching quarterly statements for top {len(cand_symbols)} momentum leaders...")
            fundamentals_df = fundamental_provider.fetch_quarterly_fundamentals(cand_symbols)
            
            if not fundamentals_df.empty:
                print(f"Upserting quarterly fundamentals for candidates...")
                db.upsert_quarterly_fundamentals(fundamentals_df)
            else:
                print("Warning: No fundamental statements could be retrieved.")

        print("\n[Sync Process] All datasets successfully synchronized and updated.")

    finally:
        if 'price_provider' in locals() and price_provider:
            price_provider.disconnect()
        if 'fundamental_provider' in locals() and fundamental_provider and fundamental_provider is not price_provider:
            fundamental_provider.disconnect()

if __name__ == "__main__":
    main()
