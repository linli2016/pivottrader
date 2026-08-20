from typing import List, Dict, Any

def detect_vcp(highs: List[float], lows: List[float], dates: List[Any], closes: List[float] = None, window: int = 3) -> dict:
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
