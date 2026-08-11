from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List

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

# ----------------- Endpoints -----------------

@router.get("/api/summary")
def get_summary():
    """Retrieve metadata counts and database status."""
    try:
        return db_service.get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/candidates")
def get_candidates():
    """Retrieve candidates satisfying active screening criteria."""
    try:
        return db_service.get_candidates()
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
def get_stock_prices(symbol: str, limit: int = 252):
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
        skip_fundamentals=payload.skip_fundamentals
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


