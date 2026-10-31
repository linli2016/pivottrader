"""Stocks REST API router."""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from application.services.database import db_service
from application.services.options_service import options_service
from application.services.theme_service import ThemeService
from application.services.chart_drawings_service import chart_drawings_service

logger = logging.getLogger("pivottrader.api.stocks")
router = APIRouter(prefix="/api/stocks", tags=["stocks"])
theme_service = ThemeService()


class StockDrawingsUpdateSchema(BaseModel):
    drawings: List[Dict[str, Any]]


@router.get("/drawings/all")
def get_all_stock_drawings():
    """Retrieve all user drawings across all symbols."""
    try:
        return chart_drawings_service.get_all_drawings()
    except Exception as e:
        logger.error(f"Error in get_all_stock_drawings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}")
def get_stock_detail(symbol: str):
    """Retrieve metadata and quarterly financials for a symbol."""
    try:
        res = db_service.get_stock_detail(symbol)
        if not res:
            raise HTTPException(status_code=404, detail="Symbol not found")
        if not res.get("themes"):
            matched = theme_service.get_themes_for_symbol(symbol)
            res["themes"] = matched
            res["theme"] = matched[0] if matched else None
            if "metadata" in res and isinstance(res["metadata"], dict):
                res["metadata"]["themes"] = matched
                res["metadata"]["theme"] = matched[0] if matched else None
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_stock_detail({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/prices")
def get_stock_prices(symbol: str, limit: Optional[int] = None, timeframe: str = "daily"):
    """Retrieve historical daily or weekly price bars for charting."""
    try:
        return db_service.get_stock_prices(symbol, limit, timeframe=timeframe)
    except Exception as e:
        logger.error(f"Error in get_stock_prices({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/financials")
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


@router.get("/{symbol}/earnings")
def get_stock_earnings(symbol: str, fetch_live: bool = False):
    """Retrieve historical and upcoming earnings dates, estimates, and EPS surprises for a symbol."""
    try:
        return db_service.get_stock_earnings(symbol, fetch_live=fetch_live)
    except Exception as e:
        logger.error(f"Error in get_stock_earnings({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/peers")
def get_stock_peers(symbol: str, limit: int = 6):
    """Retrieve industry peer stocks ranked by relative strength."""
    try:
        return db_service.get_industry_peers(symbol, limit)
    except Exception as e:
        logger.error(f"Error in get_stock_peers({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/options-profile")
def get_stock_options_profile(symbol: str, expiration: Optional[str] = "near_term"):
    """Retrieve Options Open Interest (OI) profile, Call Wall, and Put Wall."""
    try:
        return options_service.get_options_profile(symbol, expiration)
    except Exception as e:
        logger.error(f"Error in get_stock_options_profile({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/drawings")
def get_stock_drawings(symbol: str):
    """Retrieve user drawings (lines, text annotations) for a symbol."""
    try:
        return chart_drawings_service.get_drawings(symbol)
    except Exception as e:
        logger.error(f"Error in get_stock_drawings({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{symbol}/drawings")
def update_stock_drawings(symbol: str, payload: StockDrawingsUpdateSchema):
    """Save user drawings (lines, text annotations) for a symbol."""
    try:
        return chart_drawings_service.save_drawings(symbol, payload.drawings)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error in update_stock_drawings({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{symbol}/drawings")
def delete_stock_drawings(symbol: str):
    """Delete all user drawings for a symbol."""
    try:
        deleted = chart_drawings_service.delete_drawings(symbol)
        return {"status": "success", "symbol": symbol.upper().strip(), "deleted": deleted}
    except Exception as e:
        logger.error(f"Error in delete_stock_drawings({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
