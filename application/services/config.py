import os
import yaml
from typing import Any, Dict, List

CONFIG_PATH = "config.yaml"

class ConfigService:
    def __init__(self, config_path: str = CONFIG_PATH):
        self.config_path = config_path

    @staticmethod
    def load_config_raw(config_path: str = CONFIG_PATH) -> Dict[str, Any]:
        if not os.path.exists(config_path):
            return {}
        with open(config_path, "r") as f:
            return yaml.safe_load(f) or {}

    @staticmethod
    def save_config_raw(data: Dict[str, Any], config_path: str = CONFIG_PATH) -> None:
        with open(config_path, "w") as f:
            yaml.safe_dump(data, f, default_flow_style=False)

    def get(self, key_path: str, default: Any = None) -> Any:
        """Retrieves config value using dot notation, e.g., 'database.db_path'."""
        data = self.load_config_raw(self.config_path)
        keys = key_path.split(".")
        val: Any = data
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
        return int(self.get("universe_rules.min_volume_sma_50", 100000))

    @property
    def min_dollar_volume_50d(self) -> float:
        return float(self.get("universe_rules.min_dollar_volume_50d", 10000000.0))

    @property
    def history_lookback_years(self) -> int:
        return int(self.get("universe_rules.history_lookback_years", 5))

    @property
    def eligible_exchanges(self) -> List[str]:
        return self.get("universe_rules.exchanges", ["NYSE", "NASDAQ"])

    @property
    def min_rs_percentile(self) -> int:
        return int(self.get("momentum_filters.min_rs_percentile", 70))

    @property
    def min_eps_growth_qoq(self) -> float:
        return float(self.get("fundamental_filters.min_eps_growth_qoq", 20.0))

    def get_config(self) -> Dict[str, Any]:
        config = self.load_config_raw(self.config_path)
        return {
            "min_price": config.get("universe_rules", {}).get("min_price", 5.00),
            "min_volume_sma_50": config.get("universe_rules", {}).get("min_volume_sma_50", 100000),
            "min_dollar_volume_50d": config.get("universe_rules", {}).get("min_dollar_volume_50d", 10000000.0),
            "min_rs_percentile": config.get("momentum_filters", {}).get("min_rs_percentile", 70),
            "min_eps_growth_qoq": config.get("fundamental_filters", {}).get("min_eps_growth_qoq", 20.0),
            "provider_selected": config.get("provider", {}).get("selected", "YFINANCE"),
            "price_provider_selected": config.get("provider", {}).get("price_provider", "YFINANCE")
        }

    def update_config(self, payload) -> Dict[str, str]:
        config = self.load_config_raw(self.config_path)
        
        # Merge changes
        if "universe_rules" not in config:
            config["universe_rules"] = {}
        config["universe_rules"]["min_price"] = payload.min_price
        config["universe_rules"]["min_volume_sma_50"] = payload.min_volume_sma_50
        config["universe_rules"]["min_dollar_volume_50d"] = payload.min_dollar_volume_50d
        
        if "momentum_filters" not in config:
            config["momentum_filters"] = {}
        config["momentum_filters"]["min_rs_percentile"] = payload.min_rs_percentile
        
        if "fundamental_filters" not in config:
            config["fundamental_filters"] = {}
        config["fundamental_filters"]["min_eps_growth_qoq"] = payload.min_eps_growth_qoq
        
        if "provider" not in config:
            config["provider"] = {}
        config["provider"]["selected"] = payload.provider_selected
        config["provider"]["price_provider"] = payload.price_provider_selected
        
        self.save_config_raw(config, self.config_path)
        return {"message": "Configuration updated successfully"}


Config = ConfigService
config_service = ConfigService()
