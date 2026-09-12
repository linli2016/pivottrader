import time
import datetime
import requests
import sys
import math
import pandas as pd
import yfinance as yf
from typing import List, Dict, Any, Optional
from application.providers.base import AbstractDataProvider

def _calculate_easter(year: int) -> datetime.date:
    """Computes Easter Sunday for a given year using Butcher's algorithm."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return datetime.date(year, month, day)

def get_us_market_holidays(year: int) -> set:
    """Returns official NYSE/NASDAQ stock market holidays for a given year."""
    import datetime
    holidays = set()

    # 1. New Year's Day (Jan 1)
    nyd = datetime.date(year, 1, 1)
    if nyd.weekday() == 6:  # Sunday -> Monday
        holidays.add(datetime.date(year, 1, 2))
    elif nyd.weekday() != 5:  # If not Saturday
        holidays.add(nyd)

    # 2. Martin Luther King Jr. Day (Third Monday of January)
    first_jan = datetime.date(year, 1, 1)
    first_mon = first_jan + datetime.timedelta(days=(0 - first_jan.weekday()) % 7)
    holidays.add(first_mon + datetime.timedelta(days=14))

    # 3. Washington's Birthday / Presidents' Day (Third Monday of February)
    first_feb = datetime.date(year, 2, 1)
    first_mon_feb = first_feb + datetime.timedelta(days=(0 - first_feb.weekday()) % 7)
    holidays.add(first_mon_feb + datetime.timedelta(days=14))

    # 4. Good Friday (Friday before Easter)
    easter = _calculate_easter(year)
    holidays.add(easter - datetime.timedelta(days=2))

    # 5. Memorial Day (Last Monday of May)
    last_may = datetime.date(year, 5, 31)
    memorial_day = last_may - datetime.timedelta(days=(last_may.weekday() - 0) % 7)
    holidays.add(memorial_day)

    # 6. Juneteenth National Independence Day (June 19, since 2021)
    if year >= 2021:
        jt = datetime.date(year, 6, 19)
        if jt.weekday() == 5:
            holidays.add(datetime.date(year, 6, 18))
        elif jt.weekday() == 6:
            holidays.add(datetime.date(year, 6, 20))
        else:
            holidays.add(jt)

    # 7. Independence Day (July 4)
    july4 = datetime.date(year, 7, 4)
    if july4.weekday() == 5:
        holidays.add(datetime.date(year, 7, 3))
    elif july4.weekday() == 6:
        holidays.add(datetime.date(year, 7, 5))
    else:
        holidays.add(july4)

    # 8. Labor Day (First Monday of September)
    first_sep = datetime.date(year, 9, 1)
    labor_day = first_sep + datetime.timedelta(days=(0 - first_sep.weekday()) % 7)
    holidays.add(labor_day)

    # 9. Thanksgiving Day (Fourth Thursday of November)
    first_nov = datetime.date(year, 11, 1)
    first_thu_nov = first_nov + datetime.timedelta(days=(3 - first_nov.weekday()) % 7)
    holidays.add(first_thu_nov + datetime.timedelta(days=21))

    # 10. Christmas Day (Dec 25)
    xmas = datetime.date(year, 12, 25)
    if xmas.weekday() == 5:
        holidays.add(datetime.date(year, 12, 24))
    elif xmas.weekday() == 6:
        holidays.add(datetime.date(year, 12, 26))
    else:
        holidays.add(xmas)

    return holidays

def is_us_market_holiday(d: datetime.date) -> bool:
    """Checks if date is an official US stock market holiday."""
    return d in get_us_market_holidays(d.year)

def get_next_trading_day(d: datetime.date) -> datetime.date:
    """Returns next active US stock market trading day (skipping weekends and market holidays)."""
    import datetime
    cur = d + datetime.timedelta(days=1)
    while cur.weekday() in (5, 6) or is_us_market_holiday(cur):
        cur += datetime.timedelta(days=1)
    return cur

def get_previous_trading_day(d: datetime.date) -> datetime.date:
    """Returns most recent active US stock market trading day before date."""
    import datetime
    cur = d - datetime.timedelta(days=1)
    while cur.weekday() in (5, 6) or is_us_market_holiday(cur):
        cur -= datetime.timedelta(days=1)
    return cur

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
            if sys.stdout.isatty():
                sys.stdout.write(f"\r[YFINANCE] Progress: {done}/{total} ({pct:.1f}%) | Fetching batch starting with {batch[0]:<5}")
                sys.stdout.flush()
            else:
                print(f"[YFINANCE] Progress: {done}/{total} ({pct:.1f}%) | Batch: {batch[0]}", flush=True)
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

                    for col in ["open", "high", "low", "close"]:
                        if col in sym_df.columns:
                            sym_df[col] = sym_df[col].astype(float)

                    if "stock_splits" in sym_df.columns:
                        sym_df["stock_splits"] = sym_df["stock_splits"].fillna(0.0).astype(float)

                    sym_df = sym_df.dropna(subset=["close"])

                    if not sym_df.empty:
                        if "volume" in sym_df.columns:
                            sym_df["volume"] = sym_df["volume"].fillna(0).round().astype("int64")
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
        """Fetches quarterly financials to compute QoQ EPS acceleration using multi-threading."""
        if not symbols:
            return pd.DataFrame()

        def _fetch_single(symbol: str) -> Optional[pd.DataFrame]:
            try:
                ticker = yf.Ticker(symbol)
                stmt = ticker.quarterly_income_stmt
                if stmt is None or stmt.empty:
                    stmt = ticker.quarterly_financials
                    
                if stmt is None or stmt.empty:
                    return None
                
                # Check for EPS row key variations
                eps_row = None
                for idy in ["Diluted EPS", "Basic EPS"]:
                    if idy in stmt.index:
                        eps_row = idy
                        break
                        
                if eps_row is None:
                    return None
                
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
                    return df
            except Exception:
                return None
            return None

        from concurrent.futures import ThreadPoolExecutor, as_completed
        all_funds = []
        total = len(symbols)
        completed = 0

        with ThreadPoolExecutor(max_workers=8) as executor:
            future_to_sym = {executor.submit(_fetch_single, sym): sym for sym in symbols}
            for future in as_completed(future_to_sym):
                sym = future_to_sym[future]
                completed += 1
                try:
                    res_df = future.result()
                    if res_df is not None and not res_df.empty:
                        all_funds.append(res_df)
                except Exception:
                    pass

                pct = (completed / total) * 100
                if sys.stdout.isatty():
                    sys.stdout.write(f"\r[YFINANCE] Fetching fundamentals: {completed}/{total} ({pct:.1f}%) | Last: {sym:<5}")
                    sys.stdout.flush()
                else:
                    if completed % 25 == 0 or completed == total:
                        print(f"[YFINANCE] Fetching fundamentals: {completed}/{total} ({pct:.1f}%) | Last: {sym:<5}", flush=True)

        if sys.stdout.isatty():
            sys.stdout.write("\n")
            sys.stdout.flush()

        if all_funds:
            return pd.concat(all_funds, ignore_index=True)
        return pd.DataFrame()

    def get_market_session_status(self, as_of: datetime.datetime = None) -> Dict[str, Any]:
        """
        Determines current US Equities market session status based on America/New_York time
        and benchmark (SPY) quote validation.

        Returns dict with:
          - state: 'POST_MARKET' | 'PRE_MARKET' | 'REGULAR' | 'CLOSED'
          - target_date: YYYY-MM-DD for the bar date in DuckDB
          - base_date: YYYY-MM-DD for the preceding regular trading bar
          - reason: Human-readable explanation of session status
          - current_time_et: Formatted time string in ET
          - trading_date: YYYY-MM-DD in ET
          - market_state: Raw Yahoo marketState if available ('PRE', 'REGULAR', 'POST', 'CLOSED')
        """
        from zoneinfo import ZoneInfo
        from datetime import datetime as dt, time

        if as_of is not None:
            now_et = as_of if as_of.tzinfo else as_of.replace(tzinfo=ZoneInfo("America/New_York"))
            now_et = now_et.astimezone(ZoneInfo("America/New_York"))
        else:
            now_et = dt.now(ZoneInfo("America/New_York"))

        today_dt = now_et.date()
        today_str = today_dt.strftime("%Y-%m-%d")
        time_str = now_et.strftime("%Y-%m-%d %H:%M:%S %Z")
        weekday = now_et.weekday()  # 0 = Monday, ..., 4 = Friday, 5 = Saturday, 6 = Sunday
        cur_time = now_et.time()

        next_trade_dt = get_next_trading_day(today_dt)
        next_trade_str = next_trade_dt.strftime("%Y-%m-%d")

        # 1. Weekend Check: Sat/Sun -> POST_MARKET staging for next trading day
        if weekday in (5, 6):
            day_name = now_et.strftime("%A")
            last_trade_dt = get_previous_trading_day(today_dt)
            return {
                "state": "POST_MARKET",
                "reason": f"Today is {day_name} (weekend). Staging latest after-hours quotes as opening prices for next session ({next_trade_str}).",
                "current_time_et": time_str,
                "trading_date": today_str,
                "target_date": next_trade_str,
                "base_date": last_trade_dt.strftime("%Y-%m-%d"),
                "market_state": "POST"
            }

        # 2. Holiday Check: Weekday holiday -> POST_MARKET staging for next trading day
        if is_us_market_holiday(today_dt):
            last_trade_dt = get_previous_trading_day(today_dt)
            return {
                "state": "POST_MARKET",
                "reason": f"Today is a US market holiday. Staging latest after-hours quotes as opening prices for next session ({next_trade_str}).",
                "current_time_et": time_str,
                "trading_date": today_str,
                "target_date": next_trade_str,
                "base_date": last_trade_dt.strftime("%Y-%m-%d"),
                "market_state": "POST"
            }

        # 3. Post-Market / Evening Check (16:00 ET onwards on active trading day)
        if cur_time >= time(16, 0):
            return {
                "state": "POST_MARKET",
                "reason": f"Post-market session active ({now_et.strftime('%H:%M %Z')}). After-hours quotes are staged for next trading session ({next_trade_str}).",
                "current_time_et": time_str,
                "trading_date": today_str,
                "target_date": next_trade_str,
                "base_date": today_str,
                "market_state": "POST"
            }

        # 4. Overnight / Early Morning Check (00:00 to 04:00 ET on active trading day)
        # Pre-market hasn't opened yet for today_str, so the latest quotes are prior session's post-market quotes,
        # which stage as the baseline for today_str.
        if cur_time < time(4, 0):
            prev_trade_dt = get_previous_trading_day(today_dt)
            return {
                "state": "POST_MARKET",
                "reason": f"Overnight session before pre-market open ({now_et.strftime('%H:%M %Z')}). Staging post-market quotes for today's session ({today_str}). Pre-market opens at 04:00 ET.",
                "current_time_et": time_str,
                "trading_date": today_str,
                "target_date": today_str,
                "base_date": prev_trade_dt.strftime("%Y-%m-%d"),
                "market_state": "POST"
            }

        # 5. Pre-Market Session: 04:00 ET to 09:30 ET
        if cur_time < time(9, 30):
            prev_trade_dt = get_previous_trading_day(today_dt)
            return {
                "state": "PRE_MARKET",
                "reason": f"Pre-market trading session is currently active ({now_et.strftime('%H:%M %Z')}). Updating quotes for today ({today_str}).",
                "current_time_et": time_str,
                "trading_date": today_str,
                "target_date": today_str,
                "base_date": prev_trade_dt.strftime("%Y-%m-%d"),
                "market_state": "PRE"
            }

        # 6. Regular Trading Session: 09:30 ET to 16:00 ET
        prev_trade_dt = get_previous_trading_day(today_dt)
        return {
            "state": "REGULAR",
            "reason": f"Regular market trading is OPEN ({now_et.strftime('%H:%M %Z')}). Updating live intraday quotes for today ({today_str}).",
            "current_time_et": time_str,
            "trading_date": today_str,
            "target_date": today_str,
            "base_date": prev_trade_dt.strftime("%Y-%m-%d"),
            "market_state": "REGULAR"
        }

    def fetch_premarket_or_intraday_bars(
        self,
        symbols: List[str],
        session_state: str = None,
        target_date: str = None,
        base_date: str = None
    ) -> pd.DataFrame:
        """
        Fetches pre-market, post-market, or intraday live quotes for symbols using fast batch querying.
        If session_state or target_date is None, inspects get_market_session_status() first.
        - In 'POST_MARKET': sets close = postMarketPrice, target date = next trading day. Also stages base_date regular close.
        - In 'PRE_MARKET': sets close = preMarketPrice, target date = today (overwriting previous post-market bar).
        - In 'REGULAR': sets close = regularMarketPrice, target date = today (overwriting pre-market bar).
        """
        if not symbols:
            return pd.DataFrame()

        if session_state is None or target_date is None:
            status = self.get_market_session_status()
            if session_state is None:
                session_state = status["state"]
            if target_date is None:
                target_date = status.get("target_date") or status.get("trading_date")
            if base_date is None:
                base_date = status.get("base_date")

        mode_name = "Post-Market" if session_state == "POST_MARKET" else ("Pre-Market" if session_state == "PRE_MARKET" else "Intraday Live")
        print(f"Fetching {mode_name} real-time quotes for {len(symbols)} symbols (Target Date: {target_date})...")

        records = []
        batch_size = 500
        total = len(symbols)
        batches = [symbols[i:i+batch_size] for i in range(0, total, batch_size)]

        from concurrent.futures import ThreadPoolExecutor, as_completed
        from yfinance.data import YfData
        data_mgr = YfData()

        def fetch_batch_quotes(b):
            params = {"symbols": ",".join(b), "formatted": "false"}
            for attempt in range(2):
                try:
                    data = data_mgr.get_raw_json("https://query1.finance.yahoo.com/v7/finance/quote", params=params)
                    if data and "quoteResponse" in data:
                        return data["quoteResponse"].get("result", [])
                except Exception:
                    if attempt == 0:
                        time.sleep(0.5)
            return []

        quotes = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_batch = {executor.submit(fetch_batch_quotes, b): b for b in batches}
            done_count = 0
            for future in as_completed(future_to_batch):
                batch_res = future.result()
                quotes.extend(batch_res)
                done_count += len(future_to_batch[future])
                pct = (min(done_count, total) / total) * 100
                if sys.stdout.isatty():
                    sys.stdout.write(f"\r[{mode_name.upper()}] Fetched {min(done_count, total)}/{total} ({pct:.1f}%) symbols...")
                    sys.stdout.flush()
                else:
                    print(f"[{mode_name.upper()}] Fetched {min(done_count, total)}/{total} ({pct:.1f}%) symbols...", flush=True)

        sys.stdout.write("\n")
        sys.stdout.flush()

        for q in quotes:
            sym = q.get("symbol")
            if not sym:
                continue

            if session_state == "POST_MARKET":
                post_price = q.get("postMarketPrice")
                reg_price = q.get("regularMarketPrice")
                prev_c = float(q.get("regularMarketPreviousClose") or reg_price or 0.0)

                if post_price and float(post_price) > 0:
                    p_val = float(post_price)
                    vol = int(q.get("postMarketVolume") or 0)
                elif reg_price and float(reg_price) > 0:
                    p_val = float(reg_price)
                    vol = int(q.get("regularMarketVolume") or 0)
                else:
                    continue

                if base_date and base_date != target_date and reg_price and float(reg_price) > 0:
                    reg_p = float(reg_price)
                    r_open = float(q.get("regularMarketOpen") or reg_p)
                    r_high = float(q.get("regularMarketDayHigh") or max(reg_p, r_open))
                    r_low = float(q.get("regularMarketDayLow") or min(reg_p, r_open))
                    r_vol = int(q.get("regularMarketVolume") or 0)
                    records.append({
                        "symbol": sym,
                        "date": base_date,
                        "open": r_open,
                        "high": r_high,
                        "low": r_low,
                        "close": reg_p,
                        "volume": r_vol,
                        "vol_50d_ma": 0
                    })

                records.append({
                    "symbol": sym,
                    "date": target_date,
                    "open": p_val,
                    "high": max(p_val, float(reg_price or p_val)),
                    "low": min(p_val, float(reg_price or p_val)),
                    "close": p_val,
                    "volume": vol,
                    "vol_50d_ma": 0
                })

            elif session_state == "PRE_MARKET":
                pm_price = q.get("preMarketPrice")
                if pm_price and float(pm_price) > 0:
                    p_val = float(pm_price)
                    prev_c = float(q.get("regularMarketPreviousClose") or p_val)
                    vol = int(q.get("preMarketVolume") or q.get("regularMarketVolume") or 0)
                    records.append({
                        "symbol": sym,
                        "date": target_date,
                        "open": p_val,
                        "high": max(p_val, prev_c),
                        "low": min(p_val, prev_c),
                        "close": p_val,
                        "volume": vol,
                        "vol_50d_ma": 0
                    })
                else:
                    reg_price = q.get("regularMarketPrice")
                    if reg_price and float(reg_price) > 0:
                        p_val = float(reg_price)
                        records.append({
                            "symbol": sym,
                            "date": target_date,
                            "open": p_val,
                            "high": p_val,
                            "low": p_val,
                            "close": p_val,
                            "volume": 0,
                            "vol_50d_ma": 0
                        })

            else:  # REGULAR
                reg_price = q.get("regularMarketPrice")
                if reg_price and float(reg_price) > 0:
                    p_val = float(reg_price)
                    o_val = float(q.get("regularMarketOpen") or p_val)
                    h_val = float(q.get("regularMarketDayHigh") or max(p_val, o_val))
                    l_val = float(q.get("regularMarketDayLow") or min(p_val, o_val))
                    vol = int(q.get("regularMarketVolume") or 0)
                    records.append({
                        "symbol": sym,
                        "date": target_date,
                        "open": o_val,
                        "high": h_val,
                        "low": l_val,
                        "close": p_val,
                        "volume": vol,
                        "vol_50d_ma": 0
                    })

        if records:
            df = pd.DataFrame(records)
            print(f"Successfully retrieved {len(df)} {mode_name.lower()} bar records (Target Date: {target_date}).")
            return df
        return pd.DataFrame()

    def fetch_extended_or_intraday_bars(
        self,
        symbols: List[str],
        session_state: str = None,
        target_date: str = None,
        base_date: str = None
    ) -> pd.DataFrame:
        """Alias for fetch_premarket_or_intraday_bars to reflect pre and post market support."""
        return self.fetch_premarket_or_intraday_bars(
            symbols, session_state=session_state, target_date=target_date, base_date=base_date
        )

    def fetch_premarket_bars(self, symbols: List[str]) -> pd.DataFrame:
        """Maintains backwards-compatibility by delegating to fetch_premarket_or_intraday_bars."""
        return self.fetch_premarket_or_intraday_bars(symbols)
