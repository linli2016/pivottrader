import duckdb
from typing import List, Dict, Any

class MomentumEngine:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_connection(self):
        return duckdb.connect(self.db_path)

    def detect_vcp(self, highs: List[float], lows: List[float], dates: List[Any], closes: List[float] = None, window: int = 3) -> dict:
        """
        Detects Volatility Contraction Pattern (VCP) from 52-week high point to now.
        Criteria:
        1. Current price is within 15% range of the 52-week high.
        2. At least 2 contractions occurred from the 52-week high point to current date.
        """
        n = len(highs)
        if n < window * 2 + 5:
            return None

        current_close = closes[-1] if closes else highs[-1]

        # 1. 52-Week High Calculation (last 252 trading days)
        lookback_52w = min(n, 252)
        sub_highs = highs[-lookback_52w:]
        high_52w = max(sub_highs)
        high_52w_idx = n - lookback_52w + sub_highs.index(high_52w)

        # Requirement 1: Current price must be within 15% range of 52-week high
        dist_from_52w = ((high_52w - current_close) / high_52w) * 100.0
        if dist_from_52w > 15.0:
            return None

        # 2. Identify local extrema starting from 52-week high point
        peaks = [(high_52w_idx, high_52w, dates[high_52w_idx])]
        troughs = []
        
        start_scan = max(high_52w_idx + 1, window)
        end_scan = n - window

        for i in range(start_scan, end_scan):
            high_chunk = highs[i - window : min(n, i + window + 1)]
            low_chunk = lows[i - window : min(n, i + window + 1)]
            if highs[i] == max(high_chunk) and i > high_52w_idx:
                peaks.append((i, highs[i], dates[i]))
            if lows[i] == min(low_chunk) and i > high_52w_idx:
                troughs.append((i, lows[i], dates[i]))
                
        # If no local troughs identified by window, check for minimum low since 52w high
        if not troughs and n - 1 > high_52w_idx:
            recent_lows = lows[high_52w_idx + 1:]
            min_l = min(recent_lows)
            min_l_idx = high_52w_idx + 1 + recent_lows.index(min_l)
            troughs.append((min_l_idx, min_l, dates[min_l_idx]))

        if not troughs:
            return None

        # Sort and construct alternating peaks and troughs
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
                if last_type == 'peak' and item[1] > alternating[-1][1]:
                    alternating[-1] = item
                elif last_type == 'trough' and item[1] < alternating[-1][1]:
                    alternating[-1] = item

        # Filter out minor interior bounces
        min_rebound_ratio = 0.35
        filtered_extrema = []
        for item in alternating:
            if not filtered_extrema:
                filtered_extrema.append(item)
                continue
                
            last_item = filtered_extrema[-1]
            if item[3] == 'trough':
                if last_item[3] == 'trough':
                    if item[1] < last_item[1]:
                        filtered_extrema[-1] = item
                else:
                    filtered_extrema.append(item)
            elif item[3] == 'peak':
                if last_item[3] == 'trough' and len(filtered_extrema) >= 2:
                    prev_peak = filtered_extrema[-2]
                    drop = prev_peak[1] - last_item[1]
                    rally = item[1] - last_item[1]
                    
                    if drop > 0 and (rally / drop >= min_rebound_ratio or item[1] >= prev_peak[1] * 0.95):
                        filtered_extrema.append(item)
                    else:
                        pass
                else:
                    if last_item[3] == 'peak':
                        if item[1] > last_item[1]:
                            filtered_extrema[-1] = item
                    else:
                        filtered_extrema.append(item)

        # Calculate maximum contraction depth for each wave from 52w high to now
        contractions = []
        peaks_list = [item for item in filtered_extrema if item[3] == 'peak']
        
        for k in range(len(peaks_list)):
            p_idx, p_price, p_date, _ = peaks_list[k]
            next_p_idx = peaks_list[k+1][0] if k + 1 < len(peaks_list) else n - 1
            
            wave_lows = lows[p_idx : next_p_idx + 1]
            if not wave_lows:
                continue
            min_low = min(wave_lows)
            min_low_idx = p_idx + wave_lows.index(min_low)
            
            depth = (p_price - min_low) / p_price * 100.0
            if depth > 0.5:
                contractions.append({
                    "peak_idx": p_idx,
                    "peak_price": p_price,
                    "trough_idx": min_low_idx,
                    "depth": depth
                })
                
        # Requirement 2: Must have at least 2 contractions from the 52-week high point to now
        if len(contractions) < 2:
            return None
            
        base_contractions = contractions[-4:] if len(contractions) >= 4 else contractions
        depths = [c["depth"] for c in base_contractions]
        
        is_contracting = True
        for i in range(len(depths) - 1):
            if depths[i+1] > depths[i] * 1.05:
                is_contracting = False
                break
                
        is_final_tight = depths[-1] <= 12.0
        is_not_extended = highs[-1] <= high_52w * 1.05
        
        if (is_contracting or is_final_tight) and is_not_extended:
            return {
                "vcp_is_setup": True,
                "vcp_troughs": len(depths),
                "vcp_depths": ",".join(f"{d:.1f}" for d in depths)
            }
            
        return None

    def detect_darvas_box(self, highs: List[float], lows: List[float], closes: List[float], dates: List[Any], window: int = 3, max_lookback_days: int = 120) -> dict:
        """
        Detects Darvas Box consolidation / breakout pattern in recent price history.
        Expects highs, lows, closes, and dates to be in chronological ascending order.
        Limits detection to the active base window (last 120 trading days).
        Returns a dict with Darvas Box metrics or None.
        """
        n = len(highs)
        if n < window * 2 + 5:
            return None

        start_idx = max(0, n - max_lookback_days)
        
        # 1. Identify Box Top (Peak high where subsequent 3 days do NOT exceed that high)
        box_top_idx = None
        box_top_price = None

        for i in range(n - 1 - window, max(start_idx, window), -1):
            is_top = True
            for k in range(1, window + 1):
                if highs[i + k] >= highs[i]:
                    is_top = False
                    break
            if is_top:
                box_top_idx = i
                box_top_price = highs[i]
                break

        if box_top_idx is None:
            return None

        # 2. Identify Box Bottom (Lowest low after box top where subsequent 3 days do NOT undercut that low)
        box_bottom_idx = None
        box_bottom_price = None

        for j in range(box_top_idx + 1, n - window):
            is_bottom = True
            for k in range(1, window + 1):
                if j + k < n and lows[j + k] <= lows[j]:
                    is_bottom = False
                    break
            if is_bottom:
                if box_bottom_price is None or lows[j] < box_bottom_price:
                    box_bottom_idx = j
                    box_bottom_price = lows[j]

        if box_bottom_price is None or box_bottom_price >= box_top_price:
            return None

        # 3. Check box validity:
        current_close = closes[-1]
        current_low = lows[-1]

        if current_low < box_bottom_price * 0.98 or current_close > box_top_price * 1.08:
            return None

        width_pct = ((box_top_price - box_bottom_price) / box_top_price) * 100.0

        return {
            "darvas_is_setup": True,
            "darvas_box_top": round(box_top_price, 2),
            "darvas_box_bottom": round(box_bottom_price, 2),
            "darvas_box_width_pct": round(width_pct, 2)
        }

    def detect_episodic_pivot(self, opens: List[float], highs: List[float], lows: List[float], closes: List[float], volumes: List[float], dates: List[Any]) -> dict:
        """
        Detects Episodic Pivot (EP) setup on the latest trading day.
        Criteria:
        1. Gap Up % >= 10.0% (Open vs Previous Close).
        2. Relative Volume >= 2.5x 50-day average volume.
        """
        n = len(closes)
        if n < 51:
            return None

        prev_close = closes[-2]
        today_open = opens[-1]
        today_vol = volumes[-1]
        vol_50d = sum(volumes[-51:-1]) / 50.0

        if prev_close <= 0 or vol_50d <= 0:
            return None

        gap_pct = ((today_open - prev_close) / prev_close) * 100.0
        rel_vol = today_vol / vol_50d

        if gap_pct >= 10.0 and rel_vol >= 2.5:
            return {
                "ep_is_setup": True,
                "ep_gap_pct": round(gap_pct, 2),
                "ep_rel_vol": round(rel_vol, 2)
            }
        return None

    def detect_parabolic_extension(self, highs: List[float], lows: List[float], closes: List[float], dates: List[Any], ema_10_val: float) -> dict:
        """
        Detects Parabolic Short / Long setups.
        Short Criteria:
        1. Fast 3 to 10 day gain >= +40%.
        2. Distance above 10-day EMA >= +18%.
        Long Criteria:
        1. Fast 3 to 10 day drop <= -30%.
        2. Distance below 10-day EMA <= -18%.
        """
        n = len(closes)
        if n < 10 or not ema_10_val or ema_10_val <= 0:
            return None

        window_highs = highs[-10:]
        window_lows = lows[-10:]
        current_close = closes[-1]

        max_h = max(window_highs)
        min_l = min(window_lows)

        runup_pct = ((max_h - min_l) / min_l) * 100.0 if min_l > 0 else 0.0
        drop_pct = ((max_h - min_l) / max_h) * 100.0 if max_h > 0 else 0.0

        dist_ema10_pct = ((current_close - ema_10_val) / ema_10_val) * 100.0

        is_short = runup_pct >= 40.0 and dist_ema10_pct >= 18.0
        is_long = drop_pct >= 30.0 and dist_ema10_pct <= -18.0

        if is_short or is_long:
            return {
                "parabolic_short_is_setup": is_short,
                "parabolic_long_is_setup": is_long,
                "parabolic_runup_pct": round(runup_pct, 2) if is_short else round(-drop_pct, 2),
                "dist_ema10_pct": round(dist_ema10_pct, 2)
            }
        return None

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
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as sma_50,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 149 PRECEDING AND CURRENT ROW) as sma_150,
                    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) as sma_200,
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
                    AVG(tr) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) / NULLIF(close, 0) * 100 as atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    (close - COALESCE(close_1m, close)) / NULLIF(COALESCE(close_1m, close), 0) * 100 as ret_1m,
                    (close - COALESCE(close_3m, close)) / NULLIF(COALESCE(close_3m, close), 0) as ret_3m,
                    (close - COALESCE(close_6m, close)) / NULLIF(COALESCE(close_6m, close), 0) as ret_6m,
                    (close - COALESCE(close_9m, close)) / NULLIF(COALESCE(close_9m, close), 0) as ret_9m,
                    (close - COALESCE(close_12m, close)) / NULLIF(COALESCE(close_12m, close), 0) as ret_12m,
                    ROUND((open - prev_close) / NULLIF(prev_close, 0) * 100.0, 2) as gap_pct,
                    ROUND(volume / NULLIF(vol_50d_ma, 0), 2) as rel_vol_50d
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
                    ret_1m,
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
                    atr_20d,
                    sma_50,
                    sma_150,
                    sma_200,
                    ret_1m,
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
                vol_50d_ma = src.vol_50d_ma,
                adr_20d = src.atr_20d,
                atr_20d = src.atr_20d,
                ret_1m = src.ret_1m,
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
                    ret_1m,
                    gap_pct,
                    rel_vol_50d,
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
                    ret_1m,
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
                    ret_1m,
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
                    para_res = {"parabolic_short_is_setup": False, "parabolic_long_is_setup": False, "parabolic_runup_pct": None, "dist_ema10_pct": None}
                    
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
                            
                    results_with_setups.append(list(row) + [
                        v_res["vcp_is_setup"], v_res["vcp_troughs"], v_res["vcp_depths"],
                        d_res["darvas_is_setup"], d_res["darvas_box_top"], d_res["darvas_box_bottom"], d_res["darvas_box_width_pct"],
                        ema_10_val, ema_20_val, dist_ema10_pct, dist_ema20_pct,
                        ep_res["ep_is_setup"], ep_res["ep_gap_pct"], ep_res["ep_rel_vol"],
                        para_res["parabolic_short_is_setup"], para_res["parabolic_long_is_setup"], para_res["parabolic_runup_pct"]
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
                    "parabolic_short_is_setup", "parabolic_long_is_setup", "parabolic_runup_pct"
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
                        parabolic_runup_pct = src.parabolic_runup_pct
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
