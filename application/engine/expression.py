import ast
import re
from typing import Dict, Any, List, Set, Tuple, Optional

class ExpressionError(Exception):
    """Raised when scan expression syntax or variable validation fails."""
    pass


# Variable catalog with metadata (label, category, description, sql mapping)
# table_alias: 'b' for daily_bars, 'f' for quarterly_fundamentals
VARIABLE_CATALOG: Dict[str, Dict[str, Any]] = {
    # ---------------- Bar Prices & Volume ----------------
    "C": {
        "sql": "b.close",
        "type": "numeric",
        "label": "Close",
        "category": "price",
        "description": "Current bar closing price"
    },
    "CLOSE": {
        "sql": "b.close",
        "type": "numeric",
        "label": "Close",
        "category": "price",
        "description": "Current bar closing price"
    },
    "O": {
        "sql": "b.open",
        "type": "numeric",
        "label": "Open",
        "category": "price",
        "description": "Current bar opening price"
    },
    "OPEN": {
        "sql": "b.open",
        "type": "numeric",
        "label": "Open",
        "category": "price",
        "description": "Current bar opening price"
    },
    "H": {
        "sql": "b.high",
        "type": "numeric",
        "label": "High",
        "category": "price",
        "description": "Current bar intraday high price"
    },
    "HIGH": {
        "sql": "b.high",
        "type": "numeric",
        "label": "High",
        "category": "price",
        "description": "Current bar intraday high price"
    },
    "L": {
        "sql": "b.low",
        "type": "numeric",
        "label": "Low",
        "category": "price",
        "description": "Current bar intraday low price"
    },
    "LOW": {
        "sql": "b.low",
        "type": "numeric",
        "label": "Low",
        "category": "price",
        "description": "Current bar intraday low price"
    },
    "V": {
        "sql": "b.volume",
        "type": "numeric",
        "label": "Volume",
        "category": "volume",
        "description": "Current bar share volume"
    },
    "VOL": {
        "sql": "b.volume",
        "type": "numeric",
        "label": "Volume",
        "category": "volume",
        "description": "Current bar share volume"
    },
    "VOLUME": {
        "sql": "b.volume",
        "type": "numeric",
        "label": "Volume",
        "category": "volume",
        "description": "Current bar share volume"
    },

    # ---------------- Historical Bar Lags ----------------
    "C1": {
        "sql": "b.lag_c1",
        "type": "numeric",
        "is_lag": True,
        "label": "Close 1d Ago",
        "category": "price",
        "description": "Closing price 1 bar ago (yesterday)"
    },
    "C2": {
        "sql": "b.lag_c2",
        "type": "numeric",
        "is_lag": True,
        "label": "Close 2d Ago",
        "category": "price",
        "description": "Closing price 2 bars ago"
    },
    "O1": {
        "sql": "b.lag_o1",
        "type": "numeric",
        "is_lag": True,
        "label": "Open 1d Ago",
        "category": "price",
        "description": "Opening price 1 bar ago"
    },
    "H1": {
        "sql": "b.lag_h1",
        "type": "numeric",
        "is_lag": True,
        "label": "High 1d Ago",
        "category": "price",
        "description": "High price 1 bar ago"
    },
    "L1": {
        "sql": "b.lag_l1",
        "type": "numeric",
        "is_lag": True,
        "label": "Low 1d Ago",
        "category": "price",
        "description": "Low price 1 bar ago"
    },
    "V1": {
        "sql": "b.lag_v1",
        "type": "numeric",
        "is_lag": True,
        "label": "Volume 1d Ago",
        "category": "volume",
        "description": "Share volume 1 bar ago"
    },

    # ---------------- Moving Averages ----------------
    "AVGC50": {
        "sql": "b.sma_50",
        "type": "numeric",
        "label": "50 SMA (Close)",
        "category": "averages",
        "description": "50-day simple moving average of close"
    },
    "SMA50": {
        "sql": "b.sma_50",
        "type": "numeric",
        "label": "50 SMA",
        "category": "averages",
        "description": "50-day simple moving average"
    },
    "SMA_50": {
        "sql": "b.sma_50",
        "type": "numeric",
        "label": "50 SMA",
        "category": "averages",
        "description": "50-day simple moving average"
    },
    "AVGC150": {
        "sql": "b.sma_150",
        "type": "numeric",
        "label": "150 SMA",
        "category": "averages",
        "description": "150-day simple moving average"
    },
    "SMA150": {
        "sql": "b.sma_150",
        "type": "numeric",
        "label": "150 SMA",
        "category": "averages",
        "description": "150-day simple moving average"
    },
    "SMA_150": {
        "sql": "b.sma_150",
        "type": "numeric",
        "label": "150 SMA",
        "category": "averages",
        "description": "150-day simple moving average"
    },
    "AVGC200": {
        "sql": "b.sma_200",
        "type": "numeric",
        "label": "200 SMA",
        "category": "averages",
        "description": "200-day simple moving average"
    },
    "SMA200": {
        "sql": "b.sma_200",
        "type": "numeric",
        "label": "200 SMA",
        "category": "averages",
        "description": "200-day simple moving average"
    },
    "SMA_200": {
        "sql": "b.sma_200",
        "type": "numeric",
        "label": "200 SMA",
        "category": "averages",
        "description": "200-day simple moving average"
    },
    "SMA_200_20D_AGO": {
        "sql": "b.sma_200_20d_ago",
        "type": "numeric",
        "label": "200 SMA 20d Ago",
        "category": "averages",
        "description": "200-day simple moving average 20 trading days ago"
    },
    "SMA200_20D": {
        "sql": "b.sma_200_20d_ago",
        "type": "numeric",
        "label": "200 SMA 20d Ago",
        "category": "averages",
        "description": "200-day simple moving average 20 trading days ago"
    },
    "XAVGC10": {
        "sql": "b.ema_10",
        "type": "numeric",
        "label": "10 EMA",
        "category": "averages",
        "description": "10-day exponential moving average"
    },
    "EMA10": {
        "sql": "b.ema_10",
        "type": "numeric",
        "label": "10 EMA",
        "category": "averages",
        "description": "10-day exponential moving average"
    },
    "EMA_10": {
        "sql": "b.ema_10",
        "type": "numeric",
        "label": "10 EMA",
        "category": "averages",
        "description": "10-day exponential moving average"
    },
    "XAVGC20": {
        "sql": "b.ema_20",
        "type": "numeric",
        "label": "20 EMA",
        "category": "averages",
        "description": "20-day exponential moving average"
    },
    "EMA20": {
        "sql": "b.ema_20",
        "type": "numeric",
        "label": "20 EMA",
        "category": "averages",
        "description": "20-day exponential moving average"
    },
    "EMA_20": {
        "sql": "b.ema_20",
        "type": "numeric",
        "label": "20 EMA",
        "category": "averages",
        "description": "20-day exponential moving average"
    },
    "XAVGC50": {
        "sql": "b.ema_50",
        "type": "numeric",
        "label": "50 EMA",
        "category": "averages",
        "description": "50-day exponential moving average"
    },
    "EMA50": {
        "sql": "b.ema_50",
        "type": "numeric",
        "label": "50 EMA",
        "category": "averages",
        "description": "50-day exponential moving average"
    },
    "EMA_50": {
        "sql": "b.ema_50",
        "type": "numeric",
        "label": "50 EMA",
        "category": "averages",
        "description": "50-day exponential moving average"
    },
    "AVGV50": {
        "sql": "b.vol_50d_ma",
        "type": "numeric",
        "label": "50d Vol MA",
        "category": "volume",
        "description": "50-day simple moving average of volume"
    },
    "VOL_50D_MA": {
        "sql": "b.vol_50d_ma",
        "type": "numeric",
        "label": "50d Vol MA",
        "category": "volume",
        "description": "50-day simple moving average of volume"
    },
    "DOLLAR_VOL": {
        "sql": "COALESCE(b.dollar_vol_50d_ma, b.close * b.vol_50d_ma)",
        "type": "numeric",
        "label": "50d Dollar Vol",
        "category": "volume",
        "description": "50-day average dollar volume (Price x Volume)"
    },
    "DOLLARV50": {
        "sql": "COALESCE(b.dollar_vol_50d_ma, b.close * b.vol_50d_ma)",
        "type": "numeric",
        "label": "50d Dollar Vol",
        "category": "volume",
        "description": "50-day average dollar volume"
    },

    # ---------------- Trend, RS & Momentum ----------------
    "RS_RANK": {
        "sql": "b.rs_rank",
        "type": "numeric",
        "label": "RS Rank (0-99)",
        "category": "trend",
        "description": "IBD-style Relative Strength Rank percentile (0 to 99)"
    },
    "RS": {
        "sql": "b.rs_rank",
        "type": "numeric",
        "label": "RS Rank",
        "category": "trend",
        "description": "Relative Strength Rank"
    },
    "RS_SCORE": {
        "sql": "b.rs_score",
        "type": "numeric",
        "label": "RS Score",
        "category": "trend",
        "description": "Raw Relative Strength Score"
    },
    "TI65": {
        "sql": "b.ti_65",
        "type": "numeric",
        "label": "TI65",
        "category": "trend",
        "description": "Stockbee Trend Intensity (Close / 65 SMA)"
    },
    "TI_65": {
        "sql": "b.ti_65",
        "type": "numeric",
        "label": "TI65",
        "category": "trend",
        "description": "Stockbee Trend Intensity (Close / 65 SMA)"
    },
    "IS_52W_HIGH": {
        "sql": "COALESCE(b.is_52w_high, false)",
        "type": "boolean",
        "label": "Is 52w High",
        "category": "trend",
        "description": "Stock is currently at or within 3% of 52-week high"
    },
    "HIGH_52W": {
        "sql": "b.high_52w",
        "type": "numeric",
        "label": "52-Week High",
        "category": "trend",
        "description": "52-week high price"
    },
    "LOW_52W": {
        "sql": "b.low_52w",
        "type": "numeric",
        "label": "52-Week Low",
        "category": "trend",
        "description": "52-week low price"
    },
    "DIST_52W_HIGH": {
        "sql": "b.dist_from_52w_high",
        "type": "numeric",
        "label": "Dist 52w High %",
        "category": "trend",
        "description": "Percentage distance below 52-week high"
    },
    "DIST_52W_LOW": {
        "sql": "b.dist_from_52w_low",
        "type": "numeric",
        "label": "Dist 52w Low %",
        "category": "trend",
        "description": "Percentage distance above 52-week low"
    },
    "DAYS_52W_HIGH": {
        "sql": "b.days_since_52w_high",
        "type": "numeric",
        "label": "Days Since 52w High",
        "category": "trend",
        "description": "Trading days elapsed since 52-week high"
    },
    "DAYS_SINCE_52W_HIGH": {
        "sql": "b.days_since_52w_high",
        "type": "numeric",
        "label": "Days Since 52w High",
        "category": "trend",
        "description": "Trading days elapsed since 52-week high"
    },
    "HIGH_52W_DAYS": {
        "sql": "b.days_since_52w_high",
        "type": "numeric",
        "label": "Days Since 52w High",
        "category": "trend",
        "description": "Trading days elapsed since 52-week high"
    },
    "RET_1M": {
        "sql": "b.ret_1m",
        "type": "numeric",
        "label": "1-Month Return %",
        "category": "trend",
        "description": "1-month percentage return (21 trading days)"
    },
    "RET_3M": {
        "sql": "b.ret_3m",
        "type": "numeric",
        "label": "3-Month Return %",
        "category": "trend",
        "description": "3-month percentage return (63 trading days)"
    },
    "RET_6M": {
        "sql": "b.ret_6m",
        "type": "numeric",
        "label": "6-Month Return %",
        "category": "trend",
        "description": "6-month percentage return (126 trading days)"
    },

    # ---------------- Volatility & Pivot Range ----------------
    "ADR20": {
        "sql": "b.adr_20d",
        "type": "numeric",
        "label": "ADR% (20d)",
        "category": "volatility",
        "description": "20-day Average Daily Range percentage"
    },
    "ADR": {
        "sql": "b.adr_20d",
        "type": "numeric",
        "label": "ADR% (20d)",
        "category": "volatility",
        "description": "20-day Average Daily Range percentage"
    },
    "ATR20": {
        "sql": "b.atr_20d",
        "type": "numeric",
        "label": "ATR (20d)",
        "category": "volatility",
        "description": "20-day Average True Range in dollars"
    },
    "PIVOT_SPREAD": {
        "sql": "b.pivot_spread_pct",
        "type": "numeric",
        "label": "Pivot Spread %",
        "category": "volatility",
        "description": "3-day consolidation spread percentage (High - Low) / Close"
    },
    "PIVOT_CLUSTERING": {
        "sql": "b.pivot_close_clustering_pct",
        "type": "numeric",
        "label": "Pivot Clustering %",
        "category": "volatility",
        "description": "3-day close price clustering tightness percentage"
    },
    "PIVOT_VOL_RATIO": {
        "sql": "(b.volume / NULLIF(b.vol_50d_ma, 0))",
        "type": "numeric",
        "label": "Pivot Vol Ratio",
        "category": "volatility",
        "description": "Current volume compared to 50d volume average"
    },

    # ---------------- Pattern Primitives & Metrics ----------------
    "RUNUP": {
        "sql": "b.pp_runup_pct",
        "type": "numeric",
        "label": "Runup %",
        "category": "pattern",
        "description": "Explosive prior runup percentage over prior 8 weeks (40 trading days)"
    },
    "RUNUP_PCT": {
        "sql": "b.pp_runup_pct",
        "type": "numeric",
        "label": "Runup %",
        "category": "pattern",
        "description": "Explosive prior runup percentage over prior 8 weeks"
    },
    "RUNUP_DAYS": {
        "sql": "COALESCE(b.pp_runup_days, 0)",
        "type": "numeric",
        "label": "Runup Days",
        "category": "pattern",
        "description": "Trading days duration of prior runup to peak (<= 40 days / 8 weeks)"
    },
    "PULLBACK": {
        "sql": "b.pp_drawdown_pct",
        "type": "numeric",
        "label": "Pullback %",
        "category": "pattern",
        "description": "Maximum base pullback depth from peak high"
    },
    "PULLBACK_PCT": {
        "sql": "b.pp_drawdown_pct",
        "type": "numeric",
        "label": "Pullback %",
        "category": "pattern",
        "description": "Maximum base pullback depth from peak high"
    },
    "DAYS_SINCE_PEAK": {
        "sql": "b.pp_days_since_peak",
        "type": "numeric",
        "label": "Days Since Peak",
        "category": "pattern",
        "description": "Consolidation days spent in flag base"
    },
    "BASE_DAYS": {
        "sql": "b.pp_days_since_peak",
        "type": "numeric",
        "label": "Base Days",
        "category": "pattern",
        "description": "Consolidation days spent in base"
    },
    # Backward compatibility aliases
    "PP_RUNUP": {
        "sql": "b.pp_runup_pct",
        "type": "numeric",
        "label": "Power Play Runup %",
        "category": "pattern",
        "description": "Explosive prior runup percentage over prior 8 weeks"
    },
    "PP_DRAWDOWN": {
        "sql": "b.pp_drawdown_pct",
        "type": "numeric",
        "label": "Power Play Pullback %",
        "category": "pattern",
        "description": "Maximum base pullback depth from peak high"
    },
    "PP_DAYS": {
        "sql": "b.pp_days_since_peak",
        "type": "numeric",
        "label": "Power Play Base Days",
        "category": "pattern",
        "description": "Consolidation days spent in flag"
    },
    "GAP_PCT": {
        "sql": "b.gap_pct",
        "type": "numeric",
        "label": "Gap %",
        "category": "pattern",
        "description": "Overnight/morning gap percentage"
    },
    "REL_VOL": {
        "sql": "b.rel_vol_50d",
        "type": "numeric",
        "label": "Relative Volume",
        "category": "pattern",
        "description": "Volume multiple relative to 50d average volume"
    },
    "LOW_CHEAT_SETUP": {
        "sql": "COALESCE(b.low_cheat_is_setup, false)",
        "type": "boolean",
        "label": "Low Cheat Setup Flag",
        "category": "pattern",
        "description": "Precomputed Minervini Low Cheat setup flag"
    },
    "CHEAT": {
        "sql": "COALESCE(b.low_cheat_is_setup, false)",
        "type": "boolean",
        "label": "Cheat / 3-C",
        "category": "pattern",
        "description": "Minervini Cheat (3-C) entry in mid-upper base"
    },
    "BASE_DEPTH": {
        "sql": "b.low_cheat_base_depth",
        "type": "numeric",
        "label": "Base Depth %",
        "category": "pattern",
        "description": "Base correction depth from peak to low"
    },
    "BASE_POS": {
        "sql": "b.low_cheat_pivot_price",
        "type": "numeric",
        "label": "Base Position",
        "category": "pattern",
        "description": "Pivot position within base"
    },
    "PARABOLIC_SHORT": {
        "sql": "COALESCE(b.parabolic_short_is_setup, false)",
        "type": "boolean",
        "label": "Parabolic Climax",
        "category": "pattern",
        "description": "Overextended parabolic upward climax for shorting"
    },
    "DIST_EMA10": {
        "sql": "b.dist_ema10_pct",
        "type": "numeric",
        "label": "Dist 10 EMA %",
        "category": "pattern",
        "description": "Percentage stretch above 10 EMA"
    },
    "DIST_EMA20": {
        "sql": "b.dist_ema20_pct",
        "type": "numeric",
        "label": "Dist 20 EMA %",
        "category": "pattern",
        "description": "Percentage stretch above 20 EMA"
    },
    "DIST_EMA50": {
        "sql": "b.dist_ema50_pct",
        "type": "numeric",
        "label": "Dist 50 EMA %",
        "category": "pattern",
        "description": "Percentage stretch above 50 EMA"
    },
    "UP_DAYS": {
        "sql": "b.parabolic_up_days",
        "type": "numeric",
        "label": "Consecutive Up Days",
        "category": "pattern",
        "description": "Number of consecutive green/up days"
    },
    "PARABOLIC_RUNUP": {
        "sql": "b.parabolic_runup_pct",
        "type": "numeric",
        "label": "Parabolic Runup %",
        "category": "pattern",
        "description": "Fast runup percentage over recent climax window"
    },
    "VCP": {
        "sql": "COALESCE(b.vcp_is_setup, false)",
        "type": "boolean",
        "label": "VCP Contraction",
        "category": "pattern",
        "description": "Minervini Volatility Contraction Pattern (2-4 progressive contractions)"
    },
    "IPO_DAYS": {
        "sql": "b.ipo_days_count",
        "type": "numeric",
        "label": "Days Since IPO",
        "category": "pattern",
        "description": "Trading days since initial public offering"
    },
    "IPO_DRAWDOWN": {
        "sql": "b.ipo_drawdown_from_high",
        "type": "numeric",
        "label": "IPO Drawdown %",
        "category": "pattern",
        "description": "Drawdown from all-time high in IPO base"
    },
    "IPO_DEPTH": {
        "sql": "b.ipo_base_depth",
        "type": "numeric",
        "label": "IPO Base Depth %",
        "category": "pattern",
        "description": "Correction depth of first IPO base"
    },

    # ---------------- Fundamentals ----------------
    "EPS_GROWTH": {
        "sql": "f.eps_qoq_growth",
        "type": "numeric",
        "label": "EPS Growth QoQ %",
        "category": "fundamental",
        "description": "Quarterly EPS Year-over-Year growth percentage"
    },
    "EPS_DILUTED": {
        "sql": "f.eps_diluted",
        "type": "numeric",
        "label": "Diluted EPS",
        "category": "fundamental",
        "description": "Most recent quarterly diluted earnings per share"
    },
    "REVENUE": {
        "sql": "f.total_revenue",
        "type": "numeric",
        "label": "Total Revenue",
        "category": "fundamental",
        "description": "Quarterly total revenue"
    },
    # ---------------- Institutional Sponsorship (CAN SLIM "I") ----------------
    "INST_HOLDERS": {
        "sql": "f.inst_holders_count",
        "type": "numeric",
        "label": "Institutional Holders Count",
        "category": "fundamental",
        "description": "Total number of institutional funds holding the stock in the latest quarter"
    },
    "INST_STREAK": {
        "sql": "f.sponsorship_streak",
        "type": "numeric",
        "label": "Sponsorship Streak Quarters",
        "category": "fundamental",
        "description": "Consecutive quarters of increasing institutional fund count (e.g. 2, 3, or 4)"
    },
    "INST_QOQ_CHANGE": {
        "sql": "f.inst_holders_qoq_change",
        "type": "numeric",
        "label": "Inst Holders QoQ Change",
        "category": "fundamental",
        "description": "Net new institutional funds added in the most recent quarter"
    },
    "INST_OWN_PCT": {
        "sql": "f.inst_ownership_pct",
        "type": "numeric",
        "label": "Institutional Ownership %",
        "category": "fundamental",
        "description": "Percentage of float held by institutions"
    }
}


