import xml.etree.ElementTree as ET
import pandas as pd
import requests
import time
import sys
from typing import List, Dict, Any
from src.providers.base import AbstractDataProvider

try:
    from ib_insync import IB, Stock, util
    IB_AVAILABLE = True
except ImportError:
    IB_AVAILABLE = False

class IBKRProvider(AbstractDataProvider):
    def __init__(self, host: str = "127.0.0.1", port: int = 7496, client_id: int = 1):
        self.host = host
        self.port = port
        self.client_id = client_id
        self.ib = None
        self.connected = False

    def connect(self) -> None:
        """Connects to the local TWS or IB Gateway workstation."""
        if not IB_AVAILABLE:
            raise ImportError("The 'ib_insync' package is not installed or available.")
            
        print(f"Connecting to IBKR at {self.host}:{self.port} (Client ID: {self.client_id})...")
        self.ib = IB()
        try:
            self.ib.connect(self.host, self.port, clientId=self.client_id, readonly=True)
            self.connected = True
            print("Successfully connected to Interactive Brokers.")
        except Exception as e:
            self.connected = False
            raise ConnectionError(f"Failed to connect to IBKR workstation: {e}. Ensure TWS or IB Gateway is running and API access is enabled.")

    def disconnect(self) -> None:
        """Closes the socket connection to TWS/Gateway."""
        if self.ib and self.ib.isConnected():
            self.ib.disconnect()
            self.connected = False
            print("Disconnected from Interactive Brokers.")

    def fetch_universe(self) -> List[Dict[str, Any]]:
        """Downloads full active lists of NYSE and NASDAQ issues from github mirror."""
        # Note: Interactive Brokers doesn't expose a simple symbol list endpoint,
        # so we fetch the broad active US listing and validate/resolve them.
        nyse_url = "https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/nyse/nyse_full_tickers.json"
        nasdaq_url = "https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/nasdaq/nasdaq_full_tickers.json"
        
        tickers = []
        
        def get_and_clean(url: str, exchange: str) -> List[Dict[str, Any]]:
            try:
                headers = {"User-Agent": "Mozilla/5.0"}
                r = requests.get(url, headers=headers, timeout=15)
                r.raise_for_status()
                data = r.json()
                
                clean_data = []
                for item in data:
                    sym = item.get("symbol", "").strip()
                    name = item.get("name", "").strip()
                    sector = item.get("sector", "") or ""
                    industry = item.get("industry", "") or ""
                    
                    if not sym.isalpha() or len(sym) > 4:
                        continue
                    if any(term in name.upper() for term in ["ETF", "ETN", "EXCHANGE TRADED", "EXCHANGE-TRADED", "FUND", "TRUST", "INDEX"]):
                        continue
                    if any(term in name.upper() for term in ["ADR", "SPONS ADR", "SPONS. ADR", "DEPOSITARY", "DEPOSITORY", "RECEIPT"]):
                        continue
                    if any(term in name.upper() for term in ["ACQUISITION CORP", "ACQUISITION CORP.", "SPAC", "BLANK CHECK"]):
                        continue
                        
                    clean_data.append({
                        "symbol": sym,
                        "exchange": exchange,
                        "name": name,
                        "asset_type": "Common Stock",
                        "active": True
                    })
                return clean_data
            except Exception as e:
                print(f"Warning: Failed to fetch {exchange} universe from mirror: {e}")
                return []

        tickers.extend(get_and_clean(nyse_url, "NYSE"))
        tickers.extend(get_and_clean(nasdaq_url, "NASDAQ"))
        
        seen = set()
        unique_tickers = []
        for t in tickers:
            if t["symbol"] not in seen:
                seen.add(t["symbol"])
                unique_tickers.append(t)
                
        return unique_tickers

    def fetch_daily_bars(self, symbols: List[str], start_date: str) -> pd.DataFrame:
        """Requests historical trade bars from IBKR."""
        if not self.connected or not self.ib:
            raise ConnectionError("IBKR Provider not connected. Call connect() first.")
            
        if not symbols:
            return pd.DataFrame()
            
        all_bars = []
        # Calculate duration based on start_date
        try:
            from datetime import datetime
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            delta_days = (datetime.now() - start_dt).days
            if delta_days > 365:
                years = max(1, round(delta_days / 365))
                duration = f"{years} Y"
            else:
                duration = f"{max(5, delta_days)} D"
        except Exception:
            duration = "5 Y"

        
        total = len(symbols)
        for idx, symbol in enumerate(symbols):
            pct = ((idx + 1) / total) * 100
            sys.stdout.write(f"\r[IBKR] Progress: {idx+1}/{total} ({pct:.1f}%) | Last: {symbol:<5}")
            sys.stdout.flush()
            try:
                contract = Stock(symbol, "SMART", "USD")
                # Request historical data bars
                bars = self.ib.reqHistoricalData(
                    contract,
                    endDateTime="",
                    durationStr=duration,
                    barSizeSetting="1 day",
                    whatToShow="TRADES",
                    useRTH=True,
                    keepUpToDate=False
                )
                
                if not bars:
                    continue
                    
                df = util.df(bars)
                df["symbol"] = symbol
                df = df.rename(columns={
                    "open_": "open", "high_": "high", "low_": "low", "close_": "close"
                })
                # Normalize date columns (can be date or datetime)
                df["date"] = pd.to_datetime(df["date"]).dt.date
                
                # Keep required columns
                df = df[["symbol", "date", "open", "high", "low", "close", "volume"]]
                df = df.dropna(subset=["close"])
                all_bars.append(df)
                
                # Sleep to conform to IBKR historical data pacing guidelines
                time.sleep(0.3)
            except Exception as e:
                # Add spacing to avoid overwriting warning
                sys.stdout.write("\n")
                print(f"Warning: Failed to fetch daily bars from IBKR for {symbol}: {e}")
                
        if symbols:
            sys.stdout.write("\n")
            sys.stdout.flush()
                
        if all_bars:
            return pd.concat(all_bars, ignore_index=True)
        return pd.DataFrame()

    def fetch_quarterly_fundamentals(self, symbols: List[str]) -> pd.DataFrame:
        """Fetches and parses financial reports from IBKR (Reuters) XML data."""
        if not self.connected or not self.ib:
            raise ConnectionError("IBKR Provider not connected. Call connect() first.")
            
        if not symbols:
            return pd.DataFrame()
            
        all_funds = []
        total = len(symbols)
        for idx, symbol in enumerate(symbols):
            pct = ((idx + 1) / total) * 100
            sys.stdout.write(f"\r[IBKR] Fetching fundamentals: {idx+1}/{total} ({pct:.1f}%) | Last: {symbol:<5}")
            sys.stdout.flush()
            try:
                contract = Stock(symbol, "SMART", "USD")
                # Request reports statements
                xml_str = self.ib.reqFundamentalData(contract, reportType="ReportsFinStatements")
                if not xml_str:
                    continue
                    
                # Parse XML structure
                records = self._parse_xml_statements(xml_str, symbol)
                if not records:
                    continue
                    
                df = pd.DataFrame(records)
                df = df.sort_values(by="fiscal_quarter")
                
                # Compute QoQ EPS acceleration
                for idy, row in df.iterrows():
                    fq = row["fiscal_quarter"]
                    try:
                        y, q = fq.split("-Q")
                        prior_fq = f"{int(y)-1}-Q{q}"
                        prior_rows = df[df["fiscal_quarter"] == prior_fq]
                        if not prior_rows.empty:
                            prior_eps = prior_rows.iloc[0]["eps_diluted"]
                            curr_eps = row["eps_diluted"]
                            if prior_eps is not None and not pd.isna(prior_eps):
                                denominator = max(0.01, abs(prior_eps))
                                growth = ((curr_eps - prior_eps) / denominator) * 100
                                df.at[idy, "eps_qoq_growth"] = float(growth)
                    except Exception:
                        pass
                        
                all_funds.append(df)
                time.sleep(0.5)
            except Exception as e:
                sys.stdout.write("\n")
                print(f"Warning: Failed to fetch fundamentals from IBKR for {symbol}: {e}")
                
        if symbols:
            sys.stdout.write("\n")
            sys.stdout.flush()
                
        if all_funds:
            return pd.concat(all_funds, ignore_index=True)
        return pd.DataFrame()

    def _parse_xml_statements(self, xml_str: str, symbol: str) -> List[Dict[str, Any]]:
        """Parses reuters XML financial statements to extract EPSD and REVE coacodes."""
        try:
            root = ET.fromstring(xml_str)
        except ET.ParseError:
            return []
            
        interim = root.find(".//InterimPeriods")
        if interim is None:
            return []
            
        records = []
        for fp in interim.findall("FiscalPeriod"):
            end_date_el = fp.find("PeriodEndDate")
            if end_date_el is None:
                continue
            end_date = end_date_el.text
            
            hp = fp.find("FPHeader")
            year = hp.attrib.get("fiscalYear") if hp is not None else end_date.split("-")[0]
            period_num = hp.attrib.get("periodNumber") if hp is not None else "1"
            fiscal_q = f"{year}-Q{period_num}"
            
            inc_stmt = fp.find(".//Statement[@Type='INC']")
            if inc_stmt is None:
                continue
                
            eps = None
            rev = None
            
            for line in inc_stmt.findall(".//lineItem"):
                coa = line.attrib.get("coaCode")
                val = line.text
                if val is not None:
                    try:
                        val_float = float(val)
                        if coa == "EPSD":
                            eps = val_float
                        elif coa == "REVE":
                            rev = val_float
                    except ValueError:
                        pass
                        
            if eps is not None:
                records.append({
                    "symbol": symbol,
                    "report_date": pd.to_datetime(end_date).date(),
                    "fiscal_quarter": fiscal_q,
                    "eps_diluted": eps,
                    "eps_qoq_growth": None,
                    "total_revenue": rev
                })
                
        return records
