"""Trading Journal REST API router."""
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from application.services.journal_service import journal_service
from application.providers.ibkr_flex_prov import FlexError

logger = logging.getLogger("pivottrader.api.journal")
router = APIRouter(tags=["journal"])


class JournalFlexConfigSchema(BaseModel):
    token: str
    query_id: str


class JournalNotesSchema(BaseModel):
    notes: str = ""
    tags: Optional[List[str]] = None
    initial_stop: Optional[float] = None


class JournalIgnoreSchema(BaseModel):
    reason: Optional[str] = ""


@router.get("/api/journal/config")
def get_journal_config():
    """Return Flex Query settings (token is masked)."""
    return journal_service.get_flex_config()


@router.put("/api/journal/config")
def update_journal_config(payload: JournalFlexConfigSchema):
    """Save the Flex Web Service token and Activity Flex Query ID to data/ibkr_flex.json."""
    try:
        return journal_service.update_flex_config(payload.token, payload.query_id)
    except Exception as e:
        logger.error(f"Error in update_journal_config: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/journal/sync")
def sync_journal():
    """Fetch the Activity Flex statement from IBKR and upsert executions."""
    try:
        return journal_service.sync_from_flex()
    except FlexError as fe:
        raise HTTPException(status_code=400, detail=str(fe))
    except Exception as e:
        logger.error(f"Error in sync_journal: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"IBKR Flex sync failed: {e}")


@router.get("/api/journal")
def get_journal(
    start: Optional[str] = None,
    end: Optional[str] = None,
    symbol: Optional[str] = None,
    account: Optional[str] = None,
    include_ignored: bool = False,
):
    """Round-trip trades, statistics, monthly/yearly P&L and equity curve (filtered by close date)."""
    try:
        return journal_service.get_journal(
            start=start, end=end, symbol=symbol, account=account, include_ignored=include_ignored
        )
    except Exception as e:
        logger.error(f"Error in get_journal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/positions")
def get_open_positions():
    """Retrieve currently open trading positions from IBKR Journal."""
    try:
        trades = journal_service.get_trades(include_ignored=False)
        return [t for t in trades if t.get("status") == "OPEN"]
    except Exception as e:
        logger.error(f"Error in get_open_positions: {e}", exc_info=True)
        return []


@router.put("/api/journal/trades/{trade_id}/notes")
def update_journal_notes(trade_id: str, payload: JournalNotesSchema):
    """Save notes, tags, and initial stop price for a round-trip trade."""
    try:
        return journal_service.update_notes(
            trade_id, payload.notes, payload.tags, initial_stop=payload.initial_stop
        )
    except Exception as e:
        logger.error(f"Error in update_journal_notes: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/journal/trades/{trade_id}/ignore")
def ignore_journal_trade(trade_id: str, payload: Optional[JournalIgnoreSchema] = None):
    """Exclude an unrelated trade from journal statistics, charts, and default trade list."""
    try:
        reason = payload.reason if payload else ""
        return journal_service.ignore_trade(trade_id, reason=reason or "")
    except Exception as e:
        logger.error(f"Error in ignore_journal_trade: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/journal/trades/{trade_id}/ignore")
def unignore_journal_trade(trade_id: str):
    """Restore an excluded trade back into journal calculations and history."""
    try:
        return journal_service.unignore_trade(trade_id)
    except Exception as e:
        logger.error(f"Error in unignore_journal_trade: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