# Composite Expression Aliases Catalog
# Defines reusable composite filters and setups constructed from primitive variables.
ALIAS_CATALOG: Dict[str, Dict[str, Any]] = {
    "STAGE2": {
        "expr": (
            "SMA_50 IS NOT NULL AND SMA_150 IS NOT NULL AND SMA_200 IS NOT NULL "
            "AND C > SMA_50 AND SMA_50 > SMA_150 AND SMA_150 > SMA_200 "
            "AND (SMA_200_20D_AGO IS NULL OR SMA_200 > SMA_200_20D_AGO) "
            "AND (DIST_52W_HIGH IS NULL OR DIST_52W_HIGH <= 25.0) "
            "AND (DIST_52W_LOW IS NULL OR DIST_52W_LOW >= 25.0)"
        ),
        "type": "boolean",
        "label": "Stage 2 Uptrend",
        "category": "trend",
        "description": "Minervini Stage 2 Trend Template (Close > 50 > 150 > 200 SMA, within 25% of 52w high & >= 25% above 52w low)"
    },
    "LOW_CHEAT": {
        "expr": (
            "SMA_50 IS NOT NULL AND SMA_150 IS NOT NULL AND SMA_200 IS NOT NULL "
            "AND SMA_50 > SMA_150 AND SMA_150 > SMA_200 "
            "AND (SMA_200_20D_AGO IS NULL OR SMA_200 > SMA_200_20D_AGO) "
            "AND (DIST_52W_HIGH IS NULL OR DIST_52W_HIGH <= 25.0) "
            "AND (DIST_52W_LOW IS NULL OR DIST_52W_LOW >= 25.0)"
        ),
        "type": "boolean",
        "label": "Low Cheat",
        "category": "trend",
        "description": "Stage 2 Trend Template without C > 50 SMA (Low Cheat early base setup)"
    },
    "BREAKOUT": {
        "expr": "COALESCE(RUNUP, 0) >= 30.0 OR COALESCE(RET_1M, 0) >= 15.0 OR COALESCE(RET_3M, 0) >= 30.0",
        "type": "boolean",
        "label": "Breakout",
        "category": "pattern",
        "description": "Qullamaggie Breakout / High Tight Flag pattern qualified"
    },
    "EPISODIC_PIVOT": {
        "expr": "COALESCE(GAP_PCT, 0) >= 10.0 AND COALESCE(REL_VOL, 0) >= 2.5",
        "type": "boolean",
        "label": "Episodic Pivot",
        "category": "pattern",
        "description": "Massive gap (>=10%) and heavy relative volume (>=2.5x)"
    },
    "IPO_BASE": {
        "expr": "IPO_DAYS IS NOT NULL AND IPO_DAYS >= 10 AND IPO_DAYS <= 350 AND IPO_DRAWDOWN <= 25.0 AND IPO_DEPTH <= 35.0",
        "type": "boolean",
        "label": "IPO Base",
        "category": "pattern",
        "description": "Accumulation base in recent IPOs (< 350 trading days)"
    }
}


