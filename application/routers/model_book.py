"""Model Book & Saved Trades REST API router."""
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict
from application.services import model_book_service, saved_trades_service

logger = logging.getLogger("pivottrader.api.model_book")
router = APIRouter(prefix="/api/model-book", tags=["model-book"])


class ModelBookScanSchema(BaseModel):
    setup_type: str = "vcp"
    target_gain_pct: float = 20.0
    stop_loss_pct: Optional[float] = None
    ema_exit_type: Optional[str] = None
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


@router.post("/scan")
def scan_model_book_endpoint(payload: ModelBookScanSchema):
    """Scan historical setups and return winners with forward metrics."""
    try:
        data = model_book_service.scan_setups(
            setup_type=payload.setup_type,
            target_gain_pct=payload.target_gain_pct,
            stop_loss_pct=payload.stop_loss_pct if payload.stop_loss_pct is not None else payload.max_drawdown_limit,
            ema_exit_type=payload.ema_exit_type,
            start_date=payload.start_date,
            end_date=payload.end_date,
            forward_days=payload.forward_days,
            max_drawdown_limit=payload.max_drawdown_limit,
            min_price=payload.min_price,
            min_volume_50d=payload.min_volume_50d,
            min_runup_pct=payload.min_runup_pct,
            max_base_depth=payload.max_base_depth,
            episode_window_days=payload.episode_window_days,
            sub_setup_id=payload.sub_setup_id,
            filters=payload.filters,
        )
        return data
    except Exception as e:
        logger.error(f"Error in scan_model_book_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved")
def get_saved_model_book_trades():
    """Retrieve all saved model book trades."""
    try:
        return saved_trades_service.load_saved_trades()
    except Exception as e:
        logger.error(f"Error in get_saved_model_book_trades: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/saved")
def save_model_book_trade(payload: SavedTradeCreateSchema):
    """Save or update a model book trade."""
    try:
        res = saved_trades_service.save_trade(payload.model_dump())
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error in save_model_book_trade: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/saved/{trade_id}")
def delete_saved_model_book_trade(trade_id: str):
    """Delete a saved model book trade by ID."""
    try:
        deleted = saved_trades_service.delete_saved_trade(trade_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Trade not found")
        return {"status": "success", "id": trade_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_saved_model_book_trade: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/saved/{trade_id}/notes")
def update_saved_trade_notes_endpoint(trade_id: str, payload: SavedTradeNotesSchema):
    """Update trader notes for a saved trade."""
    try:
        updated = saved_trades_service.update_notes(trade_id, payload.notes)
        if not updated:
            raise HTTPException(status_code=404, detail="Trade not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_saved_trade_notes_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/saved/{trade_id}/trigger-date")
def update_saved_trade_trigger_date_endpoint(trade_id: str, payload: SavedTradeTriggerDateSchema):
    """Update trigger date for a saved trade."""
    try:
        updated = saved_trades_service.update_trigger_date(trade_id, payload.setup_date)
        if not updated:
            raise HTTPException(status_code=404, detail="Trade not found")
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_saved_trade_trigger_date_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/saved/{trade_id}/setup-type")
def update_saved_trade_setup_type_endpoint(trade_id: str, payload: SavedTradeSetupTypeSchema):
    """Update setup type and name for a saved trade."""
    try:
        updated = saved_trades_service.update_setup_type(trade_id, payload.setup_type, payload.setup_name)
        if not updated:
            raise HTTPException(status_code=404, detail="Trade not found")
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_saved_trade_setup_type_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
