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


def get_qullamaggie_market_summary(conn, symbol: str = "QQQ") -> Dict[str, Any]:
    """Returns the latest Qullamaggie Market Evaluation summary object for the dashboard."""
    df = build_qullamaggie_regime_dataframe(conn, symbol=symbol)
    if df.empty:
        return {}

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest

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

