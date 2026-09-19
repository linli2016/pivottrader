from typing import List, Any, Optional, Dict


def detect_low_cheat(
    opens: List[float],
    highs: List[float],
    lows: List[float],
    closes: List[float],
    volumes: List[float],
    dates: List[Any],
    vol_50d_ma: Optional[float] = None,
    sma_50: Optional[float] = None,
    sma_150: Optional[float] = None,
    sma_200: Optional[float] = None,
    ipo_days: Optional[int] = None,
    min_base_depth: float = 12.0,
    max_base_depth: float = 45.0,
    min_base_position: float = 0.0,
    max_base_position: float = 50.0,
    require_exhaustion_or_shakeout: bool = True,
    enforce_stage2: bool = True,
    min_cheat_vol_ratio: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Detects Mark Minervini's Low Cheat Entry setup:
    1. Stock is in a verified Stage 2 uptrend (Close >= 200 SMA, 150 SMA >= 200 SMA, or IPO base).
    2. Stock corrects into a base (cup or consolidation) with depth between 12% and 45%.
    3. Selling pressure exhausts at the trough via low volume dry-up (VDU) or an undercut-and-rally shakeout.
    4. Forms a low pivot point in the lower 1/3 to 1/2 of the base (<= 50% of base height).
    5. Bulls step in with a strong character change candle breaking above the low pivot on increased volume.
    6. Allows an asymmetric, tight risk entry with stop loss at the trigger/pivot low and target at the base peak.
    """
    n = len(highs)
    default_res = {
        "low_cheat_is_setup": False,
        "low_cheat_is_trigger": False,
        "low_cheat_pivot_price": 0.0,
        "low_cheat_stop_loss": 0.0,
        "low_cheat_risk_pct": 0.0,
        "cheat_is_setup": False,
        "cheat_is_trigger": False,
        "cheat_pivot_price": 0.0,
        "cheat_stop_loss": 0.0,
        "cheat_risk_pct": 0.0,
        "cheat_type": "none",
        "base_peak_price": 0.0,
        "base_peak_date": None,
        "base_trough_price": 0.0,
        "base_trough_date": None,
        "base_depth_pct": 0.0,
        "base_position_pct": 0.0,
        "base_bars": 0,
        "exhaustion_type": "none",
        "trigger_vol_ratio": 0.0,
        "reward_risk_ratio": 0.0,
        "target_price": 0.0,
        "stage2_qualified": False
    }

    if n < 20:
        return default_res

    current_close = closes[-1]
    current_high = highs[-1]
    current_low = lows[-1]
    current_open = opens[-1]
    current_vol = volumes[-1]

    # Calculate 50d volume MA if not supplied
    if vol_50d_ma is None or vol_50d_ma <= 0:
        lookback_vol = min(n, 50)
        vol_50d_ma = sum(volumes[-lookback_vol:]) / lookback_vol if lookback_vol > 0 else 1.0

    is_ipo = ipo_days is not None and ipo_days <= 350

    # 0. Minervini Stage 2 Verification
    stage2_qualified = True
    if is_ipo:
        # In young IPOs (< 350 days), price should not be deeply broken below 50 SMA
        if sma_50 is not None and sma_50 > 0 and current_close < sma_50 * 0.90:
            stage2_qualified = False
    else:
        # Established stocks: 200 SMA baseline and 150 > 200 SMA macro trend
        if sma_200 is not None and sma_200 > 0 and current_close < sma_200 * 0.95:
            stage2_qualified = False
        if sma_150 is not None and sma_200 is not None and sma_150 > 0 and sma_200 > 0:
            if sma_150 < sma_200 * 0.98:
                stage2_qualified = False
        if sma_50 is not None and sma_150 is not None and sma_50 > 0 and sma_150 > 0:
            if sma_50 < sma_150 * 0.90:
                stage2_qualified = False

    if enforce_stage2 and not stage2_qualified:
        return default_res

    # 1. Base Peak High: Scan back up to 75 bars, but at least 8 bars before current
    max_lookback = min(n - 4, 75)
    if max_lookback < 8:
        return default_res

    peak_search_start = max(0, n - 1 - max_lookback)
    peak_search_end = n - 3
    candidate_highs = highs[peak_search_start:peak_search_end]
    if not candidate_highs:
        return default_res

    base_peak_high = max(candidate_highs)
    base_peak_idx = peak_search_start + candidate_highs.index(base_peak_high)
    base_peak_date = str(dates[base_peak_idx]) if base_peak_idx < len(dates) else None
    base_bars = (n - 1) - base_peak_idx

    if base_bars < 8:
        return default_res

    # 2. Base Trough Low: between base_peak_idx and n - 2
    trough_search_start = base_peak_idx + 1
    trough_search_end = n - 1  # exclude current bar
    if trough_search_start >= trough_search_end:
        return default_res

    candidate_lows = lows[trough_search_start:trough_search_end]
    if not candidate_lows:
        return default_res

    base_trough_low = min(candidate_lows)
    base_trough_idx = trough_search_start + candidate_lows.index(base_trough_low)
    base_trough_date = str(dates[base_trough_idx]) if base_trough_idx < len(dates) else None

    # Trough must leave at least 2 bars to form a pivot and trigger
    bars_since_trough = (n - 1) - base_trough_idx
    if bars_since_trough < 2:
        return default_res

    # 3. Base Depth Check
    if base_peak_high <= 0:
        return default_res
    base_depth_pct = ((base_peak_high - base_trough_low) / base_peak_high) * 100.0
    if base_depth_pct < min_base_depth or base_depth_pct > max_base_depth:
        return default_res

    base_height = base_peak_high - base_trough_low
    if base_height <= 0:
        return default_res

    # 4. Exhaustion / Shakeout at Trough Check
    has_vdu = False
    has_shakeout = False

    trough_window_start = max(0, base_trough_idx - 2)
    trough_window_end = min(n, base_trough_idx + 3)
    for idx in range(trough_window_start, trough_window_end):
        v = volumes[idx]
        if vol_50d_ma and v < 0.75 * vol_50d_ma:
            has_vdu = True
            break
        if base_peak_idx < len(volumes) and volumes[base_peak_idx] > 0:
            if v < 0.50 * volumes[base_peak_idx]:
                has_vdu = True
                break

    for idx in range(trough_window_start, min(n - 1, trough_window_end)):
        rng = highs[idx] - lows[idx]
        if rng > 0 and (closes[idx] - lows[idx]) / rng >= 0.45:
            earlier_lows = lows[base_peak_idx:idx]
            if earlier_lows and lows[idx] < min(earlier_lows):
                has_shakeout = True
                break

    exhaustion_type = "none"
    if has_vdu and has_shakeout:
        exhaustion_type = "both"
    elif has_vdu:
        exhaustion_type = "volume_dry_up"
    elif has_shakeout:
        exhaustion_type = "shakeout"

    if require_exhaustion_or_shakeout and exhaustion_type == "none":
        vol_before_trough = volumes[max(0, base_trough_idx - 3):base_trough_idx]
        vol_at_trough = volumes[base_trough_idx]
        if vol_before_trough and vol_at_trough <= min(vol_before_trough):
            exhaustion_type = "volume_dry_up"
        else:
            return default_res

    # 5. Cheat Pivot Determination
    pivot_search_start = base_trough_idx + 1
    pivot_search_end = n - 1
    post_trough_highs = highs[pivot_search_start:pivot_search_end] if pivot_search_end > pivot_search_start else [highs[base_trough_idx + 1]]

    cheat_pivot_high = max(post_trough_highs)
    cheat_pivot_idx = pivot_search_start + post_trough_highs.index(cheat_pivot_high)

    base_position_pct = ((cheat_pivot_high - base_trough_low) / base_height) * 100.0

    if base_position_pct > max_base_position or base_position_pct < min_base_position:
        return default_res

    # 6. Trigger / Character Change Evaluation
    trigger_vol_ratio = round(current_vol / vol_50d_ma, 2) if vol_50d_ma > 0 else 1.0

    is_clearing_pivot = (current_close >= cheat_pivot_high * 0.995 or current_high >= cheat_pivot_high)
    is_bullish_candle = (current_close >= current_open)
    if min_cheat_vol_ratio is not None and min_cheat_vol_ratio > 0:
        is_vol_confirmed = (trigger_vol_ratio >= min_cheat_vol_ratio * 0.85)
    else:
        is_vol_confirmed = (trigger_vol_ratio >= 1.0)

    is_in_base = (
        not is_clearing_pivot and
        current_close >= cheat_pivot_high * 0.93 and
        current_close <= cheat_pivot_high
    )

    is_trigger = is_clearing_pivot and is_bullish_candle and is_vol_confirmed
    is_setup = is_trigger or is_in_base

    if not is_setup:
        return default_res

    # 7. Stop Loss and Risk / Reward Calculation
    stop_candidates = lows[cheat_pivot_idx:n]
    stop_loss = min(stop_candidates) if stop_candidates else current_low
    stop_loss = round(stop_loss * 0.995, 2)

    risk_pct = round(((current_close - stop_loss) / current_close) * 100.0, 1) if current_close > 0 else 0.0
    reward_to_base_peak_pct = ((base_peak_high - current_close) / current_close) * 100.0 if current_close > 0 else 0.0
    reward_risk_ratio = round(reward_to_base_peak_pct / max(0.5, risk_pct), 1)

    cheat_type = "cheat" if base_position_pct >= 40.0 else "low_cheat"

    return {
        "low_cheat_is_setup": True,
        "low_cheat_is_trigger": is_trigger,
        "low_cheat_pivot_price": round(cheat_pivot_high, 2),
        "low_cheat_stop_loss": stop_loss,
        "low_cheat_risk_pct": risk_pct,
        "cheat_is_setup": True,
        "cheat_is_trigger": is_trigger,
        "cheat_pivot_price": round(cheat_pivot_high, 2),
        "cheat_stop_loss": stop_loss,
        "cheat_risk_pct": risk_pct,
        "cheat_type": cheat_type,
        "base_peak_price": round(base_peak_high, 2),
        "base_peak_date": base_peak_date,
        "base_trough_price": round(base_trough_low, 2),
        "base_trough_date": base_trough_date,
        "base_depth_pct": round(base_depth_pct, 1),
        "base_position_pct": round(base_position_pct, 1),
        "base_bars": base_bars,
        "exhaustion_type": exhaustion_type,
        "trigger_vol_ratio": trigger_vol_ratio,
        "reward_risk_ratio": reward_risk_ratio,
        "target_price": round(base_peak_high, 2),
        "stage2_qualified": stage2_qualified
    }


def detect_cheat(
    opens: List[float],
    highs: List[float],
    lows: List[float],
    closes: List[float],
    volumes: List[float],
    dates: List[Any],
    vol_50d_ma: Optional[float] = None,
    sma_50: Optional[float] = None,
    sma_150: Optional[float] = None,
    sma_200: Optional[float] = None,
    ipo_days: Optional[int] = None,
    min_base_depth: float = 12.0,
    max_base_depth: float = 45.0,
    min_base_position: float = 40.0,
    max_base_position: float = 80.0,
    require_exhaustion_or_shakeout: bool = False,
    enforce_stage2: bool = True,
    min_cheat_vol_ratio: Optional[float] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Detects Mark Minervini's Cheat (3-C / Cup Completion Cheat) setup:
    1. Stock is in a verified Stage 2 uptrend.
    2. Corrects into a base with depth between 12% and 45%.
    3. Price rounds out of the bottom and rallies up the right side of the cup into mid-to-upper base (40% to 80% position).
    4. Pauses / plateaus with volume contraction before reaching the base peak high.
    5. Triggers when price breaks above the cheat pivot on volume.
    """
    res = detect_low_cheat(
        opens=opens,
        highs=highs,
        lows=lows,
        closes=closes,
        volumes=volumes,
        dates=dates,
        vol_50d_ma=vol_50d_ma,
        sma_50=sma_50,
        sma_150=sma_150,
        sma_200=sma_200,
        ipo_days=ipo_days,
        min_base_depth=min_base_depth,
        max_base_depth=max_base_depth,
        min_base_position=min_base_position,
        max_base_position=max_base_position,
        require_exhaustion_or_shakeout=require_exhaustion_or_shakeout,
        enforce_stage2=enforce_stage2,
        min_cheat_vol_ratio=min_cheat_vol_ratio,
        **kwargs
    )
    res["cheat_type"] = "cheat"
    res["cheat_is_setup"] = res.get("low_cheat_is_setup", False)
    res["cheat_is_trigger"] = res.get("low_cheat_is_trigger", False)
    res["cheat_pivot_price"] = res.get("low_cheat_pivot_price", 0.0)
    res["cheat_stop_loss"] = res.get("low_cheat_stop_loss", 0.0)
    res["cheat_risk_pct"] = res.get("low_cheat_risk_pct", 0.0)
    res["cheat_base_depth"] = res.get("base_depth_pct", 0.0)
    res["cheat_base_position"] = res.get("base_position_pct", 0.0)
    return res


