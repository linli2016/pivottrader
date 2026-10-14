import os
import json
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from pydantic import BaseModel, Field, AliasChoices, ConfigDict
from typing import Optional, Dict, Any, List

from application.services import config_service, db_service, sync_service, chart_service, model_book_service, setup_service, saved_trades_service, options_service
from application.services.theme_service import ThemeService
from application.services.group_radar_service import GroupRadarService
from application.services.leaderboard_service import LeaderboardService
from application.services.journal_service import journal_service
from application.providers.ibkr_flex_prov import FlexError
from application.routers.watchlists import (
    router as watchlists_router,
    WatchlistCreateSchema,
    WatchlistUpdateSchema,
    WatchlistItemAddSchema,
    WatchlistBatchRemoveSchema,
)
from application.routers.stocks import (
    router as stocks_router,
    get_stock_detail,
    get_stock_prices,
    get_stock_financials,
    get_stock_earnings,
    get_stock_peers,
    get_stock_options_profile,
)
from application.routers.model_book import router as model_book_router
from application.routers.journal import router as journal_router

logger = logging.getLogger("pivottrader.api")
router = APIRouter()
router.include_router(watchlists_router)
router.include_router(stocks_router)
router.include_router(model_book_router)
router.include_router(journal_router)

ROUTER_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(ROUTER_DIR)
DATA_DIR = os.path.join(REPO_ROOT, "data")
SETUPS_AND_RULES_FILE = os.path.join(DATA_DIR, "setups_and_rules.md")

theme_service = ThemeService()
group_radar_service = GroupRadarService(theme_service=theme_service)
leaderboard_service = LeaderboardService()

# ----------------- Models -----------------
class ThemeCreateUpdateSchema(BaseModel):
    name: str
    description: str = ""
    symbols: List[str]
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
    sync_sponsorship: bool = False
    sponsorship_source: Optional[str] = "yfinance"
    sponsorship_universe: Optional[str] = "all"
    include_premarket: bool = False
    include_extended: Optional[bool] = None
    history_years: Optional[int] = None
    force_full: bool = False
    fix_splits: bool = False

class WatchlistCreateSchema(BaseModel):
    name: str

class WatchlistUpdateSchema(BaseModel):
    name: str

class WatchlistItemAddSchema(BaseModel):
    symbol: Optional[str] = None
    symbols: Optional[List[str]] = None

class WatchlistBatchRemoveSchema(BaseModel):
    symbols: List[str]

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
    target_gain_pct: float = 16.0
    stop_loss_pct: Optional[float] = 8.0
    ema_exit_type: Optional[str] = "none"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    forward_days: int = 25
    max_drawdown_limit: Optional[float] = None
    min_price: Optional[float] = None
    min_volume_50d: Optional[int] = None
    min_runup_pct: Optional[float] = None
    max_base_depth: Optional[float] = None
    episode_window_days: int = 15
    sub_setup_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

class ExpressionValidateSchema(BaseModel):
    expression: str

class CandidateFilterSchema(BaseModel):
    date: Optional[str] = None
    filters: Dict[str, Any] = Field(default_factory=dict)
    expression: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None

class SavedTradeCreateSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = None
    symbol: str
    setup_date: str
    setup_type: str = "general"
    setup_name: Optional[str] = None
    market_regime: Optional[str] = None
    notes: Optional[str] = ""
    tags: Optional[list] = None

class SavedTradeNotesSchema(BaseModel):
    notes: str

class SavedTradeTriggerDateSchema(BaseModel):
    setup_date: str

class SavedTradeSetupTypeSchema(BaseModel):
    setup_type: str
    setup_name: Optional[str] = None


# ----------------- Endpoints -----------------

@router.get("/api/setups")
def get_setups(visible_only: bool = False):
    """Retrieve setup configurations and filter registry definitions."""
    try:
        return setup_service.get_setups_config(visible_only=visible_only)
    except Exception as e:
        logger.error(f"Error in get_setups: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/setups/validate-expression")
def validate_expression_endpoint(payload: ExpressionValidateSchema):
    """Validate a TC2000 PCF scan expression and return syntax status and compiled SQL."""
    try:
        return setup_service.validate_expression(payload.expression)
    except Exception as e:
        logger.error(f"Error validating expression: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/setups/variables")
