import duckdb
from typing import List, Dict, Any

class MomentumEngine:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_connection(self):
        return duckdb.connect(self.db_path)

    def compute_relative_strength(self, min_price: float = 5.00, min_vol_sma: int = 300000, min_rank: int = 70) -> List[Dict[str, Any]]:
        """
        Executes vectorized SQL calculations in DuckDB to:
        1. Calculate 50-day average volume.
        2. Calculate 3M, 6M, 9M, 12M rate of returns.
        3. Weight price performance to yield Momentum Scores.
        4. Apply relative percentile ranking across the entire liquid universe for the latest date.
        5. Write metrics back to 'daily_bars' table.
        6. Return passing candidates.
        """
        query_calculate_and_rank = f"""
            WITH latest_date_const AS (
                SELECT MAX(date) as val FROM daily_bars
            ),
            price_lags_base AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    high,
                    low,
                    volume,
                    -- Rolling 50-day simple moving average of volume
                    AVG(volume) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as vol_50d_ma,
                    -- Rolling 20-day Average Daily Range (ADR%)
                    AVG((high - low) / NULLIF(low, 0) * 100) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as adr_20d,
                    -- Helper rolling metrics for Power Play
                    MIN(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as min_close_20d,
                    MAX(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as max_close_20d,
                    MIN(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 39 PRECEDING AND CURRENT ROW) as min_close_40d,
                    -- Close prices at trading day offsets (63, 126, 189, 252)
                    LAG(close, 63) OVER (PARTITION BY symbol ORDER BY date) as close_3m,
                    LAG(close, 126) OVER (PARTITION BY symbol ORDER BY date) as close_6m,
                    LAG(close, 189) OVER (PARTITION BY symbol ORDER BY date) as close_9m,
                    LAG(close, 252) OVER (PARTITION BY symbol ORDER BY date) as close_12m
                FROM daily_bars
            ),
            price_lags_derived AS (
                SELECT
                    symbol,
                    date,
                    close,
                    volume,
                    vol_50d_ma,
                    adr_20d,
                    close_3m,
                    close_6m,
                    close_9m,
                    close_12m,
                    min_close_20d,
                    max_close_20d,
                    LAG(min_close_40d, 20) OVER (PARTITION BY symbol ORDER BY date) as pp_min_close_prior_40d
                FROM price_lags_base
            ),
            returns_calc AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    volume,
                    vol_50d_ma,
                    adr_20d,
                    (close - close_3m) / NULLIF(close_3m, 0) as ret_3m,
                    (close - close_6m) / NULLIF(close_6m, 0) as ret_6m,
                    (close - close_9m) / NULLIF(close_9m, 0) as ret_9m,
                    (close - close_12m) / NULLIF(close_12m, 0) as ret_12m,
                    -- Power play run up %: peak of last 20 days vs 40-day low prior to last 20 days
                    (max_close_20d - pp_min_close_prior_40d) / NULLIF(pp_min_close_prior_40d, 0) * 100 as pp_runup_pct,
                    -- Power play drawdown %: max correction from peak in last 20 days
                    (max_close_20d - min_close_20d) / NULLIF(max_close_20d, 0) * 100 as pp_drawdown_pct
                FROM price_lags_derived
                WHERE date = (SELECT val FROM latest_date_const)
            ),
            weighted_scores AS (
                SELECT
                    symbol,
                    date,
                    close,
                    vol_50d_ma,
                    adr_20d,
                    pp_runup_pct,
                    pp_drawdown_pct,
                    (COALESCE(ret_3m, 0) * 0.4) + 
                    (COALESCE(ret_6m, 0) * 0.2) + 
                    (COALESCE(ret_9m, 0) * 0.2) + 
                    (COALESCE(ret_12m, 0) * 0.2) as rs_score
                FROM returns_calc
            ),
            percentile_ranks AS (
                SELECT
                    symbol,
                    date,
                    close,
                    vol_50d_ma,
                    adr_20d,
                    pp_runup_pct,
                    pp_drawdown_pct,
                    rs_score,
                    CAST(PERCENT_RANK() OVER (ORDER BY rs_score) * 100 AS INTEGER) as rs_rank
                FROM weighted_scores
            )
            SELECT symbol, date, close, vol_50d_ma, rs_score, rs_rank, adr_20d, pp_runup_pct, pp_drawdown_pct
            FROM percentile_ranks
            ORDER BY rs_rank DESC;
        """
        
        candidates = []
        with self.get_connection() as conn:
            # 1. Execute calculation and retrieve results in memory
            results = conn.execute(query_calculate_and_rank).fetchall()
            
            # 2. Update the daily_bars table with calculated values for matched date
            if results:
                # Store in a temporary table to execute bulk update
                # Create df from results
                import pandas as pd
                temp_df = pd.DataFrame(results, columns=[
                    "symbol", "date", "close", "vol_50d_ma", "rs_score", "rs_rank", 
                    "adr_20d", "pp_runup_pct", "pp_drawdown_pct"
                ])
                conn.execute("CREATE OR REPLACE TEMP TABLE temp_updates AS SELECT * FROM temp_df")
                
                # Execute merge
                conn.execute("""
                    UPDATE daily_bars
                    SET 
                        vol_50d_ma = src.vol_50d_ma,
                        rs_score = src.rs_score,
                        rs_rank = src.rs_rank,
                        adr_20d = src.adr_20d,
                        pp_runup_pct = src.pp_runup_pct,
                        pp_drawdown_pct = src.pp_drawdown_pct
                    FROM temp_updates src
                    WHERE daily_bars.symbol = src.symbol AND daily_bars.date = src.date
                """)
                conn.execute("DROP TABLE temp_updates")
                
                # 3. Filter candidates passing price, volume and min_rank thresholds
                for row in results:
                    symbol, date, close, vol_50d, score, rank, adr, pp_runup, pp_drawdown = row
                    if close >= min_price and vol_50d >= min_vol_sma and rank >= min_rank:
                        candidates.append({
                            "symbol": symbol,
                            "date": date.strftime("%Y-%m-%d") if date else None,
                            "close": close,
                            "vol_50d_ma": vol_50d,
                            "rs_score": score,
                            "rs_rank": rank,
                            "adr_20d": adr,
                            "pp_runup_pct": pp_runup,
                            "pp_drawdown_pct": pp_drawdown
                        })
                        
        return candidates
