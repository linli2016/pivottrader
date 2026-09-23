import argparse
import os
import sys
from datetime import datetime, timedelta, timezone

import math
from typing import List, Dict, Any, Optional

from application.config import Config
from application.database import DatabaseManager
from application.providers.yfinance_prov import YFinanceProvider
from application.providers.ibkr_prov import IBKRProvider
from application.engine.momentum import MomentumEngine


def heal_split_anomalies(
    db: DatabaseManager,
    price_provider,
    full_lookback_date: str,
    target_symbols: Optional[List[str]] = None,
    recent_days: Optional[int] = 30,
    full_scan: bool = False
) -> List[str]:
    """
    Detects and heals stock split price anomalies in daily_bars:
    1. Scans daily_bars for consecutive-session price ratio jumps/drops (>= 1.45 or <= 0.70)
       within recent_days (or across all dates if full_scan is True).
    2. For identified suspect symbols, downloads full lookback history from price_provider.
    3. Verifies whether newly downloaded bars resolve or substantially reduce the jump ratio.
    4. For confirmed splits, purges unadjusted bars from DuckDB and upserts clean split-adjusted bars.
    Returns list of repaired symbols.
    """
    with db.get_connection() as conn:
        date_filter = ""
        if not full_scan and recent_days:
            date_filter = f"AND date >= (SELECT MAX(date) - INTERVAL '{recent_days} DAYS' FROM daily_bars)"

        sym_filter = ""
        if target_symbols:
            sym_list_str = ", ".join(f"'{s}'" for s in target_symbols)
            sym_filter = f"AND symbol IN ({sym_list_str})"

        query = f"""
            WITH price_changes AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    LAG(close) OVER (PARTITION BY symbol ORDER BY date) as prev_close
                FROM daily_bars
                WHERE 1=1 {sym_filter}
            )
            SELECT symbol, date, prev_close, close, (close / prev_close) as ratio
            FROM price_changes
            WHERE prev_close > 0 AND (close / prev_close >= 1.45 OR close / prev_close <= 0.70)
            {date_filter}
            ORDER BY symbol, date;
        """
        suspect_rows = conn.execute(query).fetchall()

    if not suspect_rows:
        return []

    # Map suspect symbols to their anomalous dates and ratios
    suspect_dict = {}
    for sym, dt, prev_c, c, r in suspect_rows:
        if sym not in suspect_dict:
            suspect_dict[sym] = []
        suspect_dict[sym].append((dt, float(prev_c), float(c), float(r)))

    suspect_symbols = list(suspect_dict.keys())
    scan_desc = "full database" if full_scan else f"last {recent_days} days"
    print(f"\n[Split Healer] Identified {len(suspect_symbols)} candidate ticker(s) with potential split anomalies in {scan_desc}: {suspect_symbols[:15]}{'...' if len(suspect_symbols) > 15 else ''}")
    print(f"[Split Healer] Verifying against clean provider history ({full_lookback_date})...")

    # Fetch full lookback for candidates
    new_bars = price_provider.fetch_daily_bars(suspect_symbols, full_lookback_date)
    if new_bars.empty:
        return []

    repaired = []
    for sym in suspect_symbols:
        sym_new = new_bars[new_bars["symbol"] == sym].sort_values("date")
        if sym_new.empty:
            continue

        # Check if provider explicitly recorded a split
        has_provider_split = False
        if "stock_splits" in sym_new.columns:
            splits_present = sym_new[(sym_new["stock_splits"] > 0) & (sym_new["stock_splits"] != 1.0)]
            if not splits_present.empty:
                has_provider_split = True

        # Check if the ratio jump on anomalous dates is resolved
        is_jump_resolved = False
        sym_new_indexed = sym_new.set_index("date")
        for dt, old_prev_c, old_c, old_ratio in suspect_dict[sym]:
            if dt in sym_new_indexed.index:
                pos = sym_new_indexed.index.get_loc(dt)
                if pos > 0:
                    new_c = float(sym_new_indexed.iloc[pos]["close"])
                    new_prev_c = float(sym_new_indexed.iloc[pos - 1]["close"])
                    if new_prev_c > 0 and new_c > 0:
                        new_ratio = new_c / new_prev_c
                        old_jump = abs(math.log(old_ratio))
                        new_jump = abs(math.log(new_ratio))
                        if new_jump < 0.25 or new_jump < old_jump - 0.25:
                            is_jump_resolved = True
                            break

        if has_provider_split or is_jump_resolved:
            with db.get_connection() as conn:
                conn.execute(f"DELETE FROM daily_bars WHERE symbol = '{sym}'")
            db.upsert_daily_bars(sym_new)
            repaired.append(sym)
            print(f"[Split Healer] ✅ Repaired stock split for {sym} (history resynced since {full_lookback_date}).")
        else:
            print(f"[Split Healer] ℹ️ Verified {sym}: confirmed genuine market volatility (not a split).")

    if repaired:
        print(f"[Split Healer] Successfully healed {len(repaired)} split ticker(s): {repaired}")
    return repaired