def get_setup_variables_endpoint():
    """Retrieve categorized dictionary of supported scan expression variables for UI cheat-sheet."""
    try:
        return setup_service.get_expression_variables()
    except Exception as e:
        logger.error(f"Error in get_setup_variables: {e}", exc_info=True)
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
            expression=payload.expression,
            sort_by=payload.sort_by,
            sort_order=payload.sort_order
        )
        return Response(content=json.dumps(data), media_type="application/json")
    except Exception as e:
        logger.error(f"Error in post_candidates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/candidates")
def get_candidates(date: Optional[str] = None, expression: Optional[str] = None):
    """Retrieve candidates for a specific target date (default/unfiltered or date query)."""
    try:
        data = db_service.get_candidates(target_date=date, expression=expression)
        return Response(content=json.dumps(data), media_type="application/json")
    except Exception as e:
        logger.error(f"Error in get_candidates: {e}", exc_info=True)
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
        sync_sponsorship=payload.sync_sponsorship,
        sponsorship_source=payload.sponsorship_source or "yfinance",
        sponsorship_universe=payload.sponsorship_universe or "all",
        include_premarket=is_ext,
        include_extended=is_ext,
        history_years=payload.history_years,
        force_full=payload.force_full,
        fix_splits=payload.fix_splits
    )

