from typing import List, Dict, Any

def detect_power_play(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    dates: List[Any],
    min_runup_pct: float = 100.0,
    max_drawdown_pct: float = 25.0
) -> dict:
    """
    Detects Qullamaggie / Minervini Power Play (High Tight Flag) pattern:
    1. Explosive price move of >= 100% (or min_runup_pct) in the prior 40 trading days.
    2. Orderly tight consolidation correcting <= 25% (or max_drawdown_pct) over a 2 to 6 week period (10 to 35 trading days).
    """
    n = len(highs)
    if n < 30:
        return {
            "pp_is_setup": False,
            "pp_runup_pct": 0.0,
            "pp_drawdown_pct": 0.0,
            "pp_days_since_peak": 0
        }

    # 1. 30-day peak high
    lookback = min(30, n)
    recent_highs = highs[-lookback:]
    peak_high = max(recent_highs)
    peak_idx = n - lookback + recent_highs.index(peak_high)
    days_since_peak = (n - 1) - peak_idx

    # 2. Prior 40-day lowest low before peak
    start_runup_idx = max(0, peak_idx - 40)
    low_before_peak = min(lows[start_runup_idx : peak_idx + 1])
    
    if low_before_peak <= 0:
        runup_pct = 0.0
    else:
        runup_pct = ((peak_high - low_before_peak) / low_before_peak) * 100.0

    # 3. Drawdown from peak high to lowest low on or after peak date
    lows_since_peak = lows[peak_idx:]
    min_low_after_peak = min(lows_since_peak) if lows_since_peak else peak_high
    
    if peak_high <= 0:
        drawdown_pct = 0.0
    else:
        drawdown_pct = ((peak_high - min_low_after_peak) / peak_high) * 100.0

    # Check Power Play setup criteria
    is_setup = (
        runup_pct >= min_runup_pct and
        drawdown_pct <= max_drawdown_pct and
        10 <= days_since_peak <= 35
    )

    return {
        "pp_is_setup": is_setup,
        "pp_runup_pct": round(runup_pct, 2),
        "pp_drawdown_pct": round(drawdown_pct, 2),
        "pp_days_since_peak": days_since_peak
    }
