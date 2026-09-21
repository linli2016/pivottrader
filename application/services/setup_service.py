import os
import yaml
import logging
from typing import Dict, Any, List

logger = logging.getLogger("pivottrader.setup_service")

class SetupService:
    def __init__(self, yaml_path: str = "setups.yaml"):
        self.yaml_path = yaml_path
        self._cached_config: Dict[str, Any] = {}
        self.load_config()

    def _resolve_file_path(self, target_path: str) -> str:
        if os.path.exists(target_path):
            return target_path

        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        app_dir = os.path.join(root_dir, "application")
        base_name = os.path.basename(target_path)

        candidates = [
            os.path.join(root_dir, target_path),
            os.path.join(root_dir, base_name),
            os.path.join(app_dir, base_name),
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate
        return target_path

    def load_config(self) -> Dict[str, Any]:
        """Loads and validates setups.yaml."""
        resolved_setups_path = self._resolve_file_path(self.yaml_path)

        raw_setups_data = {}
        if os.path.exists(resolved_setups_path):
            try:
                with open(resolved_setups_path, "r", encoding="utf-8") as f:
                    raw_setups_data = yaml.safe_load(f) or {}
            except Exception as e:
                logger.error(f"Error reading setups YAML {resolved_setups_path}: {e}")
        else:
            logger.error(f"Setups configuration file not found: {resolved_setups_path}")

        setups_dict = raw_setups_data.get("setups", {}) if isinstance(raw_setups_data, dict) else {}

        # Convert setups dict to an ordered list based on display_order
        setups_list: List[Dict[str, Any]] = []
        for s_key, s_val in setups_dict.items():
            if isinstance(s_val, dict):
                s_val.setdefault("id", s_key)
                s_val.setdefault("display_order", 99)
                s_val.setdefault("filters", {})
                s_val.setdefault("visible_filters", [])

                # Normalize sub_setups if defined
                sub_setups_raw = s_val.get("sub_setups")
                if isinstance(sub_setups_raw, list):
                    s_val["sub_setups"] = sub_setups_raw
                elif isinstance(sub_setups_raw, dict):
                    normalized_subs = []
                    for sub_k, sub_v in sub_setups_raw.items():
                        if isinstance(sub_v, dict):
                            sub_v.setdefault("id", sub_k)
                            normalized_subs.append(sub_v)
                    s_val["sub_setups"] = normalized_subs

                # If default_sub_id is set, align default setup expression with default sub_setup
                default_sub_id = s_val.get("default_sub_id")
                if default_sub_id and isinstance(s_val.get("sub_setups"), list):
                    for sub in s_val["sub_setups"]:
                        if isinstance(sub, dict) and sub.get("id") == default_sub_id and sub.get("expression"):
                            s_val["expression"] = sub["expression"]
                            break

                setups_list.append(s_val)

        setups_list.sort(key=lambda s: s.get("display_order", 99))

        self._cached_config = {
            "base_setup": {},
            "setups": setups_list,
            "filters": {}
        }
        self._last_mtime = os.path.getmtime(resolved_setups_path) if os.path.exists(resolved_setups_path) else 0.0
        logger.info(f"Loaded {len(setups_list)} setups from {resolved_setups_path}")
        return self._cached_config

    def get_setups_config(self) -> Dict[str, Any]:
        """Returns the cached setups and filter definitions, auto-reloading if setups.yaml changed."""
        resolved_path = self._resolve_file_path(self.yaml_path)
        current_mtime = os.path.getmtime(resolved_path) if os.path.exists(resolved_path) else 0.0
        if not self._cached_config or current_mtime > getattr(self, "_last_mtime", 0.0):
            return self.load_config()
        return self._cached_config

    def get_setup_by_id(self, setup_id: str) -> Dict[str, Any]:
        """Returns the specific setup configuration by its ID."""
        config = self.get_setups_config()
        for s in config.get("setups", []):
            if s.get("id") == setup_id:
                return s
        return {}

    def validate_expression(self, expr: str) -> Dict[str, Any]:
        """Validates a scan expression and returns compilation status."""
        from application.engine.expression import ScanExpressionEngine
        return ScanExpressionEngine.validate(expr)

    def get_expression_variables(self) -> Dict[str, Any]:
        """Returns the categorized catalog of supported scan expression variables."""
        from application.engine.expression import ScanExpressionEngine
        return ScanExpressionEngine.get_variables_by_category()


setup_service = SetupService()
