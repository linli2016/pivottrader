import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional


def classify_qullamaggie_row(
    close: float,
    ema_10: float,
    ema_20: float,
    sma_50: float,
    ema_10_slope: float,
    ema_20_slope: float,
    sma_50_slope: float,
) -> Tuple[str, str, str, str, str, str]:
    """
    Evaluates market condition based on Kristjan Qullamaggie's Nasdaq Moving Average Stack:
    - 10-day EMA
    - 20-day EMA
    - 50-day SMA

    Returns:
    (code, label, badge, stance, exposure, guidance)
    """
    if pd.isna(sma_50) or sma_50 is None or sma_50 <= 0:
        return (
            "UNKNOWN",
            "Insufficient Data",
            "INITIALIZING",
            "⚪ GATHERING DATA",
            "N/A",
            "Insufficient historical bars to establish 50-day SMA.",
        )

    # Moving average stack order string
    # E.g., Close > 10 > 20 > 50 or 50 > 20 > 10 > Close
    items = [
        ("P", close),
        ("10", ema_10),
        ("20", ema_20),
        ("50", sma_50)
    ]
    items.sort(key=lambda x: x[1] if x[1] is not None else -1e9, reverse=True)
    stack_str = " > ".join([k for k, _ in items])

    # 1. Bearish / High Risk (Red Light)
    # - 10 EMA < 20 EMA with both declining
    # - Close < 50 SMA and 50 SMA flattening or rolling over (slope <= 0)
    # - Close < 20 EMA < 50 SMA with 20 EMA declining
    is_bearish = (
        (ema_10 < ema_20 and ema_10_slope < 0 and ema_20_slope < 0)
        or (close < sma_50 and sma_50_slope <= 0)
        or (close < ema_20 and ema_20 < sma_50 and ema_20_slope < 0)
    )

    if is_bearish:
        return (
            "BEARISH",
            "High Risk / Distribution",
            "RED LIGHT",
            "🔴 RED LIGHT: DEFENSIVE / CASH",
            "0–25% Sizing (Protect Capital)",
            "Hostile market environment: 10/20 EMAs declining below or into rolling 50 SMA. Price action wide and loose; breakouts fail almost immediately. Move to cash and do not force trades.",
        )

    # 2. Bullish Uptrend / Expansion (Green Light)
    # - Close >= 10 EMA >= 20 EMA > 50 SMA
    # - 10 EMA & 20 EMA sloping upward
    # - 50 SMA rising
    is_bullish = (
        close >= ema_10
        and ema_10 >= ema_20
        and ema_20 > sma_50
        and ema_10_slope >= 0
        and ema_20_slope >= 0
        and sma_50_slope >= 0
    )

    if is_bullish:
        return (
            "BULLISH",
            "Bullish Uptrend / Expansion",
            "GREEN LIGHT",
            "🟢 GREEN LIGHT: AGGRESSIVE LONG",
            "100% Position Sizing (Full Risk)",
            "Clean healthy market: 10 & 20 EMAs rising above rising 50 SMA. Breakouts succeed smoothly and trend continuation works. Trade full sizes on top-quality setups.",
        )

    # 3. Caution / Pullback / Consolidation (Yellow Light)
    # - Pullbacks into rising 10/20 EMA or sideways compression
    return (
        "CAUTION",
        "Pullback / Consolidation",
        "YELLOW LIGHT",
        "🟡 YELLOW LIGHT: SELECTIVE TRADING",
        "25–50% Sizing (Reduced Size)",
        "Market in consolidation or pulling back toward 10/20 EMA. Slower follow-through; stay selective, trim targets into strength, and maintain tight stops.",
    )


_regime_df_cache: Dict[str, pd.DataFrame] = {}
_daily_lookup_cache: Dict[str, Dict[str, Dict[str, Any]]] = {}


def clear_qullamaggie_cache():
    """Clears in-memory Qullamaggie regime data cache."""
    _regime_df_cache.clear()
    _daily_lookup_cache.clear()


