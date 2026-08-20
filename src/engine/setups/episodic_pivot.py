from typing import List, Dict, Any

def detect_episodic_pivot(opens: List[float], highs: List[float], lows: List[float], closes: List[float], volumes: List[float], dates: List[Any]) -> dict:
    """
    Detects Episodic Pivot (EP) setup on the latest trading day.
    Criteria:
    1. Gap Up % >= 10.0% (Open vs Previous Close).
    2. Relative Volume >= 2.5x 50-day average volume.
    """
    n = len(closes)
    if n < 51:
        return None

    prev_close = closes[-2]
    today_open = opens[-1]
    today_vol = volumes[-1]
    vol_50d = sum(volumes[-51:-1]) / 50.0

    if prev_close <= 0 or vol_50d <= 0:
        return None

    gap_pct = ((today_open - prev_close) / prev_close) * 100.0
    rel_vol = today_vol / vol_50d

    if gap_pct >= 10.0 and rel_vol >= 2.5:
        return {
            "ep_is_setup": True,
            "ep_gap_pct": round(gap_pct, 2),
            "ep_rel_vol": round(rel_vol, 2)
        }
    return None
