import logging
from typing import List, Dict, Any, Optional
import duckdb
from application.services.theme_service import ThemeService

logger = logging.getLogger(__name__)



class GroupRadarService:
    def __init__(self, db_path: str = "data.db", theme_service: Optional[ThemeService] = None):
        self.db_path = db_path
        self.theme_service = theme_service or ThemeService()
        self._bars_cache = {}

    def _get_connection(self):
        import time
        max_retries = 25
        for attempt in range(max_retries):
            try:
                return duckdb.connect(self.db_path, read_only=True)
            except Exception as e:
                err_msg = str(e).lower()
                is_lock = any(k in err_msg for k in ["lock", "different configuration", "conflict", "held in", "temporarily unavailable"])
                if is_lock and attempt < max_retries - 1:
                    time.sleep(0.05 + attempt * 0.02)
                else:
                    raise

    def get_group_strength(self, group_type: str = "industries", date: Optional[str] = None, sector: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Calculates group-level strength metrics (Today, 1W, 1M, 3M, YTD, RS Rank, 52wH, RVol)
        for 'sectors', 'industries', or 'themes'. Optionally filtered by parent 'sector'.
        """
        g_type = group_type.strip().lower()

        try:
            with self._get_connection() as conn:
                # 1. Resolve date
                if not date:
                    date_row = conn.execute("SELECT MAX(date) FROM daily_bars").fetchone()
                    if not date_row or not date_row[0]:
                        return []
                    target_date = str(date_row[0])
                else:
                    target_date = date

                year_str = target_date[:4]
                clean_sec = sector.replace("'", "''") if sector else ""
                sector_filter = f"AND s.sector = '{clean_sec}'" if sector else ""

                # Base CTE defining trading calendar anchors
                calendar_cte = f"""
                    calendar_dates AS (
                        SELECT DISTINCT date 
                        FROM daily_bars 
                        WHERE date <= '{target_date}' 
                        ORDER BY date DESC
                    ),
                    d0_date AS (SELECT date FROM calendar_dates LIMIT 1),
                    d1_date AS (SELECT date FROM calendar_dates LIMIT 1 OFFSET 1),
                    d5_date AS (SELECT date FROM calendar_dates LIMIT 1 OFFSET 5),
                    d21_date AS (SELECT date FROM calendar_dates LIMIT 1 OFFSET 21),
                    d63_date AS (SELECT date FROM calendar_dates LIMIT 1 OFFSET 63),
                    ytd_date AS (SELECT MIN(date) as date FROM calendar_dates WHERE date >= '{year_str}-01-01')
                """

                # Liquid stock base CTE
                stock_cte = f"""
                    d0 AS (
                        SELECT d.symbol, d.date, d.close, d.volume, d.vol_50d_ma, d.rs_score, d.rs_rank, d.dist_from_52w_high, d.rel_vol_50d,
                               s.name, s.sector, s.industry
                        FROM daily_bars d
                        JOIN symbols s ON d.symbol = s.symbol
                        WHERE d.date = (SELECT date FROM d0_date)
                          AND s.active = true 
                          AND s.asset_type = 'Common Stock'
                          {sector_filter}
                          AND d.close >= 3.0
                          AND (d.vol_50d_ma IS NULL OR d.vol_50d_ma >= 30000)
                    ),
                    d1 AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM d1_date)),
                    d5 AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM d5_date)),
                    d21 AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM d21_date)),
                    d63 AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM d63_date)),
                    ytd AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM ytd_date)),

                    stock_metrics AS (
                        SELECT 
                            d0.*,
                            ROUND((d0.close - d1.close) / NULLIF(d1.close, 0) * 100.0, 2) as ret_today,
                            ROUND((d0.close - d5.close) / NULLIF(d5.close, 0) * 100.0, 2) as ret_1w,
                            ROUND((d0.close - d21.close) / NULLIF(d21.close, 0) * 100.0, 2) as ret_1m,
                            ROUND((d0.close - d63.close) / NULLIF(d63.close, 0) * 100.0, 2) as ret_3m,
                            ROUND((d0.close - ytd.close) / NULLIF(ytd.close, 0) * 100.0, 2) as ret_ytd
                        FROM d0
                        LEFT JOIN d1 ON d0.symbol = d1.symbol
                        LEFT JOIN d5 ON d0.symbol = d5.symbol
                        LEFT JOIN d21 ON d0.symbol = d21.symbol
                        LEFT JOIN d63 ON d0.symbol = d63.symbol
                        LEFT JOIN ytd ON d0.symbol = ytd.symbol
                    )
                """

                if g_type == "themes":
                    themes = self.theme_service.load_themes()
                    if not themes:
                        return []

                    # Build VALUES tuple for theme mapping
                    value_rows = []
                    for t in themes:
                        t_name = t.get("name", "").replace("'", "''")
                        for sym in t.get("symbols", []):
                            sym_clean = sym.strip().upper().replace("'", "''")
                            if sym_clean:
                                value_rows.append(f"('{t_name}', '{sym_clean}')")

                    if not value_rows:
                        return []

                    values_sql = ",\n".join(value_rows)

                    query = f"""
                        WITH {calendar_cte},
                        {stock_cte},
                        theme_map(theme, symbol) AS (
                            VALUES {values_sql}
                        ),
                        theme_stocks AS (
                            SELECT 
                                t.theme as group_name,
                                sm.*
                            FROM theme_map t
                            JOIN stock_metrics sm ON t.symbol = sm.symbol
                        )
                        SELECT 
                            group_name as name,
                            COUNT(*) as stock_count,
                            ROUND(MEDIAN(ret_today), 2) as today_pct,
                            ROUND(MEDIAN(ret_1w), 2) as ret_1w_pct,
                            ROUND(MEDIAN(ret_1m), 2) as ret_1m_pct,
                            ROUND(MEDIAN(ret_3m), 2) as ret_3m_pct,
                            ROUND(MEDIAN(ret_ytd), 2) as ret_ytd_pct,
                            ROUND(MEDIAN(rs_rank), 0) as rs_rank,
                            ROUND(-COALESCE(MEDIAN(dist_from_52w_high), 0), 1) as dist_52wh_pct,
                            ROUND(SUM(volume)::DOUBLE / NULLIF(SUM(vol_50d_ma), 0) * 100.0, 0) as rvol_pct,
                            list(symbol ORDER BY rs_rank DESC NULLS LAST)[:4] as top_symbols
                        FROM theme_stocks
                        GROUP BY group_name
                        ORDER BY ret_1w_pct DESC;
                    """

                elif g_type == "sectors":
                    query = f"""
                        WITH {calendar_cte},
                        {stock_cte},
                        rrg_calendar AS (SELECT date FROM calendar_dates LIMIT 40),
                        sec_summary AS (
                            SELECT 
                                sector as name,
                                COUNT(*) as stock_count,
                                ROUND(MEDIAN(ret_today), 2) as today_pct,
                                ROUND(MEDIAN(ret_1w), 2) as ret_1w_pct,
                                ROUND(MEDIAN(ret_1m), 2) as ret_1m_pct,
                                ROUND(MEDIAN(ret_3m), 2) as ret_3m_pct,
                                ROUND(MEDIAN(ret_ytd), 2) as ret_ytd_pct,
                                ROUND(MEDIAN(rs_rank), 0) as rs_rank,
                                ROUND(-COALESCE(MEDIAN(dist_from_52w_high), 0), 1) as dist_52wh_pct,
                                ROUND(SUM(volume)::DOUBLE / NULLIF(SUM(vol_50d_ma), 0) * 100.0, 0) as rvol_pct,
                                list(symbol ORDER BY rs_rank DESC NULLS LAST)[:4] as top_symbols
                            FROM stock_metrics
                            WHERE sector IS NOT NULL AND sector != ''
                            GROUP BY sector
                        ),
                        sec_d0_rs AS (
                            SELECT s.sector, AVG(d.rs_score) as avg_rs_score
                            FROM daily_bars d
                            JOIN symbols s ON d.symbol = s.symbol
                            WHERE d.date = (SELECT date FROM d0_date)
                              AND s.active = true AND s.asset_type = 'Common Stock'
                              AND s.sector IS NOT NULL AND s.sector != ''
                              AND d.close >= 3.0
                            GROUP BY s.sector
                        ),
                        sec_d5_rs AS (
                            SELECT s.sector, AVG(d.rs_score) as avg_rs_score
                            FROM daily_bars d
                            JOIN symbols s ON d.symbol = s.symbol
                            WHERE d.date = (SELECT date FROM d5_date)
                              AND s.active = true AND s.asset_type = 'Common Stock'
                              AND s.sector IS NOT NULL AND s.sector != ''
                              AND d.close >= 3.0
                            GROUP BY s.sector
                        ),
                        ranked_d0 AS (
                            SELECT sector, ROW_NUMBER() OVER (ORDER BY avg_rs_score DESC) as rank_d0
                            FROM sec_d0_rs
                        ),
                        ranked_d5 AS (
                            SELECT sector, ROW_NUMBER() OVER (ORDER BY avg_rs_score DESC) as rank_d5
                            FROM sec_d5_rs
                        ),
                        spy AS (
                            SELECT date, close as spy_close 
                            FROM daily_bars 
                            WHERE symbol = 'SPY' AND date IN (SELECT date FROM rrg_calendar)
                        ),
                        sec_stock_bars AS (
                            SELECT s.sector, d.date, d.symbol, d.close,
                                   (d.close / NULLIF(LAG(d.close) OVER (PARTITION BY s.sector, d.symbol ORDER BY d.date), 0)) - 1.0 as daily_ret
                            FROM symbols s
                            JOIN daily_bars d ON s.symbol = d.symbol
                            WHERE s.active = true 
                              AND s.asset_type = 'Common Stock'
                              AND s.sector IS NOT NULL AND s.sector != ''
                              AND d.date IN (SELECT date FROM rrg_calendar)
                              AND d.close >= 3.0
                        ),
                        sec_daily_ret AS (
                            SELECT sector, date, MEDIAN(daily_ret) as med_ret
                            FROM sec_stock_bars
                            WHERE daily_ret IS NOT NULL
                            GROUP BY sector, date
                        ),
                        sec_cum AS (
                            SELECT sector, date,
                                   EXP(SUM(LN(1.0 + COALESCE(med_ret, 0.0))) OVER (PARTITION BY sector ORDER BY date)) * 100.0 as sec_index
                            FROM sec_daily_ret
                        ),
                        spy_ret AS (
                            SELECT date, spy_close,
                                   (spy_close / NULLIF(LAG(spy_close) OVER (ORDER BY date), 0)) - 1.0 as spy_daily_ret
                            FROM spy
                        ),
                        spy_cum AS (
                            SELECT date,
                                   EXP(SUM(LN(1.0 + COALESCE(spy_daily_ret, 0.0))) OVER (ORDER BY date)) * 100.0 as spy_index
                            FROM spy_ret
                        ),
                        sec_rs AS (
                            SELECT sc.sector, sc.date,
                                   (sc.sec_index / NULLIF(spc.spy_index, 0)) * 100.0 as rs_raw
                            FROM sec_cum sc
                            JOIN spy_cum spc ON sc.date = spc.date
                        ),
                        with_rs_ratio AS (
                            SELECT sector, date, rs_raw,
                                   AVG(rs_raw) OVER (PARTITION BY sector ORDER BY date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) as rs_sma14
                            FROM sec_rs
                        ),
                        with_metrics AS (
                            SELECT sector, date, rs_raw,
                                   ROUND(100.0 + ((rs_raw - rs_sma14) / NULLIF(rs_sma14, 0)) * 100.0, 2) as rs_ratio
                            FROM with_rs_ratio
                        ),
                        with_momentum AS (
                            SELECT sector, date, rs_ratio,
                                   ROUND(100.0 + (rs_ratio - LAG(rs_ratio, 5) OVER (PARTITION BY sector ORDER BY date)) * 2.0, 2) as rs_momentum
                            FROM with_metrics
                        ),
                        rrg_latest AS (
                            SELECT sector, rs_ratio, rs_momentum,
                                   CASE 
                                     WHEN rs_ratio >= 100.0 AND rs_momentum >= 100.0 THEN 'Leading'
                                     WHEN rs_ratio >= 100.0 AND rs_momentum < 100.0 THEN 'Weakening'
                                     WHEN rs_ratio < 100.0 AND rs_momentum < 100.0 THEN 'Lagging'
                                     ELSE 'Improving'
                                   END as quadrant
                            FROM with_momentum
                            WHERE date = (SELECT date FROM d0_date)
                        )
                        SELECT 
                            s.name,
                            s.stock_count,
                            s.today_pct,
                            s.ret_1w_pct,
                            s.ret_1m_pct,
                            s.ret_3m_pct,
                            s.ret_ytd_pct,
                            s.rs_rank,
                            s.dist_52wh_pct,
                            s.rvol_pct,
                            s.top_symbols,
                            r0.rank_d0 as rank,
                            (r5.rank_d5 - r0.rank_d0) as rank_delta,
                            COALESCE(q.quadrant, 'Improving') as quadrant,
                            q.rs_ratio,
                            q.rs_momentum
                        FROM sec_summary s
                        JOIN ranked_d0 r0 ON s.name = r0.sector
                        JOIN ranked_d5 r5 ON s.name = r5.sector
                        LEFT JOIN rrg_latest q ON s.name = q.sector
                        ORDER BY ret_1w_pct DESC;
                    """

                else:  # default: industries
                    query = f"""
                        WITH {calendar_cte},
                        {stock_cte}
                        SELECT 
                            industry as name,
                            COUNT(*) as stock_count,
                            ROUND(MEDIAN(ret_today), 2) as today_pct,
                            ROUND(MEDIAN(ret_1w), 2) as ret_1w_pct,
                            ROUND(MEDIAN(ret_1m), 2) as ret_1m_pct,
                            ROUND(MEDIAN(ret_3m), 2) as ret_3m_pct,
                            ROUND(MEDIAN(ret_ytd), 2) as ret_ytd_pct,
                            ROUND(MEDIAN(rs_rank), 0) as rs_rank,
                            ROUND(-COALESCE(MEDIAN(dist_from_52w_high), 0), 1) as dist_52wh_pct,
                            ROUND(SUM(volume)::DOUBLE / NULLIF(SUM(vol_50d_ma), 0) * 100.0, 0) as rvol_pct,
                            list(symbol ORDER BY rs_rank DESC NULLS LAST)[:4] as top_symbols
                        FROM stock_metrics
                        WHERE industry IS NOT NULL AND industry != ''
                        GROUP BY industry
                        HAVING COUNT(*) >= {1 if sector else 2}
                        ORDER BY ret_1w_pct DESC;
                    """

                res = conn.execute(query).fetchall()
                cols = [c[0] for c in conn.description]

                results = []
                for r in res:
                    item = dict(zip(cols, r))
                    results.append(item)

                if g_type in ("industries", "themes") and results:
                    try:
                        rrg_items = self.get_rrg_data(group_type=g_type, date=date, trail_bars=5, sector=sector)
                        rrg_map = {item["name"]: item for item in rrg_items}

                        def sort_key(item):
                            rrg_i = rrg_map.get(item["name"])
                            rrg_score = (rrg_i.get("x", 100) + rrg_i.get("y", 100)) if rrg_i else 200
                            rs_val = item.get("rs_rank") or 50
                            ret_1w = item.get("ret_1w_pct") or 0
                            return (rrg_score * 0.4) + (rs_val * 0.4) + (ret_1w * 2.0)

                        sorted_items = sorted(results, key=sort_key, reverse=True)
                        for rank_idx, item in enumerate(sorted_items, start=1):
                            item["rank"] = rank_idx
                            rrg_i = rrg_map.get(item["name"])
                            if rrg_i:
                                item["quadrant"] = rrg_i.get("quadrant", "Improving")
                                item["rs_ratio"] = rrg_i.get("x")
                                item["rs_momentum"] = rrg_i.get("y")
                                trail = rrg_i.get("trail", [])
                                if trail and len(trail) >= 2:
                                    delta = round((rrg_i.get("y", 100) - trail[0].get("y", 100)) / 1.5)
                                    item["rank_delta"] = delta
                                else:
                                    item["rank_delta"] = 0
                            else:
                                item["quadrant"] = "Improving"
                                item["rank_delta"] = 0
                        results = sorted_items
                    except Exception as e:
                        logger.error(f"Error augmenting {g_type} with RRG metadata: {e}")

                return results

        except Exception as e:
            logger.error(f"Error computing group strength ({group_type}): {e}", exc_info=True)
            return []

    def get_group_constituents(self, group_type: str, group_name: str, date: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves constituent stocks for a specific Sector, Industry, or Theme on a given date,
        including technical metrics and active setup tags.
        """
        g_type = group_type.strip().lower()
        g_name = group_name.strip()

        try:
            with self._get_connection() as conn:
                if not date:
                    date_row = conn.execute("SELECT MAX(date) FROM daily_bars").fetchone()
                    if not date_row or not date_row[0]:
                        return []
                    target_date = str(date_row[0])
                else:
                    target_date = date

                year_str = target_date[:4]

                calendar_cte = f"""
                    calendar_dates AS (
                        SELECT DISTINCT date 
                        FROM daily_bars 
                        WHERE date <= '{target_date}' 
                        ORDER BY date DESC
                    ),
                    d0_date AS (SELECT date FROM calendar_dates LIMIT 1),
                    d1_date AS (SELECT date FROM calendar_dates LIMIT 1 OFFSET 1),
                    d5_date AS (SELECT date FROM calendar_dates LIMIT 1 OFFSET 5),
                    d21_date AS (SELECT date FROM calendar_dates LIMIT 1 OFFSET 21),
                    d63_date AS (SELECT date FROM calendar_dates LIMIT 1 OFFSET 63),
                    ytd_date AS (SELECT MIN(date) as date FROM calendar_dates WHERE date >= '{year_str}-01-01'),
                    min_260_date AS (
                        SELECT MIN(date) as date FROM (SELECT date FROM calendar_dates LIMIT 260)
                    )
                """

                if g_type == "themes":
                    theme = self.theme_service.get_theme(g_name)
                    if not theme or not theme.get("symbols"):
                        return []
                    sym_list = theme["symbols"]
                    sym_in = ", ".join(f"'{s}'" for s in sym_list)
                    filter_sql = f"d.symbol IN ({sym_in})"
                elif g_type == "sectors":
                    safe_name = g_name.replace("'", "''")
                    filter_sql = f"s.sector = '{safe_name}'"
                else:  # industries
                    safe_name = g_name.replace("'", "''")
                    filter_sql = f"s.industry = '{safe_name}'"

                query = f"""
                    WITH {calendar_cte},
                    d0 AS (
                        SELECT d.symbol, d.date, d.close, d.volume, d.vol_50d_ma, d.rs_score, d.rs_rank, d.dist_from_52w_high, d.rel_vol_50d,
                               d.vcp_is_setup, d.ep_is_setup, d.low_cheat_is_setup, d.pp_runup_pct, d.pp_days_since_peak, d.is_52w_high,
                               s.name, s.sector, s.industry, s.exchange
                        FROM daily_bars d
                        JOIN symbols s ON d.symbol = s.symbol
                        WHERE d.date = (SELECT date FROM d0_date)
                          AND {filter_sql}
                    ),
                    d1 AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM d1_date)),
                    d5 AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM d5_date)),
                    d21 AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM d21_date)),
                    d63 AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM d63_date)),
                    ytd AS (SELECT symbol, close FROM daily_bars WHERE date = (SELECT date FROM ytd_date)),
                    rs_history AS (
                        SELECT d.symbol, d.date, d.close, b.close as spy_close,
                               ROUND((d.close / NULLIF(b.close, 0)) * 100.0, 4) as rs_line
                        FROM daily_bars d
                        JOIN daily_bars b ON d.date = b.date AND b.symbol = 'SPY'
                        WHERE d.symbol IN (SELECT symbol FROM d0)
                          AND d.date <= (SELECT date FROM d0_date)
                          AND d.date >= (SELECT date FROM min_260_date)
                    ),
                    rs_rolling AS (
                        SELECT symbol, date, close, rs_line,
                               MAX(rs_line) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 252 PRECEDING AND 1 PRECEDING) as prev_rs_high,
                               MAX(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 252 PRECEDING AND 1 PRECEDING) as prev_close_high
                        FROM rs_history
                    ),
                    rs_blue_dot_flags AS (
                        SELECT symbol,
                               bool_or(date >= (SELECT date FROM d5_date) AND prev_rs_high IS NOT NULL AND rs_line >= prev_rs_high AND close < prev_close_high) as has_rs_blue_dot
                        FROM rs_rolling
                        GROUP BY symbol
                    )

                    SELECT 
                        d0.symbol,
                        d0.name,
                        d0.exchange,
                        d0.sector,
                        d0.industry,
                        ROUND(d0.close, 2) as close,
                        ROUND((d0.close - d1.close) / NULLIF(d1.close, 0) * 100.0, 2) as today_pct,
                        ROUND((d0.close - d5.close) / NULLIF(d5.close, 0) * 100.0, 2) as ret_1w_pct,
                        ROUND((d0.close - d21.close) / NULLIF(d21.close, 0) * 100.0, 2) as ret_1m_pct,
                        ROUND((d0.close - d63.close) / NULLIF(d63.close, 0) * 100.0, 2) as ret_3m_pct,
                        ROUND((d0.close - ytd.close) / NULLIF(ytd.close, 0) * 100.0, 2) as ret_ytd_pct,
                        d0.rs_rank,
                        ROUND(-COALESCE(d0.dist_from_52w_high, 0), 1) as dist_52wh_pct,
                        d0.volume,
                        d0.vol_50d_ma,
                        ROUND(d0.volume::DOUBLE / NULLIF(d0.vol_50d_ma, 0) * 100.0, 0) as rvol_pct,
                        d0.vcp_is_setup,
                        d0.ep_is_setup,
                        d0.low_cheat_is_setup,
                        (d0.pp_runup_pct >= 100.0 AND d0.pp_days_since_peak <= 30) as is_power_play,
                        (d0.is_52w_high OR d0.dist_from_52w_high <= 2.0) as is_breakout,
                        COALESCE(rf.has_rs_blue_dot, false) as has_rs_blue_dot
                    FROM d0
                    LEFT JOIN d1 ON d0.symbol = d1.symbol
                    LEFT JOIN d5 ON d0.symbol = d5.symbol
                    LEFT JOIN d21 ON d0.symbol = d21.symbol
                    LEFT JOIN d63 ON d0.symbol = d63.symbol
                    LEFT JOIN ytd ON d0.symbol = ytd.symbol
                    LEFT JOIN rs_blue_dot_flags rf ON d0.symbol = rf.symbol
                    ORDER BY d0.rs_rank DESC NULLS LAST, ret_1w_pct DESC NULLS LAST;
                """

                res = conn.execute(query).fetchall()
                cols = [c[0] for c in conn.description]

                stocks = []
                for r in res:
                    s_dict = dict(zip(cols, r))

                    # Aggregate active setups into human-friendly tags
                    setups = []
                    if s_dict.get("is_breakout"):
                        setups.append("Breakout")
                    if s_dict.get("vcp_is_setup"):
                        setups.append("VCP")
                    if s_dict.get("low_cheat_is_setup"):
                        setups.append("Low Cheat")
                    if s_dict.get("ep_is_setup"):
                        setups.append("EP")
                    if s_dict.get("is_power_play"):
                        setups.append("Power Play")
                    if s_dict.get("has_rs_blue_dot"):
                        setups.append("RS Blue Dot")

                    s_dict["setups"] = setups
                    stocks.append(s_dict)

                return stocks

        except Exception as e:
            logger.error(f"Error getting group constituents ({group_type}, {group_name}): {e}", exc_info=True)
            return []

    def get_rrg_data(
        self,
        group_type: str = "sectors",
        date: Optional[str] = None,
        trail_bars: int = 5,
        sector: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Calculates Relative Rotation Graph (RRG) coordinates (RS-Ratio and RS-Momentum)
        and historical rotation trails for sectors, industries, or themes against benchmark SPY.
        """
        from collections import defaultdict
        g_type = group_type.strip().lower()
        trail_n = max(1, min(int(trail_bars or 5), 10))

        try:
            with self._get_connection() as conn:
                if not date:
                    date_row = conn.execute("SELECT MAX(date) FROM daily_bars").fetchone()
                    if not date_row or not date_row[0]:
                        return []
                    target_date = str(date_row[0])
                else:
                    target_date = date

                clean_sec = sector.replace("'", "''") if sector else ""

                if g_type == "sectors":
                    query = f"""
                        WITH calendar AS (
                            SELECT DISTINCT date FROM daily_bars 
                            WHERE date <= '{target_date}' 
                            ORDER BY date DESC LIMIT 40
                        ),
                        spy AS (
                            SELECT date, close as spy_close 
                            FROM daily_bars 
                            WHERE symbol = 'SPY' AND date IN (SELECT date FROM calendar)
                        ),
                        sec_stock_bars AS (
                            SELECT s.sector, d.date, d.symbol, d.close,
                                   (d.close / NULLIF(LAG(d.close) OVER (PARTITION BY s.sector, d.symbol ORDER BY d.date), 0)) - 1.0 as daily_ret
                            FROM symbols s
                            JOIN daily_bars d ON s.symbol = d.symbol
                            WHERE s.active = true 
                              AND s.asset_type = 'Common Stock'
                              AND s.sector IS NOT NULL AND s.sector != ''
                              AND d.date IN (SELECT date FROM calendar)
                              AND d.close >= 3.0
                        ),
                        sec_daily_ret AS (
                            SELECT sector, date, MEDIAN(daily_ret) as med_ret
                            FROM sec_stock_bars
                            WHERE daily_ret IS NOT NULL
                            GROUP BY sector, date
                        ),
                        sec_cum AS (
                            SELECT sector, date,
                                   EXP(SUM(LN(1.0 + COALESCE(med_ret, 0.0))) OVER (PARTITION BY sector ORDER BY date)) * 100.0 as sec_index
                            FROM sec_daily_ret
                        ),
                        spy_ret AS (
                            SELECT date, spy_close,
                                   (spy_close / NULLIF(LAG(spy_close) OVER (ORDER BY date), 0)) - 1.0 as spy_daily_ret
                            FROM spy
                        ),
                        spy_cum AS (
                            SELECT date,
                                   EXP(SUM(LN(1.0 + COALESCE(spy_daily_ret, 0.0))) OVER (ORDER BY date)) * 100.0 as spy_index
                            FROM spy_ret
                        ),
                        sec_rs AS (
                            SELECT sc.sector, sc.date,
                                   (sc.sec_index / NULLIF(spc.spy_index, 0)) * 100.0 as rs_raw
                            FROM sec_cum sc
                            JOIN spy_cum spc ON sc.date = spc.date
                        ),
                        with_rs_ratio AS (
                            SELECT sector, date, rs_raw,
                                   AVG(rs_raw) OVER (PARTITION BY sector ORDER BY date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) as rs_sma14
                            FROM sec_rs
                        ),
                        with_metrics AS (
                            SELECT sector, date, rs_raw,
                                   ROUND(100.0 + ((rs_raw - rs_sma14) / NULLIF(rs_sma14, 0)) * 100.0, 2) as rs_ratio
                            FROM with_rs_ratio
                        ),
                        with_momentum AS (
                            SELECT sector, date, rs_ratio,
                                   ROUND(100.0 + (rs_ratio - LAG(rs_ratio, 5) OVER (PARTITION BY sector ORDER BY date)) * 2.0, 2) as rs_momentum,
                                   ROUND((rs_ratio - LAG(rs_ratio, 5) OVER (PARTITION BY sector ORDER BY date)), 2) as ret_1w
                            FROM with_metrics
                        ),
                        ranked_dates AS (
                            SELECT *, DENSE_RANK() OVER (ORDER BY date DESC) as date_rank
                            FROM with_momentum
                        )
                        SELECT sector as name, NULL as symbol, date, rs_ratio, rs_momentum, ret_1w, date_rank
                        FROM ranked_dates
                        WHERE date_rank <= {trail_n} AND rs_ratio IS NOT NULL AND rs_momentum IS NOT NULL
                        ORDER BY sector, date ASC;
                    """

                elif g_type == "themes":
                    themes = self.theme_service.load_themes()
                    if not themes:
                        return []

                    value_rows = []
                    for t in themes:
                        t_name = t.get("name", "").replace("'", "''")
                        for sym in t.get("symbols", []):
                            sym_clean = sym.strip().upper().replace("'", "''")
                            if sym_clean:
                                value_rows.append(f"('{t_name}', '{sym_clean}')")

                    if not value_rows:
                        return []

                    values_sql = ",\n".join(value_rows)

                    query = f"""
                        WITH calendar AS (
                            SELECT DISTINCT date FROM daily_bars 
                            WHERE date <= '{target_date}' 
                            ORDER BY date DESC LIMIT 40
                        ),
                        theme_map(theme, symbol) AS (
                            VALUES {values_sql}
                        ),
                        spy AS (
                            SELECT date, close as spy_close 
                            FROM daily_bars 
                            WHERE symbol = 'SPY' AND date IN (SELECT date FROM calendar)
                        ),
                        theme_stock_bars AS (
                            SELECT t.theme, d.date, d.symbol, d.close,
                                   (d.close / NULLIF(LAG(d.close) OVER (PARTITION BY t.theme, d.symbol ORDER BY d.date), 0)) - 1.0 as daily_ret
                            FROM theme_map t
                            JOIN daily_bars d ON t.symbol = d.symbol
                            WHERE d.date IN (SELECT date FROM calendar)
                        ),
                        theme_daily_ret AS (
                            SELECT theme, date, MEDIAN(daily_ret) as med_ret
                            FROM theme_stock_bars
                            WHERE daily_ret IS NOT NULL
                            GROUP BY theme, date
                        ),
                        theme_cum AS (
                            SELECT theme, date,
                                   EXP(SUM(LN(1.0 + COALESCE(med_ret, 0.0))) OVER (PARTITION BY theme ORDER BY date)) * 100.0 as theme_index
                            FROM theme_daily_ret
                        ),
                        spy_ret AS (
                            SELECT date, spy_close,
                                   (spy_close / NULLIF(LAG(spy_close) OVER (ORDER BY date), 0)) - 1.0 as spy_daily_ret
                            FROM spy
                        ),
                        spy_cum AS (
                            SELECT date,
                                   EXP(SUM(LN(1.0 + COALESCE(spy_daily_ret, 0.0))) OVER (ORDER BY date)) * 100.0 as spy_index
                            FROM spy_ret
                        ),
                        theme_rs AS (
                            SELECT tc.theme, tc.date,
                                   (tc.theme_index / NULLIF(sc.spy_index, 0)) * 100.0 as rs_raw
                            FROM theme_cum tc
                            JOIN spy_cum sc ON tc.date = sc.date
                        ),
                        with_rs_ratio AS (
                            SELECT theme, date, rs_raw,
                                   AVG(rs_raw) OVER (PARTITION BY theme ORDER BY date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) as rs_sma14
                            FROM theme_rs
                        ),
                        with_metrics AS (
                            SELECT theme, date, rs_raw,
                                   ROUND(100.0 + ((rs_raw - rs_sma14) / NULLIF(rs_sma14, 0)) * 100.0, 2) as rs_ratio
                            FROM with_rs_ratio
                        ),
                        with_momentum AS (
                            SELECT theme, date, rs_ratio,
                                   ROUND(100.0 + (rs_ratio - LAG(rs_ratio, 5) OVER (PARTITION BY theme ORDER BY date)) * 2.0, 2) as rs_momentum,
                                   ROUND((rs_ratio - LAG(rs_ratio, 5) OVER (PARTITION BY theme ORDER BY date)), 2) as ret_1w
                            FROM with_metrics
                        ),
                        ranked_dates AS (
                            SELECT *, DENSE_RANK() OVER (ORDER BY date DESC) as date_rank
                            FROM with_momentum
                        )
                        SELECT theme as name, NULL as symbol, date, rs_ratio, rs_momentum, ret_1w, date_rank
                        FROM ranked_dates
                        WHERE date_rank <= {trail_n} AND rs_ratio IS NOT NULL AND rs_momentum IS NOT NULL
                        ORDER BY theme, date ASC;
                    """

                else:  # default: industries
                    sector_filter = f"AND s.sector = '{clean_sec}'" if clean_sec else ""
                    limit_clause = "LIMIT 35" if not clean_sec else ""
                    min_stock_count = 1 if clean_sec else 6

                    query = f"""
                        WITH calendar AS (
                            SELECT DISTINCT date FROM daily_bars 
                            WHERE date <= '{target_date}' 
                            ORDER BY date DESC LIMIT 40
                        ),
                        target_industries AS (
                            SELECT s.industry, COUNT(*) as cnt
                            FROM symbols s
                            WHERE s.active = true 
                              AND s.asset_type = 'Common Stock' 
                              AND s.industry IS NOT NULL 
                              AND s.industry != ''
                              {sector_filter}
                            GROUP BY s.industry
                            HAVING COUNT(*) >= {min_stock_count}
                            ORDER BY cnt DESC
                            {limit_clause}
                        ),
                        spy AS (
                            SELECT date, close as spy_close 
                            FROM daily_bars 
                            WHERE symbol = 'SPY' AND date IN (SELECT date FROM calendar)
                        ),
                        ind_stock_bars AS (
                            SELECT s.industry, d.date, d.symbol, d.close,
                                   (d.close / NULLIF(LAG(d.close) OVER (PARTITION BY s.industry, d.symbol ORDER BY d.date), 0)) - 1.0 as daily_ret
                            FROM symbols s
                            JOIN daily_bars d ON s.symbol = d.symbol
                            WHERE s.industry IN (SELECT industry FROM target_industries) 
                              AND d.date IN (SELECT date FROM calendar)
                        ),
                        ind_daily_ret AS (
                            SELECT industry, date, MEDIAN(daily_ret) as med_ret
                            FROM ind_stock_bars
                            WHERE daily_ret IS NOT NULL
                            GROUP BY industry, date
                        ),
                        ind_cum AS (
                            SELECT industry, date,
                                   EXP(SUM(LN(1.0 + COALESCE(med_ret, 0.0))) OVER (PARTITION BY industry ORDER BY date)) * 100.0 as ind_index
                            FROM ind_daily_ret
                        ),
                        spy_ret AS (
                            SELECT date, spy_close,
                                   (spy_close / NULLIF(LAG(spy_close) OVER (ORDER BY date), 0)) - 1.0 as spy_daily_ret
                            FROM spy
                        ),
                        spy_cum AS (
                            SELECT date,
                                   EXP(SUM(LN(1.0 + COALESCE(spy_daily_ret, 0.0))) OVER (ORDER BY date)) * 100.0 as spy_index
                            FROM spy_ret
                        ),
                        ind_rs AS (
                            SELECT ic.industry, ic.date,
                                   (ic.ind_index / NULLIF(sc.spy_index, 0)) * 100.0 as rs_raw
                            FROM ind_cum ic
                            JOIN spy_cum sc ON ic.date = sc.date
                        ),
                        with_rs_ratio AS (
                            SELECT industry, date, rs_raw,
                                   AVG(rs_raw) OVER (PARTITION BY industry ORDER BY date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) as rs_sma14
                            FROM ind_rs
                        ),
                        with_metrics AS (
                            SELECT industry, date, rs_raw,
                                   ROUND(100.0 + ((rs_raw - rs_sma14) / NULLIF(rs_sma14, 0)) * 100.0, 2) as rs_ratio
                            FROM with_rs_ratio
                        ),
                        with_momentum AS (
                            SELECT industry, date, rs_ratio,
                                   ROUND(100.0 + (rs_ratio - LAG(rs_ratio, 5) OVER (PARTITION BY industry ORDER BY date)) * 2.0, 2) as rs_momentum,
                                   ROUND((rs_ratio - LAG(rs_ratio, 5) OVER (PARTITION BY industry ORDER BY date)), 2) as ret_1w
                            FROM with_metrics
                        ),
                        ranked_dates AS (
                            SELECT *, DENSE_RANK() OVER (ORDER BY date DESC) as date_rank
                            FROM with_momentum
                        )
                        SELECT industry as name, NULL as symbol, date, rs_ratio, rs_momentum, ret_1w, date_rank
                        FROM ranked_dates
                        WHERE date_rank <= {trail_n} AND rs_ratio IS NOT NULL AND rs_momentum IS NOT NULL
                        ORDER BY industry, date ASC;
                    """

                rows = conn.execute(query).fetchall()
                if not rows:
                    return []

                groups = defaultdict(list)
                for r in rows:
                    name, sym, d_val, x_val, y_val, ret_1w_val, d_rank = r
                    groups[name].append({
                        "symbol": sym,
                        "date": str(d_val),
                        "x": float(x_val),
                        "y": float(y_val),
                        "ret_1w": float(ret_1w_val) if ret_1w_val is not None else 0.0,
                        "rank": d_rank
                    })

                results = []
                for name, pts in groups.items():
                    latest = pts[-1]
                    x = latest["x"]
                    y = latest["y"]

                    if x >= 100.0 and y >= 100.0:
                        quadrant = "Leading"
                    elif x >= 100.0 and y < 100.0:
                        quadrant = "Weakening"
                    elif x < 100.0 and y < 100.0:
                        quadrant = "Lagging"
                    else:
                        quadrant = "Improving"

                    trail = [{"date": p["date"], "x": p["x"], "y": p["y"]} for p in pts]

                    results.append({
                        "name": name,
                        "symbol": latest["symbol"],
                        "x": x,
                        "y": y,
                        "quadrant": quadrant,
                        "ret_1w": latest["ret_1w"],
                        "trail": trail
                    })

                results.sort(key=lambda item: item["x"], reverse=True)
                return results

        except Exception as e:
            logger.error(f"Error computing RRG data ({group_type}): {e}", exc_info=True)
            return []

    def _empty_group_bars_response(self, group_name: str, group_type: str, timeframe: str, target_date: str) -> Dict[str, Any]:
        return {
            "name": group_name,
            "type": group_type,
            "timeframe": timeframe,
            "as_of": target_date,
            "stage_summary": {
                "stage": "Unknown",
                "stage_badge": "Unknown",
                "stage_color": "#94a3b8",
                "ma_val": None,
                "ma_slope_pct": None,
                "mansfield_rs": None,
                "is_above_ma": False,
                "pct_above_200d": 0.0,
                "pct_in_stage2": 0.0,
                "bias": "No active constituent stocks found"
            },
            "breadth": {
                "total_stocks": 0,
                "above_200d_count": 0,
                "pct_above_200d": 0.0,
                "stage2_count": 0,
                "pct_in_stage2": 0.0,
                "leaders": []
            },
            "bars": []
        }

    def get_group_bars(
        self,
        group_type: str = "industries",
        group_name: str = "",
        timeframe: str = "weekly",
        limit: int = 156,
        date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates synthetic group price bars (OHLCV), Weinstein 40-week (or 200-day) SMA,
        Mansfield Relative Strength vs SPY, and automated Stage 1-4 classification.
        """
        g_type = (group_type or "industries").strip().lower()
        g_name = (group_name or "").strip()
        tf = (timeframe or "weekly").strip().lower()
        if tf not in ("weekly", "daily"):
            tf = "weekly"

        max_limit = 500 if tf == "daily" else 260
        limit_n = max(10, min(int(limit or 156), max_limit))

        try:
            with self._get_connection() as conn:
                # 1. Resolve target date
                if not date:
                    d_row = conn.execute("SELECT MAX(date) FROM daily_bars").fetchone()
                    if not d_row or not d_row[0]:
                        return self._empty_group_bars_response(g_name, g_type, tf, "")
                    target_date = str(d_row[0])
                else:
                    target_date = date

                cache_key = (g_type, g_name, tf, target_date, limit_n)
                if cache_key in self._bars_cache:
                    return self._bars_cache[cache_key]

                # 2. Build stock filter
                if g_type == "themes":
                    theme = self.theme_service.get_theme(g_name)
                    if not theme or not theme.get("symbols"):
                        return self._empty_group_bars_response(g_name, g_type, tf, target_date)
                    clean_syms = [s.strip().upper().replace("'", "''") for s in theme.get("symbols", []) if s.strip()]
                    if not clean_syms:
                        return self._empty_group_bars_response(g_name, g_type, tf, target_date)
                    syms_sql = ", ".join(f"'{s}'" for s in clean_syms)
                    stock_filter = f"s.symbol IN ({syms_sql})"
                elif g_type == "sectors":
                    clean_sec = g_name.replace("'", "''")
                    stock_filter = f"s.sector = '{clean_sec}'"
                else:  # industries
                    clean_ind = g_name.replace("'", "''")
                    stock_filter = f"s.industry = '{clean_ind}'"

                # 3. Breadth & Leaders query as of target date
                breadth_query = f"""
                    SELECT 
                        COUNT(*) as total_stocks,
                        COUNT(CASE WHEN d.close > d.sma_200 THEN 1 END) as above_200d_count,
                        ROUND(COUNT(CASE WHEN d.close > d.sma_200 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as pct_above_200d,
                        COUNT(CASE WHEN d.stage2_days > 0 THEN 1 END) as stage2_count,
                        ROUND(COUNT(CASE WHEN d.stage2_days > 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as pct_in_stage2
                    FROM daily_bars d
                    JOIN symbols s ON d.symbol = s.symbol
                    WHERE {stock_filter} AND s.active = true AND s.asset_type = 'Common Stock' AND d.close >= 3.0
                      AND d.date = '{target_date}'
                """
                b_row = conn.execute(breadth_query).fetchone()
                total_stocks = b_row[0] if b_row else 0
                if total_stocks == 0:
                    return self._empty_group_bars_response(g_name, g_type, tf, target_date)

                above_200d_count = b_row[1] or 0
                pct_above_200d = float(b_row[2]) if b_row[2] is not None else 0.0
                stage2_count = b_row[3] or 0
                pct_in_stage2 = float(b_row[4]) if b_row[4] is not None else 0.0

                leaders_query = f"""
                    SELECT d.symbol, s.name, d.close, d.rs_score, d.rs_rank, d.stage2_days,
                           ROUND((d.close - d.sma_200) / NULLIF(d.sma_200, 0) * 100.0, 1) as dist_sma200_pct
                    FROM daily_bars d
                    JOIN symbols s ON d.symbol = s.symbol
                    WHERE {stock_filter} AND s.active = true AND s.asset_type = 'Common Stock' AND d.close >= 3.0
                      AND d.date = '{target_date}'
                    ORDER BY d.rs_rank DESC NULLS LAST
                    LIMIT 8
                """
                leaders_rows = conn.execute(leaders_query).fetchall()
                leaders = [
                    {
                        "symbol": lr[0],
                        "name": lr[1],
                        "close": float(lr[2]) if lr[2] is not None else 0.0,
                        "rs_score": float(lr[3]) if lr[3] is not None else 0.0,
                        "rs_rank": int(lr[4]) if lr[4] is not None else 0,
                        "stage2_days": int(lr[5]) if lr[5] is not None else 0,
                        "dist_sma200_pct": float(lr[6]) if lr[6] is not None else 0.0
                    }
                    for lr in leaders_rows
                ]

                # 4. Generate Synthetic Group OHLCV + MAs + Mansfield RS
                if tf == "weekly":
                    bars_query = f"""
                        WITH stock_rets AS (
                            SELECT 
                                d.date,
                                d.symbol,
                                (d.open / NULLIF(LAG(d.close) OVER (PARTITION BY d.symbol ORDER BY d.date), 0)) - 1.0 as ret_open,
                                (d.high / NULLIF(LAG(d.close) OVER (PARTITION BY d.symbol ORDER BY d.date), 0)) - 1.0 as ret_high,
                                (d.low / NULLIF(LAG(d.close) OVER (PARTITION BY d.symbol ORDER BY d.date), 0)) - 1.0 as ret_low,
                                (d.close / NULLIF(LAG(d.close) OVER (PARTITION BY d.symbol ORDER BY d.date), 0)) - 1.0 as ret_close,
                                d.volume
                            FROM symbols s
                            JOIN daily_bars d ON s.symbol = d.symbol
                            WHERE {stock_filter} AND s.active = true AND s.asset_type = 'Common Stock' AND d.close >= 3.0
                              AND d.date <= '{target_date}'
                        ),
                        daily_med AS (
                            SELECT 
                                date,
                                COUNT(symbol) as stock_count,
                                MEDIAN(ret_open) as med_open,
                                MEDIAN(ret_high) as med_high,
                                MEDIAN(ret_low) as med_low,
                                MEDIAN(ret_close) as med_close,
                                SUM(volume) as total_volume
                            FROM stock_rets
                            WHERE ret_close IS NOT NULL
                            GROUP BY date
                        ),
                        cum_base AS (
                            SELECT 
                                date,
                                stock_count,
                                med_open,
                                med_high,
                                med_low,
                                med_close,
                                total_volume,
                                EXP(SUM(LN(1.0 + COALESCE(med_close, 0.0))) OVER (ORDER BY date)) * 100.0 as close_idx
                            FROM daily_med
                        ),
                        daily_ohlc AS (
                            SELECT 
                                date,
                                date_trunc('week', date) as week_start,
                                stock_count,
                                total_volume as volume,
                                LAG(close_idx, 1, close_idx) OVER (ORDER BY date) * (1.0 + COALESCE(med_open, 0.0)) as raw_open,
                                LAG(close_idx, 1, close_idx) OVER (ORDER BY date) * (1.0 + COALESCE(med_high, 0.0)) as raw_high,
                                LAG(close_idx, 1, close_idx) OVER (ORDER BY date) * (1.0 + COALESCE(med_low, 0.0)) as raw_low,
                                close_idx as raw_close
                            FROM cum_base
                        ),
                        sanitized_daily AS (
                            SELECT 
                                date,
                                week_start,
                                stock_count,
                                volume,
                                raw_open,
                                GREATEST(raw_high, raw_open, raw_close) as high,
                                LEAST(raw_low, raw_open, raw_close) as low,
                                raw_close as close
                            FROM daily_ohlc
                        ),
                        weekly_bars AS (
                            SELECT 
                                MAX(date) as date,
                                FIRST(raw_open ORDER BY date ASC) as open,
                                MAX(high) as high,
                                MIN(low) as low,
                                LAST(close ORDER BY date ASC) as close,
                                SUM(volume) as volume,
                                AVG(stock_count)::INT as avg_stock_count
                            FROM sanitized_daily
                            GROUP BY week_start
                            ORDER BY date ASC
                        ),
                        spy_weekly AS (
                            SELECT 
                                date_trunc('week', date) as week_start,
                                LAST(close ORDER BY date ASC) as spy_close
                            FROM daily_bars
                            WHERE symbol = 'SPY' AND date <= '{target_date}'
                            GROUP BY week_start
                        ),
                        weekly_with_spy AS (
                            SELECT 
                                w.date,
                                ROUND(w.open, 2) as open,
                                ROUND(GREATEST(w.high, w.open, w.close), 2) as high,
                                ROUND(LEAST(w.low, w.open, w.close), 2) as low,
                                ROUND(w.close, 2) as close,
                                w.volume,
                                w.avg_stock_count,
                                s.spy_close,
                                ROUND((w.close / NULLIF(s.spy_close, 0)) * 100.0, 4) as rs_line
                            FROM weekly_bars w
                            LEFT JOIN spy_weekly s ON date_trunc('week', w.date) = s.week_start
                        ),
                        with_ma AS (
                            SELECT 
                                *,
                                ROUND(AVG(close) OVER (ORDER BY date ROWS BETWEEN 39 PRECEDING AND CURRENT ROW), 2) as sma_40w,
                                ROUND(AVG(close) OVER (ORDER BY date ROWS BETWEEN 9 PRECEDING AND CURRENT ROW), 2) as sma_10w,
                                ROUND(AVG(rs_line) OVER (ORDER BY date ROWS BETWEEN 39 PRECEDING AND CURRENT ROW), 4) as rs_sma_40w
                            FROM weekly_with_spy
                        ),
                        with_mansfield AS (
                            SELECT 
                                *,
                                ROUND(((rs_line / NULLIF(rs_sma_40w, 0)) - 1.0) * 100.0, 2) as mansfield_rs,
                                ROUND((sma_40w - LAG(sma_40w, 4) OVER (ORDER BY date)) / NULLIF(LAG(sma_40w, 4) OVER (ORDER BY date), 0) * 100.0, 2) as ma_slope_pct
                            FROM with_ma
                        )
                        SELECT 
                            date::VARCHAR as date, open, high, low, close, volume, sma_40w, sma_10w, rs_line, mansfield_rs, ma_slope_pct,
                            CASE 
                                WHEN close > sma_40w AND ma_slope_pct > 0.05 AND mansfield_rs > 0 THEN 'Stage 2 (Advancing)'
                                WHEN close > sma_40w AND ma_slope_pct >= -0.15 THEN 'Stage 1 (Basing/Transition)'
                                WHEN close < sma_40w AND ma_slope_pct < -0.05 AND mansfield_rs < 0 THEN 'Stage 4 (Declining)'
                                ELSE 'Stage 3 (Topping/Distribution)'
                            END as stage
                        FROM with_mansfield 
                        ORDER BY date ASC;
                    """
                else:  # daily
                    bars_query = f"""
                        WITH stock_rets AS (
                            SELECT 
                                d.date,
                                d.symbol,
                                (d.open / NULLIF(LAG(d.close) OVER (PARTITION BY d.symbol ORDER BY d.date), 0)) - 1.0 as ret_open,
                                (d.high / NULLIF(LAG(d.close) OVER (PARTITION BY d.symbol ORDER BY d.date), 0)) - 1.0 as ret_high,
                                (d.low / NULLIF(LAG(d.close) OVER (PARTITION BY d.symbol ORDER BY d.date), 0)) - 1.0 as ret_low,
                                (d.close / NULLIF(LAG(d.close) OVER (PARTITION BY d.symbol ORDER BY d.date), 0)) - 1.0 as ret_close,
                                d.volume
                            FROM symbols s
                            JOIN daily_bars d ON s.symbol = d.symbol
                            WHERE {stock_filter} AND s.active = true AND s.asset_type = 'Common Stock' AND d.close >= 3.0
                              AND d.date <= '{target_date}'
                        ),
                        daily_med AS (
                            SELECT 
                                date,
                                COUNT(symbol) as stock_count,
                                MEDIAN(ret_open) as med_open,
                                MEDIAN(ret_high) as med_high,
                                MEDIAN(ret_low) as med_low,
                                MEDIAN(ret_close) as med_close,
                                SUM(volume) as total_volume
                            FROM stock_rets
                            WHERE ret_close IS NOT NULL
                            GROUP BY date
                        ),
                        cum_base AS (
                            SELECT 
                                date,
                                stock_count,
                                med_open,
                                med_high,
                                med_low,
                                med_close,
                                total_volume,
                                EXP(SUM(LN(1.0 + COALESCE(med_close, 0.0))) OVER (ORDER BY date)) * 100.0 as close_idx
                            FROM daily_med
                        ),
                        daily_ohlc AS (
                            SELECT 
                                date,
                                stock_count,
                                total_volume as volume,
                                LAG(close_idx, 1, close_idx) OVER (ORDER BY date) * (1.0 + COALESCE(med_open, 0.0)) as raw_open,
                                LAG(close_idx, 1, close_idx) OVER (ORDER BY date) * (1.0 + COALESCE(med_high, 0.0)) as raw_high,
                                LAG(close_idx, 1, close_idx) OVER (ORDER BY date) * (1.0 + COALESCE(med_low, 0.0)) as raw_low,
                                close_idx as raw_close
                            FROM cum_base
                        ),
                        spy_daily AS (
                            SELECT date, close as spy_close 
                            FROM daily_bars 
                            WHERE symbol = 'SPY' AND date <= '{target_date}'
                        ),
                        daily_with_spy AS (
                            SELECT 
                                d.date,
                                ROUND(d.raw_open, 2) as open,
                                ROUND(GREATEST(d.raw_high, d.raw_open, d.raw_close), 2) as high,
                                ROUND(LEAST(d.raw_low, d.raw_open, d.raw_close), 2) as low,
                                ROUND(d.raw_close, 2) as close,
                                d.volume,
                                s.spy_close,
                                ROUND((d.raw_close / NULLIF(s.spy_close, 0)) * 100.0, 4) as rs_line
                            FROM daily_ohlc d
                            LEFT JOIN spy_daily s ON d.date = s.date
                        ),
                        with_ma AS (
                            SELECT 
                                *,
                                ROUND(AVG(close) OVER (ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW), 2) as sma_200d,
                                ROUND(AVG(close) OVER (ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW), 2) as sma_50d,
                                ROUND(AVG(rs_line) OVER (ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW), 4) as rs_sma_200d
                            FROM daily_with_spy
                        ),
                        with_mansfield AS (
                            SELECT 
                                *,
                                ROUND(((rs_line / NULLIF(rs_sma_200d, 0)) - 1.0) * 100.0, 2) as mansfield_rs,
                                ROUND((sma_200d - LAG(sma_200d, 20) OVER (ORDER BY date)) / NULLIF(LAG(sma_200d, 20) OVER (ORDER BY date), 0) * 100.0, 2) as ma_slope_pct
                            FROM with_ma
                        )
                        SELECT 
                            date::VARCHAR as date, open, high, low, close, volume, sma_200d, sma_50d, rs_line, mansfield_rs, ma_slope_pct,
                            CASE 
                                WHEN close > sma_200d AND ma_slope_pct > 0.05 AND mansfield_rs > 0 THEN 'Stage 2 (Advancing)'
                                WHEN close > sma_200d AND ma_slope_pct >= -0.15 THEN 'Stage 1 (Basing/Transition)'
                                WHEN close < sma_200d AND ma_slope_pct < -0.05 AND mansfield_rs < 0 THEN 'Stage 4 (Declining)'
                                ELSE 'Stage 3 (Topping/Distribution)'
                            END as stage
                        FROM with_mansfield 
                        ORDER BY date ASC;
                    """

                b_rows = conn.execute(bars_query).fetchall()
                if not b_rows:
                    return self._empty_group_bars_response(g_name, g_type, tf, target_date)

                cols = [c[0] for c in conn.description]
                all_bars = [dict(zip(cols, r)) for r in b_rows]
                sliced_bars = all_bars[-limit_n:] if len(all_bars) > limit_n else all_bars

                # 5. Extract latest stage summary
                latest_bar = sliced_bars[-1]
                st_label = latest_bar.get("stage", "Stage 1 (Basing/Transition)")
                ma_val = latest_bar.get("sma_40w") if tf == "weekly" else latest_bar.get("sma_200d")
                ma_slope = latest_bar.get("ma_slope_pct")
                mrs = latest_bar.get("mansfield_rs")
                close_p = latest_bar.get("close", 0.0)

                badge_map = {
                    "Stage 2 (Advancing)": ("Stage 2", "#10b981", f"Bullish: Price > rising { '40-week' if tf == 'weekly' else '200-day' } MA with positive Mansfield RS outperformance"),
                    "Stage 1 (Basing/Transition)": ("Stage 1", "#38bdf8", f"Neutral: { '40-week' if tf == 'weekly' else '200-day' } MA is flat or stabilizing. Base accumulation phase"),
                    "Stage 3 (Topping/Distribution)": ("Stage 3", "#f59e0b", f"Caution: { '40-week' if tf == 'weekly' else '200-day' } MA has flattened / lost upward momentum. Distribution warning"),
                    "Stage 4 (Declining)": ("Stage 4", "#f43f5e", f"Bearish: Price < declining { '40-week' if tf == 'weekly' else '200-day' } MA with negative Mansfield RS underperformance")
                }
                badge, color, bias_desc = badge_map.get(st_label, ("Stage 1", "#38bdf8", "Neutral"))

                stage_summary = {
                    "stage": st_label,
                    "stage_badge": badge,
                    "stage_color": color,
                    "ma_name": "40w SMA" if tf == "weekly" else "200d SMA",
                    "ma_val": float(ma_val) if ma_val is not None else None,
                    "ma_slope_pct": float(ma_slope) if ma_slope is not None else 0.0,
                    "mansfield_rs": float(mrs) if mrs is not None else 0.0,
                    "is_above_ma": (close_p > ma_val) if (close_p is not None and ma_val is not None) else False,
                    "pct_above_200d": pct_above_200d,
                    "pct_in_stage2": pct_in_stage2,
                    "bias": bias_desc
                }

                breadth = {
                    "total_stocks": total_stocks,
                    "above_200d_count": above_200d_count,
                    "pct_above_200d": pct_above_200d,
                    "stage2_count": stage2_count,
                    "pct_in_stage2": pct_in_stage2,
                    "leaders": leaders
                }

                result = {
                    "name": g_name,
                    "type": g_type,
                    "timeframe": tf,
                    "as_of": target_date,
                    "stage_summary": stage_summary,
                    "breadth": breadth,
                    "bars": sliced_bars
                }

                # Manage cache
                if len(self._bars_cache) > 60:
                    self._bars_cache.pop(next(iter(self._bars_cache)))
                self._bars_cache[cache_key] = result

                return result

        except Exception as e:
            logger.error(f"Error computing group bars ({group_type}, {group_name}): {e}", exc_info=True)
            return self._empty_group_bars_response(g_name, g_type, tf, date or "")


