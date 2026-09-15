import os
import json
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger("pivottrader.saved_trades")

# Resolve repository root data directory
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(REPO_ROOT, "data")
SAVED_FILE_PATH = os.path.join(DATA_DIR, "saved_model_book.json")


def _is_uuid(val: Any) -> bool:
    """Check if a string is a valid UUID."""
    if not val or not isinstance(val, str):
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError):
        return False


def _ensure_file():
    """Ensure data directory and JSON file exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(SAVED_FILE_PATH):
        try:
            with open(SAVED_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to initialize {SAVED_FILE_PATH}: {e}")


class SavedTradesService:
    def __init__(self, file_path: str = SAVED_FILE_PATH):
        self.file_path = file_path
        _ensure_file()

    def get_market_regime_lookup(self) -> Dict[str, Dict[str, Any]]:
        """Fetch Kristjan Qullamaggie regime lookup table (cached in memory)."""
        try:
            from application.services.database import db_service
            from application.engine.market_regime import get_qullamaggie_daily_lookup
            with db_service.get_read_only_conn() as conn:
                return get_qullamaggie_daily_lookup(conn, symbol="QQQ")
        except Exception as e:
            logger.warning(f"Failed to load market regime lookup: {e}")
            return {}

    def resolve_market_regime(self, setup_date: str, lookup: Optional[Dict[str, Dict[str, Any]]] = None) -> Optional[str]:
        """
        Dynamically determine Kristjan Qullamaggie market regime (BULLISH, CAUTION, BEARISH)
        based on the trigger date (setup_date).
        If the date falls on a non-trading day (weekend/holiday), uses the closest preceding trading session.
        """
        if not setup_date:
            return None
        try:
            if lookup is None:
                lookup = self.get_market_regime_lookup()
            if not lookup:
                return None

            setup_date_str = str(setup_date).strip()
            if setup_date_str in lookup:
                return lookup[setup_date_str].get("regime")

            import bisect
            sorted_dates = sorted(lookup.keys())
            idx = bisect.bisect_right(sorted_dates, setup_date_str) - 1
            if idx >= 0:
                return lookup[sorted_dates[idx]].get("regime")
            return None
        except Exception as e:
            logger.warning(f"Failed to resolve market regime for date {setup_date}: {e}")
            return None

    def load_saved_trades(self) -> List[Dict[str, Any]]:
        """Load all saved model book trades from disk, synchronizing market_regime with trigger date and sanitizing fields."""
        _ensure_file()
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                raw_trades = json.loads(content)
                if not isinstance(raw_trades, list):
                    return []
        except Exception as e:
            logger.error(f"Error loading saved trades from {self.file_path}: {e}", exc_info=True)
            return []

        lookup = self.get_market_regime_lookup()
        has_changes = False
        cleaned_trades = []

        for raw in raw_trades:
            t_id = raw.get("id")
            if not _is_uuid(t_id):
                t_id = str(uuid.uuid4())
                has_changes = True

            s_date = str(raw.get("setup_date", "")).strip()
            s_type = str(raw.get("setup_type", "general")).strip().lower()
            s_name = raw.get("setup_name") or s_type.replace("_", " ").title()

            regime = raw.get("market_regime")
            if s_date:
                resolved = self.resolve_market_regime(s_date, lookup=lookup)
                if resolved and regime != resolved:
                    regime = resolved
                    has_changes = True

            record = {
                "id": t_id,
                "symbol": str(raw.get("symbol", "")).upper().strip(),
                "setup_date": s_date,
                "setup_type": s_type,
                "setup_name": s_name,
                "market_regime": regime,
                "notes": raw.get("notes", "") or "",
                "tags": raw.get("tags") or [],
                "saved_at": raw.get("saved_at") or datetime.now().isoformat(),
            }
            if raw.get("updated_at"):
                record["updated_at"] = raw["updated_at"]

            # Detect and strip legacy snapshot keys
            legacy_keys = ("holding_days", "exit_reason", "trade_return_pct", "peak_gain_pct", "entry_price", "exit_price", "target_price", "stop_price")
            if any(k in raw for k in legacy_keys):
                has_changes = True

            cleaned_trades.append(record)

        if has_changes:
            self._write_trades(cleaned_trades)

        return cleaned_trades

    def _write_trades(self, trades: List[Dict[str, Any]]) -> None:
        """Write trades array formatted to JSON file atomically."""
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        temp_path = f"{self.file_path}.tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(trades, f, indent=2, ensure_ascii=False)
        os.replace(temp_path, self.file_path)

    def save_trade(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add or update a saved trade."""
        symbol = str(trade_data.get("symbol", "")).upper().strip()
        setup_date = str(trade_data.get("setup_date", "")).strip()
        setup_type = str(trade_data.get("setup_type", "general")).strip().lower()

        if not symbol or not setup_date:
            raise ValueError("symbol and setup_date are required")

        trades = self.load_saved_trades()

        # Match either by provided ID or by (symbol, setup_date, setup_type)
        existing_index = None
        given_id = trade_data.get("id")
        if given_id and _is_uuid(given_id):
            existing_index = next((i for i, t in enumerate(trades) if t.get("id") == given_id), None)
        if existing_index is None:
            existing_index = next((i for i, t in enumerate(trades) if t.get("symbol") == symbol and t.get("setup_date") == setup_date and t.get("setup_type") == setup_type), None)

        now_iso = datetime.now().isoformat()

        # Dynamically resolve market regime based on trigger date
        resolved_regime = self.resolve_market_regime(setup_date)
        market_regime = resolved_regime or trade_data.get("market_regime")

        trade_id = trades[existing_index]["id"] if existing_index is not None else (given_id if given_id and _is_uuid(given_id) else str(uuid.uuid4()))

        record = {
            "id": trade_id,
            "symbol": symbol,
            "setup_date": setup_date,
            "setup_type": setup_type,
            "setup_name": trade_data.get("setup_name") or setup_type.replace("_", " ").title(),
            "market_regime": market_regime,
            "notes": trade_data.get("notes", "") or "",
            "tags": trade_data.get("tags") or [],
            "saved_at": now_iso
        }

        if existing_index is not None:
            # Preserve existing notes if not provided in update
            if not trade_data.get("notes") and trades[existing_index].get("notes"):
                record["notes"] = trades[existing_index]["notes"]
            # Preserve original saved_at
            if trades[existing_index].get("saved_at"):
                record["saved_at"] = trades[existing_index]["saved_at"]
            record["updated_at"] = now_iso
            trades[existing_index] = record
        else:
            trades.append(record)

        # Sort chronologically by setup_date descending, then symbol
        trades.sort(key=lambda x: (x.get("setup_date", ""), x.get("symbol", "")), reverse=True)
        self._write_trades(trades)
        return record

    def delete_saved_trade(self, trade_id: str) -> bool:
        """Remove a saved trade by ID."""
        trades = self.load_saved_trades()
        initial_len = len(trades)
        trades = [t for t in trades if t.get("id") != trade_id]
        if len(trades) < initial_len:
            self._write_trades(trades)
            return True
        return False

    def update_notes(self, trade_id: str, notes: str) -> Optional[Dict[str, Any]]:
        """Update the notes field of a specific saved trade."""
        trades = self.load_saved_trades()
        target_trade = next((t for t in trades if t.get("id") == trade_id), None)
        if not target_trade:
            return None

        target_trade["notes"] = notes
        target_trade["updated_at"] = datetime.now().isoformat()
        self._write_trades(trades)
        return target_trade

    def update_trigger_date(self, trade_id: str, new_date: str) -> Optional[Dict[str, Any]]:
        """Update trigger date (setup_date) and update market_regime for the date."""
        new_date = str(new_date).strip()
        if not new_date:
            raise ValueError("new_date cannot be empty")

        trades = self.load_saved_trades()
        target_trade = next((t for t in trades if t.get("id") == trade_id), None)
        if not target_trade:
            return None

        # Resolve market regime for the date
        resolved_regime = self.resolve_market_regime(new_date)

        # If date hasn't changed, make sure regime is up to date and return
        if target_trade.get("setup_date") == new_date:
            if resolved_regime and target_trade.get("market_regime") != resolved_regime:
                target_trade["market_regime"] = resolved_regime
                target_trade["updated_at"] = datetime.now().isoformat()
                self._write_trades(trades)
            return target_trade

        target_trade["setup_date"] = new_date
        if resolved_regime:
            target_trade["market_regime"] = resolved_regime

        target_trade["updated_at"] = datetime.now().isoformat()

        # Re-sort chronologically by setup_date descending, then symbol
        trades.sort(key=lambda x: (x.get("setup_date", ""), x.get("symbol", "")), reverse=True)
        self._write_trades(trades)
        return target_trade

    def update_setup_type(self, trade_id: str, new_setup_type: str, new_setup_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update setup_type and setup_name for a saved trade."""
        new_setup_type = str(new_setup_type).strip().lower()
        if not new_setup_type:
            raise ValueError("setup_type cannot be empty")

        trades = self.load_saved_trades()
        target_trade = next((t for t in trades if t.get("id") == trade_id), None)
        if not target_trade:
            return None

        if target_trade.get("setup_type") == new_setup_type and (not new_setup_name or target_trade.get("setup_name") == new_setup_name):
            return target_trade

        target_trade["setup_type"] = new_setup_type
        if new_setup_name:
            target_trade["setup_name"] = new_setup_name
        else:
            target_trade["setup_name"] = new_setup_type.replace("_", " ").title()

        target_trade["updated_at"] = datetime.now().isoformat()

        self._write_trades(trades)
        return target_trade


saved_trades_service = SavedTradesService()

