"""Watchlists REST API router."""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from application.services.database import db_service

logger = logging.getLogger("pivottrader.api.watchlists")
router = APIRouter(prefix="/api/watchlists", tags=["watchlists"])


class WatchlistCreateSchema(BaseModel):
    name: str


class WatchlistUpdateSchema(BaseModel):
    name: str


class WatchlistItemAddSchema(BaseModel):
    symbol: Optional[str] = None
    symbols: Optional[List[str]] = None
    flag_color: Optional[str] = None
    tag: Optional[str] = None
    tags: Optional[List[str]] = None
    items: Optional[List[Dict[str, Any]]] = None


class WatchlistItemTagsUpdateSchema(BaseModel):
    tags: List[str]


class WatchlistItemFlagUpdateSchema(BaseModel):
    flag_color: Optional[str] = None


class WatchlistBatchRemoveSchema(BaseModel):
    symbols: List[str]


@router.get("/tags")
def get_watchlist_tags():
    """Retrieve configured playbook setup tags."""
    try:
        from application.services.setup_service import setup_service
        return setup_service.get_tags()
    except Exception as e:
        logger.error(f"Error in get_watchlist_tags: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_watchlists():
    """Retrieve user watchlist and item counts."""
    try:
        return db_service.get_watchlists()
    except Exception as e:
        logger.error(f"Error in get_watchlists: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/symbols")
def get_all_watchlist_symbols():
    """Retrieve all distinct symbols across the watchlist."""
    try:
        return db_service.get_all_watchlist_symbols()
    except Exception as e:
        logger.error(f"Error in get_all_watchlist_symbols: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def create_watchlist(payload: WatchlistCreateSchema):
    """Create a new watchlist."""
    try:
        return db_service.create_watchlist(payload.name)
    except Exception as e:
        logger.error(f"Error in create_watchlist: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{watchlist_id}")
def update_watchlist(watchlist_id: int, payload: WatchlistUpdateSchema):
    """Rename a watchlist."""
    try:
        return db_service.update_watchlist(watchlist_id, payload.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in update_watchlist({watchlist_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{watchlist_id}")
def delete_watchlist(watchlist_id: int):
    """Delete a watchlist."""
    try:
        return db_service.delete_watchlist(watchlist_id)
    except Exception as e:
        logger.error(f"Error in delete_watchlist({watchlist_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items")
@router.get("/{watchlist_id}/items")
def get_watchlist_items(watchlist_id: int = 1):
    """Get all ticker items in the watchlist."""
    try:
        return db_service.get_watchlist_items(watchlist_id)
    except Exception as e:
        logger.error(f"Error in get_watchlist_items({watchlist_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items")
@router.post("/{watchlist_id}/items")
def add_watchlist_item(payload: WatchlistItemAddSchema, watchlist_id: int = 1):
    """Add a stock symbol or batch of symbols to the watchlist."""
    try:
        if payload.items:
            count = db_service.add_watchlist_items_batch(
                watchlist_id=watchlist_id,
                items=payload.items,
                flag_color=payload.flag_color
            )
            return {"status": "ok", "added_count": count, "watchlist_id": watchlist_id}
        if payload.symbols:
            count = db_service.add_watchlist_items_batch(
                watchlist_id=watchlist_id,
                symbols=payload.symbols,
                tag=payload.tag,
                tags=payload.tags,
                flag_color=payload.flag_color
            )
            return {"status": "ok", "added_count": count, "watchlist_id": watchlist_id}
        if payload.symbol:
            db_service.add_watchlist_item(
                watchlist_id=watchlist_id,
                symbol=payload.symbol,
                tag=payload.tag,
                tags=payload.tags,
                flag_color=payload.flag_color
            )
            return {"status": "ok", "symbol": payload.symbol, "watchlist_id": watchlist_id}
        raise HTTPException(status_code=400, detail="Either 'symbol', 'symbols', or 'items' must be provided")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in add_watchlist_item: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{symbol}/flag")
@router.put("/{watchlist_id}/items/{symbol}/flag")
def update_watchlist_item_flag_endpoint(symbol: str, payload: WatchlistItemFlagUpdateSchema, watchlist_id: int = 1):
    """Update or clear the color flag of a watchlist symbol."""
    try:
        db_service.update_watchlist_item_flag(symbol=symbol, flag_color=payload.flag_color, watchlist_id=watchlist_id)
        return {"status": "ok", "watchlist_id": watchlist_id, "symbol": symbol, "flag_color": payload.flag_color}
    except Exception as e:
        logger.error(f"Error in update_watchlist_item_flag_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{watchlist_id}/items/{symbol}/tags")
def update_watchlist_item_tags_endpoint(watchlist_id: int, symbol: str, payload: WatchlistItemTagsUpdateSchema):
    """Update or replace the tags of a specific watchlist symbol."""
    try:
        db_service.update_watchlist_item_tags(watchlist_id, symbol, payload.tags)
        return {"status": "ok", "watchlist_id": watchlist_id, "symbol": symbol, "tags": payload.tags}
    except Exception as e:
        logger.error(f"Error in update_watchlist_item_tags_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items/batch")
@router.post("/{watchlist_id}/items/batch")
def add_watchlist_items_batch_endpoint(payload: WatchlistItemAddSchema, watchlist_id: int = 1):
    """Add a batch of stock symbols to the watchlist."""
    try:
        if payload.items:
            count = db_service.add_watchlist_items_batch(
                watchlist_id=watchlist_id,
                items=payload.items,
                flag_color=payload.flag_color
            )
            return {"status": "ok", "added_count": count, "watchlist_id": watchlist_id}
        symbols = payload.symbols or ([payload.symbol] if payload.symbol else [])
        count = db_service.add_watchlist_items_batch(
            watchlist_id=watchlist_id,
            symbols=symbols,
            tag=payload.tag,
            tags=payload.tags,
            flag_color=payload.flag_color
        )
        return {"status": "ok", "added_count": count, "watchlist_id": watchlist_id}
    except Exception as e:
        logger.error(f"Error in add_watchlist_items_batch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items")
@router.delete("/{watchlist_id}/items")
def clear_watchlist_items(watchlist_id: int = 1):
    """Clear all stock symbols from the watchlist."""
    try:
        return db_service.clear_watchlist_items(watchlist_id)
    except Exception as e:
        logger.error(f"Error in clear_watchlist_items({watchlist_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/{symbol}")
@router.delete("/{watchlist_id}/items/{symbol}")
def remove_watchlist_item(symbol: str, watchlist_id: int = 1):
    """Remove a single stock symbol from the watchlist."""
    try:
        return db_service.remove_watchlist_item(watchlist_id, symbol)
    except Exception as e:
        logger.error(f"Error in remove_watchlist_item({symbol}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items/remove-batch")
@router.post("/{watchlist_id}/items/remove-batch")
def remove_watchlist_items_batch_endpoint(payload: WatchlistBatchRemoveSchema, watchlist_id: int = 1):
    """Remove a batch of stock symbols from the watchlist."""
    try:
        count = db_service.remove_watchlist_items_batch(watchlist_id, payload.symbols)
        return {"status": "ok", "removed_count": count, "watchlist_id": watchlist_id}
    except Exception as e:
        logger.error(f"Error in remove_watchlist_items_batch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/batch")
@router.delete("/{watchlist_id}/items/batch")
def delete_watchlist_items_batch_endpoint(payload: WatchlistBatchRemoveSchema, watchlist_id: int = 1):
    """Remove a batch of stock symbols from the watchlist (DELETE endpoint)."""
    try:
        count = db_service.remove_watchlist_items_batch(watchlist_id, payload.symbols)
        return {"status": "ok", "removed_count": count, "watchlist_id": watchlist_id}
    except Exception as e:
        logger.error(f"Error in delete_watchlist_items_batch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
