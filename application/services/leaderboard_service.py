import logging
from typing import List, Dict, Any, Optional
from collections import defaultdict
import duckdb
import pandas as pd

logger = logging.getLogger(__name__)


class LeaderboardService:
    def __init__(self, db_path: str = "data.db"):
        self.db_path = db_path

    def _get_connection(self):
        return duckdb.connect(self.db_path, read_only=True)

    def get_leaderboard(
        self,
        target_date: Optional[str] = None,
        board: str = "near_52w_high",
        min_rs: Optional[int] = None,
        max_dist_high: float = 10.0,
        sector: Optional[str] = None,
        industry: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes Boards Playbook query:
        Boards supported:
        - near_52w_high: Stocks within max_dist_high% (default 10%) of 52-week high with bullish MAs: Close > 10 EMA > 20 EMA > 50 EMA
        - new_highs: Stocks reaching new 52-week highs on the date (is_52w_high=True or high >= high_52w or dist_from_52w_high <= 0.2)
        - gainers: Top % gainers for the session (change_pct > 0, price >= $5, volume >= 50k)
        - strongest: Highest relative strength leaders (RS >= 90, price > 50 EMA, 10 > 20 EMA)
        - pre_market: Opening gap and pre-market momentum leaders (Gap >= 1.0%)

        Includes:
        - Exact metrics: Today (% change), RVOL, 1W (% return over 5 trading days), 1M, 3M, YTD, Pivot RS, Off 52w, Days at Highs, ATR extension
        - Sector & Industry concentration (Left/Right two-level hierarchy)
        - Top 20 RS institutional clustering
        """
        try:
            with self._get_connection() as conn:
                # 1. Resolve actual target date
                if target_date and str(target_date).strip().lower() != "latest":
                    target_dt_input = str(target_date).strip()
                    row = conn.execute(
                        "SELECT MAX(date) FROM daily_bars WHERE date <= CAST(? AS DATE)",
                        [target_dt_input]
                    ).fetchone()
                    if row and row[0]:
                        actual_date = row[0]
                        actual_date_str = actual_date.strftime("%Y-%m-%d") if hasattr(actual_date, "strftime") else str(actual_date)
                    else:
                        actual_date_str = target_dt_input
                else:
                    max_dt = conn.execute("SELECT MAX(date) FROM daily_bars WHERE date <= CURRENT_DATE").fetchone()[0]
                    if not max_dt:
                        max_dt = conn.execute("SELECT MAX(date) FROM daily_bars").fetchone()[0]
                    if not max_dt:
                        return {"summary": {}, "sector_distribution": [], "stocks": []}
                    actual_date_str = max_dt.strftime("%Y-%m-%d") if hasattr(max_dt, "strftime") else str(max_dt)

                # Previous date for day change calculation
                prev_row = conn.execute(
                    "SELECT MAX(date) FROM daily_bars WHERE date < CAST(? AS DATE)",
                    [actual_date_str]
                ).fetchone()
                prev_date_str = (
                    prev_row[0].strftime("%Y-%m-%d") if (prev_row and prev_row[0] and hasattr(prev_row[0], "strftime"))
                    else str(prev_row[0]) if (prev_row and prev_row[0]) else actual_date_str
                )

                # 5 trading days ago for 1-Week (1W) return calculation (exact 1W metric)
                w1_row = conn.execute("""
                    SELECT date FROM (
                        SELECT DISTINCT date FROM daily_bars WHERE date < CAST(? AS DATE) ORDER BY date DESC LIMIT 5
                    ) ORDER BY date ASC LIMIT 1
                """, [actual_date_str]).fetchone()
                w1_date_str = (
                    w1_row[0].strftime("%Y-%m-%d") if (w1_row and w1_row[0] and hasattr(w1_row[0], "strftime"))
                    else str(w1_row[0]) if (w1_row and w1_row[0]) else prev_date_str
                )

                # Normalize board key
                board_key = (board or "near_52w_high").strip().lower()
                if board_key in ("near_highs", "near_52w", "near_52w_highs"):
                    board_key = "near_52w_high"
                elif board_key in ("new_highs", "new_high", "new_52w_highs", "new_52w_high"):
                    board_key = "new_highs"
                elif board_key in ("gainer", "top_gainers"):
                    board_key = "gainers"
                elif board_key in ("strong", "rs_leaders"):
                    board_key = "strongest"
                elif board_key in ("premarket", "pre_market_gainers"):
                    board_key = "pre_market"

                # Default min_rs based on board
                if min_rs is None:
                    if board_key in ("gainers", "new_highs", "pre_market"):
                        min_rs = 0
                    else:
                        min_rs = 80
                else:
                    try:
                        min_rs = int(min_rs)
                    except (ValueError, TypeError):
                        min_rs = 0

                # Ensure temp_emas exists
                conn.execute("CREATE OR REPLACE TEMP TABLE temp_emas (symbol VARCHAR, ema_10 DOUBLE, ema_20 DOUBLE, ema_50 DOUBLE)")

                # Check if EMA 10 is populated in daily_bars for this date
                has_ema_count = conn.execute(
                    "SELECT count(ema_10) FROM daily_bars WHERE date = CAST(? AS DATE) AND ema_10 IS NOT NULL",
                    [actual_date_str]
                ).fetchone()[0]

                if has_ema_count < 50:
                    # Dynamically compute EMAs for candidate stocks on older dates
                    hist_rows = conn.execute("""
                        WITH candidates AS (
                            SELECT symbol FROM daily_bars WHERE date = CAST(? AS DATE)
                        ),
                        ranked_bars AS (
                            SELECT b.symbol, b.date, b.close,
                                   ROW_NUMBER() OVER (PARTITION BY b.symbol ORDER BY b.date DESC) as rn
                            FROM daily_bars b
                            JOIN candidates c ON b.symbol = c.symbol
                            WHERE b.date <= CAST(? AS DATE)
                        )
                        SELECT symbol, date, close
                        FROM ranked_bars
                        WHERE rn <= 60
                        ORDER BY symbol, date ASC
                    """, [actual_date_str, actual_date_str]).fetchall()

                    sym_history = defaultdict(list)
                    for s, dt, c in hist_rows:
                        if c is not None:
                            sym_history[s].append(float(c))

                    def _calc_ema(prices, span):
                        if len(prices) < span:
                            return None
                        k = 2.0 / (span + 1.0)
                        val = prices[0]
                        for p in prices[1:]:
                            val = p * k + val * (1.0 - k)
                        return round(val, 2)

                    records = [
                        (s, _calc_ema(p, 10), _calc_ema(p, 20), _calc_ema(p, 50))
                        for s, p in sym_history.items()
                    ]
                    if records:
                        df_temp = pd.DataFrame(records, columns=['symbol', 'ema_10', 'ema_20', 'ema_50'])
                        conn.register('df_reg', df_temp)
                        conn.execute("INSERT INTO temp_emas SELECT * FROM df_reg")
                        conn.unregister('df_reg')

                # Configure board query parameters and clauses
                join_gainers = ""
                if board_key == "near_52w_high":
                    board_where = """
                        AND d.dist_from_52w_high IS NOT NULL
                        AND d.dist_from_52w_high <= ?
                        AND d.close > COALESCE(d.ema_10, te.ema_10) 
                        AND COALESCE(d.ema_10, te.ema_10) > COALESCE(d.ema_20, te.ema_20) 
                        AND COALESCE(d.ema_20, te.ema_20) > COALESCE(d.ema_50, te.ema_50, d.sma_50)
                    """
                    board_params = [float(max_dist_high)]
                    order_by = "t.pivot_rs DESC, t.rs_rank DESC, t.rvol DESC"
                elif board_key == "new_highs":
                    board_where = """
                        AND (d.is_52w_high = true OR d.high >= d.high_52w OR d.dist_from_52w_high <= 0.2)
                        AND d.close >= 5.0
                    """
                    board_params = []
                    order_by = "t.pivot_rs DESC, t.rs_rank DESC, t.rvol DESC"
                elif board_key == "gainers":
                    join_gainers = "JOIN daily_bars p_gain ON d.symbol = p_gain.symbol"
                    board_where = """
                        AND p_gain.date = CAST(? AS DATE)
                        AND d.close > p_gain.close
                        AND d.close >= 5.0
                        AND d.volume >= 50000
                    """
                    board_params = [prev_date_str]
                    order_by = "change_pct DESC, t.rvol DESC"
                elif board_key == "strongest":
                    board_where = """
                        AND d.rs_rank >= 90
                        AND d.close >= 5.0
                        AND d.close > COALESCE(d.ema_50, te.ema_50, d.sma_50)
                        AND COALESCE(d.ema_10, te.ema_10) > COALESCE(d.ema_20, te.ema_20)
                    """
                    board_params = []
                    order_by = "t.rs_rank DESC, t.pivot_rs DESC, t.rvol DESC"
                elif board_key == "pre_market":
                    board_where = """
                        AND COALESCE(d.gap_pct, 0.0) >= 1.0
                        AND d.close >= 5.0
                    """
                    board_params = []
                    order_by = "t.gap_pct DESC, t.rvol DESC"
                else:
                    board_where = """
                        AND d.dist_from_52w_high IS NOT NULL
                        AND d.dist_from_52w_high <= ?
                    """
                    board_params = [float(max_dist_high)]
                    order_by = "t.pivot_rs DESC, t.rs_rank DESC, t.rvol DESC"

                # 2. Main query for all qualified stocks
                query = f"""
                WITH universe_perf AS (
                    SELECT 
                        symbol,
                        date,
                        (COALESCE(ret_1m, 0) * 0.50 + COALESCE(ret_3m, 0) * 0.35 + COALESCE(ret_6m, 0) * 0.15) as prs_raw
                    FROM daily_bars
                    WHERE date <= CAST(? AS DATE)
                      AND date >= (SELECT MAX(date) - INTERVAL '40 days' FROM daily_bars WHERE date <= CAST(? AS DATE))
                ),
                ranked_prs AS (
                    SELECT 
                        symbol,
                        date,
                        CAST(PERCENT_RANK() OVER (PARTITION BY date ORDER BY prs_raw) * 98 + 1 AS INTEGER) as prs_rank
                    FROM universe_perf
                ),
                shift_prs AS (
                    SELECT 
                        symbol,
                        date,
                        prs_rank as pivot_rs,
                        LAG(prs_rank, 20) OVER (PARTITION BY symbol ORDER BY date) as prs_rank_20d_ago
                    FROM ranked_prs
                ),
                prs_at_target AS (
                    SELECT 
                        symbol,
                        pivot_rs,
                        (pivot_rs - COALESCE(prs_rank_20d_ago, pivot_rs)) as rs_shift
                    FROM shift_prs
                    WHERE date = CAST(? AS DATE)
                ),
                target_universe AS (
                    SELECT 
                        d.symbol,
                        s.name,
                        COALESCE(s.sector, 'Unassigned') as sector,
                        COALESCE(s.industry, 'Unassigned') as industry,
                        s.exchange,
                        d.close,
                        d.volume,
                        d.vol_50d_ma,
                        COALESCE(d.rel_vol_50d, 0.0) as rvol,
                        d.rs_rank,
                        d.rs_score,
                        COALESCE(prs.pivot_rs, d.rs_rank) as pivot_rs,
                        COALESCE(prs.rs_shift, 0) as rs_shift,
                        d.dist_from_52w_high,
                        d.high_52w,
                        COALESCE(d.ema_10, te.ema_10) as ema_10,
                        COALESCE(d.ema_20, te.ema_20) as ema_20,
                        COALESCE(d.ema_50, te.ema_50, d.sma_50) as ema_50,
                        COALESCE(d.atr_20d, 3.0) as atr_20d,
                        ROUND((d.close - COALESCE(d.ema_10, te.ema_10)) / NULLIF(d.close * (COALESCE(d.atr_20d, 3.0) / 100.0), 0), 2) as ext_atr_10ema,
                        ROUND((d.close - COALESCE(d.ema_20, te.ema_20)) / NULLIF(d.close * (COALESCE(d.atr_20d, 3.0) / 100.0), 0), 2) as ext_atr_20ema,
                        ROUND(d.ret_1m, 2) as ret_1m,
                        ROUND(d.ret_3m, 2) as ret_3m,
                        ROUND(d.ret_6m, 2) as ret_6m,
                        COALESCE(d.gap_pct, 0.0) as gap_pct
                    FROM daily_bars d
                    JOIN symbols s ON d.symbol = s.symbol
                    LEFT JOIN temp_emas te ON d.symbol = te.symbol
                    LEFT JOIN prs_at_target prs ON d.symbol = prs.symbol
                    {join_gainers}
                    WHERE d.date = CAST(? AS DATE)
                      AND (s.asset_type IS NULL OR UPPER(s.asset_type) NOT LIKE '%ETF%')
                      AND (s.industry IS NULL OR UPPER(s.industry) NOT LIKE '%ETF%')
                      {board_where}
                ),
                prev_closes AS (
                    SELECT 
                        b.symbol,
                        b.close as prev_close
                    FROM daily_bars b
                    JOIN target_universe t ON b.symbol = t.symbol
                    WHERE b.date = CAST(? AS DATE)
                ),
                w1_closes AS (
                    SELECT 
                        b.symbol,
                        b.close as w1_close
                    FROM daily_bars b
                    JOIN target_universe t ON b.symbol = t.symbol
                    WHERE b.date = CAST(? AS DATE)
                ),
                ytd_closes AS (
                    SELECT 
                        b.symbol,
                        b.close as ytd_base_close
                    FROM daily_bars b
                    JOIN target_universe t ON b.symbol = t.symbol
                    WHERE b.date = (SELECT MAX(date) FROM daily_bars WHERE date < date_trunc('year', CAST(? AS DATE)))
                ),
                ranked_history AS (
                    SELECT 
                        b.symbol,
                        b.date,
                        b.dist_from_52w_high <= 10.0 as is_near_high,
                        ROW_NUMBER() OVER (PARTITION BY b.symbol ORDER BY b.date DESC) as rn
                    FROM daily_bars b
                    JOIN target_universe t ON b.symbol = t.symbol
                    WHERE b.date <= CAST(? AS DATE)
                ),
                first_break AS (
                    SELECT 
                        symbol,
                        MIN(rn) - 1 as days_at_highs
                    FROM ranked_history
                    WHERE NOT is_near_high
                    GROUP BY symbol
                )
                SELECT 
                    t.symbol,
                    t.name,
                    t.sector,
                    t.industry,
                    t.exchange,
                    t.close,
                    p.prev_close,
                    ROUND((t.close - p.prev_close) / NULLIF(p.prev_close, 0) * 100, 2) as change_pct,
                    t.volume,
                    t.vol_50d_ma,
                    t.rvol,
                    t.rs_rank,
                    t.rs_score,
                    t.pivot_rs,
                    t.rs_shift,
                    t.dist_from_52w_high,
                    t.high_52w,
                    t.ema_10,
                    t.ema_20,
                    t.ema_50,
                    t.atr_20d,
                    t.ext_atr_10ema,
                    t.ext_atr_20ema,
                    COALESCE(fb.days_at_highs, 252) as days_at_highs,
                    t.ret_1m,
                    t.ret_3m,
                    t.ret_6m,
                    ROUND((t.close - y.ytd_base_close) / NULLIF(y.ytd_base_close, 0) * 100, 2) as ret_ytd,
                    ROUND((t.close - w1.w1_close) / NULLIF(w1.w1_close, 0) * 100, 2) as ret_1w,
                    t.gap_pct
                FROM target_universe t
                LEFT JOIN prev_closes p ON t.symbol = p.symbol
                LEFT JOIN w1_closes w1 ON t.symbol = w1.symbol
                LEFT JOIN ytd_closes y ON t.symbol = y.symbol
                LEFT JOIN first_break fb ON t.symbol = fb.symbol
                ORDER BY {order_by}
                """

                params = (
                    [actual_date_str, actual_date_str, actual_date_str, actual_date_str]
                    + board_params
                    + [prev_date_str, w1_date_str, actual_date_str, actual_date_str]
                )

                rows = conn.execute(query, params).fetchall()

                board_meta = {
                    "near_52w_high": {
                        "title": "Near 52w high",
                        "desc_template": "{count} stocks within 10% of their 52-week high, price > 10 > 20 > 50 EMA as of {date}"
                    },
                    "new_highs": {
                        "title": "New highs",
                        "desc_template": "{count} stocks reaching new 52-week highs as of {date}"
                    },
                    "gainers": {
                        "title": "Gainers",
                        "desc_template": "{count} top daily percentage gainers (price ≥ $5, vol ≥ 50k) as of {date}"
                    },
                    "strongest": {
                        "title": "Strongest",
                        "desc_template": "{count} relative strength leaders (RS ≥ 90, price > 50 EMA) as of {date}"
                    },
                    "pre_market": {
                        "title": "Pre-market",
                        "desc_template": "{count} opening gap and pre-market leaders (Gap ≥ +1.0%) as of {date}"
                    }
                }
                meta = board_meta.get(board_key, board_meta["near_52w_high"])
                board_title = meta["title"]

                # Process raw rows into structured stock dicts
                all_stocks = []
                for r in rows:
                    sym = r[0]
                    name = r[1] or sym
                    sec = r[2] or "Unassigned"
                    ind = r[3] or "Unassigned"
                    exch = r[4] or ""
                    close_price = round(float(r[5]), 2) if r[5] is not None else 0.0
                    prev_close = round(float(r[6]), 2) if r[6] is not None else None
                    chg_pct = round(float(r[7]), 2) if r[7] is not None else 0.0
                    vol = int(r[8]) if r[8] is not None else 0
                    vol_ma = round(float(r[9]), 0) if r[9] is not None else 0
                    rvol = round(float(r[10]), 2) if r[10] is not None else 0.0
                    rs_rank = int(r[11]) if r[11] is not None else 0
                    rs_score = round(float(r[12]), 1) if r[12] is not None else 0.0
                    pivot_rs = int(r[13]) if r[13] is not None else rs_rank
                    rs_shift = int(r[14]) if r[14] is not None else 0
                    dist_52w = round(float(r[15]), 2) if r[15] is not None else 0.0
                    high_52w = round(float(r[16]), 2) if r[16] is not None else 0.0
                    ema10 = round(float(r[17]), 2) if r[17] is not None else None
                    ema20 = round(float(r[18]), 2) if r[18] is not None else None
                    ema50 = round(float(r[19]), 2) if r[19] is not None else None
                    atr20d = round(float(r[20]), 2) if r[20] is not None else 0.0
                    ext_10ema = round(float(r[21]), 2) if r[21] is not None else 0.0
                    ext_20ema = round(float(r[22]), 2) if r[22] is not None else 0.0
                    days_at_highs = int(r[23]) if r[23] is not None else 0
                    ret_1m = round(float(r[24]), 2) if r[24] is not None else None
                    ret_3m = round(float(r[25]), 2) if r[25] is not None else None
                    ret_6m = round(float(r[26]), 2) if r[26] is not None else None
                    ret_ytd = round(float(r[27]), 2) if r[27] is not None else None
                    ret_1w = round(float(r[28]), 2) if r[28] is not None else None
                    gap_pct = round(float(r[29]), 2) if r[29] is not None else 0.0

                    # Status categorizations based on playbook
                    # Days at Highs: 30-120 sweet spot, <30 fresh breakout, >120 extended/mature
                    if 30 <= days_at_highs <= 120:
                        status_days = "sweet_spot"
                    elif days_at_highs < 30:
                        status_days = "fresh"
                    else:
                        status_days = "extended"

                    # Extension in ATRs from 10 EMA: <= 2.0 healthy, 2.0-3.0 normal, >3.0 overextended
                    if ext_10ema <= 2.0:
                        status_atr = "healthy"
                    elif ext_10ema <= 3.0:
                        status_atr = "normal"
                    else:
                        status_atr = "overextended"

                    # RVOL expansion: >= 1.2x (120%)
                    status_rvol = "expanding" if rvol >= 1.2 else "normal"

                    all_stocks.append({
                        "symbol": sym,
                        "name": name,
                        "sector": sec,
                        "industry": ind,
                        "exchange": exch,
                        "close": close_price,
                        "prev_close": prev_close,
                        "change_pct": chg_pct,
                        "volume": vol,
                        "vol_50d_ma": vol_ma,
                        "rvol": rvol,
                        "rs_rank": rs_rank,
                        "rs_score": rs_score,
                        "pivot_rs": pivot_rs,
                        "rs_shift": rs_shift,
                        "is_prs_90": bool(pivot_rs >= 90),
                        "dist_from_52w_high": dist_52w,
                        "high_52w": high_52w,
                        "ema_10": ema10,
                        "ema_20": ema20,
                        "ema_50": ema50,
                        "atr_20d": atr20d,
                        "ext_atr_10ema": ext_10ema,
                        "ext_atr_20ema": ext_20ema,
                        "days_at_highs": days_at_highs,
                        "ret_1w": ret_1w,
                        "ret_1m": ret_1m,
                        "ret_3m": ret_3m,
                        "ret_6m": ret_6m,
                        "ret_ytd": ret_ytd,
                        "gap_pct": gap_pct,
                        "status_days": status_days,
                        "status_atr": status_atr,
                        "status_rvol": status_rvol
                    })

                total_all = len(all_stocks)
                if total_all == 0:
                    empty_desc = f"0 stocks found for {board_title} as of {actual_date_str}"
                    return {
                        "date": actual_date_str,
                        "board": board_key,
                        "board_title": board_title,
                        "board_description": empty_desc,
                        "summary": {
                            "board": board_key,
                            "board_title": board_title,
                            "board_description": empty_desc,
                            "total_candidates": 0,
                            "total_universe_qualified": 0,
                            "total_sectors": 0,
                            "total_industries": 0,
                            "top_cluster_industry": "None",
                            "top_cluster_count": 0,
                            "top_cluster_stocks": [],
                            "date": actual_date_str,
                            "top_sector": "None",
                            "top_sector_pct": 0,
                            "top_3_sectors_pct": 0,
                            "median_days_at_highs": 0,
                            "sweet_spot_count": 0,
                            "healthy_atr_count": 0,
                            "expanding_vol_count": 0,
                            "prs_90_count": 0,
                            "accelerating_count": 0
                        },
                        "sector_distribution": [],
                        "industry_distribution": [],
                        "stocks": []
                    }

                # 3. Calculate Sector & Industry Concentration (Two-Level Hierarchical Workflow)
                sec_map = {}
                ind_map = {}

                for s in all_stocks:
                    if s["rs_rank"] < min_rs:
                        continue
                    sec_name = s["sector"]
                    ind_name = s["industry"]
                    dist = float(s["dist_from_52w_high"]) if s["dist_from_52w_high"] is not None else 0.0
                    days = int(s["days_at_highs"]) if s["days_at_highs"] is not None else 0

                    stock_item = {
                        "symbol": s["symbol"],
                        "name": s["name"],
                        "rs_rank": s["rs_rank"],
                        "pivot_rs": s.get("pivot_rs", s["rs_rank"]),
                        "rs_shift": s.get("rs_shift", 0),
                        "change_pct": s["change_pct"],
                        "close": s["close"],
                        "days_at_highs": s["days_at_highs"],
                        "ext_atr_10ema": s["ext_atr_10ema"],
                        "ret_1w": s.get("ret_1w")
                    }

                    # Sector aggregation
                    if sec_name not in sec_map:
                        sec_map[sec_name] = {
                            "sector": sec_name,
                            "count": 0,
                            "total_dist": 0.0,
                            "total_days": 0,
                            "industries": {},
                            "top_stocks": []
                        }
                    sec_map[sec_name]["count"] += 1
                    sec_map[sec_name]["total_dist"] += dist
                    sec_map[sec_name]["total_days"] += days

                    if ind_name not in sec_map[sec_name]["industries"]:
                        sec_map[sec_name]["industries"][ind_name] = {
                            "count": 0,
                            "total_dist": 0.0,
                            "total_days": 0
                        }
                    sec_map[sec_name]["industries"][ind_name]["count"] += 1
                    sec_map[sec_name]["industries"][ind_name]["total_dist"] += dist
                    sec_map[sec_name]["industries"][ind_name]["total_days"] += days

                    if len(sec_map[sec_name]["top_stocks"]) < 5:
                        sec_map[sec_name]["top_stocks"].append(stock_item)

                    # Market-wide Industry aggregation
                    ind_key = (ind_name, sec_name)
                    if ind_key not in ind_map:
                        ind_map[ind_key] = {
                            "industry": ind_name,
                            "sector": sec_name,
                            "count": 0,
                            "total_dist": 0.0,
                            "total_days": 0,
                            "top_stocks": []
                        }
                    ind_map[ind_key]["count"] += 1
                    ind_map[ind_key]["total_dist"] += dist
                    ind_map[ind_key]["total_days"] += days
                    if len(ind_map[ind_key]["top_stocks"]) < 5:
                        ind_map[ind_key]["top_stocks"].append(stock_item)

                rs_qualified_count = sum(item["count"] for item in sec_map.values()) or 1

                # Build sector_distribution list
                sector_distribution = []
                for sec_name, data in sec_map.items():
                    cnt = data["count"]
                    pct = round(cnt * 100.0 / rs_qualified_count, 1)
                    avg_dist = round(-abs(data["total_dist"] / cnt), 2)
                    avg_days = int(round(data["total_days"] / cnt))

                    # Industries inside sector
                    sub_ind_list = []
                    for ind_name, ind_data in data["industries"].items():
                        icnt = ind_data["count"]
                        sub_ind_list.append({
                            "industry": ind_name,
                            "count": icnt,
                            "pct": round(icnt * 100.0 / cnt, 1),
                            "avg_dist_52w": round(-abs(ind_data["total_dist"] / icnt), 2),
                            "avg_days_at_highs": int(round(ind_data["total_days"] / icnt))
                        })
                    sub_ind_list.sort(key=lambda x: x["count"], reverse=True)

                    sector_distribution.append({
                        "sector": sec_name,
                        "count": cnt,
                        "pct": pct,
                        "avg_dist_52w": avg_dist,
                        "avg_days_at_highs": avg_days,
                        "top_industries": sub_ind_list,
                        "top_stocks": data["top_stocks"]
                    })

                sector_distribution.sort(key=lambda x: x["count"], reverse=True)

                # Calculate Top 20 RS Leader Clusters ("Drill Deeper" institutional clustering)
                qualified_rs_stocks = [s for s in all_stocks if s["rs_rank"] >= min_rs]
                top_20_stocks = qualified_rs_stocks[:20]
                top_20_ind_counts = {}
                for s in top_20_stocks:
                    ind = s["industry"]
                    top_20_ind_counts[ind] = top_20_ind_counts.get(ind, 0) + 1

                top_cluster_industry = "None"
                top_cluster_count = 0
                top_cluster_stocks = []
                if top_20_ind_counts:
                    sorted_clusters = sorted(top_20_ind_counts.items(), key=lambda x: x[1], reverse=True)
                    if sorted_clusters:
                        top_cluster_industry = sorted_clusters[0][0]
                        top_cluster_count = sorted_clusters[0][1]
                        top_cluster_stocks = [s["symbol"] for s in top_20_stocks if s["industry"] == top_cluster_industry]

                # Build market-wide industry_distribution list
                industry_distribution = []
                for (ind_name, sec_name), data in ind_map.items():
                    cnt = data["count"]
                    pct = round(cnt * 100.0 / rs_qualified_count, 1)
                    avg_dist = round(-abs(data["total_dist"] / cnt), 2)
                    avg_days = int(round(data["total_days"] / cnt))
                    top_20_cnt = top_20_ind_counts.get(ind_name, 0)

                    industry_distribution.append({
                        "industry": ind_name,
                        "sector": sec_name,
                        "count": cnt,
                        "pct": pct,
                        "avg_dist_52w": avg_dist,
                        "avg_days_at_highs": avg_days,
                        "top_20_count": top_20_cnt,
                        "top_stocks": data["top_stocks"]
                    })

                industry_distribution.sort(key=lambda x: (x["count"], x["pct"]), reverse=True)

                # Top sector concentration calculations
                top_sector = sector_distribution[0]["sector"] if sector_distribution else "None"
                top_sector_pct = sector_distribution[0]["pct"] if sector_distribution else 0.0
                top_3_pct = sum(s["pct"] for s in sector_distribution[:3]) if sector_distribution else 0.0

                # 4. Filter stocks by user criteria (min_rs, sector, industry)
                filtered_stocks = [
                    s for s in all_stocks
                    if s["rs_rank"] >= min_rs
                    and (not sector or s["sector"].lower() == sector.strip().lower())
                    and (not industry or s["industry"].lower() == industry.strip().lower())
                ]

                # Enrich filtered stocks with cluster indicators
                for s in filtered_stocks:
                    s["top_20_group_count"] = top_20_ind_counts.get(s["industry"], 0)
                    s["is_top_cluster"] = bool(s["industry"] == top_cluster_industry and top_cluster_count >= 2)

                # 5. Summary metrics on filtered stocks
                days_list = [s["days_at_highs"] for s in filtered_stocks]
                median_days = int(sorted(days_list)[len(days_list) // 2]) if days_list else 0
                sweet_spot_count = sum(1 for s in filtered_stocks if s["status_days"] == "sweet_spot")
                healthy_atr_count = sum(1 for s in filtered_stocks if s["status_atr"] == "healthy")
                expanding_vol_count = sum(1 for s in filtered_stocks if s["status_rvol"] == "expanding")
                prs_90_count = sum(1 for s in filtered_stocks if s.get("pivot_rs", 0) >= 90)
                accelerating_count = sum(1 for s in filtered_stocks if s.get("rs_shift", 0) >= 10)

                board_description = meta["desc_template"].format(count=len(filtered_stocks), date=actual_date_str)

                summary = {
                    "board": board_key,
                    "board_title": board_title,
                    "board_description": board_description,
                    "total_candidates": len(filtered_stocks),
                    "total_universe_qualified": rs_qualified_count,
                    "total_sectors": len(sector_distribution),
                    "total_industries": len(industry_distribution),
                    "top_cluster_industry": top_cluster_industry,
                    "top_cluster_count": top_cluster_count,
                    "top_cluster_stocks": top_cluster_stocks,
                    "date": actual_date_str,
                    "top_sector": top_sector,
                    "top_sector_pct": top_sector_pct,
                    "top_3_sectors_pct": round(top_3_pct, 1),
                    "median_days_at_highs": median_days,
                    "sweet_spot_count": sweet_spot_count,
                    "healthy_atr_count": healthy_atr_count,
                    "expanding_vol_count": expanding_vol_count,
                    "prs_90_count": prs_90_count,
                    "accelerating_count": accelerating_count
                }

                return {
                    "date": actual_date_str,
                    "board": board_key,
                    "board_title": board_title,
                    "board_description": board_description,
                    "summary": summary,
                    "sector_distribution": sector_distribution,
                    "industry_distribution": industry_distribution,
                    "stocks": filtered_stocks
                }

        except Exception as e:
            logger.error(f"Error in LeaderboardService.get_leaderboard: {e}", exc_info=True)
            raise e

    def get_score_movers(
        self,
        target_date: Optional[str] = None,
        timeframe: str = "1d",
        limit: int = 5,
        min_price: float = 5.0,
        min_volume: int = 50000
    ) -> Dict[str, Any]:
        """
        Calculates Pivot Strength Score (PSS) movers:
        - Biggest gains (highest positive delta)
        - Biggest drops (largest negative delta)
        Over selectable timeframes:
        - 1d: 1 trading session delta (default)
        - 5d: 5 trading sessions delta (~1 week)
        - 20d: 20 trading sessions delta (~1 month)
        Includes recent score sparkline history for each mover.
        """
        try:
            with self._get_connection() as conn:
                # 1. Resolve actual target date
                if target_date and str(target_date).strip().lower() != "latest":
                    target_dt_input = str(target_date).strip()
                    row = conn.execute(
                        "SELECT MAX(date) FROM daily_bars WHERE date <= CAST(? AS DATE)",
                        [target_dt_input]
                    ).fetchone()
                    if row and row[0]:
                        actual_date = row[0]
                        actual_date_str = actual_date.strftime("%Y-%m-%d") if hasattr(actual_date, "strftime") else str(actual_date)
                    else:
                        actual_date_str = target_dt_input
                else:
                    max_dt = conn.execute("SELECT MAX(date) FROM daily_bars WHERE date <= CURRENT_DATE").fetchone()[0]
                    if not max_dt:
                        max_dt = conn.execute("SELECT MAX(date) FROM daily_bars").fetchone()[0]
                    if not max_dt:
                        return {"as_of_date": "", "timeframe": timeframe, "biggest_gains": [], "biggest_drops": []}
                    actual_date_str = max_dt.strftime("%Y-%m-%d") if hasattr(max_dt, "strftime") else str(max_dt)

                tf = (timeframe or "1d").strip().lower()
                if tf in ("5d", "1w", "week", "weekly"):
                    lag = 5
                    norm_tf = "5d"
                elif tf in ("20d", "1m", "month", "monthly", "21d"):
                    lag = 20
                    norm_tf = "20d"
                else:
                    lag = 1
                    norm_tf = "1d"

                sparkline_sessions = 15
                lookback_sessions = max(lag + 10, 25)

                query = """
                WITH recent_dates AS (
                    SELECT DISTINCT date FROM daily_bars 
                    WHERE date <= CAST(? AS DATE)
                    ORDER BY date DESC LIMIT ?
                ),
                min_d AS (
                    SELECT MIN(date) as min_date FROM recent_dates
                ),
                perf AS (
                    SELECT d.symbol, d.date, d.close, d.volume, d.vol_50d_ma, d.adr_20d,
                           s.name, s.sector, s.industry,
                           (COALESCE(d.ret_1m, 0) * 0.50 + COALESCE(d.ret_3m, 0) * 0.35 + COALESCE(d.ret_6m, 0) * 0.15) as prs_raw
                    FROM daily_bars d
                    JOIN symbols s ON d.symbol = s.symbol
                    WHERE d.date >= (SELECT min_date FROM min_d)
                      AND d.date <= CAST(? AS DATE)
                      AND d.close >= ?
                      AND COALESCE(d.vol_50d_ma, d.volume) >= ?
                ),
                ranked AS (
                    SELECT symbol, name, sector, industry, date, close, adr_20d,
                           CAST(PERCENT_RANK() OVER (PARTITION BY date ORDER BY prs_raw) * 98 + 1 AS INTEGER) as prs
                    FROM perf
                ),
                with_lag AS (
                    SELECT symbol, name, sector, industry, date, close, adr_20d, prs,
                           LAG(prs, ?) OVER (PARTITION BY symbol ORDER BY date) as prev_prs,
                           LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) as prev_close
                    FROM ranked
                ),
                target_movers AS (
                    SELECT symbol, name, sector, industry, close, adr_20d, prs, prev_prs,
                           (prs - prev_prs) as delta,
                           ROUND(((close - prev_close) / NULLIF(prev_close, 0)) * 100.0, 2) as change_pct
                    FROM with_lag
                    WHERE date = CAST(? AS DATE) AND prev_prs IS NOT NULL
                ),
                top_gains AS (
                    SELECT symbol, name, sector, industry, close, adr_20d, prs, prev_prs, delta, change_pct, 'gain' as move_type
                    FROM target_movers
                    ORDER BY delta DESC
                    LIMIT ?
                ),
                top_drops AS (
                    SELECT symbol, name, sector, industry, close, adr_20d, prs, prev_prs, delta, change_pct, 'drop' as move_type
                    FROM target_movers
                    ORDER BY delta ASC
                    LIMIT ?
                ),
                selected_movers AS (
                    SELECT * FROM top_gains
                    UNION ALL
                    SELECT * FROM top_drops
                ),
                sparklines AS (
                    SELECT r.symbol, LIST(r.prs ORDER BY r.date) as sparkline_scores
                    FROM ranked r
                    WHERE r.symbol IN (SELECT symbol FROM selected_movers)
                    GROUP BY r.symbol
                )
                SELECT m.symbol, m.name, m.sector, m.industry, m.close, m.adr_20d, m.prs, m.prev_prs, m.delta, m.change_pct, m.move_type,
                       s.sparkline_scores
                FROM selected_movers m
                JOIN sparklines s ON m.symbol = s.symbol
                """

                params = [
                    actual_date_str, lookback_sessions, actual_date_str,
                    float(min_price), int(min_volume),
                    lag, actual_date_str, int(limit), int(limit)
                ]

                rows = conn.execute(query, params).fetchall()

                gains = []
                drops = []
                for r in rows:
                    item = {
                        "symbol": r[0],
                        "name": r[1] or r[0],
                        "sector": r[2] or "",
                        "industry": r[3] or "",
                        "close": round(float(r[4]), 2) if r[4] is not None else None,
                        "adr_20d": round(float(r[5]), 1) if r[5] is not None else None,
                        "score": int(r[6]),
                        "prev_score": int(r[7]),
                        "delta": int(r[8]),
                        "change_pct": float(r[9]) if r[9] is not None else 0.0,
                        "sparkline": r[11][-sparkline_sessions:] if r[11] else []
                    }
                    if r[10] == "gain":
                        gains.append(item)
                    else:
                        drops.append(item)

                gains.sort(key=lambda x: x["delta"], reverse=True)
                drops.sort(key=lambda x: x["delta"])

                return {
                    "as_of_date": actual_date_str,
                    "timeframe": norm_tf,
                    "lag_sessions": lag,
                    "limit": limit,
                    "biggest_gains": gains,
                    "biggest_drops": drops
                }

        except Exception as e:
            logger.error(f"Error in LeaderboardService.get_score_movers: {e}", exc_info=True)
            raise e
