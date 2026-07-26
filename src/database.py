import os
import duckdb
from typing import List, Dict, Any, Tuple
import pandas as pd

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.initialize_schema()

    def get_connection(self):
        """Returns a new connection to the DuckDB file."""
        return duckdb.connect(self.db_path)

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
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            try:
                conn.execute("ALTER TABLE symbols ADD COLUMN ipo_date VARCHAR;")
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
                    PRIMARY KEY (symbol, date)
                );
            """)
            
            # Migration: add columns if daily_bars already exists
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN adr_20d DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN atr_20d DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN pp_runup_pct DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN pp_drawdown_pct DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN pp_days_since_peak INTEGER;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN sma_50 DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN sma_150 DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN sma_200 DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN vcp_is_setup BOOLEAN;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN vcp_troughs INTEGER;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN vcp_depths VARCHAR;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN ipo_days_count INTEGER;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN ipo_all_time_high DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN ipo_drawdown_from_high DOUBLE;")
            except Exception:
                pass
            try:
                conn.execute("ALTER TABLE daily_bars ADD COLUMN ipo_base_depth DOUBLE;")
            except Exception:
                pass
            
            
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
        columns = ["symbol", "exchange", "name", "asset_type", "active", "ipo_date"]
        for col in columns:
            if col not in df.columns:
                df[col] = None if col != "active" else True
        
        df = df[columns]
        
        with self.get_connection() as conn:
            # Using DuckDB's pandas integration
            conn.execute("CREATE OR REPLACE TEMP TABLE temp_symbols AS SELECT * FROM df")
            conn.execute("""
                INSERT INTO symbols (symbol, exchange, name, asset_type, active, ipo_date, last_updated)
                SELECT symbol, exchange, name, asset_type, active, CAST(ipo_date AS VARCHAR), CURRENT_TIMESTAMP as last_updated
                FROM temp_symbols
                ON CONFLICT (symbol) DO UPDATE SET
                    name = EXCLUDED.name,
                    exchange = EXCLUDED.exchange,
                    asset_type = EXCLUDED.asset_type,
                    active = EXCLUDED.active,
                    ipo_date = COALESCE(symbols.ipo_date, CAST(EXCLUDED.ipo_date AS VARCHAR)),
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
