"""
Trading Journal service.

Storage: a dedicated SQLite file (data/journal.db) holding raw IBKR executions and user notes. It is deliberately
kept out of the DuckDB market database so journal writes from API handlers never contend for the single-writer
data.db lock used by the background pipeline.

Round trips: executions for the same (account, contract) are replayed chronologically. A trade opens when the
position leaves zero and closes when it returns to zero; scale-ins/outs are aggregated. Executions that flip the
position through zero are split proportionally between the closing trade and the newly opened one.
"""
import os
import json
import sqlite3
import threading
import logging
import statistics
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from application.providers.ibkr_flex_prov import IBKRFlexClient, FlexError, parse_flex_trades

logger = logging.getLogger("pivottrader.journal")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(REPO_ROOT, "data")
JOURNAL_DB_PATH = os.path.join(DATA_DIR, "journal.db")
FLEX_CONFIG_PATH = os.path.join(DATA_DIR, "ibkr_flex.json")

EPS = 1e-9

EXEC_COLUMNS = [
    "account_id", "exec_id", "conid", "symbol", "description", "asset_category", "currency",
    "fx_rate_to_base", "trade_date", "date_time", "quantity", "price", "proceeds", "commission",
    "net_cash", "fifo_pnl_realized", "buy_sell", "open_close", "order_id",
]


def _exec_sort_key(e: Dict[str, Any]):
    eid = str(e.get("exec_id") or "")
    return (e.get("date_time") or "", int(eid) if eid.isdigit() else 0, eid)


def _days_between(d1: Optional[str], d2: Optional[str]) -> Optional[int]:
    if not d1 or not d2:
        return None
    return (date.fromisoformat(d2[:10]) - date.fromisoformat(d1[:10])).days


