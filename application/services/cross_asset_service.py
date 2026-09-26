import time
import threading
import logging
import copy
from typing import List, Dict, Any, Optional
import requests
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

DEFAULT_BASE_ASSETS: List[Dict[str, Any]] = [
    # 1. EQUITIES
    {"symbol": "SPY", "name": "S&P 500 ETF", "category": "EQUITIES", "price": 761.69, "change_pct": -0.12, "format": "price"},
    {"symbol": "QQQ", "name": "Nasdaq 100 ETF", "category": "EQUITIES", "price": 721.45, "change_pct": 0.63, "format": "price"},
    {"symbol": "IWM", "name": "Russell 2000 ETF", "category": "EQUITIES", "price": 284.10, "change_pct": -0.47, "format": "price"},
    {"symbol": "DIA", "name": "Dow Jones 30 ETF", "category": "EQUITIES", "price": 515.88, "change_pct": -0.48, "format": "price"},
    # 2. RATES
    {"symbol": "US10Y", "name": "10-Year Treasury Yield", "category": "RATES", "price": 5.00, "change_pct": 1.03, "format": "yield_pct"},
    {"symbol": "2S10S", "name": "10Y-2Y Yield Curve Spread", "category": "RATES", "price": "27bp", "change_pct": None, "format": "text"},
    {"symbol": "IEF", "name": "7-10 Year Treasury Bond ETF", "category": "RATES", "price": 90.80, "change_pct": -0.49, "format": "price"},
    # 3. CREDIT
    {"symbol": "HYG", "name": "High Yield Corporate Bond ETF", "category": "CREDIT", "price": 78.53, "change_pct": -0.24, "format": "price"},
    {"symbol": "HY OAS", "name": "High Yield Option-Adjusted Spread", "category": "CREDIT", "price": "270bp", "change_pct": None, "format": "text"},
    # 4. FX + COMM
    {"symbol": "DXY", "name": "US Dollar Index", "category": "FX + COMM", "price": 99.94, "change_pct": 0.01, "format": "index"},
    {"symbol": "WTI", "name": "WTI Crude Oil ($/bbl)", "category": "FX + COMM", "price": 93.79, "change_pct": -2.38, "format": "price"},
    {"symbol": "GOLD", "name": "Gold Spot / Futures ($/oz)", "category": "FX + COMM", "price": 4415.9, "change_pct": -0.20, "format": "price_comma"},
    {"symbol": "CU/AU", "name": "Copper / Gold Growth Ratio", "category": "FX + COMM", "price": 0.00149, "change_pct": -0.14, "format": "ratio_5dec"},
    # 5. VOLATILITY
    {"symbol": "VIX", "name": "CBOE Volatility Index", "category": "VOLATILITY", "price": 14.81, "change_pct": -4.08, "format": "index"},
    {"symbol": "MOVE", "name": "ICE BofA Bond Volatility Index", "category": "VOLATILITY", "price": 80.6, "change_pct": 5.80, "format": "index"},
    # 6. CRYPTO
    {"symbol": "BTC", "name": "Bitcoin ($)", "category": "CRYPTO", "price": 81359, "change_pct": 0.25, "format": "crypto_comma"},
    {"symbol": "ETH", "name": "Ethereum ($)", "category": "CRYPTO", "price": 2673, "change_pct": 1.07, "format": "crypto_comma"},
]

YF_TICKERS = [
    'SPY', 'QQQ', 'IWM', 'DIA',
    '^TNX', 'IEF',
    'HYG',
    'DX-Y.NYB', 'CL=F', 'GC=F', 'HG=F',
    '^VIX', '^MOVE',
    'BTC-USD', 'ETH-USD'
]

YF_MAP = {
    'SPY': 'SPY',
    'QQQ': 'QQQ',
    'IWM': 'IWM',
    'DIA': 'DIA',
    'US10Y': '^TNX',
    'IEF': 'IEF',
    'HYG': 'HYG',
    'DXY': 'DX-Y.NYB',
    'WTI': 'CL=F',
    'GOLD': 'GC=F',
    'VIX': '^VIX',
    'MOVE': '^MOVE',
    'BTC': 'BTC-USD',
    'ETH': 'ETH-USD'
}

FRED_HEADERS = {
    'User-Agent': 'curl/8.7.1'
}


