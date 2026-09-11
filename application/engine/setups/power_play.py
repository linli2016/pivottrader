from typing import List, Any

def detect_power_play(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    dates: List[Any],
    min_runup_pct: float = 100.0,
    max_drawdown_pct: float = 25.0,
    min_consolidation_days: int = 5,
    max_consolidation_days: int = 35,
    **kwargs
) -> dict:
    """
    Detects Qullamaggie / Minervini Power Play (High Tight Flag) pattern:
    1. Explosive price move of >= 100% (or min_runup_pct) in the prior 40 trading days.
    2. Orderly tight consolidation correcting <= 25% (or max_drawdown_pct) over 1 to 7 weeks (5 to 35 trading days).
    3. Identifies both stocks consolidating in base (waiting for breakout) and stocks breaking out today (trigger day).
    """
    n = len(highs)
    if n < 20:
        return {
            "pp_is_setup": False,
            "pp_is_trigger": False,
            "pp_runup_pct": 0.0,
            "pp_drawdown_pct": 0.0,
            "pp_days_since_peak": 0,
            "pp_pivot_price": 0.0
        }

    current_close = closes[-1]
    current_high = highs[-1]

    # 1. Base Peak High: lookback over prior bars (excluding today) to establish the consolidation pivot/resistance
    lookback = min(max_consolidation_days, n - 1)
    prior_highs = highs[-(lookback + 1) : -1] if n > 1 else highs
    base_peak_high = max(prior_highs)
    base_peak_idx = (n - 1) - len(prior_highs) + prior_highs.index(base_peak_high)
    days_since_peak = (n - 1) - base_peak_idx

    # 2. Prior 40-day lowest low leading up to that peak
    start_runup_idx = max(0, base_peak_idx - 40)
    low_before_peak = min(lows[start_runup_idx : base_peak_idx + 1])
    
    if low_before_peak <= 0:
        runup_pct = 0.0
    else:
        runup_pct = ((base_peak_high - low_before_peak) / low_before_peak) * 100.0

    # 3. Base Pullback Drawdown: from peak high to lowest close/low during consolidation
    closes_in_base = closes[base_peak_idx : -1] if n > 1 else closes[base_peak_idx:]
    min_close_in_base = min(closes_in_base) if closes_in_base else base_peak_high
    
    if base_peak_high <= 0:
        drawdown_pct = 0.0
    else:
        drawdown_pct = ((base_peak_high - min_close_in_base) / base_peak_high) * 100.0

    # 4. Determine Trigger vs In-Base Setup
    is_breakout = (current_close > base_peak_high or current_high > base_peak_high)
    
    # Trigger condition: today breaking out from a valid power play base
    is_trigger = bool(
        is_breakout and
        (days_since_peak >= min_consolidation_days) and
        (runup_pct >= min_runup_pct) and
        (drawdown_pct <= max_drawdown_pct)
    )

    # In-base condition: currently consolidating inside the flag
    is_in_base = bool(
        (min_consolidation_days <= days_since_peak <= max_consolidation_days) and
        (runup_pct >= min_runup_pct) and
        (drawdown_pct <= max_drawdown_pct) and
        (not is_breakout or current_close <= base_peak_high * 1.05)
    )

    is_setup = is_in_base or is_trigger

    return {
        "pp_is_setup": is_setup,
        "pp_is_trigger": is_trigger,
        "pp_runup_pct": round(runup_pct, 2),
        "pp_drawdown_pct": round(drawdown_pct, 2),
        "pp_days_since_peak": days_since_peak,
        "pp_pivot_price": round(base_peak_high, 2)
    }