def main():
    parser = argparse.ArgumentParser(description="PivotTrader: High-Performance Momentum & Fundamental Screener")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml configuration file")
    parser.add_argument("--provider", choices=["YFINANCE", "IBKR"], help="Override data provider specified in config")
    parser.add_argument("--symbols", type=str, help="Comma-separated list of specific ticker symbols to sync (e.g. BRCC,AAPL)")
    parser.add_argument("--fix-splits", action="store_true", help="Automatically detect and resync all tickers with split price anomalies in database")
    parser.add_argument("--force-full", action="store_true", help="Force fetch full history for all active tickers")
    parser.add_argument("--force-backfill", action="store_true", help="Alias for --force-full (backfill multi-year history)")
    parser.add_argument("--history-years", type=int, help="Number of historical years of daily price bars to fetch (e.g., 2, 5, 10)")
    parser.add_argument("--skip-prices", action="store_true", help="Skip historical daily bars price synchronization")
    parser.add_argument("--skip-fundamentals", action="store_true", help="Skip quarterly fundamental statements synchronization")
    parser.add_argument("--sync-sponsorship", action="store_true", help="Synchronize quarterly institutional sponsorship fund counts & streaks")
    parser.add_argument("--sponsorship-source", choices=["yfinance", "sec_13f", "all"], default="yfinance", help="Data source for institutional sponsorship (default: yfinance)")
    parser.add_argument("--sponsorship-universe", choices=["all", "candidates"], default="all", help="Target universe for institutional sponsorship (default: all)")
    parser.add_argument("--include-premarket", "--include-extended", "--include-prepost", "--include-live", dest="include_premarket", action="store_true", help="Fetch real-time live market quotes (pre-market, intraday, and post-market)")
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
        if args.include_premarket:
            existing_active = db.get_active_symbols()
            if existing_active and not getattr(args, "symbols", None):
                print("\n[Step 1/5] Using existing active stock universe from database for fast pre-market sync...")
                active_symbols = existing_active
            else:
                print("\n[Step 1/5] Fetching NYSE/NASDAQ active stock universe...")
                universe = price_provider.fetch_universe()
                if not universe:
                    print("Error: Empty universe retrieved. Exiting screening.")
                    sys.exit(1)
                print(f"Retrieved {len(universe)} symbols from the active universe.")
                is_full = not getattr(args, "symbols", None)
                if getattr(args, "symbols", None):
                    custom_syms = set(s.strip().upper() for s in args.symbols.split(",") if s.strip())
                    universe = [u for u in universe if u["symbol"] in custom_syms]
                db.upsert_symbols(universe)
                if is_full:
                    deactivated = db.deactivate_missing_symbols([u["symbol"] for u in universe])
                    if deactivated > 0:
                        print(f"Reconciled active universe: marked {deactivated} delisted/removed symbols as inactive.")
                active_symbols = db.get_active_symbols() if is_full else [item["symbol"] for item in universe]
        else:
            print("\n[Step 1/5] Fetching NYSE/NASDAQ active stock universe...")
            universe = price_provider.fetch_universe()
            if not universe:
                print("Error: Empty universe retrieved. Exiting screening.")
                sys.exit(1)
                
            print(f"Retrieved {len(universe)} symbols from the active universe.")
            
            # Apply custom symbol selection, split repairs, or testing limits if specified
            if getattr(args, "symbols", None):
                custom_syms = set(s.strip().upper() for s in args.symbols.split(",") if s.strip())
                universe = [u for u in universe if u["symbol"] in custom_syms]
                if not universe:
                    universe = [{"symbol": s, "exchange": "UNKNOWN", "name": s, "asset_type": "Common Stock", "active": True} for s in custom_syms]
                print(f"Restricting run to custom symbols: {[u['symbol'] for u in universe]}")
            elif getattr(args, "limit_tickers", None):
                print(f"Applying debug limits: restricting run to first {args.limit_tickers} tickers.")
                universe = universe[:args.limit_tickers]

            # Insert/sync symbol metadata into DuckDB
            print("Upserting ticker directories into database...")
            db.upsert_symbols(universe)
            
            is_full_universe_sync = not getattr(args, "symbols", None) and not getattr(args, "fix_splits", False) and not getattr(args, "limit_tickers", None)
            if is_full_universe_sync:
                deactivated = db.deactivate_missing_symbols([u["symbol"] for u in universe])
                if deactivated > 0:
                    print(f"Reconciled active universe: marked {deactivated} delisted/removed symbols as inactive.")
            
            # Synchronize IPO Dates from yfinance (Incremental & Parallelized)
            missing_ipo_symbols = db.get_symbols_missing_ipo_date()
            if missing_ipo_symbols:
                print(f"\nEvaluating IPO Dates: {len(missing_ipo_symbols)} symbols missing IPO date in database...")
                from concurrent.futures import ThreadPoolExecutor, as_completed
                
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
            
            active_symbols = db.get_active_symbols() if is_full_universe_sync else [item["symbol"] for item in universe]

        # Resolve historical lookback window for pricing and split healing
        history_years = args.history_years if args.history_years is not None else config.history_lookback_years
        full_lookback_date = (datetime.now() - timedelta(days=365 * history_years)).strftime("%Y-%m-%d")

        # 5. Incremental Daily Bars Ingestion / Dedicated Split Repair
        if getattr(args, "fix_splits", False):
            print(f"\n[Step 2/5] Running dedicated Full-Database Stock Split Healer (lookback since {full_lookback_date})...")
            repaired = heal_split_anomalies(db, price_provider, full_lookback_date, full_scan=True)
            if not repaired:
                print("No unresolved stock split anomalies found in database.")
            else:
                print(f"Successfully repaired {len(repaired)} split ticker(s) across database.")
        elif args.include_premarket:
            print("\n[Step 2/5] Evaluating market session status...")
            session_info = price_provider.get_market_session_status()
            state = session_info.get("state")
            reason = session_info.get("reason")
            time_str = session_info.get("current_time_et")
            target_date = session_info.get("target_date")
            base_date = session_info.get("base_date")

            print(f"Current Session Time (ET): {time_str}")
            print(f"Session State: {state}")
            if target_date:
                print(f"Target Session Date: {target_date} (Preceding Regular Close: {base_date})")

            # Check if market is completely closed with no quote access
            if state == "CLOSED":
                print(f"\n⚡ [Sync Skipped]: {reason}")
                print("No database modifications made. Please run 'Sync Price Data' after market close for official daily bars.")
                return

            if state == "PRE_OPEN_NO_DATA":
                print(f"\n⚡ [Sync Skipped]: {reason}")
                print("No database modifications made. Pre-market quotes will be available starting at 04:00 AM ET.")
                return

            if state == "POST_MARKET":
                print(f"\n⚡ [Post-Market Sync Active]: {reason}")
                print(f"Downloading post-market quotes for {len(active_symbols)} symbols (staged as opening prices for next session: {target_date})...")
            elif state == "PRE_MARKET":
                print(f"\n⚡ [Pre-Market Sync Active]: {reason}")
                print(f"Downloading pre-market quotes for {len(active_symbols)} symbols (pre-market price -> today's session: {target_date})...")
            else:
                print(f"\n⚡ [Intraday Sync Active]: {reason}")
                print(f"Downloading live market quotes for {len(active_symbols)} symbols (live price -> today's session: {target_date})...")

            ext_bars = price_provider.fetch_premarket_or_intraday_bars(
                active_symbols, session_state=state, target_date=target_date, base_date=base_date
            )
            if not ext_bars.empty:
                print(f"Upserting {len(ext_bars)} daily bars with current prices into DuckDB...")
                db.upsert_daily_bars(ext_bars)
                # Auto-heal overnight stock split anomalies only if explicitly requested (--fix-splits)
                if getattr(args, "fix_splits", False):
                    heal_split_anomalies(db, price_provider, full_lookback_date, target_symbols=active_symbols, recent_days=5)
            else:
                print("Notice: No quotes returned.")
        elif args.skip_prices:
            print("\n[Step 2/5] Skipping daily bars price synchronization as requested (--skip-prices).")
        else:
            print("\n[Step 2/5] Syncing historical daily bars...")
            last_dates = db.get_last_bar_dates()
            first_dates = db.get_first_bar_dates()
            
            history_years = args.history_years if args.history_years is not None else config.history_lookback_years
            force_full = args.force_full or args.force_backfill or bool(getattr(args, "symbols", None)) or bool(getattr(args, "fix_splits", False))
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
                    # If force_full was used, purge previous daily bars for these tickers first to ensure clean history
                    if force_full:
                        with db.get_connection() as conn:
                            symbols_str = ", ".join(f"'{s}'" for s in new_symbols)
                            conn.execute(f"DELETE FROM daily_bars WHERE symbol IN ({symbols_str})")
                    print(f"Upserting {len(new_bars)} rows for new/backfilled tickers...")
                    db.upsert_daily_bars(new_bars)
                else:
                    print("No new price bars fetched.")

            # Ingest existing symbols incrementally
            if existing_symbols:
                # Find latest recorded date across all symbols to establish market recency
                latest_market_date_str = max(last_dates.values()) if last_dates else datetime.now().strftime("%Y-%m-%d")
                latest_market_dt = datetime.strptime(latest_market_date_str, "%Y-%m-%d")
                stale_cutoff_dt = latest_market_dt - timedelta(days=14)
                stale_cutoff_str = stale_cutoff_dt.strftime("%Y-%m-%d")

                fresh_existing = [s for s in existing_symbols if last_dates[s] >= stale_cutoff_str]
                stale_existing = [s for s in existing_symbols if last_dates[s] < stale_cutoff_str]

                # Check stale existing symbols separately so they don't drag down the entire universe
                if stale_existing:
                    print(f"\nChecking {len(stale_existing)} potentially inactive/stale symbols (last bar before {stale_cutoff_str})...")
                    stale_bars = price_provider.fetch_daily_bars(stale_existing, stale_cutoff_str)
                    stale_returned_syms = set(stale_bars["symbol"].unique()) if not stale_bars.empty else set()
                    delisted_candidates = [s for s in stale_existing if s not in stale_returned_syms]
                    if delisted_candidates:
                        deact_count = db.deactivate_symbols(delisted_candidates)
                        print(f"Deactivated {deact_count} confirmed inactive/delisted symbols: {delisted_candidates}")
                    if not stale_bars.empty:
                        print(f"Upserting {len(stale_bars)} resumed bars for recovered symbols...")
                        db.upsert_daily_bars(stale_bars)

                if fresh_existing:
                    # Find earliest date among fresh existing symbols to request delta
                    earliest_last_date = min(last_dates[sym] for sym in fresh_existing)
                    # Subtract 5 days overlap buffer to avoid missing adjustments or weekend gaps
                    delta_start_date = (datetime.strptime(earliest_last_date, "%Y-%m-%d") - timedelta(days=5)).strftime("%Y-%m-%d")
                    
                    print(f"Syncing daily bars incrementally since {delta_start_date} for {len(fresh_existing)} tickers...")
                    delta_bars = price_provider.fetch_daily_bars(fresh_existing, delta_start_date)
                    if not delta_bars.empty:
                        # Detect if any tickers underwent stock splits in the delta window
                        split_symbols = []
                        if "stock_splits" in delta_bars.columns:
                            split_rows = delta_bars[(delta_bars["stock_splits"] > 0) & (delta_bars["stock_splits"] != 1.0)]
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

                    # Auto-heal stock splits in recent window only if explicitly requested (--fix-splits)
                    if getattr(args, "fix_splits", False):
                        heal_split_anomalies(db, price_provider, full_lookback_date, target_symbols=fresh_existing, recent_days=30)

        # 6. Relative Strength Scoring & Ranking
        mom_engine = MomentumEngine(db_path)
        if getattr(args, "fix_splits", False):
            print("\n[Step 3/5] Recalculating momentum scores, moving averages, and ranks for repaired tickers...")
            mom_engine.calculate_and_store_momentum_metrics()
            print("\n[Sync Process] All stock splits and momentum metrics successfully updated.")
            return

        if args.include_premarket:
            print("\n[Step 3/5] Computing fast intraday momentum & Episodic Pivot metrics...")
            ep_count = mom_engine.update_intraday_metrics(target_date=target_date)
            print(f"⚡ Live metrics and Episodic Pivots updated ({ep_count} candidates gapping >= 8.0%).")
            # Also compute full momentum and setup metrics so breakouts, VCP, and power play are indexed
            mom_engine.calculate_and_store_momentum_metrics()
            print("\n[Sync Process] Live quotes, setups, and momentum datasets successfully synchronized and updated.")
            return

        print("\n[Step 3/5] Computing momentum scores & percentile ranks...")
        mom_engine.calculate_and_store_momentum_metrics()
        momentum_candidates = mom_engine.get_momentum_candidates(
            min_price=config.min_price,
            min_vol_sma=config.min_volume_sma_50,
            min_dollar_vol=config.min_dollar_volume_50d,
            min_rank=config.min_rs_percentile
        )
        
        print(f"Identified {len(momentum_candidates)} tickers satisfying Minervini's base Relative Strength Template.")
        
        if not momentum_candidates:
            if not getattr(args, "sync_sponsorship", False):
                print("No candidates passed the relative strength momentum scans. Terminating run.")
                return
            momentum_candidates = []

        # 7. Targeted Fundamental Acceleration Screening
        if args.skip_fundamentals or args.include_premarket:
            print("\n[Step 4/5] Skipping quarterly fundamental statements synchronization as requested (--skip-fundamentals / pre-market mode).")
        elif momentum_candidates:
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

        # 8. Institutional Sponsorship Synchronization
        if getattr(args, "sync_sponsorship", False):
            print("\n[Step 5/5] Synchronizing institutional sponsorship (fund counts & float ownership)...")
            sponsorship_source = getattr(args, "sponsorship_source", "yfinance") or "yfinance"
            
            sponsorship_univ = getattr(args, "sponsorship_universe", "all") or "all"
            
            # Determine target symbols
            if getattr(args, "symbols", None):
                target_syms = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
            elif sponsorship_univ == "candidates" and momentum_candidates:
                target_syms = [c["symbol"] for c in momentum_candidates]
            else:
                # Target full active universe, prioritizing candidates and watchlist stocks first
                active_syms = set(db.get_active_symbols(exclude_etfs=True))
                cand_syms = [c["symbol"] for c in (momentum_candidates or []) if c["symbol"] in active_syms]
                
                wl_syms = []
                try:
                    with db.get_connection() as conn:
                        wl_syms = [r[0] for r in conn.execute("SELECT DISTINCT symbol FROM watchlist_items").fetchall() if r[0] in active_syms]
                except Exception:
                    pass
                
                ordered_syms = []
                seen = set()
                for s in cand_syms + wl_syms:
                    if s not in seen:
                        seen.add(s)
                        ordered_syms.append(s)
                for s in sorted(active_syms):
                    if s not in seen:
                        seen.add(s)
                        ordered_syms.append(s)
                target_syms = ordered_syms

            # Exclude ETFs (ETFs do not have institutional 13F major holders data)
            with db.get_connection() as conn:
                etf_symbols = set(r[0] for r in conn.execute(
                    "SELECT symbol FROM symbols WHERE asset_type = 'ETF'"
                ).fetchall())
            if etf_symbols:
                target_syms = [s for s in target_syms if s not in etf_symbols]

            # If not forcing full refetch, skip symbols already synced in DuckDB
            if not getattr(args, "force_full", False):
                with db.get_connection() as conn:
                    already_synced = set(r[0] for r in conn.execute(
                        "SELECT DISTINCT symbol FROM institutional_sponsorship WHERE holders_count IS NOT NULL"
                    ).fetchall())
                unprocessed = [s for s in target_syms if s not in already_synced]
                if len(already_synced) > 0 and len(unprocessed) < len(target_syms):
                    print(f"Note: {len(target_syms) - len(unprocessed)} symbols already cached in DuckDB. Fetching remaining {len(unprocessed)} symbols (use --force-full to force re-fetch all)...")
                    target_syms = unprocessed

            print(f"Targeting {len(target_syms)} symbols for institutional sponsorship ({sponsorship_source}, universe: {sponsorship_univ})...")
            
            if sponsorship_source in ("yfinance", "all"):
                batch_size = 250
                total_upserted = 0
                for b_idx in range(0, len(target_syms), batch_size):
                    batch = target_syms[b_idx:b_idx + batch_size]
                    b_num = (b_idx // batch_size) + 1
                    b_total = (len(target_syms) + batch_size - 1) // batch_size
                    print(f"\n[Sponsorship Batch {b_num}/{b_total}] Fetching {len(batch)} symbols ({batch[0]}..{batch[-1]})...")
                    inst_df = price_provider.fetch_institutional_sponsorship(batch)
                    if not inst_df.empty:
                        db.upsert_institutional_sponsorship(inst_df)
                        total_upserted += len(inst_df)
                        print(f"Upserted {len(inst_df)} sponsorship records in batch {b_num} (total: {total_upserted}).")
                    else:
                        print(f"Batch {b_num}: No records found.")

            if sponsorship_source in ("sec_13f", "all"):
                try:
                    from application.providers.sec_13f_prov import SEC13FProvider
                    sec_prov = SEC13FProvider()
                    print(f"[SEC-13F] Checking SEC EDGAR 13F submissions...")
                    # Fetch quarterly filings for targeted symbols
                    for sym in target_syms[:25]:
                        sec_recs = sec_prov.fetch_historical_quarters_for_symbol(sym, num_quarters=4)
                except Exception as e:
                    print(f"[SEC-13F] Warning: SEC 13F sync encountered: {e}")

            print("\nRecalculating quarterly sponsorship streaks and QoQ growth...")
            db.recalculate_sponsorship_metrics()
            print("Institutional sponsorship synchronization completed.")

        print("\n[Sync Process] All datasets successfully synchronized and updated.")

    finally:
        if 'price_provider' in locals() and price_provider:
            price_provider.disconnect()
        if 'fundamental_provider' in locals() and fundamental_provider and fundamental_provider is not price_provider:
            fundamental_provider.disconnect()

if __name__ == "__main__":
    main()
