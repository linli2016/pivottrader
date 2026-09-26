"""
Market Pulse Engine:
Provides high-density CANSLIM / Deepvue style market timing & breadth analysis:
1. Follow-Through Day (FTD) Tracking (Rally attempt detection & invalidation)
2. Distribution Days Engine (SPY & QQQ rolling 25 sessions, 5% rally exemptions, 1-week delta trend)
3. Moving Average Market Breadth (% above 21-day, 50-day, and 200-day MAs across liquid universe with 252-day 1-year percentiles)
"""

import time
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List


_market_pulse_cache: Dict[str, Dict[str, Any]] = {}
_cache_timestamp: float = 0.0


def clear_market_pulse_cache():
    """Clears in-memory market pulse cache."""
    global _market_pulse_cache, _cache_timestamp
    _market_pulse_cache.clear()
    _cache_timestamp = 0.0


def calculate_distribution_days(conn, as_of_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculates CANSLIM Distribution Days across major benchmarks (SPY, QQQ).
    - Window: Rolling 25 trading sessions (5 weeks).
    - Rule: Close down >= 0.2% on volume > prior session volume.
    - 5% Rally Exemption: If price subsequently closes >= 5% above the distribution close, mark drops off.
    - Near Exemption: Price gain between +4.0% and +5.0% above distribution close.
    - Trend: Delta vs 5 sessions ago (1 week ago).
    """
    date_filter = f"AND date <= '{as_of_date}'" if as_of_date else "AND date <= CURRENT_DATE"
    
    indices = ["SPY", "QQQ"]
    index_results = {}
    all_marks = []
    
    # We fetch last 35 sessions for SPY & QQQ
    query = f"""
        WITH ranked AS (
            SELECT 
                symbol,
                date,
                close,
                volume,
                LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                LAG(volume, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_volume,
                ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
            FROM daily_bars
            WHERE symbol IN ('SPY', 'QQQ') {date_filter}
        )
        SELECT * FROM ranked WHERE rn <= 45 ORDER BY symbol, date ASC;
    """
    df = conn.execute(query).df()
    if df.empty:
        return {
            "pressure_score": 0,
            "trend": "flat",
            "trend_label": "→ vs 1 week ago",
            "count_1w_ago": 0,
            "near_exemption_count": 0,
            "near_exemption_label": "No marks near rally exemption",
            "indices": {},
            "marks": []
        }

    df["date_str"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["pct_change"] = (df["close"] - df["prev_close"]) / df["prev_close"]
    df["is_dist"] = (df["pct_change"] <= -0.002) & (df["volume"] > df["prev_volume"])

    total_active_today = 0
    total_active_1w_ago = 0
    near_exemption_count = 0

    for sym in indices:
        sub_df = df[df["symbol"] == sym].sort_values(by="date", ascending=True).reset_index(drop=True)
        if len(sub_df) < 25:
            continue

        latest_close = sub_df.iloc[-1]["close"]
        latest_date = sub_df.iloc[-1]["date_str"]

        # 1. Evaluate last 25 sessions for TODAY
        last_25_today = sub_df.tail(25).copy()
        active_marks = []
        exempted_marks = []

        for idx, row in last_25_today[last_25_today["is_dist"]].iterrows():
            d_date = row["date"]
            c_dist = row["close"]
            # Subsequent closes up to today
            subsequent = sub_df[sub_df["date"] > d_date]
            max_sub_close = subsequent["close"].max() if len(subsequent) > 0 else c_dist
            
            current_gain_pct = round(((latest_close - c_dist) / c_dist) * 100.0, 2)
            max_gain_pct = round(((max_sub_close - c_dist) / c_dist) * 100.0, 2)
            
            sessions_since = len(subsequent)
            days_to_expire = max(0, 25 - sessions_since)

            # 5% rally rule
            is_exempted = bool(max_gain_pct >= 5.0)
            is_near_exempt = bool((not is_exempted) and (current_gain_pct >= 4.0 or max_gain_pct >= 4.0))

            mark_obj = {
                "date": row["date_str"],
                "symbol": sym,
                "close": round(c_dist, 2),
                "pct_change": round(row["pct_change"] * 100.0, 2),
                "current_gain_pct": current_gain_pct,
                "max_gain_pct": max_gain_pct,
                "sessions_since": sessions_since,
                "days_to_expire": days_to_expire,
                "is_exempted": is_exempted,
                "is_near_exemption": is_near_exempt
            }

            if is_exempted:
                exempted_marks.append(mark_obj)
            else:
                active_marks.append(mark_obj)
                all_marks.append(mark_obj)
                if is_near_exempt:
                    near_exemption_count += 1

        # 2. Evaluate last 25 sessions AS OF 1 WEEK AGO (5 sessions ago)
        if len(sub_df) >= 30:
            sub_1w = sub_df.iloc[:-5]
            close_1w = sub_1w.iloc[-1]["close"]
            last_25_1w = sub_1w.tail(25)
            active_1w_count = 0
            for _, row_1w in last_25_1w[last_25_1w["is_dist"]].iterrows():
                subsequent_1w = sub_1w[sub_1w["date"] > row_1w["date"]]
                max_sub_1w = subsequent_1w["close"].max() if len(subsequent_1w) > 0 else row_1w["close"]
                max_gain_1w = ((max_sub_1w - row_1w["close"]) / row_1w["close"]) * 100.0
                if max_gain_1w < 5.0:
                    active_1w_count += 1
        else:
            active_1w_count = len(active_marks)

        index_results[sym] = {
            "symbol": sym,
            "active_count": len(active_marks),
            "exempted_count": len(exempted_marks),
            "count_1w_ago": active_1w_count,
            "active_marks": active_marks,
            "exempted_marks": exempted_marks
        }

    # Pressure score: Deepvue typically surfaces the dominant/primary index (e.g. SPY: 9) or maximum index count
    spy_res = index_results.get("SPY", {})
    qqq_res = index_results.get("QQQ", {})
    
    spy_active = spy_res.get("active_count", 0)
    qqq_active = qqq_res.get("active_count", 0)
    
    # Primary distribution pressure is max index count (SPY or QQQ)
    pressure_score = max(spy_active, qqq_active)
    
    # 1 week ago primary count
    spy_1w = spy_res.get("count_1w_ago", spy_active)
    qqq_1w = qqq_res.get("count_1w_ago", qqq_active)
    count_1w_ago = spy_1w if pressure_score == spy_active else qqq_1w

    # Trend calculation
    if pressure_score < count_1w_ago:
        trend = "down"
        trend_label = "↓ vs 1 week ago"
    elif pressure_score > count_1w_ago:
        trend = "up"
        trend_label = "↑ vs 1 week ago"
    else:
        trend = "flat"
        trend_label = "→ vs 1 week ago"

    # Rally exemption label
    if near_exemption_count == 1:
        near_exemption_label = "1 mark near 5 rally exemption"
    elif near_exemption_count > 1:
        near_exemption_label = f"{near_exemption_count} marks near 5 rally exemption"
    else:
        near_exemption_label = "No marks near 5 rally exemption"

    # Sort all active marks descending by date
    all_marks.sort(key=lambda x: x["date"], reverse=True)

    return {
        "pressure_score": pressure_score,
        "trend": trend,
        "trend_label": trend_label,
        "count_1w_ago": count_1w_ago,
        "near_exemption_count": near_exemption_count,
        "near_exemption_label": near_exemption_label,
        "indices": index_results,
        "marks": all_marks
    }


def calculate_ftd_status(conn, as_of_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Evaluates CANSLIM Follow-Through Day (FTD) status for QQQ (Nasdaq 100 benchmark).
    - Day 1: Index closes positive off a swing low (or reverses higher).
    - Days 2-3: Index holds above Day 1 low.
    - Day 4+: FTD occurs if index advances >= 1.25% on volume higher than prior session.
    - Invalidation: If index undercuts Day 1 low, rally attempt fails -> 'No active FTD'.
    """
    date_filter = f"AND date <= '{as_of_date}'" if as_of_date else "AND date <= CURRENT_DATE"
    query = f"""
        WITH bars AS (
            SELECT 
                date,
                close,
                low,
                volume,
                LAG(close, 1) OVER (ORDER BY date) as prev_close,
                LAG(volume, 1) OVER (ORDER BY date) as prev_volume,
                ROW_NUMBER() OVER (ORDER BY date DESC) as rn
            FROM daily_bars
            WHERE symbol = 'QQQ' {date_filter}
        )
        SELECT * FROM bars WHERE rn <= 60 ORDER BY date ASC;
    """
    df = conn.execute(query).df()
    if df.empty or len(df) < 15:
        return {
            "has_active_ftd": False,
            "headline": "No active FTD",
            "badge_color": "#94a3b8",
            "rally_day": None,
            "details": "Insufficient historical sessions to evaluate FTD."
        }

    df["date_str"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["pct_change"] = (df["close"] - df["prev_close"]) / df["prev_close"] * 100.0

    # Scan from latest backwards to find recent rally attempt
    # Find local swing low in recent 30 sessions
    recent = df.tail(30).reset_index(drop=True)
    min_idx = recent["low"].idxmin()
    low_bar = recent.iloc[min_idx]
    
    bars_after_low = recent.iloc[min_idx + 1:] if min_idx < len(recent) - 1 else pd.DataFrame()
    
    # If the low was made today:
    if bars_after_low.empty:
        return {
            "has_active_ftd": False,
            "headline": "No active FTD",
            "badge_color": "#ef4444",
            "rally_day": 0,
            "details": f"Market made a new swing low ({low_bar['low']:.2f}) on {low_bar['date_str']}."
        }

    # Verify rally attempt: Day 1 is first day that closes higher after low
    rally_low = float(low_bar["low"])
    day_count = 0
    active_ftd = None
    rally_failed = False

    for i, (_, row) in enumerate(bars_after_low.iterrows(), start=1):
        if row["low"] < rally_low:
            # Undercut rally low -> attempt failed
            rally_failed = True
            active_ftd = None
            rally_low = float(row["low"])
            day_count = 0
            continue

        day_count += 1
        # Check Day 4+ FTD trigger: gain >= 1.25% on volume > prev_volume
        if day_count >= 4 and row["pct_change"] >= 1.25 and row["volume"] > row["prev_volume"]:
            active_ftd = {
                "ftd_date": row["date_str"],
                "ftd_day": day_count,
                "gain_pct": round(row["pct_change"], 2),
                "close": round(row["close"], 2)
            }

    if active_ftd and not rally_failed:
        return {
            "has_active_ftd": True,
            "headline": f"Active FTD (Day {day_count} since {active_ftd['ftd_date']})",
            "badge_color": "#10b981",
            "rally_day": day_count,
            "ftd_details": active_ftd,
            "details": f"Follow-Through Day triggered on {active_ftd['ftd_date']} (+{active_ftd['gain_pct']}%). Confirmed Uptrend intact."
        }
    else:
        return {
            "has_active_ftd": False,
            "headline": "No active FTD",
            "badge_color": "#94a3b8",
            "rally_day": day_count if not rally_failed else 0,
            "details": f"Day {day_count} of rally attempt off {low_bar['date_str']} low. Awaiting Day 4+ follow-through surge."
        }


def calculate_breadth_moving_averages(conn, as_of_date: Optional[str] = None, lookback_sessions: int = 252) -> Dict[str, Any]:
    """
    Computes percentage of stocks above 21-day MA, 50-day SMA, and 200-day SMA
    across all stocks in the database with 1-year historical percentiles.
    """
    date_filter = f"AND date <= '{as_of_date}'" if as_of_date else "AND date <= CURRENT_DATE"
    db_date_filter = f"AND db.date <= '{as_of_date}'" if as_of_date else "AND db.date <= CURRENT_DATE"
    
    lookback_cutoff = lookback_sessions + 35
    query = f"""
        WITH cutoff AS (
            SELECT MIN(date) as min_date FROM (
                SELECT date FROM daily_bars WHERE symbol = 'QQQ' {date_filter} ORDER BY date DESC LIMIT {lookback_cutoff}
            )
        ),
        raw_bars AS (
            SELECT 
                db.symbol,
                db.date,
                db.close,
                AVG(db.close) OVER (PARTITION BY db.symbol ORDER BY db.date ROWS BETWEEN 20 PRECEDING AND CURRENT ROW) as ma_21,
                db.sma_50,
                db.sma_200
            FROM daily_bars db
            JOIN cutoff c ON db.date >= c.min_date
            WHERE 1=1 {db_date_filter} AND db.close > 0
        ),
        daily_breadth AS (
            SELECT 
                date,
                COUNT(*) as total_symbols,
                ROUND(COUNT(CASE WHEN close > ma_21 THEN 1 END) * 100.0 / COUNT(*), 1) as pct_above_21,
                ROUND(COUNT(CASE WHEN close > sma_50 THEN 1 END) * 100.0 / COUNT(*), 1) as pct_above_50,
                ROUND(COUNT(CASE WHEN close > sma_200 THEN 1 END) * 100.0 / COUNT(*), 1) as pct_above_200
            FROM raw_bars
            GROUP BY date
            ORDER BY date DESC
            LIMIT {lookback_sessions + 20}
        )
        SELECT * FROM daily_breadth ORDER BY date ASC;
    """
    df = conn.execute(query).df()
    if df.empty:
        return {
            "total_symbols": 0,
            "latest_date": as_of_date or "",
            "metrics": []
        }

    latest = df.iloc[-1]
    total_symbols = int(latest["total_symbols"])
    latest_date_str = pd.to_datetime(latest["date"]).strftime("%Y-%m-%d")

    # 1-year window (last 252 rows)
    window_252 = df.tail(lookback_sessions)

    metrics = []
    configs = [
        ("pct_above_21", "% above 21-day", 21),
        ("pct_above_50", "% above 50-day", 50),
        ("pct_above_200", "% above 200-day", 200),
    ]

    for col, label, period in configs:
        cur_val = float(latest[col])
        series = window_252[col].dropna()
        min_1y = float(series.min()) if not series.empty else 0.0
        max_1y = float(series.max()) if not series.empty else 100.0
        pctile_1y = float((series < cur_val).mean() * 100.0) if not series.empty else 50.0

        # Color: Green if >= 50%, Red if < 50%
        is_bullish = cur_val >= 50.0
        color = "#10b981" if is_bullish else "#ef4444"

        metrics.append({
            "key": col,
            "label": label,
            "period": period,
            "current_pct": round(cur_val, 1),
            "min_1y": round(min_1y, 1),
            "max_1y": round(max_1y, 1),
            "percentile_1y": round(pctile_1y, 1),
            "percentile_label": f"1y {pctile_1y:.1f}%",
            "is_bullish": is_bullish,
            "bar_color": color
        })

    return {
        "total_symbols": total_symbols,
        "latest_date": latest_date_str,
        "metrics": metrics
    }


def get_market_pulse(conn, as_of_date: Optional[str] = None, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Master function returning the complete Market Pulse dashboard payload:
    - Live badge status
    - Follow-Through Day (FTD) headline
    - Distribution pressure count & 1-week delta trend
    - 5% rally exemption alert
    - Liquid universe moving average breadth with 1-year percentiles
    - Detailed mark list for interactive popovers
    """
    cache_key = as_of_date or "latest"
    now = time.time()
    if not force_refresh and cache_key in _market_pulse_cache and (now - _cache_timestamp < 300):
        return _market_pulse_cache[cache_key]

    dist_data = calculate_distribution_days(conn, as_of_date=as_of_date)
    ftd_data = calculate_ftd_status(conn, as_of_date=as_of_date)
    breadth_data = calculate_breadth_moving_averages(conn, as_of_date=as_of_date)

    latest_date = breadth_data.get("latest_date") or as_of_date or time.strftime("%Y-%m-%d")

    # Combine into Deepvue-style structure
    payload = {
        "as_of_date": latest_date,
        "is_live": True,
        "ftd_status": ftd_data["headline"],
        "has_active_ftd": ftd_data["has_active_ftd"],
        "ftd_details": ftd_data,
        "distribution_pressure": dist_data["pressure_score"],
        "distribution_trend": dist_data["trend"],
        "distribution_trend_label": dist_data["trend_label"],
        "near_exemption_count": dist_data["near_exemption_count"],
        "near_exemption_label": dist_data["near_exemption_label"],
        "subheadline": f"{ftd_data['headline']} · Distribution pressure {dist_data['pressure_score']} {dist_data['trend_label']}",
        "total_symbols": breadth_data.get("total_symbols", 0),
        "breadth_metrics": breadth_data.get("metrics", []),
        "distribution_marks": dist_data.get("marks", []),
        "indices_breakdown": dist_data.get("indices", {})
    }

    _market_pulse_cache[cache_key] = payload
    return payload