class ScanExpressionEngine:
    """
    Parser, validator, and DuckDB SQL transpiler for TC2000 PCF scan expressions.
    Supports case-insensitive math, comparisons, logical operations, pattern primitives,
    and composite expression aliases.
    """

    _alias_sql_cache: Dict[Tuple[str, str], str] = {}

    @classmethod
    def get_alias_catalog(cls) -> Dict[str, Dict[str, Any]]:
        """Returns dictionary of all supported composite expression aliases."""
        return ALIAS_CATALOG

    @classmethod
    def get_alias_sql(cls, alias_name: str, table_alias: str = "b") -> str:
        """
        Returns transpiled SQL for a known alias, caching result for speed.
        Supports empty string '' for un-prefixed column names.
        """
        alias_key = alias_name.upper()
        cache_key = (alias_key, table_alias)
        if cache_key in cls._alias_sql_cache:
            return cls._alias_sql_cache[cache_key]

        if alias_key not in ALIAS_CATALOG:
            raise ExpressionError(f"Unknown alias '{alias_name}'.")

        sql, _, _, _, _, _ = cls.transpile_to_sql(
            ALIAS_CATALOG[alias_key]["expr"],
            table_alias=table_alias if table_alias else "b"
        )
        if not table_alias:
            sql = re.sub(r'\bb\.', '', sql)
        cls._alias_sql_cache[cache_key] = sql
        return sql

    @classmethod
    def expand_aliases(cls, expr: str, max_depth: int = 10) -> Tuple[str, Set[str]]:
        """
        Recursively expands all expression aliases to their underlying expressions.
        Returns: (expanded_expression, set_of_expanded_aliases)
        Raises: ExpressionError if a circular alias reference is detected.
        """
        used_aliases: Set[str] = set()
        current_expr = expr

        for _ in range(max_depth):
            expanded = False

            def _replace_alias(match):
                nonlocal expanded
                token = match.group(0)
                token_upper = token.upper()
                if token_upper in ALIAS_CATALOG:
                    used_aliases.add(token_upper)
                    expanded = True
                    return f"({ALIAS_CATALOG[token_upper]['expr']})"
                return token

            # Matches word tokens that are identifiers
            current_expr = re.sub(r'\b[A-Za-z_][A-Za-z0-9_]*\b', _replace_alias, current_expr)
            if not expanded:
                break
        else:
            raise ExpressionError("Circular alias reference detected during alias expansion.")

        return current_expr, used_aliases

    @classmethod
    def get_catalog(cls) -> Dict[str, Dict[str, Any]]:
        """Returns the full dictionary of supported variables and metadata, including aliases."""
        combined = dict(VARIABLE_CATALOG)
        for alias_name, meta in ALIAS_CATALOG.items():
            if alias_name not in combined:
                combined[alias_name] = {
                    "sql": cls.get_alias_sql(alias_name, table_alias="b"),
                    "type": meta.get("type", "boolean"),
                    "label": meta.get("label", alias_name),
                    "category": meta.get("category", "trend"),
                    "description": meta.get("description", ""),
                    "is_alias": True,
                    "expr": meta.get("expr", "")
                }
        return combined

    @classmethod
    def get_variables_by_category(cls) -> Dict[str, List[Dict[str, Any]]]:
        """Returns variables grouped by category for UI cheat-sheet and helper drawers."""
        grouped: Dict[str, List[Dict[str, Any]]] = {
            "price": [],
            "volume": [],
            "averages": [],
            "trend": [],
            "volatility": [],
            "pattern": [],
            "fundamental": []
        }
        seen_sql = set()
        catalog = cls.get_catalog()
        for var_name, meta in catalog.items():
            # Skip redundant alias keys in cheat-sheet display (e.g. CLOSE vs C)
            dedup_key = (meta.get("category"), meta.get("sql"))
            if dedup_key in seen_sql and len(var_name) > 4 and not meta.get("is_alias"):
                continue
            seen_sql.add(dedup_key)
            cat = meta.get("category", "price")
            item = dict(meta)
            item["symbol"] = var_name
            if cat in grouped:
                grouped[cat].append(item)
            else:
                grouped.setdefault(cat, []).append(item)
        return grouped

    @classmethod
    def normalize_expression(cls, expr: str) -> str:
        """
        Normalizes a TC2000-style formula string for safe Python AST parsing:
        1. Replace IS NOT NULL, != NULL, <> NULL with 'is not None'.
        2. Replace IS NULL, == NULL, = NULL with 'is None'.
        3. Replace <> with !=.
        4. Replace single '=' with '==' (when not part of <=, >=, !=, ==).
        5. Replace case-insensitive AND, OR, NOT with lowercase Python equivalents.
        """
        if not expr or not expr.strip():
            return ""

        s = expr.strip()

        # Normalize IS NOT NULL / IS NULL and comparisons with NULL
        s = re.sub(r'\bIS\s+NOT\s+NULL\b', 'is not None', s, flags=re.IGNORECASE)
        s = re.sub(r'\bIS\s+NULL\b', 'is None', s, flags=re.IGNORECASE)
        s = re.sub(r'(!=|<>)\s*NULL\b', 'is not None', s, flags=re.IGNORECASE)
        s = re.sub(r'(?<![<>!=])={1,2}\s*NULL\b', 'is None', s, flags=re.IGNORECASE)

        # Replace <> with !=
        s = s.replace("<>", "!=")

        # Replace single = with == (lookbehind and lookahead to avoid changing <=, >=, !=, ==)
        s = re.sub(r'(?<![<>!=])=(?![=])', '==', s)

        # Tokenize or replace case-insensitive word operators: AND, OR, NOT
        s = re.sub(r'\bAND\b', 'and', s, flags=re.IGNORECASE)
        s = re.sub(r'\bOR\b', 'or', s, flags=re.IGNORECASE)
        s = re.sub(r'\bNOT\b', 'not', s, flags=re.IGNORECASE)

        return s

    @classmethod
    def validate_and_parse(cls, expr: str) -> Tuple[ast.Expression, Set[str], bool]:
        """
        Parses expression into an AST, checks all nodes against whitelist,
        validates variable symbols, and identifies whether lagged variables (C1, V1, etc.) are present.
        Returns: (parsed_ast, used_variables, has_lags)
        Raises: ExpressionError if syntax is invalid or unknown variable is used.
        """
        expanded_expr, used_aliases = cls.expand_aliases(expr)
        normalized = cls.normalize_expression(expanded_expr)
        if not normalized:
            raise ExpressionError("Expression cannot be empty.")

        try:
            tree = ast.parse(normalized, mode='eval')
        except SyntaxError as se:
            raise ExpressionError(f"Syntax error at col {se.offset}: {se.text.strip() if se.text else str(se)}")

        used_variables: Set[str] = set()
        has_lags = False

        # Whitelist of allowed AST node classes
        allowed_nodes = (
            ast.Expression,
            ast.BoolOp, ast.And, ast.Or,
            ast.UnaryOp, ast.Not, ast.USub, ast.UAdd,
            ast.BinOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow,
            ast.Compare, ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Is, ast.IsNot,
            ast.Name, ast.Load,
            ast.Constant,
            ast.Call
        )

        allowed_functions = {"MAX", "MIN", "AVG", "ABS", "COALESCE", "GREATEST", "LEAST", "TOP", "RANK"}

        for node in ast.walk(tree):
            if not isinstance(node, allowed_nodes):
                raise ExpressionError(f"Disallowed construct in expression: {type(node).__name__}")

            if isinstance(node, ast.Call):
                func_name = ""
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id.upper()
                if func_name not in allowed_functions:
                    raise ExpressionError(f"Unsupported function '{func_name}'. Allowed: {', '.join(sorted(allowed_functions))}")
                if func_name == "TOP":
                    if len(node.args) < 2:
                        raise ExpressionError("TOP() requires at least 2 arguments: TOP(variable, N)")
                    if not isinstance(node.args[1], ast.Constant) or not isinstance(node.args[1].value, (int, float)):
                        raise ExpressionError("The second argument to TOP() must be a numeric integer limit, e.g. TOP(RET_1M, 50)")
                if func_name == "RANK":
                    if len(node.args) < 1:
                        raise ExpressionError("RANK() requires 1 argument: RANK(variable)")

            if isinstance(node, ast.Name):
                var_upper = node.id.upper()
                if var_upper in ("TRUE", "FALSE", "NONE"):
                    continue
                # If function name, ignore here
                if var_upper in allowed_functions:
                    continue

                if var_upper not in VARIABLE_CATALOG and var_upper not in ALIAS_CATALOG:
                    # Check for general Cn or Vn pattern (e.g. C3, V2)
                    lag_match = re.match(r'^([COHLV])(\d+)$', var_upper)
                    if lag_match:
                        # Auto-permit common lag notations
                        used_variables.add(var_upper)
                        has_lags = True
                        continue
                    raise ExpressionError(f"Unknown variable '{node.id}'. Check variable reference for valid symbols.")

                used_variables.add(var_upper)
                if var_upper in VARIABLE_CATALOG and VARIABLE_CATALOG[var_upper].get("is_lag"):
                    has_lags = True

        used_variables.update(used_aliases)
        return tree, used_variables, has_lags

    @classmethod
    def transpile_to_sql(
        cls,
        expr: str,
        table_alias: str = "b"
    ) -> Tuple[str, Set[str], bool, Optional[str], Optional[int], Optional[str]]:
        """
        Translates a scan expression into valid DuckDB SQL query components.
        Supports optional trailing 'ORDER BY <var> [ASC|DESC]' and 'LIMIT <N>',
        as well as window ranking functions like TOP(var, N) which are routed to QUALIFY.

        Returns: (where_sql, used_variables, has_lags, order_by_sql, limit_count, qualify_sql)
        """
        order_by_sql: Optional[str] = None
        limit_count: Optional[int] = None
        order_by_vars: Set[str] = set()

        trailing_pattern = re.compile(
            r'\s+(ORDER\s+BY\s+[A-Za-z0-9_]+(?:\s+(?:ASC|DESC))?(?:\s+LIMIT\s+\d+)?|LIMIT\s+\d+)\s*$',
            re.IGNORECASE
        )
        m = trailing_pattern.search(expr)
        if m:
            clause = m.group(1)
            core_expr = expr[:m.start()].strip()
            order_match = re.search(r'ORDER\s+BY\s+([A-Za-z0-9_]+)(?:\s+(ASC|DESC))?', clause, re.IGNORECASE)
            limit_match = re.search(r'LIMIT\s+(\d+)', clause, re.IGNORECASE)
            if order_match:
                order_var = order_match.group(1).upper()
                order_dir = order_match.group(2).upper() if order_match.group(2) else "DESC"
                if order_var in VARIABLE_CATALOG:
                    col_sql = VARIABLE_CATALOG[order_var]["sql"]
                    if table_alias != "b":
                        col_sql = re.sub(r'\bb\.', f"{table_alias}.", col_sql)
                    order_by_sql = f"{col_sql} {order_dir}"
                    order_by_vars.add(order_var)
                elif order_var in ALIAS_CATALOG:
                    col_sql = cls.get_alias_sql(order_var, table_alias=table_alias)
                    order_by_sql = f"{col_sql} {order_dir}"
                    order_by_vars.add(order_var)
                else:
                    raise ExpressionError(f"Unknown variable in ORDER BY: '{order_var}'. Check variable catalog.")
            if limit_match:
                limit_count = int(limit_match.group(1))
        else:
            core_expr = expr.strip()

        expanded_expr, used_aliases = cls.expand_aliases(core_expr)
        tree, used_variables, has_lags = cls.validate_and_parse(expanded_expr)
        used_variables.update(used_aliases)
        used_variables.update(order_by_vars)

        def _node_to_sql(node: ast.AST) -> str:
            if isinstance(node, ast.Expression):
                return _node_to_sql(node.body)

            if isinstance(node, ast.BoolOp):
                op_str = " AND " if isinstance(node.op, ast.And) else " OR "
                parts = [_node_to_sql(val) for val in node.values]
                return f"({op_str.join(parts)})"

            if isinstance(node, ast.UnaryOp):
                if isinstance(node.op, ast.Not):
                    operand_sql = _node_to_sql(node.operand)
                    return f"(NOT ({operand_sql}))"
                if isinstance(node.op, ast.USub):
                    return f"(-{_node_to_sql(node.operand)})"
                if isinstance(node.op, ast.UAdd):
                    return _node_to_sql(node.operand)

            if isinstance(node, ast.BinOp):
                left_sql = _node_to_sql(node.left)
                right_sql = _node_to_sql(node.right)
                op_map = {
                    ast.Add: "+",
                    ast.Sub: "-",
                    ast.Mult: "*",
                    ast.Div: "/",
                    ast.Mod: "%",
                    ast.Pow: "^"
                }
                op_symbol = op_map.get(type(node.op), "+")
                return f"({left_sql} {op_symbol} {right_sql})"

            if isinstance(node, ast.Compare):
                # Chain comparisons if any, e.g. 5 <= C <= 20
                left_sql = _node_to_sql(node.left)
                cmp_parts = []
                prev_operand = left_sql
                for op, comparator in zip(node.ops, node.comparators):
                    curr_operand = _node_to_sql(comparator)
                    op_symbol = {
                        ast.Eq: "=",
                        ast.NotEq: "!=",
                        ast.Lt: "<",
                        ast.LtE: "<=",
                        ast.Gt: ">",
                        ast.GtE: ">=",
                        ast.Is: "IS",
                        ast.IsNot: "IS NOT"
                    }.get(type(op), "=")
                    cmp_parts.append(f"{prev_operand} {op_symbol} {curr_operand}")
                    prev_operand = curr_operand
                if len(cmp_parts) == 1:
                    return f"({cmp_parts[0]})"
                return f"({' AND '.join(cmp_parts)})"

            if isinstance(node, ast.Constant):
                if isinstance(node.value, bool):
                    return "true" if node.value else "false"
                if isinstance(node.value, (int, float)):
                    return str(node.value)
                if isinstance(node.value, str):
                    clean_str = node.value.replace("'", "''")
                    return f"'{clean_str}'"
                if node.value is None:
                    return "NULL"
                return str(node.value)

            if isinstance(node, ast.Name):
                var_upper = node.id.upper()
                if var_upper == "TRUE": return "true"
                if var_upper == "FALSE": return "false"
                if var_upper == "NULL": return "NULL"

                meta = VARIABLE_CATALOG.get(var_upper)
                if meta:
                    sql_expr = meta["sql"]
                    if table_alias != "b":
                        sql_expr = re.sub(r'\bb\.', f"{table_alias}.", sql_expr)
                    # If this is a standalone boolean variable in a logical condition, return it directly
                    return sql_expr

                if var_upper in ALIAS_CATALOG:
                    return cls.get_alias_sql(var_upper, table_alias=table_alias)

                # Check general lag variable e.g. C3, V2
                lag_match = re.match(r'^([COHLV])(\d+)$', var_upper)
                if lag_match:
                    col_char = lag_match.group(1)
                    lag_num = lag_match.group(2)
                    col_name = {"C": "close", "O": "open", "H": "high", "L": "low", "V": "volume"}.get(col_char, "close")
                    return f"{table_alias}.lag_{col_char.lower()}{lag_num}"

                raise ExpressionError(f"Unmapped variable: {node.id}")

            if isinstance(node, ast.Call):
                func_name = node.func.id.upper() if isinstance(node.func, ast.Name) else ""
                if func_name == "TOP":
                    if not isinstance(node.args[0], ast.Name):
                        raise ExpressionError("First argument of TOP() must be a variable, e.g. TOP(RET_1M, 50)")
                    v_name = node.args[0].id.upper()
                    if v_name not in VARIABLE_CATALOG:
                        raise ExpressionError(f"Unknown variable in TOP(): '{node.args[0].id}'")
                    used_variables.add(v_name)
                    v_sql = VARIABLE_CATALOG[v_name]["sql"]
                    if table_alias != "b":
                        v_sql = re.sub(r'\bb\.', f"{table_alias}.", v_sql)
                    n_val = int(node.args[1].value)
                    direction = "DESC"
                    if len(node.args) >= 3 and isinstance(node.args[2], ast.Constant) and str(node.args[2].value).upper() == "ASC":
                        direction = "ASC"
                    return f"(DENSE_RANK() OVER (ORDER BY {v_sql} {direction} NULLS LAST) <= {n_val})"

                if func_name == "RANK":
                    if not isinstance(node.args[0], ast.Name):
                        raise ExpressionError("Argument of RANK() must be a variable, e.g. RANK(RET_1M)")
                    v_name = node.args[0].id.upper()
                    if v_name not in VARIABLE_CATALOG:
                        raise ExpressionError(f"Unknown variable in RANK(): '{node.args[0].id}'")
                    used_variables.add(v_name)
                    v_sql = VARIABLE_CATALOG[v_name]["sql"]
                    if table_alias != "b":
                        v_sql = re.sub(r'\bb\.', f"{table_alias}.", v_sql)
                    direction = "DESC"
                    if len(node.args) >= 2 and isinstance(node.args[1], ast.Constant) and str(node.args[1].value).upper() == "ASC":
                        direction = "ASC"
                    return f"(DENSE_RANK() OVER (ORDER BY {v_sql} {direction} NULLS LAST))"

                args_sql = [_node_to_sql(arg) for arg in node.args]
                if func_name in ("MAX", "GREATEST"):
                    return f"GREATEST({', '.join(args_sql)})"
                if func_name in ("MIN", "LEAST"):
                    return f"LEAST({', '.join(args_sql)})"
                if func_name == "ABS":
                    return f"ABS({args_sql[0]})"
                if func_name == "COALESCE":
                    return f"COALESCE({', '.join(args_sql)})"
                return f"{func_name}({', '.join(args_sql)})"

            raise ExpressionError(f"Unsupported expression node: {type(node).__name__}")

        def _has_window_function(n: ast.AST) -> bool:
            for sub in ast.walk(n):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name):
                    if sub.func.id.upper() in ("TOP", "RANK"):
                        return True
            return False

        if _has_window_function(tree):
            body = tree.body
            if isinstance(body, ast.BoolOp) and isinstance(body.op, ast.And):
                where_nodes = [v for v in body.values if not _has_window_function(v)]
                qualify_nodes = [v for v in body.values if _has_window_function(v)]
                where_sql = " AND ".join([_node_to_sql(n) for n in where_nodes]) if where_nodes else "true"
                qualify_sql = " AND ".join([_node_to_sql(n) for n in qualify_nodes]) if qualify_nodes else None
            else:
                where_sql = "true"
                qualify_sql = _node_to_sql(body)
        else:
            where_sql = _node_to_sql(tree.body)
            qualify_sql = None

        return where_sql, used_variables, has_lags, order_by_sql, limit_count, qualify_sql

    @classmethod
    def validate(cls, expr: str) -> Dict[str, Any]:
        """
        Comprehensive validation utility for API endpoints.
        Returns a dictionary suitable for JSON serialization.
        """
        try:
            where_sql, vars_used, has_lags, order_by_sql, limit_count, qualify_sql = cls.transpile_to_sql(expr)
            return {
                "valid": True,
                "error": None,
                "sql": where_sql,
                "qualify_sql": qualify_sql,
                "order_by_sql": order_by_sql,
                "limit": limit_count,
                "variables": sorted(list(vars_used)),
                "has_lags": has_lags
            }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
                "sql": None,
                "qualify_sql": None,
                "order_by_sql": None,
                "limit": None,
                "variables": [],
                "has_lags": False
            }

