import json
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from pydantic import BaseModel, Field, AliasChoices, ConfigDict
from typing import Optional

from application.services import config_service, db_service, sync_service, chart_service

logger = logging.getLogger("pivottrader.api")
router = APIRouter()

# ----------------- Models -----------------
class ConfigUpdateSchema(BaseModel):
    min_price: float
    min_volume_sma_50: int
    min_dollar_volume_50d: float = 10000000.0
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

class ChartScreenshotSchema(BaseModel):
    symbol: str
    setup_name: str = "General"
    date: str = "latest"
    image_base64: str

class CandidateFilterSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    date: Optional[str] = None
    min_price: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_price", "minPriceFilter"))
    min_volume_sma_50: Optional[int] = Field(default=None, validation_alias=AliasChoices("min_volume_sma_50", "minVolFilter"))
    min_dollar_volume_50d: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_dollar_volume_50d", "minDollarVolFilter", "min_dollar_vol"))
    min_rs_percentile: Optional[int] = Field(default=None, validation_alias=AliasChoices("min_rs_percentile", "minRsFilter"))
    min_eps_growth_qoq: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_eps_growth_qoq", "minEpsGrowthFilter"))
    min_atr: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_atr", "minAtrFilter"))
    enforce_stage2: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enforce_stage2", "enforceStage2"))
    enable_power_play: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_power_play", "enablePowerPlay"))
    enable_ipo_base: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_ipo_base", "enableIpoBase"))
    enable_vcp_setup: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_vcp_setup", "enableVcpSetup"))
    enable_new_leaders: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_new_leaders", "enableNewLeaders"))
    enable_qullamaggie_breakout: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_qullamaggie_breakout", "enableQullamaggieBreakout"))
    enable_episodic_pivot: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_episodic_pivot", "enableEpisodicPivot"))
    enable_parabolic_climax: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_parabolic_climax", "enableParabolicClimax"))
    enable_parabolic_short: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_parabolic_short", "enableParabolicShort"))
    enable_parabolic_long: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_parabolic_long", "enableParabolicLong"))

    # Qullamaggie Breakout
    min_1m_ret: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_1m_ret", "min1mRetFilter"))
    enable_1m_ret: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_1m_ret", "enable1mRet"))
    enable_ema_surfing: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_ema_surfing", "enableEmaSurfing"))

    # EP
    min_ep_gap: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_ep_gap", "minEpGapFilter"))
    enable_ep_gap: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_ep_gap", "enableEpGap"))
    min_ep_rel_vol: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_ep_rel_vol", "minEpRelVolFilter"))
    enable_ep_rel_vol: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_ep_rel_vol", "enableEpRelVol"))

    # Parabolic
    min_parabolic_runup: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_parabolic_runup", "minParabolicRunupFilter"))
    enable_parabolic_runup: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_parabolic_runup", "enableParabolicRunup"))
    min_parabolic_ema_dist: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_parabolic_ema_dist", "minParabolicEmaDistFilter"))
    enable_parabolic_ema_dist: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_parabolic_ema_dist", "enableParabolicEmaDist"))
    min_parabolic_up_days: Optional[int] = Field(default=None, validation_alias=AliasChoices("min_parabolic_up_days", "minParabolicUpDaysFilter"))
    enable_parabolic_up_days: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_parabolic_up_days", "enableParabolicUpDays"))

    # Power Play
    enable_pp_runup: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_pp_runup", "enablePpRunup"))
    enable_pp_drawdown: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_pp_drawdown", "enablePpDrawdown"))
    enable_pp_days_since_peak: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_pp_days_since_peak", "enablePpDaysSincePeak"))
    enable_pp_vol_ratio: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_pp_vol_ratio", "enablePpVolRatio"))
    min_pp_runup: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_pp_runup", "minPpRunupFilter"))
    max_pp_drawdown: Optional[float] = Field(default=None, validation_alias=AliasChoices("max_pp_drawdown", "maxPpDrawdownFilter"))
    min_pp_days_since_peak: Optional[int] = Field(default=None, validation_alias=AliasChoices("min_pp_days_since_peak", "minPpDaysSincePeakFilter"))
    max_pp_vol_ratio: Optional[float] = Field(default=None, validation_alias=AliasChoices("max_pp_vol_ratio", "maxPpVolRatioFilter"))

    # IPO Base
    enable_ipo_age: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_ipo_age", "enableIpoAge"))
    enable_ipo_dist: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_ipo_dist", "enableIpoDist"))
    enable_ipo_depth: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_ipo_depth", "enableIpoDepth"))
    max_ipo_age: Optional[int] = Field(default=None, validation_alias=AliasChoices("max_ipo_age", "maxIpoAgeFilter"))
    max_ipo_dist: Optional[float] = Field(default=None, validation_alias=AliasChoices("max_ipo_dist", "maxIpoDistFilter"))
    max_ipo_depth: Optional[float] = Field(default=None, validation_alias=AliasChoices("max_ipo_depth", "maxIpoDepthFilter"))

    # VCP
    enable_vcp_eps_growth: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_vcp_eps_growth", "enableVcpEpsGrowth"))
    enable_vcp_pattern: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_vcp_pattern", "enableVcpPattern"))

    # General RS / ATR / Pivot Tightness / Trend Intensity
    enable_rs: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_rs", "enableRs"))
    enable_rs_new_high: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_rs_new_high", "enableRsNewHigh"))
    enable_ti65: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_ti65", "enableTi65"))
    min_ti65: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_ti65", "minTi65Filter"))
    enable_atr: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_atr", "enableAtr"))
    enable_pivot_tightness: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_pivot_tightness", "enablePivotTightness"))
    max_pivot_spread: Optional[float] = Field(default=None, validation_alias=AliasChoices("max_pivot_spread", "maxPivotSpreadFilter"))
    max_pivot_clustering: Optional[float] = Field(default=None, validation_alias=AliasChoices("max_pivot_clustering", "maxPivotClusteringFilter"))
    max_pivot_vol_ratio: Optional[float] = Field(default=None, validation_alias=AliasChoices("max_pivot_vol_ratio", "maxPivotVolRatioFilter"))

    # New Leaders
    enable_52w_dist: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_52w_dist", "enable52wDist"))
    enable_surge_off_low: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_surge_off_low", "enableSurgeOffLow"))
    enable_new_leaders_rs: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_new_leaders_rs", "enableNewLeadersRs"))
    enable_new_leaders_52w_high: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_new_leaders_52w_high", "enableNewLeaders52wHigh"))
    enable_new_leaders_base: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_new_leaders_base", "enableNewLeadersBase"))
    max_52w_dist: Optional[float] = Field(default=None, validation_alias=AliasChoices("max_52w_dist", "max52wDistFilter"))
    min_surge_off_low: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_surge_off_low", "minSurgeOffLowFilter"))
    min_new_leaders_rs: Optional[int] = Field(default=None, validation_alias=AliasChoices("min_new_leaders_rs", "minNewLeadersRsFilter"))

    # Kristjan Qullamaggie Momentum Screener (1M, 3M, 6M Gainers)
    enable_qullamaggie_momentum: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_qullamaggie_momentum", "enableQullamaggieMomentum"))
    qm_subview: Optional[str] = Field(default=None, validation_alias=AliasChoices("qm_subview", "qmSubview"))
    qm_top_n: Optional[int] = Field(default=None, validation_alias=AliasChoices("qm_top_n", "qmTopN"))
    enable_adr: Optional[bool] = Field(default=None, validation_alias=AliasChoices("enable_adr", "enableAdr"))
    min_adr_20d: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_adr_20d", "minAdrFilter"))
    min_1m_gain: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_1m_gain", "min1mGainFilter"))
    min_3m_gain: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_3m_gain", "min3mGainFilter"))
    min_6m_gain: Optional[float] = Field(default=None, validation_alias=AliasChoices("min_6m_gain", "min6mGainFilter"))
    sort_by: Optional[str] = Field(default=None, validation_alias=AliasChoices("sort_by", "sortBy"))
    sort_order: Optional[str] = Field(default=None, validation_alias=AliasChoices("sort_order", "sortOrder"))


