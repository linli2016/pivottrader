import os
import yaml
from typing import Dict, Any

CONFIG_PATH = "config.yaml"

class ConfigService:
    @staticmethod
    def load_config_raw() -> Dict[str, Any]:
        if not os.path.exists(CONFIG_PATH):
            return {}
        with open(CONFIG_PATH, "r") as f:
            return yaml.safe_load(f) or {}

    @staticmethod
    def save_config_raw(data: Dict[str, Any]) -> None:
        with open(CONFIG_PATH, "w") as f:
            yaml.safe_dump(data, f, default_flow_style=False)

    def get_config(self) -> Dict[str, Any]:
        config = self.load_config_raw()
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
        config = self.load_config_raw()
        
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
        
        self.save_config_raw(config)
        return {"message": "Configuration updated successfully"}

config_service = ConfigService()
