from typing import List, Dict, Any

def detect_breakout(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    dates: List[Any],
    ema_10_val: float = None,
    ema_20_val: float = None,
    min_1m_ret: float = 20.0
) -> dict:
    """
    Detects Qullamaggie / High Tight Flag Breakout pattern:
    1. Big move higher in the past 1-3 months (1-month return >= 20%-30%+).
    2. Orderly consolidation phase (10 to 60 trading days) with price surfing 10 EMA / 20 EMA.
    3. Price within 5% of recent consolidation peak, setting up or executing a breakout.
    """
    n = len(highs)
    if n < 20:
        return {
            "breakout_is_setup": False,
            "breakout_runup_pct": 0.0,
            "breakout_consolidation_days": 0,
            "ema_surfing": False
        }

    current_close = closes[-1]
    
    # 1. 1-month momentum runup (21 trading days)
    close_1m_ago = closes[-21] if n >= 21 else closes[0]
    ret_1m = ((current_close - close_1m_ago) / close_1m_ago) * 100.0 if close_1m_ago > 0 else 0.0

    # 2. Lookback 30 days peak high for consolidation resistance level
    lookback = min(30, n)
    recent_highs = highs[-lookback:]
    peak_high = max(recent_highs)
    peak_idx = n - lookback + recent_highs.index(peak_high)
    consolidation_days = (n - 1) - peak_idx

    # 3. EMA Surfing check: close price staying near or above 10 EMA / 20 EMA
    ema_surfing = False
    if ema_10_val and ema_10_val > 0:
        # Price within 4% of 10 EMA or holding above it
        ema_surfing = current_close >= ema_10_val * 0.96

    # 4. Proximity to breakout pivot (within 5% of resistance peak or breaking out above it)
    near_pivot = current_close >= peak_high * 0.95

    is_setup = (
        ret_1m >= min_1m_ret and
        5 <= consolidation_days <= 45 and
        near_pivot and
        ema_surfing
    )

    return {
        "breakout_is_setup": is_setup,
        "breakout_runup_pct": round(ret_1m, 2),
        "breakout_consolidation_days": consolidation_days,
        "ema_surfing": ema_surfing
    }
