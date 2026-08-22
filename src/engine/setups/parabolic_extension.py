from typing import List, Dict, Any

def detect_parabolic_extension(highs: List[float], lows: List[float], closes: List[float], dates: List[Any], ema_10_val: float) -> dict:
    """
    Detects Parabolic Climax (Short & Long) setups.
    Short Criteria (Parabolic Climax Top):
    1. Fast 3 to 10 day gain >= +40%.
    2. Distance above 10-day EMA >= +18%.
    3. Stock up >= 3 consecutive days in a row (close > prev_close).
    Long Criteria (Parabolic Climax Bottom):
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

    # Calculate consecutive up days (close > prev_close) ending at current bar
    consecutive_up_days = 0
    for i in range(n - 1, 0, -1):
        if closes[i] > closes[i - 1]:
            consecutive_up_days += 1
        else:
            break

    is_short = runup_pct >= 40.0 and dist_ema10_pct >= 18.0 and consecutive_up_days >= 3
    is_long = drop_pct >= 30.0 and dist_ema10_pct <= -18.0

    if is_short or is_long:
        return {
            "parabolic_short_is_setup": is_short,
            "parabolic_long_is_setup": is_long,
            "parabolic_runup_pct": round(runup_pct, 2) if is_short else round(-drop_pct, 2),
            "dist_ema10_pct": round(dist_ema10_pct, 2),
            "parabolic_up_days": consecutive_up_days
        }
    return None
