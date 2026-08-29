"""
PivotTrader Setup Screeners Package

Contains specialized technical screener detectors for chart patterns:
- Volatility Contraction Pattern (VCP)
- Episodic Pivots (EP)
- Parabolic Extension (Short & Long Climax)
"""

from application.engine.setups.vcp import detect_vcp
from application.engine.setups.episodic_pivot import detect_episodic_pivot
from application.engine.setups.parabolic_extension import detect_parabolic_extension
from application.engine.setups.power_play import detect_power_play
from application.engine.setups.breakout import detect_breakout

__all__ = [
    "detect_vcp",
    "detect_episodic_pivot",
    "detect_parabolic_extension",
    "detect_power_play",
    "detect_breakout",
]
