import datetime
import time
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import pandas as pd
import requests

from application.providers.base import AbstractDataProvider


def _latest_completed_quarter_end(ref_date: datetime.date) -> datetime.date:
    """Returns the calendar end date of the most recently completed quarter <= ref_date."""
    q_ends = [
        datetime.date(ref_date.year - 1, 12, 31),
        datetime.date(ref_date.year, 3, 31),
        datetime.date(ref_date.year, 6, 30),
        datetime.date(ref_date.year, 9, 30),
        datetime.date(ref_date.year, 12, 31),
    ]
    valid = [d for d in q_ends if d <= ref_date]
    return max(valid) if valid else ref_date


def _derive_fiscal_quarter(report_date: datetime.date) -> str:
    """
    Maps an earnings report date to its corresponding calendar fiscal quarter (YYYY-QN)
    using the standard 30-day reporting lag offset (e.g., Aug report -> Q2, Nov report -> Q3).
    """
    adjusted = report_date - datetime.timedelta(days=30)
    q_num = (adjusted.month - 1) // 3 + 1
    return f"{adjusted.year}-Q{q_num}"


def _clean_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        if pd.isna(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


class TradingViewScannerProvider(AbstractDataProvider):
    """
    Free, zero-API-key bulk fundamental scanner provider powered by TradingView's
    public America equity screener endpoint.

    Fetches Quarterly Diluted EPS, EPS YoY %, EPS Sequential QoQ %, TTM EPS YoY %,
    Quarterly Revenue, Sales YoY %, Sales Sequential QoQ %, TTM Sales YoY %,
    Float Shares, Market Cap, and Earnings Release Dates across the entire US stock
    universe in ~1 second.
    """

    SCAN_URL = "https://scanner.tradingview.com/america/scan"
    PAGE_SIZE = 3500
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://www.tradingview.com",
        "Referer": "https://www.tradingview.com/",
    }

    COLUMNS = [
        "name",                                     # 0: symbol
        "exchange",                                 # 1: NYSE / NASDAQ / AMEX
        "earnings_per_share_fq",                    # 2: latest quarterly diluted EPS
        "earnings_per_share_diluted_yoy_growth_fq", # 3: quarterly EPS YoY growth %
        "earnings_per_share_diluted_qoq_growth_fq", # 4: sequential EPS QoQ growth %
        "earnings_per_share_diluted_yoy_growth_ttm",# 5: TTM EPS YoY growth %
        "total_revenue_fq",                         # 6: latest quarterly total revenue ($)
        "total_revenue_yoy_growth_fq",              # 7: quarterly Sales/Revenue YoY growth %
        "total_revenue_qoq_growth_fq",              # 8: sequential Sales/Revenue QoQ growth %
        "total_revenue_yoy_growth_ttm",             # 9: TTM Sales/Revenue YoY growth %
        "float_shares_outstanding",                 # 10: public float shares
        "market_cap_basic",                         # 11: market capitalization ($)
        "earnings_release_date",                    # 12: last earnings release epoch (sec)
        "earnings_release_next_date",               # 13: upcoming earnings release epoch (sec)
    ]

    def connect(self) -> None:
        pass

    def disconnect(self) -> None:
        pass

    def fetch_universe(self) -> List[Dict[str, Any]]:
        return []

    def fetch_daily_bars(self, symbols: List[str], start_date: str) -> pd.DataFrame:
        return pd.DataFrame()

    def _post_scan_page(self, start: int, end: int) -> Tuple[int, List[Dict[str, Any]]]:
        payload = {
            "filter": [
                {"left": "type", "operation": "equal", "right": "stock"},
                {"left": "exchange", "operation": "in_range", "right": ["NYSE", "NASDAQ", "AMEX"]},
            ],
            "options": {"lang": "en"},
            "markets": ["america"],
            "symbols": {"query": {"types": []}, "tickers": []},
            "columns": self.COLUMNS,
            "sort": {"sortBy": "market_cap_basic", "sortOrder": "desc"},
            "range": [start, end],
        }

        last_err = None
        for attempt in range(3):
            try:
                resp = requests.post(self.SCAN_URL, headers=self.HEADERS, json=payload, timeout=15)
                resp.raise_for_status()
                body = resp.json()
                total_count = int(body.get("totalCount") or 0)
                rows = body.get("data") or []
                return total_count, rows
            except Exception as e:
                last_err = e
                if attempt < 2:
                    time.sleep(0.5 * (attempt + 1))
        raise RuntimeError(f"TradingView Scanner request failed after retries: {last_err}")

    def fetch_bulk_fundamentals(
        self,
        target_symbols: Optional[List[str]] = None,
        as_of_date: Optional[datetime.date] = None,
    ) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        Bulk-fetches quarterly EPS/Sales growth metrics and symbol share-supply metadata
        across all US exchange-listed equities.

        Returns:
            (fundamentals_df, symbol_meta_updates)
            - fundamentals_df: DataFrame ready for DatabaseManager.upsert_quarterly_fundamentals()
            - symbol_meta_updates: List of dicts with {symbol, float_shares, market_cap, next_earnings_date}
        """
        et_tz = ZoneInfo("America/New_York")
        today_et = as_of_date or datetime.datetime.now(et_tz).date()
        fallback_report_date = _latest_completed_quarter_end(today_et)

        target_set = (
            {s.strip().upper() for s in target_symbols if s and s.strip()}
            if target_symbols is not None
            else None
        )

        all_rows: List[Dict[str, Any]] = []
        offset = 0
        total_count = None

        while True:
            page_total, rows = self._post_scan_page(offset, offset + self.PAGE_SIZE)
            if total_count is None:
                total_count = page_total
            if not rows:
                break
            all_rows.extend(rows)
            offset += len(rows)
            if offset >= total_count or len(rows) < self.PAGE_SIZE:
                break

        fund_records_by_key: Dict[Tuple[str, str], Dict[str, Any]] = {}
        meta_by_symbol: Dict[str, Dict[str, Any]] = {}

        for item in all_rows:
            d = item.get("d")
            if not d or len(d) < len(self.COLUMNS):
                continue

            raw_sym = str(d[0] or "").strip().upper()
            if not raw_sym:
                continue
            # Normalize class tickers like BRK.B -> BRK-B if needed, though PivotTrader uses alpha symbols
            sym = raw_sym.replace("/", "-")
            if target_set is not None and sym not in target_set:
                continue

            eps_fq = _clean_float(d[2])
            eps_yoy = _clean_float(d[3])
            eps_seq_qoq = _clean_float(d[4])
            eps_ttm_yoy = _clean_float(d[5])
            rev_fq = _clean_float(d[6])
            sales_yoy = _clean_float(d[7])
            sales_seq_qoq = _clean_float(d[8])
            sales_ttm_yoy = _clean_float(d[9])
            float_shares = _clean_float(d[10])
            market_cap = _clean_float(d[11])
            er_ts = d[12]
            next_er_ts = d[13]

            # Parse past earnings release date in US Eastern Time; clamp <= today_et (zero lookahead bias)
            if er_ts is not None:
                try:
                    er_dt = datetime.datetime.fromtimestamp(float(er_ts), tz=et_tz).date()
                    report_date = min(er_dt, today_et)
                except Exception:
                    report_date = fallback_report_date
            else:
                report_date = fallback_report_date

            next_er_str: Optional[str] = None
            if next_er_ts is not None:
                try:
                    next_dt = datetime.datetime.fromtimestamp(float(next_er_ts), tz=et_tz).date()
                    if next_dt >= today_et:
                        next_er_str = next_dt.strftime("%Y-%m-%d")
                except Exception:
                    next_er_str = None

            if float_shares is not None or market_cap is not None or next_er_str is not None:
                if sym not in meta_by_symbol:
                    meta_by_symbol[sym] = {
                        "symbol": sym,
                        "float_shares": float_shares if (float_shares and float_shares > 0) else None,
                        "market_cap": market_cap if (market_cap and market_cap > 0) else None,
                        "next_earnings_date": next_er_str,
                    }

            has_any_fund = any(
                v is not None for v in (eps_fq, eps_yoy, rev_fq, sales_yoy, eps_ttm_yoy, sales_ttm_yoy)
            )
            if not has_any_fund:
                continue

            fiscal_q = _derive_fiscal_quarter(report_date)
            key = (sym, fiscal_q)
            if key not in fund_records_by_key:
                fund_records_by_key[key] = {
                    "symbol": sym,
                    "report_date": report_date,
                    "fiscal_quarter": fiscal_q,
                    "eps_diluted": eps_fq,
                    "eps_qoq_growth": eps_yoy,
                    "total_revenue": rev_fq,
                    "sales_yoy_growth": sales_yoy,
                    "eps_seq_qoq_growth": eps_seq_qoq,
                    "sales_seq_qoq_growth": sales_seq_qoq,
                    "eps_ttm_yoy_growth": eps_ttm_yoy,
                    "sales_ttm_yoy_growth": sales_ttm_yoy,
                }

        fund_df = pd.DataFrame(list(fund_records_by_key.values())) if fund_records_by_key else pd.DataFrame()
        return fund_df, list(meta_by_symbol.values())

    def fetch_quarterly_fundamentals(self, symbols: List[str]) -> pd.DataFrame:
        fund_df, _ = self.fetch_bulk_fundamentals(target_symbols=symbols)
        return fund_df

