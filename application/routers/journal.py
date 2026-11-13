"""Trading Journal REST API router."""
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from application.services.journal_service import journal_service
from application.providers.ibkr_flex_prov import FlexError

logger = logging.getLogger("pivottrader.api.journal")
router = APIRouter(tags=["journal"])


class FlexQueryItemSchema(BaseModel):
    name: Optional[str] = "Query"
    query_id: str
    token: Optional[str] = None


class JournalFlexConfigSchema(BaseModel):
    token: Optional[str] = None
    query_id: Optional[str] = None
    queries: Optional[List[FlexQueryItemSchema]] = None


class JournalNotesSchema(BaseModel):
    notes: str = ""
    mistakes: str = ""
    tags: Optional[List[str]] = None
    initial_stop: Optional[float] = None


class JournalIgnoreSchema(BaseModel):
    reason: Optional[str] = ""


class StockSplitSchema(BaseModel):
    symbol: str
    split_date: str
    ratio: float
    notes: Optional[str] = ""


class AccountBalanceUpdateSchema(BaseModel):
    usd_balance: Optional[float] = None
    cad_balance: Optional[float] = None
    name: Optional[str] = None


@router.get("/api/journal/accounts")
def get_journal_accounts():
    """Get all accounts with their USD and CAD cash balances."""
    return journal_service.get_account_balances()


@router.put("/api/journal/accounts/{account_id}/balance")
def update_journal_account_balance(account_id: str, payload: AccountBalanceUpdateSchema):
    """Update USD and CAD cash balance and optional name/alias for an account."""
    try:
        return journal_service.update_account_balance(
            account_id=account_id,
            usd_balance=payload.usd_balance,
            cad_balance=payload.cad_balance,
            name=payload.name,
        )
    except Exception as e:
        logger.error(f"Error in update_journal_account_balance: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/journal/config")
def get_journal_config():
    """Return Flex Query settings (token is masked)."""
    return journal_service.get_flex_config()


@router.put("/api/journal/config")
def update_journal_config(payload: JournalFlexConfigSchema):
    """Save the Flex Web Service token and Activity Flex Query IDs to data/ibkr_flex.json."""
    try:
        queries_data = [q.model_dump() for q in payload.queries] if payload.queries is not None else None
        return journal_service.update_flex_config(
            token=payload.token,
            query_id=payload.query_id,
            queries=queries_data,
        )
    except Exception as e:
        logger.error(f"Error in update_journal_config: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class JournalSyncSchema(BaseModel):
    query_id: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None


@router.post("/api/journal/sync")
def sync_journal(query_id: Optional[str] = None, payload: Optional[JournalSyncSchema] = None):
    """Fetch the Activity Flex statement(s) from IBKR and upsert executions with optional date range overrides."""
    try:
        qid = (payload.query_id if payload and payload.query_id else query_id)
        fd = payload.from_date if payload else None
        td = payload.to_date if payload else None
        return journal_service.sync_from_flex(target_query_id=qid, from_date=fd, to_date=td)
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
def get_positions(account: Optional[str] = None, status: Optional[str] = "all"):
    """Retrieve trading positions from IBKR Journal (status: 'OPEN', 'CLOSED', or 'ALL'). Default ALL."""
    try:
        trades = journal_service.get_trades(account=account, include_ignored=False)
        st = (status or "ALL").strip().upper()
        if st in ("ALL", "*"):
            return trades
        if st == "CLOSED":
            return [t for t in trades if t.get("status") == "CLOSED"]
        if st == "OPEN":
            return [t for t in trades if t.get("status") == "OPEN"]
        return trades
    except Exception as e:
        logger.error(f"Error in get_positions: {e}", exc_info=True)
        return []


@router.put("/api/journal/trades/{trade_id}/notes")
def update_journal_notes(trade_id: str, payload: JournalNotesSchema):
    """Save notes, mistakes, tags, and initial stop price for a round-trip trade."""
    try:
        return journal_service.update_notes(
            trade_id, payload.notes, payload.tags, initial_stop=payload.initial_stop, mistakes=payload.mistakes
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


@router.get("/api/journal/splits")
def get_journal_stock_splits(symbol: Optional[str] = None):
    """List registered stock splits applied to trading history."""
    try:
        return journal_service.get_stock_splits(symbol=symbol)
    except Exception as e:
        logger.error(f"Error fetching stock splits: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/journal/splits")
def add_journal_stock_split(payload: StockSplitSchema):
    """Register a forward or reverse stock split to back-adjust historical executions."""
    try:
        return journal_service.add_stock_split(
            symbol=payload.symbol,
            split_date=payload.split_date,
            ratio=payload.ratio,
            notes=payload.notes or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding stock split: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/journal/splits/{symbol}/{split_date}")
def delete_journal_stock_split(symbol: str, split_date: str):
    """Delete a registered stock split."""
    try:
        deleted = journal_service.delete_stock_split(symbol=symbol, split_date=split_date)
        return {"deleted": deleted}
    except Exception as e:
        logger.error(f"Error deleting stock split: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

