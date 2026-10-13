"""Shared quantitative indicator calculations.

Zero lookahead bias: functions operate strictly on historical series up to current index.
"""
from typing import List, Optional


def calculate_ema(prices: List[float], span: int) -> Optional[float]:
    """Calculate Exponential Moving Average over a price series.

    Returns the latest EMA value rounded to 2 decimal places, or None if prices < span.
    """
    if not prices or len(prices) < span:
        return None
    k = 2.0 / (span + 1.0)
    ema = float(prices[0])
    for p in prices[1:]:
        ema = float(p) * k + ema * (1.0 - k)
    return round(ema, 2)


def calculate_sma(prices: List[float], span: int) -> Optional[float]:
    """Calculate Simple Moving Average over the last `span` prices.

    Returns the latest SMA value rounded to 2 decimal places, or None if prices < span.
    """
    if not prices or len(prices) < span:
        return None
    return round(sum(prices[-span:]) / float(span), 2)
