import json
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from pydantic import BaseModel, Field, AliasChoices, ConfigDict
from typing import Optional, Dict, Any

from application.services import config_service, db_service, sync_service, chart_service, model_book_service, setup_service

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
    include_extended: Optional[bool] = None
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

class ModelBookScanSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    setup_type: str = "power_play"
    target_gain_pct: float = 20.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    forward_days: int = 20
    max_drawdown_limit: Optional[float] = None
    min_price: Optional[float] = None
    min_volume_50d: Optional[int] = None
    min_runup_pct: Optional[float] = None
    max_base_depth: Optional[float] = None
    episode_window_days: int = 15
    filters: Optional[Dict[str, Any]] = None

class CandidateFilterSchema(BaseModel):
    date: Optional[str] = None
    filters: Dict[str, Any] = Field(default_factory=dict)
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None


# ----------------- Endpoints -----------------

@router.get("/api/setups")
def get_setups():
    """Retrieve setup configurations and filter registry definitions."""
    try:
        return setup_service.get_setups_config()
    except Exception as e:
        logger.error(f"Error in get_setups: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

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
        data = db_service.get_candidates(
            target_date=payload.date,
            filters=payload.filters,
            sort_by=payload.sort_by,
            sort_order=payload.sort_order
        )
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

@router.get("/api/stocks/{symbol}/earnings")
def get_stock_earnings(symbol: str):
    """Retrieve historical and upcoming earnings dates, estimates, and EPS surprises for a symbol."""
    try:
        return db_service.get_stock_earnings(symbol)
    except Exception as e:
        logger.error(f"Error in get_stock_earnings({symbol}): {e}", exc_info=True)
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
    is_ext = bool(payload.include_premarket or payload.include_extended)
    return sync_service.trigger_sync_run(
        background_tasks,
        skip_prices=payload.skip_prices,
        skip_fundamentals=payload.skip_fundamentals,
        include_premarket=is_ext,
        include_extended=is_ext,
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
def get_market_monitor(limit: int = 252, refresh: bool = False):
    """Retrieve Stockbee Market Monitor daily breadth metrics and regime summary across the entire market."""
    try:
        return db_service.get_market_monitor(limit=limit, force_refresh=refresh)
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
    """Save chart screenshot PNG under ./charts/{setup_name}/{date}_{symbol}.png."""
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
# ----------------- Model Book / Winner Study Endpoints -----------------

@router.post("/api/model-book/scan")
def scan_model_book_endpoint(payload: ModelBookScanSchema):
    """Scan historical setups and return winners with forward metrics."""
    try:
        data = model_book_service.scan_setups(
            setup_type=payload.setup_type,
            target_gain_pct=payload.target_gain_pct,
            start_date=payload.start_date,
            end_date=payload.end_date,
            forward_days=payload.forward_days,
            max_drawdown_limit=payload.max_drawdown_limit,
            min_price=payload.min_price,
            min_volume_50d=payload.min_volume_50d,
            min_runup_pct=payload.min_runup_pct,
            max_base_depth=payload.max_base_depth,
            episode_window_days=payload.episode_window_days,
            filters=payload.filters
        )
        return data
    except Exception as e:
        logger.error(f"Error in scan_model_book_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



