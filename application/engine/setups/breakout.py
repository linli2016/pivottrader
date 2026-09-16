from typing import List, Any

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
    enable_runup: bool = True,
    min_runup_pct: float = 30.0,
    runup_window_weeks: float = 12.0,
    enable_days: bool = True,
    min_consolidation_days: int = 10,
    max_consolidation_days: int = 40,
    max_drawdown_pct: float = 30.0,
    enable_ema_surfing: bool = False,
    enable_htf_mode: bool = False,
    breakout_subview: str = "standard",
    **kwargs
) -> dict:
    """
    Detects Qullamaggie / High Tight Flag (Power Play) Breakout pattern:
    1. Big move higher in the past 1-3 months (customizable run-up, default >= 30% in <= 12 weeks, or >= 100% in HTF mode).
    2. Orderly consolidation phase (customizable window, default 10 to 40 trading days = 2 weeks to 2 months).
    3. Base drawdown limit (default <= 30%, or <= 25% for HTF).
    4. Optional EMA 10/20 surfing rule (default False).
    """
    if "min_1m_ret" in kwargs and kwargs["min_1m_ret"] is not None:
        min_runup_pct = kwargs["min_1m_ret"]

    n = len(highs)
    if n < 20:
        return {
            "breakout_is_setup": False,
            "breakout_runup_pct": 0.0,
            "breakout_drawdown_pct": 0.0,
            "breakout_consolidation_days": 0,
            "breakout_peak_high": 0.0,
            "is_htf": False,
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

    # 2. Prior big move higher leading up to peak high within the specified time window (in weeks)
    runup_bars = max(5, int(float(runup_window_weeks) * 5))
    start_runup_idx = max(0, peak_idx - runup_bars)
    low_before_peak = min(lows[start_runup_idx : peak_idx + 1])
    prior_runup_pct = ((peak_high - low_before_peak) / low_before_peak) * 100.0 if low_before_peak > 0 else 0.0

    # Also check close-to-close returns over the same window
    close_window_ago = closes[-runup_bars] if n >= runup_bars else closes[0]
    ret_window = ((current_close - close_window_ago) / close_window_ago) * 100.0 if close_window_ago > 0 else 0.0

    runup_pct = max(prior_runup_pct, ret_window)

    # 2b. Base Pullback Drawdown: from peak high to lowest close during consolidation
    base_closes = closes[peak_idx:] if peak_idx < n else [current_close]
    min_close_in_base = min(base_closes) if base_closes else peak_high
    drawdown_pct = ((peak_high - min_close_in_base) / peak_high) * 100.0 if peak_high > 0 else 0.0

    # High Tight Flag (HTF) / Power Play qualification check (>= 100% in <= 8 weeks, <= 25% drawdown, 10-30 days base)
    is_htf = bool(prior_runup_pct >= 100.0 and drawdown_pct <= 25.0 and 10 <= consolidation_days <= 30 and runup_window_weeks <= 8.5)

    is_htf_active = bool(enable_htf_mode or breakout_subview == "htf")
    if is_htf_active:
        min_runup_pct = max(float(min_runup_pct), 100.0)
        runup_window_weeks = min(float(runup_window_weeks), 8.0)
        max_drawdown_pct = min(float(max_drawdown_pct if max_drawdown_pct is not None else 25.0), 25.0)
        min_consolidation_days = max(int(min_consolidation_days), 10)
        max_consolidation_days = min(int(max_consolidation_days), 30)

    # 3. EMA Surfing check: optional (only active when enable_ema_surfing is True)
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

    # 4. Setup qualification check against customizable thresholds
    is_runup_ok = (not enable_runup) or (runup_pct >= float(min_runup_pct))
    is_days_ok = (not enable_days) or (int(min_consolidation_days) <= consolidation_days <= int(max_consolidation_days))
    is_drawdown_ok = (max_drawdown_pct is None) or (drawdown_pct <= float(max_drawdown_pct))

    is_setup = (
        is_runup_ok and
        is_days_ok and
        is_drawdown_ok and
        ema_surfing
    )

    return {
        "breakout_is_setup": is_setup,
        "breakout_runup_pct": round(runup_pct, 2),
        "breakout_drawdown_pct": round(drawdown_pct, 2),
        "breakout_consolidation_days": consolidation_days,
        "breakout_peak_high": round(peak_high, 2),
        "is_htf": is_htf,
        "runup_window_weeks": float(runup_window_weeks),
        "ema_surfing": ema_surfing,
        "ema_10": ema_10_val,
        "ema_20": ema_20_val
    }
