import os
import duckdb
import pandas as pd
from typing import Dict, Any, List, Optional
from collections import defaultdict
from .config import config_service


class DatabaseService:
    def __init__(self, config_service):
        self.config_service = config_service

    def get_available_trading_dates(self) -> List[str]:
        with self.get_read_only_conn() as conn:
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            if "daily_bars" not in table_names:
                return []
            rows = conn.execute("""
                SELECT DISTINCT CAST(date AS VARCHAR) as dt 
                FROM daily_bars 
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

    def get_candidates(self, target_date: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
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

            # Build dynamic WHERE clauses based on filters
            where_clauses = [
                "db.date = (SELECT val FROM target_date_const)",
                "db.rs_score IS NOT NULL"
            ]
            params = [actual_date_str]

            f = filters or {}
            def get_f(snake_key, camel_key=None, default=None):
                if snake_key in f and f[snake_key] is not None:
                    return f[snake_key]
                if camel_key and camel_key in f and f[camel_key] is not None:
                    return f[camel_key]
                return default

            # Price & Volume filters
            min_price = get_f("min_price", "minPriceFilter")
            if min_price is not None:
                where_clauses.append("db.close >= ?")
                params.append(float(min_price))

            min_vol = get_f("min_volume_sma_50", "minVolFilter")
            if min_vol is not None:
                where_clauses.append("db.vol_50d_ma >= ?")
                params.append(float(min_vol))

            min_dollar_vol = get_f("min_dollar_volume_50d", "minDollarVolFilter", default=get_f("min_dollar_vol", "minDollarVol"))
            if min_dollar_vol is not None:
                where_clauses.append("COALESCE(db.dollar_vol_50d_ma, db.close * db.vol_50d_ma) >= ?")
                params.append(float(min_dollar_vol))

            # Stage 2 Trend Template (Combo Criteria)
            if get_f("enforce_stage2", "enforceStage2", False):
                where_clauses.append(
                    "db.sma_50 IS NOT NULL AND db.sma_150 IS NOT NULL AND db.sma_200 IS NOT NULL "
                    "AND db.close > db.sma_50 AND db.sma_50 > db.sma_150 AND db.sma_150 > db.sma_200 "
                    "AND (db.sma_200_20d_ago IS NULL OR db.sma_200 > db.sma_200_20d_ago) "
                    "AND (db.dist_from_52w_high IS NULL OR db.dist_from_52w_high <= 25.0) "
                    "AND (db.surge_off_low_pct IS NULL OR db.surge_off_low_pct >= 30.0)"
                )

            # Relative Strength Rank
            if get_f("enable_rs", "enableRs", False):
                min_rs = get_f("min_rs_percentile", "minRsFilter", 70)
                where_clauses.append("db.rs_rank >= ?")
                params.append(float(min_rs))

            # Stockbee Trend Intensity (TI65) Filter
            if get_f("enable_ti65", "enableTi65", False):
                min_ti65 = get_f("min_ti65", "minTi65Filter", 1.05)
                where_clauses.append("db.ti_65 IS NOT NULL AND db.ti_65 >= ?")
                params.append(float(min_ti65))

            # ADR% (Average Daily Range 20d) filter
            if get_f("enable_adr", "enableAdr", False):
                min_adr = get_f("min_adr_20d", "minAdrFilter", 4.0)
                where_clauses.append("db.adr_20d IS NOT NULL AND db.adr_20d >= ?")
                params.append(float(min_adr))

            # Pivot Tightness & Volume Dry-Up (VDU) Filter
            if get_f("enable_pivot_tightness", "enablePivotTightness", False):
                max_pivot_spread = get_f("max_pivot_spread", "maxPivotSpreadFilter", 8.0)
                max_pivot_clustering = get_f("max_pivot_clustering", "maxPivotClusteringFilter", 3.0)
                max_pivot_vol_ratio = get_f("max_pivot_vol_ratio", "maxPivotVolRatioFilter", 0.8)
                where_clauses.append("db.pivot_spread_pct IS NOT NULL AND db.pivot_spread_pct <= ?")
                params.append(float(max_pivot_spread))
                where_clauses.append("db.pivot_close_clustering_pct IS NOT NULL AND db.pivot_close_clustering_pct <= ?")
                params.append(float(max_pivot_clustering))
                where_clauses.append("(db.volume / NULLIF(db.vol_50d_ma, 0)) <= ?")
                params.append(float(max_pivot_vol_ratio))

            # RS Rank New High
            if get_f("enable_rs_new_high", "enableRsNewHigh", False):
                where_clauses.append("COALESCE(db.is_52w_high, false) = true")

            # Power Play Overlay
            if get_f("enable_power_play", "enablePowerPlay", False):
                if get_f("enable_pp_runup", "enablePpRunup", True):
                    min_pp_runup = get_f("min_pp_runup", "minPpRunupFilter", 100.0)
                    where_clauses.append("db.pp_runup_pct IS NOT NULL AND db.pp_runup_pct >= ?")
                    params.append(float(min_pp_runup))
                if get_f("enable_pp_drawdown", "enablePpDrawdown", True):
                    max_pp_drawdown = get_f("max_pp_drawdown", "maxPpDrawdownFilter", 25.0)
                    where_clauses.append("db.pp_drawdown_pct IS NOT NULL AND db.pp_drawdown_pct <= ?")
                    params.append(float(max_pp_drawdown))
                if get_f("enable_pp_days_since_peak", "enablePpDaysSincePeak", True):
                    min_pp_days = get_f("min_pp_days_since_peak", "minPpDaysSincePeakFilter", 10)
                    where_clauses.append("db.pp_days_since_peak IS NOT NULL AND db.pp_days_since_peak >= ?")
                    params.append(int(min_pp_days))
                if get_f("enable_pp_vol_ratio", "enablePpVolRatio", False):
                    max_vol_ratio = get_f("max_pp_vol_ratio", "maxPpVolRatioFilter", 0.5)
                    where_clauses.append("(db.volume / NULLIF(db.vol_50d_ma, 0)) <= ?")
                    params.append(float(max_vol_ratio))

            # IPO Base Overlay
            if get_f("enable_ipo_base", "enableIpoBase", False):
                if get_f("enable_ipo_age", "enableIpoAge", True):
                    max_ipo_age = get_f("max_ipo_age", "maxIpoAgeFilter", 350)
                    where_clauses.append("db.ipo_days_count IS NOT NULL AND db.ipo_days_count >= 10 AND db.ipo_days_count <= ?")
                    params.append(int(max_ipo_age))
                if get_f("enable_ipo_dist", "enableIpoDist", True):
                    max_ipo_dist = get_f("max_ipo_dist", "maxIpoDistFilter", 25.0)
                    where_clauses.append("db.ipo_drawdown_from_high IS NOT NULL AND db.ipo_drawdown_from_high <= ?")
                    params.append(float(max_ipo_dist))
                if get_f("enable_ipo_depth", "enableIpoDepth", True):
                    max_ipo_depth = get_f("max_ipo_depth", "maxIpoDepthFilter", 35.0)
                    where_clauses.append("db.ipo_base_depth IS NOT NULL AND db.ipo_base_depth <= ?")
                    params.append(float(max_ipo_depth))

            # Minervini VCP Setup Overlay
            if get_f("enable_vcp_setup", "enableVcpSetup", False):
                where_clauses.append("db.close IS NOT NULL AND db.sma_50 IS NOT NULL AND db.sma_150 IS NOT NULL AND db.sma_200 IS NOT NULL")
                where_clauses.append("db.close > db.sma_50 AND db.sma_50 > db.sma_150 AND db.sma_150 > db.sma_200")
                where_clauses.append("(db.dist_from_52w_high IS NULL OR db.dist_from_52w_high <= 15.0)")
                if get_f("enable_vcp_pattern", "enableVcpPattern", True):
                    where_clauses.append("db.vcp_is_setup = true")
                if get_f("enable_vcp_eps_growth", "enableVcpEpsGrowth", False):
                    min_eps_growth = get_f("min_eps_growth_qoq", "minEpsGrowthFilter", 20.0)
                    where_clauses.append("f.eps_qoq_growth IS NOT NULL AND f.eps_qoq_growth >= ?")
                    params.append(float(min_eps_growth))

            # New Leaders Overlay
            if get_f("enable_new_leaders", "enableNewLeaders", False):
                if get_f("enable_52w_dist", "enable52wDist", True):
                    max_52w_dist = get_f("max_52w_dist", "max52wDistFilter", 25.0)
                    where_clauses.append("db.dist_from_52w_high IS NOT NULL AND db.dist_from_52w_high <= ?")
                    params.append(float(max_52w_dist))
                if get_f("enable_surge_off_low", "enableSurgeOffLow", True):
                    min_surge = get_f("min_surge_off_low", "minSurgeOffLowFilter", 20.0)
                    where_clauses.append("db.surge_off_low_pct IS NOT NULL AND db.surge_off_low_pct >= ?")
                    params.append(float(min_surge))
                if get_f("enable_new_leaders_rs", "enableNewLeadersRs", True):
                    min_nl_rs = get_f("min_new_leaders_rs", "minNewLeadersRsFilter", 80)
                    where_clauses.append("db.rs_rank >= ?")
                    params.append(float(min_nl_rs))
                if get_f("enable_new_leaders_52w_high", "enableNewLeaders52wHigh", False):
                    where_clauses.append("(COALESCE(db.is_52w_high, false) = true OR (db.dist_from_52w_high IS NOT NULL AND db.dist_from_52w_high <= 3.0))")
                if get_f("enable_new_leaders_base", "enableNewLeadersBase", True):
                    where_clauses.append("(COALESCE(db.vcp_is_setup, false) = true OR COALESCE(db.is_52w_high, false) = true)")

            # Qullamaggie Breakout SQL pre-filters
            enable_breakout = get_f("enable_qullamaggie_breakout", "enableQullamaggieBreakout", False)
            enable_qm = get_f("enable_qullamaggie_momentum", "enableQullamaggieMomentum", False)
            if enable_breakout:
                if get_f("enable_1m_ret", "enable1mRet", True):
                    min_1m_ret = get_f("min_1m_ret", "min1mRetFilter", 20.0)
                    where_clauses.append("db.ret_1m IS NOT NULL AND db.ret_1m >= ?")
                    params.append(float(min_1m_ret))

            # Episodic Pivot Overlay
            if get_f("enable_episodic_pivot", "enableEpisodicPivot", False):
                if get_f("enable_ep_gap", "enableEpGap", True):
                    min_ep_gap = get_f("min_ep_gap", "minEpGapFilter", 10.0)
                    where_clauses.append("db.gap_pct IS NOT NULL AND db.gap_pct >= ?")
                    params.append(float(min_ep_gap))
                if get_f("enable_ep_rel_vol", "enableEpRelVol", True):
                    min_ep_rel_vol = get_f("min_ep_rel_vol", "minEpRelVolFilter", 2.5)
                    where_clauses.append("db.rel_vol_50d IS NOT NULL AND db.rel_vol_50d >= ?")
                    params.append(float(min_ep_rel_vol))

            # Parabolic Climax Overlay
            is_parabolic = (
                get_f("enable_parabolic_climax", "enableParabolicClimax", False) or
                get_f("enable_parabolic_short", "enableParabolicShort", False) or
                get_f("enable_parabolic_long", "enableParabolicLong", False)
            )
            if is_parabolic:
                min_runup = get_f("min_parabolic_runup", "minParabolicRunupFilter", 40.0)
                min_ema_dist = get_f("min_parabolic_ema_dist", "minParabolicEmaDistFilter", 18.0)
                min_up_days = get_f("min_parabolic_up_days", "minParabolicUpDaysFilter", 3)
                
                short_cond = f"(COALESCE(db.parabolic_short_is_setup, false) = true OR (db.parabolic_runup_pct >= {float(min_runup)} AND db.dist_ema10_pct >= {float(min_ema_dist)} AND db.parabolic_up_days >= {int(min_up_days)}))"
                long_cond = "(COALESCE(db.parabolic_long_is_setup, false) = true OR (db.dist_ema10_pct <= -18.0 AND db.parabolic_runup_pct <= -30.0))"
                where_clauses.append(f"({short_cond} OR {long_cond})")

            where_str = "\n                  AND ".join(where_clauses)

            query = f"""
                WITH target_date_const AS (
                    SELECT CAST(? AS DATE) as val
                ),
                latest_fundamentals AS (
                    SELECT 
                        symbol,
                        report_date,
                        fiscal_quarter,
                        eps_diluted,
                        eps_qoq_growth,
                        total_revenue,
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
                    s.next_earnings_date
                FROM daily_bars db
                LEFT JOIN latest_fundamentals f ON db.symbol = f.symbol AND f.rn = 1
                JOIN symbols s ON db.symbol = s.symbol
                WHERE {where_str}
                ORDER BY db.rs_rank DESC;
            """
            
            # Calculate point-in-time sector ranks from Sector ETFs
            sector_etf_map = {
                'XLK': 'Technology',
                'XLE': 'Energy',
                'XLV': 'Health Care',
                'XLI': 'Industrials',
                'XLB': 'Basic Materials',
                'XLF': 'Finance',
                'XLRE': 'Real Estate',
                'XLP': 'Consumer Staples',
                'XLY': 'Consumer Discretionary',
                'XLU': 'Utilities',
                'XLC': 'Telecommunications'
            }
            
            sector_ranks = {}
            try:
                etf_rows = conn.execute("""
                    WITH etf_bars AS (
                        SELECT d.symbol, d.rs_rank,
                                ROW_NUMBER() OVER (PARTITION BY d.symbol ORDER BY d.date DESC) as rn
                        FROM daily_bars d
                        WHERE d.symbol IN ('XLK', 'XLF', 'XLV', 'XLY', 'XLP', 'XLE', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC')
                          AND d.date <= CAST(? AS DATE)
                    )
                    SELECT symbol, rs_rank FROM etf_bars WHERE rn = 1 ORDER BY rs_rank DESC
                """, [actual_date_str]).fetchall()
                for rank_idx, (etf_sym, etf_rs) in enumerate(etf_rows, 1):
                    sec_name = sector_etf_map.get(etf_sym)
                    if sec_name:
                        sector_ranks[sec_name] = rank_idx
                        if sec_name == 'Finance':
                            sector_ranks['Financials'] = rank_idx
                        elif sec_name == 'Telecommunications':
                            sector_ranks['Communication Services'] = rank_idx
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
                    "screen_date": actual_date_str
                })

            if not candidates:
                return []

            # 3b. Dynamic Breakout setup evaluation in memory
            try:
                from application.engine.setups.breakout import detect_breakout

                cand_symbols = [c["symbol"] for c in candidates]
                symbols_str = ", ".join(f"'{s}'" for s in cand_symbols)
                history_rows = conn.execute(f"""
                    SELECT symbol, date, high, low, close 
                    FROM daily_bars 
                    WHERE symbol IN ({symbols_str}) AND date <= CAST(? AS DATE)
                    ORDER BY symbol, date ASC
                """, [actual_date_str]).fetchall()

                sym_history = defaultdict(list)
                for sym, dt, h, l, cl in history_rows:
                    sym_history[sym].append((h, l, cl, dt))

                enable_ema_surfing = get_f("enable_ema_surfing", "enableEmaSurfing", False)
                min_1m_ret = get_f("min_1m_ret", "min1mRetFilter", 20.0)

                for c in candidates:
                    symbol = c["symbol"]
                    bars = sym_history.get(symbol, [])
                    if len(bars) >= 20:
                        h_list = [b[0] for b in bars]
                        l_list = [b[1] for b in bars]
                        cl_list = [b[2] for b in bars]
                        dt_list = [b[3] for b in bars]
                        b_res = detect_breakout(
                            h_list, l_list, cl_list, dt_list,
                            ema_10_val=c.get("ema_10"),
                            ema_20_val=c.get("ema_20"),
                            min_1m_ret=float(min_1m_ret),
                            enable_ema_surfing=enable_ema_surfing
                        )
                        c["breakout_is_setup"] = b_res.get("breakout_is_setup", False)
                        c["breakout_runup_pct"] = b_res.get("breakout_runup_pct", 0.0)
                        c["breakout_consolidation_days"] = b_res.get("breakout_consolidation_days", 0)
                        c["ema_surfing"] = b_res.get("ema_surfing", False)

                        # If EMAs were not present in daily_bars, populate them from the calculated values
                        if c.get("ema_10") is None and b_res.get("ema_10") is not None:
                            c["ema_10"] = b_res["ema_10"]
                            if c.get("close") and b_res["ema_10"] > 0:
                                c["dist_ema10_pct"] = round(((c["close"] - b_res["ema_10"]) / b_res["ema_10"]) * 100.0, 2)
                        if c.get("ema_20") is None and b_res.get("ema_20") is not None:
                            c["ema_20"] = b_res["ema_20"]
                            if c.get("close") and b_res["ema_20"] > 0:
                                c["dist_ema20_pct"] = round(((c["close"] - b_res["ema_20"]) / b_res["ema_20"]) * 100.0, 2)
                    else:
                        c["breakout_is_setup"] = False
                        c["breakout_runup_pct"] = 0.0
                        c["breakout_consolidation_days"] = 0
                        c["ema_surfing"] = False
            except Exception as e:
                print(f"Error calculating breakout setups for candidates on {actual_date_str}: {e}")
                for c in candidates:
                    c.setdefault("breakout_is_setup", False)
                    c.setdefault("breakout_runup_pct", 0.0)
                    c.setdefault("breakout_consolidation_days", 0)

            if enable_breakout:
                candidates = [c for c in candidates if c.get("breakout_is_setup")]

            # 3c. Qullamaggie Momentum 3-Timeframe Deduplicated Screening
            if enable_qm:
                qm_top_n = int(get_f("qm_top_n", "qmTopN", 75))
                qm_subview = str(get_f("qm_subview", "qmSubview", "all")).lower()

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

                # Deduplicate and combine into unified focus list
                merged = {}
                all_syms = set(top_1m_map.keys()) | set(top_3m_map.keys()) | set(top_6m_map.keys())
                for sym in all_syms:
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
                    merged[sym] = c

                if qm_subview == '1m':
                    candidates = [merged[sym] for sym in top_1m_map.keys() if sym in merged]
                    candidates.sort(key=lambda x: x.get("ret_1m") or 0, reverse=True)
                elif qm_subview == '3m':
                    candidates = [merged[sym] for sym in top_3m_map.keys() if sym in merged]
                    candidates.sort(key=lambda x: x.get("ret_3m") or 0, reverse=True)
                elif qm_subview == '6m':
                    candidates = [merged[sym] for sym in top_6m_map.keys() if sym in merged]
                    candidates.sort(key=lambda x: x.get("ret_6m") or 0, reverse=True)
                else:
                    # 'all' Combined deduped: sorted by multi-timeframe overlap count desc, then max gain desc
                    candidates = list(merged.values())
                    candidates.sort(
                        key=lambda x: (
                            len(x.get("qm_timeframes", [])),
                            max(x.get("ret_1m") or 0, x.get("ret_3m") or 0, x.get("ret_6m") or 0)
                        ),
                        reverse=True
                    )
            else:
                for c in candidates:
                    ema_10 = c.get("ema_10")
                    ema_20 = c.get("ema_20")
                    sma_50 = c.get("sma_50")
                    close = c.get("close")
                    c["ma_aligned"] = bool(ema_10 and ema_20 and sma_50 and close and close > ema_10 and ema_10 > ema_20 and ema_20 > sma_50)

            # Optional dynamic sorting
            sort_by = get_f("sort_by", "sortBy", None)
            if sort_by:
                sort_order = str(get_f("sort_order", "sortOrder", "desc")).lower()
                is_reverse = sort_order != "asc"
                candidates.sort(key=lambda x: (x.get(sort_by) is not None, x.get(sort_by) or 0), reverse=is_reverse)

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
                
            meta_dict = {
                "symbol": meta[0],
                "exchange": meta[1],
                "name": meta[2],
                "asset_type": meta[3],
                "active": meta[4],
                "ipo_date": meta[5] if len(meta) > 5 else None,
                "sector": meta[6] if len(meta) > 6 else None,
                "industry": meta[7] if len(meta) > 7 else None,
                "next_earnings_date": meta[8] if len(meta) > 8 else None
            }
            
            # Fundamentals
            funds = conn.execute("""
                SELECT report_date, fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue
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
                    "total_revenue": row[4]
                })
                
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

            # Calculate Minervini VCP Footprint
            from application.engine.setups.vcp import detect_vcp
            bars_for_vcp = conn.execute("""
                SELECT date, high, low, close
                FROM daily_bars
                WHERE symbol = ?
                ORDER BY date ASC
            """, [symbol]).fetchall()

            vcp_footprint = None
            if bars_for_vcp and len(bars_for_vcp) >= 15:
                dates = [b[0] for b in bars_for_vcp]
                highs = [float(b[1]) for b in bars_for_vcp]
                lows = [float(b[2]) for b in bars_for_vcp]
                closes = [float(b[3]) for b in bars_for_vcp]
                vcp_footprint = detect_vcp(highs, lows, dates, closes=closes, window=3)
                 
            return {
                "metadata": meta_dict,
                "fundamentals": fund_list,
                "rs_score": rs_score,
                "rs_rank": rs_rank,
                "adr_20d": atr_20d,
                "atr_20d": atr_20d,
                "ti_65": ti_65,
                "dollar_vol_50d_ma": dollar_vol_50d_ma,
                "vol_50d_ma": vol_50d_ma,
                "vcp_footprint": vcp_footprint,
                "next_earnings_date": meta_dict.get("next_earnings_date")
            }


    def get_stock_prices(self, symbol: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        symbol = symbol.upper()
        with self.get_read_only_conn() as conn:
            bars = conn.execute("""
                SELECT date, open, high, low, close, volume, sma_50, sma_150, sma_200, rs_rank, ti_65
                FROM daily_bars
                WHERE symbol = ?
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
                    "ti_65": row[10]
                })
            return bars_list

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

    def get_market_monitor(self, limit: int = 252) -> Dict[str, Any]:
        """Calculates Stockbee Market Monitor metrics across recent trading days instead of full table scan."""
        lookback_needed = (limit if limit and limit > 0 else 252) + 120
        query = f"""
            WITH cutoff AS (
                SELECT MIN(date) as min_date FROM (
                    SELECT DISTINCT date FROM daily_bars ORDER BY date DESC LIMIT {lookback_needed}
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
        try:
            with self.get_read_only_conn() as conn:
                df = conn.execute(query).df()
                
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
            for _, row in df_desc.iterrows():
                daily_list.append({
                    "date": str(row['date_str']),
                    "gainers_4pct": int(row['gainers_4pct']),
                    "losers_4pct": int(row['losers_4pct']),
                    "net_4pct": int(row['net_4pct']),
                    "ratio_4pct": float(row['ratio_4pct']),
                    "ratio_5d": float(row['ratio_5d']),
                    "ratio_10d": float(row['ratio_10d']),
                    "up_25pct_1m": int(row['up_25pct_1m']),
                    "down_25pct_1m": int(row['down_25pct_1m']),
                    "up_25pct_3m": int(row['up_25pct_3m']),
                    "down_25pct_3m": int(row['down_25pct_3m']),
                    "up_50pct_1m": int(row['up_50pct_1m']),
                    "up_50pct_3m": int(row['up_50pct_3m']),
                    "down_50pct_3m": int(row['down_50pct_3m']),
                    "ema_13_up": float(row['ema_13_up']),
                    "ema_13_down": float(row['ema_13_down'])
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

            # Query latest benchmark prices for SPY and QQQ
            benchmarks = {
                "SPY": {"close": 0, "change_pct": 0},
                "QQQ": {"close": 0, "change_pct": 0}
            }
            try:
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
                with self.get_read_only_conn() as conn:
                    bm_rows = conn.execute(bm_query).fetchall()
                    for b_sym, b_close, b_prev in bm_rows:
                        pct = 0.0
                        if b_prev and b_prev > 0:
                            pct = round(((b_close - b_prev) / b_prev) * 100, 2)
                        benchmarks[b_sym] = {
                            "close": round(b_close, 2),
                            "change_pct": pct
                        }
            except Exception as bm_err:
                print(f"Error fetching benchmark info: {bm_err}")

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
                "benchmarks": benchmarks
            }

            return {"summary": summary, "daily_data": daily_list}
        except Exception as e:
            return {"error": str(e), "summary": {}, "daily_data": []}

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
                SELECT 
                    s.symbol,
                    s.name,
                    s.exchange,
                    s.sector,
                    b.close,
                    b.rs_rank,
                    b.vol_50d_ma,
                    b.volume,
                    wi.added_at
                FROM watchlist_items wi
                JOIN symbols s ON wi.symbol = s.symbol
                LEFT JOIN (
                    SELECT db.*
                    FROM daily_bars db
                    INNER JOIN (
                        SELECT symbol, MAX(date) as max_date
                        FROM daily_bars
                        GROUP BY symbol
                    ) latest ON db.symbol = latest.symbol AND db.date = latest.max_date
                ) b ON s.symbol = b.symbol
                WHERE wi.watchlist_id = ?
                ORDER BY wi.added_at DESC
            """
            rows = conn.execute(query, [watchlist_id]).fetchall()
            return [
                {
                    "symbol": row[0],
                    "name": row[1],
                    "exchange": row[2],
                    "sector": row[3],
                    "close": row[4],
                    "rs_rank": row[5],
                    "vol_50d_ma": row[6],
                    "volume": row[7],
                    "added_at": str(row[8]) if row[8] else None
                }
                for row in rows
            ]

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

    def remove_watchlist_item(self, watchlist_id: int, symbol: str) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            symbol_upper = symbol.strip().upper()
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?", [watchlist_id, symbol_upper])
            return True

    def clear_watchlist_items(self, watchlist_id: int) -> bool:
        db_path = self.get_db_path()
        with duckdb.connect(db_path) as conn:
            conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = ?", [watchlist_id])
            return True

db_service = DatabaseService(config_service)

