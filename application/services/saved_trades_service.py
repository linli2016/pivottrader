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

    def resolve_setup_tag(self, s_type: str, s_name: Optional[str] = None) -> tuple[str, str]:
        """
        Resolves setup_type to a canonical setup tag (e.g. 'IPO', 'HTF', 'VCP', 'EP', 'SHORT', 'Others').
        If s_type is a screener ID (e.g. 'ipo_base', 'episodic_pivot'), maps it to the screener's tag.
        """
        try:
            from application.services.setup_service import setup_service
            tags = setup_service.get_tags()
            cleaned = str(s_type).strip() if s_type else ""

            # 1. Match tag keys case-insensitively (e.g. 'IPO', 'ipo', 'HTF', 'htf')
            for t_key, t_def in tags.items():
                if cleaned.upper() == t_key.upper():
                    name = s_name or t_def.get("name") or t_def.get("label") or t_key
                    return t_key, name

            # 2. Match screener ID (e.g. 'ipo_base', 'episodic_pivot', 'power_play')
            screener_tag = setup_service.get_screener_tag(cleaned.lower())
            if screener_tag and screener_tag in tags:
                t_def = tags[screener_tag]
                name = s_name or t_def.get("name") or t_def.get("label") or screener_tag
                return screener_tag, name

            # 3. Fallback
            return cleaned or "Others", s_name or cleaned.replace("_", " ").title()
        except Exception as e:
            logger.warning(f"Failed to resolve setup tag for {s_type}: {e}")
            return str(s_type).strip() or "Others", s_name or str(s_type).replace("_", " ").title()

    def _load_raw_trades(self) -> List[Dict[str, Any]]:
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
            raw_type = str(raw.get("setup_type", "general")).strip()
            raw_name = raw.get("setup_name")
            s_type, s_name = self.resolve_setup_tag(raw_type, raw_name)
            if s_type != raw_type or s_name != raw_name:
                has_changes = True

            tags = raw.get("tags") or []
            if s_type and s_type not in tags:
                tags = [s_type] + [t for t in tags if t != s_type]
                has_changes = True

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
                "tags": tags,
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

    def _enrich_trades(self, trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich saved trades with symbol metadata, fundamentals, and historical daily_bars metrics as of setup_date."""
        if not trades:
            return []

        enriched = [dict(t) for t in trades]
        symbols = list({t.get("symbol", "").upper().strip() for t in enriched if t.get("symbol")})
        if not symbols:
            return enriched

        try:
            from application.services.database import db_service
            with db_service.get_read_only_conn() as conn:
                placeholders = ",".join(["?"] * len(symbols))

                # 1. Symbol metadata (name, exchange, sector, industry)
                sym_rows = conn.execute(
                    f"SELECT symbol, name, exchange, sector, industry FROM symbols WHERE symbol IN ({placeholders})",
                    symbols
                ).fetchall()
                sym_map = {
                    r[0]: {
                        "name": r[1] or r[0],
                        "exchange": r[2] or "",
                        "sector": r[3] or "Sector",
                        "industry": r[4] or ""
                    }
                    for r in sym_rows
                }

                # 2. Institutional sponsorship from quarterly_fundamentals
                fund_map = {}
                try:
                    fund_rows = conn.execute(
                        f"""
                        SELECT symbol, inst_holders_count, inst_holders_qoq_change, sponsorship_streak
                        FROM (
                            SELECT symbol, inst_holders_count, inst_holders_qoq_change, sponsorship_streak,
                                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY fiscal_quarter DESC) as rn
                            FROM quarterly_fundamentals
                            WHERE symbol IN ({placeholders})
                        )
                        WHERE rn = 1
                        """,
                        symbols
                    ).fetchall()
                    fund_map = {
                        r[0]: {
                            "inst_holders_count": r[1],
                            "inst_holders_qoq_change": r[2],
                            "sponsorship_streak": r[3] or 0
                        }
                        for r in fund_rows
                    }
                except Exception as fe:
                    logger.warning(f"Failed to enrich fundamentals for saved trades: {fe}")

                # 3. Historical daily_bars metrics as of setup_date (zero lookahead bias)
                bar_map = {}
                try:
                    values_sql = ", ".join(["(?, ?, TRY_CAST(? AS DATE))"] * len(enriched))
                    values_params = []
                    for idx, t in enumerate(enriched):
                        values_params.extend([idx, t.get("symbol", ""), t.get("setup_date", "")])

                    bar_rows = conn.execute(
                        f"""
                        WITH targets(t_idx, symbol, target_date) AS (
                            VALUES {values_sql}
                        ),
                        filtered_bars AS (
                            SELECT symbol, date, rs_score, rs_rank, adr_20d, ti_65, ret_1m, ret_3m, ret_6m
                            FROM daily_bars
                            WHERE symbol IN ({placeholders})
                        )
                        SELECT
                            t.t_idx,
                            d.rs_score,
                            d.rs_rank,
                            d.adr_20d,
                            d.ti_65,
                            d.ret_1m,
                            d.ret_3m,
                            d.ret_6m
                        FROM targets t
                        ASOF LEFT JOIN filtered_bars d
                          ON t.symbol = d.symbol AND t.target_date >= d.date
                        """,
                        values_params + symbols
                    ).fetchall()
                    for r in bar_rows:
                        t_idx = r[0]
                        rs_score = round(float(r[1]), 1) if r[1] is not None else None
                        rs_rank = int(r[2]) if r[2] is not None else (round(float(r[1])) if r[1] is not None else None)
                        bar_map[t_idx] = {
                            "rs_score": rs_score,
                            "rs_rank": rs_rank,
                            "adr_20d": round(float(r[3]), 2) if r[3] is not None else None,
                            "ti_65": round(float(r[4]), 2) if r[4] is not None else None,
                            "ret_1m": round(float(r[5]), 1) if r[5] is not None else None,
                            "ret_3m": round(float(r[6]), 1) if r[6] is not None else None,
                            "ret_6m": round(float(r[7]), 1) if r[7] is not None else None,
                        }
                except Exception as be:
                    logger.warning(f"Failed to enrich daily_bars metrics for saved trades: {be}")

                for idx, item in enumerate(enriched):
                    sym = item.get("symbol", "")
                    s_info = sym_map.get(sym, {})
                    item["name"] = s_info.get("name", sym)
                    item["exchange"] = s_info.get("exchange", "")
                    item["sector"] = s_info.get("sector", "Sector")
                    item["industry"] = s_info.get("industry", "")

                    f_info = fund_map.get(sym)
                    if f_info:
                        item.update(f_info)

                    b_info = bar_map.get(idx)
                    if b_info:
                        item.update(b_info)
        except Exception as e:
            logger.warning(f"Failed to enrich saved trades from DuckDB: {e}")

        return enriched

    def load_saved_trades(self) -> List[Dict[str, Any]]:
        """Load all saved model book trades from disk and enrich with stock details."""
        raw_trades = self._load_raw_trades()
        return self._enrich_trades(raw_trades)

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
        raw_type = str(trade_data.get("setup_type", "general")).strip()
        raw_name = trade_data.get("setup_name")
        setup_type, setup_name = self.resolve_setup_tag(raw_type, raw_name)

        if not symbol or not setup_date:
            raise ValueError("symbol and setup_date are required")

        trades = self._load_raw_trades()

        # Match either by provided ID or by (symbol, setup_date, setup_type)
        existing_index = None
        given_id = trade_data.get("id")
        if given_id and _is_uuid(given_id):
            existing_index = next((i for i, t in enumerate(trades) if t.get("id") == given_id), None)
        if existing_index is None:
            existing_index = next((i for i, t in enumerate(trades) if t.get("symbol") == symbol and t.get("setup_date") == setup_date and (t.get("setup_type") or "").upper() == setup_type.upper()), None)

        now_iso = datetime.now().isoformat()

        # Dynamically resolve market regime based on trigger date
        resolved_regime = self.resolve_market_regime(setup_date)
        market_regime = resolved_regime or trade_data.get("market_regime")

        trade_id = trades[existing_index]["id"] if existing_index is not None else (given_id if given_id and _is_uuid(given_id) else str(uuid.uuid4()))

        tags = trade_data.get("tags") or []
        if setup_type and setup_type not in tags:
            tags = [setup_type] + [t for t in tags if t != setup_type]

        record = {
            "id": trade_id,
            "symbol": symbol,
            "setup_date": setup_date,
            "setup_type": setup_type,
            "setup_name": setup_name,
            "market_regime": market_regime,
            "notes": trade_data.get("notes", "") or "",
            "tags": tags,
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
        enriched = self._enrich_trades([record])
        return enriched[0] if enriched else record

    def delete_saved_trade(self, trade_id: str) -> bool:
        """Remove a saved trade by ID."""
        trades = self._load_raw_trades()
        initial_len = len(trades)
        trades = [t for t in trades if t.get("id") != trade_id]
        if len(trades) < initial_len:
            self._write_trades(trades)
            return True
        return False

    def update_notes(self, trade_id: str, notes: str) -> Optional[Dict[str, Any]]:
        """Update the notes field of a specific saved trade."""
        trades = self._load_raw_trades()
        target_trade = next((t for t in trades if t.get("id") == trade_id), None)
        if not target_trade:
            return None

        target_trade["notes"] = notes
        target_trade["updated_at"] = datetime.now().isoformat()
        self._write_trades(trades)
        enriched = self._enrich_trades([target_trade])
        return enriched[0] if enriched else target_trade

    def update_trigger_date(self, trade_id: str, new_date: str) -> Optional[Dict[str, Any]]:
        """Update trigger date (setup_date) and update market_regime for the date."""
        new_date = str(new_date).strip()
        if not new_date:
            raise ValueError("new_date cannot be empty")

        trades = self._load_raw_trades()
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
            enriched = self._enrich_trades([target_trade])
            return enriched[0] if enriched else target_trade

        target_trade["setup_date"] = new_date
        if resolved_regime:
            target_trade["market_regime"] = resolved_regime

        target_trade["updated_at"] = datetime.now().isoformat()

        # Re-sort chronologically by setup_date descending, then symbol
        trades.sort(key=lambda x: (x.get("setup_date", ""), x.get("symbol", "")), reverse=True)
        self._write_trades(trades)
        enriched = self._enrich_trades([target_trade])
        return enriched[0] if enriched else target_trade

    def update_setup_type(self, trade_id: str, new_setup_type: str, new_setup_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update setup_type and setup_name for a saved trade."""
        if not new_setup_type:
            raise ValueError("setup_type cannot be empty")

        resolved_type, resolved_name = self.resolve_setup_tag(new_setup_type, new_setup_name)

        trades = self._load_raw_trades()
        target_trade = next((t for t in trades if t.get("id") == trade_id), None)
        if not target_trade:
            return None

        old_type = target_trade.get("setup_type")
        tags = target_trade.get("tags") or []
        if resolved_type and resolved_type not in tags:
            tags = [resolved_type] + [t for t in tags if t != old_type and t != resolved_type]

        if target_trade.get("setup_type") == resolved_type and target_trade.get("setup_name") == resolved_name and target_trade.get("tags") == tags:
            enriched = self._enrich_trades([target_trade])
            return enriched[0] if enriched else target_trade

        target_trade["setup_type"] = resolved_type
        target_trade["setup_name"] = resolved_name
        target_trade["tags"] = tags
        target_trade["updated_at"] = datetime.now().isoformat()

        self._write_trades(trades)
        enriched = self._enrich_trades([target_trade])
        return enriched[0] if enriched else target_trade


saved_trades_service = SavedTradesService()

