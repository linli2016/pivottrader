import duckdb
from typing import List, Dict, Any
from src.engine.setups import (
    detect_vcp,
    detect_darvas_box,
    detect_episodic_pivot,
    detect_parabolic_extension,
    detect_power_play,
    detect_breakout,
)

class MomentumEngine:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_connection(self):
        return duckdb.connect(self.db_path)

    def detect_vcp(self, highs: List[float], lows: List[float], dates: List[Any], closes: List[float] = None, window: int = 3) -> dict:
        return detect_vcp(highs, lows, dates, closes=closes, window=window)

    def detect_darvas_box(self, highs: List[float], lows: List[float], closes: List[float], dates: List[Any], window: int = 3, max_lookback_days: int = 120) -> dict:
        return detect_darvas_box(highs, lows, closes, dates, window=window, max_lookback_days=max_lookback_days)

    def detect_episodic_pivot(self, opens: List[float], highs: List[float], lows: List[float], closes: List[float], volumes: List[float], dates: List[Any]) -> dict:
        return detect_episodic_pivot(opens, highs, lows, closes, volumes, dates)

    def detect_parabolic_extension(self, highs: List[float], lows: List[float], closes: List[float], dates: List[Any], ema_10_val: float) -> dict:
        return detect_parabolic_extension(highs, lows, closes, dates, ema_10_val)

    def detect_power_play(self, highs: List[float], lows: List[float], closes: List[float], dates: List[Any], min_runup_pct: float = 100.0, max_drawdown_pct: float = 25.0) -> dict:
        return detect_power_play(highs, lows, closes, dates, min_runup_pct=min_runup_pct, max_drawdown_pct=max_drawdown_pct)

    def detect_breakout(self, highs: List[float], lows: List[float], closes: List[float], dates: List[Any], ema_10_val: float = None, ema_20_val: float = None, min_1m_ret: float = 20.0) -> dict:
        return detect_breakout(highs, lows, closes, dates, ema_10_val=ema_10_val, ema_20_val=ema_20_val, min_1m_ret=min_1m_ret)


    def calculate_and_store_momentum_metrics(self) -> None:
        """
        Executes vectorized SQL calculations in DuckDB to:
        1. Calculate 50-day average volume, SMAs (50, 150, 200) and ATR% historically for all dates.
        2. Calculate weighted Momentum Scores & Percentile RS Ranks historically (using PARTITION BY date).
        3. Store these historical metrics directly in daily_bars.
        4. For the latest date candidates, calculate VCP, Darvas Box, EP, and Parabolic metrics in python, and store.
        """
        query_update_historical = """
            WITH price_lags_raw AS (
                SELECT
                    db.rowid as r_id,
                    db.symbol,
                    db.date,
                    db.open,
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
                    open,
                    close,
                    high,
                    low,
                    volume,
                    prev_close,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as sma_7,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 64 PRECEDING AND CURRENT ROW) as sma_65,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as sma_50,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 149 PRECEDING AND CURRENT ROW) as sma_150,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) as sma_200,
                    MAX(high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 251 PRECEDING AND CURRENT ROW) as high_52w,
                    MIN(low) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 251 PRECEDING AND CURRENT ROW) as low_52w,
                    MAX(high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as peak_high_3d,
                    MIN(low) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as lowest_low_3d,
                    MAX(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as peak_close_3d,
                    MIN(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as lowest_close_3d,
                    AVG(volume) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as vol_50d_ma,
                    GREATEST(
                        high - low,
                        COALESCE(ABS(high - prev_close), 0),
                        COALESCE(ABS(low - prev_close), 0)
                    ) as tr,
                    LAG(close, 21) OVER (PARTITION BY symbol ORDER BY date) as close_1m,
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
                    AVG((high / NULLIF(low, 0) - 1.0) * 100.0) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as adr_20d,
                    AVG(tr) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) / NULLIF(close, 0) * 100 as atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    LAG(sma_200, 20) OVER (PARTITION BY symbol ORDER BY date) as sma_200_20d_ago,
                    ROUND(sma_7 / NULLIF(sma_65, 0), 4) as ti_65,
                    high_52w,
                    low_52w,
                    (high_52w - close) / NULLIF(high_52w, 0) * 100 as dist_from_52w_high,
                    (close - low_52w) / NULLIF(low_52w, 0) * 100 as dist_from_52w_low,
                    ROUND((peak_high_3d - lowest_low_3d) / NULLIF(close, 0) * 100.0, 2) as pivot_spread_pct,
                    ROUND((peak_close_3d - lowest_close_3d) / NULLIF(close, 0) * 100.0, 2) as pivot_close_clustering_pct,
                    ROUND(volume / NULLIF(vol_50d_ma, 0), 2) as pivot_vol_ratio,
                    (close - COALESCE(close_1m, close)) / NULLIF(COALESCE(close_1m, close), 0) * 100.0 as ret_1m,
                    (close - COALESCE(close_3m, close)) / NULLIF(COALESCE(close_3m, close), 0) * 100.0 as ret_3m,
                    (close - COALESCE(close_6m, close)) / NULLIF(COALESCE(close_6m, close), 0) * 100.0 as ret_6m,
                    (close - COALESCE(close_9m, close)) / NULLIF(COALESCE(close_9m, close), 0) * 100.0 as ret_9m,
                    (close - COALESCE(close_12m, close)) / NULLIF(COALESCE(close_12m, close), 0) * 100.0 as ret_12m,
                    ROUND((open - prev_close) / NULLIF(prev_close, 0) * 100.0, 2) as gap_pct,
                    ROUND(volume / NULLIF(vol_50d_ma, 0), 2) as rel_vol_50d
                FROM price_lags_base
            ),
            weighted_scores AS (
                SELECT
                    r_id,
                    date,
                    vol_50d_ma,
                    adr_20d,
                    atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    sma_200_20d_ago,
                    ti_65,
                    high_52w,
                    low_52w,
                    dist_from_52w_high,
                    dist_from_52w_low,
                    pivot_spread_pct,
                    pivot_close_clustering_pct,
                    pivot_vol_ratio,
                    ret_1m,
                    ret_3m,
                    ret_6m,
                    gap_pct,
                    rel_vol_50d,
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
                    adr_20d,
                    atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    sma_200_20d_ago,
                    ti_65,
                    high_52w,
                    low_52w,
                    dist_from_52w_high,
                    dist_from_52w_low,
                    pivot_spread_pct,
                    pivot_close_clustering_pct,
                    pivot_vol_ratio,
                    ret_1m,
                    ret_3m,
                    ret_6m,
                    gap_pct,
                    rel_vol_50d,
                    rs_score,
                    CAST(PERCENT_RANK() OVER (PARTITION BY date ORDER BY rs_score) * 100 AS INTEGER) as rs_rank
                FROM weighted_scores
            )
            UPDATE daily_bars
            SET
                sma_50 = src.sma_50,
                sma_150 = src.sma_150,
                sma_200 = src.sma_200,
                sma_200_20d_ago = src.sma_200_20d_ago,
                ti_65 = src.ti_65,
                high_52w = src.high_52w,
                low_52w = src.low_52w,
                dist_from_52w_high = src.dist_from_52w_high,
                dist_from_52w_low = src.dist_from_52w_low,
                surge_off_low_pct = src.dist_from_52w_low,
                pivot_spread_pct = src.pivot_spread_pct,
                pivot_close_clustering_pct = src.pivot_close_clustering_pct,
                pivot_vol_ratio = src.pivot_vol_ratio,
                vol_50d_ma = src.vol_50d_ma,
                adr_20d = src.adr_20d,
                atr_20d = src.atr_20d,
                ret_1m = src.ret_1m,
                ret_3m = src.ret_3m,
                ret_6m = src.ret_6m,
                gap_pct = src.gap_pct,
                rel_vol_50d = src.rel_vol_50d,
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
                    LAG(db.close, 1) OVER (PARTITION BY db.symbol ORDER BY db.date) as prev_close,
                    ROW_NUMBER() OVER (PARTITION BY db.symbol ORDER BY db.date) as row_idx
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
                    row_idx,
                    vol_50d_ma,
                    sma_50,
                    sma_150,
                    sma_200,
                    rs_score,
                    rs_rank,
                    adr_20d,
                    atr_20d,
                    ret_1m,
                    ret_3m,
                    ret_6m,
                    gap_pct,
                    rel_vol_50d,
                    -- Rolling 30-day peak high and its date and row index
                    MAX(high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as running_peak_30d,
                    ARG_MAX(date, high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as peak_date_30d,
                    ARG_MAX(row_idx, high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as peak_row_idx_30d,
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
                    adr_20d,
                    atr_20d,
                    ret_1m,
                    ret_3m,
                    ret_6m,
                    gap_pct,
                    rel_vol_50d,
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
                    -- Power play trading days since 30-day peak high
                    (row_idx - peak_row_idx_30d) as pp_days_since_peak,
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
                    adr_20d,
                    atr_20d,
                    ret_1m,
                    ret_3m,
                    ret_6m,
                    gap_pct,
                    rel_vol_50d,
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
            SELECT symbol, date, close, vol_50d_ma, rs_score, rs_rank, atr_20d, pp_runup_pct, pp_drawdown_pct, pp_days_since_peak, sma_50, sma_150, sma_200, ipo_days_count, ipo_all_time_high, ipo_drawdown_from_high, ipo_base_depth, ret_1m, gap_pct, rel_vol_50d
            FROM returns_calc;
        """
        
        with self.get_connection() as conn:
            # 1. Run historical metric update for all dates
            print("Calculating and updating historical SMAs and RS metrics...")
            conn.execute(query_update_historical)
            
            # 2. Execute VCP and Power Play evaluations on latest date candidates
            print("Running VCP and drawdown updates on the latest date's candidates...")
            results = conn.execute(query_latest_metrics).fetchall()
            
            # 3. Update the daily_bars table with calculated VCP/PowerPlay/IPO/Qullamaggie values for matched date
            if results:
                # 3.1 Fetch historical bars for VCP, EP, EMA, and Parabolic analysis
                history_rows = conn.execute("""
                    SELECT symbol, date, open, high, low, close, volume 
                    FROM daily_bars 
                    ORDER BY symbol, date ASC
                """).fetchall()
                
                from collections import defaultdict
                import pandas as pd

                symbol_history = defaultdict(list)
                for sym, dt, op, high, low, close, vol in history_rows:
                    symbol_history[sym].append((op, high, low, close, vol, dt))
                    
                # Evaluate setups for each candidate row in results
                results_with_setups = []
                for row in results:
                    symbol = row[0]
                    history = symbol_history.get(symbol, [])
                    v_res = {"vcp_is_setup": False, "vcp_troughs": None, "vcp_depths": None}
                    d_res = {"darvas_is_setup": False, "darvas_box_top": None, "darvas_box_bottom": None, "darvas_box_width_pct": None}
                    ep_res = {"ep_is_setup": False, "ep_gap_pct": None, "ep_rel_vol": None}
                    para_res = {"parabolic_short_is_setup": False, "parabolic_long_is_setup": False, "parabolic_runup_pct": None, "dist_ema10_pct": None, "parabolic_up_days": None}
                    
                    ema_10_val = None
                    ema_20_val = None
                    dist_ema10_pct = None
                    dist_ema20_pct = None

                    if len(history) >= 20:
                        opens = [h[0] for h in history]
                        highs = [h[1] for h in history]
                        lows = [h[2] for h in history]
                        closes = [h[3] for h in history]
                        volumes = [h[4] for h in history]
                        dates = [h[5] for h in history]

                        # Calculate EMA 10 & EMA 20
                        closes_series = pd.Series(closes)
                        ema_10_series = closes_series.ewm(span=10, adjust=False).mean()
                        ema_20_series = closes_series.ewm(span=20, adjust=False).mean()
                        
                        ema_10_val = round(float(ema_10_series.iloc[-1]), 2)
                        ema_20_val = round(float(ema_20_series.iloc[-1]), 2)
                        if ema_10_val > 0:
                            dist_ema10_pct = round(((closes[-1] - ema_10_val) / ema_10_val) * 100.0, 2)
                        if ema_20_val > 0:
                            dist_ema20_pct = round(((closes[-1] - ema_20_val) / ema_20_val) * 100.0, 2)

                        v_detected = self.detect_vcp(highs, lows, dates, closes=closes, window=3)
                        if v_detected:
                            v_res = v_detected
                        d_detected = self.detect_darvas_box(highs, lows, closes, dates, window=3)
                        if d_detected:
                            d_res = d_detected
                        ep_detected = self.detect_episodic_pivot(opens, highs, lows, closes, volumes, dates)
                        if ep_detected:
                            ep_res = ep_detected
                        para_detected = self.detect_parabolic_extension(highs, lows, closes, dates, ema_10_val)
                        if para_detected:
                            para_res = para_detected
                        pp_detected = self.detect_power_play(highs, lows, closes, dates)
                        breakout_detected = self.detect_breakout(highs, lows, closes, dates, ema_10_val=ema_10_val, ema_20_val=ema_20_val)
                            
                    results_with_setups.append(list(row) + [
                        v_res["vcp_is_setup"], v_res["vcp_troughs"], v_res["vcp_depths"],
                        d_res["darvas_is_setup"], d_res["darvas_box_top"], d_res["darvas_box_bottom"], d_res["darvas_box_width_pct"],
                        ema_10_val, ema_20_val, dist_ema10_pct, dist_ema20_pct,
                        ep_res["ep_is_setup"], ep_res["ep_gap_pct"], ep_res["ep_rel_vol"],
                        para_res["parabolic_short_is_setup"], para_res["parabolic_long_is_setup"], para_res["parabolic_runup_pct"], para_res.get("parabolic_up_days")
                    ])

                # Store in a temporary table to execute bulk update
                temp_df = pd.DataFrame(results_with_setups, columns=[
                    "symbol", "date", "close", "vol_50d_ma", "rs_score", "rs_rank", 
                    "atr_20d", "pp_runup_pct", "pp_drawdown_pct", "pp_days_since_peak", "sma_50", "sma_150", "sma_200",
                    "ipo_days_count", "ipo_all_time_high", "ipo_drawdown_from_high", "ipo_base_depth", "ret_1m", "gap_pct", "rel_vol_50d",
                    "vcp_is_setup", "vcp_troughs", "vcp_depths",
                    "darvas_is_setup", "darvas_box_top", "darvas_box_bottom", "darvas_box_width_pct",
                    "ema_10", "ema_20", "dist_ema10_pct", "dist_ema20_pct",
                    "ep_is_setup", "ep_gap_pct", "ep_rel_vol",
                    "parabolic_short_is_setup", "parabolic_long_is_setup", "parabolic_runup_pct", "parabolic_up_days"
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
                        ipo_base_depth = src.ipo_base_depth,
                        darvas_is_setup = src.darvas_is_setup,
                        darvas_box_top = src.darvas_box_top,
                        darvas_box_bottom = src.darvas_box_bottom,
                        darvas_box_width_pct = src.darvas_box_width_pct,
                        ema_10 = src.ema_10,
                        ema_20 = src.ema_20,
                        dist_ema10_pct = src.dist_ema10_pct,
                        dist_ema20_pct = src.dist_ema20_pct,
                        ep_is_setup = src.ep_is_setup,
                        ep_gap_pct = src.ep_gap_pct,
                        ep_rel_vol = src.ep_rel_vol,
                        parabolic_short_is_setup = src.parabolic_short_is_setup,
                        parabolic_long_is_setup = src.parabolic_long_is_setup,
                        parabolic_runup_pct = src.parabolic_runup_pct,
                        parabolic_up_days = src.parabolic_up_days
                    FROM temp_updates src
                    WHERE daily_bars.symbol = src.symbol AND daily_bars.date = src.date
                """)
                conn.execute("DROP TABLE temp_updates")

    def get_momentum_candidates(self, min_price: float = 5.00, min_vol_sma: int = 100000, min_rank: int = 70) -> List[Dict[str, Any]]:
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
