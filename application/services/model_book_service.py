import os
import duckdb
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from .config import config_service
from .setup_service import setup_service


class ModelBookService:
    def __init__(self, config_svc):
        self.config_service = config_svc

    def get_db_path(self) -> str:
        config = self.config_service.load_config_raw()
        return config.get("database", {}).get("db_path", "data.db")

    def get_read_only_conn(self):
        """Returns a thread-safe read-only connection to DuckDB."""
        import time
        db_path = self.get_db_path()
        max_retries = 6
        for attempt in range(max_retries):
            try:
                return duckdb.connect(db_path, read_only=True)
            except Exception as e:
                if "lock" in str(e).lower() and attempt < max_retries - 1:
                    time.sleep(0.5)
                else:
                    raise

    def scan_setups(
        self,
        setup_type: str = "power_play",
        target_gain_pct: float = 20.0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        forward_days: int = 20,
        max_drawdown_limit: Optional[float] = None,
        min_price: Optional[float] = None,
        min_volume_50d: Optional[int] = None,
        min_runup_pct: Optional[float] = None,
        max_base_depth: Optional[float] = None,
        episode_window_days: int = 15,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Scans historical daily bars for the chosen setup, measures forward returns up to forward_days,
        and isolates true winners.
        Filters automatically inherit baseline and setup-specific configurations from setups.yaml via setup_service.
        """
        # 0. Resolve setup configuration from setup_service
        setup_def = setup_service.get_setup_by_id(setup_type)
        configured_filters = dict(setup_def.get("filters", {}))

        effective_filters = dict(configured_filters)
        if filters and isinstance(filters, dict):
            effective_filters.update(filters)

        # Apply any explicit parameter overrides if passed
        if min_price is not None:
            effective_filters["min_price"] = min_price
        if min_volume_50d is not None:
            effective_filters["min_volume_sma_50"] = min_volume_50d
        if min_runup_pct is not None:
            if setup_type == "power_play":
                effective_filters["min_pp_runup"] = min_runup_pct
            elif setup_type == "breakout":
                effective_filters["min_breakout_runup"] = min_runup_pct
            elif setup_type == "episodic_pivot":
                effective_filters["min_ep_gap"] = min_runup_pct
        if max_base_depth is not None:
            if setup_type == "power_play":
                effective_filters["max_pp_drawdown"] = max_base_depth
            elif setup_type == "breakout":
                effective_filters["max_pivot_spread"] = max_base_depth
            elif setup_type == "ipo_base":
                effective_filters["max_ipo_depth"] = max_base_depth

        with self.get_read_only_conn() as conn:
            # 1. Resolve date bounds
            date_bounds = conn.execute("SELECT MIN(date), MAX(date) FROM daily_bars").fetchone()
            if not date_bounds or not date_bounds[0]:
                return {"summary": {}, "winners": [], "all_candidates": []}

            db_min_date, db_max_date = date_bounds[0], date_bounds[1]

            # Default to past 1 year up to latest date minus forward_days to allow full forward evaluation
            if not end_date:
                calc_end = db_max_date - timedelta(days=int(forward_days * 1.5))
                end_date_str = calc_end.strftime("%Y-%m-%d")
            else:
                end_date_str = str(end_date).strip()

            if not start_date:
                try:
                    end_dt = datetime.strptime(end_date_str, "%Y-%m-%d").date()
                    calc_start = end_dt - timedelta(days=365)
                    start_date_str = max(db_min_date, calc_start).strftime("%Y-%m-%d")
                except Exception:
                    start_date_str = "2025-01-01"
            else:
                start_date_str = str(start_date).strip()

            # 2. Build SQL based on setup type and exact setup filter criteria
            buffer_start_dt = datetime.strptime(start_date_str, "%Y-%m-%d").date() - timedelta(days=120)
            buffer_start_str = buffer_start_dt.strftime("%Y-%m-%d")

            query, params = self._build_scan_query(
                setup_type=setup_type,
                buffer_start_str=buffer_start_str,
                start_date_str=start_date_str,
                end_date_str=end_date_str,
                forward_days=forward_days,
                effective_filters=effective_filters
            )

            raw_rows = conn.execute(query, params).fetchall()

            # 3. Deduplicate episodes within episode_window_days for the same symbol
            raw_rows.sort(key=lambda r: (r[0], r[1]))  # symbol, date
            deduped_candidates = []
            last_seen = {}

            for r in raw_rows:
                sym = r[0]
                dt = r[1]
                if sym in last_seen:
                    if (dt - last_seen[sym]).days <= episode_window_days:
                        continue
                last_seen[sym] = dt
                deduped_candidates.append(r)

            if not deduped_candidates:
                return {
                    "summary": {
                        "setup_type": setup_type,
                        "target_gain_pct": target_gain_pct,
                        "forward_days": forward_days,
                        "date_range": {"start": start_date_str, "end": end_date_str},
                        "total_setups": 0,
                        "total_winners": 0,
                        "win_rate_pct": 0.0,
                        "avg_winner_gain_pct": 0.0,
                        "median_days_to_target": 0,
                        "avg_drawdown_pct": 0.0,
                        "filters": effective_filters
                    },
                    "winners": [],
                    "all_candidates": []
                }

            # 4. Resolve exact days_to_target and check max_drawdown_limit
            processed = self._evaluate_forward_paths(
                conn=conn,
                candidates=deduped_candidates,
                target_gain_pct=target_gain_pct,
                forward_days=forward_days,
                max_drawdown_limit=max_drawdown_limit
            )

            # Separate winners vs non-winners
            winners = [c for c in processed if c["hit_target"]]
            if max_drawdown_limit is not None:
                winners = [w for w in winners if not w["stopped_out_before_target"]]

            # Sort winners and all candidates by trigger date ASC
            winners.sort(key=lambda x: (x["date"], x["symbol"]))
            processed.sort(key=lambda x: (x["date"], x["symbol"]))

            # 5. Compute summary statistics
            total_setups = len(processed)
            total_winners = len(winners)
            win_rate_pct = round((total_winners / total_setups * 100.0), 1) if total_setups > 0 else 0.0
            
            avg_winner_gain = round(sum(w["peak_gain_pct"] for w in winners) / total_winners, 1) if total_winners > 0 else 0.0
            avg_drawdown = round(sum(c["max_drawdown_pct"] for c in processed) / total_setups, 1) if total_setups > 0 else 0.0

            days_list = [w["days_to_target"] for w in winners if w["days_to_target"] is not None]
            median_days = 0
            if days_list:
                days_list.sort()
                mid = len(days_list) // 2
                median_days = days_list[mid] if len(days_list) % 2 != 0 else round((days_list[mid - 1] + days_list[mid]) / 2, 1)

            best_performer = None
            if winners:
                best_w = max(winners, key=lambda x: x["peak_gain_pct"])
                best_performer = {
                    "symbol": best_w["symbol"],
                    "gain_pct": best_w["peak_gain_pct"],
                    "date": best_w["date"],
                    "sector": best_w.get("sector")
                }

            avg_winner_runup = round(sum(w["prior_runup_pct"] for w in winners) / total_winners, 1) if total_winners > 0 else 0.0
            avg_winner_base_depth = round(sum(w["base_depth_pct"] for w in winners) / total_winners, 1) if total_winners > 0 else 0.0
            avg_winner_rs = round(sum(w["rs_score"] for w in winners if w.get("rs_score")) / max(1, len([w for w in winners if w.get("rs_score")])), 1) if total_winners > 0 else 0.0

            summary = {
                "setup_type": setup_type,
                "target_gain_pct": target_gain_pct,
                "forward_days": forward_days,
                "date_range": {"start": start_date_str, "end": end_date_str},
                "total_setups": total_setups,
                "total_winners": total_winners,
                "win_rate_pct": win_rate_pct,
                "avg_winner_gain_pct": avg_winner_gain,
                "median_days_to_target": median_days,
                "avg_drawdown_pct": avg_drawdown,
                "best_performer": best_performer,
                "avg_winner_runup_pct": avg_winner_runup,
                "avg_winner_base_depth": avg_winner_base_depth,
                "avg_winner_rs_score": avg_winner_rs,
                "filters": effective_filters
            }

            return {
                "summary": summary,
                "winners": winners,
                "all_candidates": processed
            }

    def _build_scan_query(
        self,
        setup_type: str,
        buffer_start_str: str,
        start_date_str: str,
        end_date_str: str,
        forward_days: int,
        effective_filters: Dict[str, Any]
    ) -> tuple[str, list]:
        """Constructs high-performance DuckDB query tailored to each setup using exact setup filter criteria."""

        # 1. Universal baseline filters from base_setup (or overridden by setup / user)
        min_price = float(effective_filters.get("min_price", 5.0))
        min_volume_50d = float(effective_filters.get("min_volume_sma_50", 100000))
        min_dollar_vol = float(effective_filters.get("min_dollar_vol", 10000000.0))
        enforce_stage2 = bool(effective_filters.get("enforce_stage2", False))
        enable_rs = bool(effective_filters.get("enable_rs", False))
        min_rs = float(effective_filters.get("min_rs_percentile", 70.0))

        stage2_sql = ""
        if enforce_stage2:
            stage2_sql = """
                  AND sma_50 IS NOT NULL AND sma_150 IS NOT NULL AND sma_200 IS NOT NULL
                  AND close > sma_50 AND sma_50 > sma_150 AND sma_150 > sma_200
                  AND (dist_from_52w_high IS NULL OR dist_from_52w_high <= 25.0)
                  AND (surge_off_low_pct IS NULL OR surge_off_low_pct >= 30.0)
            """

        rs_sql = ""
        rs_params = []
        if enable_rs:
            rs_sql = "AND rs_score IS NOT NULL AND rs_score >= ?"
            rs_params = [min_rs]

        base_params = [buffer_start_str, start_date_str, end_date_str, min_price, min_volume_50d, min_dollar_vol] + rs_params

        # 2. Setup-specific queries
        if setup_type == "power_play":
            runup_thresh = float(effective_filters.get("min_pp_runup", 100.0))
            depth_thresh = float(effective_filters.get("max_pp_drawdown", 25.0))

            query = f"""
            WITH price_window AS (
                SELECT 
                    d.symbol,
                    d.date,
                    d.open,
                    d.high,
                    d.low,
                    d.close,
                    d.volume,
                    d.vol_50d_ma,
                    d.dollar_vol_50d_ma,
                    d.rs_score,
                    d.sma_50,
                    d.sma_150,
                    d.sma_200,
                    d.dist_from_52w_high,
                    d.surge_off_low_pct,
                    s.name,
                    s.sector,
                    s.industry,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 40 PRECEDING AND 1 PRECEDING) as min_low_40d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 30 PRECEDING AND 1 PRECEDING) as max_high_30d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 15 PRECEDING AND 1 PRECEDING) as min_low_15d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_max_high,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_min_low,
                    LEAD(d.close, {forward_days}) OVER (PARTITION BY d.symbol ORDER BY d.date) as fwd_close_end
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
            ),
            candidates AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    name,
                    sector,
                    industry,
                    vol_50d_ma,
                    dollar_vol_50d_ma,
                    rs_score,
                    sma_50,
                    sma_150,
                    sma_200,
                    dist_from_52w_high,
                    surge_off_low_pct,
                    max_high_30d,
                    (max_high_30d - min_low_40d) / NULLIF(min_low_40d, 0) * 100 as runup_pct,
                    (max_high_30d - min_low_15d) / NULLIF(max_high_30d, 0) * 100 as drawdown_pct,
                    (fwd_max_high - close) / NULLIF(close, 0) * 100 as fwd_mfe_pct,
                    (fwd_min_low - close) / NULLIF(close, 0) * 100 as fwd_mae_pct,
                    (fwd_close_end - close) / NULLIF(close, 0) * 100 as fwd_end_return_pct,
                    fwd_max_high
                FROM price_window
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND COALESCE(dollar_vol_50d_ma, close * vol_50d_ma) >= ?
                  {stage2_sql}
                  {rs_sql}
                  AND (symbol NOT LIKE '%ETF%' AND symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'))
            )
            SELECT 
                symbol, 
                date, 
                close as entry_price, 
                name, 
                sector, 
                industry,
                runup_pct, 
                drawdown_pct as base_depth_pct,
                fwd_mfe_pct, 
                fwd_mae_pct, 
                fwd_end_return_pct,
                rs_score,
                fwd_max_high,
                max_high_30d as pivot_price
            FROM candidates
            WHERE runup_pct >= {runup_thresh} 
              AND drawdown_pct <= {depth_thresh} 
              AND close > max_high_30d
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        elif setup_type == "breakout":
            runup_thresh = float(effective_filters.get("min_breakout_runup", 30.0))
            depth_thresh = float(effective_filters.get("max_pivot_spread", 25.0))
            min_adr = float(effective_filters.get("min_adr_20d", 4.0)) if effective_filters.get("enable_adr", True) else None

            adr_sql = f"AND adr_20d >= {min_adr}" if min_adr is not None else ""

            query = f"""
            WITH price_window AS (
                SELECT 
                    d.symbol,
                    d.date,
                    d.open,
                    d.high,
                    d.low,
                    d.close,
                    d.volume,
                    d.vol_50d_ma,
                    d.dollar_vol_50d_ma,
                    d.adr_20d,
                    d.rs_score,
                    d.sma_50,
                    d.sma_150,
                    d.sma_200,
                    d.dist_from_52w_high,
                    d.surge_off_low_pct,
                    s.name,
                    s.sector,
                    s.industry,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 45 PRECEDING AND 1 PRECEDING) as min_low_45d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as max_high_20d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 15 PRECEDING AND 1 PRECEDING) as min_low_15d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_max_high,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_min_low,
                    LEAD(d.close, {forward_days}) OVER (PARTITION BY d.symbol ORDER BY d.date) as fwd_close_end
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
            ),
            candidates AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    name,
                    sector,
                    industry,
                    vol_50d_ma,
                    dollar_vol_50d_ma,
                    adr_20d,
                    rs_score,
                    sma_50,
                    sma_150,
                    sma_200,
                    dist_from_52w_high,
                    surge_off_low_pct,
                    max_high_20d,
                    (max_high_20d - min_low_45d) / NULLIF(min_low_45d, 0) * 100 as runup_pct,
                    (max_high_20d - min_low_15d) / NULLIF(max_high_20d, 0) * 100 as drawdown_pct,
                    (fwd_max_high - close) / NULLIF(close, 0) * 100 as fwd_mfe_pct,
                    (fwd_min_low - close) / NULLIF(close, 0) * 100 as fwd_mae_pct,
                    (fwd_close_end - close) / NULLIF(close, 0) * 100 as fwd_end_return_pct,
                    fwd_max_high
                FROM price_window
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND COALESCE(dollar_vol_50d_ma, close * vol_50d_ma) >= ?
                  {adr_sql}
                  {stage2_sql}
                  {rs_sql}
                  AND (symbol NOT LIKE '%ETF%' AND symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'))
            )
            SELECT 
                symbol, 
                date, 
                close as entry_price, 
                name, 
                sector, 
                industry,
                runup_pct, 
                drawdown_pct as base_depth_pct,
                fwd_mfe_pct, 
                fwd_mae_pct, 
                fwd_end_return_pct,
                rs_score,
                fwd_max_high,
                max_high_20d as pivot_price
            FROM candidates
            WHERE runup_pct >= {runup_thresh} 
              AND drawdown_pct <= {depth_thresh} 
              AND close > max_high_20d
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        elif setup_type == "episodic_pivot":
            min_gap = float(effective_filters.get("min_ep_gap", 10.0))
            min_rel_vol = float(effective_filters.get("min_ep_rel_vol", 2.5))

            query = f"""
            WITH price_window AS (
                SELECT 
                    d.symbol,
                    d.date,
                    d.open,
                    d.high,
                    d.low,
                    d.close,
                    d.volume,
                    d.vol_50d_ma,
                    d.dollar_vol_50d_ma,
                    d.rel_vol_50d,
                    d.gap_pct,
                    d.rs_score,
                    d.sma_50,
                    d.sma_150,
                    d.sma_200,
                    d.dist_from_52w_high,
                    d.surge_off_low_pct,
                    s.name,
                    s.sector,
                    s.industry,
                    LAG(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as prev_close,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_max_high,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_min_low,
                    LEAD(d.close, {forward_days}) OVER (PARTITION BY d.symbol ORDER BY d.date) as fwd_close_end
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
            ),
            candidates AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    name,
                    sector,
                    industry,
                    vol_50d_ma,
                    dollar_vol_50d_ma,
                    rs_score,
                    open,
                    prev_close,
                    COALESCE(gap_pct, (open - prev_close) / NULLIF(prev_close, 0) * 100) as calc_gap_pct,
                    COALESCE(rel_vol_50d, volume / NULLIF(vol_50d_ma, 0)) as calc_rel_vol,
                    (fwd_max_high - close) / NULLIF(close, 0) * 100 as fwd_mfe_pct,
                    (fwd_min_low - close) / NULLIF(close, 0) * 100 as fwd_mae_pct,
                    (fwd_close_end - close) / NULLIF(close, 0) * 100 as fwd_end_return_pct,
                    fwd_max_high
                FROM price_window
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND COALESCE(dollar_vol_50d_ma, close * vol_50d_ma) >= ?
                  {stage2_sql}
                  {rs_sql}
                  AND (symbol NOT LIKE '%ETF%' AND symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'))
            )
            SELECT 
                symbol, 
                date, 
                close as entry_price, 
                name, 
                sector, 
                industry,
                calc_gap_pct as runup_pct, 
                0.0 as base_depth_pct,
                fwd_mfe_pct, 
                fwd_mae_pct, 
                fwd_end_return_pct,
                rs_score,
                fwd_max_high,
                open as pivot_price
            FROM candidates
            WHERE calc_gap_pct >= {min_gap} 
              AND calc_rel_vol >= {min_rel_vol}
              AND close >= open
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        elif setup_type == "ipo_base":
            max_ipo_age = int(effective_filters.get("max_ipo_age", 350))
            max_ipo_dist = float(effective_filters.get("max_ipo_dist", 25.0))
            max_ipo_depth = float(effective_filters.get("max_ipo_depth", 35.0))

            query = f"""
            WITH price_window AS (
                SELECT 
                    d.symbol,
                    d.date,
                    d.open,
                    d.high,
                    d.low,
                    d.close,
                    d.volume,
                    d.vol_50d_ma,
                    d.dollar_vol_50d_ma,
                    d.rs_score,
                    d.sma_50,
                    d.sma_150,
                    d.sma_200,
                    d.dist_from_52w_high,
                    d.surge_off_low_pct,
                    d.ipo_days_count,
                    s.name,
                    s.sector,
                    s.industry,
                    ROW_NUMBER() OVER (PARTITION BY d.symbol ORDER BY d.date) as ipo_days_calc,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) as all_time_high_prior,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as base_high_20d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as base_low_20d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_max_high,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_min_low,
                    LEAD(d.close, {forward_days}) OVER (PARTITION BY d.symbol ORDER BY d.date) as fwd_close_end
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
            ),
            candidates AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    name,
                    sector,
                    industry,
                    vol_50d_ma,
                    dollar_vol_50d_ma,
                    rs_score,
                    base_high_20d,
                    COALESCE(ipo_days_count, ipo_days_calc) as ipo_age,
                    (all_time_high_prior - close) / NULLIF(all_time_high_prior, 0) * 100 as ipo_drawdown,
                    (base_high_20d - base_low_20d) / NULLIF(base_high_20d, 0) * 100 as ipo_depth,
                    (all_time_high_prior - base_low_20d) / NULLIF(base_low_20d, 0) * 100 as runup_pct,
                    (fwd_max_high - close) / NULLIF(close, 0) * 100 as fwd_mfe_pct,
                    (fwd_min_low - close) / NULLIF(close, 0) * 100 as fwd_mae_pct,
                    (fwd_close_end - close) / NULLIF(close, 0) * 100 as fwd_end_return_pct,
                    fwd_max_high
                FROM price_window
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND COALESCE(dollar_vol_50d_ma, close * vol_50d_ma) >= ?
                  {stage2_sql}
                  {rs_sql}
                  AND (symbol NOT LIKE '%ETF%' AND symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'))
            )
            SELECT 
                symbol, 
                date, 
                close as entry_price, 
                name, 
                sector, 
                industry,
                runup_pct, 
                ipo_depth as base_depth_pct,
                fwd_mfe_pct, 
                fwd_mae_pct, 
                fwd_end_return_pct,
                rs_score,
                fwd_max_high,
                base_high_20d as pivot_price
            FROM candidates
            WHERE ipo_age >= 10 AND ipo_age <= {max_ipo_age}
              AND ipo_drawdown <= {max_ipo_dist}
              AND ipo_depth <= {max_ipo_depth}
              AND close > base_high_20d
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        elif setup_type == "vcp":
            dist_52w = float(effective_filters.get("dist_from_52w_high", 20.0))
            max_contraction = float(effective_filters.get("max_pivot_spread", 12.0))

            query = f"""
            WITH price_window AS (
                SELECT 
                    d.symbol,
                    d.date,
                    d.open,
                    d.high,
                    d.low,
                    d.close,
                    d.volume,
                    d.vol_50d_ma,
                    d.dollar_vol_50d_ma,
                    d.rs_score,
                    d.sma_50,
                    d.sma_150,
                    d.sma_200,
                    d.dist_from_52w_high,
                    d.surge_off_low_pct,
                    s.name,
                    s.sector,
                    s.industry,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 252 PRECEDING AND 1 PRECEDING) as high_52w,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 10 PRECEDING AND 1 PRECEDING) as high_10d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 10 PRECEDING AND 1 PRECEDING) as low_10d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 30 PRECEDING AND 1 PRECEDING) as high_30d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 30 PRECEDING AND 1 PRECEDING) as low_30d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_max_high,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_min_low,
                    LEAD(d.close, {forward_days}) OVER (PARTITION BY d.symbol ORDER BY d.date) as fwd_close_end
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
            ),
            candidates AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    name,
                    sector,
                    industry,
                    vol_50d_ma,
                    dollar_vol_50d_ma,
                    rs_score,
                    sma_50,
                    sma_150,
                    sma_200,
                    dist_from_52w_high,
                    surge_off_low_pct,
                    high_52w,
                    high_10d,
                    COALESCE(dist_from_52w_high, (high_52w - close) / NULLIF(high_52w, 0) * 100) as calc_dist_52w_high,
                    (high_10d - low_10d) / NULLIF(high_10d, 0) * 100 as contraction_tight_pct,
                    (high_30d - low_30d) / NULLIF(high_30d, 0) * 100 as contraction_wide_pct,
                    (fwd_max_high - close) / NULLIF(close, 0) * 100 as fwd_mfe_pct,
                    (fwd_min_low - close) / NULLIF(close, 0) * 100 as fwd_mae_pct,
                    (fwd_close_end - close) / NULLIF(close, 0) * 100 as fwd_end_return_pct,
                    fwd_max_high
                FROM price_window
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND COALESCE(dollar_vol_50d_ma, close * vol_50d_ma) >= ?
                  {stage2_sql}
                  {rs_sql}
                  AND (symbol NOT LIKE '%ETF%' AND symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'))
            )
            SELECT 
                symbol, 
                date, 
                close as entry_price, 
                name, 
                sector, 
                industry,
                contraction_wide_pct as runup_pct, 
                contraction_tight_pct as base_depth_pct,
                fwd_mfe_pct, 
                fwd_mae_pct, 
                fwd_end_return_pct,
                rs_score,
                fwd_max_high,
                high_10d as pivot_price
            FROM candidates
            WHERE calc_dist_52w_high <= {dist_52w} 
              AND contraction_tight_pct <= {max_contraction}
              AND close > high_10d
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        else:
            # General / momentum breakout fallback
            runup_thresh = float(effective_filters.get("min_breakout_runup", 25.0))
            depth_thresh = float(effective_filters.get("max_pivot_spread", 25.0))

            query = f"""
            WITH price_window AS (
                SELECT 
                    d.symbol,
                    d.date,
                    d.open,
                    d.high,
                    d.low,
                    d.close,
                    d.volume,
                    d.vol_50d_ma,
                    d.dollar_vol_50d_ma,
                    d.rs_score,
                    d.sma_50,
                    d.sma_150,
                    d.sma_200,
                    d.dist_from_52w_high,
                    d.surge_off_low_pct,
                    s.name,
                    s.sector,
                    s.industry,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 45 PRECEDING AND 1 PRECEDING) as min_low_45d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as max_high_20d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 15 PRECEDING AND 1 PRECEDING) as min_low_15d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_max_high,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 1 FOLLOWING AND {forward_days} FOLLOWING) as fwd_min_low,
                    LEAD(d.close, {forward_days}) OVER (PARTITION BY d.symbol ORDER BY d.date) as fwd_close_end
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
            ),
            candidates AS (
                SELECT 
                    symbol,
                    date,
                    close,
                    name,
                    sector,
                    industry,
                    vol_50d_ma,
                    dollar_vol_50d_ma,
                    rs_score,
                    sma_50,
                    sma_150,
                    sma_200,
                    dist_from_52w_high,
                    surge_off_low_pct,
                    max_high_20d,
                    (max_high_20d - min_low_45d) / NULLIF(min_low_45d, 0) * 100 as runup_pct,
                    (max_high_20d - min_low_15d) / NULLIF(max_high_20d, 0) * 100 as drawdown_pct,
                    (fwd_max_high - close) / NULLIF(close, 0) * 100 as fwd_mfe_pct,
                    (fwd_min_low - close) / NULLIF(close, 0) * 100 as fwd_mae_pct,
                    (fwd_close_end - close) / NULLIF(close, 0) * 100 as fwd_end_return_pct,
                    fwd_max_high
                FROM price_window
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND COALESCE(dollar_vol_50d_ma, close * vol_50d_ma) >= ?
                  {stage2_sql}
                  {rs_sql}
                  AND (symbol NOT LIKE '%ETF%' AND symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC'))
            )
            SELECT 
                symbol, 
                date, 
                close as entry_price, 
                name, 
                sector, 
                industry,
                runup_pct, 
                drawdown_pct as base_depth_pct,
                fwd_mfe_pct, 
                fwd_mae_pct, 
                fwd_end_return_pct,
                rs_score,
                fwd_max_high,
                max_high_20d as pivot_price
            FROM candidates
            WHERE runup_pct >= {runup_thresh} 
              AND drawdown_pct <= {depth_thresh} 
              AND close > max_high_20d
            ORDER BY symbol, date ASC;
            """
            return query, base_params

    def _evaluate_forward_paths(
        self,
        conn,
        candidates: List[tuple],
        target_gain_pct: float,
        forward_days: int,
        max_drawdown_limit: Optional[float]
    ) -> List[Dict[str, Any]]:
        """
        Fetches day-by-day forward price paths for the candidates to accurately calculate
        the exact days_to_target and whether a stop loss was hit before reaching the target.
        """
        if not candidates:
            return []

        cand_dict = {}
        for r in candidates:
            sym, dt = r[0], r[1]
            dt_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)
            cand_dict[(sym, dt_str)] = {
                "symbol": sym,
                "date": dt_str,
                "screen_date": dt_str,
                "entry_price": round(float(r[2]), 2) if r[2] is not None else 0.0,
                "name": r[3] or sym,
                "sector": r[4] or "Unknown",
                "industry": r[5] or "Unknown",
                "prior_runup_pct": round(float(r[6]), 1) if r[6] is not None else 0.0,
                "base_depth_pct": round(float(r[7]), 1) if r[7] is not None else 0.0,
                "peak_gain_pct": round(float(r[8]), 1) if r[8] is not None else 0.0,
                "max_drawdown_pct": round(float(r[9]), 1) if r[9] is not None else 0.0,
                "end_return_pct": round(float(r[10]), 1) if r[10] is not None else 0.0,
                "rs_score": round(float(r[11]), 1) if r[11] is not None else None,
                "peak_price": round(float(r[12]), 2) if r[12] is not None else None,
                "pivot_price": round(float(r[13]), 2) if r[13] is not None else None,
                "days_to_target": None,
                "hit_target": False,
                "stopped_out_before_target": False
            }

        symbols = list({c["symbol"] for c in cand_dict.values()})
        min_cand_date = min(c["date"] for c in cand_dict.values())
        max_cand_date = max(c["date"] for c in cand_dict.values())
        max_fwd_date = (datetime.strptime(max_cand_date, "%Y-%m-%d").date() + timedelta(days=int(forward_days * 2) + 15)).strftime("%Y-%m-%d")

        placeholders = ",".join(["?"] * len(symbols))
        forward_bars_query = f"""
            SELECT symbol, date, open, high, low, close 
            FROM daily_bars 
            WHERE symbol IN ({placeholders}) 
              AND date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
            ORDER BY symbol, date ASC
        """
        fwd_rows = conn.execute(forward_bars_query, symbols + [min_cand_date, max_fwd_date]).fetchall()

        from collections import defaultdict
        sym_bars = defaultdict(list)
        for row in fwd_rows:
            sym, b_date, b_open, b_high, b_low, b_close = row
            b_dt_str = b_date.strftime("%Y-%m-%d") if hasattr(b_date, "strftime") else str(b_date)
            sym_bars[sym].append((b_dt_str, b_open, b_high, b_low, b_close))

        stop_loss_pct = float(max_drawdown_limit) if max_drawdown_limit is not None else None

        for (sym, dt_str), cand in cand_dict.items():
            entry_price = cand["entry_price"]
            if entry_price <= 0:
                continue

            all_bars = sym_bars.get(sym, [])
            entry_idx = -1
            for i, bar in enumerate(all_bars):
                if bar[0] == dt_str:
                    entry_idx = i
                    break

            if entry_idx == -1:
                cand["hit_target"] = cand["peak_gain_pct"] >= target_gain_pct
                continue

            fwd_bars = all_bars[entry_idx + 1 : entry_idx + 1 + forward_days]
            hit_day = None
            stopped_out = False

            for day_idx, (_, _, b_high, b_low, _) in enumerate(fwd_bars, start=1):
                gain_on_day = ((b_high - entry_price) / entry_price) * 100.0
                dd_on_day = ((b_low - entry_price) / entry_price) * 100.0

                if stop_loss_pct is not None and hit_day is None:
                    if dd_on_day <= stop_loss_pct:
                        stopped_out = True

                if gain_on_day >= target_gain_pct and hit_day is None:
                    hit_day = day_idx

            cand["days_to_target"] = hit_day
            cand["hit_target"] = (hit_day is not None) or (cand["peak_gain_pct"] >= target_gain_pct)
            cand["stopped_out_before_target"] = stopped_out

        return list(cand_dict.values())


model_book_service = ModelBookService(config_service)

