import logging
from typing import List, Dict, Any, Optional
import duckdb
from application.services.theme_service import ThemeService

logger = logging.getLogger(__name__)

SECTOR_ETF_MAPPING = {
    'Technology': 'XLK',
    'Financials': 'XLF',
    'Finance': 'XLF',
    'Health Care': 'XLV',
    'Consumer Discretionary': 'XLY',
    'Consumer Staples': 'XLP',
    'Energy': 'XLE',
    'Industrials': 'XLI',
    'Basic Materials': 'XLB',
    'Utilities': 'XLU',
    'Real Estate': 'XLRE',
    'Telecommunications': 'XLC',
    'Communication Services': 'XLC'
}


class GroupRadarService:
    def __init__(self, db_path: str = "data.db", theme_service: Optional[ThemeService] = None):
        self.db_path = db_path
        self.theme_service = theme_service or ThemeService()

    def _get_connection(self):
        return duckdb.connect(self.db_path, read_only=True)

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
                        {stock_cte}
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
                    if g_type == "sectors":
                        item["etf_symbol"] = SECTOR_ETF_MAPPING.get(item["name"])
                    results.append(item)

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
                        etf_map(sector, symbol) AS (
                            VALUES 
                                ('Technology', 'XLK'),
                                ('Financials', 'XLF'),
                                ('Health Care', 'XLV'),
                                ('Consumer Discretionary', 'XLY'),
                                ('Consumer Staples', 'XLP'),
                                ('Energy', 'XLE'),
                                ('Industrials', 'XLI'),
                                ('Basic Materials', 'XLB'),
                                ('Utilities', 'XLU'),
                                ('Real Estate', 'XLRE'),
                                ('Communication Services', 'XLC')
                        ),
                        spy AS (
                            SELECT date, close as spy_close 
                            FROM daily_bars 
                            WHERE symbol = 'SPY' AND date IN (SELECT date FROM calendar)
                        ),
                        etf_prices AS (
                            SELECT m.sector, m.symbol, d.date, d.close, s.spy_close,
                                   (d.close / NULLIF(s.spy_close, 0)) * 100.0 as rs_raw
                            FROM etf_map m
                            JOIN daily_bars d ON m.symbol = d.symbol
                            JOIN spy s ON d.date = s.date
                            WHERE d.date IN (SELECT date FROM calendar)
                        ),
                        with_rs_ratio AS (
                            SELECT sector, symbol, date, close, rs_raw,
                                   AVG(rs_raw) OVER (PARTITION BY sector ORDER BY date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) as rs_sma14
                            FROM etf_prices
                        ),
                        with_metrics AS (
                            SELECT sector, symbol, date, close, rs_raw,
                                   ROUND(100.0 + ((rs_raw - rs_sma14) / NULLIF(rs_sma14, 0)) * 100.0, 2) as rs_ratio
                            FROM with_rs_ratio
                        ),
                        with_momentum AS (
                            SELECT sector, symbol, date, close, rs_ratio,
                                   ROUND(100.0 + (rs_ratio - LAG(rs_ratio, 5) OVER (PARTITION BY sector ORDER BY date)) * 2.0, 2) as rs_momentum,
                                   ROUND((close - LAG(close, 5) OVER (PARTITION BY sector ORDER BY date)) / NULLIF(LAG(close, 5) OVER (PARTITION BY sector ORDER BY date), 0) * 100.0, 2) as ret_1w
                            FROM with_metrics
                        ),
                        ranked_dates AS (
                            SELECT *, DENSE_RANK() OVER (ORDER BY date DESC) as date_rank
                            FROM with_momentum
                        )
                        SELECT sector as name, symbol, date, rs_ratio, rs_momentum, ret_1w, date_rank
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

