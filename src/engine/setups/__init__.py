"""
PivotTrader Setup Screeners Package

Contains specialized technical screener detectors for chart patterns:
- Volatility Contraction Pattern (VCP)
- Darvas Box Consolidation / Breakout
- Episodic Pivots (EP)
- Parabolic Extension (Short & Long Climax)
"""

from src.engine.setups.vcp import detect_vcp
from src.engine.setups.darvas_box import detect_darvas_box
from src.engine.setups.episodic_pivot import detect_episodic_pivot
from src.engine.setups.parabolic_extension import detect_parabolic_extension
from src.engine.setups.power_play import detect_power_play
from src.engine.setups.breakout import detect_breakout

__all__ = [
    "detect_vcp",
    "detect_darvas_box",
    "detect_episodic_pivot",
    "detect_parabolic_extension",
    "detect_power_play",
    "detect_breakout",
]
