from typing import List, Any

def detect_parabolic_extension(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    dates: List[Any],
    ema_10_val: float,
    min_runup_pct: float = 40.0,
    min_dist_ema10_pct: float = 18.0,
    min_up_days: int = 3
) -> dict:
    """
    Detects Parabolic Short setup:
    1. Fast 3 to 10 day gain >= +40% (customizable, default 40%).
    2. Distance above 10-day EMA >= +18% (customizable, default 18%).
    3. Stock up >= 3 consecutive days in a row (close > prev_close, default 3).
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
    dist_ema10_pct = ((current_close - ema_10_val) / ema_10_val) * 100.0

    # Calculate consecutive up days (close > prev_close) ending at current bar
    consecutive_up_days = 0
    for i in range(n - 1, 0, -1):
        if closes[i] > closes[i - 1]:
            consecutive_up_days += 1
        else:
            break

    is_short = runup_pct >= min_runup_pct and dist_ema10_pct >= min_dist_ema10_pct and consecutive_up_days >= min_up_days

    if is_short:
        return {
            "parabolic_short_is_setup": True,
            "parabolic_long_is_setup": False,
            "parabolic_runup_pct": round(runup_pct, 2),
            "dist_ema10_pct": round(dist_ema10_pct, 2),
            "parabolic_up_days": consecutive_up_days
        }
    return None