# ----------------- Endpoints -----------------

@router.get("/api/summary")
def get_summary():
    """Retrieve metadata counts and database status."""
    try:
        return db_service.get_summary()
    except Exception as e:
        logger.error(f"Error in get_summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/trading-dates")
def get_trading_dates():
    """Retrieve distinct trading dates available in daily_bars."""
    try:
        return db_service.get_available_trading_dates()
    except Exception as e:
        logger.error(f"Error in get_trading_dates: {e}", exc_info=True)
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
        logger.error(f"Error in post_candidates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/candidates")
def get_candidates(date: Optional[str] = None):
    """Retrieve candidates for a specific target date (default/unfiltered or date query)."""
    try:
        data = db_service.get_candidates(target_date=date)
        return Response(content=json.dumps(data), media_type="application/json")
    except Exception as e:
        logger.error(f"Error in get_candidates: {e}", exc_info=True)
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
        logger.error(f"Error in get_stock_detail({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/stocks/{symbol}/prices")
def get_stock_prices(symbol: str, limit: Optional[int] = None):
    """Retrieve historical daily price bars for charting."""
    try:
        return db_service.get_stock_prices(symbol, limit)
    except Exception as e:
        logger.error(f"Error in get_stock_prices({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/stocks/{symbol}/financials")
