import os
import sys
import json
import zipfile
import tempfile
import requests
import datetime
import pandas as pd
from typing import List, Dict, Any, Optional, Set
from collections import defaultdict


class SEC13FProvider:
    """
    Free SEC Form 13F data provider.
    Retrieves institutional holdings data directly from official SEC EDGAR sources:
    1. SEC Company Tickers directory (CIK to Ticker mapping)
    2. SEC 13F bulk dataset or EDGAR filings for historical quarterly institutional counts
    """

    SEC_HEADERS = {
        "User-Agent": "PivotTrader Research info@pivottrader.org",
        "Accept-Encoding": "gzip, deflate",
        "Host": "data.sec.gov"
    }
    
    SEC_WWW_HEADERS = {
        "User-Agent": "PivotTrader Research info@pivottrader.org",
        "Accept-Encoding": "gzip, deflate",
    }

    def __init__(self, cache_dir: Optional[str] = None):
        self.cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), "..", "..", "data", "sec_13f_cache")
        os.makedirs(self.cache_dir, exist_ok=True)
        self._ticker_cik_map: Optional[Dict[str, int]] = None
        self._cik_ticker_map: Optional[Dict[int, str]] = None

    def get_ticker_cik_mapping(self) -> Dict[str, int]:
        """Loads and caches SEC ticker-to-CIK mapping."""
        if self._ticker_cik_map is not None:
            return self._ticker_cik_map

        cache_path = os.path.join(self.cache_dir, "company_tickers.json")
        data = None

        # Check local cache first (valid for 30 days)
        if os.path.exists(cache_path):
            try:
                mtime = os.path.getmtime(cache_path)
                if (datetime.datetime.now().timestamp() - mtime) < 30 * 86400:
                    with open(cache_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
            except Exception:
                data = None

        if data is None:
            try:
                url = "https://www.sec.gov/files/company_tickers.json"
                resp = requests.get(url, headers=self.SEC_WWW_HEADERS, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    with open(cache_path, "w", encoding="utf-8") as f:
                        json.dump(data, f)
            except Exception as e:
                print(f"[SEC-13F] Could not load company_tickers from SEC: {e}")

        ticker_map: Dict[str, int] = {}
        cik_map: Dict[int, str] = {}
        if data:
            for item in data.values():
                sym = item.get("ticker", "").strip().upper()
                cik = item.get("cik_str")
                if sym and cik:
                    ticker_map[sym] = int(cik)
                    cik_map[int(cik)] = sym

        self._ticker_cik_map = ticker_map
        self._cik_ticker_map = cik_map
        return ticker_map

    def fetch_historical_quarters_for_symbol(self, symbol: str, num_quarters: int = 4) -> List[Dict[str, Any]]:
        """
        Queries SEC EDGAR submissions to determine quarterly 13F filing presence
        or institutional institutional ownership records for a specific symbol.
        """
        ticker_map = self.get_ticker_cik_mapping()
        cik = ticker_map.get(symbol.upper())
        if not cik:
            return []

        padded_cik = str(cik).zfill(10)
        url = f"https://data.sec.gov/submissions/CIK{padded_cik}.json"
        
        try:
            resp = requests.get(url, headers=self.SEC_HEADERS, timeout=12)
            if resp.status_code != 200:
                return []
            
            data = resp.json()
            filings = data.get("filings", {}).get("recent", {})
            forms = filings.get("form", [])
            filing_dates = filings.get("filingDate", [])
            report_dates = filings.get("reportDate", [])

            # Find 10-Q and 10-K report dates to construct fiscal quarters
            quarters_seen = set()
            records = []
            for i, form in enumerate(forms):
                if form in ("10-Q", "10-K") and i < len(report_dates):
                    rd_str = report_dates[i]
                    if not rd_str:
                        continue
                    try:
                        rd = datetime.datetime.strptime(rd_str, "%Y-%m-%d").date()
                        year = rd.year
                        q = (rd.month - 1) // 3 + 1
                        fq = f"{year}-Q{q}"
                        if fq not in quarters_seen:
                            quarters_seen.add(fq)
                            records.append({
                                "symbol": symbol.upper(),
                                "report_date": rd,
                                "fiscal_quarter": fq,
                                "source": "sec_edgar"
                            })
                        if len(records) >= num_quarters:
                            break
                    except Exception:
                        continue
            return records
        except Exception as e:
            print(f"[SEC-13F] Error fetching EDGAR submissions for {symbol}: {e}")
            return []

    def download_and_parse_quarter_dataset(self, year: int, quarter: int, target_symbols: Optional[Set[str]] = None) -> pd.DataFrame:
        """
        Downloads and parses the official SEC Form 13F quarterly bulk dataset:
        https://www.sec.gov/files/structureddata/data/form-13f-data-sets/{year}q{quarter}_form13f.zip
        Counts distinct institutional filers per security and returns DataFrame.
        """
        zip_name = f"{year}q{quarter}_form13f.zip"
        zip_url = f"https://www.sec.gov/files/structureddata/data/form-13f-data-sets/{zip_name}"
        zip_path = os.path.join(self.cache_dir, zip_name)

        if not os.path.exists(zip_path):
            try:
                print(f"[SEC-13F] Downloading Form 13F bulk dataset for {year}-Q{quarter}...")
                resp = requests.get(zip_url, headers=self.SEC_WWW_HEADERS, stream=True, timeout=60)
                if resp.status_code == 200:
                    with open(zip_path, "wb") as f:
                        for chunk in resp.iter_content(chunk_size=65536):
                            f.write(chunk)
                else:
                    print(f"[SEC-13F] Bulk dataset {zip_name} returned status {resp.status_code}")
                    return pd.DataFrame()
            except Exception as e:
                print(f"[SEC-13F] Failed to download {zip_url}: {e}")
                return pd.DataFrame()

        # Parse INFOTABLE.tsv from the zip
        target_syms = {s.upper() for s in target_symbols} if target_symbols else None
        counts_by_issuer = defaultdict(set)

        try:
            with zipfile.ZipFile(zip_path, 'r') as z:
                # Find infotable file
                info_filename = None
                for fname in z.namelist():
                    if "INFOTABLE" in fname.upper() and fname.endswith(".tsv"):
                        info_filename = fname
                        break
                
                if not info_filename:
                    print(f"[SEC-13F] INFOTABLE.tsv not found in {zip_name}")
                    return pd.DataFrame()

                print(f"[SEC-13F] Processing {info_filename} for {year}-Q{quarter}...")
                with z.open(info_filename) as f:
                    # Read TSV line by line to keep memory minimal
                    header_line = f.readline().decode("utf-8", errors="ignore").strip().split("\t")
                    header_map = {col.upper(): idx for idx, col in enumerate(header_line)}
                    
                    acc_idx = header_map.get("ACCESSION_NUMBER")
                    issuer_idx = header_map.get("NAMEOFISSUER")
                    cusip_idx = header_map.get("CUSIP")

                    if acc_idx is None:
                        return pd.DataFrame()

                    for line_bytes in f:
                        line = line_bytes.decode("utf-8", errors="ignore").strip().split("\t")
                        if len(line) <= acc_idx:
                            continue
                        acc_num = line[acc_idx]
                        issuer = line[issuer_idx].strip().upper() if issuer_idx is not None and len(line) > issuer_idx else ""
                        if issuer:
                            counts_by_issuer[issuer].add(acc_num)

            # Map counts to records
            # Month/Day for quarterly end
            q_end_dates = {1: f"{year}-03-31", 2: f"{year}-06-30", 3: f"{year}-09-30", 4: f"{year}-12-31"}
            report_date = datetime.datetime.strptime(q_end_dates.get(quarter, f"{year}-12-31"), "%Y-%m-%d").date()
            fq = f"{year}-Q{quarter}"

            records = []
            for issuer, filers in counts_by_issuer.items():
                records.append({
                    "symbol": issuer, # Can be matched or resolved
                    "report_date": report_date,
                    "fiscal_quarter": fq,
                    "holders_count": len(filers),
                    "ownership_pct": None,
                    "source": "sec_13f"
                })

            return pd.DataFrame(records)
        except Exception as e:
            print(f"[SEC-13F] Error reading {zip_path}: {e}")
            return pd.DataFrame()