def _combine_same_datetime_executions(execs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Combine split fills that share the exact same timestamp, side, and action
    into a single execution row with summed quantity, net cash, commission,
    and volume-weighted average price.
    """
    if not execs or len(execs) <= 1:
        return execs

    combined: List[Dict[str, Any]] = []
    for e in execs:
        if not combined:
            combined.append(dict(e))
            continue

        prev = combined[-1]
        # Check if this execution is a split fill of the preceding one
        if (
            e.get("date_time")
            and e.get("date_time") == prev.get("date_time")
            and e.get("side") == prev.get("side")
            and e.get("action") == prev.get("action")
        ):
            # Merge into prev
            total_qty = prev["quantity"] + e["quantity"]
            prev_notional = abs(prev["quantity"]) * prev["price"]
            curr_notional = abs(e["quantity"]) * e["price"]
            combined_notional = prev_notional + curr_notional

            prev["price"] = combined_notional / abs(total_qty) if abs(total_qty) > EPS else prev["price"]
            prev["quantity"] = total_qty
            prev["commission"] = (prev.get("commission") or 0.0) + (e.get("commission") or 0.0)
            prev["net_cash"] = (prev.get("net_cash") or 0.0) + (e.get("net_cash") or 0.0)
            prev["fraction"] = min(1.0, (prev.get("fraction") or 1.0) + (e.get("fraction") or 1.0))
            if "exec_ids" not in prev:
                prev["exec_ids"] = [prev["exec_id"]]
            prev["exec_ids"].append(e["exec_id"])
        else:
            combined.append(dict(e))

    return combined


# ----------------- Round-trip reconstruction (pure) -----------------

class _TradeBuilder:
    def __init__(self, first: Dict[str, Any], direction: int, incomplete: bool = False):
        self.account_id = first["account_id"]
        self.conid = first.get("conid") or ""
        self.symbol = first["symbol"]
        self.description = first.get("description") or ""
        self.currency = first.get("currency") or "USD"
        self.fx_rate_to_base = first.get("fx_rate_to_base") or 1.0
        self.direction = direction  # +1 long, -1 short
        self.incomplete = incomplete  # opened before the imported history window
        self.id = f"{self.account_id}:{self.conid or self.symbol}:{first['exec_id']}"
        self.open_dt = first.get("date_time") or f"{first['trade_date']}T00:00:00"
        self.close_dt: Optional[str] = None
        self.position = 0.0
        self.max_position = 0.0
        self.entry_qty = 0.0
        self.entry_notional = 0.0
        self.exit_qty = 0.0
        self.exit_notional = 0.0
        self.net_cash = 0.0
        self.net_cash_base = 0.0
        self.fifo = 0.0
        self.fifo_base = 0.0
        self.fifo_complete = True
        self.commission = 0.0
        self.commission_base = 0.0
        self.executions: List[Dict[str, Any]] = []

    def add(self, e: Dict[str, Any], qty: float, frac: float, is_entry: bool):
        fx = e.get("fx_rate_to_base") or 1.0
        self.fx_rate_to_base = fx
        price = e.get("price") or 0.0
        if is_entry:
            self.entry_qty += abs(qty)
            self.entry_notional += abs(qty) * price
        else:
            self.exit_qty += abs(qty)
            self.exit_notional += abs(qty) * price
        self.position += qty
        self.max_position = max(self.max_position, abs(self.position))
        nc = (e.get("net_cash") or 0.0) * frac
        com = (e.get("commission") or 0.0) * frac
        self.net_cash += nc
        self.net_cash_base += nc * fx
        self.commission += com
        self.commission_base += com * fx
        if not is_entry:
            fifo = e.get("fifo_pnl_realized")
            if fifo is None:
                self.fifo_complete = False
            else:
                self.fifo += fifo * frac
                self.fifo_base += fifo * frac * fx
        self.executions.append({
            "exec_id": e["exec_id"],
            "date_time": e.get("date_time"),
            "side": "BUY" if qty > 0 else "SELL",
            "quantity": qty,
            "price": price,
            "commission": com,
            "net_cash": nc,
            "fraction": round(frac, 6),
            "action": "ENTRY" if is_entry else "EXIT",
        })

    def finalize(self, closed: bool) -> Dict[str, Any]:
        if closed:
            self.close_dt = self.executions[-1]["date_time"]
        avg_entry = self.entry_notional / self.entry_qty if self.entry_qty > EPS else None
        avg_exit = self.exit_notional / self.exit_qty if self.exit_qty > EPS else None

        pnl = pnl_base = pnl_pct = None
        if closed and not self.incomplete:
            # Full round trip within history: net cash flow is the exact realized P&L incl. all commissions.
            pnl, pnl_base = self.net_cash, self.net_cash_base
            if self.entry_notional > EPS:
                pnl_pct = pnl / self.entry_notional * 100.0
        elif self.exit_qty > EPS and self.fifo_complete:
            # Opened before history window (or still open): rely on IBKR's FIFO realized P&L.
            pnl, pnl_base = self.fifo, self.fifo_base
            if closed and avg_exit is not None:
                cost = self.exit_notional - self.direction * self.fifo
                if cost > EPS:
                    pnl_pct = self.fifo / cost * 100.0

        open_date = self.open_dt[:10]
        close_date = self.close_dt[:10] if self.close_dt else None
        combined_execs = _combine_same_datetime_executions(self.executions)
        return {
            "id": self.id,
            "account_id": self.account_id,
            "conid": self.conid,
            "symbol": self.symbol,
            "description": self.description,
            "currency": self.currency,
            "fx_rate_to_base": getattr(self, "fx_rate_to_base", 1.0),
            "direction": "LONG" if self.direction > 0 else "SHORT",
            "status": "CLOSED" if closed else "OPEN",
            "incomplete": self.incomplete,
            "open_datetime": self.open_dt,
            "close_datetime": self.close_dt,
            "open_date": open_date,
            "close_date": close_date,
            "holding_days": _days_between(open_date, close_date) if closed else _days_between(open_date, date.today().isoformat()),
            "entry_qty": self.entry_qty,
            "exit_qty": self.exit_qty,
            "open_qty": abs(self.position) if not closed else 0.0,
            "max_position": self.max_position,
            "avg_entry": avg_entry,
            "avg_exit": avg_exit,
            "entry_notional": self.entry_notional,
            "commission": self.commission_base,
            "current_price": None,
            "current_price_date": None,
            "unrealized_pnl": None,
            "unrealized_pnl_pct": None,
            "realized_pnl": pnl_base if closed else (pnl_base if (self.exit_qty > EPS and self.fifo_complete) else None),
            "pnl_local": pnl,
            "pnl": pnl_base,
            "pnl_pct": pnl_pct,
            "num_executions": len(combined_execs),
            "executions": combined_execs,
        }


def build_round_trips(executions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Group executions into flat-to-flat round-trip trades. Pure function (no I/O)."""
    groups: Dict[tuple, List[Dict[str, Any]]] = {}
    for e in executions:
        if abs(e.get("quantity") or 0.0) < EPS:
            continue
        groups.setdefault((e["account_id"], e.get("conid") or e["symbol"]), []).append(e)

    trades: List[Dict[str, Any]] = []
    for _, execs in groups.items():
        execs.sort(key=_exec_sort_key)
        cur: Optional[_TradeBuilder] = None
        for e in execs:
            qty = e["quantity"]
            sign = 1 if qty > 0 else -1
            oc = e.get("open_close") or ""
            closing_only = "C" in oc and "O" not in oc

            if cur is None:
                # Flat. A pure closing execution here closes shares bought before the imported history.
                cur = _TradeBuilder(e, direction=-sign if closing_only else sign, incomplete=closing_only)
                cur.add(e, qty, 1.0, is_entry=not closing_only)
                if closing_only:
                    cur.position = 0.0
                    cur.max_position = 0.0
                    # Keep collecting consecutive closing fills of this pre-history position.
                    continue
            elif cur.incomplete and abs(cur.position) < EPS and closing_only and sign == -cur.direction:
                cur.add(e, qty, 1.0, is_entry=False)
                cur.position = 0.0
                continue
            elif cur.incomplete and abs(cur.position) < EPS:
                # Pre-history position fully exited; a new opening fill starts a fresh trade.
                trades.append(cur.finalize(closed=True))
                cur = _TradeBuilder(e, direction=sign)
                cur.add(e, qty, 1.0, is_entry=True)
            elif sign == cur.direction:
                cur.add(e, qty, 1.0, is_entry=True)
            else:
                open_abs = abs(cur.position)
                if abs(qty) <= open_abs + EPS:
                    cur.add(e, qty, 1.0, is_entry=False)
                    if abs(cur.position) < EPS:
                        cur.position = 0.0
                        trades.append(cur.finalize(closed=True))
                        cur = None
                elif closing_only:
                    # Sold more than tracked: excess closes pre-history shares. Attribute all to this trade.
                    cur.add(e, qty, 1.0, is_entry=False)
                    cur.position = 0.0
                    cur.incomplete = True
                    trades.append(cur.finalize(closed=True))
                    cur = None
                else:
                    # Position flip: split the fill between closing and the newly opened opposite trade.
                    frac_close = open_abs / abs(qty)
                    cur.add(e, -cur.position, frac_close, is_entry=False)
                    cur.position = 0.0
                    trades.append(cur.finalize(closed=True))
                    remainder = qty + open_abs * cur.direction
                    cur = _TradeBuilder(e, direction=sign)
                    cur.add(e, remainder, 1.0 - frac_close, is_entry=True)

        if cur is not None:
            trades.append(cur.finalize(closed=cur.incomplete and abs(cur.position) < EPS))

    trades.sort(key=lambda t: (t["open_datetime"] or t["close_datetime"] or ""), reverse=True)
    return trades



# ----------------- Statistics (pure) -----------------

def _mean(vals: List[float]) -> Optional[float]:
    return sum(vals) / len(vals) if vals else None


def compute_statistics(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Performance statistics over closed trades with a known P&L (base currency)."""
    closed = [t for t in trades if t["status"] == "CLOSED" and t.get("pnl") is not None]
    closed.sort(key=lambda t: t["close_datetime"] or "")
    wins = [t for t in closed if t["pnl"] > 0]
    losses = [t for t in closed if t["pnl"] < 0]

    gross_profit = sum(t["pnl"] for t in wins)
    gross_loss = sum(t["pnl"] for t in losses)
    total = sum(t["pnl"] for t in closed)

    avg_win = _mean([t["pnl"] for t in wins])
    avg_loss = _mean([t["pnl"] for t in losses])
    win_pcts = [t["pnl_pct"] for t in wins if t.get("pnl_pct") is not None]
    loss_pcts = [t["pnl_pct"] for t in losses if t.get("pnl_pct") is not None]
    all_pcts = [t["pnl_pct"] for t in closed if t.get("pnl_pct") is not None]
    avg_win_pct = _mean(win_pcts)
    avg_loss_pct = _mean(loss_pcts)

    max_cw = max_cl = cw = cl = 0
    peak = cum = max_dd = 0.0
    cum_mult = peak_mult = 1.0
    max_dd_pct = 0.0

    for t in closed:
        if t["pnl"] > 0:
            cw, cl = cw + 1, 0
        elif t["pnl"] < 0:
            cl, cw = cl + 1, 0
        else:
            cw = cl = 0
        max_cw, max_cl = max(max_cw, cw), max(max_cl, cl)
        cum += t["pnl"]
        peak = max(peak, cum)
        max_dd = min(max_dd, cum - peak)

        # Percentage drawdown across closed trades
        ret = (t.get("pnl_pct") or 0.0) / 100.0
        cum_mult *= (1.0 + ret)
        if cum_mult > peak_mult:
            peak_mult = cum_mult
        if peak_mult > 0:
            dd_pct = ((cum_mult - peak_mult) / peak_mult) * 100.0
            max_dd_pct = min(max_dd_pct, dd_pct)

    win_rate = len(wins) / len(closed) * 100.0 if closed else None
    loss_rate = len(losses) / len(closed) * 100.0 if closed else None

    def _pick(t):
        return {"id": t["id"], "symbol": t["symbol"], "pnl": t["pnl"], "pnl_pct": t.get("pnl_pct"), "close_date": t["close_date"]} if t else None

    r_multiples = [t["r_multiple"] for t in closed if t.get("r_multiple") is not None]
    win_rs = [t["r_multiple"] for t in wins if t.get("r_multiple") is not None]
    loss_rs = [t["r_multiple"] for t in losses if t.get("r_multiple") is not None]

    open_trades_list = [t for t in trades if t.get("status") == "OPEN"]
    open_trades_with_pnl = [t for t in open_trades_list if t.get("pnl") is not None]
    open_pnl = sum(t["pnl"] for t in open_trades_with_pnl) if open_trades_with_pnl else None
    open_pcts = [t["pnl_pct"] for t in open_trades_with_pnl if t.get("pnl_pct") is not None]
    avg_open_pnl_pct = _mean(open_pcts)

    return {
        "total_trades": len(closed),
        "open_trades": len(open_trades_list),
        "open_pnl": open_pnl,
        "avg_open_pnl_pct": avg_open_pnl_pct,
        "wins": len(wins),
        "losses": len(losses),
        "breakeven": len(closed) - len(wins) - len(losses),
        "win_rate": win_rate,
        "total_pnl": total,
        "gross_profit": gross_profit,
        "gross_loss": gross_loss,
        "profit_factor": (gross_profit / abs(gross_loss)) if gross_loss < 0 else None,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "win_loss_ratio": (avg_win / abs(avg_loss)) if avg_win is not None and avg_loss else None,
        "avg_win_pct": avg_win_pct,
        "avg_loss_pct": avg_loss_pct,
        "adjusted_win_loss_ratio": (avg_win_pct / abs(avg_loss_pct)) if avg_win_pct is not None and avg_loss_pct else None,
        "expectancy": total / len(closed) if closed else None,
        "expectancy_pct": (
            (win_rate / 100.0) * (avg_win_pct or 0.0) + (loss_rate / 100.0) * (avg_loss_pct or 0.0)
            if closed and all_pcts else None
        ),
        "median_pnl_pct": statistics.median(all_pcts) if all_pcts else None,
        "avg_r_multiple": _mean(r_multiples),
        "avg_win_r": _mean(win_rs),
        "avg_loss_r": _mean(loss_rs),
        "real_rr_ratio": (_mean(win_rs) / abs(_mean(loss_rs))) if _mean(win_rs) is not None and _mean(loss_rs) else None,
        "r_trades_count": len(r_multiples),
        "largest_win": _pick(max(wins, key=lambda t: t["pnl"])) if wins else None,
        "largest_loss": _pick(min(losses, key=lambda t: t["pnl"])) if losses else None,
        "avg_hold_days": _mean([t["holding_days"] for t in closed if t.get("holding_days") is not None]),
        "avg_hold_days_win": _mean([t["holding_days"] for t in wins if t.get("holding_days") is not None]),
        "avg_hold_days_loss": _mean([t["holding_days"] for t in losses if t.get("holding_days") is not None]),
        "max_consecutive_wins": max_cw,
        "max_consecutive_losses": max_cl,
        "max_drawdown": max_dd,
        "max_drawdown_pct": max_dd_pct,
        "total_commission": sum(t.get("commission") or 0.0 for t in closed),
    }



def compute_period_pnl(trades: List[Dict[str, Any]], period: str) -> List[Dict[str, Any]]:
    """Aggregate closed-trade P&L by close month ('month' -> yyyy-MM) or year ('year' -> yyyy)."""
    width = 7 if period == "month" else 4
    buckets: Dict[str, Dict[str, Any]] = {}
    for t in trades:
        if t["status"] != "CLOSED" or t.get("pnl") is None or not t.get("close_date"):
            continue
        key = t["close_date"][:width]
        b = buckets.setdefault(key, {"period": key, "pnl": 0.0, "trades": 0, "wins": 0, "losses": 0,
                                     "gross_profit": 0.0, "gross_loss": 0.0, "commission": 0.0})
        b["pnl"] += t["pnl"]
        b["trades"] += 1
        b["commission"] += t.get("commission") or 0.0
        if t["pnl"] > 0:
            b["wins"] += 1
            b["gross_profit"] += t["pnl"]
        elif t["pnl"] < 0:
            b["losses"] += 1
            b["gross_loss"] += t["pnl"]
    out = sorted(buckets.values(), key=lambda b: b["period"])
    for b in out:
        b["win_rate"] = b["wins"] / b["trades"] * 100.0 if b["trades"] else None
    return out


def compute_equity_curve(trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    closed = sorted(
        (t for t in trades if t["status"] == "CLOSED" and t.get("pnl") is not None and t.get("close_date")),
        key=lambda t: t["close_datetime"] or "",
    )
    curve, cum = [], 0.0
    for t in closed:
        cum += t["pnl"]
        if curve and curve[-1]["date"] == t["close_date"]:
            curve[-1]["cum_pnl"] = cum
        else:
            curve.append({"date": t["close_date"], "cum_pnl": cum})
    return curve


# ----------------- Service (I/O) -----------------

class JournalService:
    def __init__(self, db_path: str = JOURNAL_DB_PATH, config_path: str = FLEX_CONFIG_PATH):
        self.db_path = db_path
        self.config_path = config_path
        self._write_lock = threading.Lock()
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self):
        with self._write_lock, self._connect() as conn:
            conn.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS executions (
                    account_id TEXT NOT NULL,
                    exec_id TEXT NOT NULL,
                    conid TEXT, symbol TEXT NOT NULL, description TEXT, asset_category TEXT, currency TEXT,
                    fx_rate_to_base REAL, trade_date TEXT NOT NULL, date_time TEXT, quantity REAL NOT NULL,
                    price REAL, proceeds REAL, commission REAL, net_cash REAL, fifo_pnl_realized REAL,
                    buy_sell TEXT, open_close TEXT, order_id TEXT,
                    imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (account_id, exec_id)
                );
                CREATE INDEX IF NOT EXISTS idx_exec_symbol ON executions(symbol);
                CREATE TABLE IF NOT EXISTS trade_notes (
                    trade_id TEXT PRIMARY KEY,
                    notes TEXT DEFAULT '',
                    tags TEXT DEFAULT '[]',
                    initial_stop REAL,
                    updated_at TEXT
                );
                CREATE TABLE IF NOT EXISTS ignored_trades (
                    trade_id TEXT PRIMARY KEY,
                    reason TEXT DEFAULT '',
                    ignored_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS journal_meta (key TEXT PRIMARY KEY, value TEXT);
            """)
            # Migration check: add initial_stop column if missing in older schema
            columns = [c[1] for c in conn.execute("PRAGMA table_info(trade_notes)").fetchall()]
            if "initial_stop" not in columns:
                try:
                    conn.execute("ALTER TABLE trade_notes ADD COLUMN initial_stop REAL")
                except Exception as e:
                    logger.warning(f"Failed to add initial_stop column: {e}")


    # ----- Flex credentials -----

    def _load_flex_config(self) -> Dict[str, str]:
        if not os.path.exists(self.config_path):
            return {}
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                return json.load(f) or {}
        except Exception as e:
            logger.warning(f"Failed to read {self.config_path}: {e}")
            return {}

    def get_flex_config(self) -> Dict[str, Any]:
        cfg = self._load_flex_config()
        token = cfg.get("token") or ""
        return {
            "query_id": cfg.get("query_id") or "",
            "has_token": bool(token),
            "token_masked": f"{'•' * 8}{token[-4:]}" if len(token) >= 4 else ("•" * len(token)),
        }

    def update_flex_config(self, token: Optional[str], query_id: Optional[str]) -> Dict[str, Any]:
        cfg = self._load_flex_config()
        if token is not None and token.strip():
            cfg["token"] = token.strip()
        if query_id is not None:
            cfg["query_id"] = query_id.strip()
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
        try:
            os.chmod(self.config_path, 0o600)
        except OSError:
            pass
        return self.get_flex_config()

    # ----- Import -----

    def import_statement(self, content: bytes) -> Dict[str, Any]:
        parsed = parse_flex_trades(content)
        execs = parsed["executions"]
        with self._write_lock, self._connect() as conn:
            before = conn.execute("SELECT COUNT(*) FROM executions").fetchone()[0]
            placeholders = ",".join("?" for _ in EXEC_COLUMNS)
            conn.executemany(
                f"INSERT OR REPLACE INTO executions ({','.join(EXEC_COLUMNS)}) VALUES ({placeholders})",
                [[e.get(c) for c in EXEC_COLUMNS] for e in execs],
            )
            after = conn.execute("SELECT COUNT(*) FROM executions").fetchone()[0]
            result = {
                "status": "success",
                "fetched": len(execs),
                "new_executions": after - before,
                "total_executions": after,
                "skipped_non_stock": parsed["skipped"],
                "accounts": parsed["accounts"],
                "has_fifo_pnl": parsed["has_fifo_pnl"],
                "synced_at": datetime.now().isoformat(timespec="seconds"),
            }
            conn.execute(
                "INSERT OR REPLACE INTO journal_meta (key, value) VALUES ('last_sync', ?)",
                [json.dumps(result)],
            )
        return result

    def sync_from_flex(self) -> Dict[str, Any]:
        cfg = self._load_flex_config()
        if not cfg.get("token") or not cfg.get("query_id"):
            raise FlexError("Configure your IBKR Flex token and Query ID first")
        content = IBKRFlexClient(cfg["token"], cfg["query_id"]).fetch_statement()
        return self.import_statement(content)

    def get_last_sync(self) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            row = conn.execute("SELECT value FROM journal_meta WHERE key = 'last_sync'").fetchone()
        return json.loads(row[0]) if row else None

    # ----- Queries -----

    def load_executions(self) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(f"SELECT {','.join(EXEC_COLUMNS)} FROM executions").fetchall()
        return [dict(r) for r in rows]

    def load_notes(self) -> Dict[str, Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute("SELECT trade_id, notes, tags, initial_stop, updated_at FROM trade_notes").fetchall()
        return {
            r["trade_id"]: {
                "notes": r["notes"] or "",
                "tags": json.loads(r["tags"] or "[]"),
                "initial_stop": r["initial_stop"],
                "notes_updated_at": r["updated_at"],
            }
            for r in rows
        }

    def load_ignored_trade_ids(self) -> Dict[str, Dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute("SELECT trade_id, reason, ignored_at FROM ignored_trades").fetchall()
        return {
            r["trade_id"]: {"reason": r["reason"] or "", "ignored_at": r["ignored_at"]}
            for r in rows
        }

    def ignore_trade(self, trade_id: str, reason: str = "") -> Dict[str, Any]:
        now = datetime.now().isoformat(timespec="seconds")
        with self._write_lock, self._connect() as conn:
            conn.execute(
                """INSERT INTO ignored_trades (trade_id, reason, ignored_at) VALUES (?, ?, ?)
                   ON CONFLICT(trade_id) DO UPDATE SET reason = excluded.reason, ignored_at = excluded.ignored_at""",
                [trade_id, reason or "", now],
            )
        return {"trade_id": trade_id, "is_ignored": True, "reason": reason or "", "ignored_at": now}

    def unignore_trade(self, trade_id: str) -> Dict[str, Any]:
        with self._write_lock, self._connect() as conn:
            conn.execute("DELETE FROM ignored_trades WHERE trade_id = ?", [trade_id])
        return {"trade_id": trade_id, "is_ignored": False}

    def get_latest_close_prices(self, symbols: List[str]) -> Dict[str, Tuple[float, str]]:
        """Retrieve the latest available close price and bar date for symbols from daily_bars,
        falling back to live lookup for missing or stale symbols."""
        if not symbols:
            return {}
        clean_symbols = list({str(s).strip().upper() for s in symbols if s and str(s).strip()})
        if not clean_symbols:
            return {}
        results: Dict[str, Tuple[float, str]] = {}
        max_market_date: Optional[str] = None
        try:
            from application.services.database import db_service
            with db_service.get_read_only_conn() as conn:
                max_dt_row = conn.execute("SELECT CAST(MAX(date) AS VARCHAR) FROM daily_bars").fetchone()
                if max_dt_row and max_dt_row[0]:
                    max_market_date = str(max_dt_row[0])[:10]

                placeholders = ", ".join(["?"] * len(clean_symbols))
                q = f"""
                    SELECT symbol, close, CAST(date AS VARCHAR) as dt
                    FROM (
                        SELECT symbol, close, date,
                               ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) as rn
                        FROM daily_bars
                        WHERE symbol IN ({placeholders})
                    )
                    WHERE rn = 1
                """
                rows = conn.execute(q, clean_symbols).fetchall()
                for r in rows:
                    if r[1] is not None:
                        results[str(r[0]).upper()] = (float(r[1]), str(r[2])[:10])
        except Exception as e:
            logger.warning(f"Could not fetch latest close prices from daily_bars: {e}")

        # Check for missing or stale symbols (> 4 days behind latest market date)
        stale_or_missing = []
        for s in clean_symbols:
            if s not in results:
                stale_or_missing.append(s)
            elif max_market_date and results[s][1] < max_market_date:
                try:
                    sym_d = date.fromisoformat(results[s][1])
                    mkt_d = date.fromisoformat(max_market_date)
                    if (mkt_d - sym_d).days > 4:
                        stale_or_missing.append(s)
                except Exception:
                    pass

        if stale_or_missing:
            for s in stale_or_missing:
                try:
                    import yfinance as yf
                    fi = getattr(yf.Ticker(s), "fast_info", None)
                    price = getattr(fi, "last_price", None) or getattr(fi, "previous_close", None)
                    if price and float(price) > 0:
                        results[s] = (float(price), max_market_date or date.today().isoformat())
                except Exception as ex:
                    logger.debug(f"Live fallback price lookup failed for {s}: {ex}")

        return results

    def _populate_open_trade_metrics(
        self,
        trades: List[Dict[str, Any]],
        price_map: Optional[Dict[str, Tuple[float, str]]] = None,
    ) -> None:
        """
        For open trades, calculate unrealized and total P/L, return %,
        and related metrics based on current close price.
        """
        open_trades = [t for t in trades if t.get("status") == "OPEN"]
        if not open_trades:
            return

        if price_map is None:
            symbols = [t["symbol"] for t in open_trades if t.get("symbol")]
            price_map = self.get_latest_close_prices(symbols)

        for t in open_trades:
            sym = (t.get("symbol") or "").strip().upper()
            price_info = price_map.get(sym)
            if not price_info:
                t["current_price"] = None
                t["current_price_date"] = None
                t["unrealized_pnl"] = None
                t["unrealized_pnl_pct"] = None
                t["realized_pnl"] = t.get("pnl") or 0.0
                continue

            current_price, price_date = price_info
            t["current_price"] = current_price
            t["current_price_date"] = price_date

            direction = t.get("direction", "LONG")
            avg_entry = t.get("avg_entry") or 0.0
            open_qty = t.get("open_qty") or 0.0
            fx = t.get("fx_rate_to_base") or 1.0

            # Unrealized P&L on remaining open shares
            if direction == "LONG":
                unrealized_pnl_local = (current_price - avg_entry) * open_qty
                unrealized_pct = ((current_price - avg_entry) / avg_entry * 100.0) if avg_entry > EPS else None
            else:
                unrealized_pnl_local = (avg_entry - current_price) * open_qty
                unrealized_pct = ((avg_entry - current_price) / avg_entry * 100.0) if avg_entry > EPS else None

            unrealized_pnl_base = unrealized_pnl_local * fx

            # Realized P&L from any partial scale-outs
            realized_pnl_base = t.get("pnl") or 0.0
            realized_pnl_local = t.get("pnl_local") or 0.0

            total_pnl_base = realized_pnl_base + unrealized_pnl_base
            total_pnl_local = realized_pnl_local + unrealized_pnl_local

            t["unrealized_pnl"] = unrealized_pnl_base
            t["unrealized_pnl_pct"] = unrealized_pct
            t["realized_pnl"] = realized_pnl_base
            t["pnl"] = total_pnl_base
            t["pnl_local"] = total_pnl_local

            # Total Return %
            entry_notional = t.get("entry_notional") or 0.0
            if entry_notional > EPS:
                t["pnl_pct"] = (total_pnl_base / entry_notional) * 100.0
            else:
                t["pnl_pct"] = unrealized_pct

    def get_trades(self, start: Optional[str] = None, end: Optional[str] = None,
                   symbol: Optional[str] = None, account: Optional[str] = None,
                   include_ignored: bool = False,
                   price_map: Optional[Dict[str, Tuple[float, str]]] = None) -> List[Dict[str, Any]]:
        trades = build_round_trips(self.load_executions())
        self._populate_open_trade_metrics(trades, price_map=price_map)
        notes = self.load_notes()
        ignored_map = self.load_ignored_trade_ids()
        sym = (symbol or "").strip().upper()
        out = []
        for t in trades:
            is_ignored = t["id"] in ignored_map
            t["is_ignored"] = is_ignored
            if is_ignored:
                t["ignored_reason"] = ignored_map[t["id"]].get("reason", "")
                t["ignored_at"] = ignored_map[t["id"]].get("ignored_at", "")
            if is_ignored and not include_ignored:
                continue
            ref_date = t["open_date"] or t["close_date"]
            if start and ref_date < start:
                continue
            if end and ref_date > end:
                continue
            if sym and sym not in t["symbol"].upper():
                continue
            if account and t["account_id"] != account:
                continue
            n = notes.get(t["id"], {})
            t["notes"] = n.get("notes", "")
            t["tags"] = n.get("tags", [])
            initial_stop = n.get("initial_stop")
            t["initial_stop"] = initial_stop
            t["notes_updated_at"] = n.get("notes_updated_at")

            # Calculate Initial Risk and Real R-Multiple if initial_stop is provided
            # For LONG: initial_risk_per_share = avg_entry - initial_stop
            # For SHORT: initial_risk_per_share = initial_stop - avg_entry
            initial_risk_per_share = None
            initial_risk_total = None
            initial_risk_pct = None
            r_multiple = None
            avg_entry = t.get("avg_entry")
            if initial_stop is not None and avg_entry is not None:
                if t.get("direction") == "LONG" and avg_entry > initial_stop:
                    initial_risk_per_share = avg_entry - initial_stop
                elif t.get("direction") == "SHORT" and initial_stop > avg_entry:
                    initial_risk_per_share = initial_stop - avg_entry

                if initial_risk_per_share and initial_risk_per_share > EPS:
                    initial_risk_pct = (initial_risk_per_share / avg_entry) * 100.0
                    max_pos = t.get("max_position") or t.get("entry_qty") or 0.0
                    initial_risk_total = initial_risk_per_share * max_pos
                    if t.get("pnl") is not None and initial_risk_total > EPS:
                        r_multiple = t["pnl"] / initial_risk_total

            t["initial_risk_per_share"] = initial_risk_per_share
            t["initial_risk_total"] = initial_risk_total
            t["initial_risk_pct"] = initial_risk_pct
            t["r_multiple"] = r_multiple
            out.append(t)
        return out

    def get_journal(self, start: Optional[str] = None, end: Optional[str] = None,
                    symbol: Optional[str] = None, account: Optional[str] = None,
                    include_ignored: bool = False) -> Dict[str, Any]:
        trades = self.get_trades(start, end, symbol, account, include_ignored=include_ignored)
        active_trades = [t for t in trades if not t.get("is_ignored")]
        all_execs = self.load_executions()
        ignored_map = self.load_ignored_trade_ids()
        return {
            "trades": trades,
            "stats": compute_statistics(active_trades),
            "monthly": compute_period_pnl(active_trades, "month"),
            "yearly": compute_period_pnl(active_trades, "year"),
            "equity_curve": compute_equity_curve(active_trades),
            "accounts": sorted({e["account_id"] for e in all_execs}),
            "years": sorted({e["trade_date"][:4] for e in all_execs}, reverse=True),
            "ignored_count": len(ignored_map),
            "last_sync": self.get_last_sync(),
        }

    def update_notes(self, trade_id: str, notes: str, tags: Optional[List[str]] = None,
                     initial_stop: Optional[float] = None) -> Dict[str, Any]:
        clean_tags = sorted({str(t).strip() for t in (tags or []) if str(t).strip()})
        now = datetime.now().isoformat(timespec="seconds")
        with self._write_lock, self._connect() as conn:
            conn.execute(
                """INSERT INTO trade_notes (trade_id, notes, tags, initial_stop, updated_at) VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(trade_id) DO UPDATE SET notes = excluded.notes, tags = excluded.tags,
                   initial_stop = excluded.initial_stop, updated_at = excluded.updated_at""",
                [trade_id, notes or "", json.dumps(clean_tags), initial_stop, now],
            )
        return {
            "trade_id": trade_id,
            "notes": notes or "",
            "tags": clean_tags,
            "initial_stop": initial_stop,
            "notes_updated_at": now,
        }




journal_service = JournalService()
