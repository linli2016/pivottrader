import os
import duckdb
import pandas as pd
import time
import logging
from typing import Dict, Any, List, Optional
from collections import defaultdict
from .config import config_service
from application.engine.market_regime import get_qullamaggie_market_summary, get_qullamaggie_daily_lookup, clear_qullamaggie_cache

logger = logging.getLogger(__name__)

COMPANY_DESCRIPTIONS: Dict[str, str] = {
    "AAPL": "Apple Inc. designs consumer electronics such as the iPhone, Mac, iPad, and Watch, along with its own software and semiconductors, and earns most of its revenue from iPhone sales, supplemented by Services, Wearables, and iPad.",
    "MSFT": "Microsoft Corporation develops, licenses, and supports a range of software products, services, devices, and solutions worldwide, including Azure cloud infrastructure, Microsoft 365, Windows, and gaming.",
    "GOOG": "Alphabet Inc. offers products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America. It operates through Google Services, Google Cloud, and Other Bets segments.",
    "GOOGL": "Alphabet Inc. offers products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America. It operates through Google Services, Google Cloud, and Other Bets segments.",
    "AMZN": "Amazon.com, Inc. focuses on retail sale of consumer products, advertising, and subscriptions through online and physical stores. It also manufactures and sells electronic devices and develops media content, operating the world's leading cloud platform AWS.",
    "NVDA": "NVIDIA Corporation provides graphics, computing and networking solutions. It operates in Compute & Networking and Graphics segments, pioneering accelerated computing to tackle challenges in AI, high performance computing, and gaming.",
    "META": "Meta Platforms, Inc. engages in the development of products that enable people to connect and share through mobile devices, personal computers, virtual reality headsets, and wearables worldwide.",
    "TSLA": "Tesla, Inc. designs, develops, manufactures, sells, and leases fully electric vehicles, energy generation and storage systems, and offers services related to its products and autonomous driving AI technologies.",
}