class CrossAssetService:
    def __init__(self, cache_ttl_seconds: int = 300):
        self._cache_ttl = cache_ttl_seconds
        self._cache_data: Optional[List[Dict[str, Any]]] = None
        self._cache_timestamp: float = 0.0
        self._lock = threading.Lock()

    def clear_cache(self):
        """Invalidates the in-memory cross-asset cache."""
        with self._lock:
            self._cache_data = None
            self._cache_timestamp = 0.0

    def _fetch_fred_series(self, series_id: str) -> tuple[Optional[float], Optional[float]]:
        """Fetches the latest and previous values from FRED CSV endpoint."""
        url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
        try:
            resp = requests.get(url, headers=FRED_HEADERS, timeout=4)
            if resp.status_code == 200:
                lines = [line.strip() for line in resp.text.split('\n') if line.strip() and not line.strip().endswith('.')]
                if len(lines) >= 2:
                    last_val = float(lines[-1].split(',')[1])
                    prev_val = float(lines[-2].split(',')[1])
                    return last_val, prev_val
                elif len(lines) == 1:
                    last_val = float(lines[-1].split(',')[1])
                    return last_val, None
        except Exception as e:
            logger.warning(f"Error fetching FRED series {series_id}: {e}")
        return None, None

    def _fetch_live_quotes(self) -> Dict[str, Dict[str, Any]]:
        """Batch downloads latest quotes via Yahoo Finance and FRED."""
        results: Dict[str, Dict[str, Any]] = {}
        
        # 1. Fetch Yahoo Finance batch
        try:
            df = yf.download(YF_TICKERS, period='5d', progress=False, timeout=8)
            if df is not None and not df.empty:
                close_df = df['Close'] if 'Close' in df.columns else df
                for asset_sym, yf_sym in YF_MAP.items():
                    if yf_sym in close_df.columns:
                        series = close_df[yf_sym].dropna()
                        if len(series) >= 2:
                            c = float(series.iloc[-1])
                            p = float(series.iloc[-2])
                            pct = round(((c - p) / p) * 100, 2) if p > 0 else 0.0
                            results[asset_sym] = {"price": c, "change_pct": pct}
                        elif len(series) == 1:
                            c = float(series.iloc[-1])
                            results[asset_sym] = {"price": c, "change_pct": 0.0}

                # Calculate Copper / Gold ratio: HG=F / GC=F
                if 'HG=F' in close_df.columns and 'GC=F' in close_df.columns:
                    cu = close_df['HG=F'].dropna()
                    au = close_df['GC=F'].dropna()
                    if len(cu) >= 2 and len(au) >= 2:
                        ratio_curr = float(cu.iloc[-1] / au.iloc[-1]) if au.iloc[-1] > 0 else 0.0
                        ratio_prev = float(cu.iloc[-2] / au.iloc[-2]) if au.iloc[-2] > 0 else 0.0
                        ratio_pct = round(((ratio_curr - ratio_prev) / ratio_prev) * 100, 2) if ratio_prev > 0 else 0.0
                        results['CU/AU'] = {
                            "price": round(ratio_curr, 5),
                            "change_pct": ratio_pct
                        }
        except Exception as e:
            logger.warning(f"Error in Yahoo Finance cross-asset batch download: {e}")

        # 2. Fetch FRED series for 2S10S and HY OAS
        # 2a. High Yield Option-Adjusted Spread
        hy_last, hy_prev = self._fetch_fred_series('BAMLH0A0HYM2')
        if hy_last is not None:
            pct = round(((hy_last - hy_prev) / hy_prev) * 100, 2) if hy_prev and hy_prev > 0 else None
            results['HY OAS'] = {
                "price": f"{int(round(hy_last * 100))}bp",
                "change_pct": pct
            }

        # 2b. 10Y-2Y Yield Curve Spread
        spread_last, spread_prev = self._fetch_fred_series('T10Y2Y')
        if spread_last is not None:
            pct = round(((spread_last - spread_prev) / abs(spread_prev)) * 100, 2) if spread_prev and spread_prev != 0 else None
            results['2S10S'] = {
                "price": f"{int(round(spread_last * 100))}bp",
                "change_pct": pct
            }

        return results

    def get_cross_asset_data(
        self,
        conn=None,
        as_of_date: Optional[str] = None,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Returns dynamic cross-asset macro market instruments across Equities, Rates, Credit, FX/Comm, Volatility, and Crypto.
        Uses in-memory caching with TTL for live quotes, with robust fallback to DuckDB and static defaults.
        """
        # Historical as_of_date handling
        if as_of_date:
            return self._get_historical_cross_asset_data(conn=conn, as_of_date=as_of_date)

        now = time.time()
        with self._lock:
            if not force_refresh and self._cache_data is not None and (now - self._cache_timestamp < self._cache_ttl):
                return copy.deepcopy(self._cache_data)

        # Build fresh snapshot
        assets = copy.deepcopy(DEFAULT_BASE_ASSETS)
        live_quotes = {}
        try:
            live_quotes = self._fetch_live_quotes()
        except Exception as e:
            logger.warning(f"Error fetching live quotes: {e}")

        # Check DuckDB if any local benchmark tickers are newer or available
        db_prices = {}
        try:
            db_prices = self._query_duckdb_prices(conn=conn)
        except Exception as e:
            logger.warning(f"Error querying DuckDB prices: {e}")
        
        for item in assets:
            sym = item["symbol"]
            
            # Prioritize live quotes
            if sym in live_quotes:
                q = live_quotes[sym]
                item["price"] = q["price"]
                item["change_pct"] = q["change_pct"]
            elif sym in db_prices:
                db_data = db_prices[sym]
                item["price"] = db_data["price"]
                if db_data["change_pct"] is not None:
                    item["change_pct"] = db_data["change_pct"]

            # Formatting rounding
            if isinstance(item["price"], (int, float)):
                if item["format"] == "price":
                    item["price"] = round(item["price"], 2)
                elif item["format"] == "yield_pct":
                    item["price"] = round(item["price"], 2)
                elif item["format"] == "index":
                    item["price"] = round(item["price"], 2)
                elif item["format"] == "price_comma":
                    item["price"] = round(item["price"], 1)
                elif item["format"] == "crypto_comma":
                    item["price"] = round(item["price"], 0)
                elif item["format"] == "ratio_5dec":
                    item["price"] = round(item["price"], 5)

        # Update cache
        with self._lock:
            self._cache_data = copy.deepcopy(assets)
            self._cache_timestamp = now

        return assets

    def _query_duckdb_prices(self, conn=None, as_of_date: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
        """Queries local DuckDB daily_bars for benchmark ETF prices."""
        db_symbols = ['SPY', 'QQQ', 'IWM', 'DIA', 'HYG', 'IEF', 'TLT', 'GLD', 'USO', 'UUP']
        queried: Dict[str, Dict[str, Any]] = {}
        should_close = False
        try:
            if conn is None:
                from application.services.database import db_service
                conn = db_service.get_read_only_conn()
                should_close = True

            sym_tuple = "('" + "', '".join(db_symbols) + "')"
            date_filter = f"AND date <= '{as_of_date}'" if as_of_date else "AND date <= CURRENT_DATE"
            sql = f"""
                WITH recent AS (
                    SELECT 
                        symbol,
                        date,
                        close,
                        LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                    FROM daily_bars
                    WHERE symbol IN {sym_tuple} {date_filter}
                )
                SELECT symbol, close, prev_close
                FROM recent
                WHERE rn = 1
            """
            rows = conn.execute(sql).fetchall()
            for sym, close, prev in rows:
                pct = None
                if prev and prev > 0:
                    pct = round(((close - prev) / prev) * 100, 2)
                queried[sym] = {
                    "price": round(close, 2),
                    "change_pct": pct
                }
        except Exception as e:
            logger.warning(f"Error querying DuckDB for cross-asset symbols: {e}")
        finally:
            if should_close and conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

        return queried

    def _get_historical_cross_asset_data(self, conn=None, as_of_date: str = "") -> List[Dict[str, Any]]:
        """Returns cross-asset data for historical as-of dates."""
        assets = copy.deepcopy(DEFAULT_BASE_ASSETS)
        db_prices = self._query_duckdb_prices(conn=conn, as_of_date=as_of_date)
        for item in assets:
            sym = item["symbol"]
            if sym in db_prices:
                db_data = db_prices[sym]
                item["price"] = db_data["price"]
                if db_data["change_pct"] is not None:
                    item["change_pct"] = db_data["change_pct"]
        return assets


cross_asset_service = CrossAssetService()
