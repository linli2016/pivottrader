from typing import List, Dict, Any

def _calculate_ema(prices: List[float], span: int) -> float:
    if not prices or len(prices) < span:
        return None
    k = 2.0 / (span + 1.0)
    ema = prices[0]
    for p in prices[1:]:
        ema = p * k + ema * (1.0 - k)
    return round(ema, 2)

def detect_breakout(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    dates: List[Any],
    ema_10_val: float = None,
    ema_20_val: float = None,
    min_1m_ret: float = 20.0,
    min_runup_pct: float = 30.0,
    enable_ema_surfing: bool = False
) -> dict:
    """
    Detects Qullamaggie / High Tight Flag Breakout pattern:
    1. Big move higher in the past 1-3 months (30%-100%+ move from swing low to peak high).
    2. Orderly consolidation phase (2 weeks to 2 months: 10 to 44 trading days) with price surfing 10 EMA / 20 EMA.
    3. Price within 5% of recent consolidation peak, setting up or executing a breakout.
    """
    n = len(highs)
    if n < 20:
        return {
            "breakout_is_setup": False,
            "breakout_runup_pct": 0.0,
            "breakout_consolidation_days": 0,
            "ema_surfing": False,
            "ema_10": ema_10_val,
            "ema_20": ema_20_val
        }

    current_close = closes[-1]

    # Calculate EMAs dynamically if not pre-populated
    if ema_10_val is None and n >= 10:
        ema_10_val = _calculate_ema(closes, 10)
    if ema_20_val is None and n >= 20:
        ema_20_val = _calculate_ema(closes, 20)

    # 1. Lookback up to 65 trading days (~3 months) prior to current day to find recent resistance peak
    lookback = min(65, n)
    recent_highs = highs[-lookback:-1] if n > 1 else highs
    peak_high = max(recent_highs)
    peak_idx = (n - 1) - len(recent_highs) + recent_highs.index(peak_high)
    consolidation_days = (n - 1) - peak_idx

    # 2. Prior big move higher (30%-100%+) in the past 1-3 months leading up to peak high
    start_runup_idx = max(0, peak_idx - 40)
    low_before_peak = min(lows[start_runup_idx : peak_idx + 1])
    prior_runup_pct = ((peak_high - low_before_peak) / low_before_peak) * 100.0 if low_before_peak > 0 else 0.0

    # Also check 1-month and 3-month close-to-close returns
    close_1m_ago = closes[-21] if n >= 21 else closes[0]
    ret_1m = ((current_close - close_1m_ago) / close_1m_ago) * 100.0 if close_1m_ago > 0 else 0.0
    close_3m_ago = closes[-65] if n >= 65 else closes[0]
    ret_3m = ((current_close - close_3m_ago) / close_3m_ago) * 100.0 if close_3m_ago > 0 else 0.0

    runup_pct = max(prior_runup_pct, ret_1m, ret_3m)

    # 3. EMA Surfing check: close price staying near or above 10 EMA / 20 EMA
    if not enable_ema_surfing:
        ema_surfing = True
    elif ema_10_val and ema_10_val > 0 and current_close >= ema_10_val * 0.96:
        ema_surfing = True
    elif ema_20_val and ema_20_val > 0 and current_close >= ema_20_val * 0.96:
        ema_surfing = True
    elif ema_10_val is None and ema_20_val is None:
        ema_surfing = True
    else:
        ema_surfing = False

    # 4. Proximity to breakout pivot (within 5% of resistance peak or breaking out above it)
    near_pivot = current_close >= peak_high * 0.95

    # 5. Setup qualification check
    effective_min_runup = min(min_1m_ret, min_runup_pct)
    is_setup = (
        runup_pct >= effective_min_runup and
        10 <= consolidation_days <= 44 and
        near_pivot and
        ema_surfing
    )

    return {
        "breakout_is_setup": is_setup,
        "breakout_runup_pct": round(runup_pct, 2),
        "breakout_consolidation_days": consolidation_days,
        "ema_surfing": ema_surfing,
        "ema_10": ema_10_val,
        "ema_20": ema_20_val
    }