class DatabaseService:
    def __init__(self, config_service):
        self.config_service = config_service
        self._market_monitor_cache: Dict[int, Dict[str, Any]] = {}
        self._cache_timestamp: float = 0.0

    def clear_caches(self):
        """Clears in-memory market monitor and regime caches."""
        self._market_monitor_cache.clear()
        self._cache_timestamp = 0.0
        clear_qullamaggie_cache()

    def get_available_trading_dates(self) -> List[str]:
        with self.get_read_only_conn() as conn:
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            if "daily_bars" not in table_names:
                return []
            rows = conn.execute("""
                SELECT DISTINCT CAST(date AS VARCHAR) as dt 
                FROM daily_bars 
                WHERE date <= CURRENT_DATE
                ORDER BY dt DESC
            """).fetchall()
            return [r[0] for r in rows if r[0]]


    def get_db_path(self) -> str:
        config = self.config_service.load_config_raw()
        return config.get("database", {}).get("db_path", "data.db")

    def get_read_only_conn(self):
        """Establishes a thread-safe read-only connection to DuckDB with retry handling."""
        import time
        db_path = self.get_db_path()
        if not os.path.exists(db_path):
            # Create it if it doesn't exist, to avoid connection failure
            conn = duckdb.connect(db_path)
            conn.close()
        max_retries = 6
        for attempt in range(max_retries):
            try:
                return duckdb.connect(db_path, read_only=True)
            except Exception as e:
                if "lock" in str(e).lower() and attempt < max_retries - 1:
                    time.sleep(0.5)
                else:
                    raise


    def get_summary(self) -> Dict[str, Any]:
        with self.get_read_only_conn() as conn:
            # Check if tables exist
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            
            summary = {
                "symbols_count": 0,
                "daily_bars_count": 0,
                "fundamentals_count": 0,
                "earliest_price_date": "N/A",
                "last_price_date": "N/A"
            }
            
            if "symbols" in table_names:
                summary["symbols_count"] = conn.execute("SELECT count(*) FROM symbols").fetchone()[0]
            if "daily_bars" in table_names:
                summary["daily_bars_count"] = conn.execute("SELECT count(*) FROM daily_bars").fetchone()[0]
                min_max_dates = conn.execute("SELECT min(date), max(date) FROM daily_bars").fetchone()
                if min_max_dates:
                    min_date, latest_date = min_max_dates
                    summary["earliest_price_date"] = min_date.strftime("%Y-%m-%d") if min_date else "N/A"
                    summary["last_price_date"] = latest_date.strftime("%Y-%m-%d") if latest_date else "N/A"
            if "quarterly_fundamentals" in table_names:
                summary["fundamentals_count"] = conn.execute("SELECT count(*) FROM quarterly_fundamentals").fetchone()[0]
                
            return summary

    def get_candidates(
        self,
        target_date: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        expression: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with self.get_read_only_conn() as conn:
            # Check if tables exist
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            if "daily_bars" not in table_names:
                return []

            # 1. Resolve actual target date
            if target_date and str(target_date).strip().lower() != "latest":
                target_dt_input = str(target_date).strip()
                row = conn.execute("SELECT MAX(date) FROM daily_bars WHERE date <= CAST(? AS DATE)", [target_dt_input]).fetchone()
                if row and row[0]:
                    actual_date = row[0]
                    actual_date_str = actual_date.strftime("%Y-%m-%d") if hasattr(actual_date, "strftime") else str(actual_date)
                else:
                    actual_date_str = target_dt_input
            else:
                max_dt = conn.execute("SELECT MAX(date) FROM daily_bars").fetchone()[0]
                if not max_dt:
                    return []
                actual_date_str = max_dt.strftime("%Y-%m-%d") if hasattr(max_dt, "strftime") else str(max_dt)

            # Build dynamic WHERE clauses based on filters or expression
            where_clauses = [
                "db.date = (SELECT val FROM target_date_const)",
                "db.rs_score IS NOT NULL",
                "(s.asset_type IS NULL OR (UPPER(s.asset_type) != 'ETF' AND UPPER(s.asset_type) NOT LIKE '%ETF%'))",
                "(s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')"
            ]
            params = [actual_date_str]

            f = filters or {}
            raw_expr = (expression or "").strip()
            if not raw_expr and isinstance(f, dict) and f.get("expression"):
                raw_expr = str(f["expression"]).strip()

            has_lags = False
            used_variables = set()
            expr_order_by = None
            expr_limit = None
            expr_qualify = None

            if raw_expr:
                try:
                    from application.engine.expression import ScanExpressionEngine
                    sql_clause, used_variables, has_lags, expr_order_by, expr_limit, expr_qualify = ScanExpressionEngine.transpile_to_sql(raw_expr, table_alias="db")
                    if sql_clause and sql_clause.strip() != "true":
                        where_clauses.append(sql_clause)
                except Exception as e:
                    logger.warning(f"Error compiling scan expression '{raw_expr}': {e}. Falling back to default filters.")
                    raw_expr = ""

            # Check if this target date has pre-computed setup metrics in daily_bars
            has_precomputed_setups = False
            has_precomputed_low_cheat = False
            try:
                check_row = conn.execute(
                    "SELECT 1 FROM daily_bars WHERE date = CAST(? AS DATE) AND pp_runup_pct IS NOT NULL LIMIT 1",
                    [actual_date_str]
                ).fetchone()
                if check_row:
                    has_precomputed_setups = True

                check_lc = conn.execute(
                    "SELECT 1 FROM daily_bars WHERE date = CAST(? AS DATE) AND low_cheat_is_setup IS NOT NULL LIMIT 1",
                    [actual_date_str]
                ).fetchone()
                if check_lc:
                    has_precomputed_low_cheat = True
            except Exception:
                has_precomputed_setups = False
                has_precomputed_low_cheat = False

            require_power_play = False
            require_breakout = False
            require_episodic_pivot = False
            require_momentum = False
            require_parabolic = False
            require_ipo_base = False
            require_pivot_tightness = False
            enable_vcp_pattern = False
            enable_low_cheat = False
            enable_cheat = False
            require_low_cheat = False

            if raw_expr:
                require_power_play = "POWER_PLAY" in used_variables or "PP_RUNUP" in used_variables
                require_breakout = "BREAKOUT" in used_variables
                require_episodic_pivot = "EPISODIC_PIVOT" in used_variables
                require_momentum = False
                require_parabolic = "PARABOLIC_SHORT" in used_variables
                require_ipo_base = "IPO_BASE" in used_variables
                require_pivot_tightness = "PIVOT_SPREAD" in used_variables or "PIVOT_CLUSTERING" in used_variables
                enable_vcp_pattern = "VCP" in used_variables
                enable_low_cheat = "LOW_CHEAT" in used_variables
                enable_cheat = "CHEAT" in used_variables
                require_low_cheat = enable_low_cheat
            else:
                # Price & Volume filters
                min_price = f.get("min_price")
                if min_price is not None and float(min_price) > 0:
                    where_clauses.append("db.close >= ?")
                    params.append(float(min_price))

                min_vol = f.get("min_volume_sma_50")
                if min_vol is not None and float(min_vol) > 0:
                    where_clauses.append("db.vol_50d_ma >= ?")
                    params.append(float(min_vol))

                min_dollar_vol = f.get("min_dollar_vol", f.get("min_dollar_volume_50d"))
                if min_dollar_vol is not None and float(min_dollar_vol) > 0:
                    where_clauses.append("COALESCE(db.dollar_vol_50d_ma, db.close * db.vol_50d_ma) >= ?")
                    params.append(float(min_dollar_vol))

                # Stage 2 Trend Template
                if f.get("enforce_stage2") and not bool(f.get("require_momentum", False)):
                    where_clauses.append(
                        "db.sma_50 IS NOT NULL AND db.sma_150 IS NOT NULL AND db.sma_200 IS NOT NULL "
                        "AND db.close > db.sma_50 AND db.sma_50 > db.sma_150 AND db.sma_150 > db.sma_200 "
                        "AND (db.sma_200_20d_ago IS NULL OR db.sma_200 > db.sma_200_20d_ago) "
                        "AND (db.dist_from_52w_high IS NULL OR db.dist_from_52w_high <= 25.0) "
                        "AND (db.surge_off_low_pct IS NULL OR db.surge_off_low_pct >= 30.0)"
                    )

                # Relative Strength Rank
                if f.get("enable_rs"):
                    min_rs = f.get("min_rs_percentile", 70)
                    where_clauses.append("db.rs_rank >= ?")
                    params.append(float(min_rs))

                # Stockbee Trend Intensity (TI65) Filter
                if f.get("enable_ti65"):
                    min_ti65 = f.get("min_ti65", 1.05)
                    where_clauses.append("db.ti_65 IS NOT NULL AND db.ti_65 >= ?")
                    params.append(float(min_ti65))

                # ADR% (Average Daily Range 20d) filter
                if f.get("enable_adr"):
                    min_adr = f.get("min_adr_20d", 4.0)
                    where_clauses.append("db.adr_20d IS NOT NULL AND db.adr_20d >= ?")
                    params.append(float(min_adr))

                # Pivot Tightness & Volume Dry-Up (VDU) Filter
                require_pivot_tightness = bool(f.get("require_pivot_tightness", False))
                if require_pivot_tightness and has_precomputed_setups:
                    max_pivot_spread = f.get("max_pivot_spread", 8.0)
                    max_pivot_clustering = f.get("max_pivot_clustering", 3.0)
                    max_pivot_vol_ratio = f.get("max_pivot_vol_ratio", 0.8)
                    where_clauses.append("db.pivot_spread_pct IS NOT NULL AND db.pivot_spread_pct <= ?")
                    params.append(float(max_pivot_spread))
                    where_clauses.append("db.pivot_close_clustering_pct IS NOT NULL AND db.pivot_close_clustering_pct <= ?")
                    params.append(float(max_pivot_clustering))
                    where_clauses.append("(db.volume / NULLIF(db.vol_50d_ma, 0)) <= ?")
                    params.append(float(max_pivot_vol_ratio))

                # RS Rank New High
                if f.get("enable_rs_new_high"):
                    where_clauses.append("COALESCE(db.is_52w_high, false) = true")

                # Pattern Flags
                require_power_play = bool(f.get("require_power_play", False))
                require_breakout = bool(f.get("require_breakout", False))
                require_episodic_pivot = bool(f.get("require_episodic_pivot", False))
                require_momentum = bool(f.get("require_momentum", False))
                require_parabolic = bool(f.get("require_parabolic", False))
                require_ipo_base = bool(f.get("require_ipo_base", False))
                vcp_subview = str(f.get("vcp_subview", ""))
                enable_vcp_pattern = bool(f.get("enable_vcp_pattern", False) or f.get("require_vcp", False) or vcp_subview == "cup_and_handle")
                enable_low_cheat = bool(f.get("enable_low_cheat", False) or f.get("require_low_cheat", False) or vcp_subview == "low_cheat")
                enable_cheat = bool(f.get("enable_cheat", False) or vcp_subview == "cheat")
                require_low_cheat = enable_low_cheat

                # Power Play Overlay
                if require_power_play:
                    min_pp_runup = float(f.get("min_pp_runup", 100.0))
                    max_pp_drawdown = float(f.get("max_pp_drawdown", 25.0))
                    min_pp_days = int(f.get("min_pp_days_since_peak", 10))
                    enable_pp_vol = f.get("enable_pp_vol_ratio", False)
                    max_pp_vol = float(f.get("max_pp_vol_ratio", 0.5))

                    if has_precomputed_setups:
                        where_clauses.append("db.pp_runup_pct IS NOT NULL AND db.pp_runup_pct >= ?")
                        params.append(min_pp_runup)
                        where_clauses.append("db.pp_drawdown_pct IS NOT NULL AND db.pp_drawdown_pct <= ?")
                        params.append(max_pp_drawdown)
                        where_clauses.append("db.pp_days_since_peak IS NOT NULL AND db.pp_days_since_peak >= ?")
                        params.append(min_pp_days)
                        if enable_pp_vol:
                            where_clauses.append("(db.volume / NULLIF(db.vol_50d_ma, 0)) <= ?")
                            params.append(max_pp_vol)
                    else:
                        where_clauses.append("(COALESCE(db.ret_1m, 0) >= 15.0 OR COALESCE(db.ret_3m, 0) >= 30.0 OR COALESCE(db.surge_off_low_pct, 0) >= 40.0)")

                # IPO Base Overlay
                if require_ipo_base:
                    max_ipo_age = f.get("max_ipo_age", 350)
                    max_ipo_dist = f.get("max_ipo_dist", 25.0)
                    max_ipo_depth = f.get("max_ipo_depth", 35.0)
                    where_clauses.append("db.ipo_days_count IS NOT NULL AND db.ipo_days_count >= 10 AND db.ipo_days_count <= ?")
                    params.append(int(max_ipo_age))
                    where_clauses.append("db.ipo_drawdown_from_high IS NOT NULL AND db.ipo_drawdown_from_high <= ?")
                    params.append(float(max_ipo_dist))
                    where_clauses.append("db.ipo_base_depth IS NOT NULL AND db.ipo_base_depth <= ?")
                    params.append(float(max_ipo_depth))

                # VCP Pattern Detection (Contraction Waves)
                if enable_vcp_pattern:
                    if has_precomputed_setups:
                        where_clauses.append("COALESCE(db.vcp_is_setup, false) = true")

                # VCP High EPS Growth Filter
                if f.get("enable_vcp_eps_growth", False):
                    min_eps_growth = f.get("min_eps_growth_qoq", 20.0)
                    where_clauses.append("f.eps_qoq_growth IS NOT NULL AND f.eps_qoq_growth >= ?")
                    params.append(float(min_eps_growth))

                # Episodic Pivot Overlay
                if require_episodic_pivot:
                    min_ep_gap = f.get("min_ep_gap", 10.0)
                    min_ep_rel_vol = f.get("min_ep_rel_vol", 2.5)
                    where_clauses.append("db.gap_pct IS NOT NULL AND db.gap_pct >= ?")
                    params.append(float(min_ep_gap))
                    where_clauses.append("db.rel_vol_50d IS NOT NULL AND db.rel_vol_50d >= ?")
                    params.append(float(min_ep_rel_vol))

                # Minervini Low Cheat Overlay
                if enable_low_cheat and not enable_cheat:
                    if has_precomputed_low_cheat:
                        where_clauses.append("COALESCE(db.low_cheat_is_setup, false) = true")
                        min_base_depth = f.get("min_base_depth")
                        max_base_depth = f.get("max_base_depth")
                        if min_base_depth is not None:
                            where_clauses.append("db.low_cheat_base_depth IS NOT NULL AND db.low_cheat_base_depth >= ?")
                            params.append(float(min_base_depth))
                        if max_base_depth is not None:
                            where_clauses.append("db.low_cheat_base_depth IS NOT NULL AND db.low_cheat_base_depth <= ?")
                            params.append(float(max_base_depth))

                # Parabolic Short Overlay
                if require_parabolic:
                    min_runup = float(f.get("min_parabolic_runup", 40.0))
                    min_ema_dist = float(f.get("min_parabolic_ema_dist", 18.0))
                    min_up_days = int(f.get("min_parabolic_up_days", 3))
                    parabolic_window = int(f.get("parabolic_window_days", 10))

                    if has_precomputed_setups and parabolic_window == 10:
                        where_clauses.append("""(
                            COALESCE(db.parabolic_short_is_setup, false) = true OR (
                                db.parabolic_runup_pct IS NOT NULL AND db.parabolic_runup_pct >= ? AND
                                db.dist_ema10_pct IS NOT NULL AND db.dist_ema10_pct >= ? AND
                                db.parabolic_up_days IS NOT NULL AND db.parabolic_up_days >= ?
                            )
                        )""")
                        params.extend([min_runup, min_ema_dist, min_up_days])
                    else:
                        where_clauses.append("db.dist_ema10_pct IS NOT NULL AND db.dist_ema10_pct >= ?")
                        params.append(min_ema_dist)
                        where_clauses.append("db.parabolic_up_days IS NOT NULL AND db.parabolic_up_days >= ?")
                        params.append(min_up_days)

                # Consolidation Days / Base Days Filter (for Momentum / My Universe)
                if require_momentum and f.get("min_breakout_days") is not None and int(f.get("min_breakout_days", 0)) > 0:
                    min_c_days = int(f.get("min_breakout_days"))
                    if has_precomputed_setups:
                        where_clauses.append("db.pp_days_since_peak IS NOT NULL AND db.pp_days_since_peak >= ?")
                        params.append(min_c_days)

            where_str = "\n                  AND ".join(where_clauses)

            cte_lags = """
                lagged_bars AS (
                    SELECT 
                        db.*,
                        LAG(db.close, 1) OVER (PARTITION BY db.symbol ORDER BY db.date) as lag_c1,
                        LAG(db.close, 2) OVER (PARTITION BY db.symbol ORDER BY db.date) as lag_c2,
                        LAG(db.open, 1) OVER (PARTITION BY db.symbol ORDER BY db.date) as lag_o1,
                        LAG(db.high, 1) OVER (PARTITION BY db.symbol ORDER BY db.date) as lag_h1,
                        LAG(db.low, 1) OVER (PARTITION BY db.symbol ORDER BY db.date) as lag_l1,
                        LAG(db.volume, 1) OVER (PARTITION BY db.symbol ORDER BY db.date) as lag_v1
                    FROM daily_bars db
                    WHERE db.date >= (SELECT val FROM target_date_const) - INTERVAL 10 DAY
                      AND db.date <= (SELECT val FROM target_date_const)
                ),
            """ if has_lags else ""
            from_table = "lagged_bars db" if has_lags else "daily_bars db"

            qualify_clause = f"QUALIFY {expr_qualify}" if expr_qualify else ""

            if expr_order_by:
                order_clause = f"ORDER BY {expr_order_by}"
            elif sort_by:
                order_dir = (sort_order or "DESC").upper()
                order_clause = f"ORDER BY db.{sort_by} {order_dir}"
            else:
                order_clause = "ORDER BY db.rs_rank DESC"

            limit_clause = f"LIMIT {int(expr_limit)}" if expr_limit else ""

            query = f"""
                WITH target_date_const AS (
                    SELECT CAST(? AS DATE) as val
                ),
                {cte_lags}
                latest_fundamentals AS (
                    SELECT 
                        symbol,
                        report_date,
                        fiscal_quarter,
                        eps_diluted,
                        eps_qoq_growth,
                        total_revenue,
                        inst_holders_count,
                        inst_holders_qoq_change,
                        inst_ownership_pct,
                        sponsorship_streak,
                        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY fiscal_quarter DESC) as rn
                    FROM quarterly_fundamentals
                    WHERE report_date <= (SELECT val FROM target_date_const)
                )
                SELECT 
                    db.symbol,
                    db.close,
                    db.vol_50d_ma,
                    COALESCE(db.dollar_vol_50d_ma, db.close * db.vol_50d_ma) as dollar_vol_50d_ma,
                    db.rs_score,
                    db.rs_rank,
                    f.report_date,
                    f.fiscal_quarter,
                    f.eps_diluted,
                    f.eps_qoq_growth,
                    f.total_revenue,
                    s.exchange,
                    db.atr_20d,
                    db.pp_runup_pct,
                    db.pp_drawdown_pct,
                    db.pp_days_since_peak,
                    db.volume,
                    db.sma_50,
                    db.sma_150,
                    db.sma_200,
                    db.vcp_is_setup,
                    db.vcp_troughs,
                    db.vcp_depths,
                    db.ipo_days_count,
                    db.ipo_all_time_high,
                    db.ipo_drawdown_from_high,
                    db.ipo_base_depth,
                    COALESCE(db.is_52w_high, false) as rs_rank_is_new_high,
                    db.high_52w,
                    db.dist_from_52w_high,
                    db.surge_off_low_pct,
                    db.is_52w_high,
                    db.ret_1m,
                    db.ema_10,
                    db.ema_20,
                    db.dist_ema10_pct,
                    db.dist_ema20_pct,
                    db.gap_pct,
                    db.rel_vol_50d,
                    db.ep_is_setup,
                    db.ep_gap_pct,
                    db.ep_rel_vol,
                    db.parabolic_short_is_setup,
                    db.parabolic_long_is_setup,
                    db.parabolic_runup_pct,
                    db.parabolic_up_days,
                    db.pivot_spread_pct,
                    db.pivot_close_clustering_pct,
                    db.pivot_vol_ratio,
                    s.sector,
                    s.industry,
                    s.name,
                    db.ti_65,
                    db.adr_20d,
                    db.ret_3m,
                    db.ret_6m,
                    s.next_earnings_date,
                    s.asset_type,
                    db.low_cheat_is_setup,
                    db.low_cheat_pivot_price,
                    db.low_cheat_stop_loss,
                    db.low_cheat_risk_pct,
                    db.low_cheat_base_depth,
                    db.sma_200_20d_ago,
                    (
                        db.sma_50 IS NOT NULL AND db.sma_150 IS NOT NULL AND db.sma_200 IS NOT NULL 
                        AND db.close > db.sma_50 AND db.sma_50 > db.sma_150 AND db.sma_150 > db.sma_200 
                        AND (db.sma_200_20d_ago IS NULL OR db.sma_200 > db.sma_200_20d_ago) 
                        AND (db.dist_from_52w_high IS NULL OR db.dist_from_52w_high <= 25.0) 
                        AND (db.surge_off_low_pct IS NULL OR db.surge_off_low_pct >= 30.0)
                    ) as is_stage2,
                    db.ema_50,
                    db.dist_ema50_pct,
                    s.active,
                    f.inst_holders_count,
                    f.inst_holders_qoq_change,
                    f.inst_ownership_pct,
                    f.sponsorship_streak,
                    db.days_since_52w_high
                FROM {from_table}
                LEFT JOIN latest_fundamentals f ON db.symbol = f.symbol AND f.rn = 1
                JOIN symbols s ON db.symbol = s.symbol
                WHERE {where_str}
                {qualify_clause}
                {order_clause}
                {limit_clause};
            """
            
            # Calculate point-in-time sector ranks from the 30 tactical sectors
            sector_ranks = {}
            try:
                sector_rows = conn.execute("""
                    WITH sec_bars AS (
                        SELECT s.sector, AVG(d.rs_score) as avg_rs
                        FROM daily_bars d
                        JOIN symbols s ON d.symbol = s.symbol
                        WHERE d.date = CAST(? AS DATE)
                          AND s.active = true
                          AND s.asset_type = 'Common Stock'
                          AND s.sector IS NOT NULL AND s.sector != ''
                          AND d.close >= 3.0
                        GROUP BY s.sector
                    )
                    SELECT sector, ROW_NUMBER() OVER (ORDER BY avg_rs DESC) as rk
                    FROM sec_bars
                """, [actual_date_str]).fetchall()
                for sec_name, rk in sector_rows:
                    sector_ranks[sec_name] = rk
            except Exception as e:
                print(f"Error calculating sector ranks: {e}")

            res = conn.execute(query, params).fetchall()
            
            candidates = []
            for row in res:
                sec_val = row[49]
                sec_rank = sector_ranks.get(sec_val) if sec_val else None
                candidates.append({
                    "symbol": row[0],
                    "name": row[51],
                    "asset_type": row[57],
                    "close": row[1],
                    "vol_50d_ma": row[2],
                    "dollar_vol_50d_ma": row[3],
                    "rs_score": row[4],
                    "rs_rank": row[5],
                    "report_date": row[6].strftime("%Y-%m-%d") if row[6] else None,
                    "fiscal_quarter": row[7],
                    "eps_diluted": row[8],
                    "eps_qoq_growth": row[9],
                    "total_revenue": row[10],
                    "exchange": row[11],
                    "atr_20d": row[12],
                    "pp_runup_pct": row[13],
                    "pp_drawdown_pct": row[14],
                    "pp_days_since_peak": row[15],
                    "volume": row[16],
                    "sma_50": row[17],
                    "sma_150": row[18],
                    "sma_200": row[19],
                    "vcp_is_setup": bool(row[20]) if row[20] is not None else False,
                    "vcp_troughs": row[21],
                    "vcp_depths": row[22],
                    "ipo_days_count": row[23],
                    "ipo_all_time_high": row[24],
                    "ipo_drawdown_from_high": row[25],
                    "ipo_base_depth": row[26],
                    "rs_rank_is_new_high": bool(row[27]) if row[27] is not None else False,
                    "high_52w": row[28],
                    "dist_from_52w_high": row[29],
                    "surge_off_low_pct": row[30],
                    "is_52w_high": bool(row[31]) if row[31] is not None else False,
                    "ret_1m": row[32],
                    "ema_10": row[33],
                    "ema_20": row[34],
                    "dist_ema10_pct": row[35],
                    "dist_ema20_pct": row[36],
                    "gap_pct": row[37],
                    "rel_vol_50d": row[38],
                    "ep_is_setup": bool(row[39]) if row[39] is not None else False,
                    "ep_gap_pct": row[40],
                    "ep_rel_vol": row[41],
                    "parabolic_short_is_setup": bool(row[42]) if row[42] is not None else False,
                    "parabolic_long_is_setup": bool(row[43]) if row[43] is not None else False,
                    "parabolic_runup_pct": row[44],
                    "parabolic_up_days": row[45],
                    "pivot_spread_pct": row[46],
                    "pivot_close_clustering_pct": row[47],
                    "pivot_vol_ratio": row[48],
                    "sector": sec_val,
                    "sector_rank": sec_rank,
                    "industry": row[50],
                    "ti_65": row[52],
                    "adr_20d": row[53],
                    "ret_3m": row[54],
                    "ret_6m": row[55],
                    "next_earnings_date": row[56],
                    "screen_date": actual_date_str,
                    "low_cheat_is_setup": bool(row[58]) if len(row) > 58 and row[58] is not None else False,
                    "low_cheat_pivot_price": row[59] if len(row) > 59 else None,
                    "low_cheat_stop_loss": row[60] if len(row) > 60 else None,
                    "low_cheat_risk_pct": row[61] if len(row) > 61 else None,
                    "low_cheat_base_depth": row[62] if len(row) > 62 else None,
                    "sma_200_20d_ago": row[63] if len(row) > 63 else None,
                    "is_stage2": bool(row[64]) if len(row) > 64 and row[64] is not None else False,
                    "ema_50": row[65] if len(row) > 65 else None,
                    "dist_ema50_pct": row[66] if len(row) > 66 else None,
                    "active": bool(row[67]) if len(row) > 67 and row[67] is not None else True,
                    "inst_holders_count": row[68] if len(row) > 68 else None,
                    "inst_holders_qoq_change": row[69] if len(row) > 69 else None,
                    "inst_ownership_pct": row[70] if len(row) > 70 else None,
                    "sponsorship_streak": int(row[71]) if len(row) > 71 and row[71] is not None else 0,
                    "days_since_52w_high": int(row[72]) if len(row) > 72 and row[72] is not None else None
                })

            if not candidates:
                return []

            # 3b. Dynamic setup evaluation in memory (Conditional)
            # Evaluate dynamic patterns if:
            # 1. Breakout setup is enabled (always needs dynamic evaluation), OR
            # 2. Pre-computed setups do NOT exist on this date (historical date) and a pattern is active, OR
            # 3. Candidates list is small (<= 200) and a pattern is active.
            needs_dynamic_history = bool(
                require_breakout or enable_cheat or (
                    require_low_cheat and not has_precomputed_low_cheat
                ) or (
                    require_parabolic and int(f.get("parabolic_window_days", 10)) != 10
                ) or (
                    not has_precomputed_setups and (
                        require_power_play or require_parabolic or enable_vcp_pattern or require_episodic_pivot
                    )
                ) or (
                    candidates and len(candidates) <= 200 and (
                        require_power_play or require_parabolic or enable_vcp_pattern or require_episodic_pivot or require_low_cheat or enable_cheat
                    )
                )
            )

            if needs_dynamic_history and candidates:
                try:
                    from application.engine.setups.power_play import detect_power_play
                    from application.engine.setups.breakout import detect_breakout
                    from application.engine.setups.vcp import detect_vcp
                    from application.engine.setups.parabolic_extension import detect_parabolic_extension
                    from application.engine.setups.episodic_pivot import detect_episodic_pivot
                    from application.engine.setups.low_cheat import detect_low_cheat, detect_cheat

                    cand_symbols = [c["symbol"] for c in candidates]
                    symbols_str = ", ".join(f"'{s}'" for s in cand_symbols)
                    history_rows = conn.execute(f"""
                        SELECT symbol, date, open, high, low, close, volume 
                        FROM (
                            SELECT symbol, date, open, high, low, close, volume,
                                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                            FROM daily_bars 
                            WHERE symbol IN ({symbols_str}) AND date <= CAST(? AS DATE)
                        )
                        WHERE rn <= 80
                        ORDER BY symbol, date ASC
                    """, [actual_date_str]).fetchall()

                    sym_history = defaultdict(list)
                    for sym, dt, op, h, l, cl, vol in history_rows:
                        sym_history[sym].append((op, h, l, cl, vol, dt))

                    # Breakout filter parameters
                    min_breakout_runup = float(f.get("min_breakout_runup", 30.0))
                    runup_window_weeks = float(f.get("runup_window_weeks", 12.0))
                    min_breakout_days = int(f.get("min_breakout_days", 10))
                    max_breakout_days = int(f.get("max_breakout_days", 40))
                    max_breakout_drawdown = float(f.get("max_breakout_drawdown", 30.0)) if f.get("max_breakout_drawdown") is not None else None
                    enable_ema_surfing = bool(f.get("enable_ema_surfing", False))
                    breakout_subview = str(f.get("breakout_subview", "htf"))
                    enable_htf_mode = bool(f.get("enable_htf_mode", True) if f.get("breakout_subview") is None else (f.get("enable_htf_mode", False) or breakout_subview == "htf"))

                    for c in candidates:
                        symbol = c["symbol"]
                        bars = sym_history.get(symbol, [])
                        if len(bars) >= 20:
                            op_list = [b[0] for b in bars]
                            h_list = [b[1] for b in bars]
                            l_list = [b[2] for b in bars]
                            cl_list = [b[3] for b in bars]
                            vol_list = [b[4] for b in bars]
                            dt_list = [b[5] for b in bars]

                            # Calculate EMA 10, EMA 20 & EMA 50 dynamically if not present
                            if c.get("ema_10") is None or c.get("ema_20") is None or c.get("ema_50") is None:
                                def _calc_ema(prices, span):
                                    if len(prices) < span: return None
                                    k = 2.0 / (span + 1.0)
                                    val = prices[0]
                                    for p in prices[1:]:
                                        val = p * k + val * (1.0 - k)
                                    return round(val, 2)

                                ema_10_val = _calc_ema(cl_list, 10)
                                ema_20_val = _calc_ema(cl_list, 20)
                                ema_50_val = _calc_ema(cl_list, 50)

                                if ema_10_val and ema_10_val > 0:
                                    c["ema_10"] = ema_10_val
                                    if c.get("close"):
                                        c["dist_ema10_pct"] = round(((c["close"] - ema_10_val) / ema_10_val) * 100.0, 2)
                                if ema_20_val and ema_20_val > 0:
                                    c["ema_20"] = ema_20_val
                                    if c.get("close"):
                                        c["dist_ema20_pct"] = round(((c["close"] - ema_20_val) / ema_20_val) * 100.0, 2)
                                if ema_50_val and ema_50_val > 0:
                                    c["ema_50"] = ema_50_val
                                    if c.get("close"):
                                        c["dist_ema50_pct"] = round(((c["close"] - ema_50_val) / ema_50_val) * 100.0, 2)

                            # Calculate 3-day pivot spread and close clustering dynamically if not present
                            if len(bars) >= 3:
                                if c.get("pivot_spread_pct") is None and cl_list[-1] > 0:
                                    peak_h3 = max(h_list[-3:])
                                    low_l3 = min(l_list[-3:])
                                    c["pivot_spread_pct"] = round((peak_h3 - low_l3) / cl_list[-1] * 100.0, 2)
                                if c.get("pivot_close_clustering_pct") is None and cl_list[-1] > 0:
                                    peak_c3 = max(cl_list[-3:])
                                    low_c3 = min(cl_list[-3:])
                                    c["pivot_close_clustering_pct"] = round((peak_c3 - low_c3) / cl_list[-1] * 100.0, 2)
                                if c.get("pivot_vol_ratio") is None and c.get("vol_50d_ma") and c["vol_50d_ma"] > 0:
                                    c["pivot_vol_ratio"] = round(vol_list[-1] / c["vol_50d_ma"], 2)

                            # Breakout Evaluation
                            if require_breakout:
                                b_res = detect_breakout(
                                    h_list, l_list, cl_list, dt_list,
                                    ema_10_val=c.get("ema_10"),
                                    ema_20_val=c.get("ema_20"),
                                    enable_runup=True,
                                    min_runup_pct=min_breakout_runup,
                                    runup_window_weeks=runup_window_weeks,
                                    enable_days=True,
                                    min_consolidation_days=min_breakout_days,
                                    max_consolidation_days=max_breakout_days,
                                    max_drawdown_pct=max_breakout_drawdown,
                                    enable_ema_surfing=enable_ema_surfing,
                                    enable_htf_mode=enable_htf_mode,
                                    breakout_subview=breakout_subview
                                )
                                c["breakout_is_setup"] = b_res.get("breakout_is_setup", False)
                                c["breakout_runup_pct"] = b_res.get("breakout_runup_pct", 0.0)
                                c["breakout_drawdown_pct"] = b_res.get("breakout_drawdown_pct", 0.0)
                                c["breakout_consolidation_days"] = b_res.get("breakout_consolidation_days", 0)
                                c["breakout_peak_high"] = b_res.get("breakout_peak_high", 0.0)
                                c["is_htf"] = b_res.get("is_htf", False)
                                c["ema_surfing"] = b_res.get("ema_surfing", False)

                            # Power Play Evaluation
                            if require_power_play:
                                pp_res = detect_power_play(h_list, l_list, cl_list, dt_list)
                                c["pp_is_setup"] = pp_res.get("pp_is_setup", False)
                                c["pp_is_trigger"] = pp_res.get("pp_is_trigger", False)
                                c["pp_pivot_price"] = pp_res.get("pp_pivot_price", 0.0)
                                c["pp_runup_pct"] = pp_res.get("pp_runup_pct", c.get("pp_runup_pct", 0.0))
                                c["pp_drawdown_pct"] = pp_res.get("pp_drawdown_pct", c.get("pp_drawdown_pct", 0.0))
                                c["pp_days_since_peak"] = pp_res.get("pp_days_since_peak", c.get("pp_days_since_peak", 0))

                            # VCP Contraction Fingerprint Evaluation
                            v_res = detect_vcp(h_list, l_list, dt_list, closes=cl_list, window=3)
                            if v_res:
                                c["vcp_is_setup"] = v_res.get("vcp_is_setup", False)
                                c["vcp_troughs"] = v_res.get("vcp_troughs")
                                c["vcp_depths"] = v_res.get("vcp_depths")

                            # Parabolic Climax Evaluation
                            if require_parabolic:
                                min_p_runup = float(f.get("min_parabolic_runup", 40.0))
                                min_p_ema_dist = float(f.get("min_parabolic_ema_dist", 18.0))
                                min_p_up_days = int(f.get("min_parabolic_up_days", 3))
                                p_window = int(f.get("parabolic_window_days", 10))
                                para_res = detect_parabolic_extension(
                                    h_list, l_list, cl_list, dt_list, c.get("ema_10"),
                                    min_runup_pct=min_p_runup,
                                    min_dist_ema10_pct=min_p_ema_dist,
                                    min_up_days=min_p_up_days,
                                    window_days=p_window
                                )
                                if para_res:
                                    c["parabolic_short_is_setup"] = para_res.get("parabolic_short_is_setup", False)
                                    c["parabolic_long_is_setup"] = para_res.get("parabolic_long_is_setup", False)
                                    c["parabolic_runup_pct"] = para_res.get("parabolic_runup_pct")
                                    c["parabolic_up_days"] = para_res.get("parabolic_up_days")
                                else:
                                    c["parabolic_short_is_setup"] = False

                            # Episodic Pivot Evaluation
                            if require_episodic_pivot:
                                ep_res = detect_episodic_pivot(op_list, h_list, l_list, cl_list, vol_list, dt_list)
                                if ep_res:
                                    c["ep_is_setup"] = ep_res.get("ep_is_setup", True)
                                    c["ep_gap_pct"] = ep_res.get("ep_gap_pct")
                                    c["ep_rel_vol"] = ep_res.get("ep_rel_vol")

                            # Minervini Low Cheat Evaluation
                            if require_low_cheat and not enable_cheat:
                                min_base_depth = float(f.get("min_base_depth", 12.0))
                                max_base_depth = float(f.get("max_base_depth", 45.0))
                                min_base_position = float(f.get("min_base_position", 0.0))
                                max_base_position = float(f.get("max_base_position", 50.0))
                                req_exhaustion = bool(f.get("require_exhaustion_or_shakeout", True))

                                lc_res = detect_low_cheat(
                                    op_list, h_list, l_list, cl_list, vol_list, dt_list,
                                    vol_50d_ma=c.get("vol_50d_ma"),
                                    sma_50=c.get("sma_50"),
                                    sma_150=c.get("sma_150"),
                                    sma_200=c.get("sma_200"),
                                    ipo_days=c.get("ipo_days_count"),
                                    min_base_depth=min_base_depth,
                                    max_base_depth=max_base_depth,
                                    min_base_position=min_base_position,
                                    max_base_position=max_base_position,
                                    require_exhaustion_or_shakeout=req_exhaustion,
                                    enforce_stage2=bool(f.get("enforce_stage2", True))
                                )
                                if lc_res:
                                    c["low_cheat_is_setup"] = lc_res.get("low_cheat_is_setup", False)
                                    c["low_cheat_is_trigger"] = lc_res.get("low_cheat_is_trigger", False)
                                    c["low_cheat_pivot_price"] = lc_res.get("low_cheat_pivot_price")
                                    c["low_cheat_stop_loss"] = lc_res.get("low_cheat_stop_loss")
                                    c["low_cheat_risk_pct"] = lc_res.get("low_cheat_risk_pct")
                                    c["low_cheat_base_depth"] = lc_res.get("base_depth_pct")
                                    c["low_cheat_base_position"] = lc_res.get("base_position_pct")
                                    c["low_cheat_exhaustion_type"] = lc_res.get("exhaustion_type")
                                    c["low_cheat_trigger_vol_ratio"] = lc_res.get("trigger_vol_ratio")
                                    c["low_cheat_reward_risk_ratio"] = lc_res.get("reward_risk_ratio")
                                    c["low_cheat_stage2_qualified"] = lc_res.get("stage2_qualified", False)

                            # Minervini Cheat (3-C) Evaluation
                            if enable_cheat:
                                min_base_depth = float(f.get("min_base_depth", 12.0))
                                max_base_depth = float(f.get("max_base_depth", 45.0))
                                min_base_position = float(f.get("min_base_position", 40.0))
                                max_base_position = float(f.get("max_base_position", 80.0))
                                req_exhaustion = bool(f.get("require_exhaustion_or_shakeout", False))

                                ch_res = detect_cheat(
                                    op_list, h_list, l_list, cl_list, vol_list, dt_list,
                                    vol_50d_ma=c.get("vol_50d_ma"),
                                    sma_50=c.get("sma_50"),
                                    sma_150=c.get("sma_150"),
                                    sma_200=c.get("sma_200"),
                                    ipo_days=c.get("ipo_days_count"),
                                    min_base_depth=min_base_depth,
                                    max_base_depth=max_base_depth,
                                    min_base_position=min_base_position,
                                    max_base_position=max_base_position,
                                    require_exhaustion_or_shakeout=req_exhaustion,
                                    enforce_stage2=bool(f.get("enforce_stage2", True))
                                )
                                if ch_res:
                                    c["cheat_is_setup"] = ch_res.get("cheat_is_setup", False)
                                    c["cheat_is_trigger"] = ch_res.get("cheat_is_trigger", False)
                                    c["cheat_pivot_price"] = ch_res.get("cheat_pivot_price")
                                    c["cheat_stop_loss"] = ch_res.get("cheat_stop_loss")
                                    c["cheat_risk_pct"] = ch_res.get("cheat_risk_pct")
                                    c["cheat_base_depth"] = ch_res.get("cheat_base_depth")
                                    c["cheat_base_position"] = ch_res.get("cheat_base_position")
                                    c["cheat_exhaustion_type"] = ch_res.get("exhaustion_type")
                                    c["cheat_trigger_vol_ratio"] = ch_res.get("trigger_vol_ratio")
                                    c["cheat_reward_risk_ratio"] = ch_res.get("reward_risk_ratio")
                                    c["cheat_stage2_qualified"] = ch_res.get("stage2_qualified", False)
                                    # Populate low_cheat fields so existing footprint cards and tables display correctly
                                    c["low_cheat_is_setup"] = ch_res.get("cheat_is_setup", False)
                                    c["low_cheat_is_trigger"] = ch_res.get("cheat_is_trigger", False)
                                    c["low_cheat_pivot_price"] = ch_res.get("cheat_pivot_price")
                                    c["low_cheat_stop_loss"] = ch_res.get("cheat_stop_loss")
                                    c["low_cheat_risk_pct"] = ch_res.get("cheat_risk_pct")
                                    c["low_cheat_base_depth"] = ch_res.get("cheat_base_depth")
                                    c["low_cheat_base_position"] = ch_res.get("cheat_base_position")
                except Exception as e:
                    print(f"Error calculating dynamic setups for candidates on {actual_date_str}: {e}")

            # Ensure default boolean and metrics for all candidates
            for c in candidates:
                c.setdefault("pp_is_setup", bool((c.get("pp_runup_pct") or 0) >= 100.0 and (c.get("pp_drawdown_pct") or 100) <= 25.0 and (c.get("pp_days_since_peak") or 0) >= 10))
                c.setdefault("pp_is_trigger", False)
                c.setdefault("pp_pivot_price", 0.0)
                c.setdefault("pp_runup_pct", 0.0)
                c.setdefault("pp_drawdown_pct", 0.0)
                c.setdefault("pp_days_since_peak", 0)
                c.setdefault("breakout_is_setup", False)
                c.setdefault("breakout_runup_pct", 0.0)
                c.setdefault("breakout_drawdown_pct", 0.0)
                c.setdefault("breakout_consolidation_days", 0)
                c.setdefault("breakout_pivot_dist_pct", 0.0)
                c.setdefault("breakout_peak_high", 0.0)
                c.setdefault("is_htf", False)
                c.setdefault("ema_surfing", False)
                c.setdefault("vcp_is_setup", False)
                c.setdefault("parabolic_short_is_setup", False)
                c.setdefault("parabolic_long_is_setup", False)
                c.setdefault("ep_is_setup", False)
                c.setdefault("low_cheat_is_setup", False)
                c.setdefault("low_cheat_is_trigger", False)
                c.setdefault("low_cheat_pivot_price", 0.0)
                c.setdefault("low_cheat_stop_loss", 0.0)
                c.setdefault("low_cheat_risk_pct", 0.0)
                c.setdefault("cheat_is_setup", False)
                c.setdefault("cheat_is_trigger", False)
                c.setdefault("cheat_pivot_price", 0.0)
                c.setdefault("cheat_stop_loss", 0.0)
                c.setdefault("cheat_risk_pct", 0.0)

            # If not precomputed on this date, apply in-memory setup filtering based on dynamically calculated values
            if not has_precomputed_setups:
                if require_power_play:
                    min_pp_runup = float(f.get("min_pp_runup", 100.0))
                    max_pp_drawdown = float(f.get("max_pp_drawdown", 25.0))
                    min_pp_days = int(f.get("min_pp_days_since_peak", 10))
                    enable_pp_vol = f.get("enable_pp_vol_ratio", False)
                    max_pp_vol = float(f.get("max_pp_vol_ratio", 0.5))

                    candidates = [
                        c for c in candidates
                        if (c.get("pp_runup_pct") is not None and c["pp_runup_pct"] >= min_pp_runup)
                        and (c.get("pp_drawdown_pct") is not None and c["pp_drawdown_pct"] <= max_pp_drawdown)
                        and (c.get("pp_is_trigger") or (c.get("pp_days_since_peak") is not None and c["pp_days_since_peak"] >= min_pp_days))
                        and (not enable_pp_vol or not c.get("volume") or not c.get("vol_50d_ma") or ((c["volume"] / c["vol_50d_ma"]) <= max_pp_vol))
                    ]

                if enable_vcp_pattern:
                    candidates = [c for c in candidates if c.get("vcp_is_setup")]

                if require_parabolic:
                    min_runup = float(f.get("min_parabolic_runup", 40.0))
                    min_ema_dist = float(f.get("min_parabolic_ema_dist", 18.0))
                    min_up_days = int(f.get("min_parabolic_up_days", 3))

                    candidates = [
                        c for c in candidates
                        if (c.get("parabolic_short_is_setup") or (
                            c.get("parabolic_runup_pct") is not None and c["parabolic_runup_pct"] >= min_runup and
                            c.get("dist_ema10_pct") is not None and c["dist_ema10_pct"] >= min_ema_dist and
                            c.get("parabolic_up_days") is not None and c["parabolic_up_days"] >= min_up_days
                        ))
                    ]

            # If low cheat was requested, ensure low_cheat_is_setup is True
            if require_low_cheat and not enable_cheat:
                candidates = [c for c in candidates if c.get("low_cheat_is_setup")]
                min_bp = float(f.get("min_base_position", 0.0))
                max_bp = float(f.get("max_base_position", 50.0))
                candidates = [
                    c for c in candidates
                    if c.get("low_cheat_base_position") is None or (
                        c["low_cheat_base_position"] >= min_bp and c["low_cheat_base_position"] <= max_bp
                    )
                ]

            # If cheat was enabled, filter by dynamically computed cheat_is_setup
            if enable_cheat:
                candidates = [c for c in candidates if c.get("cheat_is_setup")]

            # If parabolic setup is enabled with custom window, filter by dynamically computed runup
            if require_parabolic and int(f.get("parabolic_window_days", 10)) != 10:
                min_runup = float(f.get("min_parabolic_runup", 40.0))
                candidates = [
                    c for c in candidates
                    if c.get("parabolic_short_is_setup") or (
                        c.get("parabolic_runup_pct") is not None and c["parabolic_runup_pct"] >= min_runup
                    )
                ]

            # Filter candidates by breakout if enabled
            if require_breakout:
                candidates = [c for c in candidates if c.get("breakout_is_setup")]

            # If pivot tightness was not precomputed on this date, apply in-memory filter
            if require_pivot_tightness and not has_precomputed_setups:
                max_pivot_spread = float(f.get("max_pivot_spread", 8.0))
                max_pivot_clustering = float(f.get("max_pivot_clustering", 3.0))
                max_pivot_vol_ratio = float(f.get("max_pivot_vol_ratio", 0.8))
                candidates = [
                    c for c in candidates
                    if (c.get("pivot_spread_pct") is not None and c["pivot_spread_pct"] <= max_pivot_spread)
                    and (c.get("pivot_close_clustering_pct") is not None and c["pivot_close_clustering_pct"] <= max_pivot_clustering)
                    and (c.get("pivot_vol_ratio") is None or c["pivot_vol_ratio"] <= max_pivot_vol_ratio)
                ]

            # 3c. Qullamaggie Momentum / My Universe Screening
            if require_momentum:
                qm_subview = str(f.get("qm_subview", "all")).lower()
                min_c_days = int(f.get("min_breakout_days", 0)) if f.get("min_breakout_days") is not None else 0
                if min_c_days > 0:
                    candidates = [
                        c for c in candidates
                        if (c.get("pp_days_since_peak") is not None and c["pp_days_since_peak"] >= min_c_days)
                        or (c.get("breakout_consolidation_days") is not None and c["breakout_consolidation_days"] >= min_c_days)
                    ]

                qm_top_n = int(f.get("qm_top_n", 100))

                # Scan 1: 1-Month Gainers
                c_1m = [c for c in candidates if c.get("ret_1m") is not None and c["ret_1m"] > 0]
                c_1m.sort(key=lambda x: x["ret_1m"], reverse=True)
                top_1m = c_1m[:qm_top_n]
                top_1m_map = {c["symbol"]: (rank, c) for rank, c in enumerate(top_1m, 1)}

                # Scan 2: 3-Month Gainers
                c_3m = [c for c in candidates if c.get("ret_3m") is not None and c["ret_3m"] > 0]
                c_3m.sort(key=lambda x: x["ret_3m"], reverse=True)
                top_3m = c_3m[:qm_top_n]
                top_3m_map = {c["symbol"]: (rank, c) for rank, c in enumerate(top_3m, 1)}

                # Scan 3: 6-Month Gainers
                c_6m = [c for c in candidates if c.get("ret_6m") is not None and c["ret_6m"] > 0]
                c_6m.sort(key=lambda x: x["ret_6m"], reverse=True)
                top_6m = c_6m[:qm_top_n]
                top_6m_map = {c["symbol"]: (rank, c) for rank, c in enumerate(top_6m, 1)}

                # Deduplicate and combine gainers into unified focus list
                merged_gainers = {}
                all_gainers_syms = set(top_1m_map.keys()) | set(top_3m_map.keys()) | set(top_6m_map.keys())
                for sym in all_gainers_syms:
                    c = (top_1m_map.get(sym) or top_3m_map.get(sym) or top_6m_map.get(sym))[1]
                    timeframes = []
                    ranks = {}
                    if sym in top_1m_map:
                        timeframes.append("1M")
                        ranks["1m"] = top_1m_map[sym][0]
                    if sym in top_3m_map:
                        timeframes.append("3M")
                        ranks["3m"] = top_3m_map[sym][0]
                    if sym in top_6m_map:
                        timeframes.append("6M")
                        ranks["6m"] = top_6m_map[sym][0]

                    ema_10 = c.get("ema_10")
                    ema_20 = c.get("ema_20")
                    sma_50 = c.get("sma_50")
                    close = c.get("close")
                    ma_aligned = bool(ema_10 and ema_20 and sma_50 and close and close > ema_10 and ema_10 > ema_20 and ema_20 > sma_50)

                    c["qm_timeframes"] = timeframes
                    c["qm_ranks"] = ranks
                    c["ma_aligned"] = ma_aligned
                    merged_gainers[sym] = c

                # Stage 2: all stocks in stage template + match base filter conditions (not capped by qm_top_n)
                stage2_candidates = [c for c in candidates if c.get("is_stage2")]
                stage2_map = {}
                for c in stage2_candidates:
                    sym = c["symbol"]
                    if sym in merged_gainers:
                        stage2_map[sym] = merged_gainers[sym]
                    else:
                        ema_10 = c.get("ema_10")
                        ema_20 = c.get("ema_20")
                        sma_50 = c.get("sma_50")
                        close = c.get("close")
                        c["ma_aligned"] = bool(ema_10 and ema_20 and sma_50 and close and close > ema_10 and ema_10 > ema_20 and ema_20 > sma_50)
                        c["qm_timeframes"] = []
                        c["qm_ranks"] = {}
                        stage2_map[sym] = c

                if qm_subview == '1m':
                    candidates = [merged_gainers[sym] for sym in top_1m_map.keys() if sym in merged_gainers]
                    candidates.sort(key=lambda x: x.get("ret_1m") or 0, reverse=True)
                elif qm_subview == '3m':
                    candidates = [merged_gainers[sym] for sym in top_3m_map.keys() if sym in merged_gainers]
                    candidates.sort(key=lambda x: x.get("ret_3m") or 0, reverse=True)
                elif qm_subview == '6m':
                    candidates = [merged_gainers[sym] for sym in top_6m_map.keys() if sym in merged_gainers]
                    candidates.sort(key=lambda x: x.get("ret_6m") or 0, reverse=True)
                elif qm_subview in ('gainers', 'all_gainers'):
                    candidates = list(merged_gainers.values())
                    candidates.sort(
                        key=lambda x: (
                            len(x.get("qm_timeframes", [])),
                            max(x.get("ret_1m") or 0, x.get("ret_3m") or 0, x.get("ret_6m") or 0)
                        ),
                        reverse=True
                    )
                elif qm_subview == 'stage2':
                    candidates = list(stage2_map.values())
                    candidates.sort(key=lambda x: x.get("rs_rank") or 0, reverse=True)
                elif qm_subview == 'leaders':
                    target_min_price = float(f.get("min_price", 10.0)) if f.get("min_price") is not None else 10.0
                    target_adr = float(f.get("min_adr_20d", 4.0)) if f.get("min_adr_20d") is not None else 4.0
                    target_rs = float(f.get("min_rs_percentile", 90)) if f.get("min_rs_percentile") is not None else 90.0
                    leaders_candidates = []
                    for c in candidates:
                        close = c.get("close")
                        adr = c.get("adr_20d")
                        rs = c.get("rs_rank")
                        sma_50 = c.get("sma_50")
                        ema_10 = c.get("ema_10")
                        ema_20 = c.get("ema_20")
                        surge = c.get("surge_off_low_pct")

                        if (
                            close is not None and close >= target_min_price
                            and adr is not None and adr >= target_adr
                            and rs is not None and rs >= target_rs
                            and sma_50 is not None and close > sma_50
                            and (ema_10 is None or ema_20 is None or ema_10 > ema_20)
                            and surge is not None and surge >= 70.0
                        ):
                            sym = c["symbol"]
                            if sym in merged_gainers:
                                leaders_candidates.append(merged_gainers[sym])
                            else:
                                c["qm_timeframes"] = []
                                c["qm_ranks"] = {}
                                c["ma_aligned"] = bool(ema_10 and ema_20 and sma_50 and close and close > ema_10 and ema_10 > ema_20 and ema_20 > sma_50)
                                leaders_candidates.append(c)

                    leaders_candidates.sort(
                        key=lambda x: (x.get("rs_rank") or 0, x.get("surge_off_low_pct") or 0),
                        reverse=True
                    )
                    candidates = leaders_candidates
                else:
                    # 'all': Union of Stage 2 candidates and All Gainers (1M/3M/6M)
                    combined_map = dict(stage2_map)
                    combined_map.update(merged_gainers)
                    candidates = list(combined_map.values())
                    candidates.sort(
                        key=lambda x: (
                            (1 if x.get("is_stage2") else 0) + len(x.get("qm_timeframes", [])),
                            x.get("rs_rank") or 0
                        ),
                        reverse=True
                    )

                # If enforce_stage2 is explicitly toggled by user in filters (and not already stage2 or leaders view)
                if f.get("enforce_stage2") and qm_subview not in ('stage2', 'leaders'):
                    candidates = [c for c in candidates if c.get("is_stage2")]
            else:
                for c in candidates:
                    ema_10 = c.get("ema_10")
                    ema_20 = c.get("ema_20")
                    sma_50 = c.get("sma_50")
                    close = c.get("close")
                    c["ma_aligned"] = bool(ema_10 and ema_20 and sma_50 and close and close > ema_10 and ema_10 > ema_20 and ema_20 > sma_50)

            # Optional dynamic sorting
            eff_sort_by = sort_by or f.get("sort_by")
            if eff_sort_by:
                eff_sort_order = str(sort_order or f.get("sort_order", "desc")).lower()
                is_reverse = eff_sort_order != "asc"
                candidates.sort(key=lambda x: (x.get(eff_sort_by) is not None, x.get(eff_sort_by) or 0), reverse=is_reverse)

            if not candidates:
                return []

            # 4. Forward performance calculation
            try:
                cand_symbols = [c["symbol"] for c in candidates]
                symbols_str = ", ".join(f"'{s}'" for s in cand_symbols)
                forward_rows = conn.execute(f"""
                    SELECT symbol, date, open, high, low, close 
                    FROM daily_bars 
                    WHERE symbol IN ({symbols_str}) AND date > CAST(? AS DATE)
                    ORDER BY symbol, date ASC
                """, [actual_date_str]).fetchall()

                sym_forward = defaultdict(list)
                for sym, dt, op, h, l, cl in forward_rows:
                    sym_forward[sym].append((op, h, l, cl, dt))

                for c in candidates:
                    symbol = c["symbol"]
                    f_bars = sym_forward.get(symbol, [])
                    if f_bars:
                        # Next Day Open is entry price
                        entry_bar = f_bars[0]
                        entry_dt = entry_bar[4]
                        entry_date_str = entry_dt.strftime("%Y-%m-%d") if hasattr(entry_dt, "strftime") else str(entry_dt)
                        entry_price = round(float(entry_bar[0]), 2)

                        c["entry_date"] = entry_date_str
                        c["entry_price"] = entry_price

                        # 5-Day Window
                        b5 = f_bars[:5]
                        close_5 = b5[-1][3]
                        c["return_5d"] = round(((close_5 - entry_price) / entry_price) * 100.0, 2)
                        max_h_5 = max(b[1] for b in b5)
                        c["max_runup_5d"] = round(((max_h_5 - entry_price) / entry_price) * 100.0, 2)
                        min_l_5 = min(b[2] for b in b5)
                        c["max_drawdown_5d"] = round(((min_l_5 - entry_price) / entry_price) * 100.0, 2)
                        c["forward_bars_count_5d"] = len(b5)

                        # 20-Day Window
                        b20 = f_bars[:20]
                        close_20 = b20[-1][3]
                        c["return_20d"] = round(((close_20 - entry_price) / entry_price) * 100.0, 2)
                        max_h_20 = max(b[1] for b in b20)
                        c["max_runup_20d"] = round(((max_h_20 - entry_price) / entry_price) * 100.0, 2)
                        min_l_20 = min(b[2] for b in b20)
                        c["max_drawdown_20d"] = round(((min_l_20 - entry_price) / entry_price) * 100.0, 2)
                        c["forward_bars_count_20d"] = len(b20)
                    else:
                        c["entry_date"] = None
                        c["entry_price"] = None
                        c["return_5d"] = None
                        c["max_runup_5d"] = None
                        c["max_drawdown_5d"] = None
                        c["forward_bars_count_5d"] = 0
                        c["return_20d"] = None
                        c["max_runup_20d"] = None
                        c["max_drawdown_20d"] = None
                        c["forward_bars_count_20d"] = 0
            except Exception as e:
                print(f"Error calculating forward performance for candidates on {actual_date_str}: {e}")

            return candidates


    def get_stock_detail(self, symbol: str) -> Dict[str, Any]:
        symbol = symbol.upper()
        with self.get_read_only_conn() as conn:
            # Metadata
            meta = conn.execute("SELECT symbol, exchange, name, asset_type, active, ipo_date, sector, industry, next_earnings_date FROM symbols WHERE symbol = ?", [symbol]).fetchone()
            if not meta:
                return {}
                
            company_desc = COMPANY_DESCRIPTIONS.get(symbol)
            if not company_desc:
                c_name = (meta[2] or symbol).split(" Common Stock")[0].split(" Class")[0]
                company_desc = f"{c_name} operates in the {meta[6] or 'Equity'} sector ({meta[7] or 'Diversified'}), listed on the {meta[1]}."

            meta_dict = {
                "symbol": meta[0],
                "exchange": meta[1],
                "name": meta[2],
                "asset_type": meta[3],
                "active": meta[4],
                "ipo_date": meta[5] if len(meta) > 5 else None,
                "sector": meta[6] if len(meta) > 6 else None,
                "industry": meta[7] if len(meta) > 7 else None,
                "next_earnings_date": meta[8] if len(meta) > 8 else None,
                "description": company_desc
            }
            
            # Fundamentals
            funds = conn.execute("""
                SELECT report_date, fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue,
                       inst_holders_count, inst_holders_qoq_change, inst_ownership_pct, sponsorship_streak
                FROM quarterly_fundamentals 
                WHERE symbol = ?
                ORDER BY fiscal_quarter DESC
            """, [symbol]).fetchall()
            
            fund_list = []
            for row in funds:
                fund_list.append({
                    "report_date": row[0].strftime("%Y-%m-%d") if row[0] else None,
                    "fiscal_quarter": row[1],
                    "eps_diluted": row[2],
                    "eps_qoq_growth": row[3],
                    "total_revenue": row[4],
                    "inst_holders_count": row[5] if len(row) > 5 else None,
                    "inst_holders_qoq_change": row[6] if len(row) > 6 else None,
                    "inst_ownership_pct": row[7] if len(row) > 7 else None,
                    "sponsorship_streak": row[8] if len(row) > 8 else None
                })

            # Institutional Sponsorship History
            s_rows = conn.execute("""
                SELECT 
                    i.fiscal_quarter,
                    i.report_date,
                    i.holders_count,
                    i.holders_qoq_change,
                    i.holders_growth_pct,
                    i.ownership_pct,
                    i.source,
                    qf.sponsorship_streak
                FROM institutional_sponsorship i
                LEFT JOIN quarterly_fundamentals qf 
                    ON i.symbol = qf.symbol AND i.fiscal_quarter = qf.fiscal_quarter
                WHERE i.symbol = ?
                ORDER BY i.fiscal_quarter DESC
            """, [symbol]).fetchall()

            if not s_rows:
                s_rows = conn.execute("""
                    SELECT 
                        fiscal_quarter,
                        report_date,
                        inst_holders_count,
                        inst_holders_qoq_change,
                        CASE WHEN inst_holders_count - inst_holders_qoq_change > 0 
                             THEN (inst_holders_qoq_change * 100.0 / (inst_holders_count - inst_holders_qoq_change))
                             ELSE NULL END as growth_pct,
                        inst_ownership_pct,
                        'fundamentals' as source,
                        sponsorship_streak
                    FROM quarterly_fundamentals
                    WHERE symbol = ? AND inst_holders_count IS NOT NULL
                    ORDER BY fiscal_quarter DESC
                """, [symbol]).fetchall()

            sponsorship_history = [
                {
                    "fiscal_quarter": r[0],
                    "report_date": r[1].strftime("%Y-%m-%d") if r[1] else None,
                    "holders_count": r[2],
                    "holders_qoq_change": r[3],
                    "holders_growth_pct": round(r[4], 2) if r[4] is not None else None,
                    "ownership_pct": r[5],
                    "source": r[6],
                    "sponsorship_streak": r[7] if len(r) > 7 and r[7] is not None else 0
                }
                for r in s_rows
            ]
            latest_sponsorship = sponsorship_history[0] if sponsorship_history else None
            
            # Get latest RS, ATR, TI65, and Volume metrics
            latest_bar = conn.execute("""
                SELECT rs_score, rs_rank, atr_20d, ti_65, COALESCE(dollar_vol_50d_ma, close * vol_50d_ma) as dollar_vol_50d_ma, vol_50d_ma
                FROM daily_bars
                WHERE symbol = ? AND date = (SELECT MAX(date) FROM daily_bars)
            """, [symbol]).fetchone()
            
            rs_score = latest_bar[0] if latest_bar else None
            rs_rank = latest_bar[1] if latest_bar else None
            atr_20d = latest_bar[2] if latest_bar else None
            ti_65 = latest_bar[3] if latest_bar else None
            dollar_vol_50d_ma = latest_bar[4] if latest_bar else None
            vol_50d_ma = latest_bar[5] if latest_bar else None

            # Calculate Minervini Setups (VCP, Low Cheat & Cheat)
            from application.engine.setups.vcp import detect_vcp
            from application.engine.setups.low_cheat import detect_low_cheat, detect_cheat

            bars_for_setups = conn.execute("""
                SELECT date, open, high, low, close, volume, sma_50, sma_150, sma_200, ipo_days_count
                FROM daily_bars
                WHERE symbol = ?
                ORDER BY date ASC
            """, [symbol]).fetchall()

            vcp_footprint = None
            low_cheat_footprint = None
            cheat_footprint = None
            if bars_for_setups and len(bars_for_setups) >= 15:
                dates = [b[0] for b in bars_for_setups]
                opens = [float(b[1]) for b in bars_for_setups]
                highs = [float(b[2]) for b in bars_for_setups]
                lows = [float(b[3]) for b in bars_for_setups]
                closes = [float(b[4]) for b in bars_for_setups]
                volumes = [float(b[5]) for b in bars_for_setups]
                latest_sma50 = float(bars_for_setups[-1][6]) if bars_for_setups[-1][6] is not None else None
                latest_sma150 = float(bars_for_setups[-1][7]) if bars_for_setups[-1][7] is not None else None
                latest_sma200 = float(bars_for_setups[-1][8]) if bars_for_setups[-1][8] is not None else None
                latest_ipo_days = int(bars_for_setups[-1][9]) if bars_for_setups[-1][9] is not None else None

                vcp_footprint = detect_vcp(highs, lows, dates, closes=closes, window=3)
                low_cheat_footprint = detect_low_cheat(
                    opens, highs, lows, closes, volumes, dates,
                    vol_50d_ma=vol_50d_ma,
                    sma_50=latest_sma50,
                    sma_150=latest_sma150,
                    sma_200=latest_sma200,
                    ipo_days=latest_ipo_days,
                    enforce_stage2=True
                )
                if not (low_cheat_footprint and low_cheat_footprint.get("low_cheat_is_setup")):
                    cheat_res = detect_cheat(
                        opens, highs, lows, closes, volumes, dates,
                        vol_50d_ma=vol_50d_ma,
                        sma_50=latest_sma50,
                        sma_150=latest_sma150,
                        sma_200=latest_sma200,
                        ipo_days=latest_ipo_days,
                        enforce_stage2=True
                    )
                    if cheat_res and cheat_res.get("cheat_is_setup"):
                        cheat_footprint = cheat_res
                        low_cheat_footprint = cheat_res
                 
            return {
                "metadata": meta_dict,
                "fundamentals": fund_list,
                "sponsorship_history": sponsorship_history,
                "sponsorship_summary": latest_sponsorship,
                "rs_score": rs_score,
                "rs_rank": rs_rank,
                "adr_20d": atr_20d,
                "atr_20d": atr_20d,
                "ti_65": ti_65,
                "dollar_vol_50d_ma": dollar_vol_50d_ma,
                "vol_50d_ma": vol_50d_ma,
                "vcp_footprint": vcp_footprint,
                "low_cheat_footprint": low_cheat_footprint,
                "cheat_footprint": cheat_footprint,
                "next_earnings_date": meta_dict.get("next_earnings_date")
            }


    def get_stock_prices(self, symbol: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        symbol = symbol.upper()
        with self.get_read_only_conn() as conn:
            bars = conn.execute("""
                WITH spy_bars AS (
                    SELECT date, close as spy_close
                    FROM daily_bars
                    WHERE symbol = 'SPY'
                ),
                sym_bars AS (
                    SELECT date, open, high, low, close, volume, sma_50, sma_150, sma_200, rs_rank, ti_65
                    FROM daily_bars
                    WHERE symbol = ?
                ),
                combined AS (
                    SELECT 
                        s.*,
                        ROUND((s.close / NULLIF(b.spy_close, 0)) * 100.0, 4) as rs_line
                    FROM sym_bars s
                    LEFT JOIN spy_bars b ON s.date = b.date
                    ORDER BY s.date ASC
                ),
                with_rolling AS (
                    SELECT 
                        *,
                        MAX(rs_line) OVER (ORDER BY date ROWS BETWEEN 252 PRECEDING AND 1 PRECEDING) as prev_rs_52w_high,
                        MAX(close) OVER (ORDER BY date ROWS BETWEEN 252 PRECEDING AND 1 PRECEDING) as prev_close_52w_high
                    FROM combined
                )
                SELECT 
                    date, open, high, low, close, volume, sma_50, sma_150, sma_200, rs_rank, ti_65,
                    rs_line,
                    COALESCE(rs_line >= prev_rs_52w_high AND close < COALESCE(prev_close_52w_high, close), false) as is_rs_blue_dot
                FROM with_rolling
                ORDER BY date ASC
            """, [symbol]).fetchall()
            
            # limit output bars if limit is a positive integer
            if limit and limit > 0 and len(bars) > limit:
                bars = bars[-limit:]
                
            bars_list = []
            for row in bars:
                bars_list.append({
                    "time": row[0].strftime("%Y-%m-%d") if row[0] else None,
                    "open": row[1],
                    "high": row[2],
                    "low": row[3],
                    "close": row[4],
                    "volume": row[5],
                    "sma_50": row[6],
                    "sma_150": row[7],
                    "sma_200": row[8],
                    "rs_rank": row[9],
                    "ti_65": row[10],
                    "rs_line": row[11],
                    "is_rs_blue_dot": bool(row[12]) if row[12] is not None else False
                })
            return bars_list

    def get_stock_earnings(self, symbol: str) -> List[Dict[str, Any]]:
        """Retrieves historical and upcoming earnings report dates, estimates, actuals, and surprise % for a symbol."""
        symbol = symbol.upper()

        # 1. First read existing records from earnings_calendar
        existing_rows = []
        with self.get_read_only_conn() as conn:
            try:
                existing_rows = conn.execute("""
                    SELECT earnings_date, eps_estimate, eps_actual, surprise_pct, time_of_day
                    FROM earnings_calendar
                    WHERE symbol = ?
                    ORDER BY earnings_date ASC
                """, [symbol]).fetchall()
            except Exception:
                pass

        records = []
        for r in existing_rows:
            records.append({
                "date": r[0].strftime("%Y-%m-%d") if hasattr(r[0], "strftime") else str(r[0])[:10],
                "eps_estimate": float(r[1]) if r[1] is not None else None,
                "eps_actual": float(r[2]) if r[2] is not None else None,
                "surprise_pct": float(r[3]) if r[3] is not None else None,
                "time_of_day": r[4]
            })

        # 2. If records are few or empty, fetch from yfinance and cache in earnings_calendar
        if len(records) < 4:
            try:
                import yfinance as yf
                import pandas as pd
                ticker = yf.Ticker(symbol)
                ed = ticker.earnings_dates
                if ed is not None and not ed.empty:
                    new_records = []
                    for dt, row in ed.iterrows():
                        d_str = dt.strftime("%Y-%m-%d")
                        est = float(row["EPS Estimate"]) if "EPS Estimate" in row and not pd.isna(row["EPS Estimate"]) else None
                        act = float(row["Reported EPS"]) if "Reported EPS" in row and not pd.isna(row["Reported EPS"]) else None
                        surp = float(row["Surprise(%)"]) if "Surprise(%)" in row and not pd.isna(row["Surprise(%)"]) else None
                        hour = dt.hour if hasattr(dt, "hour") else 0
                        tod = "amc" if hour >= 15 else ("bmo" if hour <= 10 and hour > 0 else None)
                        new_records.append({
                            "symbol": symbol,
                            "earnings_date": d_str,
                            "eps_estimate": est,
                            "eps_actual": act,
                            "surprise_pct": surp,
                            "time_of_day": tod
                        })
                    if new_records:
                        from application.database import DatabaseManager
                        db_mgr = DatabaseManager(self.get_db_path())
                        db_mgr.upsert_earnings_calendar(new_records)
                        records = [{
                            "date": nr["earnings_date"],
                            "eps_estimate": nr["eps_estimate"],
                            "eps_actual": nr["eps_actual"],
                            "surprise_pct": nr["surprise_pct"],
                            "time_of_day": nr["time_of_day"]
                        } for nr in new_records]

                # Fallback to ticker.calendar for upcoming earnings date if not present
                try:
                    cal = getattr(ticker, "calendar", None)
                    if cal is not None:
                        cal_ed = cal.get("Earnings Date") if isinstance(cal, dict) else (cal.loc["Earnings Date"] if hasattr(cal, "loc") and "Earnings Date" in cal.index else None)
                        if cal_ed is not None:
                            first_d = cal_ed[0] if isinstance(cal_ed, (list, tuple)) and len(cal_ed) > 0 else cal_ed
                            cal_d_str = first_d.strftime("%Y-%m-%d") if hasattr(first_d, "strftime") else str(first_d)[:10]
                            if cal_d_str and len(cal_d_str) == 10 and not any(r["date"] == cal_d_str for r in records):
                                records.append({
                                    "date": cal_d_str,
                                    "eps_estimate": None,
                                    "eps_actual": None,
                                    "surprise_pct": None,
                                    "time_of_day": None
                                })
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"Could not fetch live earnings dates for {symbol}: {e}")

        # 3. Ensure symbols.next_earnings_date is represented if available
        with self.get_read_only_conn() as conn:
            try:
                sym_row = conn.execute("SELECT next_earnings_date FROM symbols WHERE symbol = ?", [symbol]).fetchone()
                if sym_row and sym_row[0]:
                    next_ed = str(sym_row[0])[:10]
                    if not any(r["date"] == next_ed for r in records):
                        records.append({
                            "date": next_ed,
                            "eps_estimate": None,
                            "eps_actual": None,
                            "surprise_pct": None,
                            "time_of_day": None
                        })
            except Exception:
                pass

        records = sorted(records, key=lambda x: x["date"])
        return records

    def get_stock_financials(self, symbol: str) -> Dict[str, Any]:
        symbol = symbol.upper()
        # Verify symbol exists
        with self.get_read_only_conn() as conn:
            meta = conn.execute("SELECT name FROM symbols WHERE symbol = ?", [symbol]).fetchone()
            if not meta:
                return {}
        
        import yfinance as yf
        import pandas as pd

        try:
            ticker = yf.Ticker(symbol)
            # Fetch annual financials (fall back to financials if income_stmt is empty)
            ann_stmt = ticker.income_stmt
            if ann_stmt is None or ann_stmt.empty:
                ann_stmt = ticker.financials
            # Fetch quarterly financials (fall back to quarterly_financials)
            qtr_stmt = ticker.quarterly_income_stmt
            if qtr_stmt is None or qtr_stmt.empty:
                qtr_stmt = ticker.quarterly_financials
        except Exception:
            ann_stmt = None
            qtr_stmt = None

        # Row extraction helper
        def get_row(df, keys):
            if df is None or df.empty:
                return pd.Series(dtype=float)
            for k in keys:
                if k in df.index:
                    return df.loc[k]
            return pd.Series(index=df.columns, dtype=float)

        # 1. Process annual financials
        yearly_data = []
        if ann_stmt is not None and not ann_stmt.empty:
            eps_ann = get_row(ann_stmt, ['Diluted EPS', 'Basic EPS'])
            rev_ann = get_row(ann_stmt, ['Total Revenue', 'Operating Revenue'])
            years = sorted(list(ann_stmt.columns))
            
            for y in years:
                val_eps = eps_ann.get(y)
                val_rev = rev_ann.get(y)
                
                # Check for nan/pandas Series structures
                val_eps = float(val_eps) if val_eps is not None and not pd.isna(val_eps) else None
                val_rev = float(val_rev) if val_rev is not None and not pd.isna(val_rev) else None
                
                # YoY Change
                prev_y = next((x for x in years if x.year == y.year - 1), None)
                eps_chg = None
                if prev_y is not None:
                    val_eps_prev = eps_ann.get(prev_y)
                    if val_eps_prev is not None and not pd.isna(val_eps_prev) and val_eps_prev != 0 and val_eps is not None:
                        eps_chg = float(((val_eps - val_eps_prev) / abs(val_eps_prev)) * 100)
                        
                rev_chg = None
                if prev_y is not None:
                    val_rev_prev = rev_ann.get(prev_y)
                    if val_rev_prev is not None and not pd.isna(val_rev_prev) and val_rev_prev != 0 and val_rev is not None:
                        rev_chg = float(((val_rev - val_rev_prev) / val_rev_prev) * 100)
                        
                yearly_data.append({
                    "year": y.year,
                    "eps": val_eps,
                    "eps_pct_change": eps_chg,
                    "sales": val_rev / 1e6 if val_rev else None,  # in millions
                    "sales_pct_change": rev_chg
                })

        # 2. Process quarterly financials
        quarterly_data = []
        if qtr_stmt is not None and not qtr_stmt.empty:
            eps_qtr = get_row(qtr_stmt, ['Diluted EPS', 'Basic EPS'])
            rev_qtr = get_row(qtr_stmt, ['Total Revenue', 'Operating Revenue'])
            net_qtr = get_row(qtr_stmt, ['Net Income', 'Net Income Common Stockholders'])
            dates = sorted(list(qtr_stmt.columns))
            
            for d in dates:
                val_eps = eps_qtr.get(d)
                val_rev = rev_qtr.get(d)
                val_net = net_qtr.get(d)
                
                val_eps = float(val_eps) if val_eps is not None and not pd.isna(val_eps) else None
                val_rev = float(val_rev) if val_rev is not None and not pd.isna(val_rev) else None
                val_net = float(val_net) if val_net is not None and not pd.isna(val_net) else None
                
                # YoY Change (Prior year same quarter)
                prior_d = next((x for x in dates if x.year == d.year - 1 and abs(x.month - d.month) <= 1), None)
                eps_chg = None
                if prior_d is not None:
                    val_eps_prev = eps_qtr.get(prior_d)
                    if val_eps_prev is not None and not pd.isna(val_eps_prev) and val_eps_prev != 0 and val_eps is not None:
                        eps_chg = float(((val_eps - val_eps_prev) / abs(val_eps_prev)) * 100)
                        
                rev_chg = None
                if prior_d is not None:
                    val_rev_prev = rev_qtr.get(prior_d)
                    if val_rev_prev is not None and not pd.isna(val_rev_prev) and val_rev_prev != 0 and val_rev is not None:
                        rev_chg = float(((val_rev - val_rev_prev) / val_rev_prev) * 100)
                        
                net_margin = None
                if val_rev and val_net:
                    net_margin = float((val_net / val_rev) * 100)
                    
                q_num = ((d.month - 1) // 3) + 1
                quarterly_data.append({
                    "date": d.strftime("%Y-%m-%d"),
                    "quarter_str": f"Q{q_num} {d.year}",
                    "eps": val_eps,
                    "eps_pct_change": eps_chg,
                    "sales": val_rev / 1e6 if val_rev else None,
                    "sales_pct_change": rev_chg,
                    "net_margin": net_margin
                })
                
        # If yfinance quarterly is empty/partial, merge with database historical records
        with self.get_read_only_conn() as conn:
            db_funds = conn.execute("""
                SELECT fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue
                FROM quarterly_fundamentals
                WHERE symbol = ?
                ORDER BY fiscal_quarter DESC
            """, [symbol]).fetchall()
            
        existing_quarters = {q["quarter_str"]: q for q in quarterly_data}
        
        for row in db_funds:
            fq = row[0]
            parts = fq.split("-Q")
            if len(parts) != 2:
                continue
            yr, q_num = parts[0], parts[1]
            q_str = f"Q{q_num} {yr}"
            
            if q_str not in existing_quarters:
                eps_val = float(row[1]) if row[1] is not None else None
                eps_chg = float(row[2]) if row[2] is not None else None
                rev_val = float(row[3]) / 1e6 if row[3] is not None else None
                
                quarterly_data.append({
                    "date": f"{yr}-{(int(q_num)-1)*3+1:02d}-01",
                    "quarter_str": q_str,
                    "eps": eps_val,
                    "eps_pct_change": eps_chg,
                    "sales": rev_val,
                    "sales_pct_change": None,
                    "net_margin": None
                })
                
        quarterly_data = sorted(quarterly_data, key=lambda x: x["date"], reverse=True)
        quarterly_data = quarterly_data[:8]
        quarterly_data = list(reversed(quarterly_data))
        
        # 3. Extract next upcoming earnings date
        next_earnings_date = None
        if ticker is not None:
            try:
                cal = ticker.calendar
                if cal is not None:
                    if isinstance(cal, dict):
                        ed = cal.get("Earnings Date") or cal.get("Earnings High") or cal.get("Earnings Average")
                        if ed is not None:
                            if isinstance(ed, (list, tuple)) and len(ed) > 0:
                                first_d = ed[0]
                                if hasattr(first_d, "strftime"):
                                    next_earnings_date = first_d.strftime("%Y-%m-%d")
                                elif isinstance(first_d, str):
                                    next_earnings_date = first_d[:10]
                            elif hasattr(ed, "strftime"):
                                next_earnings_date = ed.strftime("%Y-%m-%d")
                    elif hasattr(cal, "index") and hasattr(cal, "loc"):
                        if "Earnings Date" in cal.index:
                            val = cal.loc["Earnings Date"]
                            if hasattr(val, "iloc") and len(val) > 0:
                                first_d = val.iloc[0]
                                if hasattr(first_d, "strftime"):
                                    next_earnings_date = first_d.strftime("%Y-%m-%d")
                                elif isinstance(first_d, str):
                                    next_earnings_date = first_d[:10]
            except Exception:
                pass

            if not next_earnings_date:
                try:
                    ed_df = ticker.earnings_dates
                    if ed_df is not None and not ed_df.empty:
                        now = pd.Timestamp.now(tz=ed_df.index.tz) if ed_df.index.tz is not None else pd.Timestamp.now()
                        future = ed_df[ed_df.index >= now].sort_index()
                        if not future.empty:
                            next_dt = future.index[0]
                            if hasattr(next_dt, "strftime"):
                                next_earnings_date = next_dt.strftime("%Y-%m-%d")
                            else:
                                next_earnings_date = str(next_dt)[:10]
                except Exception:
                    pass

        # If not fetched live or yfinance unavailable, fallback to cached next_earnings_date from symbols table
        if not next_earnings_date:
            with self.get_read_only_conn() as conn:
                cached_res = conn.execute("SELECT next_earnings_date FROM symbols WHERE symbol = ?", [symbol]).fetchone()
                if cached_res and cached_res[0]:
                    next_earnings_date = str(cached_res[0])
        else:
            # Persist newly retrieved next_earnings_date to DuckDB symbols table
            try:
                from application.database import DatabaseManager
                db_mgr = DatabaseManager(self.get_db_path())
                db_mgr.update_symbol_next_earnings_date(symbol, next_earnings_date)
            except Exception:
                pass

        return {
            "symbol": symbol,
            "name": meta[0],
            "next_earnings_date": next_earnings_date,
            "yearly_financials": sorted(yearly_data, key=lambda x: x["year"]),
            "quarterly_financials": quarterly_data
        }

    def execute_sql_query(self, query: str) -> Dict[str, Any]:
        query = query.strip()
        try:
            with self.get_read_only_conn() as conn:
                cursor = conn.execute(query)
                
                # Fetch headers
                if cursor.description:
                    columns = [col[0] for col in cursor.description]
                else:
                    columns = ["Status"]
                    
                rows = cursor.fetchall()
                
                # Format row values to be JSON-serializable
                formatted_rows = []
                for row in rows:
                    formatted_row = []
                    for val in row:
                        if val is None:
                            formatted_row.append(None)
                        elif isinstance(val, (int, float, str, bool)):
                            formatted_row.append(val)
                        else:
                            # Convert date, datetime, bytearrays, etc. to strings
                            formatted_row.append(str(val))
                    formatted_rows.append(formatted_row)
                    
                return {
                    "columns": columns,
                    "rows": formatted_rows,
                    "count": len(formatted_rows)
                }
        except Exception as e:
            return {
                "error": str(e),
                "columns": ["Error"],
                "rows": [[str(e)]],
                "count": 0
            }

    def get_market_monitor(self, limit: int = 252, force_refresh: bool = False) -> Dict[str, Any]:
        """Calculates Stockbee Market Monitor metrics across recent trading days with in-memory caching."""
        cache_key = limit if limit and limit > 0 else 252
        now = time.time()
        # Serve from memory cache if available and fresh (10-minute TTL)
        if not force_refresh and cache_key in self._market_monitor_cache and (now - self._cache_timestamp < 600):
            return self._market_monitor_cache[cache_key]

        lookback_needed = cache_key + 120
        query = f"""
            WITH cutoff AS (
                SELECT MIN(date) as min_date FROM (
                    SELECT date FROM daily_bars WHERE symbol = 'QQQ' ORDER BY date DESC LIMIT {lookback_needed}
                )
            ),
            filtered_bars AS (
                SELECT symbol, date, close
                FROM daily_bars, cutoff
                WHERE date >= min_date
            ),
            daily_gains AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                    LAG(close, 20) OVER (PARTITION BY symbol ORDER BY date) as close_20d_ago,
                    LAG(close, 65) OVER (PARTITION BY symbol ORDER BY date) as close_65d_ago
                FROM filtered_bars
            ),
            daily_counts AS (
                SELECT 
                    date,
                    COUNT(CASE WHEN prev_close > 0 AND ((close - prev_close)/prev_close)*100 >= 4.0 THEN 1 END) as gainers_4pct,
                    COUNT(CASE WHEN prev_close > 0 AND ((close - prev_close)/prev_close)*100 <= -4.0 THEN 1 END) as losers_4pct,
                    COUNT(CASE WHEN close_20d_ago > 0 AND ((close - close_20d_ago)/close_20d_ago)*100 >= 25.0 THEN 1 END) as up_25pct_1m,
                    COUNT(CASE WHEN close_20d_ago > 0 AND ((close - close_20d_ago)/close_20d_ago)*100 <= -25.0 THEN 1 END) as down_25pct_1m,
                    COUNT(CASE WHEN close_65d_ago > 0 AND ((close - close_65d_ago)/close_65d_ago)*100 >= 25.0 THEN 1 END) as up_25pct_3m,
                    COUNT(CASE WHEN close_65d_ago > 0 AND ((close - close_65d_ago)/close_65d_ago)*100 <= -25.0 THEN 1 END) as down_25pct_3m,
                    COUNT(CASE WHEN close_20d_ago > 0 AND ((close - close_20d_ago)/close_20d_ago)*100 >= 50.0 THEN 1 END) as up_50pct_1m,
                    COUNT(CASE WHEN close_65d_ago > 0 AND ((close - close_65d_ago)/close_65d_ago)*100 >= 50.0 THEN 1 END) as up_50pct_3m,
                    COUNT(CASE WHEN close_65d_ago > 0 AND ((close - close_65d_ago)/close_65d_ago)*100 <= -50.0 THEN 1 END) as down_50pct_3m
                FROM daily_gains
                GROUP BY date
                ORDER BY date ASC
            )
            SELECT * FROM daily_counts;
        """
        bm_query = """
            WITH bm_bars AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                FROM daily_bars
                WHERE symbol IN ('SPY', 'QQQ')
            )
            SELECT symbol, close, prev_close
            FROM bm_bars
            WHERE rn = 1
        """
        try:
            with self.get_read_only_conn() as conn:
                df = conn.execute(query).df()
                bm_rows = conn.execute(bm_query).fetchall()
                kq_summary = get_qullamaggie_market_summary(conn, symbol="QQQ")
                kq_lookup = get_qullamaggie_daily_lookup(conn, symbol="QQQ")
                cross_asset = self.get_cross_asset_data(conn)
                
            if df.empty:
                return {"summary": {}, "daily_data": []}

            # Convert date column to string YYYY-MM-DD
            df['date_str'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

            # Calculate 13-day EMA of 4% UP and 4% DOWN
            df['ema_13_up'] = df['gainers_4pct'].ewm(span=13, adjust=False).mean().round(1)
            df['ema_13_down'] = df['losers_4pct'].ewm(span=13, adjust=False).mean().round(1)
            df['net_4pct'] = df['gainers_4pct'] - df['losers_4pct']
            df['ratio_4pct'] = (df['gainers_4pct'] / df['losers_4pct'].replace(0, 1)).round(2)

            # Rolling 5-day and 10-day sum ratio of 4% UP vs 4% DOWN
            sum_5d_up = df['gainers_4pct'].rolling(window=5, min_periods=1).sum()
            sum_5d_down = df['losers_4pct'].rolling(window=5, min_periods=1).sum()
            df['ratio_5d'] = (sum_5d_up / sum_5d_down.replace(0, 1)).round(2)

            sum_10d_up = df['gainers_4pct'].rolling(window=10, min_periods=1).sum()
            sum_10d_down = df['losers_4pct'].rolling(window=10, min_periods=1).sum()
            df['ratio_10d'] = (sum_10d_up / sum_10d_down.replace(0, 1)).round(2)

            # Sort descending for response (latest date first)
            df_desc = df.sort_values(by='date', ascending=False)
            
            # Filter limit
            if limit and limit > 0:
                df_desc = df_desc.head(limit)

            daily_list = []
            for row in df_desc.itertuples(index=False):
                d_str = str(row.date_str)
                kq_info = kq_lookup.get(d_str, {})
                daily_list.append({
                    "date": d_str,
                    "gainers_4pct": int(row.gainers_4pct),
                    "losers_4pct": int(row.losers_4pct),
                    "net_4pct": int(row.net_4pct),
                    "ratio_4pct": float(row.ratio_4pct),
                    "ratio_5d": float(row.ratio_5d),
                    "ratio_10d": float(row.ratio_10d),
                    "up_25pct_1m": int(row.up_25pct_1m),
                    "down_25pct_1m": int(row.down_25pct_1m),
                    "up_25pct_3m": int(row.up_25pct_3m),
                    "down_25pct_3m": int(row.down_25pct_3m),
                    "up_50pct_1m": int(row.up_50pct_1m),
                    "up_50pct_3m": int(row.up_50pct_3m),
                    "down_50pct_3m": int(row.down_50pct_3m),
                    "ema_13_up": float(row.ema_13_up),
                    "ema_13_down": float(row.ema_13_down),
                    "kq_regime": kq_info.get("regime", "UNKNOWN"),
                    "kq_label": kq_info.get("label", "-"),
                    "kq_badge": kq_info.get("badge", "-"),
                    "kq_stack": kq_info.get("stack", "-"),
                    "qqq_close": kq_info.get("close"),
                    "qqq_ema_10": kq_info.get("ema_10"),
                    "qqq_ema_20": kq_info.get("ema_20"),
                    "qqq_sma_50": kq_info.get("sma_50"),
                    "qqq_dist_ema10_pct": kq_info.get("dist_ema10_pct"),
                    "qqq_dist_ema20_pct": kq_info.get("dist_ema20_pct"),
                    "qqq_dist_sma50_pct": kq_info.get("dist_sma50_pct")
                })

            # Calculate overall Regime Status & Metrics
            latest = daily_list[0] if daily_list else {}
            last_5 = daily_list[:5]
            sum_5d_net = sum(r["net_4pct"] for r in last_5) if last_5 else 0

            regime = "Neutral / Transition"
            if latest.get("gainers_4pct", 0) >= 2 * max(latest.get("losers_4pct", 1), 1) and latest.get("gainers_4pct", 0) > 300:
                regime = "Bullish Thrust / Expansion"
            elif latest.get("losers_4pct", 0) >= 2 * max(latest.get("gainers_4pct", 1), 1) and latest.get("losers_4pct", 0) > 300:
                regime = "Bearish Distribution / Contraction"
            elif latest.get("up_25pct_1m", 0) > latest.get("down_25pct_1m", 0) * 1.5:
                regime = "Bullish Expansion"
            elif latest.get("down_25pct_1m", 0) > latest.get("up_25pct_1m", 0) * 1.5:
                regime = "Bearish Contraction"

            # Parse benchmark prices for SPY, QQQ, and IWM from open conn
            benchmarks = {
                "SPY": {"close": 0, "change_pct": 0},
                "QQQ": {"close": 0, "change_pct": 0},
                "IWM": {"close": 0, "change_pct": 0}
            }
            for b_sym, b_close, b_prev in bm_rows:
                pct = 0.0
                if b_prev and b_prev > 0:
                    pct = round(((b_close - b_prev) / b_prev) * 100, 2)
                benchmarks[b_sym] = {
                    "close": round(b_close, 2),
                    "change_pct": pct
                }

            summary = {
                "latest_date": latest.get("date"),
                "latest_gainers_4pct": latest.get("gainers_4pct"),
                "latest_losers_4pct": latest.get("losers_4pct"),
                "latest_ratio_4pct": latest.get("ratio_4pct"),
                "latest_ratio_5d": latest.get("ratio_5d"),
                "latest_ratio_10d": latest.get("ratio_10d"),
                "sum_5d_net_4pct": sum_5d_net,
                "latest_up_25pct_1m": latest.get("up_25pct_1m"),
                "latest_down_25pct_1m": latest.get("down_25pct_1m"),
                "latest_up_25pct_3m": latest.get("up_25pct_3m"),
                "latest_down_25pct_3m": latest.get("down_25pct_3m"),
                "regime": regime,
                "benchmarks": benchmarks,
                "cross_asset": cross_asset,
                "kq_evaluation": kq_summary
            }

            result = {"summary": summary, "daily_data": daily_list}
            self._market_monitor_cache[cache_key] = result
            self._cache_timestamp = now
            return result

        except Exception as e:
            return {"error": str(e), "summary": {}, "daily_data": []}

    def get_cross_asset_data(self, conn=None) -> List[Dict[str, Any]]:
        """Returns cross-asset macro market instruments across Equities, Rates, Credit, FX/Comm, Volatility, and Crypto."""
        db_symbols = ['SPY', 'QQQ', 'IWM', 'DIA', 'HYG', 'IEF', 'TLT', 'GLD', 'USO', 'UUP']
        queried_prices = {}
        should_close = False
        try:
            if conn is None:
                conn = self.get_read_only_conn()
                should_close = True
            
            sym_tuple = "('" + "', '".join(db_symbols) + "')"
            sql = f"""
                WITH recent AS (
                    SELECT 
                        symbol,
                        date,
                        close,
                        LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_close,
                        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                    FROM daily_bars
                    WHERE symbol IN {sym_tuple}
                )
                SELECT symbol, close, prev_close
                FROM recent
                WHERE rn = 1
            """
            rows = conn.execute(sql).fetchall()
            for sym, close, prev in rows:
                pct = None
                if prev and prev > 0:
                    pct = round(((close - prev) / prev) * 100, 2)
                queried_prices[sym] = {
                    "price": round(close, 2),
                    "change_pct": pct
                }
        except Exception as e:
            logger.warning(f"Error querying db for cross-asset symbols: {e}")
        finally:
            if should_close and conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

        # 17 macro cross-asset instruments across 6 categories matching institutional tape
        base_assets = [
            # 1. EQUITIES
            {
                "symbol": "SPY",
                "name": "S&P 500 ETF",
                "category": "EQUITIES",
                "price": 761.69,
                "change_pct": -0.12,
                "format": "price"
            },
            {
                "symbol": "QQQ",
                "name": "Nasdaq 100 ETF",
                "category": "EQUITIES",
                "price": 721.45,
                "change_pct": 0.63,
                "format": "price"
            },
            {
                "symbol": "IWM",
                "name": "Russell 2000 ETF",
                "category": "EQUITIES",
                "price": 284.10,
                "change_pct": -0.47,
                "format": "price"
            },
            {
                "symbol": "DIA",
                "name": "Dow Jones 30 ETF",
                "category": "EQUITIES",
                "price": 515.88,
                "change_pct": -0.48,
                "format": "price"
            },
            # 2. RATES
            {
                "symbol": "US10Y",
                "name": "10-Year Treasury Yield",
                "category": "RATES",
                "price": 5.00,
                "change_pct": 1.03,
                "format": "yield_pct"
            },
            {
                "symbol": "2S10S",
                "name": "10Y-2Y Yield Curve Spread",
                "category": "RATES",
                "price": "27bp",
                "change_pct": None,
                "format": "text"
            },
            {
                "symbol": "IEF",
                "name": "7-10 Year Treasury Bond ETF",
                "category": "RATES",
                "price": 90.80,
                "change_pct": -0.49,
                "format": "price"
            },
            # 3. CREDIT
            {
                "symbol": "HYG",
                "name": "High Yield Corporate Bond ETF",
                "category": "CREDIT",
                "price": 78.53,
                "change_pct": -0.24,
                "format": "price"
            },
            {
                "symbol": "HY OAS",
                "name": "High Yield Option-Adjusted Spread",
                "category": "CREDIT",
                "price": "270bp",
                "change_pct": None,
                "format": "text"
            },
            # 4. FX + COMM
            {
                "symbol": "DXY",
                "name": "US Dollar Index",
                "category": "FX + COMM",
                "price": 99.94,
                "change_pct": 0.01,
                "format": "index"
            },
            {
                "symbol": "WTI",
                "name": "WTI Crude Oil ($/bbl)",
                "category": "FX + COMM",
                "price": 93.79,
                "change_pct": -2.38,
                "format": "price"
            },
            {
                "symbol": "GOLD",
                "name": "Gold Spot / Futures ($/oz)",
                "category": "FX + COMM",
                "price": 4415.9,
                "change_pct": -0.20,
                "format": "price_comma"
            },
            {
                "symbol": "CU/AU",
                "name": "Copper / Gold Growth Ratio",
                "category": "FX + COMM",
                "price": 0.00149,
                "change_pct": -0.14,
                "format": "ratio_5dec"
            },
            # 5. VOLATILITY
            {
                "symbol": "VIX",
                "name": "CBOE Volatility Index",
                "category": "VOLATILITY",
                "price": 14.81,
                "change_pct": -4.08,
                "format": "index"
            },
            {
                "symbol": "MOVE",
                "name": "ICE BofA Bond Volatility Index",
                "category": "VOLATILITY",
                "price": 80.6,
                "change_pct": 5.80,
                "format": "index"
            },
            # 6. CRYPTO
            {
                "symbol": "BTC",
                "name": "Bitcoin ($)",
                "category": "CRYPTO",
                "price": 81359,
                "change_pct": 0.25,
                "format": "crypto_comma"
            },
            {
                "symbol": "ETH",
                "name": "Ethereum ($)",
                "category": "CRYPTO",
                "price": 2673,
                "change_pct": 1.07,
                "format": "crypto_comma"
            }
        ]

        # Overlay any freshly queried DB prices
        for item in base_assets:
            sym = item["symbol"]
            if sym in queried_prices:
                db_data = queried_prices[sym]
                item["price"] = db_data["price"]
                if db_data["change_pct"] is not None:
                    item["change_pct"] = db_data["change_pct"]

        return base_assets

    def get_sector_etf_performance(self) -> List[Dict[str, Any]]:
        """Calculates performance, RS Score, RS Rank, and RS Rank Changes for primary Sector ETFs."""
        etf_symbols = ['XLK', 'XLF', 'XLV', 'XLY', 'XLP', 'XLE', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC', 'SPY', 'QQQ']
        symbols_str = ', '.join(f"'{s}'" for s in etf_symbols)

        query = f"""
            WITH etf_bars AS (
                SELECT 
                    d.symbol,
                    d.date,
                    d.close,
                    d.rs_score,
                    d.rs_rank,
                    s.name,
                    s.sector,
                    s.industry,
                    ROW_NUMBER() OVER (PARTITION BY d.symbol ORDER BY d.date DESC) as rn_desc
                FROM daily_bars d
                JOIN symbols s ON d.symbol = s.symbol
                WHERE d.symbol IN ({symbols_str})
            ),
            latest_etfs AS (
                SELECT * FROM etf_bars WHERE rn_desc = 1
            ),
            bars_5d_ago AS (
                SELECT symbol, close as close_5d, rs_rank as rs_rank_5d FROM etf_bars WHERE rn_desc = 6
            ),
            bars_20d_ago AS (
                SELECT symbol, close as close_20d, rs_rank as rs_rank_20d FROM etf_bars WHERE rn_desc = 21
            ),
            bars_65d_ago AS (
                SELECT symbol, close as close_65d, rs_rank as rs_rank_65d FROM etf_bars WHERE rn_desc = 66
            )
            SELECT 
                l.symbol,
                l.name,
                l.sector,
                l.industry,
                l.close,
                l.rs_score,
                l.rs_rank,
                ROUND(((l.close - b5.close_5d) / NULLIF(b5.close_5d, 0)) * 100.0, 2) as ret_1w_pct,
                COALESCE((l.rs_rank - b5.rs_rank_5d), 0) as delta_rs_1w,
                ROUND(((l.close - b20.close_20d) / NULLIF(b20.close_20d, 0)) * 100.0, 2) as ret_1m_pct,
                COALESCE((l.rs_rank - b20.rs_rank_20d), 0) as delta_rs_1m,
                ROUND(((l.close - b65.close_65d) / NULLIF(b65.close_65d, 0)) * 100.0, 2) as ret_3m_pct,
                COALESCE((l.rs_rank - b65.rs_rank_65d), 0) as delta_rs_3m
            FROM latest_etfs l
            LEFT JOIN bars_5d_ago b5 ON l.symbol = b5.symbol
            LEFT JOIN bars_20d_ago b20 ON l.symbol = b20.symbol
            LEFT JOIN bars_65d_ago b65 ON l.symbol = b65.symbol
            ORDER BY delta_rs_1w DESC;
        """
        try:
            with self.get_read_only_conn() as conn:
                res = conn.execute(query).fetchall()
                cols = [c[0] for c in conn.description]

            etf_list = []
            for row in res:
                r_dict = dict(zip(cols, row))
                etf_list.append(r_dict)

            return etf_list
        except Exception as e:
            print(f"Error getting sector ETF performance: {e}")
            return []

    def get_sector_stocks(self, sector_name: str) -> List[Dict[str, Any]]:
        """Retrieves candidate stocks belonging to a specific sector or industry."""
        all_cands = self.get_candidates()
        if not sector_name or sector_name.upper() == 'ALL':
            return all_cands

        etf_matchers = {
            'XLK': ('Technology', None),
            'SMH': ('Technology', 'Semiconductors'),
            'IGV': ('Technology', 'Software'),
            'XLF': ('Finance', None),
            'KRE': ('Finance', 'Banks'),
            'XLV': ('Health Care', None),
            'XBI': ('Health Care', 'Biotechnology'),
            'XLY': ('Consumer Discretionary', None),
            'XRT': ('Consumer Discretionary', 'Retail'),
            'ITB': ('Consumer Discretionary', 'Building'),
            'XLE': ('Energy', None),
            'XOP': ('Energy', 'Oil'),
            'XLI': ('Industrials', None),
            'ITA': ('Industrials', 'Military'),
            'XLB': ('Basic Materials', None),
            'XLU': ('Utilities', None),
            'XLRE': ('Real Estate', None),
            'XLC': ('Telecommunications', None),
        }

        sec_upper = sector_name.strip().upper()
        target_sec, target_ind = etf_matchers.get(sec_upper, (sec_upper, None))

        filtered = []
        for c in all_cands:
            c_sec = (c.get("sector") or "").strip().upper()
            c_ind = (c.get("industry") or "").strip().upper()
            
            if target_ind:
                if target_ind.upper() in c_ind:
                    filtered.append(c)
            else:
                if target_sec in c_sec or c_sec in target_sec or target_sec in c_ind:
                    filtered.append(c)

        return filtered

    def get_watchlists(self) -> List[Dict[str, Any]]:
        with self.get_read_only_conn() as conn:
            tables = [t[0] for t in conn.execute("SHOW TABLES").fetchall()]
            if "watchlists" not in tables:
                return [{"id": 1, "name": "Default", "created_at": None, "item_count": 0}]

            query = """
                SELECT w.id, w.name, w.created_at, COUNT(wi.symbol) as item_count
                FROM watchlists w
                LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
                GROUP BY w.id, w.name, w.created_at
                ORDER BY w.id ASC
            """
            rows = conn.execute(query).fetchall()
            return [
                {
                    "id": row[0],
                    "name": row[1],
                    "created_at": str(row[2]) if row[2] else None,
                    "item_count": row[3]
                }
                for row in rows
            ]

    def create_watchlist(self, name: str) -> Dict[str, Any]:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("""
                CREATE SEQUENCE IF NOT EXISTS seq_watchlist_id START 1;
                CREATE TABLE IF NOT EXISTS watchlists (
                    id INTEGER PRIMARY KEY DEFAULT nextval('seq_watchlist_id'),
                    name VARCHAR NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.execute("INSERT INTO watchlists (name) VALUES (?)", [name])
            row = conn.execute("SELECT id, name, created_at FROM watchlists WHERE name = ?", [name]).fetchone()
            return {"id": row[0], "name": row[1], "created_at": str(row[2]), "item_count": 0}

    def delete_watchlist(self, watchlist_id: int) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ?", [watchlist_id])
            conn.execute("DELETE FROM watchlists WHERE id = ?", [watchlist_id])
            return True

    def get_watchlist_items(self, watchlist_id: int) -> List[Dict[str, Any]]:
        with self.get_read_only_conn() as conn:
            tables = [t[0] for t in conn.execute("SHOW TABLES").fetchall()]
            if "watchlist_items" not in tables:
                return []

            query = """
                WITH target_symbols AS (
                    SELECT symbol, added_at FROM watchlist_items WHERE watchlist_id = ?
                ),
                ranked_bars AS (
                    SELECT 
                        db.*,
                        ROW_NUMBER() OVER (PARTITION BY db.symbol ORDER BY db.date DESC) as rn
                    FROM daily_bars db
                    JOIN target_symbols ts ON db.symbol = ts.symbol
                ),
                latest_bars AS (
                    SELECT * FROM ranked_bars WHERE rn = 1
                ),
                prev_bars AS (
                    SELECT symbol, close as prev_close FROM ranked_bars WHERE rn = 2
                )
                SELECT 
                    s.symbol,
                    s.name,
                    s.exchange,
                    s.sector,
                    s.industry,
                    lb.close,
                    lb.rs_rank,
                    lb.vol_50d_ma,
                    lb.volume,
                    ts.added_at,
                    COALESCE(lb.dollar_vol_50d_ma, lb.close * lb.vol_50d_ma) as dollar_vol_50d_ma,
                    s.active,
                    lb.date as last_trade_date,
                    ROUND((lb.close - pb.prev_close) / NULLIF(pb.prev_close, 0) * 100.0, 2) as chg_pct,
                    ROUND(lb.volume / NULLIF(lb.vol_50d_ma, 0) * 100.0, 0) as rvol_pct,
                    lb.adr_20d,
                    lb.dist_from_52w_high,
                    lb.high_52w,
                    lb.low_52w,
                    lb.ema_10,
                    lb.ema_20,
                    lb.ema_50,
                    lb.sma_200,
                    lb.vcp_is_setup,
                    lb.low_cheat_is_setup
                FROM target_symbols ts
                JOIN symbols s ON ts.symbol = s.symbol
                LEFT JOIN latest_bars lb ON s.symbol = lb.symbol
                LEFT JOIN prev_bars pb ON s.symbol = pb.symbol
                ORDER BY ts.added_at DESC
            """
            rows = conn.execute(query, [watchlist_id]).fetchall()
            return [
                {
                    "symbol": row[0],
                    "name": row[1],
                    "exchange": row[2],
                    "sector": row[3],
                    "industry": row[4],
                    "close": row[5],
                    "rs_rank": row[6],
                    "vol_50d_ma": row[7],
                    "volume": row[8],
                    "added_at": str(row[9]) if row[9] else None,
                    "dollar_vol_50d_ma": row[10],
                    "active": bool(row[11]) if len(row) > 11 and row[11] is not None else True,
                    "last_trade_date": str(row[12]) if len(row) > 12 and row[12] else None,
                    "chg_pct": row[13],
                    "rvol_pct": row[14],
                    "adr_20d": row[15],
                    "dist_from_52w_high": row[16],
                    "high_52w": row[17],
                    "low_52w": row[18],
                    "ema_10": row[19],
                    "ema_20": row[20],
                    "ema_50": row[21],
                    "sma_200": row[22],
                    "vcp_is_setup": row[23],
                    "low_cheat_is_setup": row[24]
                }
                for row in rows
            ]

    def get_industry_peers(self, symbol: str, limit: int = 6) -> Dict[str, Any]:
        """Retrieve peer stocks in the same industry ranked by RS."""
        symbol = symbol.strip().upper()
        with self.get_read_only_conn() as conn:
            meta = conn.execute(
                "SELECT industry, sector FROM symbols WHERE symbol = ?", [symbol]
            ).fetchone()
            if not meta or not meta[0]:
                return {"symbol": symbol, "industry": None, "sector": None, "peers": []}
            industry = meta[0]
            sector = meta[1]

            query = """
                WITH ranked_bars AS (
                    SELECT 
                        db.symbol, db.close, db.rs_rank, db.volume,
                        ROW_NUMBER() OVER (PARTITION BY db.symbol ORDER BY db.date DESC) as rn
                    FROM daily_bars db
                    JOIN symbols s ON db.symbol = s.symbol
                    WHERE s.industry = ? AND s.active = true AND db.close >= 1.0
                ),
                latest_bars AS (
                    SELECT * FROM ranked_bars WHERE rn = 1
                ),
                prev_bars AS (
                    SELECT symbol, close as prev_close FROM ranked_bars WHERE rn = 2
                )
                SELECT 
                    s.symbol,
                    s.name,
                    lb.close,
                    lb.rs_rank,
                    ROUND((lb.close - pb.prev_close) / NULLIF(pb.prev_close, 0) * 100.0, 2) as chg_pct
                FROM latest_bars lb
                JOIN symbols s ON lb.symbol = s.symbol
                LEFT JOIN prev_bars pb ON lb.symbol = pb.symbol
                ORDER BY lb.rs_rank DESC NULLS LAST, lb.close DESC
                LIMIT ?
            """
            rows = conn.execute(query, [industry, limit]).fetchall()
            peers = [
                {
                    "symbol": r[0],
                    "name": r[1],
                    "close": r[2],
                    "rs_rank": r[3],
                    "chg_pct": r[4]
                }
                for r in rows
            ]
            return {
                "symbol": symbol,
                "industry": industry,
                "sector": sector,
                "peers": peers
            }

    def add_watchlist_item(self, watchlist_id: int, symbol: str) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS watchlist_items (
                    watchlist_id INTEGER NOT NULL,
                    symbol VARCHAR NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (watchlist_id, symbol)
                );
            """)
            symbol_upper = symbol.strip().upper()
            conn.execute("INSERT OR IGNORE INTO watchlist_items (watchlist_id, symbol) VALUES (?, ?)", [watchlist_id, symbol_upper])
            return True

    def add_watchlist_items_batch(self, watchlist_id: int, symbols: List[str]) -> int:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS watchlist_items (
                    watchlist_id INTEGER NOT NULL,
                    symbol VARCHAR NOT NULL,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (watchlist_id, symbol)
                );
            """)
            cleaned = list(set(s.strip().upper() for s in symbols if s and s.strip()))
            if not cleaned:
                return 0
            rows = [(watchlist_id, s) for s in cleaned]
            conn.executemany("INSERT OR IGNORE INTO watchlist_items (watchlist_id, symbol) VALUES (?, ?)", rows)
            return len(cleaned)

    def remove_watchlist_item(self, watchlist_id: int, symbol: str) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            symbol_upper = symbol.strip().upper()
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?", [watchlist_id, symbol_upper])
            return True

    def remove_watchlist_items_batch(self, watchlist_id: int, symbols: List[str]) -> int:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            cleaned = list(set(s.strip().upper() for s in symbols if s and s.strip()))
            if not cleaned:
                return 0
            rows = [(watchlist_id, s) for s in cleaned]
            conn.executemany("DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?", rows)
            return len(cleaned)

    def clear_watchlist_items(self, watchlist_id: int) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ?", [watchlist_id])
            return True

db_service = DatabaseService(config_service)

