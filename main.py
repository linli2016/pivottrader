import argparse
import os
import sys
from datetime import datetime, timedelta
import pandas as pd

from src.config import Config
from src.database import DatabaseManager
from src.providers.yfinance_prov import YFinanceProvider
from src.providers.ibkr_prov import IBKRProvider
from src.engine.momentum import MomentumEngine
from src.engine.fundamental import FundamentalEngine
from src.exporter import TradingViewExporter

def main():
    parser = argparse.ArgumentParser(description="PivotTrader: High-Performance Momentum & Fundamental Screener")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml configuration file")
    parser.add_argument("--provider", choices=["YFINANCE", "IBKR"], help="Override data provider specified in config")
    parser.add_argument("--limit-tickers", type=int, help="Limit the universe size for rapid testing/debugging")
    parser.add_argument("--force-full", action="store_true", help="Force fetch full 550-day history for all active tickers")
    parser.add_argument("--skip-prices", action="store_true", help="Skip historical daily bars price synchronization")
    parser.add_argument("--skip-fundamentals", action="store_true", help="Skip quarterly fundamental statements synchronization")
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
        
        active_symbols = [item["symbol"] for item in universe]

        # 5. Incremental Daily Bars Ingestion
        if args.skip_prices:
            print("\n[Step 2/5] Skipping daily bars price synchronization as requested (--skip-prices).")
        else:
            print("\n[Step 2/5] Syncing historical daily bars...")
            last_dates = db.get_last_bar_dates()
            
            # Split tickers into new vs existing to optimize downloads
            new_symbols = []
            existing_symbols = []
            
            for symbol in active_symbols:
                if symbol not in last_dates or args.force_full:
                    new_symbols.append(symbol)
                else:
                    existing_symbols.append(symbol)
                    
            # Base historical lookup threshold (550 days calendar ~= 378 trading days)
            full_lookback_date = (datetime.now() - timedelta(days=550)).strftime("%Y-%m-%d")

            # Ingest new symbols
            if new_symbols:
                print(f"Fetching full lookback ({full_lookback_date}) for {len(new_symbols)} new tickers...")
                new_bars = price_provider.fetch_daily_bars(new_symbols, full_lookback_date)
                if not new_bars.empty:
                    print(f"Upserting {len(new_bars)} rows for new tickers...")
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
                    print(f"Upserting {len(delta_bars)} rows for existing tickers...")
                    db.upsert_daily_bars(delta_bars)
                else:
                    print("No incremental bars fetched.")

        # 6. Relative Strength Scoring & Ranking
        print("\n[Step 3/5] Computing momentum scores & percentile ranks...")
        mom_engine = MomentumEngine(db_path)
        momentum_candidates = mom_engine.compute_relative_strength(
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