def build_qullamaggie_regime_dataframe(conn, symbol: str = "QQQ") -> pd.DataFrame:
    """
    Fetches full history of symbol (default QQQ) and computes the 10 EMA, 20 EMA, 50 SMA,
    slopes, distances, stack order, and Qullamaggie market regime classification.
    Results are cached in memory for sub-millisecond repeated lookups.
    """
    if symbol in _regime_df_cache:
        return _regime_df_cache[symbol]

    query = """
        SELECT date, close
        FROM daily_bars
        WHERE symbol = ?
        ORDER BY date ASC
    """
    df = conn.execute(query, [symbol]).df()
    if df.empty:
        return pd.DataFrame()

    df["date_str"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["ema_10"] = df["close"].ewm(span=10, adjust=False).mean()
    df["ema_20"] = df["close"].ewm(span=20, adjust=False).mean()
    df["sma_50"] = df["close"].rolling(50).mean()

    # Slopes
    df["ema_10_slope"] = df["ema_10"].diff()
    df["ema_20_slope"] = df["ema_20"].diff()
    df["sma_50_slope"] = df["sma_50"].diff(3)  # 3-session diff for smooth 50 SMA slope

    # Percentage distances
    df["dist_ema10_pct"] = ((df["close"] - df["ema_10"]) / df["ema_10"] * 100.0).round(2)
    df["dist_ema20_pct"] = ((df["close"] - df["ema_20"]) / df["ema_20"] * 100.0).round(2)
    df["dist_sma50_pct"] = ((df["close"] - df["sma_50"]) / df["sma_50"] * 100.0).round(2)

    # Classify each row using itertuples (10x faster than iterrows)
    codes, labels, badges, stances, exposures, guidances = [], [], [], [], [], []
    stacks = []

    for row in df.itertuples(index=False):
        c = float(row.close)
        e10 = float(row.ema_10)
        e20 = float(row.ema_20)
        s50 = float(row.sma_50) if pd.notna(row.sma_50) else None
        s10 = float(row.ema_10_slope) if pd.notna(row.ema_10_slope) else 0.0
        s20 = float(row.ema_20_slope) if pd.notna(row.ema_20_slope) else 0.0
        s50_s = float(row.sma_50_slope) if pd.notna(row.sma_50_slope) else 0.0

        code, label, badge, stance, exposure, guidance = classify_qullamaggie_row(
            close=c,
            ema_10=e10,
            ema_20=e20,
            sma_50=s50,
            ema_10_slope=s10,
            ema_20_slope=s20,
            sma_50_slope=s50_s,
        )
        codes.append(code)
        labels.append(label)
        badges.append(badge)
        stances.append(stance)
        exposures.append(exposure)
        guidances.append(guidance)

        # Stack representation
        if s50 is not None:
            items = [("P", c), ("10", e10), ("20", e20), ("50", s50)]
            items.sort(key=lambda x: x[1] if x[1] is not None else -1e9, reverse=True)
            stacks.append(" > ".join([k for k, _ in items]))
        else:
            stacks.append("-")

    df["kq_code"] = codes
    df["kq_label"] = labels
    df["kq_badge"] = badges
    df["kq_stance"] = stances
    df["kq_exposure"] = exposures
    df["kq_guidance"] = guidances
    df["kq_stack"] = stacks

    _regime_df_cache[symbol] = df
    return df


def get_qullamaggie_market_summary(conn, symbol: str = "QQQ", as_of_date: Optional[str] = None) -> Dict[str, Any]:
    """Returns the Qullamaggie Market Evaluation summary object for the dashboard (optionally as of a historical date)."""
    df = build_qullamaggie_regime_dataframe(conn, symbol=symbol)
    if df.empty:
        return {}

    if as_of_date:
        df_sub = df[df["date_str"] <= as_of_date]
    else:
        today_str = pd.Timestamp.now().strftime("%Y-%m-%d")
        df_sub = df[df["date_str"] <= today_str]

    if df_sub.empty:
        return {}
    latest = df_sub.iloc[-1]
    prev = df_sub.iloc[-2] if len(df_sub) > 1 else latest

    c = round(float(latest["close"]), 2)
    prev_c = round(float(prev["close"]), 2)
    chg_pct = round(((c - prev_c) / prev_c) * 100.0, 2) if prev_c > 0 else 0.0

    e10 = round(float(latest["ema_10"]), 2)
    e20 = round(float(latest["ema_20"]), 2)
    s50 = round(float(latest["sma_50"]), 2) if pd.notna(latest["sma_50"]) else None

    e10_slope = round(float(latest["ema_10_slope"]), 2) if pd.notna(latest["ema_10_slope"]) else 0.0
    e20_slope = round(float(latest["ema_20_slope"]), 2) if pd.notna(latest["ema_20_slope"]) else 0.0
    s50_slope = round(float(latest["sma_50_slope"]), 2) if pd.notna(latest["sma_50_slope"]) else 0.0

    is_aligned = bool(
        s50 is not None and c >= e10 and e10 >= e20 and e20 >= s50 and e10_slope >= 0 and e20_slope >= 0
    )

    return {
        "index_symbol": symbol,
        "date": str(latest["date_str"]),
        "close": c,
        "change_pct": chg_pct,
        "ema_10": e10,
        "ema_20": e20,
        "sma_50": s50,
        "ema_10_slope": e10_slope,
        "ema_20_slope": e20_slope,
        "sma_50_slope": s50_slope,
        "dist_ema10_pct": float(latest["dist_ema10_pct"]),
        "dist_ema20_pct": float(latest["dist_ema20_pct"]),
        "dist_sma50_pct": float(latest["dist_sma50_pct"]) if pd.notna(latest["dist_sma50_pct"]) else 0.0,
        "regime": str(latest["kq_code"]),
        "label": str(latest["kq_label"]),
        "badge": str(latest["kq_badge"]),
        "stance": str(latest["kq_stance"]),
        "exposure": str(latest["kq_exposure"]),
        "guidance": str(latest["kq_guidance"]),
        "stack": str(latest["kq_stack"]),
        "is_aligned": is_aligned,
    }


def get_qullamaggie_daily_lookup(conn, symbol: str = "QQQ") -> Dict[str, Dict[str, Any]]:
    """Returns a dictionary keyed by 'YYYY-MM-DD' for fast joining against setup candidate dates."""
    if symbol in _daily_lookup_cache:
        return _daily_lookup_cache[symbol]

    df = build_qullamaggie_regime_dataframe(conn, symbol=symbol)
    if df.empty:
        return {}

    lookup = {}
    for row in df.itertuples(index=False):
        d_str = str(row.date_str)
        lookup[d_str] = {
            "date": d_str,
            "regime": str(row.kq_code),  # BULLISH, CAUTION, BEARISH
            "label": str(row.kq_label),
            "badge": str(row.kq_badge),
            "stance": str(row.kq_stance),
            "exposure": str(row.kq_exposure),
            "stack": str(row.kq_stack),
            "close": round(float(row.close), 2),
            "ema_10": round(float(row.ema_10), 2),
            "ema_20": round(float(row.ema_20), 2),
            "sma_50": round(float(row.sma_50), 2) if pd.notna(row.sma_50) else None,
            "dist_ema10_pct": float(row.dist_ema10_pct),
            "dist_ema20_pct": float(row.dist_ema20_pct),
            "dist_sma50_pct": float(row.dist_sma50_pct) if pd.notna(row.dist_sma50_pct) else 0.0,
        }

    _daily_lookup_cache[symbol] = lookup
    return lookup


def calculate_composite_market_light(
    kq_eval: Optional[Dict[str, Any]] = None,
    weinstein_verdict: Optional[Dict[str, Any]] = None,
    stockbee_metrics: Optional[Dict[str, Any]] = None,
    dist_pressure: int = 0
) -> Dict[str, Any]:
    """
    Synthesizes three legendary momentum & market regime frameworks into a unified Composite Market Light:
    1. Kristjan Qullamaggie: QQQ Moving Average Stack & Trend Alignment (P > 10 > 20 > 50)
    2. Stan Weinstein: 4-Pillar Stage Analysis & Macro Evidence Matrix (SPY vs 30W SMA, A/D Line, Net New Highs, % > 200 SMA)
    3. Pradeep Bonde (Stockbee): 4% Up/Down Thrust & Momentum Velocity (Ratio, 5D net momentum)

    Returns a comprehensive composite evaluation dict:
    - light: 'GREEN LIGHT' | 'YELLOW LIGHT' | 'RED LIGHT'
    - light_code: 'GREEN' | 'YELLOW' | 'RED'
    - color: '#10b981' | '#f59e0b' | '#ef4444'
    - glow: 'rgba(...)'
    - composite_score: int (-3 to +3)
    - stance: str
    - exposure: str
    - guidance: str
    - pillars: Dict[str, Dict[str, Any]] (detailed breakdown of Qullamaggie, Weinstein, Stockbee)
    - safety_overrides_applied: List[str]
    """
    kq = kq_eval or {}
    weinstein = weinstein_verdict or {}
    sb = stockbee_metrics or {}

    # --- Pillar 1: Qullamaggie ---
    kq_badge = str(kq.get("badge", "YELLOW LIGHT")).upper()
    if "GREEN" in kq_badge:
        kq_vote = 1
        kq_status = "BULLISH"
        kq_color = "#10b981"
        kq_summary = f"QQQ Trend Intact ({kq.get('stack', 'P > 10 > 20 > 50')})"
    elif "RED" in kq_badge:
        kq_vote = -1
        kq_status = "BEARISH"
        kq_color = "#ef4444"
        kq_summary = f"Downtrend / Broken MAs ({kq.get('stack', '-')})"
    else:
        kq_vote = 0
        kq_status = "NEUTRAL"
        kq_color = "#f59e0b"
        kq_summary = f"Pullback / Consolidation ({kq.get('stack', '-')})"

    # --- Pillar 2: Stan Weinstein ---
    w_score = int(weinstein.get("score", 2) or 2)
    w_stage = str(weinstein.get("stage", "Stage 1 / 3 (Transition / Divergence)"))
    if w_score >= 3:
        w_vote = 1
        w_status = "BULLISH"
        w_color = "#10b981"
        w_summary = f"Stage 2 Bull Confirmed ({w_score}/4 Evidence)"
    elif w_score <= 1:
        w_vote = -1
        w_status = "BEARISH"
        w_color = "#ef4444"
        w_summary = f"Stage 4 Bear Market ({w_score}/4 Evidence)"
    else:
        w_vote = 0
        w_status = "NEUTRAL"
        w_color = "#f59e0b"
        w_summary = f"Stage 1/3 Transition ({w_score}/4 Evidence)"

    # --- Pillar 3: Stockbee 4% Momentum Thrust ---
    sb_ratio = float(sb.get("latest_ratio_4pct") or sb.get("ratio_4pct") or 1.0)
    sb_ratio_5d = float(sb.get("latest_ratio_5d") or sb.get("ratio_5d") or 1.0)
    gainers = int(sb.get("latest_gainers_4pct") or sb.get("gainers_4pct") or 0)
    losers = int(sb.get("latest_losers_4pct") or sb.get("losers_4pct") or 0)
    net_5d = int(sb.get("sum_5d_net_4pct") or 0)

    is_sb_bull = (sb_ratio >= 1.5 or (gainers >= 300 and gainers > losers)) and (sb_ratio_5d >= 1.0 or net_5d >= 0)
    is_sb_bear = (sb_ratio <= 0.67 or (losers >= 300 and losers > gainers)) and (sb_ratio_5d <= 1.0 or net_5d <= 0)

    if is_sb_bull:
        sb_vote = 1
        sb_status = "BULLISH"
        sb_color = "#10b981"
        sb_summary = f"4% Expansion Thrust (+{gainers} vs -{losers}, {sb_ratio:.2f}x)"
    elif is_sb_bear:
        sb_vote = -1
        sb_status = "BEARISH"
        sb_color = "#ef4444"
        sb_summary = f"4% Distribution Contraction (+{gainers} vs -{losers}, {sb_ratio:.2f}x)"
    else:
        sb_vote = 0
        sb_status = "NEUTRAL"
        sb_color = "#f59e0b"
        sb_summary = f"Rotational / Balanced (+{gainers} vs -{losers}, {sb_ratio:.2f}x)"

    # Composite Score (-3 to +3)
    composite_score = kq_vote + w_vote + sb_vote
    overrides = []

    if composite_score >= 2:
        light_code = "GREEN"
        light_badge = "GREEN LIGHT"
        light_color = "#10b981"
        light_glow = "rgba(16, 185, 129, 0.25)"
    elif composite_score <= -2:
        light_code = "RED"
        light_badge = "RED LIGHT"
        light_color = "#f43f5e"
        light_glow = "rgba(244, 63, 94, 0.25)"
    else:
        light_code = "YELLOW"
        light_badge = "YELLOW LIGHT"
        light_color = "#f59e0b"
        light_glow = "rgba(245, 158, 11, 0.25)"

    # Institutional Safety Overrides
    if dist_pressure >= 5 and light_code == "GREEN":
        light_code = "YELLOW"
        light_badge = "YELLOW LIGHT"
        light_color = "#f59e0b"
        light_glow = "rgba(245, 158, 11, 0.25)"
        overrides.append(f"Capped at YELLOW LIGHT: Heavy distribution pressure ({dist_pressure} active distribution marks).")

    if w_vote == -1 and light_code == "GREEN":
        light_code = "YELLOW"
        light_badge = "YELLOW LIGHT"
        light_color = "#f59e0b"
        light_glow = "rgba(245, 158, 11, 0.25)"
        overrides.append("Capped at YELLOW LIGHT: Stan Weinstein macro breadth is in Stage 4 Bear breakdown.")

    if is_sb_bear and light_code == "GREEN":
        light_code = "YELLOW"
        light_badge = "YELLOW LIGHT"
        light_color = "#f59e0b"
        light_glow = "rgba(245, 158, 11, 0.25)"
        overrides.append("Capped at YELLOW LIGHT: Stockbee 4% breadth expansion is negative.")

    # Formulate Stance, Exposure, and Guidance
    if light_code == "GREEN":
        stance = "🟢 OFFENSIVE: EXPANSION MODE"
        exposure = "75% – 100%+ (Full Size & Margin/Aggressive)"
        guidance = "All 3 pillars (Qullamaggie trend, Weinstein breadth, and Stockbee thrust) aligned in positive expansion. High probability of sustained follow-through on breakout setups. Press high-conviction winners."
    elif light_code == "YELLOW":
        stance = "🟡 SELECTIVE: ROTATIONAL / REDUCED SIZE"
        exposure = "25% – 50% Sizing (Cautious / Selective)"
        guidance = "Mixed evidence across frameworks (e.g. index resilient but breadth waning, or pulling back in consolidation). Stay selective, demand tighter bases (VCP), trim targets into strength, and keep stops tight."
    else:
        stance = "🔴 DEFENSIVE: CAPITAL PRESERVATION"
        exposure = "0% – 20% (Cash is King / Risk Off)"
        guidance = "Broad market in confirmed distribution or Stage 4 decline across consensus indicators. Breakouts have a high failure rate. Protect capital, preserve buying power in cash, or focus on hedge/short setups."

    return {
        "light": light_badge,
        "light_code": light_code,
        "color": light_color,
        "glow": light_glow,
        "composite_score": composite_score,
        "score_label": f"{composite_score:+d} of 3",
        "stance": stance,
        "exposure": exposure,
        "guidance": guidance,
        "safety_overrides": overrides,
        "pillars": {
            "qullamaggie": {
                "name": "Qullamaggie Trend Alignment",
                "vote": kq_vote,
                "status": kq_status,
                "color": kq_color,
                "summary": kq_summary,
                "stack": kq.get("stack", "P > 10 > 20 > 50")
            },
            "weinstein": {
                "name": "Weinstein Stage Analysis",
                "vote": w_vote,
                "status": w_status,
                "color": w_color,
                "summary": w_summary,
                "stage": w_stage,
                "score": w_score
            },
            "stockbee": {
                "name": "Stockbee 4% Breadth Thrust",
                "vote": sb_vote,
                "status": sb_status,
                "color": sb_color,
                "summary": sb_summary,
                "ratio_4pct": sb_ratio,
                "gainers_4pct": gainers,
                "losers_4pct": losers
            }
        }
    }


