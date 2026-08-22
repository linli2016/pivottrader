import io
import time
import requests
import sys
import pandas as pd
import yfinance as yf
from typing import List, Dict, Any
from src.providers.base import AbstractDataProvider

class YFinanceProvider(AbstractDataProvider):
    def connect(self) -> None:
        """No persistent connection required for yfinance."""
        pass

    def disconnect(self) -> None:
        """No connection cleanup required for yfinance."""
        pass

    def fetch_universe(self) -> List[Dict[str, Any]]:
        """Downloads full active lists of NYSE and NASDAQ issues from github mirror."""
        nyse_url = "https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/nyse/nyse_full_tickers.json"
        nasdaq_url = "https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/nasdaq/nasdaq_full_tickers.json"
        
        tickers = []
        
        def get_and_clean(url: str, exchange: str) -> List[Dict[str, Any]]:
            try:
                headers = {"User-Agent": "Mozilla/5.0"}
                r = requests.get(url, headers=headers, timeout=15)
                r.raise_for_status()
                data = r.json()
                
                clean_data = []
                for item in data:
                    sym = item.get("symbol", "").strip()
                    name = item.get("name", "").strip()
                    sector = item.get("sector", "") or ""
                    industry = item.get("industry", "") or ""
                    
                    # 1. Ticker string format filters (exclude preferreds, warrants, class suffixes)
                    if not sym.isalpha() or len(sym) > 4:
                        continue
                        
                    # 2. Heuristic ETF filters
                    if any(term in name.upper() for term in ["ETF", "ETN", "EXCHANGE TRADED", "EXCHANGE-TRADED", "FUND", "TRUST", "INDEX"]):
                        continue
                    if "ETFS" in sector.upper() or "EXCHANGE TRADED FUNDS" in sector.upper():
                        continue
                    if "ETFS" in industry.upper() or "EXCHANGE TRADED FUNDS" in industry.upper():
                        continue
                        
                    # 3. Heuristic ADR filters
                    if any(term in name.upper() for term in ["ADR", "SPONS ADR", "SPONS. ADR", "DEPOSITARY", "DEPOSITORY", "RECEIPT"]):
                        continue
                        
                    # 4. Heuristic SPAC filters
                    if any(term in name.upper() for term in ["ACQUISITION CORP", "ACQUISITION CORP.", "SPAC", "BLANK CHECK", "ACQUISITION II"]):
                        continue
                        
                    clean_data.append({
                        "symbol": sym,
                        "exchange": exchange,
                        "name": name,
                        "asset_type": "Common Stock",
                        "active": True,
                        "sector": sector,
                        "industry": industry
                    })
                return clean_data
            except Exception as e:
                print(f"Warning: Failed to fetch {exchange} universe from mirror: {e}")
                return []

        tickers.extend(get_and_clean(nyse_url, "NYSE"))
        tickers.extend(get_and_clean(nasdaq_url, "NASDAQ"))
        
        # Add Sector & Industry Benchmark ETFs
        sector_etfs = [
            {"symbol": "XLK", "exchange": "NYSE", "name": "Technology Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Technology", "industry": "Technology ETF"},
            {"symbol": "XLF", "exchange": "NYSE", "name": "Financial Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Financials", "industry": "Financials ETF"},
            {"symbol": "XLV", "exchange": "NYSE", "name": "Health Care Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Health Care", "industry": "Health Care ETF"},
            {"symbol": "XLY", "exchange": "NYSE", "name": "Consumer Discretionary SPDR", "asset_type": "ETF", "active": True, "sector": "Consumer Discretionary", "industry": "Consumer Discretionary ETF"},
            {"symbol": "XLP", "exchange": "NYSE", "name": "Consumer Staples Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Consumer Staples", "industry": "Consumer Staples ETF"},
            {"symbol": "XLE", "exchange": "NYSE", "name": "Energy Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Energy", "industry": "Energy ETF"},
            {"symbol": "XLI", "exchange": "NYSE", "name": "Industrial Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Industrials", "industry": "Industrials ETF"},
            {"symbol": "XLB", "exchange": "NYSE", "name": "Materials Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Basic Materials", "industry": "Basic Materials ETF"},
            {"symbol": "XLU", "exchange": "NYSE", "name": "Utilities Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Utilities", "industry": "Utilities ETF"},
            {"symbol": "XLRE", "exchange": "NYSE", "name": "Real Estate Select Sector SPDR", "asset_type": "ETF", "active": True, "sector": "Real Estate", "industry": "Real Estate ETF"},
            {"symbol": "XLC", "exchange": "NYSE", "name": "Communication Services SPDR", "asset_type": "ETF", "active": True, "sector": "Communication Services", "industry": "Communication Services ETF"},
            {"symbol": "SMH", "exchange": "NASDAQ", "name": "VanEck Semiconductor ETF", "asset_type": "ETF", "active": True, "sector": "Technology", "industry": "Semiconductors ETF"},
            {"symbol": "XBI", "exchange": "NYSE", "name": "SPDR S&P Biotech ETF", "asset_type": "ETF", "active": True, "sector": "Health Care", "industry": "Biotech ETF"},
            {"symbol": "IGV", "exchange": "NYSE", "name": "iShares Tech-Software ETF", "asset_type": "ETF", "active": True, "sector": "Technology", "industry": "Software ETF"},
            {"symbol": "KRE", "exchange": "NYSE", "name": "SPDR S&P Regional Banking ETF", "asset_type": "ETF", "active": True, "sector": "Financials", "industry": "Regional Banking ETF"},
            {"symbol": "XOP", "exchange": "NYSE", "name": "SPDR S&P Oil & Gas Exploration ETF", "asset_type": "ETF", "active": True, "sector": "Energy", "industry": "Oil & Gas ETF"},
            {"symbol": "XRT", "exchange": "NYSE", "name": "SPDR S&P Retail ETF", "asset_type": "ETF", "active": True, "sector": "Consumer Discretionary", "industry": "Retail ETF"},
            {"symbol": "ITB", "exchange": "NYSE", "name": "iShares U.S. Home Construction ETF", "asset_type": "ETF", "active": True, "sector": "Consumer Discretionary", "industry": "Homebuilders ETF"},
            {"symbol": "ITA", "exchange": "NYSE", "name": "iShares U.S. Aerospace & Defense ETF", "asset_type": "ETF", "active": True, "sector": "Industrials", "industry": "Aerospace & Defense ETF"},
            {"symbol": "SPY", "exchange": "NYSE", "name": "SPDR S&P 500 ETF Trust", "asset_type": "ETF", "active": True, "sector": "Market Index", "industry": "S&P 500 ETF"},
            {"symbol": "QQQ", "exchange": "NASDAQ", "name": "Invesco QQQ Trust", "asset_type": "ETF", "active": True, "sector": "Market Index", "industry": "Nasdaq 100 ETF"},
            {"symbol": "IWM", "exchange": "NYSE", "name": "iShares Russell 2000 ETF", "asset_type": "ETF", "active": True, "sector": "Market Index", "industry": "Small Cap ETF"}
        ]
        tickers.extend(sector_etfs)

        # De-duplicate ticker listings
        seen = set()
        unique_tickers = []
        for t in tickers:
            if t["symbol"] not in seen:
                seen.add(t["symbol"])
                unique_tickers.append(t)
                
        return unique_tickers

    def fetch_daily_bars(self, symbols: List[str], start_date: str) -> pd.DataFrame:
        """Fetches historical price bars using multi-threaded batching."""
        if not symbols:
            return pd.DataFrame()
            
        all_bars = []
        batch_size = 100
        
        total = len(symbols)
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i+batch_size]
            done = min(i + batch_size, total)
            pct = (done / total) * 100
            sys.stdout.write(f"\r[YFINANCE] Progress: {done}/{total} ({pct:.1f}%) | Fetching batch starting with {batch[0]:<5}")
            sys.stdout.flush()
            try:
                # yf.download performs multi-threaded requests
                df = yf.download(batch, start=start_date, group_by='ticker', threads=True, progress=False, actions=True)
                if df.empty:
                    continue
                
                # Process batch DataFrame regardless of batch size
                batch_syms = batch
                is_multi = hasattr(df.columns, 'levels') and len(df.columns.levels) > 1

                for sym in batch_syms:
                    if is_multi:
                        if sym not in df.columns.levels[0]:
                            continue
                        sym_df = df[sym].copy().reset_index()
                    else:
                        if "Close" not in df.columns:
                            continue
                        sym_df = df.copy().reset_index()

                    sym_df["symbol"] = sym
                    if "Stock Splits" not in sym_df.columns:
                        sym_df["Stock Splits"] = 0.0
                    sym_df = sym_df.rename(columns={
                        "Date": "date", "Open": "open", "High": "high", 
                        "Low": "low", "Close": "close", "Volume": "volume",
                        "Stock Splits": "stock_splits"
                    })
                    sym_df["date"] = pd.to_datetime(sym_df["date"]).dt.date
                    sym_df = sym_df.dropna(subset=["close"])

                    if not sym_df.empty:
                        # Apply backward stock split adjustments for split-adjusted price consistency
                        if "stock_splits" in sym_df.columns:
                            splits = sym_df[(sym_df["stock_splits"] > 0) & (sym_df["stock_splits"] != 1.0)]
                            if not splits.empty:
                                sym_df = sym_df.sort_values("date").reset_index(drop=True)
                                for _, s_row in splits.iterrows():
                                    s_ratio = float(s_row["stock_splits"])
                                    s_date = s_row["date"]
                                    mask = sym_df["date"] < s_date
                                    if mask.any():
                                        sym_df.loc[mask, "open"] = sym_df.loc[mask, "open"] / s_ratio
                                        sym_df.loc[mask, "high"] = sym_df.loc[mask, "high"] / s_ratio
                                        sym_df.loc[mask, "low"] = sym_df.loc[mask, "low"] / s_ratio
                                        sym_df.loc[mask, "close"] = sym_df.loc[mask, "close"] / s_ratio
                                        sym_df.loc[mask, "volume"] = sym_df.loc[mask, "volume"] * s_ratio

                        all_bars.append(sym_df[["symbol", "date", "open", "high", "low", "close", "volume", "stock_splits"]])
                    
                    if not is_multi:
                        break
                            
                # Micro sleep cooling to avoid IP ban triggers
                time.sleep(0.5)
            except Exception as e:
                sys.stdout.write("\n")
                print(f"Warning: Failed to fetch daily bars for batch starting {batch[0]}: {e}")
                
        if symbols:
            sys.stdout.write("\n")
            sys.stdout.flush()
                
        if all_bars:
            return pd.concat(all_bars, ignore_index=True)
        return pd.DataFrame()

    def fetch_quarterly_fundamentals(self, symbols: List[str]) -> pd.DataFrame:
        """Fetches quarterly financials to compute QoQ EPS acceleration."""
        if not symbols:
            return pd.DataFrame()
            
        all_funds = []
        total = len(symbols)
        for idx, symbol in enumerate(symbols):
            pct = ((idx + 1) / total) * 100
            sys.stdout.write(f"\r[YFINANCE] Fetching fundamentals: {idx+1}/{total} ({pct:.1f}%) | Last: {symbol:<5}")
            sys.stdout.flush()
            try:
                ticker = yf.Ticker(symbol)
                stmt = ticker.quarterly_income_stmt
                if stmt is None or stmt.empty:
                    stmt = ticker.quarterly_financials
                    
                if stmt is None or stmt.empty:
                    continue
                
                # Check for EPS row key variations
                eps_row = None
                for idy in ["Diluted EPS", "Basic EPS"]:
                    if idy in stmt.index:
                        eps_row = idy
                        break
                        
                if eps_row is None:
                    continue
                
                # Check for Revenue row key variations
                rev_row = None
                for idy in ["Total Revenue", "Operating Revenue"]:
                    if idy in stmt.index:
                        rev_row = idy
                        break
                
                eps_series = stmt.loc[eps_row]
                rev_series = stmt.loc[rev_row] if rev_row is not None else pd.Series(index=stmt.columns, dtype=float)
                
                records = []
                for dt in stmt.columns:
                    val_eps = eps_series.get(dt)
                    val_rev = rev_series.get(dt) if rev_row is not None else None
                    
                    if pd.isna(val_eps):
                        continue
                        
                    date_obj = pd.to_datetime(dt)
                    year = date_obj.year
                    quarter = (date_obj.month - 1) // 3 + 1
                    fiscal_q = f"{year}-Q{quarter}"
                    
                    records.append({
                        "symbol": symbol,
                        "report_date": date_obj.date(),
                        "fiscal_quarter": fiscal_q,
                        "eps_diluted": float(val_eps),
                        "eps_qoq_growth": None, # Calculated below
                        "total_revenue": float(val_rev) if val_rev is not None and not pd.isna(val_rev) else None
                    })
                    
                # Try to fetch additional historical EPS actuals from earnings_dates
                try:
                    ed = ticker.earnings_dates
                    if ed is not None and not ed.empty:
                        for earnings_dt, ed_row in ed.iterrows():
                            val_eps = ed_row.get("Reported EPS")
                            if pd.isna(val_eps) or val_eps is None:
                                continue
                            
                            # Parse dates (index is datetime-like)
                            date_obj = pd.to_datetime(earnings_dt)
                            if date_obj.tzinfo is not None:
                                date_obj = date_obj.tz_localize(None)
                                
                            # Map to calendar quarter using the 30-day offset rule
                            adjusted_date = date_obj - pd.Timedelta(days=30)
                            year = adjusted_date.year
                            quarter = (adjusted_date.month - 1) // 3 + 1
                            fiscal_q = f"{year}-Q{quarter}"
                            
                            # Check if this quarter is already in records
                            if not any(r["fiscal_quarter"] == fiscal_q for r in records):
                                records.append({
                                    "symbol": symbol,
                                    "report_date": date_obj.date(),
                                    "fiscal_quarter": fiscal_q,
                                    "eps_diluted": float(val_eps),
                                    "eps_qoq_growth": None,
                                    "total_revenue": None
                                })
                except Exception:
                    pass

                if records:
                    df = pd.DataFrame(records)
                    df = df.sort_values(by="fiscal_quarter")
                    
                    # Compute QoQ EPS acceleration against same quarter prior year (Q-4)
                    for idz, row in df.iterrows():
                        fq = row["fiscal_quarter"]
                        try:
                            y, q = fq.split("-Q")
                            prior_fq = f"{int(y)-1}-Q{q}"
                            prior_rows = df[df["fiscal_quarter"] == prior_fq]
                            if not prior_rows.empty:
                                prior_eps = prior_rows.iloc[0]["eps_diluted"]
                                curr_eps = row["eps_diluted"]
                                if prior_eps is not None and not pd.isna(prior_eps):
                                    denominator = max(0.01, abs(prior_eps))
                                    growth = ((curr_eps - prior_eps) / denominator) * 100
                                    df.at[idz, "eps_qoq_growth"] = float(growth)
                        except Exception:
                            pass
                            
                    all_funds.append(df)
                
                # Conservative pacing rate limit protection
                time.sleep(1.0)
            except Exception as e:
                sys.stdout.write("\n")
                print(f"Warning: Failed to fetch fundamentals for {symbol}: {e}")
                
        if symbols:
            sys.stdout.write("\n")
            sys.stdout.flush()

        if all_funds:
            return pd.concat(all_funds, ignore_index=True)
        return pd.DataFrame()

    def fetch_premarket_bars(self, symbols: List[str]) -> pd.DataFrame:
        """
        Fetches pre-market real-time quotes for symbols using multi-threaded fast_info lookup.
        Appends or updates today's date bar with pre-market open/close and volume.
        """
        if not symbols:
            return pd.DataFrame()

        from concurrent.futures import ThreadPoolExecutor, as_completed
        from datetime import datetime

        today_str = datetime.now().strftime("%Y-%m-%d")
        print(f"Fetching pre-market real-time quotes for {len(symbols)} symbols as of {today_str}...")

        def fetch_single_pm(sym: str):
            try:
                t = yf.Ticker(sym)
                fi = getattr(t, "fast_info", {})
                pm_price = fi.get("preMarketPrice") or fi.get("lastPrice")
                prev_close = fi.get("regularMarketPreviousClose") or pm_price
                pm_volume = fi.get("lastVolume") or 0
                
                if pm_price and prev_close:
                    return {
                        "symbol": sym,
                        "date": today_str,
                        "open": float(pm_price),
                        "high": float(max(pm_price, prev_close)),
                        "low": float(min(pm_price, prev_close)),
                        "close": float(pm_price),
                        "volume": int(pm_volume),
                        "vol_50d_ma": 0
                    }
            except Exception:
                pass
            return None

        records = []
        with ThreadPoolExecutor(max_workers=25) as executor:
            futures = {executor.submit(fetch_single_pm, sym): sym for sym in symbols}
            for i, future in enumerate(as_completed(futures), 1):
                res = future.result()
                if res:
                    records.append(res)
                if i % 500 == 0 or i == len(symbols):
                    sys.stdout.write(f"\rPre-Market Fetch Progress: {i}/{len(symbols)} symbols evaluated...")
                    sys.stdout.flush()

        sys.stdout.write("\n")
        if records:
            df = pd.DataFrame(records)
            print(f"Successfully retrieved {len(df)} pre-market bar records.")
            return df
        return pd.DataFrame()
