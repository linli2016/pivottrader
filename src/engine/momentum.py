import duckdb
from typing import List, Dict, Any

class MomentumEngine:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_connection(self):
        return duckdb.connect(self.db_path)

    def detect_vcp(self, highs: List[float], lows: List[float], dates: List[Any], window: int = 4) -> dict:
        """
        Detects Volatility Contraction Pattern (VCP) in price history.
        Expects highs, lows, and dates to be in chronological ascending order.
        Returns a dict with VCP metrics or None.
        """
        n = len(highs)
        if n < window * 2 + 5:
            return None
            
        peaks = []
        troughs = []
        
        # 1. Identify local extrema
        for i in range(window, n - window):
            high_chunk = highs[i - window : i + window + 1]
            low_chunk = lows[i - window : i + window + 1]
            if highs[i] == max(high_chunk):
                peaks.append((i, highs[i], dates[i]))
            elif lows[i] == min(low_chunk):
                troughs.append((i, lows[i], dates[i]))
                
        # 2. Sort and alternate peaks/troughs
        all_extrema = sorted(
            [(idx, p, d, 'peak') for idx, p, d in peaks] + [(idx, t, d, 'trough') for idx, t, d in troughs],
            key=lambda x: x[0]
        )
        
        alternating = []
        for item in all_extrema:
            if not alternating:
                alternating.append(item)
                continue
            last_type = alternating[-1][3]
            if item[3] != last_type:
                alternating.append(item)
            else:
                # If consecutive extrema of same type, keep the most extreme
                if last_type == 'peak' and item[1] > alternating[-1][1]:
                    alternating[-1] = item
                elif last_type == 'trough' and item[1] < alternating[-1][1]:
                    alternating[-1] = item

        # 3. Calculate contraction swings (from peak to subsequent trough)
        contractions = []
        for i in range(len(alternating) - 1):
            if alternating[i][3] == 'peak' and alternating[i+1][3] == 'trough':
                p_idx, p_price, p_date, _ = alternating[i]
                t_idx, t_price, t_date, _ = alternating[i+1]
                depth = (p_price - t_price) / p_price * 100
                contractions.append({
                    "peak_idx": p_idx,
                    "trough_idx": t_idx,
                    "depth": depth
                })
                
        # We need at least 2 contractions (2T) to form a VCP
        if len(contractions) < 2:
            return None
            
        # Inspect the last 2 to 4 contractions
        recent = contractions[-3:] if len(contractions) >= 3 else contractions[-2:]
        depths = [c["depth"] for c in recent]
        
        # Check if they are progressively shrinking (monotonic decrease)
        is_contracting = True
        for i in range(len(depths) - 1):
            if depths[i+1] >= depths[i]:
                is_contracting = False
                break
                
        # The final contraction must be tight (typically <= 10.0%)
        is_final_tight = depths[-1] <= 10.0
        
        if is_contracting and is_final_tight:
            return {
                "vcp_is_setup": True,
                "vcp_troughs": len(depths),
                "vcp_depths": ",".join(f"{d:.1f}" for d in depths)
            }
            
        return None

    def calculate_and_store_momentum_metrics(self) -> None:
        """
        Executes vectorized SQL calculations in DuckDB to:
        1. Calculate 50-day average volume, SMAs (50, 150, 200) and ATR% historically for all dates.
        2. Calculate weighted Momentum Scores & Percentile RS Ranks historically (using PARTITION BY date).
        3. Store these historical metrics directly in daily_bars.
        4. For the latest date candidates, calculate VCP and Power Play / IPO base drawdowns in python, and store.
        """
        query_update_historical = """
            WITH price_lags_raw AS (
                SELECT
                    db.rowid as r_id,
                    db.symbol,
                    db.date,
                    db.close,
                    db.high,
                    db.low,
                    db.volume,
                    LAG(db.close, 1) OVER (PARTITION BY db.symbol ORDER BY db.date) as prev_close
                FROM daily_bars db
            ),
            price_lags_base AS (
                SELECT 
                    r_id,
                    symbol,
                    date,
                    close,
                    high,
                    low,
                    volume,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as sma_50,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 149 PRECEDING AND CURRENT ROW) as sma_150,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) as sma_200,
                    AVG(volume) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as vol_50d_ma,
                    GREATEST(
                        high - low,
                        COALESCE(ABS(high - prev_close), 0),
                        COALESCE(ABS(low - prev_close), 0)
                    ) as tr,
                    LAG(close, 63) OVER (PARTITION BY symbol ORDER BY date) as close_3m,
                    LAG(close, 126) OVER (PARTITION BY symbol ORDER BY date) as close_6m,
                    LAG(close, 189) OVER (PARTITION BY symbol ORDER BY date) as close_9m,
                    LAG(close, 252) OVER (PARTITION BY symbol ORDER BY date) as close_12m
                FROM price_lags_raw
            ),
            price_lags_derived AS (
                SELECT
                    r_id,
                    symbol,
                    date,
                    close,
                    vol_50d_ma,
                    AVG(tr) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) / NULLIF(close, 0) * 100 as atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    (close - COALESCE(close_3m, close)) / NULLIF(COALESCE(close_3m, close), 0) as ret_3m,
                    (close - COALESCE(close_6m, close)) / NULLIF(COALESCE(close_6m, close), 0) as ret_6m,
                    (close - COALESCE(close_9m, close)) / NULLIF(COALESCE(close_9m, close), 0) as ret_9m,
                    (close - COALESCE(close_12m, close)) / NULLIF(COALESCE(close_12m, close), 0) as ret_12m
                FROM price_lags_base
            ),
            weighted_scores AS (
                SELECT
                    r_id,
                    date,
                    vol_50d_ma,
                    atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    (COALESCE(ret_3m, 0) * 0.4) + 
                    (COALESCE(ret_6m, 0) * 0.2) + 
                    (COALESCE(ret_9m, 0) * 0.2) + 
                    (COALESCE(ret_12m, 0) * 0.2) as rs_score
                FROM price_lags_derived
            ),
            percentile_ranks AS (
                SELECT
                    r_id,
                    vol_50d_ma,
                    atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    rs_score,
                    CAST(PERCENT_RANK() OVER (PARTITION BY date ORDER BY rs_score) * 100 AS INTEGER) as rs_rank
                FROM weighted_scores
            )
            UPDATE daily_bars
            SET
                sma_50 = src.sma_50,
                sma_150 = src.sma_150,
                sma_200 = src.sma_200,
                vol_50d_ma = src.vol_50d_ma,
                adr_20d = src.atr_20d,
                atr_20d = src.atr_20d,
                rs_score = src.rs_score,
                rs_rank = src.rs_rank
            FROM percentile_ranks src
            WHERE daily_bars.rowid = src.r_id;
        """

        query_latest_metrics = """
            WITH latest_date_const AS (
                SELECT MAX(date) as val FROM daily_bars
            ),
            price_lags_raw AS (
                SELECT
                    db.*,
                    s.ipo_date,
                    LAG(db.close, 1) OVER (PARTITION BY db.symbol ORDER BY db.date) as prev_close
                FROM daily_bars db
                LEFT JOIN symbols s ON db.symbol = s.symbol
            ),
            price_lags_base AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    high,
                    low,
                    volume,
                    vol_50d_ma,
                    sma_50,
                    sma_150,
                    sma_200,
                    rs_score,
                    rs_rank,
                    atr_20d,
                    -- Rolling 30-day peak high and its date
                    MAX(high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as running_peak_30d,
                    ARG_MAX(date, high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as peak_date_30d,
                    -- Daily run-up % from lowest low in prior 40 days
                    (high - MIN(low) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 39 PRECEDING AND CURRENT ROW)) / 
                    NULLIF(MIN(low) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 39 PRECEDING AND CURRENT ROW), 0) * 100 as daily_runup_pct,
                    -- IPO base metrics calculations
                    COALESCE(
                        DATEDIFF('day', CAST(ipo_date AS DATE), date),
                        DATEDIFF('day', MIN(date) OVER (PARTITION BY symbol), date)
                    ) as ipo_days_count,
                    -- Running peak high and its date for IPO base depth
                    MAX(high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_peak_all_time,
                    ARG_MAX(date, high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as ath_date
                FROM price_lags_raw
            ),
            price_lags_derived AS (
                SELECT
                    symbol,
                    date,
                    close,
                    volume,
                    vol_50d_ma,
                    atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    rs_score,
                    rs_rank,
                    running_peak_30d,
                    -- Power play run up %: the runup on the peak high day of the last 30 days
                    ARG_MAX(daily_runup_pct, high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as pp_runup_pct,
                    -- Power play drawdown %: correction from 30-day peak high to lowest low on or after peak date
                    (running_peak_30d - (SELECT MIN(d.low) FROM daily_bars d WHERE d.symbol = price_lags_base.symbol AND d.date >= price_lags_base.peak_date_30d AND d.date <= price_lags_base.date)) / NULLIF(running_peak_30d, 0) * 100 as pp_drawdown_pct,
                    -- Power play days since 30-day peak high
                    DATEDIFF('day', peak_date_30d, date) as pp_days_since_peak,
                    -- IPO base fields
                    ipo_days_count,
                    running_peak_all_time as ipo_all_time_high,
                    -- IPO base depth: correction from all-time high to lowest low on or after ATH date
                    (running_peak_all_time - (SELECT MIN(d.low) FROM daily_bars d WHERE d.symbol = price_lags_base.symbol AND d.date >= price_lags_base.ath_date AND d.date <= price_lags_base.date)) / NULLIF(running_peak_all_time, 0) * 100 as ipo_base_depth
                FROM price_lags_base
            ),
            returns_calc AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    volume,
                    vol_50d_ma,
                    atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    rs_score,
                    rs_rank,
                    pp_drawdown_pct,
                    pp_runup_pct,
                    pp_days_since_peak,
                    ipo_days_count,
                    ipo_all_time_high,
                    (ipo_all_time_high - close) / NULLIF(ipo_all_time_high, 0) * 100 as ipo_drawdown_from_high,
                    ipo_base_depth
                FROM price_lags_derived
                WHERE date = (SELECT val FROM latest_date_const)
            )
            SELECT symbol, date, close, vol_50d_ma, rs_score, rs_rank, atr_20d, pp_runup_pct, pp_drawdown_pct, pp_days_since_peak, sma_50, sma_150, sma_200, ipo_days_count, ipo_all_time_high, ipo_drawdown_from_high, ipo_base_depth
            FROM returns_calc;
        """
        
        with self.get_connection() as conn:
            # 1. Run historical metric update for all dates
            print("Calculating and updating historical SMAs and RS metrics...")
            conn.execute(query_update_historical)
            
            # 2. Execute VCP and Power Play evaluations on latest date candidates
            print("Running VCP and drawdown updates on the latest date's candidates...")
            results = conn.execute(query_latest_metrics).fetchall()
            
            # 3. Update the daily_bars table with calculated VCP/PowerPlay/IPO values for matched date
            if results:
                # 3.1 Fetch historical high, low, close for VCP analysis
                history_rows = conn.execute("""
                    SELECT symbol, date, high, low, close 
                    FROM daily_bars 
                    ORDER BY symbol, date ASC
                """).fetchall()
                
                from collections import defaultdict
                symbol_history = defaultdict(list)
                for sym, dt, high, low, close in history_rows:
                    symbol_history[sym].append((high, low, close, dt))
                    
                # Evaluate VCP for each candidate row in results
                results_with_vcp = []
                for row in results:
                    symbol = row[0]
                    history = symbol_history.get(symbol, [])
                    v_res = {"vcp_is_setup": False, "vcp_troughs": None, "vcp_depths": None}
                    
                    if len(history) >= 20:
                        highs = [h[0] for h in history]
                        lows = [h[1] for h in history]
                        dates = [h[3] for h in history]
                        v_detected = self.detect_vcp(highs, lows, dates, window=4)
                        if v_detected:
                            v_res = v_detected
                            
                    # row: symbol, date, close, vol_50d_ma, rs_score, rs_rank, atr_20d, pp_runup_pct, pp_drawdown_pct, pp_days_since_peak, sma_50, sma_150, sma_200, ipo_days, ipo_ath, ipo_dfh, ipo_depth
                    results_with_vcp.append(list(row) + [v_res["vcp_is_setup"], v_res["vcp_troughs"], v_res["vcp_depths"]])

                # Store in a temporary table to execute bulk update
                import pandas as pd
                temp_df = pd.DataFrame(results_with_vcp, columns=[
                    "symbol", "date", "close", "vol_50d_ma", "rs_score", "rs_rank", 
                    "atr_20d", "pp_runup_pct", "pp_drawdown_pct", "pp_days_since_peak", "sma_50", "sma_150", "sma_200",
                    "ipo_days_count", "ipo_all_time_high", "ipo_drawdown_from_high", "ipo_base_depth",
                    "vcp_is_setup", "vcp_troughs", "vcp_depths"
                ])
                conn.execute("CREATE OR REPLACE TEMP TABLE temp_updates AS SELECT * FROM temp_df")
                
                # Execute merge
                conn.execute("""
                    UPDATE daily_bars
                    SET 
                        pp_runup_pct = src.pp_runup_pct,
                        pp_drawdown_pct = src.pp_drawdown_pct,
                        pp_days_since_peak = src.pp_days_since_peak,
                        vcp_is_setup = src.vcp_is_setup,
                        vcp_troughs = src.vcp_troughs,
                        vcp_depths = src.vcp_depths,
                        ipo_days_count = src.ipo_days_count,
                        ipo_all_time_high = src.ipo_all_time_high,
                        ipo_drawdown_from_high = src.ipo_drawdown_from_high,
                        ipo_base_depth = src.ipo_base_depth
                    FROM temp_updates src
                    WHERE daily_bars.symbol = src.symbol AND daily_bars.date = src.date
                """)
                conn.execute("DROP TABLE temp_updates")

    def get_momentum_candidates(self, min_price: float = 5.00, min_vol_sma: int = 300000, min_rank: int = 70) -> List[Dict[str, Any]]:
        """
        Retrieves candidates passing price, volume, and momentum rank thresholds from daily_bars
        for the latest date in the database.
        """
        query = """
            WITH latest_date_const AS (
                SELECT MAX(date) as val FROM daily_bars
            )
            SELECT 
                symbol, date, close, vol_50d_ma, rs_score, rs_rank, atr_20d, pp_runup_pct, pp_drawdown_pct, 
                sma_50, sma_150, sma_200, vcp_is_setup, vcp_troughs, vcp_depths, 
                ipo_days_count, ipo_all_time_high, ipo_drawdown_from_high, ipo_base_depth
            FROM daily_bars
            WHERE date = (SELECT val FROM latest_date_const)
              AND close >= ?
              AND vol_50d_ma >= ?
              AND rs_rank >= ?
            ORDER BY rs_rank DESC;
        """
        
        candidates = []
        with self.get_connection() as conn:
            res = conn.execute(query, [min_price, min_vol_sma, min_rank]).fetchall()
            for row in res:
                candidates.append({
                    "symbol": row[0],
                    "date": row[1].strftime("%Y-%m-%d") if row[1] else None,
                    "close": row[2],
                    "vol_50d_ma": row[3],
                    "rs_score": row[4],
                    "rs_rank": row[5],
                    "atr_20d": row[6],
                    "pp_runup_pct": row[7],
                    "pp_drawdown_pct": row[8],
                    "sma_50": row[9],
                    "sma_150": row[10],
                    "sma_200": row[11],
                    "vcp_is_setup": bool(row[12]) if row[12] is not None else False,
                    "vcp_troughs": row[13],
                    "vcp_depths": row[14],
                    "ipo_days_count": row[15],
                    "ipo_all_time_high": row[16],
                    "ipo_drawdown_from_high": row[17],
                    "ipo_base_depth": row[18]
                })
        return candidates
