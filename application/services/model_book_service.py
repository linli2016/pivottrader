import os
import duckdb
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from collections import defaultdict
from .config import config_service
from .setup_service import setup_service
from application.engine.market_regime import get_qullamaggie_daily_lookup


def compute_ema_series(prices: List[float], span: int) -> List[float]:
    """Computes exponential moving average over a series of closing prices."""
    if not prices:
        return []
    k = 2.0 / (span + 1.0)
    ema = [prices[0]]
    for p in prices[1:]:
        ema.append(p * k + ema[-1] * (1.0 - k))
    return ema


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
        target_gain_pct: float = 16.0,
        stop_loss_pct: Optional[float] = 8.0,
        ema_exit_type: Optional[str] = "none",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        forward_days: int = 25,
        max_drawdown_limit: Optional[float] = None,
        min_price: Optional[float] = None,
        min_volume_50d: Optional[int] = None,
        min_runup_pct: Optional[float] = None,
        max_base_depth: Optional[float] = None,
        episode_window_days: int = 15,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        True backtesting engine for stock setups:
        1. Screens for setup bars matching the exact screen criteria from setups.yaml.
        2. Deduplicates consecutive setup days: only the first setup day in an episode is tested.
        3. Simulates next-day breakout entry: enters at max(open_{T+1}, high_T) if high_{T+1} > high_T.
        4. Evaluates forward multi-path trade exit:
           - Profit Target % hit
           - Stop Loss % hit
           - Trailing EMA exit (Close < EMA10 / EMA20)
           - Time Expiration (end of holding period)
        """
        # Backward compatibility for max_drawdown_limit
        if stop_loss_pct is None and max_drawdown_limit is not None:
            stop_loss_pct = float(max_drawdown_limit)

        # 0. Resolve setup configuration from setup_service
        setup_def = setup_service.get_setup_by_id(setup_type)
        configured_filters = dict(setup_def.get("filters", {}))

        effective_filters = dict(configured_filters)
        if filters and isinstance(filters, dict):
            effective_filters.update(filters)

        # Apply explicit parameter overrides if passed
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

            # 2. Build and execute SQL based on exact setup criteria
            buffer_start_dt = datetime.strptime(start_date_str, "%Y-%m-%d").date() - timedelta(days=120)
            buffer_start_str = buffer_start_dt.strftime("%Y-%m-%d")

            query, params = self._build_scan_query(
                setup_type=setup_type,
                buffer_start_str=buffer_start_str,
                start_date_str=start_date_str,
                end_date_str=end_date_str,
                effective_filters=effective_filters
            )

            raw_rows = conn.execute(query, params).fetchall()

            # 3. Group by symbol and find breakout entries with consecutive day deduplication
            sym_rows = defaultdict(list)
            for r in raw_rows:
                sym_rows[r[0]].append(r)

            # 3. Enter all setup bars where next_high > setup_high as independent candidate trades
            triggered_trades = []
            for sym, b_list in sym_rows.items():
                b_list.sort(key=lambda x: x[1])  # sort by date ASC

                for b in b_list:
                    setup_dt = b[1]
                    next_dt = b[15]
                    if not next_dt:
                        continue

                    setup_high = float(b[3])
                    next_open = float(b[16]) if b[16] is not None else float(b[5])
                    next_high = float(b[17]) if b[17] is not None else float(b[5])

                    # Next-day buy-stop condition: High_{T+1} > High_T
                    if next_high > setup_high:
                        entry_price = max(next_open, setup_high)
                        setup_dt_str = setup_dt.strftime("%Y-%m-%d") if hasattr(setup_dt, "strftime") else str(setup_dt)
                        entry_dt_str = next_dt.strftime("%Y-%m-%d") if hasattr(next_dt, "strftime") else str(next_dt)

                        triggered_trades.append({
                            "symbol": sym,
                            "setup_date": setup_dt_str,
                            "entry_date": entry_dt_str,
                            "date": setup_dt_str,
                            "screen_date": setup_dt_str,
                            "entry_price": round(float(entry_price), 2),
                            "setup_high": round(float(setup_high), 2),
                            "name": b[7] or sym,
                            "sector": b[8] or "Unknown",
                            "industry": b[9] or "Unknown",
                            "prior_runup_pct": round(float(b[10]), 1) if b[10] is not None else 0.0,
                            "base_depth_pct": round(float(b[11]), 1) if b[11] is not None else 0.0,
                            "rs_score": round(float(b[12]), 1) if b[12] is not None else None,
                            "adr_20d": round(float(b[13]), 2) if b[13] is not None else None,
                            "pivot_price": round(float(b[14]), 2) if b[14] is not None else round(float(setup_high), 2)
                        })

            if not triggered_trades:
                return {
                    "summary": {
                        "setup_type": setup_type,
                        "target_gain_pct": target_gain_pct,
                        "stop_loss_pct": stop_loss_pct,
                        "ema_exit_type": ema_exit_type,
                        "forward_days": forward_days,
                        "date_range": {"start": start_date_str, "end": end_date_str},
                        "total_setups": len(raw_rows),
                        "total_trades": 0,
                        "total_winners": 0,
                        "win_rate_pct": 0.0,
                        "stop_loss_rate_pct": 0.0,
                        "ema_exit_rate_pct": 0.0,
                        "time_expired_rate_pct": 0.0,
                        "avg_trade_return_pct": 0.0,
                        "avg_winner_gain_pct": 0.0,
                        "avg_loser_loss_pct": 0.0,
                        "profit_factor": 0.0,
                        "median_days_to_target": 0,
                        "avg_drawdown_pct": 0.0,
                        "regime_breakdown": {},
                        "filters": effective_filters
                    },
                    "winners": [],
                    "all_candidates": []
                }

            # 4. Multi-exit trade forward path simulation for all independent candidate trades
            simulated_trades = self._evaluate_forward_paths(
                conn=conn,
                trades=triggered_trades,
                target_gain_pct=target_gain_pct,
                stop_loss_pct=stop_loss_pct,
                ema_exit_type=ema_exit_type,
                forward_days=forward_days
            )

            # 5. Cluster-based episode deduplication:
            # - Group overlapping trades of the same stock into episode clusters
            # - If all fail -> count as 1 fail (pick the first setup attempt)
            # - If all succeed -> pick the first one
            # - If some fail and some succeed -> keep the non-overlapping successful ones
            sym_sim_trades = defaultdict(list)
            for t in simulated_trades:
                sym_sim_trades[t["symbol"]].append(t)

            processed = []
            for sym, t_list in sym_sim_trades.items():
                t_list.sort(key=lambda x: x["setup_date"])

                clusters = []
                current_cluster = []
                cluster_end_dt = None

                for t in t_list:
                    s_dt = datetime.strptime(t["setup_date"], "%Y-%m-%d").date() if isinstance(t["setup_date"], str) else t["setup_date"]
                    e_dt = datetime.strptime(t["exit_date"], "%Y-%m-%d").date() if isinstance(t["exit_date"], str) else t["exit_date"]

                    if not current_cluster:
                        current_cluster.append(t)
                        cluster_end_dt = e_dt
                    else:
                        if s_dt <= cluster_end_dt + timedelta(days=5):
                            current_cluster.append(t)
                            cluster_end_dt = max(cluster_end_dt, e_dt)
                        else:
                            clusters.append(current_cluster)
                            current_cluster = [t]
                            cluster_end_dt = e_dt

                if current_cluster:
                    clusters.append(current_cluster)

                for c in clusters:
                    successes = [t for t in c if t["hit_target"]]
                    fails = [t for t in c if not t["hit_target"]]

                    if not successes:
                        # All failed -> count as one fail (pick first)
                        processed.append(fails[0])
                    else:
                        # Keep non-overlapping successes (always includes first success)
                        active_end = None
                        for s in successes:
                            s_entry = s["entry_date"]
                            s_exit = s["exit_date"]
                            if not active_end or s_entry > active_end:
                                processed.append(s)
                                active_end = s_exit

            # Separate winners (hit target or profitable trade)
            winners = [c for c in processed if c["hit_target"]]

            # Sort winners and all candidates by trigger / entry date ASC
            winners.sort(key=lambda x: (x["setup_date"], x["symbol"]))
            processed.sort(key=lambda x: (x["setup_date"], x["symbol"]))

            # 5. Compute summary statistics
            total_trades = len(processed)
            total_winners = len(winners)
            win_rate_pct = round((total_winners / total_trades * 100.0), 1) if total_trades > 0 else 0.0

            stops = [t for t in processed if t.get("stopped_out")]
            stop_loss_rate = round((len(stops) / total_trades * 100.0), 1) if total_trades > 0 else 0.0

            ema_exits = [t for t in processed if "EMA" in t.get("exit_reason", "")]
            ema_exit_rate = round((len(ema_exits) / total_trades * 100.0), 1) if total_trades > 0 else 0.0

            expired = [t for t in processed if t.get("exit_reason") == "TIME_EXPIRED"]
            expired_rate = round((len(expired) / total_trades * 100.0), 1) if total_trades > 0 else 0.0

            avg_trade_ret = round(sum(t["trade_return_pct"] for t in processed) / total_trades, 2) if total_trades > 0 else 0.0
            avg_winner_gain = round(sum(w["trade_return_pct"] for w in winners) / total_winners, 2) if total_winners > 0 else 0.0

            losing_trades = [t for t in processed if t["trade_return_pct"] <= 0]
            avg_loser_loss = round(sum(l["trade_return_pct"] for l in losing_trades) / len(losing_trades), 2) if losing_trades else 0.0

            sum_win = sum(t["trade_return_pct"] for t in processed if t["trade_return_pct"] > 0)
            sum_loss = abs(sum(t["trade_return_pct"] for t in losing_trades))
            profit_factor = round(sum_win / sum_loss, 2) if sum_loss > 0 else (round(sum_win, 2) if sum_win > 0 else 0.0)

            avg_drawdown = round(sum(c["max_drawdown_pct"] for c in processed) / total_trades, 1) if total_trades > 0 else 0.0

            days_list = [w["days_to_target"] for w in winners if w["days_to_target"] is not None]
            median_days = 0
            if days_list:
                days_list.sort()
                mid = len(days_list) // 2
                median_days = days_list[mid] if len(days_list) % 2 != 0 else round((days_list[mid - 1] + days_list[mid]) / 2, 1)

            best_performer = None
            if processed:
                best_w = max(processed, key=lambda x: x["peak_gain_pct"])
                best_performer = {
                    "symbol": best_w["symbol"],
                    "gain_pct": best_w["peak_gain_pct"],
                    "date": best_w["setup_date"],
                    "sector": best_w.get("sector")
                }

            avg_winner_runup = round(sum(w["prior_runup_pct"] for w in winners) / total_winners, 1) if total_winners > 0 else 0.0
            avg_winner_base_depth = round(sum(w["base_depth_pct"] for w in winners) / total_winners, 1) if total_winners > 0 else 0.0
            avg_winner_rs = round(sum(w["rs_score"] for w in winners if w.get("rs_score")) / max(1, len([w for w in winners if w.get("rs_score")])), 1) if total_winners > 0 else 0.0

            # Regime breakdown statistics
            regime_breakdown = {}
            for r_key, r_name in [("BULLISH", "Bullish Uptrend"), ("CAUTION", "Caution / Pullback"), ("BEARISH", "High Risk / Bearish")]:
                r_cands = [c for c in processed if c.get("market_regime") == r_key]
                r_win = [w for w in winners if w.get("market_regime") == r_key]
                tot = len(r_cands)
                w_cnt = len(r_win)
                rate = round((w_cnt / tot * 100.0), 1) if tot > 0 else 0.0
                avg_g = round(sum(w["trade_return_pct"] for w in r_win) / w_cnt, 1) if w_cnt > 0 else 0.0
                regime_breakdown[r_key] = {
                    "name": r_name,
                    "total": tot,
                    "winners": w_cnt,
                    "win_rate_pct": rate,
                    "avg_winner_gain_pct": avg_g
                }

            summary = {
                "setup_type": setup_type,
                "target_gain_pct": target_gain_pct,
                "stop_loss_pct": stop_loss_pct,
                "ema_exit_type": ema_exit_type,
                "forward_days": forward_days,
                "date_range": {"start": start_date_str, "end": end_date_str},
                "total_setups": len(raw_rows),
                "total_trades": total_trades,
                "total_winners": total_winners,
                "win_rate_pct": win_rate_pct,
                "stop_loss_rate_pct": stop_loss_rate,
                "ema_exit_rate_pct": ema_exit_rate,
                "time_expired_rate_pct": expired_rate,
                "avg_trade_return_pct": avg_trade_ret,
                "avg_winner_gain_pct": avg_winner_gain,
                "avg_loser_loss_pct": avg_loser_loss,
                "profit_factor": profit_factor,
                "median_days_to_target": median_days,
                "avg_drawdown_pct": avg_drawdown,
                "best_performer": best_performer,
                "avg_winner_runup_pct": avg_winner_runup,
                "avg_winner_base_depth": avg_winner_base_depth,
                "avg_winner_rs_score": avg_winner_rs,
                "regime_breakdown": regime_breakdown,
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
        effective_filters: Dict[str, Any]
    ) -> tuple[str, list]:
        """Constructs high-performance DuckDB query tailored to each setup using exact setup filter criteria."""

        # Universal baseline filters from base_setup
        min_price = float(effective_filters.get("min_price", 5.0))
        min_volume_50d = float(effective_filters.get("min_volume_sma_50", 100000))
        min_dollar_vol = float(effective_filters.get("min_dollar_vol", 3000000.0))
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

        # Setup-specific queries
        if setup_type == "power_play":
            runup_thresh = float(effective_filters.get("min_pp_runup", 100.0))
            depth_thresh = float(effective_filters.get("max_pp_drawdown", 25.0))
            min_pp_days = int(effective_filters.get("min_pp_days_since_peak", 5))
            max_pp_days = int(effective_filters.get("max_pp_days_since_peak", 35))

            query = f"""
            WITH numbered AS (
                SELECT 
                    d.symbol, d.date, d.open, d.high, d.low, d.close, d.volume,
                    d.vol_50d_ma, COALESCE(d.dollar_vol_50d_ma, d.close * d.vol_50d_ma) as dollar_vol_50d_ma,
                    d.adr_20d, d.rs_score, d.rs_rank,
                    d.sma_50, d.sma_150, d.sma_200, d.dist_from_52w_high, d.surge_off_low_pct,
                    s.name, s.sector, s.industry, s.asset_type,
                    ROW_NUMBER() OVER (PARTITION BY d.symbol ORDER BY d.date) as rn,
                    LEAD(d.date, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_date,
                    LEAD(d.open, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_open,
                    LEAD(d.high, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_high,
                    LEAD(d.low, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_low,
                    LEAD(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_close
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
                  AND (s.asset_type IS NULL OR UPPER(s.asset_type) NOT LIKE '%ETF%')
                  AND (s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')
                  AND d.symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC')
            ),
            peaks AS (
                SELECT *,
                    MAX(high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 35 PRECEDING AND 1 PRECEDING) as base_peak_high,
                    ARG_MAX(rn, high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 35 PRECEDING AND 1 PRECEDING) as base_peak_rn,
                    MIN(low) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 75 PRECEDING AND 1 PRECEDING) as runup_min_low,
                    MIN(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 35 PRECEDING AND 1 PRECEDING) as base_min_close
                FROM numbered
            ),
            candidates AS (
                SELECT *,
                    (rn - base_peak_rn) as days_since_peak,
                    (base_peak_high - runup_min_low) / NULLIF(runup_min_low, 0) * 100 as runup_pct,
                    (base_peak_high - base_min_close) / NULLIF(base_peak_high, 0) * 100 as drawdown_pct
                FROM peaks
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND dollar_vol_50d_ma >= ?
                  {stage2_sql}
                  {rs_sql}
            )
            SELECT 
                symbol, date, open, high, low, close, volume,
                name, sector, industry,
                runup_pct, drawdown_pct as base_depth_pct,
                rs_score, adr_20d, base_peak_high as pivot_price,
                next_date, next_open, next_high, next_low, next_close
            FROM candidates
            WHERE days_since_peak >= {min_pp_days} 
              AND days_since_peak <= {max_pp_days}
              AND runup_pct >= {runup_thresh} 
              AND drawdown_pct <= {depth_thresh} 
              AND close <= base_peak_high * 1.05
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        elif setup_type == "breakout":
            runup_thresh = float(effective_filters.get("min_breakout_runup", 30.0))
            min_days = int(effective_filters.get("min_breakout_days", 8))
            max_days = int(effective_filters.get("max_breakout_days", 45))
            depth_thresh = float(effective_filters.get("max_breakout_drawdown", 35.0))
            min_adr = float(effective_filters.get("min_adr_20d", 4.0)) if effective_filters.get("enable_adr", True) else None
            adr_sql = f"AND adr_20d >= {min_adr}" if min_adr is not None else ""

            query = f"""
            WITH numbered AS (
                SELECT 
                    d.symbol, d.date, d.open, d.high, d.low, d.close, d.volume,
                    d.vol_50d_ma, COALESCE(d.dollar_vol_50d_ma, d.close * d.vol_50d_ma) as dollar_vol_50d_ma,
                    d.adr_20d, d.rs_score, d.rs_rank,
                    d.sma_50, d.sma_150, d.sma_200, d.dist_from_52w_high, d.surge_off_low_pct,
                    s.name, s.sector, s.industry, s.asset_type,
                    ROW_NUMBER() OVER (PARTITION BY d.symbol ORDER BY d.date) as rn,
                    LEAD(d.date, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_date,
                    LEAD(d.open, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_open,
                    LEAD(d.high, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_high,
                    LEAD(d.low, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_low,
                    LEAD(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_close
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
                  AND (s.asset_type IS NULL OR UPPER(s.asset_type) NOT LIKE '%ETF%')
                  AND (s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')
                  AND d.symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC')
            ),
            peaks AS (
                SELECT *,
                    MAX(high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 45 PRECEDING AND 1 PRECEDING) as base_peak_high,
                    ARG_MAX(rn, high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 45 PRECEDING AND 1 PRECEDING) as base_peak_rn,
                    MIN(low) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 75 PRECEDING AND 1 PRECEDING) as runup_min_low,
                    MIN(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 45 PRECEDING AND 1 PRECEDING) as base_min_close
                FROM numbered
            ),
            candidates AS (
                SELECT *,
                    (rn - base_peak_rn) as days_since_peak,
                    (base_peak_high - runup_min_low) / NULLIF(runup_min_low, 0) * 100 as runup_pct,
                    (base_peak_high - base_min_close) / NULLIF(base_peak_high, 0) * 100 as drawdown_pct
                FROM peaks
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND dollar_vol_50d_ma >= ?
                  {adr_sql}
                  {stage2_sql}
                  {rs_sql}
            )
            SELECT 
                symbol, date, open, high, low, close, volume,
                name, sector, industry,
                runup_pct, drawdown_pct as base_depth_pct,
                rs_score, adr_20d, base_peak_high as pivot_price,
                next_date, next_open, next_high, next_low, next_close
            FROM candidates
            WHERE days_since_peak >= {min_days}
              AND days_since_peak <= {max_days}
              AND runup_pct >= {runup_thresh} 
              AND drawdown_pct <= {depth_thresh} 
              AND close <= base_peak_high * 1.05
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        elif setup_type == "episodic_pivot":
            min_gap = float(effective_filters.get("min_ep_gap", 10.0))
            min_rel_vol = float(effective_filters.get("min_ep_rel_vol", 2.5))

            query = f"""
            WITH numbered AS (
                SELECT 
                    d.symbol, d.date, d.open, d.high, d.low, d.close, d.volume,
                    d.vol_50d_ma, COALESCE(d.dollar_vol_50d_ma, d.close * d.vol_50d_ma) as dollar_vol_50d_ma,
                    d.adr_20d, d.rel_vol_50d, d.gap_pct, d.rs_score,
                    d.sma_50, d.sma_150, d.sma_200, d.dist_from_52w_high, d.surge_off_low_pct,
                    s.name, s.sector, s.industry,
                    LAG(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as prev_close,
                    LEAD(d.date, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_date,
                    LEAD(d.open, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_open,
                    LEAD(d.high, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_high,
                    LEAD(d.low, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_low,
                    LEAD(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_close
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
                  AND (s.asset_type IS NULL OR UPPER(s.asset_type) NOT LIKE '%ETF%')
                  AND (s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')
                  AND d.symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC')
            ),
            candidates AS (
                SELECT *,
                    COALESCE(gap_pct, (open - prev_close) / NULLIF(prev_close, 0) * 100) as calc_gap_pct,
                    COALESCE(rel_vol_50d, volume / NULLIF(vol_50d_ma, 0)) as calc_rel_vol
                FROM numbered
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND dollar_vol_50d_ma >= ?
                  {stage2_sql}
                  {rs_sql}
            )
            SELECT 
                symbol, date, open, high, low, close, volume,
                name, sector, industry,
                calc_gap_pct as runup_pct, 0.0 as base_depth_pct,
                rs_score, adr_20d, open as pivot_price,
                next_date, next_open, next_high, next_low, next_close
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
            WITH numbered AS (
                SELECT 
                    d.symbol, d.date, d.open, d.high, d.low, d.close, d.volume,
                    d.vol_50d_ma, COALESCE(d.dollar_vol_50d_ma, d.close * d.vol_50d_ma) as dollar_vol_50d_ma,
                    d.adr_20d, d.rs_score, d.ipo_days_count,
                    d.sma_50, d.sma_150, d.sma_200, d.dist_from_52w_high, d.surge_off_low_pct,
                    s.name, s.sector, s.industry,
                    ROW_NUMBER() OVER (PARTITION BY d.symbol ORDER BY d.date) as ipo_days_calc,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) as all_time_high_prior,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as base_high_20d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as base_low_20d,
                    LEAD(d.date, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_date,
                    LEAD(d.open, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_open,
                    LEAD(d.high, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_high,
                    LEAD(d.low, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_low,
                    LEAD(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_close
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
                  AND (s.asset_type IS NULL OR UPPER(s.asset_type) NOT LIKE '%ETF%')
                  AND (s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')
                  AND d.symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC')
            ),
            candidates AS (
                SELECT *,
                    COALESCE(ipo_days_count, ipo_days_calc) as ipo_age,
                    (all_time_high_prior - close) / NULLIF(all_time_high_prior, 0) * 100 as ipo_drawdown,
                    (base_high_20d - base_low_20d) / NULLIF(base_high_20d, 0) * 100 as ipo_depth,
                    (all_time_high_prior - base_low_20d) / NULLIF(base_low_20d, 0) * 100 as runup_pct
                FROM numbered
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND dollar_vol_50d_ma >= ?
                  {stage2_sql}
                  {rs_sql}
            )
            SELECT 
                symbol, date, open, high, low, close, volume,
                name, sector, industry,
                runup_pct, ipo_depth as base_depth_pct,
                rs_score, adr_20d, base_high_20d as pivot_price,
                next_date, next_open, next_high, next_low, next_close
            FROM candidates
            WHERE ipo_age >= 10 AND ipo_age <= {max_ipo_age}
              AND ipo_drawdown <= {max_ipo_dist}
              AND ipo_depth <= {max_ipo_depth}
              AND close <= base_high_20d * 1.05
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        elif setup_type == "vcp":
            dist_52w = float(effective_filters.get("dist_from_52w_high", 20.0))
            max_contraction = float(effective_filters.get("max_pivot_spread", 12.0))

            query = f"""
            WITH numbered AS (
                SELECT 
                    d.symbol, d.date, d.open, d.high, d.low, d.close, d.volume,
                    d.vol_50d_ma, COALESCE(d.dollar_vol_50d_ma, d.close * d.vol_50d_ma) as dollar_vol_50d_ma,
                    d.adr_20d, d.rs_score, d.sma_50, d.sma_150, d.sma_200, d.dist_from_52w_high, d.surge_off_low_pct,
                    s.name, s.sector, s.industry,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 252 PRECEDING AND 1 PRECEDING) as high_52w,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 10 PRECEDING AND 1 PRECEDING) as high_10d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 10 PRECEDING AND 1 PRECEDING) as low_10d,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 30 PRECEDING AND 1 PRECEDING) as high_30d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 30 PRECEDING AND 1 PRECEDING) as low_30d,
                    LEAD(d.date, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_date,
                    LEAD(d.open, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_open,
                    LEAD(d.high, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_high,
                    LEAD(d.low, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_low,
                    LEAD(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_close
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
                  AND (s.asset_type IS NULL OR UPPER(s.asset_type) NOT LIKE '%ETF%')
                  AND (s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')
                  AND d.symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC')
            ),
            candidates AS (
                SELECT *,
                    COALESCE(dist_from_52w_high, (high_52w - close) / NULLIF(high_52w, 0) * 100) as calc_dist_52w_high,
                    (high_10d - low_10d) / NULLIF(high_10d, 0) * 100 as contraction_tight_pct,
                    (high_30d - low_30d) / NULLIF(high_30d, 0) * 100 as contraction_wide_pct
                FROM numbered
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND COALESCE(dollar_vol_50d_ma, close * vol_50d_ma) >= ?
                  {stage2_sql}
                  {rs_sql}
            )
            SELECT 
                symbol, date, open, high, low, close, volume,
                name, sector, industry,
                contraction_wide_pct as runup_pct, contraction_tight_pct as base_depth_pct,
                rs_score, adr_20d, high_10d as pivot_price,
                next_date, next_open, next_high, next_low, next_close
            FROM candidates
            WHERE calc_dist_52w_high <= {dist_52w} 
              AND contraction_tight_pct <= {max_contraction}
              AND close <= high_10d * 1.05
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        elif setup_type == "parabolic":
            min_runup = float(effective_filters.get("min_parabolic_runup", 40.0))
            min_ema_dist = float(effective_filters.get("min_parabolic_ema_dist", 18.0))

            query = f"""
            WITH numbered AS (
                SELECT 
                    d.symbol, d.date, d.open, d.high, d.low, d.close, d.volume,
                    d.vol_50d_ma, COALESCE(d.dollar_vol_50d_ma, d.close * d.vol_50d_ma) as dollar_vol_50d_ma,
                    d.adr_20d, d.rs_score, d.dist_ema10_pct, d.parabolic_runup_pct,
                    d.sma_50, d.sma_150, d.sma_200, d.dist_from_52w_high, d.surge_off_low_pct,
                    s.name, s.sector, s.industry,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 10 PRECEDING AND 1 PRECEDING) as min_low_10d,
                    LEAD(d.date, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_date,
                    LEAD(d.open, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_open,
                    LEAD(d.high, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_high,
                    LEAD(d.low, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_low,
                    LEAD(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_close
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
                  AND (s.asset_type IS NULL OR UPPER(s.asset_type) NOT LIKE '%ETF%')
                  AND (s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')
                  AND d.symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC')
            ),
            candidates AS (
                SELECT *,
                    COALESCE(parabolic_runup_pct, (close - min_low_10d) / NULLIF(min_low_10d, 0) * 100) as calc_runup
                FROM numbered
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND dollar_vol_50d_ma >= ?
                  {stage2_sql}
                  {rs_sql}
            )
            SELECT 
                symbol, date, open, high, low, close, volume,
                name, sector, industry,
                calc_runup as runup_pct, 0.0 as base_depth_pct,
                rs_score, adr_20d, close as pivot_price,
                next_date, next_open, next_high, next_low, next_close
            FROM candidates
            WHERE calc_runup >= {min_runup}
              AND (dist_ema10_pct IS NULL OR dist_ema10_pct >= {min_ema_dist})
            ORDER BY symbol, date ASC;
            """
            return query, base_params

        else:
            # Default / QM Momentum
            min_adr = float(effective_filters.get("min_adr_20d", 4.0)) if effective_filters.get("enable_adr", True) else 4.0

            query = f"""
            WITH numbered AS (
                SELECT 
                    d.symbol, d.date, d.open, d.high, d.low, d.close, d.volume,
                    d.vol_50d_ma, COALESCE(d.dollar_vol_50d_ma, d.close * d.vol_50d_ma) as dollar_vol_50d_ma,
                    d.adr_20d, d.rs_score, d.rs_rank,
                    d.sma_50, d.sma_150, d.sma_200, d.dist_from_52w_high, d.surge_off_low_pct,
                    s.name, s.sector, s.industry,
                    MAX(d.high) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as max_high_20d,
                    MIN(d.low) OVER (PARTITION BY d.symbol ORDER BY d.date ROWS BETWEEN 20 PRECEDING AND 1 PRECEDING) as min_low_20d,
                    LEAD(d.date, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_date,
                    LEAD(d.open, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_open,
                    LEAD(d.high, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_high,
                    LEAD(d.low, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_low,
                    LEAD(d.close, 1) OVER (PARTITION BY d.symbol ORDER BY d.date) as next_close
                FROM daily_bars d
                LEFT JOIN symbols s ON d.symbol = s.symbol
                WHERE d.date >= CAST(? AS DATE)
                  AND (s.asset_type IS NULL OR UPPER(s.asset_type) NOT LIKE '%ETF%')
                  AND (s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')
                  AND d.symbol NOT IN ('SPY', 'QQQ', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC')
            ),
            candidates AS (
                SELECT *,
                    (max_high_20d - min_low_20d) / NULLIF(max_high_20d, 0) * 100 as drawdown_pct
                FROM numbered
                WHERE date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
                  AND close >= ?
                  AND vol_50d_ma >= ?
                  AND dollar_vol_50d_ma >= ?
                  AND (rs_rank IS NOT NULL AND rs_rank >= 80)
                  AND adr_20d >= {min_adr}
                  {stage2_sql}
            )
            SELECT 
                symbol, date, open, high, low, close, volume,
                name, sector, industry,
                COALESCE(rs_score, 0.0) as runup_pct, drawdown_pct as base_depth_pct,
                rs_score, adr_20d, max_high_20d as pivot_price,
                next_date, next_open, next_high, next_low, next_close
            FROM candidates
            ORDER BY symbol, date ASC;
            """
            return query, base_params

    def _evaluate_forward_paths(
        self,
        conn,
        trades: List[Dict[str, Any]],
        target_gain_pct: float,
        stop_loss_pct: Optional[float],
        ema_exit_type: Optional[str],
        forward_days: int
    ) -> List[Dict[str, Any]]:
        """
        Simulates multi-path trade executions from exact next-day breakout entries:
        - Profit Target hit (High >= Entry * (1 + target))
        - Stop Loss hit (Low <= Entry * (1 - stop))
        - Trailing EMA Exit (Close < EMA10 or Close < EMA20)
        - Time Expiration (Holding Period end close)
        """
        if not trades:
            return []

        kq_lookup = get_qullamaggie_daily_lookup(conn, symbol="QQQ")
        symbols = list({t["symbol"] for t in trades})

        min_entry_date = min(t["entry_date"] for t in trades)
        max_entry_date = max(t["entry_date"] for t in trades)
        
        # Buffer back 90 days for accurate running EMA calculation, and forward by forward_days + 15
        fetch_start_date = (datetime.strptime(min_entry_date, "%Y-%m-%d").date() - timedelta(days=90)).strftime("%Y-%m-%d")
        fetch_end_date = (datetime.strptime(max_entry_date, "%Y-%m-%d").date() + timedelta(days=int(forward_days * 2) + 20)).strftime("%Y-%m-%d")

        placeholders = ",".join(["?"] * len(symbols))
        forward_bars_query = f"""
            SELECT symbol, date, open, high, low, close 
            FROM daily_bars 
            WHERE symbol IN ({placeholders}) 
              AND date >= CAST(? AS DATE) AND date <= CAST(? AS DATE)
            ORDER BY symbol, date ASC
        """
        fwd_rows = conn.execute(forward_bars_query, symbols + [fetch_start_date, fetch_end_date]).fetchall()

        sym_all_bars = defaultdict(list)
        for row in fwd_rows:
            sym, b_date, b_open, b_high, b_low, b_close = row
            b_dt_str = b_date.strftime("%Y-%m-%d") if hasattr(b_date, "strftime") else str(b_date)
            sym_all_bars[sym].append((b_dt_str, float(b_open), float(b_high), float(b_low), float(b_close)))

        # Precompute EMAs for symbols
        sym_emas = {}
        for sym, b_list in sym_all_bars.items():
            closes = [b[4] for b in b_list]
            dates = [b[0] for b in b_list]
            sym_emas[sym] = {
                "dates": dates,
                "bars": b_list,
                "ema10": compute_ema_series(closes, 10),
                "ema20": compute_ema_series(closes, 20)
            }

        simulated_results = []
        target_mult = 1.0 + (target_gain_pct / 100.0)
        stop_mult = 1.0 - (stop_loss_pct / 100.0) if stop_loss_pct is not None else None

        for trade in trades:
            sym = trade["symbol"]
            entry_date = trade["entry_date"]
            setup_date = trade["setup_date"]
            entry_price = trade["entry_price"]

            if entry_price <= 0:
                continue

            e_info = sym_emas.get(sym)
            if not e_info:
                continue

            dates = e_info["dates"]
            if entry_date not in dates:
                continue

            entry_idx = dates.index(entry_date)
            fwd_bars = e_info["bars"][entry_idx : entry_idx + forward_days]
            if not fwd_bars:
                continue

            target_price = round(entry_price * target_mult, 2)
            stop_price = round(entry_price * stop_mult, 2) if stop_mult is not None else None

            exit_price = None
            exit_date = None
            exit_reason = None
            holding_days = 0
            hit_day = None

            for day_idx, b in enumerate(fwd_bars, 1):
                dt_str = b[0]
                b_open, b_high, b_low, b_close = b[1], b[2], b[3], b[4]
                global_idx = entry_idx + day_idx - 1
                e10_val = e_info["ema10"][global_idx]
                e20_val = e_info["ema20"][global_idx]

                # 1. Stop Loss check (conservative priority)
                if stop_price is not None and b_low <= stop_price:
                    exit_price = min(b_open, stop_price)
                    exit_date = dt_str
                    exit_reason = "STOP_LOSS"
                    holding_days = day_idx
                    break

                # 2. Profit Target check
                if b_high >= target_price:
                    exit_price = max(b_open, target_price)
                    exit_date = dt_str
                    exit_reason = "TARGET"
                    holding_days = day_idx
                    hit_day = day_idx
                    break

                # 3. Trailing EMA Exit check
                if ema_exit_type == "ema_10" and b_close < e10_val:
                    exit_price = b_close
                    exit_date = dt_str
                    exit_reason = "EMA_10_EXIT"
                    holding_days = day_idx
                    break
                elif ema_exit_type == "ema_20" and b_close < e20_val:
                    exit_price = b_close
                    exit_date = dt_str
                    exit_reason = "EMA_20_EXIT"
                    holding_days = day_idx
                    break
            else:
                # 4. Time Expiration check
                last_b = fwd_bars[-1]
                exit_price = last_b[4]
                exit_date = last_b[0]
                exit_reason = "TIME_EXPIRED"
                holding_days = len(fwd_bars)

            trade_ret_pct = round(((exit_price - entry_price) / entry_price) * 100.0, 2)
            path_bars = fwd_bars[:holding_days]
            peak_gain_pct = round(((max(b[2] for b in path_bars) - entry_price) / entry_price) * 100.0, 2)
            max_dd_pct = round(((min(b[3] for b in path_bars) - entry_price) / entry_price) * 100.0, 2)

            m_info = kq_lookup.get(setup_date, {})

            sim_trade = dict(trade)
            sim_trade.update({
                "exit_price": round(float(exit_price), 2),
                "exit_date": exit_date,
                "exit_reason": exit_reason,
                "holding_days": holding_days,
                "trade_return_pct": trade_ret_pct,
                "peak_gain_pct": peak_gain_pct,
                "max_drawdown_pct": max_dd_pct,
                "target_price": target_price,
                "stop_price": stop_price,
                "hit_target": (exit_reason == "TARGET"),
                "stopped_out": (exit_reason == "STOP_LOSS"),
                "days_to_target": hit_day,
                "market_regime": m_info.get("regime", "UNKNOWN"),
                "market_label": m_info.get("label", "Unknown"),
                "market_badge": m_info.get("badge", "-"),
                "market_stack": m_info.get("stack", "-"),
                "market_index_close": m_info.get("close"),
                "market_details": {
                    "qqq_close": m_info.get("close"),
                    "ema_10": m_info.get("ema_10"),
                    "ema_20": m_info.get("ema_20"),
                    "sma_50": m_info.get("sma_50"),
                    "dist_ema10_pct": m_info.get("dist_ema10_pct"),
                    "dist_ema20_pct": m_info.get("dist_ema20_pct"),
                    "dist_sma50_pct": m_info.get("dist_sma50_pct")
                }
            })
            simulated_results.append(sim_trade)

        return simulated_results


model_book_service = ModelBookService(config_service)
