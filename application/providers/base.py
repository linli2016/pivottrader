from abc import ABC, abstractmethod
from typing import List, Dict, Any
import pandas as pd

class AbstractDataProvider(ABC):
    
    @abstractmethod
    def connect(self) -> None:
        """Establish session or connect to local gateway/sockets."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Cleanly close open socket sessions and connections."""
        pass

    @abstractmethod
    def fetch_universe(self) -> List[Dict[str, Any]]:
        """
        Retrieve symbol directories matching scanning targets.
        Should return a list of dictionaries with keys:
        'symbol', 'exchange', 'name', 'asset_type', 'active'
        """
        pass

    @abstractmethod
    def fetch_daily_bars(self, symbols: List[str], start_date: str) -> pd.DataFrame:
        """
        Fetch historical bars starting from start_date.
        Should return a DataFrame containing:
        'symbol', 'date', 'open', 'high', 'low', 'close', 'volume'
        """
        pass

    @abstractmethod
    def fetch_quarterly_fundamentals(self, symbols: List[str]) -> pd.DataFrame:
        """
        Fetch historical earnings per share and quarterly revenue.
        Should return a DataFrame containing:
        'symbol', 'report_date', 'fiscal_quarter', 'eps_diluted', 'total_revenue'
        """
        pass

    def fetch_premarket_bars(self, symbols: List[str]) -> pd.DataFrame:
        """
        Fetch pre-market real-time quotes for current trading session.
        Returns a DataFrame formatted like fetch_daily_bars for today's date.
        """
        return pd.DataFrame()

    def get_market_session_status(self) -> Dict[str, Any]:
        """
        Returns market session status dict: 'CLOSED', 'PRE_OPEN_NO_DATA', 'PRE_MARKET', 'REGULAR'.
        """
        return {"state": "REGULAR", "reason": "Default session status"}
