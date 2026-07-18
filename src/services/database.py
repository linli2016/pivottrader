import os
import duckdb
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
                    symbol, close, volume, vol_50d_ma, rs_score, rs_rank, atr_20d, pp_runup_pct, pp_drawdown_pct, sma_50, sma_150, sma_200, vcp_is_setup, vcp_troughs, vcp_depths, ipo_days_count, ipo_all_time_high, ipo_drawdown_from_high, ipo_base_depth,
                    (rs_rank >= COALESCE(
                        (
                            SELECT MAX(d.rs_rank) 
                            FROM daily_bars d 
                            WHERE d.symbol = db.symbol 
                              AND d.date < db.date 
                              AND d.date >= db.date - INTERVAL 252 DAY
                        ), 0
                    )) as rs_rank_is_new_high
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
                r.rs_rank_is_new_high
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
                
            res = conn.execute(query).fetchall()
            
            candidates = []
            for row in res:
                candidates.append({
                    "symbol": row[0],
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
                    "volume": row[14],
                    "sma_50": row[15],
                    "sma_150": row[16],
                    "sma_200": row[17],
                    "vcp_is_setup": bool(row[18]) if row[18] is not None else False,
                    "vcp_troughs": row[19],
                    "vcp_depths": row[20],
                    "ipo_days_count": row[21],
                    "ipo_all_time_high": row[22],
                    "ipo_drawdown_from_high": row[23],
                    "ipo_base_depth": row[24],
                    "rs_rank_is_new_high": bool(row[25]) if row[25] is not None else False
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

db_service = DatabaseService(config_service)
