import duckdb
from typing import List, Dict, Any, Tuple
import pandas as pd

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.initialize_schema()

    def get_connection(self):
        """Returns a new connection to the DuckDB file, retrying if temporarily locked by read queries."""
        import time
        max_retries = 6
        for attempt in range(max_retries):
            try:
                return duckdb.connect(self.db_path)
            except Exception as e:
                if "lock" in str(e).lower() and attempt < max_retries - 1:
                    time.sleep(0.5)
                else:
                    raise


    def initialize_schema(self) -> None:
        """Executes the DDL script to setup schema structures if they do not exist."""
        with self.get_connection() as conn:
            # 1. Symbols Directory Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS symbols (
                    symbol VARCHAR PRIMARY KEY,
                    exchange VARCHAR NOT NULL,
                    name VARCHAR,
                    asset_type VARCHAR NOT NULL,
                    active BOOLEAN DEFAULT TRUE,
                    ipo_date VARCHAR,
                    sector VARCHAR,
                    industry VARCHAR,
                    next_earnings_date VARCHAR,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 1b. Watchlists & Watchlist Items Tables
            conn.execute("""
                CREATE SEQUENCE IF NOT EXISTS seq_watchlist_id START 1;
                CREATE TABLE IF NOT EXISTS watchlists (
                    id INTEGER PRIMARY KEY DEFAULT nextval('seq_watchlist_id'),
                    name VARCHAR NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS watchlist_items (
                    watchlist_id INTEGER NOT NULL,
                    symbol VARCHAR NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (watchlist_id, symbol)
                );
            """)

            res = conn.execute("SELECT COUNT(*) FROM watchlists").fetchone()
            if res and res[0] == 0:
                conn.execute("INSERT INTO watchlists (name) VALUES ('Default')")
            
            try:
                conn.execute("ALTER TABLE symbols ADD COLUMN ipo_date VARCHAR;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE symbols ADD COLUMN sector VARCHAR;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE symbols ADD COLUMN industry VARCHAR;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE symbols ADD COLUMN next_earnings_date VARCHAR;")
            except Exception:
                pass
            
            # 2. Historical Daily Bars Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS daily_bars (
                    symbol VARCHAR NOT NULL,
                    date DATE NOT NULL,
                    open DOUBLE NOT NULL,
                    high DOUBLE NOT NULL,
                    low DOUBLE NOT NULL,
                    close DOUBLE NOT NULL,
                    volume BIGINT NOT NULL,
                    vol_50d_ma DOUBLE,
                    rs_score DOUBLE,
                    rs_rank INTEGER,
                    adr_20d DOUBLE,
                    atr_20d DOUBLE,
                    pp_runup_pct DOUBLE,
                    pp_drawdown_pct DOUBLE,
                    sma_50 DOUBLE,
                    sma_150 DOUBLE,
                    sma_200 DOUBLE,
                    vcp_is_setup BOOLEAN,
                    vcp_troughs INTEGER,
                    vcp_depths VARCHAR,
                    ipo_days_count INTEGER,
                    ipo_all_time_high DOUBLE,
                    ipo_drawdown_from_high DOUBLE,
                    ipo_base_depth DOUBLE,
                    pp_days_since_peak INTEGER,
                    high_52w DOUBLE,
                    low_52w DOUBLE,
                    dist_from_52w_high DOUBLE,
                    dist_from_52w_low DOUBLE,
                    surge_off_low_pct DOUBLE,
                    sma_200_20d_ago DOUBLE,
                    is_52w_high BOOLEAN,
                    ret_1m DOUBLE,
                    ret_3m DOUBLE,
                    ret_6m DOUBLE,
                    ema_10 DOUBLE,
                    ema_20 DOUBLE,
                    dist_ema10_pct DOUBLE,
                    dist_ema20_pct DOUBLE,
                    gap_pct DOUBLE,
                    rel_vol_50d DOUBLE,
                    ep_is_setup BOOLEAN,
                    ep_gap_pct DOUBLE,
                    ep_rel_vol DOUBLE,
                    parabolic_short_is_setup BOOLEAN,
                    parabolic_long_is_setup BOOLEAN,
                    parabolic_runup_pct DOUBLE,
                    parabolic_drop_pct DOUBLE,
                    parabolic_up_days INTEGER,
                    pivot_spread_pct DOUBLE,
                    pivot_close_clustering_pct DOUBLE,
                    pivot_vol_ratio DOUBLE,
                    ti_65 DOUBLE,
                    dollar_vol_50d_ma DOUBLE,
                    PRIMARY KEY (symbol, date)
                );
            """)
            
            # Migration: add columns if daily_bars already exists
            new_cols = [
                ("adr_20d", "DOUBLE"),
                ("atr_20d", "DOUBLE"),
                ("pp_runup_pct", "DOUBLE"),
                ("pp_drawdown_pct", "DOUBLE"),
                ("pp_days_since_peak", "INTEGER"),
                ("sma_50", "DOUBLE"),
                ("sma_150", "DOUBLE"),
                ("sma_200", "DOUBLE"),
                ("vcp_is_setup", "BOOLEAN"),
                ("vcp_troughs", "INTEGER"),
                ("vcp_depths", "VARCHAR"),
                ("ipo_days_count", "INTEGER"),
                ("ipo_all_time_high", "DOUBLE"),
                ("ipo_drawdown_from_high", "DOUBLE"),
                ("ipo_base_depth", "DOUBLE"),
                ("high_52w", "DOUBLE"),
                ("low_52w", "DOUBLE"),
                ("dist_from_52w_high", "DOUBLE"),
                ("dist_from_52w_low", "DOUBLE"),
                ("surge_off_low_pct", "DOUBLE"),
                ("sma_200_20d_ago", "DOUBLE"),
                ("is_52w_high", "BOOLEAN"),
                ("ret_1m", "DOUBLE"),
                ("ret_3m", "DOUBLE"),
                ("ret_6m", "DOUBLE"),
                ("ema_10", "DOUBLE"),
                ("ema_20", "DOUBLE"),
                ("dist_ema10_pct", "DOUBLE"),
                ("dist_ema20_pct", "DOUBLE"),
                ("gap_pct", "DOUBLE"),
                ("rel_vol_50d", "DOUBLE"),
                ("ep_is_setup", "BOOLEAN"),
                ("ep_gap_pct", "DOUBLE"),
                ("ep_rel_vol", "DOUBLE"),
                ("parabolic_short_is_setup", "BOOLEAN"),
                ("parabolic_long_is_setup", "BOOLEAN"),
                ("parabolic_runup_pct", "DOUBLE"),
                ("parabolic_drop_pct", "DOUBLE"),
                ("parabolic_up_days", "INTEGER"),
                ("pivot_spread_pct", "DOUBLE"),
                ("pivot_close_clustering_pct", "DOUBLE"),
                ("pivot_vol_ratio", "DOUBLE"),
                ("ti_65", "DOUBLE"),
                ("dollar_vol_50d_ma", "DOUBLE"),
            ]
            for col_name, col_type in new_cols:
                try:
                    conn.execute(f"ALTER TABLE daily_bars ADD COLUMN {col_name} {col_type};")
                except Exception:
                    pass

            # Create index on date for fast date filtering
            conn.execute("CREATE INDEX IF NOT EXISTS idx_daily_bars_date ON daily_bars(date);")

            # 3. Historical Quarterly Fundamentals Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS quarterly_fundamentals (
                    symbol VARCHAR NOT NULL,
                    report_date DATE NOT NULL,
                    fiscal_quarter VARCHAR NOT NULL, -- e.g., '2025-Q4'
                    eps_diluted DOUBLE,
                    eps_qoq_growth DOUBLE,
                    total_revenue DOUBLE,
                    PRIMARY KEY (symbol, fiscal_quarter)
                );
            """)

    def upsert_symbols(self, symbols_data: List[Dict[str, Any]]) -> None:
        """Inserts or updates records in the symbols table."""
        if not symbols_data:
            return
        
        df = pd.DataFrame(symbols_data)
        
        # Ensure correct column ordering and existence
        columns = ["symbol", "exchange", "name", "asset_type", "active", "ipo_date", "sector", "industry", "next_earnings_date"]
        for col in columns:
            if col not in df.columns:
                df[col] = None if col != "active" else True
        
        df = df[columns]
        
        with self.get_connection() as conn:
            # Using DuckDB's pandas integration
            conn.execute("CREATE OR REPLACE TEMP TABLE temp_symbols AS SELECT * FROM df")
            conn.execute("""
                INSERT INTO symbols (symbol, exchange, name, asset_type, active, ipo_date, sector, industry, next_earnings_date, last_updated)
                SELECT symbol, exchange, name, asset_type, active, CAST(ipo_date AS VARCHAR), CAST(sector AS VARCHAR), CAST(industry AS VARCHAR), CAST(next_earnings_date AS VARCHAR), CURRENT_TIMESTAMP as last_updated
                FROM temp_symbols
                ON CONFLICT (symbol) DO UPDATE SET
                    name = EXCLUDED.name,
                    exchange = EXCLUDED.exchange,
                    asset_type = EXCLUDED.asset_type,
                    active = EXCLUDED.active,
                    ipo_date = COALESCE(symbols.ipo_date, CAST(EXCLUDED.ipo_date AS VARCHAR)),
                    sector = COALESCE(EXCLUDED.sector, symbols.sector),
                    industry = COALESCE(EXCLUDED.industry, symbols.industry),
                    next_earnings_date = COALESCE(EXCLUDED.next_earnings_date, symbols.next_earnings_date),
                    last_updated = EXCLUDED.last_updated
            """)
            conn.execute("DROP TABLE temp_symbols")

    def get_symbols_missing_ipo_date(self) -> List[str]:
        """Returns a list of active symbols that do not have an IPO date in the symbols table."""
        with self.get_connection() as conn:
            res = conn.execute("SELECT symbol FROM symbols WHERE ipo_date IS NULL AND active = TRUE").fetchall()
            return [r[0] for r in res]

    def update_symbol_ipo_date(self, symbol: str, ipo_date: str) -> None:
        """Updates the IPO date for a specific symbol."""
        with self.get_connection() as conn:
            conn.execute("UPDATE symbols SET ipo_date = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?", [ipo_date, symbol])

    def update_multiple_symbol_ipo_dates(self, ipo_dates: List[Tuple[str, str]]) -> None:
        """Updates the IPO dates for multiple symbols in a single transaction."""
        if not ipo_dates:
            return
        with self.get_connection() as conn:
            conn.executemany("UPDATE symbols SET ipo_date = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?", ipo_dates)

    def update_symbol_next_earnings_date(self, symbol: str, next_earnings_date: str) -> None:
        """Updates the next earnings date for a specific symbol."""
        with self.get_connection() as conn:
            conn.execute("UPDATE symbols SET next_earnings_date = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?", [next_earnings_date, symbol])

    def update_multiple_symbol_next_earnings_dates(self, earnings_dates: List[Tuple[str, str]]) -> None:
        """Updates the next earnings dates for multiple symbols in a single transaction."""
        if not earnings_dates:
            return
        with self.get_connection() as conn:
            conn.executemany("UPDATE symbols SET next_earnings_date = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?", earnings_dates)

    def upsert_daily_bars(self, df: pd.DataFrame) -> None:
        """Inserts or updates daily price bars using a pandas DataFrame."""
        if df.empty:
            return
            
        columns = ["symbol", "date", "open", "high", "low", "close", "volume"]
        # Ensure column alignment
        for col in columns:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' missing from bars DataFrame")
                
        # Convert date to date objects/strings just in case
        df["date"] = pd.to_datetime(df["date"]).dt.date
        
        # Clean dataframe to standard columns
        bars_df = df[columns].copy()
        
        with self.get_connection() as conn:
            conn.execute("CREATE OR REPLACE TEMP TABLE temp_bars AS SELECT * FROM bars_df")
            # We insert or replace, keeping previous vol_50d_ma, rs_score, rs_rank if they exist or inserting null
            conn.execute("""
                INSERT OR REPLACE INTO daily_bars (symbol, date, open, high, low, close, volume, vol_50d_ma, rs_score, rs_rank)
                SELECT 
                    t.symbol, 
                    t.date, 
                    t.open, 
                    t.high, 
                    t.low, 
                    t.close, 
                    t.volume,
                    d.vol_50d_ma,
                    d.rs_score,
                    d.rs_rank
                FROM temp_bars t
                LEFT JOIN daily_bars d ON t.symbol = d.symbol AND t.date = d.date
            """)
            conn.execute("DROP TABLE temp_bars")

    def upsert_quarterly_fundamentals(self, df: pd.DataFrame) -> None:
        """Inserts or updates quarterly fundamental statements."""
        if df.empty:
            return
            
        columns = ["symbol", "report_date", "fiscal_quarter", "eps_diluted", "eps_qoq_growth", "total_revenue"]
        for col in columns:
            if col not in df.columns:
                if col == "eps_qoq_growth":
                    df[col] = None
                else:
                    raise ValueError(f"Required column '{col}' missing from fundamentals DataFrame")
                    
        df["report_date"] = pd.to_datetime(df["report_date"]).dt.date
        fund_df = df[columns].copy()
        
        with self.get_connection() as conn:
            conn.execute("CREATE OR REPLACE TEMP TABLE temp_fund AS SELECT * FROM fund_df")
            conn.execute("""
                INSERT OR REPLACE INTO quarterly_fundamentals (symbol, report_date, fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue)
                SELECT symbol, report_date, fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue
                FROM temp_fund
            """)
            conn.execute("DROP TABLE temp_fund")
            
            # Recalculate and fill in missing eps_qoq_growth rates using database context
            conn.execute("""
                UPDATE quarterly_fundamentals
                SET eps_qoq_growth = ((quarterly_fundamentals.eps_diluted - prior.eps_diluted) / CASE WHEN ABS(prior.eps_diluted) = 0 THEN 0.01 ELSE ABS(prior.eps_diluted) END) * 100
                FROM quarterly_fundamentals prior
                WHERE quarterly_fundamentals.symbol = prior.symbol
                  AND CAST(SUBSTRING(quarterly_fundamentals.fiscal_quarter, 1, 4) AS INTEGER) - 1 || SUBSTRING(quarterly_fundamentals.fiscal_quarter, 5) = prior.fiscal_quarter
                  AND (quarterly_fundamentals.eps_qoq_growth IS NULL OR quarterly_fundamentals.eps_qoq_growth = 0)
            """)

    def get_last_bar_dates(self) -> Dict[str, str]:
        """Returns a dict mapping symbol to their last recorded daily bar date."""
        result = {}
        with self.get_connection() as conn:
            res = conn.execute("SELECT symbol, MAX(date) FROM daily_bars GROUP BY symbol").fetchall()
            for symbol, max_date in res:
                if max_date:
                    result[symbol] = max_date.strftime("%Y-%m-%d")
        return result

    def get_first_bar_dates(self) -> Dict[str, str]:
        """Returns a dict mapping symbol to their earliest recorded daily bar date."""
        result = {}
        with self.get_connection() as conn:
            res = conn.execute("SELECT symbol, MIN(date) FROM daily_bars GROUP BY symbol").fetchall()
            for symbol, min_date in res:
                if min_date:
                    result[symbol] = min_date.strftime("%Y-%m-%d")
        return result


    def get_watchlists(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
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
        with self.get_connection() as conn:
            conn.execute("INSERT INTO watchlists (name) VALUES (?)", [name])
            row = conn.execute("SELECT id, name, created_at FROM watchlists WHERE name = ?", [name]).fetchone()
            return {"id": row[0], "name": row[1], "created_at": str(row[2]), "item_count": 0}

    def delete_watchlist(self, watchlist_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ?", [watchlist_id])
            conn.execute("DELETE FROM watchlists WHERE id = ?", [watchlist_id])
            return True

    def get_watchlist_items(self, watchlist_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
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
                    wi.added_at,
                    COALESCE(b.dollar_vol_50d_ma, b.close * b.vol_50d_ma) as dollar_vol_50d_ma
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
                    "added_at": str(row[8]) if row[8] else None,
                    "dollar_vol_50d_ma": row[9]
                }
                for row in rows
            ]

    def add_watchlist_item(self, watchlist_id: int, symbol: str) -> bool:
        with self.get_connection() as conn:
            symbol_upper = symbol.strip().upper()
            conn.execute("INSERT OR IGNORE INTO watchlist_items (watchlist_id, symbol) VALUES (?, ?)", [watchlist_id, symbol_upper])
            return True

    def remove_watchlist_item(self, watchlist_id: int, symbol: str) -> bool:
        symbol_upper = symbol.upper()
        with duckdb.connect(self.db_path) as conn:
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?", [watchlist_id, symbol_upper])
            return True

    def clear_watchlist_items(self, watchlist_id: int) -> bool:
        with duckdb.connect(self.db_path) as conn:
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ?", [watchlist_id])
            return True