def get_stock_financials(symbol: str):
    """Retrieve detailed yearly and quarterly financials for a symbol."""
    try:
        res = db_service.get_stock_financials(symbol)
        if not res:
            raise HTTPException(status_code=404, detail="Symbol not found")
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_stock_financials({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/config")
def get_config():
    """Retrieve current screener parameters."""
    try:
        return config_service.get_config()
    except Exception as e:
        logger.error(f"Error in get_config: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/config")
def update_config(payload: ConfigUpdateSchema):
    """Update config parameters inside config.yaml."""
    try:
        return config_service.update_config(payload)
    except Exception as e:
        logger.error(f"Error in update_config: {e}", exc_info=True)
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
        logger.error(f"Error in get_market_monitor: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/sectors/etfs")
def get_sector_etfs():
    """Retrieve Sector ETF performance, RS Rank, and RS Rank Changes (1W, 1M, 3M)."""
    try:
        return db_service.get_sector_etf_performance()
    except Exception as e:
        logger.error(f"Error in get_sector_etfs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/sectors/{sector_name}/stocks")
def get_sector_stocks(sector_name: str):
    """Retrieve active candidate stocks matching a specific sector or industry group."""
    try:
        return db_service.get_sector_stocks(sector_name)
    except Exception as e:
        logger.error(f"Error in get_sector_stocks({sector_name}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- Watchlist Endpoints -----------------

@router.get("/api/watchlists")
def get_watchlists():
    """Retrieve all user watchlists and item counts."""
    try:
        return db_service.get_watchlists()
    except Exception as e:
        logger.error(f"Error in get_watchlists: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/watchlists")
def create_watchlist(payload: WatchlistCreateSchema):
    """Create a new watchlist."""
    try:
        return db_service.create_watchlist(payload.name)
    except Exception as e:
        logger.error(f"Error in create_watchlist: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/watchlists/{watchlist_id}")
def delete_watchlist(watchlist_id: int):
    """Delete a watchlist."""
    try:
        return db_service.delete_watchlist(watchlist_id)
    except Exception as e:
        logger.error(f"Error in delete_watchlist({watchlist_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/watchlists/{watchlist_id}/items")
def get_watchlist_items(watchlist_id: int):
    """Get all ticker items in a specific watchlist."""
    try:
        return db_service.get_watchlist_items(watchlist_id)
    except Exception as e:
        logger.error(f"Error in get_watchlist_items({watchlist_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/watchlists/{watchlist_id}/items")
def add_watchlist_item(watchlist_id: int, payload: WatchlistItemAddSchema):
    """Add a stock symbol to a specific watchlist."""
    try:
        return db_service.add_watchlist_item(watchlist_id, payload.symbol)
    except Exception as e:
        logger.error(f"Error in add_watchlist_item: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/watchlists/{watchlist_id}/items")
def clear_watchlist_items(watchlist_id: int):
    """Clear all stock symbols from a watchlist."""
    try:
        return db_service.clear_watchlist_items(watchlist_id)
    except Exception as e:
        logger.error(f"Error in clear_watchlist_items({watchlist_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/watchlists/{watchlist_id}/items/{symbol}")
def remove_watchlist_item(watchlist_id: int, symbol: str):
    """Remove a single stock symbol from a watchlist."""
    try:
        return db_service.remove_watchlist_item(watchlist_id, symbol)
    except Exception as e:
        logger.error(f"Error in remove_watchlist_item({symbol}): {e}", exc_info=True)
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
        logger.error(f"Error in update_setups_and_rules: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- Chart Screenshot Endpoints -----------------

@router.post("/api/charts/screenshot")
def save_chart_screenshot_endpoint(payload: ChartScreenshotSchema):
    """Save chart screenshot PNG under ./charts/{setup_name}/{symbol}_{date}.png."""
    try:
        res = chart_service.save_chart_screenshot(
            symbol=payload.symbol,
            setup_name=payload.setup_name,
            date_str=payload.date,
            image_base64=payload.image_base64
        )
        return res
    except Exception as e:
        logger.error(f"Error saving chart screenshot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save chart screenshot: {str(e)}")



