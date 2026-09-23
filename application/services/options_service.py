import time
import logging
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor, as_completed
import yfinance as yf
import pandas as pd

logger = logging.getLogger("pivottrader.options")

class OptionsService:
    def __init__(self, cache_ttl_seconds: int = 1800):
        self._cache: Dict[str, tuple[float, Dict[str, Any]]] = {}
        self._cache_ttl = cache_ttl_seconds

    def _get_cache_key(self, symbol: str, expiration: Optional[str]) -> str:
        return f"{symbol.upper()}:{expiration or 'near_term'}"

    def get_options_profile(self, symbol: str, expiration: Optional[str] = "near_term") -> Dict[str, Any]:
        """
        Retrieves the options open interest (OI) profile, strike distributions,
        and Call Wall / Put Wall for a given symbol.
        """
        sym = symbol.strip().upper()
        cache_key = self._get_cache_key(sym, expiration)
        now = time.time()

        if cache_key in self._cache:
            ts, cached_data = self._cache[cache_key]
            if now - ts < self._cache_ttl:
                return cached_data

        try:
            ticker = yf.Ticker(sym)
            available_expirations = list(ticker.options or [])
            if not available_expirations:
                empty_res = {
                    "symbol": sym,
                    "has_options": False,
                    "message": f"No options available for {sym}.",
                    "spot_price": None,
                    "all_expirations": [],
                    "selected_expiration": expiration or "near_term",
                    "call_wall": None,
                    "put_wall": None,
                    "total_call_oi": 0,
                    "total_put_oi": 0,
                    "put_call_ratio": 0.0,
                    "expected_corridor": None,
                    "strikes": []
                }
                self._cache[cache_key] = (now, empty_res)
                return empty_res

            # Resolve current spot price
            spot_price = None
            try:
                fast = ticker.fast_info
                spot_price = getattr(fast, "last_price", None) or getattr(fast, "regular_market_price", None)
            except Exception:
                pass

            # Determine expiration target list
            target_exps: List[str] = []
            selected_exp_label = expiration or "near_term"

            if selected_exp_label == "near_term":
                # Front-month / near-term: combine up to first 4 expirations
                target_exps = available_expirations[:4]
            elif selected_exp_label == "all":
                target_exps = available_expirations
            elif selected_exp_label in available_expirations:
                target_exps = [selected_exp_label]
            else:
                # If requested expiration not found, default to near-term
                target_exps = available_expirations[:4]
                selected_exp_label = "near_term"

            # Parallel download of option chains
            calls_list: List[pd.DataFrame] = []
            puts_list: List[pd.DataFrame] = []

            def _fetch_chain(exp_date: str):
                try:
                    ch = ticker.option_chain(exp_date)
                    return exp_date, ch.calls, ch.puts
                except Exception as e:
                    logger.warning(f"Failed to fetch option chain for {sym} {exp_date}: {e}")
                    return exp_date, None, None

            with ThreadPoolExecutor(max_workers=min(6, len(target_exps))) as executor:
                futures = {executor.submit(_fetch_chain, exp): exp for exp in target_exps}
                for f in as_completed(futures):
                    _, c_df, p_df = f.result()
                    if c_df is not None and not c_df.empty:
                        calls_list.append(c_df)
                    if p_df is not None and not p_df.empty:
                        puts_list.append(p_df)

            if not calls_list and not puts_list:
                empty_res = {
                    "symbol": sym,
                    "has_options": False,
                    "message": f"Option chain returned no contracts for {sym}.",
                    "spot_price": spot_price,
                    "all_expirations": available_expirations,
                    "selected_expiration": selected_exp_label,
                    "call_wall": None,
                    "put_wall": None,
                    "total_call_oi": 0,
                    "total_put_oi": 0,
                    "put_call_ratio": 0.0,
                    "expected_corridor": None,
                    "strikes": []
                }
                self._cache[cache_key] = (now, empty_res)
                return empty_res

            # Aggregate calls
            all_calls = pd.concat(calls_list, ignore_index=True) if calls_list else pd.DataFrame()
            all_puts = pd.concat(puts_list, ignore_index=True) if puts_list else pd.DataFrame()

            # Ensure expected columns exist
            for df in (all_calls, all_puts):
                if not df.empty:
                    if "openInterest" not in df.columns:
                        df["openInterest"] = 0
                    if "volume" not in df.columns:
                        df["volume"] = 0
                    if "strike" not in df.columns:
                        df["strike"] = 0.0
                    df["openInterest"] = pd.to_numeric(df["openInterest"], errors="coerce").fillna(0).astype(int)
                    df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0).astype(int)
                    df["strike"] = pd.to_numeric(df["strike"], errors="coerce").fillna(0.0).astype(float)

            call_agg = all_calls.groupby("strike").agg({"openInterest": "sum", "volume": "sum"}) if not all_calls.empty else pd.DataFrame()
            put_agg = all_puts.groupby("strike").agg({"openInterest": "sum", "volume": "sum"}) if not all_puts.empty else pd.DataFrame()

            call_strikes = set(call_agg.index) if not call_agg.empty else set()
            put_strikes = set(put_agg.index) if not put_agg.empty else set()
            all_strikes = sorted(list(call_strikes.union(put_strikes)))

            total_call_oi = int(call_agg["openInterest"].sum()) if not call_agg.empty else 0
            total_put_oi = int(put_agg["openInterest"].sum()) if not put_agg.empty else 0
            pcr = round(total_put_oi / total_call_oi, 2) if total_call_oi > 0 else 0.0

            # Find Call Wall (strike with highest Call OI)
            call_wall_strike = None
            call_wall_oi = 0
            call_wall_vol = 0
            if not call_agg.empty and call_agg["openInterest"].max() > 0:
                call_wall_strike = float(call_agg["openInterest"].idxmax())
                call_wall_oi = int(call_agg.loc[call_wall_strike, "openInterest"])
                call_wall_vol = int(call_agg.loc[call_wall_strike, "volume"])

            # Find Put Wall (strike with highest Put OI)
            put_wall_strike = None
            put_wall_oi = 0
            put_wall_vol = 0
            if not put_agg.empty and put_agg["openInterest"].max() > 0:
                put_wall_strike = float(put_agg["openInterest"].idxmax())
                put_wall_oi = int(put_agg.loc[put_wall_strike, "openInterest"])
                put_wall_vol = int(put_agg.loc[put_wall_strike, "volume"])

            # Filter strikes around spot price (or walls) to avoid huge tails (e.g. within 0.4x to 1.8x spot price)
            min_bound = (spot_price * 0.45) if spot_price else 0
            max_bound = (spot_price * 1.75) if spot_price else float("inf")

            # Always ensure walls are included in bounds
            if put_wall_strike and put_wall_strike < min_bound:
                min_bound = put_wall_strike * 0.95
            if call_wall_strike and call_wall_strike > max_bound:
                max_bound = call_wall_strike * 1.05

            strike_records = []
            for s in all_strikes:
                s_float = float(s)
                c_oi = int(call_agg.loc[s, "openInterest"]) if s in call_strikes else 0
                p_oi = int(put_agg.loc[s, "openInterest"]) if s in put_strikes else 0
                c_vol = int(call_agg.loc[s, "volume"]) if s in call_strikes else 0
                p_vol = int(put_agg.loc[s, "volume"]) if s in put_strikes else 0

                # Filter out strikes with zero interest outside boundary
                if (c_oi == 0 and p_oi == 0 and c_vol == 0 and p_vol == 0):
                    continue
                if spot_price and (s_float < min_bound or s_float > max_bound):
                    # Keep walls even if outside standard bounds
                    if s_float != call_wall_strike and s_float != put_wall_strike:
                        continue

                strike_records.append({
                    "strike": s_float,
                    "call_oi": c_oi,
                    "put_oi": p_oi,
                    "call_vol": c_vol,
                    "put_vol": p_vol,
                    "net_call_oi": c_oi - p_oi,
                    "is_call_wall": (s_float == call_wall_strike),
                    "is_put_wall": (s_float == put_wall_strike)
                })

            corridor = None
            if put_wall_strike and call_wall_strike and call_wall_strike >= put_wall_strike:
                spread = round(call_wall_strike - put_wall_strike, 2)
                spread_pct = round((spread / put_wall_strike) * 100, 1) if put_wall_strike > 0 else 0.0
                corridor = {
                    "lower": put_wall_strike,
                    "upper": call_wall_strike,
                    "spread": spread,
                    "spread_pct": spread_pct
                }

            result = {
                "symbol": sym,
                "has_options": True,
                "spot_price": round(float(spot_price), 2) if spot_price else None,
                "all_expirations": available_expirations,
                "selected_expiration": selected_exp_label,
                "target_expirations": target_exps,
                "call_wall": {
                    "strike": call_wall_strike,
                    "oi": call_wall_oi,
                    "volume": call_wall_vol
                } if call_wall_strike is not None else None,
                "put_wall": {
                    "strike": put_wall_strike,
                    "oi": put_wall_oi,
                    "volume": put_wall_vol
                } if put_wall_strike is not None else None,
                "total_call_oi": total_call_oi,
                "total_put_oi": total_put_oi,
                "put_call_ratio": pcr,
                "expected_corridor": corridor,
                "strikes": strike_records
            }

            self._cache[cache_key] = (now, result)
            return result

        except Exception as e:
            logger.error(f"Error fetching options profile for {sym}: {e}", exc_info=True)
            return {
                "symbol": sym,
                "has_options": False,
                "error": str(e),
                "spot_price": None,
                "all_expirations": [],
                "selected_expiration": expiration or "near_term",
                "call_wall": None,
                "put_wall": None,
                "total_call_oi": 0,
                "total_put_oi": 0,
                "put_call_ratio": 0.0,
                "expected_corridor": None,
                "strikes": []
            }

options_service = OptionsService()

