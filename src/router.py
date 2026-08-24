import json
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from src.services import config_service, db_service, sync_service

router = APIRouter()

# ----------------- Models -----------------
class ConfigUpdateSchema(BaseModel):
    min_price: float
    min_volume_sma_50: int
    min_rs_percentile: int
    min_eps_growth_qoq: float
    provider_selected: str
    price_provider_selected: str

class SQLQuerySchema(BaseModel):
    query: str

class SyncTriggerSchema(BaseModel):
    skip_prices: bool = False
    skip_fundamentals: bool = False
    include_premarket: bool = False
    history_years: Optional[int] = None
    force_full: bool = False

class WatchlistCreateSchema(BaseModel):
    name: str

class WatchlistItemAddSchema(BaseModel):
    symbol: str

class RulesUpdateSchema(BaseModel):
    content: str

class CandidateFilterSchema(BaseModel):
    date: Optional[str] = None
    min_price: Optional[float] = None
    minPriceFilter: Optional[float] = None
    min_volume_sma_50: Optional[int] = None
    minVolFilter: Optional[int] = None
    min_rs_percentile: Optional[int] = None
    minRsFilter: Optional[int] = None
    min_eps_growth_qoq: Optional[float] = None
    minEpsGrowthFilter: Optional[float] = None
    min_atr: Optional[float] = None
    minAtrFilter: Optional[float] = None
    enforce_stage2: Optional[bool] = None
    enforceStage2: Optional[bool] = None
    enable_power_play: Optional[bool] = None
    enablePowerPlay: Optional[bool] = None
    enable_ipo_base: Optional[bool] = None
    enableIpoBase: Optional[bool] = None
    enable_vcp_setup: Optional[bool] = None
    enableVcpSetup: Optional[bool] = None
    enable_darvas_box: Optional[bool] = None
    enableDarvasBox: Optional[bool] = None
    enable_new_leaders: Optional[bool] = None
    enableNewLeaders: Optional[bool] = None
    enable_qullamaggie_breakout: Optional[bool] = None
    enableQullamaggieBreakout: Optional[bool] = None
    enable_episodic_pivot: Optional[bool] = None
    enableEpisodicPivot: Optional[bool] = None
    enable_parabolic_climax: Optional[bool] = None
    enableParabolicClimax: Optional[bool] = None
    enable_parabolic_short: Optional[bool] = None
    enableParabolicShort: Optional[bool] = None
    enable_parabolic_long: Optional[bool] = None
    enableParabolicLong: Optional[bool] = None

    # Qullamaggie Breakout
    min_1m_ret: Optional[float] = None
    min1mRetFilter: Optional[float] = None
    enable_1m_ret: Optional[bool] = None
    enable1mRet: Optional[bool] = None
    enable_ema_surfing: Optional[bool] = None
    enableEmaSurfing: Optional[bool] = None

    # EP
    min_ep_gap: Optional[float] = None
    minEpGapFilter: Optional[float] = None
    enable_ep_gap: Optional[bool] = None
    enableEpGap: Optional[bool] = None
    min_ep_rel_vol: Optional[float] = None
    minEpRelVolFilter: Optional[float] = None
    enable_ep_rel_vol: Optional[bool] = None
    enableEpRelVol: Optional[bool] = None

    # Parabolic
    min_parabolic_runup: Optional[float] = None
    minParabolicRunupFilter: Optional[float] = None
    enable_parabolic_runup: Optional[bool] = None
    enableParabolicRunup: Optional[bool] = None
    min_parabolic_ema_dist: Optional[float] = None
    minParabolicEmaDistFilter: Optional[float] = None
    enable_parabolic_ema_dist: Optional[bool] = None
    enableParabolicEmaDist: Optional[bool] = None
    min_parabolic_up_days: Optional[int] = None
    minParabolicUpDaysFilter: Optional[int] = None
    enable_parabolic_up_days: Optional[bool] = None
    enableParabolicUpDays: Optional[bool] = None

    # Power Play
    enable_pp_runup: Optional[bool] = None
    enablePpRunup: Optional[bool] = None
    enable_pp_drawdown: Optional[bool] = None
    enablePpDrawdown: Optional[bool] = None
    enable_pp_days_since_peak: Optional[bool] = None
    enablePpDaysSincePeak: Optional[bool] = None
    enable_pp_vol_ratio: Optional[bool] = None
    enablePpVolRatio: Optional[bool] = None
    min_pp_runup: Optional[float] = None
    minPpRunupFilter: Optional[float] = None
    max_pp_drawdown: Optional[float] = None
    maxPpDrawdownFilter: Optional[float] = None
    min_pp_days_since_peak: Optional[int] = None
    minPpDaysSincePeakFilter: Optional[int] = None
    max_pp_vol_ratio: Optional[float] = None
    maxPpVolRatioFilter: Optional[float] = None

    # IPO Base
    enable_ipo_age: Optional[bool] = None
    enableIpoAge: Optional[bool] = None
    enable_ipo_dist: Optional[bool] = None
    enableIpoDist: Optional[bool] = None
    enable_ipo_depth: Optional[bool] = None
    enableIpoDepth: Optional[bool] = None
    max_ipo_age: Optional[int] = None
    maxIpoAgeFilter: Optional[int] = None
    max_ipo_dist: Optional[float] = None
    maxIpoDistFilter: Optional[float] = None
    max_ipo_depth: Optional[float] = None
    maxIpoDepthFilter: Optional[float] = None

    # VCP
    enable_vcp_eps_growth: Optional[bool] = None
    enableVcpEpsGrowth: Optional[bool] = None
    enable_vcp_pattern: Optional[bool] = None
    enableVcpPattern: Optional[bool] = None

    # Darvas Box
    enable_darvas_pattern: Optional[bool] = None
    enableDarvasPattern: Optional[bool] = None
    enable_darvas_width: Optional[bool] = None
    enableDarvasWidth: Optional[bool] = None
    max_darvas_width: Optional[float] = None
    maxDarvasWidthFilter: Optional[float] = None

    # General RS / ATR
    enable_rs: Optional[bool] = None
    enableRs: Optional[bool] = None
    enable_rs_new_high: Optional[bool] = None
    enableRsNewHigh: Optional[bool] = None
    enable_atr: Optional[bool] = None
    enableAtr: Optional[bool] = None

    # New Leaders
    enable_52w_dist: Optional[bool] = None
    enable52wDist: Optional[bool] = None
    enable_surge_off_low: Optional[bool] = None
    enableSurgeOffLow: Optional[bool] = None
    enable_new_leaders_rs: Optional[bool] = None
    enableNewLeadersRs: Optional[bool] = None
    enable_new_leaders_52w_high: Optional[bool] = None
    enableNewLeaders52wHigh: Optional[bool] = None
    enable_new_leaders_base: Optional[bool] = None
    enableNewLeadersBase: Optional[bool] = None
    max_52w_dist: Optional[float] = None
    max52wDistFilter: Optional[float] = None
    min_surge_off_low: Optional[float] = None
    minSurgeOffLowFilter: Optional[float] = None
    min_new_leaders_rs: Optional[int] = None
    minNewLeadersRsFilter: Optional[int] = None


