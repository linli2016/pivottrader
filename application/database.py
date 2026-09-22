import duckdb
from typing import List, Dict, Any, Tuple
import pandas as pd

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.initialize_schema()

    def get_connection(self):
        """Returns a new connection to the DuckDB file, retrying if temporarily locked by concurrent queries."""
        import time
        max_retries = 25
        for attempt in range(max_retries):
            try:
                return duckdb.connect(self.db_path)
            except Exception as e:
                err_msg = str(e).lower()
                is_lock = any(k in err_msg for k in ["lock", "different configuration", "conflict", "held in", "temporarily unavailable"])
                if is_lock and attempt < max_retries - 1:
                    time.sleep(0.1 + attempt * 0.02)
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
                    delisted_date VARCHAR,
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
            try:
                conn.execute("ALTER TABLE symbols ADD COLUMN delisted_date VARCHAR;")
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
                    days_since_52w_high INTEGER,
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
                    ema_50 DOUBLE,
                    dist_ema10_pct DOUBLE,
                    dist_ema20_pct DOUBLE,
                    dist_ema50_pct DOUBLE,
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
                    low_cheat_is_setup BOOLEAN,
                    low_cheat_pivot_price DOUBLE,
                    low_cheat_stop_loss DOUBLE,
                    low_cheat_risk_pct DOUBLE,
                    low_cheat_base_depth DOUBLE,
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
                ("days_since_52w_high", "INTEGER"),
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
                ("ema_50", "DOUBLE"),
                ("dist_ema10_pct", "DOUBLE"),
                ("dist_ema20_pct", "DOUBLE"),
                ("dist_ema50_pct", "DOUBLE"),
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
                ("low_cheat_is_setup", "BOOLEAN"),
                ("low_cheat_pivot_price", "DOUBLE"),
                ("low_cheat_stop_loss", "DOUBLE"),
                ("low_cheat_risk_pct", "DOUBLE"),
                ("low_cheat_base_depth", "DOUBLE"),
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
                    inst_holders_count INTEGER,
                    inst_holders_qoq_change INTEGER,
                    inst_ownership_pct DOUBLE,
                    sponsorship_streak INTEGER,
                    PRIMARY KEY (symbol, fiscal_quarter)
                );
            """)

            # Migration for quarterly_fundamentals institutional columns
            for col_name, col_type in [
                ("inst_holders_count", "INTEGER"),
                ("inst_holders_qoq_change", "INTEGER"),
                ("inst_ownership_pct", "DOUBLE"),
                ("sponsorship_streak", "INTEGER")
            ]:
                try:
                    conn.execute(f"ALTER TABLE quarterly_fundamentals ADD COLUMN {col_name} {col_type};")
                except Exception:
                    pass

            # Migration: remap symbols.sector from industry using the 30 IBD-style tactical
            # sectors. Industry is the ground truth; the raw upstream feed's broad GICS sector
            # names (Technology, Financials, etc.) are replaced by the more granular 30-sector
            # taxonomy on every startup. Rows with no industry are left unchanged.
            try:
                from application.services.taxonomy import get_tactical_sector
                rows = conn.execute(
                    "SELECT symbol, industry FROM symbols WHERE industry IS NOT NULL AND industry != ''"
                ).fetchall()
                if rows:
                    updates = [(get_tactical_sector(industry), sym) for sym, industry in rows]
                    conn.executemany("UPDATE symbols SET sector = ? WHERE symbol = ?", updates)
            except Exception:
                pass


            conn.execute("""
                CREATE TABLE IF NOT EXISTS earnings_calendar (
                    symbol VARCHAR NOT NULL,
                    earnings_date DATE NOT NULL,
                    eps_estimate DOUBLE,
                    eps_actual DOUBLE,
                    surprise_pct DOUBLE,
                    time_of_day VARCHAR, -- 'amc', 'bmo', or null
                    PRIMARY KEY (symbol, earnings_date)
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_earnings_calendar_sym ON earnings_calendar(symbol);")

            # 5. Institutional Sponsorship Historical Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS institutional_sponsorship (
                    symbol VARCHAR NOT NULL,
                    report_date DATE NOT NULL,
                    fiscal_quarter VARCHAR NOT NULL,
                    holders_count INTEGER NOT NULL,
                    holders_qoq_change INTEGER,
                    holders_growth_pct DOUBLE,
                    ownership_pct DOUBLE,
                    source VARCHAR DEFAULT 'yfinance',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (symbol, fiscal_quarter)
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_inst_sponsorship_sym ON institutional_sponsorship(symbol);")

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
                    delisted_date = NULL,
                    ipo_date = COALESCE(symbols.ipo_date, CAST(EXCLUDED.ipo_date AS VARCHAR)),
                    sector = COALESCE(EXCLUDED.sector, symbols.sector),
                    industry = COALESCE(EXCLUDED.industry, symbols.industry),
                    next_earnings_date = COALESCE(EXCLUDED.next_earnings_date, symbols.next_earnings_date),
                    last_updated = EXCLUDED.last_updated
            """)
            conn.execute("DROP TABLE temp_symbols")

    def deactivate_missing_symbols(self, active_symbols: List[str]) -> int:
        """Marks symbols in the database as active = FALSE if they are not in active_symbols."""
        if not active_symbols:
            return 0
        df = pd.DataFrame({"symbol": [s.strip().upper() for s in active_symbols if s.strip()]})
        with self.get_connection() as conn:
            conn.execute("CREATE OR REPLACE TEMP TABLE current_active AS SELECT symbol FROM df")
            count_res = conn.execute("""
                SELECT COUNT(*) FROM symbols
                WHERE active = TRUE AND symbol NOT IN (SELECT symbol FROM current_active)
            """).fetchone()
            count = count_res[0] if count_res else 0
            if count > 0:
                conn.execute("""
                    UPDATE symbols
                    SET active = FALSE, delisted_date = CAST(CURRENT_DATE AS VARCHAR), last_updated = CURRENT_TIMESTAMP
                    WHERE active = TRUE AND symbol NOT IN (SELECT symbol FROM current_active)
                """)
            conn.execute("DROP TABLE current_active")
            return count

    def deactivate_symbols(self, symbols: List[str]) -> int:
        """Explicitly deactivates a list of symbols (e.g., verified stale / no price data)."""
        if not symbols:
            return 0
        sym_list = [s.strip().upper() for s in symbols if s.strip()]
        df = pd.DataFrame({"symbol": sym_list})
        with self.get_connection() as conn:
            conn.execute("CREATE OR REPLACE TEMP TABLE to_deactivate AS SELECT symbol FROM df")
            count_res = conn.execute("""
                SELECT COUNT(*) FROM symbols
                WHERE active = TRUE AND symbol IN (SELECT symbol FROM to_deactivate)
            """).fetchone()
            count = count_res[0] if count_res else 0
            if count > 0:
                conn.execute("""
                    UPDATE symbols
                    SET active = FALSE, delisted_date = CAST(CURRENT_DATE AS VARCHAR), last_updated = CURRENT_TIMESTAMP
                    WHERE active = TRUE AND symbol IN (SELECT symbol FROM to_deactivate)
                """)
            conn.execute("DROP TABLE to_deactivate")
            return count

    def get_active_symbols(self, exclude_etfs: bool = False) -> List[str]:
        """Returns a list of all active stock symbols stored in the database."""
        with self.get_connection() as conn:
            query = "SELECT symbol FROM symbols WHERE active = TRUE"
            if exclude_etfs:
                query += " AND (asset_type IS NULL OR asset_type != 'ETF')"
            query += " ORDER BY symbol"
            res = conn.execute(query).fetchall()
            return [r[0] for r in res]

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

    def upsert_earnings_calendar(self, records: List[Dict[str, Any]]) -> None:
        """Inserts or replaces records in the earnings_calendar table."""
        if not records:
            return
        df = pd.DataFrame(records)
        columns = ["symbol", "earnings_date", "eps_estimate", "eps_actual", "surprise_pct", "time_of_day"]
        for col in columns:
            if col not in df.columns:
                df[col] = None
        df = df[columns]
        with self.get_connection() as conn:
            conn.execute("CREATE OR REPLACE TEMP TABLE temp_earnings_calendar AS SELECT * FROM df")
            conn.execute("""
                INSERT OR REPLACE INTO earnings_calendar (symbol, earnings_date, eps_estimate, eps_actual, surprise_pct, time_of_day)
                SELECT symbol, CAST(earnings_date AS DATE), CAST(eps_estimate AS DOUBLE), CAST(eps_actual AS DOUBLE), CAST(surprise_pct AS DOUBLE), CAST(time_of_day AS VARCHAR)
                FROM temp_earnings_calendar
            """)

    def upsert_institutional_sponsorship(self, df: pd.DataFrame) -> None:
        """Inserts or replaces records in institutional_sponsorship."""
        if df.empty:
            return
        columns = ["symbol", "report_date", "fiscal_quarter", "holders_count", "ownership_pct", "source"]
        for col in columns:
            if col not in df.columns:
                if col == "ownership_pct":
                    df[col] = None
                elif col == "source":
                    df[col] = "yfinance"
                else:
                    raise ValueError(f"Required column '{col}' missing from institutional DataFrame")

        df["report_date"] = pd.to_datetime(df["report_date"]).dt.date
        inst_df = df[columns].copy()

        with self.get_connection() as conn:
            conn.execute("CREATE OR REPLACE TEMP TABLE temp_inst AS SELECT * FROM inst_df")
            conn.execute("""
                INSERT OR REPLACE INTO institutional_sponsorship (symbol, report_date, fiscal_quarter, holders_count, ownership_pct, source, created_at)
                SELECT 
                    symbol, 
                    report_date, 
                    fiscal_quarter, 
                    CAST(holders_count AS INTEGER), 
                    CAST(ownership_pct AS DOUBLE), 
                    CAST(source AS VARCHAR), 
                    CURRENT_TIMESTAMP
                FROM temp_inst
            """)
            conn.execute("DROP TABLE temp_inst")

    def recalculate_sponsorship_metrics(self) -> None:
        """
        Recalculates QoQ change, growth rate, and consecutive quarters growth streak
        for institutional sponsorship records and syncs the latest metrics into quarterly_fundamentals.
        """
        with self.get_connection() as conn:
            # 1. Update holders_qoq_change and holders_growth_pct in institutional_sponsorship
            conn.execute("""
                WITH ranked AS (
                    SELECT 
                        symbol,
                        fiscal_quarter,
                        holders_count,
                        LAG(holders_count, 1) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_1
                    FROM institutional_sponsorship
                )
                UPDATE institutional_sponsorship
                SET 
                    holders_qoq_change = ranked.holders_count - ranked.prev_1,
                    holders_growth_pct = CASE 
                        WHEN ranked.prev_1 IS NOT NULL AND ranked.prev_1 > 0 
                        THEN ((ranked.holders_count - ranked.prev_1) * 100.0 / ranked.prev_1) 
                        ELSE NULL 
                    END
                FROM ranked
                WHERE institutional_sponsorship.symbol = ranked.symbol 
                  AND institutional_sponsorship.fiscal_quarter = ranked.fiscal_quarter;
            """)

            # 2. Compute streaks and propagate to quarterly_fundamentals
            conn.execute("""
                WITH streak_calc AS (
                    SELECT 
                        symbol,
                        fiscal_quarter,
                        report_date,
                        holders_count,
                        holders_qoq_change,
                        ownership_pct,
                        CASE 
                            WHEN holders_count > prev_1 AND prev_1 > prev_2 AND prev_2 > prev_3 AND prev_3 > prev_4 THEN 4
                            WHEN holders_count > prev_1 AND prev_1 > prev_2 AND prev_2 > prev_3 THEN 3
                            WHEN holders_count > prev_1 AND prev_1 > prev_2 THEN 2
                            WHEN holders_count > prev_1 THEN 1
                            ELSE 0
                        END AS streak
                    FROM (
                        SELECT 
                            symbol,
                            fiscal_quarter,
                            report_date,
                            holders_count,
                            holders_qoq_change,
                            ownership_pct,
                            LAG(holders_count, 1) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_1,
                            LAG(holders_count, 2) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_2,
                            LAG(holders_count, 3) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_3,
                            LAG(holders_count, 4) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_4
                        FROM institutional_sponsorship
                    )
                )
                UPDATE quarterly_fundamentals
                SET 
                    inst_holders_count = s.holders_count,
                    inst_holders_qoq_change = s.holders_qoq_change,
                    inst_ownership_pct = s.ownership_pct,
                    sponsorship_streak = s.streak
                FROM streak_calc s
                WHERE quarterly_fundamentals.symbol = s.symbol 
                  AND quarterly_fundamentals.fiscal_quarter = s.fiscal_quarter;
            """)

            # 3. For any symbols in institutional_sponsorship without a quarterly_fundamentals row for that quarter, insert a stub
            conn.execute("""
                WITH streak_calc AS (
                    SELECT 
                        symbol,
                        fiscal_quarter,
                        report_date,
                        holders_count,
                        holders_qoq_change,
                        ownership_pct,
                        CASE 
                            WHEN holders_count > prev_1 AND prev_1 > prev_2 AND prev_2 > prev_3 AND prev_3 > prev_4 THEN 4
                            WHEN holders_count > prev_1 AND prev_1 > prev_2 AND prev_2 > prev_3 THEN 3
                            WHEN holders_count > prev_1 AND prev_1 > prev_2 THEN 2
                            WHEN holders_count > prev_1 THEN 1
                            ELSE 0
                        END AS streak
                    FROM (
                        SELECT 
                            symbol,
                            fiscal_quarter,
                            report_date,
                            holders_count,
                            holders_qoq_change,
                            ownership_pct,
                            LAG(holders_count, 1) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_1,
                            LAG(holders_count, 2) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_2,
                            LAG(holders_count, 3) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_3,
                            LAG(holders_count, 4) OVER (PARTITION BY symbol ORDER BY fiscal_quarter) AS prev_4
                        FROM institutional_sponsorship
                    )
                )
                INSERT INTO quarterly_fundamentals (symbol, report_date, fiscal_quarter, inst_holders_count, inst_holders_qoq_change, inst_ownership_pct, sponsorship_streak)
                SELECT s.symbol, s.report_date, s.fiscal_quarter, s.holders_count, s.holders_qoq_change, s.ownership_pct, s.streak
                FROM streak_calc s
                WHERE NOT EXISTS (
                    SELECT 1 FROM quarterly_fundamentals qf 
                    WHERE qf.symbol = s.symbol AND qf.fiscal_quarter = s.fiscal_quarter
                );
            """)

    def get_symbol_sponsorship_history(self, symbol: str) -> List[Dict[str, Any]]:
        """Returns the historical quarterly institutional sponsorship records for a symbol."""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT 
                    i.fiscal_quarter,
                    i.report_date,
                    i.holders_count,
                    i.holders_qoq_change,
                    i.holders_growth_pct,
                    i.ownership_pct,
                    i.source,
                    qf.sponsorship_streak
                FROM institutional_sponsorship i
                LEFT JOIN quarterly_fundamentals qf 
                    ON i.symbol = qf.symbol AND i.fiscal_quarter = qf.fiscal_quarter
                WHERE i.symbol = ?
                ORDER BY i.fiscal_quarter DESC
            """, [symbol.upper()]).fetchall()

            if not rows:
                rows = conn.execute("""
                    SELECT 
                        fiscal_quarter,
                        report_date,
                        inst_holders_count,
                        inst_holders_qoq_change,
                        CASE WHEN inst_holders_count - inst_holders_qoq_change > 0 
                             THEN (inst_holders_qoq_change * 100.0 / (inst_holders_count - inst_holders_qoq_change))
                             ELSE NULL END as growth_pct,
                        inst_ownership_pct,
                        'fundamentals' as source,
                        sponsorship_streak
                    FROM quarterly_fundamentals
                    WHERE symbol = ? AND inst_holders_count IS NOT NULL
                    ORDER BY fiscal_quarter DESC
                """, [symbol.upper()]).fetchall()

            return [
                {
                    "fiscal_quarter": r[0],
                    "report_date": r[1].strftime("%Y-%m-%d") if r[1] else None,
                    "holders_count": r[2],
                    "holders_qoq_change": r[3],
                    "holders_growth_pct": round(r[4], 2) if r[4] is not None else None,
                    "ownership_pct": r[5],
                    "source": r[6],
                    "sponsorship_streak": r[7] if len(r) > 7 and r[7] is not None else 0
                }
                for r in rows
            ]

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
                    COALESCE(b.dollar_vol_50d_ma, b.close * b.vol_50d_ma) as dollar_vol_50d_ma,
                    s.active,
                    b.date as last_trade_date
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
                    "dollar_vol_50d_ma": row[9],
                    "active": bool(row[10]) if len(row) > 10 and row[10] is not None else True,
                    "last_trade_date": str(row[11]) if len(row) > 11 and row[11] else None
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