@router.post("/api/sync/repair-splits")
def trigger_repair_splits(background_tasks: BackgroundTasks):
    """Triggers a targeted stock split scan and repair across all symbols in the database."""
    return sync_service.trigger_sync_run(
        background_tasks,
        skip_prices=False,
        skip_fundamentals=True,
        fix_splits=True
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
def get_market_monitor(limit: int = 252, refresh: bool = False, date: Optional[str] = None):
    """Retrieve Stockbee Market Monitor daily breadth metrics and regime summary across the entire market."""
    try:
        return db_service.get_market_monitor(limit=limit, force_refresh=refresh, as_of_date=date)
    except Exception as e:
        logger.error(f"Error in get_market_monitor: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/market/pulse")
def get_market_pulse(date: Optional[str] = None, refresh: bool = False):
    """Retrieve CANSLIM / Deepvue Market Pulse (FTD status, Distribution Days with 5% rally exemption, moving average breadth percentiles, and history)."""
    try:
        return db_service.get_market_pulse_data(as_of_date=date, force_refresh=refresh)
    except Exception as e:
        logger.error(f"Error in get_market_pulse: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/market/pulse/history")
def get_market_pulse_history(limit: int = 252, date: Optional[str] = None):
    """Retrieve historical Market Pulse time series (% above 21d/50d/200d, distribution pressure, benchmark price)."""
    try:
        return db_service.get_market_pulse_history(as_of_date=date, limit=limit)
    except Exception as e:
        logger.error(f"Error in get_market_pulse_history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/market/stages")
def get_market_stages(limit: int = 252, date: Optional[str] = None):
    """Retrieve Stan Weinstein 4-Stage market-wide stock distribution summary and historical dynamics."""
    try:
        return db_service.get_stage_distribution(as_of_date=date, limit=limit)
    except Exception as e:
        logger.error(f"Error in get_market_stages: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/api/market/cross-asset")
def get_cross_asset(date: Optional[str] = None, refresh: bool = False):
    """Retrieve multi-asset cross-asset macro indicators across Equities, Rates, Credit, FX, Commodities, Volatility, and Crypto."""
    try:
        return db_service.get_cross_asset_data(as_of_date=date, force_refresh=refresh)
    except Exception as e:
        logger.error(f"Error in get_cross_asset: {e}", exc_info=True)
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

# ----------------- Leaderboard Endpoint -----------------

@router.get("/api/leaderboard")
def get_leaderboard(
    date: Optional[str] = None,
    board: str = "near_52w_high",
    min_rs: Optional[int] = None,
    max_dist_high: float = 10.0,
    sector: Optional[str] = None,
    industry: Optional[str] = None
):
    """Retrieve Leaderboards (Near 52w High, New Highs, Gainers, Strongest, Pre-Market) and Sector Concentration."""
    try:
        return leaderboard_service.get_leaderboard(
            target_date=date,
            board=board,
            min_rs=min_rs,
            max_dist_high=max_dist_high,
            sector=sector,
            industry=industry
        )
    except Exception as e:
        logger.error(f"Error in get_leaderboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- Group Radar & Themes Endpoints -----------------

@router.get("/api/groups/strength")
def get_group_strength(type: str = "industries", date: Optional[str] = None, sector: Optional[str] = None):
    """Retrieve multi-horizon strength, RS rank, 52w high distance, and RVol for sectors, industries, or themes."""
    try:
        return group_radar_service.get_group_strength(group_type=type, date=date, sector=sector)
    except Exception as e:
        logger.error(f"Error in get_group_strength: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/groups/constituents")
def get_group_constituents(type: str, name: str, date: Optional[str] = None):
    """Retrieve constituent stocks and technical setups for a specific sector, industry, or theme."""
    try:
        return group_radar_service.get_group_constituents(group_type=type, group_name=name, date=date)
    except Exception as e:
        logger.error(f"Error in get_group_constituents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/groups/rrg")
def get_groups_rrg(type: str = "sectors", date: Optional[str] = None, trail: int = 5, sector: Optional[str] = None):
    """Retrieve Relative Rotation Graph (RRG) coordinates and multi-day trails for sectors, industries, or themes."""
    try:
        return group_radar_service.get_rrg_data(group_type=type, date=date, trail_bars=trail, sector=sector)
    except Exception as e:
        logger.error(f"Error in get_groups_rrg: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/groups/bars")
def get_group_bars_endpoint(
    type: str = "industries",
    name: str = "",
    timeframe: str = "weekly",
    limit: int = 156,
    date: Optional[str] = None
):
    """Retrieve synthetic group price bars (OHLCV), 40-week (or 200-day) SMA, Mansfield RS vs SPY, and Stan Weinstein Stage Analysis."""
    try:
        if not name:
            raise HTTPException(status_code=400, detail="Missing required group 'name' parameter")
        return group_radar_service.get_group_bars(
            group_type=type,
            group_name=name,
            timeframe=timeframe,
            limit=limit,
            date=date
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_group_bars({type}, {name}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/api/themes")
def get_themes():
    """Retrieve all configured themes."""
    try:
        return theme_service.load_themes()
    except Exception as e:
        logger.error(f"Error in get_themes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/themes")
def create_or_update_theme(payload: ThemeCreateUpdateSchema):
    """Create or update a custom theme."""
    try:
        return theme_service.create_or_update_theme(
            name=payload.name,
            description=payload.description,
            symbols=payload.symbols
        )
    except Exception as e:
        logger.error(f"Error in create_or_update_theme: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/themes/{name}")
def delete_theme(name: str):
    """Delete a theme by name."""
    try:
        success = theme_service.delete_theme(name)
        if not success:
            raise HTTPException(status_code=404, detail=f"Theme '{name}' not found")
        return {"status": "success", "message": f"Theme '{name}' deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_theme: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- Setups & Rules Playbook Endpoints -----------------

def _resolve_setups_and_rules_path() -> str:
    if os.path.exists(SETUPS_AND_RULES_FILE):
        return SETUPS_AND_RULES_FILE
    legacy_file = os.path.join(REPO_ROOT, "setups_and_rules.md")
    if os.path.exists(legacy_file):
        return legacy_file
    return SETUPS_AND_RULES_FILE

@router.get("/api/setups-and-rules")
def get_setups_and_rules():
    """Retrieve markdown content of Setups & Rules playbook."""
    filepath = _resolve_setups_and_rules_path()
    if not os.path.exists(filepath):
        return {"content": "# Setups & Rules\n\nNo setups or rules file found yet."}
    with open(filepath, "r", encoding="utf-8") as f:
        return {"content": f.read()}

@router.post("/api/setups-and-rules")
def update_setups_and_rules(payload: RulesUpdateSchema):
    """Update markdown content of Setups & Rules playbook."""
    filepath = SETUPS_AND_RULES_FILE
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
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
