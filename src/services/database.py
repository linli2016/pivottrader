import os
import duckdb
import pandas as pd
from typing import Dict, Any, List
from .config import config_service

class DatabaseService:
    def __init__(self, config_service):
        self.config_service = config_service

    def get_db_path(self) -> str:
        config = self.config_service.load_config_raw()
        return config.get("database", {}).get("db_path", "data.db")

    def get_read_only_conn(self):
        """Establishes a thread-safe read-only connection to DuckDB."""
        db_path = self.get_db_path()
        if not os.path.exists(db_path):
            # Create it if it doesn't exist, to avoid connection failure
            conn = duckdb.connect(db_path)
            conn.close()
        return duckdb.connect(db_path, read_only=True)

    def get_summary(self) -> Dict[str, Any]:
        with self.get_read_only_conn() as conn:
            # Check if tables exist
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            
            summary = {
                "symbols_count": 0,
                "daily_bars_count": 0,
                "fundamentals_count": 0,
                "last_price_date": "N/A"
            }
            
            if "symbols" in table_names:
                summary["symbols_count"] = conn.execute("SELECT count(*) FROM symbols").fetchone()[0]
            if "daily_bars" in table_names:
                summary["daily_bars_count"] = conn.execute("SELECT count(*) FROM daily_bars").fetchone()[0]
                latest_date = conn.execute("SELECT max(date) FROM daily_bars").fetchone()[0]
                summary["last_price_date"] = latest_date.strftime("%Y-%m-%d") if latest_date else "N/A"
            if "quarterly_fundamentals" in table_names:
                summary["fundamentals_count"] = conn.execute("SELECT count(*) FROM quarterly_fundamentals").fetchone()[0]
                
            return summary

    def get_candidates(self) -> List[Dict[str, Any]]:
        query = """
            WITH latest_date_const AS (
                SELECT MAX(date) as val FROM daily_bars
            ),
            latest_fundamentals AS (
                SELECT 
                    symbol,
                    report_date,
                    fiscal_quarter,
                    eps_diluted,
                    eps_qoq_growth,
                    total_revenue,
                    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY fiscal_quarter DESC) as rn
                FROM quarterly_fundamentals
            ),
            ranked_bars AS (
                SELECT 
                    symbol, close, volume, vol_50d_ma, rs_score, rs_rank, atr_20d, pp_runup_pct, pp_drawdown_pct, pp_days_since_peak, sma_50, sma_150, sma_200, vcp_is_setup, vcp_troughs, vcp_depths, ipo_days_count, ipo_all_time_high, ipo_drawdown_from_high, ipo_base_depth, darvas_is_setup, darvas_box_top, darvas_box_bottom, darvas_box_width_pct, ret_1m, ema_10, ema_20, dist_ema10_pct, dist_ema20_pct, gap_pct, rel_vol_50d, ep_is_setup, ep_gap_pct, ep_rel_vol, parabolic_short_is_setup, parabolic_long_is_setup, parabolic_runup_pct,
                    (rs_rank >= COALESCE(
                        (
                            SELECT MAX(d.rs_rank) 
                            FROM daily_bars d 
                            WHERE d.symbol = db.symbol 
                              AND d.date < db.date 
                              AND d.date >= db.date - INTERVAL 252 DAY
                        ), 0
                    )) as rs_rank_is_new_high,
                    (SELECT MAX(d.high) FROM daily_bars d WHERE d.symbol = db.symbol AND d.date <= db.date AND d.date >= db.date - INTERVAL 252 DAY) as high_52w,
                    ROUND((( (SELECT MAX(d.high) FROM daily_bars d WHERE d.symbol = db.symbol AND d.date <= db.date AND d.date >= db.date - INTERVAL 252 DAY) - db.close) / NULLIF((SELECT MAX(d.high) FROM daily_bars d WHERE d.symbol = db.symbol AND d.date <= db.date AND d.date >= db.date - INTERVAL 252 DAY), 0)) * 100.0, 2) as dist_from_52w_high,
                    ROUND(((db.close - (SELECT MIN(d.low) FROM daily_bars d WHERE d.symbol = db.symbol AND d.date <= db.date AND d.date >= db.date - INTERVAL 60 DAY)) / NULLIF((SELECT MIN(d.low) FROM daily_bars d WHERE d.symbol = db.symbol AND d.date <= db.date AND d.date >= db.date - INTERVAL 60 DAY), 0)) * 100.0, 2) as surge_off_low_pct,
                    (db.high >= COALESCE((SELECT MAX(d.high) FROM daily_bars d WHERE d.symbol = db.symbol AND d.date < db.date AND d.date >= db.date - INTERVAL 252 DAY), 0)) as is_52w_high
                FROM daily_bars db
                WHERE date = (SELECT val FROM latest_date_const)
            )
            SELECT 
                r.symbol,
                r.close,
                r.vol_50d_ma,
                r.rs_score,
                r.rs_rank,
                f.report_date,
                f.fiscal_quarter,
                f.eps_diluted,
                f.eps_qoq_growth,
                f.total_revenue,
                s.exchange,
                r.atr_20d,
                r.pp_runup_pct,
                r.pp_drawdown_pct,
                r.pp_days_since_peak,
                r.volume,
                r.sma_50,
                r.sma_150,
                r.sma_200,
                r.vcp_is_setup,
                r.vcp_troughs,
                r.vcp_depths,
                r.ipo_days_count,
                r.ipo_all_time_high,
                r.ipo_drawdown_from_high,
                r.ipo_base_depth,
                r.darvas_is_setup,
                r.darvas_box_top,
                r.darvas_box_bottom,
                r.darvas_box_width_pct,
                r.rs_rank_is_new_high,
                r.high_52w,
                r.dist_from_52w_high,
                r.surge_off_low_pct,
                r.is_52w_high,
                r.ret_1m,
                r.ema_10,
                r.ema_20,
                r.dist_ema10_pct,
                r.dist_ema20_pct,
                r.gap_pct,
                r.rel_vol_50d,
                r.ep_is_setup,
                r.ep_gap_pct,
                r.ep_rel_vol,
                r.parabolic_short_is_setup,
                r.parabolic_long_is_setup,
                r.parabolic_runup_pct,
                s.sector,
                s.industry,
                s.name
            FROM ranked_bars r
            LEFT JOIN latest_fundamentals f ON r.symbol = f.symbol AND f.rn = 1
            JOIN symbols s ON r.symbol = s.symbol
            WHERE r.rs_score IS NOT NULL
            ORDER BY r.rs_rank DESC;
        """
        
        with self.get_read_only_conn() as conn:
            # Check if tables exist
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            if "daily_bars" not in table_names:
                return []

            # Calculate sector ranks from Sector ETFs
            sector_etf_map = {
                'XLK': 'Technology',
                'XLE': 'Energy',
                'XLV': 'Health Care',
                'XLI': 'Industrials',
                'XLB': 'Basic Materials',
                'XLF': 'Finance',
                'XLRE': 'Real Estate',
                'XLP': 'Consumer Staples',
                'XLY': 'Consumer Discretionary',
                'XLU': 'Utilities',
                'XLC': 'Telecommunications'
            }
            
            sector_ranks = {}
            try:
                etf_rows = conn.execute("""
                    WITH etf_bars AS (
                        SELECT d.symbol, d.rs_rank,
                               ROW_NUMBER() OVER (PARTITION BY d.symbol ORDER BY d.date DESC) as rn
                        FROM daily_bars d
                        WHERE d.symbol IN ('XLK', 'XLF', 'XLV', 'XLY', 'XLP', 'XLE', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC')
                    )
                    SELECT symbol, rs_rank FROM etf_bars WHERE rn = 1 ORDER BY rs_rank DESC
                """).fetchall()
                for rank_idx, (etf_sym, etf_rs) in enumerate(etf_rows, 1):
                    sec_name = sector_etf_map.get(etf_sym)
                    if sec_name:
                        sector_ranks[sec_name] = rank_idx
                        if sec_name == 'Finance':
                            sector_ranks['Financials'] = rank_idx
                        elif sec_name == 'Telecommunications':
                            sector_ranks['Communication Services'] = rank_idx
            except Exception as e:
                print(f"Error calculating sector ranks: {e}")

            res = conn.execute(query).fetchall()
            
            candidates = []
            for row in res:
                sec_val = row[48]
                sec_rank = sector_ranks.get(sec_val) if sec_val else None
                candidates.append({
                    "symbol": row[0],
                    "name": row[50],
                    "close": row[1],
                    "vol_50d_ma": row[2],
                    "rs_score": row[3],
                    "rs_rank": row[4],
                    "report_date": row[5].strftime("%Y-%m-%d") if row[5] else None,
                    "fiscal_quarter": row[6],
                    "eps_diluted": row[7],
                    "eps_qoq_growth": row[8],
                    "total_revenue": row[9],
                    "exchange": row[10],
                    "adr_20d": row[11],
                    "atr_20d": row[11],
                    "pp_runup_pct": row[12],
                    "pp_drawdown_pct": row[13],
                    "pp_days_since_peak": row[14],
                    "volume": row[15],
                    "sma_50": row[16],
                    "sma_150": row[17],
                    "sma_200": row[18],
                    "vcp_is_setup": bool(row[19]) if row[19] is not None else False,
                    "vcp_troughs": row[20],
                    "vcp_depths": row[21],
                    "ipo_days_count": row[22],
                    "ipo_all_time_high": row[23],
                    "ipo_drawdown_from_high": row[24],
                    "ipo_base_depth": row[25],
                    "darvas_is_setup": bool(row[26]) if row[26] is not None else False,
                    "darvas_box_top": row[27],
                    "darvas_box_bottom": row[28],
                    "darvas_box_width_pct": row[29],
                    "rs_rank_is_new_high": bool(row[30]) if row[30] is not None else False,
                    "high_52w": row[31],
                    "dist_from_52w_high": row[32],
                    "surge_off_low_pct": row[33],
                    "is_52w_high": bool(row[34]) if row[34] is not None else False,
                    "ret_1m": row[35],
                    "ema_10": row[36],
                    "ema_20": row[37],
                    "dist_ema10_pct": row[38],
                    "dist_ema20_pct": row[39],
                    "gap_pct": row[40],
                    "rel_vol_50d": row[41],
                    "ep_is_setup": bool(row[42]) if row[42] is not None else False,
                    "ep_gap_pct": row[43],
                    "ep_rel_vol": row[44],
                    "parabolic_short_is_setup": bool(row[45]) if row[45] is not None else False,
                    "parabolic_long_is_setup": bool(row[46]) if row[46] is not None else False,
                    "parabolic_runup_pct": row[47],
                    "sector": sec_val,
                    "sector_rank": sec_rank,
                    "industry": row[49]
                })
            return candidates

    def get_stock_detail(self, symbol: str) -> Dict[str, Any]:
        symbol = symbol.upper()
        with self.get_read_only_conn() as conn:
            # Metadata
            meta = conn.execute("SELECT * FROM symbols WHERE symbol = ?", [symbol]).fetchone()
            if not meta:
                return {}
                
            meta_dict = {
                "symbol": meta[0],
                "exchange": meta[1],
                "name": meta[2],
                "asset_type": meta[3],
                "active": meta[4]
            }
            
            # Fundamentals
            funds = conn.execute("""
                SELECT report_date, fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue
                FROM quarterly_fundamentals 
                WHERE symbol = ?
                ORDER BY fiscal_quarter DESC
            """, [symbol]).fetchall()
            
            fund_list = []
            for row in funds:
                fund_list.append({
                    "report_date": row[0].strftime("%Y-%m-%d") if row[0] else None,
                    "fiscal_quarter": row[1],
                    "eps_diluted": row[2],
                    "eps_qoq_growth": row[3],
                    "total_revenue": row[4]
                })
                
            # Get latest RS and ATR metrics
            latest_bar = conn.execute("""
                SELECT rs_score, rs_rank, atr_20d
                FROM daily_bars
                WHERE symbol = ? AND date = (SELECT MAX(date) FROM daily_bars)
            """, [symbol]).fetchone()
            
            rs_score = latest_bar[0] if latest_bar else None
            rs_rank = latest_bar[1] if latest_bar else None
            atr_20d = latest_bar[2] if latest_bar else None
                 
            return {
                "metadata": meta_dict,
                "fundamentals": fund_list,
                "rs_score": rs_score,
                "rs_rank": rs_rank,
                "adr_20d": atr_20d,
                "atr_20d": atr_20d
            }

    def get_stock_prices(self, symbol: str, limit: int = 252) -> List[Dict[str, Any]]:
        symbol = symbol.upper()
        with self.get_read_only_conn() as conn:
            bars = conn.execute("""
                SELECT date, open, high, low, close, volume, sma_50, sma_150, sma_200, rs_rank
                FROM daily_bars
                WHERE symbol = ?
                ORDER BY date ASC
            """, [symbol]).fetchall()
            
            # limit output bars
            if len(bars) > limit:
                bars = bars[-limit:]
                
            bars_list = []
            for row in bars:
                bars_list.append({
                    "time": row[0].strftime("%Y-%m-%d") if row[0] else None,
                    "open": row[1],
                    "high": row[2],
                    "low": row[3],
                    "close": row[4],
                    "volume": row[5],
                    "sma_50": row[6],
                    "sma_150": row[7],
                    "sma_200": row[8],
                    "rs_rank": row[9]
                })
            return bars_list

    def get_stock_financials(self, symbol: str) -> Dict[str, Any]:
        symbol = symbol.upper()
        # Verify symbol exists
        with self.get_read_only_conn() as conn:
            meta = conn.execute("SELECT name FROM symbols WHERE symbol = ?", [symbol]).fetchone()
            if not meta:
                return {}
        
        import yfinance as yf
        import pandas as pd

        try:
            ticker = yf.Ticker(symbol)
            # Fetch annual financials (fall back to financials if income_stmt is empty)
            ann_stmt = ticker.income_stmt
            if ann_stmt is None or ann_stmt.empty:
                ann_stmt = ticker.financials
            # Fetch quarterly financials (fall back to quarterly_financials)
            qtr_stmt = ticker.quarterly_income_stmt
            if qtr_stmt is None or qtr_stmt.empty:
                qtr_stmt = ticker.quarterly_financials
        except Exception:
            ann_stmt = None
            qtr_stmt = None

        # Row extraction helper
        def get_row(df, keys):
            if df is None or df.empty:
                return pd.Series(dtype=float)
            for k in keys:
                if k in df.index:
                    return df.loc[k]
            return pd.Series(index=df.columns, dtype=float)

        # 1. Process annual financials
        yearly_data = []
        if ann_stmt is not None and not ann_stmt.empty:
            eps_ann = get_row(ann_stmt, ['Diluted EPS', 'Basic EPS'])
            rev_ann = get_row(ann_stmt, ['Total Revenue', 'Operating Revenue'])
            years = sorted(list(ann_stmt.columns))
            
            for y in years:
                val_eps = eps_ann.get(y)
                val_rev = rev_ann.get(y)
                
                # Check for nan/pandas Series structures
                val_eps = float(val_eps) if val_eps is not None and not pd.isna(val_eps) else None
                val_rev = float(val_rev) if val_rev is not None and not pd.isna(val_rev) else None
                
                # YoY Change
                prev_y = next((x for x in years if x.year == y.year - 1), None)
                eps_chg = None
                if prev_y is not None:
                    val_eps_prev = eps_ann.get(prev_y)
                    if val_eps_prev is not None and not pd.isna(val_eps_prev) and val_eps_prev != 0 and val_eps is not None:
                        eps_chg = float(((val_eps - val_eps_prev) / abs(val_eps_prev)) * 100)
                        
                rev_chg = None
                if prev_y is not None:
                    val_rev_prev = rev_ann.get(prev_y)
                    if val_rev_prev is not None and not pd.isna(val_rev_prev) and val_rev_prev != 0 and val_rev is not None:
                        rev_chg = float(((val_rev - val_rev_prev) / val_rev_prev) * 100)
                        
                yearly_data.append({
                    "year": y.year,
                    "eps": val_eps,
                    "eps_pct_change": eps_chg,
                    "sales": val_rev / 1e6 if val_rev else None,  # in millions
                    "sales_pct_change": rev_chg
                })

        # 2. Process quarterly financials
        quarterly_data = []
        if qtr_stmt is not None and not qtr_stmt.empty:
            eps_qtr = get_row(qtr_stmt, ['Diluted EPS', 'Basic EPS'])
            rev_qtr = get_row(qtr_stmt, ['Total Revenue', 'Operating Revenue'])
            net_qtr = get_row(qtr_stmt, ['Net Income', 'Net Income Common Stockholders'])
            dates = sorted(list(qtr_stmt.columns))
            
            for d in dates:
                val_eps = eps_qtr.get(d)
                val_rev = rev_qtr.get(d)
                val_net = net_qtr.get(d)
                
                val_eps = float(val_eps) if val_eps is not None and not pd.isna(val_eps) else None
                val_rev = float(val_rev) if val_rev is not None and not pd.isna(val_rev) else None
                val_net = float(val_net) if val_net is not None and not pd.isna(val_net) else None
                
                # YoY Change (Prior year same quarter)
                prior_d = next((x for x in dates if x.year == d.year - 1 and abs(x.month - d.month) <= 1), None)
                eps_chg = None
                if prior_d is not None:
                    val_eps_prev = eps_qtr.get(prior_d)
                    if val_eps_prev is not None and not pd.isna(val_eps_prev) and val_eps_prev != 0 and val_eps is not None:
                        eps_chg = float(((val_eps - val_eps_prev) / abs(val_eps_prev)) * 100)
                        
                rev_chg = None
                if prior_d is not None:
                    val_rev_prev = rev_qtr.get(prior_d)
                    if val_rev_prev is not None and not pd.isna(val_rev_prev) and val_rev_prev != 0 and val_rev is not None:
                        rev_chg = float(((val_rev - val_rev_prev) / val_rev_prev) * 100)
                        
                net_margin = None
                if val_rev and val_net:
                    net_margin = float((val_net / val_rev) * 100)
                    
                q_num = ((d.month - 1) // 3) + 1
                quarterly_data.append({
                    "date": d.strftime("%Y-%m-%d"),
                    "quarter_str": f"Q{q_num} {d.year}",
                    "eps": val_eps,
                    "eps_pct_change": eps_chg,
                    "sales": val_rev / 1e6 if val_rev else None,
                    "sales_pct_change": rev_chg,
                    "net_margin": net_margin
                })
                
        # If yfinance quarterly is empty/partial, merge with database historical records
        with self.get_read_only_conn() as conn:
            db_funds = conn.execute("""
                SELECT fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue
                FROM quarterly_fundamentals
                WHERE symbol = ?
                ORDER BY fiscal_quarter DESC
            """, [symbol]).fetchall()
            
        existing_quarters = {q["quarter_str"]: q for q in quarterly_data}
        
        for row in db_funds:
            fq = row[0]
            parts = fq.split("-Q")
            if len(parts) != 2:
                continue
            yr, q_num = parts[0], parts[1]
            q_str = f"Q{q_num} {yr}"
            
            if q_str not in existing_quarters:
                eps_val = float(row[1]) if row[1] is not None else None
                eps_chg = float(row[2]) if row[2] is not None else None
                rev_val = float(row[3]) / 1e6 if row[3] is not None else None
                
                quarterly_data.append({
                    "date": f"{yr}-{(int(q_num)-1)*3+1:02d}-01",
                    "quarter_str": q_str,
                    "eps": eps_val,
                    "eps_pct_change": eps_chg,
                    "sales": rev_val,
                    "sales_pct_change": None,
                    "net_margin": None
                })
                
        quarterly_data = sorted(quarterly_data, key=lambda x: x["date"], reverse=True)
        quarterly_data = quarterly_data[:8]
        quarterly_data = list(reversed(quarterly_data))
        
        return {
            "symbol": symbol,
            "name": meta[0],
            "yearly_financials": sorted(yearly_data, key=lambda x: x["year"]),
            "quarterly_financials": quarterly_data
        }

    def execute_sql_query(self, query: str) -> Dict[str, Any]:
        query = query.strip()
        try:
            with self.get_read_only_conn() as conn:
                cursor = conn.execute(query)
                
                # Fetch headers
                if cursor.description:
                    columns = [col[0] for col in cursor.description]
                else:
                    columns = ["Status"]
                    
                rows = cursor.fetchall()
                
                # Format row values to be JSON-serializable
                formatted_rows = []
                for row in rows:
                    formatted_row = []
                    for val in row:
                        if val is None:
                            formatted_row.append(None)
                        elif isinstance(val, (int, float, str, bool)):
                            formatted_row.append(val)
                        else:
                            # Convert date, datetime, bytearrays, etc. to strings
                            formatted_row.append(str(val))
                    formatted_rows.append(formatted_row)
                    
                return {
                    "columns": columns,
                    "rows": formatted_rows,
                    "count": len(formatted_rows)
                }
        except Exception as e:
            return {
                "error": str(e),
                "columns": ["Error"],
                "rows": [[str(e)]],
                "count": 0
            }

    def get_market_monitor(self, limit: int = 252) -> Dict[str, Any]:
        """Calculates Stockbee Market Monitor metrics across the entire market universe."""
        query = """
            WITH daily_gains AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                    LAG(close, 20) OVER (PARTITION BY symbol ORDER BY date) as close_20d_ago,
                    LAG(close, 65) OVER (PARTITION BY symbol ORDER BY date) as close_65d_ago
                FROM daily_bars
            ),
            daily_counts AS (
                SELECT 
                    date,
                    COUNT(CASE WHEN prev_close > 0 AND ((close - prev_close)/prev_close)*100 >= 4.0 THEN 1 END) as gainers_4pct,
                    COUNT(CASE WHEN prev_close > 0 AND ((close - prev_close)/prev_close)*100 <= -4.0 THEN 1 END) as losers_4pct,
                    COUNT(CASE WHEN close_20d_ago > 0 AND ((close - close_20d_ago)/close_20d_ago)*100 >= 25.0 THEN 1 END) as up_25pct_1m,
                    COUNT(CASE WHEN close_20d_ago > 0 AND ((close - close_20d_ago)/close_20d_ago)*100 <= -25.0 THEN 1 END) as down_25pct_1m,
                    COUNT(CASE WHEN close_65d_ago > 0 AND ((close - close_65d_ago)/close_65d_ago)*100 >= 25.0 THEN 1 END) as up_25pct_3m,
                    COUNT(CASE WHEN close_65d_ago > 0 AND ((close - close_65d_ago)/close_65d_ago)*100 <= -25.0 THEN 1 END) as down_25pct_3m,
                    COUNT(CASE WHEN close_20d_ago > 0 AND ((close - close_20d_ago)/close_20d_ago)*100 >= 50.0 THEN 1 END) as up_50pct_1m,
                    COUNT(CASE WHEN close_65d_ago > 0 AND ((close - close_65d_ago)/close_65d_ago)*100 >= 50.0 THEN 1 END) as up_50pct_3m,
                    COUNT(CASE WHEN close_65d_ago > 0 AND ((close - close_65d_ago)/close_65d_ago)*100 <= -50.0 THEN 1 END) as down_50pct_3m
                FROM daily_gains
                GROUP BY date
                ORDER BY date ASC
            )
            SELECT * FROM daily_counts;
        """
        try:
            with self.get_read_only_conn() as conn:
                df = conn.execute(query).df()
                
            if df.empty:
                return {"summary": {}, "daily_data": []}

            # Convert date column to string YYYY-MM-DD
            df['date_str'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

            # Calculate 13-day EMA of 4% UP and 4% DOWN
            df['ema_13_up'] = df['gainers_4pct'].ewm(span=13, adjust=False).mean().round(1)
            df['ema_13_down'] = df['losers_4pct'].ewm(span=13, adjust=False).mean().round(1)
            df['net_4pct'] = df['gainers_4pct'] - df['losers_4pct']
            df['ratio_4pct'] = (df['gainers_4pct'] / df['losers_4pct'].replace(0, 1)).round(2)

            # Sort descending for response (latest date first)
            df_desc = df.sort_values(by='date', ascending=False)
            
            # Filter limit
            if limit and limit > 0:
                df_desc = df_desc.head(limit)

            daily_list = []
            for _, row in df_desc.iterrows():
                daily_list.append({
                    "date": str(row['date_str']),
                    "gainers_4pct": int(row['gainers_4pct']),
                    "losers_4pct": int(row['losers_4pct']),
                    "net_4pct": int(row['net_4pct']),
                    "ratio_4pct": float(row['ratio_4pct']),
                    "up_25pct_1m": int(row['up_25pct_1m']),
                    "down_25pct_1m": int(row['down_25pct_1m']),
                    "up_25pct_3m": int(row['up_25pct_3m']),
                    "down_25pct_3m": int(row['down_25pct_3m']),
                    "up_50pct_1m": int(row['up_50pct_1m']),
                    "up_50pct_3m": int(row['up_50pct_3m']),
                    "down_50pct_3m": int(row['down_50pct_3m']),
                    "ema_13_up": float(row['ema_13_up']),
                    "ema_13_down": float(row['ema_13_down'])
                })

            # Calculate overall Regime Status & Metrics
            latest = daily_list[0] if daily_list else {}
            last_5 = daily_list[:5]
            sum_5d_net = sum(r["net_4pct"] for r in last_5) if last_5 else 0

            regime = "Neutral / Transition"
            if latest.get("gainers_4pct", 0) >= 2 * max(latest.get("losers_4pct", 1), 1) and latest.get("gainers_4pct", 0) > 300:
                regime = "Bullish Thrust / Expansion"
            elif latest.get("up_25pct_1m", 0) > latest.get("down_25pct_1m", 0) * 1.5:
                regime = "Bullish Expansion"
            elif latest.get("losers_4pct", 0) >= 2 * max(latest.get("gainers_4pct", 1), 1) and latest.get("losers_4pct", 0) > 300:
                regime = "Bearish Distribution / Contraction"
            elif latest.get("down_25pct_1m", 0) > latest.get("up_25pct_1m", 0) * 1.5:
                regime = "Bearish Contraction"

            # Query latest benchmark prices for SPY and QQQ
            benchmarks = {
                "SPY": {"close": 0, "change_pct": 0},
                "QQQ": {"close": 0, "change_pct": 0}
            }
            try:
                bm_query = """
                    WITH bm_bars AS (
                        SELECT 
                            symbol,
                            date,
                            close,
                            LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                            ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                        FROM daily_bars
                        WHERE symbol IN ('SPY', 'QQQ')
                    )
                    SELECT symbol, close, prev_close
                    FROM bm_bars
                    WHERE rn = 1
                """
                with self.get_read_only_conn() as conn:
                    bm_rows = conn.execute(bm_query).fetchall()
                    for b_sym, b_close, b_prev in bm_rows:
                        pct = 0.0
                        if b_prev and b_prev > 0:
                            pct = round(((b_close - b_prev) / b_prev) * 100, 2)
                        benchmarks[b_sym] = {
                            "close": round(b_close, 2),
                            "change_pct": pct
                        }
            except Exception as e:
                print(f"Error querying benchmark ETF stats: {e}")

            summary = {
                "latest_date": latest.get("date"),
                "latest_gainers_4pct": latest.get("gainers_4pct"),
                "latest_losers_4pct": latest.get("losers_4pct"),
                "latest_ratio_4pct": latest.get("ratio_4pct"),
                "sum_5d_net_4pct": sum_5d_net,
                "latest_up_25pct_1m": latest.get("up_25pct_1m"),
                "latest_down_25pct_1m": latest.get("down_25pct_1m"),
                "latest_up_25pct_3m": latest.get("up_25pct_3m"),
                "latest_down_25pct_3m": latest.get("down_25pct_3m"),
                "regime": regime,
                "benchmarks": benchmarks
            }

            return {"summary": summary, "daily_data": daily_list}
        except Exception as e:
            return {"error": str(e), "summary": {}, "daily_data": []}

    def get_sector_etf_performance(self) -> List[Dict[str, Any]]:
        """Calculates performance, RS Score, RS Rank, and RS Rank Changes for primary Sector ETFs."""
        etf_symbols = ['XLK', 'XLF', 'XLV', 'XLY', 'XLP', 'XLE', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC', 'SPY', 'QQQ']
        symbols_str = ', '.join(f"'{s}'" for s in etf_symbols)

        query = f"""
            WITH etf_bars AS (
                SELECT 
                    d.symbol,
                    d.date,
                    d.close,
                    d.rs_score,
                    d.rs_rank,
                    s.name,
                    s.sector,
                    s.industry,
                    ROW_NUMBER() OVER (PARTITION BY d.symbol ORDER BY d.date DESC) as rn_desc
                FROM daily_bars d
                JOIN symbols s ON d.symbol = s.symbol
                WHERE d.symbol IN ({symbols_str})
            ),
            latest_etfs AS (
                SELECT * FROM etf_bars WHERE rn_desc = 1
            ),
            bars_5d_ago AS (
                SELECT symbol, close as close_5d, rs_rank as rs_rank_5d FROM etf_bars WHERE rn_desc = 6
            ),
            bars_20d_ago AS (
                SELECT symbol, close as close_20d, rs_rank as rs_rank_20d FROM etf_bars WHERE rn_desc = 21
            ),
            bars_65d_ago AS (
                SELECT symbol, close as close_65d, rs_rank as rs_rank_65d FROM etf_bars WHERE rn_desc = 66
            )
            SELECT 
                l.symbol,
                l.name,
                l.sector,
                l.industry,
                l.close,
                l.rs_score,
                l.rs_rank,
                ROUND(((l.close - b5.close_5d) / NULLIF(b5.close_5d, 0)) * 100.0, 2) as ret_1w_pct,
                COALESCE((l.rs_rank - b5.rs_rank_5d), 0) as delta_rs_1w,
                ROUND(((l.close - b20.close_20d) / NULLIF(b20.close_20d, 0)) * 100.0, 2) as ret_1m_pct,
                COALESCE((l.rs_rank - b20.rs_rank_20d), 0) as delta_rs_1m,
                ROUND(((l.close - b65.close_65d) / NULLIF(b65.close_65d, 0)) * 100.0, 2) as ret_3m_pct,
                COALESCE((l.rs_rank - b65.rs_rank_65d), 0) as delta_rs_3m
            FROM latest_etfs l
            LEFT JOIN bars_5d_ago b5 ON l.symbol = b5.symbol
            LEFT JOIN bars_20d_ago b20 ON l.symbol = b20.symbol
            LEFT JOIN bars_65d_ago b65 ON l.symbol = b65.symbol
            ORDER BY delta_rs_1w DESC;
        """
        try:
            with self.get_read_only_conn() as conn:
                res = conn.execute(query).fetchall()
                cols = [c[0] for c in conn.description]

            etf_list = []
            for row in res:
                r_dict = dict(zip(cols, row))
                etf_list.append(r_dict)

            return etf_list
        except Exception as e:
            print(f"Error getting sector ETF performance: {e}")
            return []

    def get_sector_stocks(self, sector_name: str) -> List[Dict[str, Any]]:
        """Retrieves candidate stocks belonging to a specific sector or industry."""
        all_cands = self.get_candidates()
        if not sector_name or sector_name.upper() == 'ALL':
            return all_cands

        etf_matchers = {
            'XLK': ('Technology', None),
            'SMH': ('Technology', 'Semiconductors'),
            'IGV': ('Technology', 'Software'),
            'XLF': ('Finance', None),
            'KRE': ('Finance', 'Banks'),
            'XLV': ('Health Care', None),
            'XBI': ('Health Care', 'Biotechnology'),
            'XLY': ('Consumer Discretionary', None),
            'XRT': ('Consumer Discretionary', 'Retail'),
            'ITB': ('Consumer Discretionary', 'Building'),
            'XLE': ('Energy', None),
            'XOP': ('Energy', 'Oil'),
            'XLI': ('Industrials', None),
            'ITA': ('Industrials', 'Military'),
            'XLB': ('Basic Materials', None),
            'XLU': ('Utilities', None),
            'XLRE': ('Real Estate', None),
            'XLC': ('Telecommunications', None),
        }

        sec_upper = sector_name.strip().upper()
        target_sec, target_ind = etf_matchers.get(sec_upper, (sec_upper, None))

        filtered = []
        for c in all_cands:
            c_sec = (c.get("sector") or "").strip().upper()
            c_ind = (c.get("industry") or "").strip().upper()
            
            if target_ind:
                if target_ind.upper() in c_ind:
                    filtered.append(c)
            else:
                if target_sec in c_sec or c_sec in target_sec or target_sec in c_ind:
                    filtered.append(c)

        return filtered

    def get_watchlists(self) -> List[Dict[str, Any]]:
        with self.get_read_only_conn() as conn:
            tables = [t[0] for t in conn.execute("SHOW TABLES").fetchall()]
            if "watchlists" not in tables:
                return [{"id": 1, "name": "Default Watchlist", "created_at": None, "item_count": 0}]

            query = """
                SELECT w.id, w.name, w.created_at, COUNT(wi.symbol) as item_count
                FROM watchlists w
                LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
                GROUP BY w.id, w.name, w.created_at
                ORDER BY w.id ASC
            """
            rows = conn.execute(query).fetchall()
            return [
                {
                    "id": row[0],
                    "name": row[1],
                    "created_at": str(row[2]) if row[2] else None,
                    "item_count": row[3]
                }
                for row in rows
            ]

    def create_watchlist(self, name: str) -> Dict[str, Any]:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("""
                CREATE SEQUENCE IF NOT EXISTS seq_watchlist_id START 1;
                CREATE TABLE IF NOT EXISTS watchlists (
                    id INTEGER PRIMARY KEY DEFAULT nextval('seq_watchlist_id'),
                    name VARCHAR NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.execute("INSERT INTO watchlists (name) VALUES (?)", [name])
            row = conn.execute("SELECT id, name, created_at FROM watchlists WHERE name = ?", [name]).fetchone()
            return {"id": row[0], "name": row[1], "created_at": str(row[2]), "item_count": 0}

    def delete_watchlist(self, watchlist_id: int) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ?", [watchlist_id])
            conn.execute("DELETE FROM watchlists WHERE id = ?", [watchlist_id])
            return True

    def get_watchlist_items(self, watchlist_id: int) -> List[Dict[str, Any]]:
        with self.get_read_only_conn() as conn:
            tables = [t[0] for t in conn.execute("SHOW TABLES").fetchall()]
            if "watchlist_items" not in tables:
                return []

            query = """
                SELECT 
                    s.symbol,
                    s.name,
                    s.exchange,
                    s.sector,
                    b.close,
                    b.rs_rank,
                    b.vol_50d_ma,
                    b.volume,
                    wi.added_at
                FROM watchlist_items wi
                JOIN symbols s ON wi.symbol = s.symbol
                LEFT JOIN (
                    SELECT db.*
                    FROM daily_bars db
                    INNER JOIN (
                        SELECT symbol, MAX(date) as max_date
                        FROM daily_bars
                        GROUP BY symbol
                    ) latest ON db.symbol = latest.symbol AND db.date = latest.max_date
                ) b ON s.symbol = b.symbol
                WHERE wi.watchlist_id = ?
                ORDER BY wi.added_at DESC
            """
            rows = conn.execute(query, [watchlist_id]).fetchall()
            return [
                {
                    "symbol": row[0],
                    "name": row[1],
                    "exchange": row[2],
                    "sector": row[3],
                    "close": row[4],
                    "rs_rank": row[5],
                    "vol_50d_ma": row[6],
                    "volume": row[7],
                    "added_at": str(row[8]) if row[8] else None
                }
                for row in rows
            ]

    def add_watchlist_item(self, watchlist_id: int, symbol: str) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS watchlist_items (
                    watchlist_id INTEGER NOT NULL,
                    symbol VARCHAR NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (watchlist_id, symbol)
                );
            """)
            symbol_upper = symbol.strip().upper()
            conn.execute("INSERT OR IGNORE INTO watchlist_items (watchlist_id, symbol) VALUES (?, ?)", [watchlist_id, symbol_upper])
            return True

    def remove_watchlist_item(self, watchlist_id: int, symbol: str) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            symbol_upper = symbol.strip().upper()
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?", [watchlist_id, symbol_upper])
            return True

    def clear_watchlist_items(self, watchlist_id: int) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ?", [watchlist_id])
            return True

db_service = DatabaseService(config_service)

