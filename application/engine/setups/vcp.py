from typing import List, Any

def detect_vcp(highs: List[float], lows: List[float], dates: List[Any], closes: List[float] = None, window: int = 3) -> dict:
    """
    Detects Volatility Contraction Pattern (VCP) starting from the recent base high.
    Criteria:
    1. Current price is within 20% range of the 52-week high.
    2. Base starts from the recent consolidation peak (base high).
    3. At least 2 contractions occurred from the base high to current date.
    4. Contractions tighten progressively or final contraction is tight (<= 12%).
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
    dist_from_52w = ((high_52w - current_close) / high_52w) * 100.0

    # 2. Identify local extrema starting from the recent base lookback (up to 150 bars / 30 weeks)
    lookback_base = min(n, 150)
    start_scan = max(window, n - lookback_base)
    end_scan = n - window

    if start_scan >= end_scan:
        return None

    raw_peaks = []
    raw_troughs = []

    for i in range(start_scan, end_scan):
        h_chunk = highs[max(0, i - window) : min(n, i + window + 1)]
        l_chunk = lows[max(0, i - window) : min(n, i + window + 1)]
        if h_chunk and highs[i] == max(h_chunk):
            raw_peaks.append((i, highs[i], dates[i]))
        if l_chunk and lows[i] == min(l_chunk):
            raw_troughs.append((i, lows[i], dates[i]))

    # Include recent unconfirmed extrema in the last window bars
    recent_high_val = max(highs[n - window:])
    recent_high_idx = n - window + highs[n - window:].index(recent_high_val)
    if not any(p[0] == recent_high_idx for p in raw_peaks):
        raw_peaks.append((recent_high_idx, recent_high_val, dates[recent_high_idx]))

    recent_low_val = min(lows[n - window:])
    recent_low_idx = n - window + lows[n - window:].index(recent_low_val)
    if not any(t[0] == recent_low_idx for t in raw_troughs):
        raw_troughs.append((recent_low_idx, recent_low_val, dates[recent_low_idx]))

    if not raw_peaks:
        return None

    # Sort and construct alternating peaks and troughs
    all_extrema = sorted(
        [(idx, p, d, 'peak') for idx, p, d in raw_peaks] + 
        [(idx, t, d, 'trough') for idx, t, d in raw_troughs],
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
    min_rebound_ratio = 0.30
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
                if last_item[3] == 'peak':
                    if item[1] > last_item[1]:
                        filtered_extrema[-1] = item
                else:
                    filtered_extrema.append(item)

    peaks_list = [item for item in filtered_extrema if item[3] == 'peak']
    if not peaks_list:
        return None

    # 3. Determine the Base Start Peak (Recent High)
    # Moving backwards from the latest swing peak:
    # An earlier peak belongs to the same base if it was higher or roughly equal resistance (>= 0.97 of latest peak).
    # If the latest peak broke out significantly above an earlier peak (< 0.95), then the earlier peak was a previous stage.
    base_peak = peaks_list[-1]
    base_peak_pos = len(peaks_list) - 1

    for idx in range(len(peaks_list) - 2, -1, -1):
        prev_p = peaks_list[idx]
        if prev_p[1] >= base_peak[1] * 0.97:
            base_peak = prev_p
            base_peak_pos = idx
        else:
            break

    base_peaks = peaks_list[base_peak_pos:]
    base_start_idx = base_peak[0]

    # Calculate maximum contraction depth for each wave in the base
    contractions = []
    for k in range(len(base_peaks)):
        p_idx, p_price, p_date, _ = base_peaks[k]
        next_p_idx = base_peaks[k+1][0] if k + 1 < len(base_peaks) else n - 1

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

    if not contractions and peaks_list:
        p_idx, p_price, p_date, _ = base_peak
        wave_lows = lows[p_idx:]
        if wave_lows:
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

    if not contractions:
        return None

    base_contractions = contractions[-6:] if len(contractions) >= 6 else contractions
    depths = [c["depth"] for c in base_contractions]

    is_contracting = True
    if len(depths) >= 2:
        for i in range(len(depths) - 1):
            if depths[i+1] > depths[i] * 1.05:
                is_contracting = False
                break
    else:
        is_contracting = False

    is_final_tight = depths[-1] <= 12.0
    is_tight = depths[-1] <= 10.0
    is_not_extended = highs[-1] <= base_peak[1] * 1.05
    is_valid_setup = len(contractions) >= 2 and (is_contracting or is_final_tight) and is_not_extended and (dist_from_52w <= 20.0)

    base_bars = max(1, n - 1 - base_start_idx)
    base_weeks = max(1, round(base_bars / 5))
    depth_ints = "/".join(f"{round(d)}" for d in depths)
    footprint_str = f"{base_weeks}W {depth_ints} {len(depths)}T"

    waves = []
    for idx, c in enumerate(base_contractions):
        p_idx = c["peak_idx"]
        t_idx = c["trough_idx"]
        p_date = str(dates[p_idx]) if p_idx < len(dates) else None
        t_date = str(dates[t_idx]) if t_idx < len(dates) else None
        t_price = lows[t_idx] if t_idx < len(lows) else 0.0
        waves.append({
            "wave": idx + 1,
            "depth_pct": round(c["depth"], 1),
            "peak_price": round(c["peak_price"], 2),
            "peak_date": p_date,
            "trough_price": round(t_price, 2),
            "trough_date": t_date,
            "bars": max(1, t_idx - p_idx) if t_idx >= p_idx else 1
        })

    pivot_price = round(base_contractions[-1]["peak_price"], 2)

    return {
        "vcp_is_setup": is_valid_setup,
        "vcp_troughs": len(depths),
        "vcp_depths": ",".join(f"{d:.1f}" for d in depths),
        "footprint_str": footprint_str,
        "base_weeks": base_weeks,
        "base_bars": base_bars,
        "pivot_price": pivot_price,
        "final_contraction_pct": round(depths[-1], 1),
        "is_tight": is_tight,
        "is_contracting": is_contracting,
        "dist_from_52w_pct": round(dist_from_52w, 1),
        "high_52w_price": round(high_52w, 2),
        "high_52w_date": str(dates[high_52w_idx]) if high_52w_idx < len(dates) else None,
        "base_peak_price": round(base_peak[1], 2),
        "base_peak_date": str(base_peak[2]),
        "waves": waves
    }
