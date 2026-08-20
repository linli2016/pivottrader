from typing import List, Dict, Any

def detect_darvas_box(highs: List[float], lows: List[float], closes: List[float], dates: List[Any], window: int = 3, max_lookback_days: int = 120) -> dict:
    """
    Detects Darvas Box consolidation / breakout pattern in recent price history.
    Expects highs, lows, closes, and dates to be in chronological ascending order.
    Limits detection to the active base window (last 120 trading days).
    Returns a dict with Darvas Box metrics or None.
    """
    n = len(highs)
    if n < window * 2 + 5:
        return None

    start_idx = max(0, n - max_lookback_days)
    
    # 1. Identify Box Top (Peak high where subsequent 3 days do NOT exceed that high)
    box_top_idx = None
    box_top_price = None

    for i in range(n - 1 - window, max(start_idx, window), -1):
        is_top = True
        for k in range(1, window + 1):
            if highs[i + k] >= highs[i]:
                is_top = False
                break
        if is_top:
            box_top_idx = i
            box_top_price = highs[i]
            break

    if box_top_idx is None:
        return None

    # 2. Identify Box Bottom (Lowest low after box top where subsequent 3 days do NOT undercut that low)
    box_bottom_idx = None
    box_bottom_price = None

    for j in range(box_top_idx + 1, n - window):
        is_bottom = True
        for k in range(1, window + 1):
            if j + k < n and lows[j + k] <= lows[j]:
                is_bottom = False
                break
        if is_bottom:
            if box_bottom_price is None or lows[j] < box_bottom_price:
                box_bottom_idx = j
                box_bottom_price = lows[j]

    if box_bottom_price is None or box_bottom_price >= box_top_price:
        return None

    # 3. Check box validity:
    current_close = closes[-1]
    current_low = lows[-1]

    if current_low < box_bottom_price * 0.98 or current_close > box_top_price * 1.08:
        return None

    width_pct = ((box_top_price - box_bottom_price) / box_top_price) * 100.0

    return {
        "darvas_is_setup": True,
        "darvas_box_top": round(box_top_price, 2),
        "darvas_box_bottom": round(box_bottom_price, 2),
        "darvas_box_width_pct": round(width_pct, 2)
    }
