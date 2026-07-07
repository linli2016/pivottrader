import os
import yaml
from typing import Any, Dict, List

class Config:
    def __init__(self, config_path: str = "config.yaml"):
        self.config_path = config_path
        self.data: Dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")
        
        with open(self.config_path, "r") as f:
            try:
                self.data = yaml.safe_load(f) or {}
            except yaml.YAMLError as e:
                raise ValueError(f"Error parsing YAML configuration: {e}")

    def get(self, key_path: str, default: Any = None) -> Any:
        """Retrieves config value using dot notation, e.g., 'database.db_path'."""
        keys = key_path.split(".")
        val: Any = self.data
        for k in keys:
            if isinstance(val, dict) and k in val:
                val = val[k]
            else:
                return default
        return val

    @property
    def db_path(self) -> str:
        return self.get("database.db_path", "data.db")

    @property
    def provider_selected(self) -> str:
        return self.get("provider.selected", "YFINANCE").upper()

    @property
    def price_provider_selected(self) -> str:
        return self.get("provider.price_provider", self.provider_selected).upper()

    @property
    def ibkr_host(self) -> str:
        return self.get("provider.ibkr.host", "127.0.0.1")

    @property
    def ibkr_port(self) -> int:
        return int(self.get("provider.ibkr.port", 7497))

    @property
    def ibkr_client_id(self) -> int:
        return int(self.get("provider.ibkr.client_id", 1))

    @property
    def min_price(self) -> float:
        return float(self.get("universe_rules.min_price", 5.00))

    @property
    def min_volume_sma_50(self) -> int:
        return int(self.get("universe_rules.min_volume_sma_50", 300000))

    @property
    def eligible_exchanges(self) -> List[str]:
        return self.get("universe_rules.exchanges", ["NYSE", "NASDAQ"])

    @property
    def min_rs_percentile(self) -> int:
        return int(self.get("momentum_filters.min_rs_percentile", 70))

    @property
    def min_eps_growth_qoq(self) -> float:
        return float(self.get("fundamental_filters.min_eps_growth_qoq", 20.0))

    @property
    def export_file_name(self) -> str:
        return self.get("export.file_name", "Minervini_VCP_Candidates.txt")

    @property
    def export_delimiter(self) -> str:
        return self.get("export.delimiter", ", ")
