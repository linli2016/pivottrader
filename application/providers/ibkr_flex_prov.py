"""
IBKR Flex Web Service client + Activity Flex Query XML parser.

Flow (Flex Web Service v3):
  1. SendRequest?t=<token>&q=<query_id>&v=3  -> <FlexStatementResponse> with a ReferenceCode + Url
  2. <Url>?t=<token>&q=<reference_code>&v=3 -> <FlexQueryResponse> (the statement), or a
     <FlexStatementResponse> warning (e.g. 1019 "generation in progress") which must be polled.

Only the <Trades><Trade .../></Trades> section is consumed. <Order>, <Lot> and summary rows are ignored so
each execution is counted exactly once.
"""
import re
import time
import logging
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional, Tuple

import requests

logger = logging.getLogger("pivottrader.ibkr_flex")

FLEX_BASE_URL = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService"
FLEX_VERSION = "3"
# IBKR rejects requests without a User-Agent header.
USER_AGENT = "PivotTrader/1.0 (Python requests)"

# Flex error codes that indicate "try again shortly" rather than a hard failure.
RETRYABLE_CODES = {"1001", "1004", "1009", "1018", "1019", "1021"}


class FlexError(Exception):
    """Raised when the Flex Web Service returns an error or an unexpected payload."""

    def __init__(self, message: str, code: Optional[str] = None):
        super().__init__(message)
        self.code = code


class IBKRFlexClient:
    def __init__(
        self,
        token: str,
        query_id: str,
        session: Optional[requests.Session] = None,
        poll_interval: float = 3.0,
        max_wait: float = 120.0,
        base_url: str = FLEX_BASE_URL,
    ):
        if not token or not query_id:
            raise FlexError("Flex token and query ID are both required")
        self.token = token.strip()
        self.query_id = str(query_id).strip()
        self.session = session or requests.Session()
        self.poll_interval = poll_interval
        self.max_wait = max_wait
        self.base_url = base_url.rstrip("/")

    def _get(self, url: str, params: Dict[str, str], retries: int = 3, backoff: float = 1.0) -> bytes:
        last_exc: Optional[Exception] = None
        for attempt in range(retries):
            try:
                resp = self.session.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=60)
                resp.raise_for_status()
                return resp.content
            except requests.RequestException as e:
                last_exc = e
                if attempt < retries - 1:
                    sleep_time = backoff * (2 ** attempt)
                    logger.warning(
                        f"Request to {url} failed ({e}); retrying in {sleep_time:.1f}s "
                        f"(attempt {attempt + 1}/{retries})..."
                    )
                    time.sleep(sleep_time)
                else:
                    raise
        if last_exc:
            raise last_exc
        raise FlexError("Failed to fetch data from IBKR Flex Web Service")

    def send_request(self) -> Tuple[str, str]:
        content = self._get(
            f"{self.base_url}/SendRequest",
            {"t": self.token, "q": self.query_id, "v": FLEX_VERSION},
        )
        root = _parse_xml(content)
        status = (root.findtext("Status") or "").strip()
        if status != "Success":
            code = (root.findtext("ErrorCode") or "").strip()
            msg = (root.findtext("ErrorMessage") or "Unknown Flex error").strip()
            raise FlexError(f"Flex SendRequest failed ({code}): {msg}", code=code)
        ref_code = (root.findtext("ReferenceCode") or "").strip()
        url = (root.findtext("Url") or f"{self.base_url}/GetStatement").strip()
        if not ref_code:
            raise FlexError("Flex SendRequest succeeded but returned no ReferenceCode")
        return ref_code, url

    def get_statement(self, ref_code: str, url: str) -> bytes:
        deadline = time.monotonic() + self.max_wait
        fallback_url = f"{self.base_url}/GetStatement"
        current_url = url
        while True:
            try:
                content = self._get(current_url, {"t": self.token, "q": ref_code, "v": FLEX_VERSION})
            except requests.RequestException as e:
                if current_url != fallback_url:
                    logger.warning(
                        f"Failed to fetch statement from {current_url} ({e}); "
                        f"falling back to base URL {fallback_url}"
                    )
                    current_url = fallback_url
                    continue
                raise
            root = _parse_xml(content)
            if root.tag == "FlexQueryResponse":
                return content
            code = (root.findtext("ErrorCode") or "").strip()
            msg = (root.findtext("ErrorMessage") or "Unknown Flex error").strip()
            if code in RETRYABLE_CODES and time.monotonic() < deadline:
                logger.info(f"Flex statement not ready ({code}: {msg}); retrying in {self.poll_interval}s")
                time.sleep(self.poll_interval)
                continue
            raise FlexError(f"Flex GetStatement failed ({code}): {msg}", code=code)

    def fetch_statement(self) -> bytes:
        ref_code, url = self.send_request()
        return self.get_statement(ref_code, url)


def _parse_xml(content: bytes) -> ET.Element:
    try:
        return ET.fromstring(content)
    except ET.ParseError as e:
        snippet = content[:200].decode("utf-8", errors="replace") if isinstance(content, bytes) else str(content)[:200]
        raise FlexError(f"Invalid XML from Flex Web Service: {e}. Payload starts with: {snippet!r}")


# ----------------- Parsing helpers -----------------

