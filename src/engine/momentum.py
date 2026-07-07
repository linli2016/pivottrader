import duckdb
from typing import List, Dict, Any

class MomentumEngine:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_connection(self):
        return duckdb.connect(self.db_path)

    def detect_vcp(self, prices: List[float], dates: List[Any], window: int = 4) -> dict:
        """
        Detects Volatility Contraction Pattern (VCP) in price history.
        Expects prices and dates to be in chronological ascending order.
        Returns a dict with VCP metrics or None.
        """
        n = len(prices)
        if n < window * 2 + 5:
            return None
            
        peaks = []
        troughs = []
        
        # 1. Identify local extrema
        for i in range(window, n - window):
            chunk = prices[i - window : i + window + 1]
            if prices[i] == max(chunk):
                peaks.append((i, prices[i], dates[i]))
            elif prices[i] == min(chunk):
                troughs.append((i, prices[i], dates[i]))
                
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
                    -- Rolling price moving averages for Stage 2
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as sma_50,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 149 PRECEDING AND CURRENT ROW) as sma_150,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) as sma_200,
                    -- Rolling 50-day simple moving average of volume
                    AVG(volume) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as vol_50d_ma,
                    -- Rolling 20-day Average Daily Range (ADR%)
                    AVG((high - low) / NULLIF(low, 0) * 100) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as adr_20d,
                    -- Rolling 20-day peak close
                    MAX(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as running_peak_20d,
                    -- Helper rolling metrics for Power Play
                    MAX(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as max_close_20d,
                    MIN(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 39 PRECEDING AND CURRENT ROW) as min_close_40d,
                    -- Close prices at trading day offsets (63, 126, 189, 252)
                    LAG(close, 63) OVER (PARTITION BY symbol ORDER BY date) as close_3m,
                    LAG(close, 126) OVER (PARTITION BY symbol ORDER BY date) as close_6m,
                    LAG(close, 189) OVER (PARTITION BY symbol ORDER BY date) as close_9m,
                    LAG(close, 252) OVER (PARTITION BY symbol ORDER BY date) as close_12m,
                    -- IPO base metrics calculations
                    COUNT(*) OVER (PARTITION BY symbol) as ipo_days_count,
                    MAX(close) OVER (PARTITION BY symbol) as ipo_all_time_high,
                    MAX(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_peak_all_time
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
                    sma_50,
                    sma_150,
                    sma_200,
                    close_3m,
                    close_6m,
                    close_9m,
                    close_12m,
                    max_close_20d,
                    LAG(min_close_40d, 20) OVER (PARTITION BY symbol ORDER BY date) as pp_min_close_prior_40d,
                    -- Power play drawdown %: max correction from a rolling peak close in last 20 days
                    MAX((running_peak_20d - close) / NULLIF(running_peak_20d, 0) * 100) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as pp_drawdown_pct,
                    -- IPO base fields
                    ipo_days_count,
                    ipo_all_time_high,
                    MAX((running_peak_all_time - close) / NULLIF(running_peak_all_time, 0) * 100) OVER (PARTITION BY symbol) as ipo_base_depth
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
                    sma_50,
                    sma_150,
                    sma_200,
                    pp_drawdown_pct,
                    (close - close_3m) / NULLIF(close_3m, 0) as ret_3m,
                    (close - close_6m) / NULLIF(close_6m, 0) as ret_6m,
                    (close - close_9m) / NULLIF(close_9m, 0) as ret_9m,
                    (close - close_12m) / NULLIF(close_12m, 0) as ret_12m,
                    -- Power play run up %: peak of last 20 days vs 40-day low prior to last 20 days
                    (max_close_20d - pp_min_close_prior_40d) / NULLIF(pp_min_close_prior_40d, 0) * 100 as pp_runup_pct,
                    -- IPO base fields
                    ipo_days_count,
                    ipo_all_time_high,
                    (ipo_all_time_high - close) / NULLIF(ipo_all_time_high, 0) * 100 as ipo_drawdown_from_high,
                    ipo_base_depth
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
                    sma_50,
                    sma_150,
                    sma_200,
                    ipo_days_count,
                    ipo_all_time_high,
                    ipo_drawdown_from_high,
                    ipo_base_depth,
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
                    sma_50,
                    sma_150,
                    sma_200,
                    ipo_days_count,
                    ipo_all_time_high,
                    ipo_drawdown_from_high,
                    ipo_base_depth,
                    rs_score,
                    CAST(PERCENT_RANK() OVER (ORDER BY rs_score) * 100 AS INTEGER) as rs_rank
                FROM weighted_scores
            )
            SELECT symbol, date, close, vol_50d_ma, rs_score, rs_rank, adr_20d, pp_runup_pct, pp_drawdown_pct, sma_50, sma_150, sma_200, ipo_days_count, ipo_all_time_high, ipo_drawdown_from_high, ipo_base_depth
            FROM percentile_ranks
            ORDER BY rs_rank DESC;
        """
        
        candidates = []
        with self.get_connection() as conn:
            # 1. Execute calculation and retrieve results in memory
            results = conn.execute(query_calculate_and_rank).fetchall()
            
            # 2. Update the daily_bars table with calculated values for matched date
            if results:
                # 2.1 Fetch historical closes for VCP analysis
                history_rows = conn.execute("""
                    SELECT symbol, date, close 
                    FROM daily_bars 
                    ORDER BY symbol, date ASC
                """).fetchall()
                
                from collections import defaultdict
                symbol_history = defaultdict(list)
                for sym, dt, close in history_rows:
                    symbol_history[sym].append((close, dt))
                    
                # Evaluate VCP for each candidate row in results
                results_with_vcp = []
                for row in results:
                    symbol = row[0]
                    history = symbol_history.get(symbol, [])
                    v_res = {"vcp_is_setup": False, "vcp_troughs": None, "vcp_depths": None}
                    
                    if len(history) >= 20:
                        prices = [h[0] for h in history]
                        dates = [h[1] for h in history]
                        v_detected = self.detect_vcp(prices, dates, window=4)
                        if v_detected:
                            v_res = v_detected
                            
                    # row: symbol, date, close, vol_50d_ma, rs_score, rs_rank, adr_20d, pp_runup_pct, pp_drawdown_pct, sma_50, sma_150, sma_200, ipo_days, ipo_ath, ipo_dfh, ipo_depth
                    results_with_vcp.append(list(row) + [v_res["vcp_is_setup"], v_res["vcp_troughs"], v_res["vcp_depths"]])

                # Store in a temporary table to execute bulk update
                import pandas as pd
                temp_df = pd.DataFrame(results_with_vcp, columns=[
                    "symbol", "date", "close", "vol_50d_ma", "rs_score", "rs_rank", 
                    "adr_20d", "pp_runup_pct", "pp_drawdown_pct", "sma_50", "sma_150", "sma_200",
                    "ipo_days_count", "ipo_all_time_high", "ipo_drawdown_from_high", "ipo_base_depth",
                    "vcp_is_setup", "vcp_troughs", "vcp_depths"
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
                        pp_drawdown_pct = src.pp_drawdown_pct,
                        sma_50 = src.sma_50,
                        sma_150 = src.sma_150,
                        sma_200 = src.sma_200,
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
                
                # 3. Filter candidates passing price, volume and min_rank thresholds
                for row in results_with_vcp:
                    symbol, date, close, vol_50d, score, rank, adr, pp_runup, pp_drawdown, sma_50, sma_150, sma_200, ipo_days, ipo_ath, ipo_dfh, ipo_depth, vcp_is_setup, vcp_troughs, vcp_depths = row
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
                            "pp_drawdown_pct": pp_drawdown,
                            "sma_50": sma_50,
                            "sma_150": sma_150,
                            "sma_200": sma_200,
                            "vcp_is_setup": bool(vcp_is_setup),
                            "vcp_troughs": vcp_troughs,
                            "vcp_depths": vcp_depths,
                            "ipo_days_count": ipo_days,
                            "ipo_all_time_high": ipo_ath,
                            "ipo_drawdown_from_high": ipo_dfh,
                            "ipo_base_depth": ipo_depth
                        })
                        
        return candidates