# ----------------- Endpoints -----------------

@router.get("/api/summary")
def get_summary():
    """Retrieve metadata counts and database status."""
    try:
        return db_service.get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/trading-dates")
def get_trading_dates():
    """Retrieve distinct trading dates available in daily_bars."""
    try:
        return db_service.get_available_trading_dates()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/candidates")
def post_candidates(payload: CandidateFilterSchema):
    """Retrieve candidates satisfying active screening criteria via server-side DuckDB filtering."""
    try:
        filters_dict = payload.model_dump(exclude_unset=True)
        target_date = filters_dict.pop("date", None)
        data = db_service.get_candidates(target_date=target_date, filters=filters_dict)
        return Response(content=json.dumps(data), media_type="application/json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/candidates")
def get_candidates(date: Optional[str] = None):
    """Retrieve candidates for a specific target date (default/unfiltered or date query)."""
    try:
        data = db_service.get_candidates(target_date=date)
        return Response(content=json.dumps(data), media_type="application/json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/stocks/{symbol}")
def get_stock_detail(symbol: str):
    """Retrieve metadata and quarterly financials for a symbol."""
    try:
        res = db_service.get_stock_detail(symbol)
        if not res:
            raise HTTPException(status_code=404, detail="Symbol not found")
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/stocks/{symbol}/prices")
def get_stock_prices(symbol: str, limit: Optional[int] = None):
    """Retrieve historical daily price bars for charting."""
    try:
        return db_service.get_stock_prices(symbol, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/stocks/{symbol}/financials")
def get_stock_financials(symbol: str):
    """Retrieve detailed yearly and quarterly financials for a symbol."""
    try:
        res = db_service.get_stock_financials(symbol)
        if not res:
            raise HTTPException(status_code=404, detail="Symbol not found")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/config")
def get_config():
    """Retrieve current screener parameters."""
    try:
        return config_service.get_config()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/config")
def update_config(payload: ConfigUpdateSchema):
    """Update config parameters inside config.yaml."""
    try:
        return config_service.update_config(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/sync/run")
def trigger_sync_run(background_tasks: BackgroundTasks, payload: SyncTriggerSchema):
    """Triggers the screening pipeline in the background."""
    return sync_service.trigger_sync_run(
        background_tasks,
        skip_prices=payload.skip_prices,
        skip_fundamentals=payload.skip_fundamentals,
        include_premarket=payload.include_premarket,
        history_years=payload.history_years,
        force_full=payload.force_full
    )

@router.get("/api/sync/status")
def get_sync_status():
    """Retrieve background screening run logs and status."""
    return sync_service.get_sync_status()

@router.post("/api/sql/query")
def execute_sql_query(payload: SQLQuerySchema):
    """Executes a raw SQL query on the database in read-only mode."""
    return db_service.execute_sql_query(payload.query)

@router.get("/api/market-monitor")
def get_market_monitor(limit: int = 252):
    """Retrieve Stockbee Market Monitor daily breadth metrics and regime summary across the entire market."""
    try:
        return db_service.get_market_monitor(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/sectors/etfs")
def get_sector_etfs():
    """Retrieve Sector ETF performance, RS Rank, and RS Rank Changes (1W, 1M, 3M)."""
    try:
        return db_service.get_sector_etf_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/sectors/{sector_name}/stocks")
def get_sector_stocks(sector_name: str):
    """Retrieve active candidate stocks matching a specific sector or industry group."""
    try:
        return db_service.get_sector_stocks(sector_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- Watchlist Endpoints -----------------

@router.get("/api/watchlists")
def get_watchlists():
    """Retrieve all user watchlists and item counts."""
    try:
        return db_service.get_watchlists()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/watchlists")
def create_watchlist(payload: WatchlistCreateSchema):
    """Create a new watchlist."""
    try:
        return db_service.create_watchlist(payload.name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/watchlists/{watchlist_id}")
def delete_watchlist(watchlist_id: int):
    """Delete a watchlist."""
    try:
        return db_service.delete_watchlist(watchlist_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/watchlists/{watchlist_id}/items")
def get_watchlist_items(watchlist_id: int):
    """Get all ticker items in a specific watchlist."""
    try:
        return db_service.get_watchlist_items(watchlist_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/watchlists/{watchlist_id}/items")
def add_watchlist_item(watchlist_id: int, payload: WatchlistItemAddSchema):
    """Add a stock symbol to a specific watchlist."""
    try:
        return db_service.add_watchlist_item(watchlist_id, payload.symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/watchlists/{watchlist_id}/items")
def clear_watchlist_items(watchlist_id: int):
    """Clear all stock symbols from a watchlist."""
    try:
        return db_service.clear_watchlist_items(watchlist_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/watchlists/{watchlist_id}/items/{symbol}")
def remove_watchlist_item(watchlist_id: int, symbol: str):
    """Remove a single stock symbol from a watchlist."""
    try:
        return db_service.remove_watchlist_item(watchlist_id, symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- Setups & Rules Playbook Endpoints -----------------

@router.get("/api/setups-and-rules")
def get_setups_and_rules():
    """Retrieve markdown content of Setups & Rules playbook."""
    import os
    filepath = "setups_and_rules.md"
    if not os.path.exists(filepath):
        return {"content": "# Setups & Rules\n\nNo setups or rules file found yet."}
    with open(filepath, "r", encoding="utf-8") as f:
        return {"content": f.read()}

@router.post("/api/setups-and-rules")
def update_setups_and_rules(payload: RulesUpdateSchema):
    """Update markdown content of Setups & Rules playbook."""
    filepath = "setups_and_rules.md"
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(payload.content)
        return {"status": "success", "message": "Setups & Rules saved successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