def _to_float(val: Optional[str]) -> Optional[float]:
    if val is None:
        return None
    s = str(val).strip().replace(",", "")
    if s == "" or s.upper() in {"N/A", "--"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_flex_date(val: Optional[str]) -> Optional[str]:
    """Normalize IBKR date formats (yyyyMMdd, yyyy-MM-dd, MM/dd/yyyy) to ISO yyyy-MM-dd."""
    s = (val or "").strip()
    if not s:
        return None
    m = re.match(r"^(\d{4})-?(\d{2})-?(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})", s)
    if m:
        year = m.group(3)
        if len(year) == 2:
            year = f"20{year}"
        return f"{year}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    return None


def parse_flex_datetime(val: Optional[str], fallback_date: Optional[str] = None) -> Optional[str]:
    """Normalize IBKR dateTime (e.g. '20240115;093512', '2024-01-15, 09:35:12') to 'yyyy-MM-ddTHH:MM:SS'."""
    s = (val or "").strip()
    if not s:
        return f"{fallback_date}T00:00:00" if fallback_date else None
    parts = re.split(r"[;,\sT]+", s, maxsplit=1)
    date_part = parse_flex_date(parts[0]) or fallback_date
    if not date_part:
        return None
    time_digits = re.sub(r"\D", "", parts[1]) if len(parts) > 1 else ""
    time_digits = (time_digits[:6]).ljust(6, "0")
    return f"{date_part}T{time_digits[0:2]}:{time_digits[2:4]}:{time_digits[4:6]}"


def parse_flex_trades(content: bytes, asset_categories: Optional[set] = None) -> Dict[str, Any]:
    """
    Parse an Activity Flex Query XML statement into normalized execution dicts.

    Returns {"executions": [...], "skipped": int, "has_fifo_pnl": bool, "accounts": [...]}.
    """
    asset_categories = asset_categories or {"STK"}
    root = _parse_xml(content)
    if root.tag == "FlexStatementResponse":
        code = (root.findtext("ErrorCode") or "").strip()
        msg = (root.findtext("ErrorMessage") or "").strip()
        raise FlexError(f"Flex statement error ({code}): {msg}", code=code)
    if root.tag != "FlexQueryResponse":
        raise FlexError(f"Unexpected Flex root element <{root.tag}>")

    executions: List[Dict[str, Any]] = []
    skipped = 0
    accounts = set()
    has_fifo = False

    for stmt in root.iter("FlexStatement"):
        stmt_account = stmt.get("accountId") or ""
        for trades_el in stmt.findall("Trades"):
            for el in trades_el.findall("Trade"):
                a = el.attrib
                level = (a.get("levelOfDetail") or "EXECUTION").upper()
                if level != "EXECUTION":
                    continue
                if (a.get("assetCategory") or "").upper() not in asset_categories:
                    skipped += 1
                    continue

                exec_id = a.get("tradeID") or a.get("transactionID") or a.get("ibExecID")
                if not exec_id:
                    skipped += 1
                    continue

                trade_date = parse_flex_date(a.get("tradeDate"))
                date_time = parse_flex_datetime(a.get("dateTime"), fallback_date=trade_date)
                if not trade_date and date_time:
                    trade_date = date_time[:10]
                if not trade_date:
                    skipped += 1
                    continue

                buy_sell = (a.get("buySell") or "").upper()
                qty = _to_float(a.get("quantity")) or 0.0
                # Flex quantities are signed, but enforce the sign from buySell defensively.
                if buy_sell.startswith("SELL") and qty > 0:
                    qty = -qty
                elif buy_sell.startswith("BUY") and qty < 0:
                    qty = -qty

                price = _to_float(a.get("tradePrice")) or 0.0
                commission = _to_float(a.get("ibCommission")) or 0.0
                proceeds = _to_float(a.get("proceeds"))
                if proceeds is None:
                    proceeds = -qty * price
                net_cash = _to_float(a.get("netCash"))
                if net_cash is None:
                    net_cash = proceeds + commission
                fifo = _to_float(a.get("fifoPnlRealized"))
                if "fifoPnlRealized" in a:
                    has_fifo = True

                account_id = a.get("accountId") or stmt_account
                accounts.add(account_id)
                executions.append({
                    "exec_id": str(exec_id),
                    "account_id": account_id,
                    "conid": a.get("conid") or "",
                    "symbol": (a.get("symbol") or "").strip(),
                    "description": a.get("description") or "",
                    "asset_category": (a.get("assetCategory") or "").upper(),
                    "currency": a.get("currency") or "USD",
                    "fx_rate_to_base": _to_float(a.get("fxRateToBase")) or 1.0,
                    "trade_date": trade_date,
                    "date_time": date_time,
                    "quantity": qty,
                    "price": price,
                    "proceeds": proceeds,
                    "commission": commission,
                    "net_cash": net_cash,
                    "fifo_pnl_realized": fifo if "fifoPnlRealized" in a else None,
                    "buy_sell": buy_sell,
                    "open_close": (a.get("openCloseIndicator") or "").upper(),
                    "order_id": a.get("ibOrderID") or "",
                })

    return {
        "executions": executions,
        "skipped": skipped,
        "has_fifo_pnl": has_fifo,
        "accounts": sorted(a for a in accounts if a),
    }

