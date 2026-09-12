import os
import yaml
import logging
from typing import Dict, Any, List

logger = logging.getLogger("pivottrader.setup_service")

class SetupService:
    def __init__(self, yaml_path: str = "application/setups/setups.yaml", filters_yaml_path: str = "application/setups/filters.yaml"):
        self.yaml_path = yaml_path
        self.filters_yaml_path = filters_yaml_path
        self._cached_config: Dict[str, Any] = {}
        self.load_config()

    def _resolve_file_path(self, target_path: str) -> str:
        if os.path.exists(target_path):
            return target_path

        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        app_dir = os.path.join(root_dir, "application")
        setups_dir = os.path.join(app_dir, "setups")
        base_name = os.path.basename(target_path)

        candidates = [
            os.path.join(root_dir, target_path),
            os.path.join(setups_dir, base_name),
            os.path.join(app_dir, base_name),
            os.path.join(root_dir, base_name),
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate
        return target_path

    def load_config(self) -> Dict[str, Any]:
        """Loads and validates setups.yaml and filters.yaml."""
        resolved_setups_path = self._resolve_file_path(self.yaml_path)
        resolved_filters_path = self._resolve_file_path(self.filters_yaml_path)

        raw_setups_data = {}
        if os.path.exists(resolved_setups_path):
            try:
                with open(resolved_setups_path, "r", encoding="utf-8") as f:
                    raw_setups_data = yaml.safe_load(f) or {}
            except Exception as e:
                logger.error(f"Error reading setups YAML {resolved_setups_path}: {e}")
        else:
            logger.error(f"Setups configuration file not found: {resolved_setups_path}")

        # Load filters: first check dedicated filters.yaml, fallback to setups.yaml
        filters_dict = {}
        if os.path.exists(resolved_filters_path):
            try:
                with open(resolved_filters_path, "r", encoding="utf-8") as f:
                    raw_filters_data = yaml.safe_load(f) or {}
                    filters_dict = raw_filters_data.get("filters", raw_filters_data)
            except Exception as e:
                logger.error(f"Error reading filters YAML {resolved_filters_path}: {e}")

        # Fallback to filters embedded in setups.yaml if filters_dict is still empty
        if not filters_dict and isinstance(raw_setups_data, dict):
            filters_dict = raw_setups_data.get("filters", {})

        setups_dict = raw_setups_data.get("setups", {}) if isinstance(raw_setups_data, dict) else {}

        # Parse global base_setup if present
        base_setup_raw = raw_setups_data.get("base_setup", {}) if isinstance(raw_setups_data, dict) else {}
        base_filters: Dict[str, Any] = {}
        base_visible_filters: List[str] = []

        if isinstance(base_setup_raw, dict):
            if "filters" in base_setup_raw and isinstance(base_setup_raw["filters"], dict):
                base_filters = dict(base_setup_raw["filters"])
            else:
                base_filters = {
                    k: v for k, v in base_setup_raw.items()
                    if k not in ("id", "name", "icon", "description", "display_order", "visible_filters")
                }
            if "visible_filters" in base_setup_raw and isinstance(base_setup_raw["visible_filters"], list):
                base_visible_filters = list(base_setup_raw["visible_filters"])

        # Ensure filter dictionary has key inside each item
        for f_key, f_val in filters_dict.items():
            if isinstance(f_val, dict):
                f_val.setdefault("id", f_key)

        # Convert setups dict to an ordered list based on display_order
        setups_list: List[Dict[str, Any]] = []
        for s_key, s_val in setups_dict.items():
            if isinstance(s_val, dict):
                s_val.setdefault("id", s_key)
                s_val.setdefault("display_order", 99)

                # Merge filters: base_filters overridden by setup-specific filters
                merged_filters = dict(base_filters)
                setup_filters = s_val.get("filters", {})
                if isinstance(setup_filters, dict):
                    merged_filters.update(setup_filters)
                s_val["filters"] = merged_filters

                # Merge visible_filters: base visible filters + setup-specific visible filters (preserving order, deduplicated)
                setup_visible = s_val.get("visible_filters")
                if setup_visible is not None and isinstance(setup_visible, list):
                    combined_visible = list(base_visible_filters)
                    for f_name in setup_visible:
                        if f_name not in combined_visible:
                            combined_visible.append(f_name)
                    s_val["visible_filters"] = combined_visible
                elif base_visible_filters:
                    s_val["visible_filters"] = list(base_visible_filters)

                setups_list.append(s_val)

        setups_list.sort(key=lambda s: s.get("display_order", 99))

        self._cached_config = {
            "base_setup": base_setup_raw,
            "setups": setups_list,
            "filters": filters_dict
        }
        logger.info(f"Loaded {len(setups_list)} setups from {resolved_setups_path} (base_setup: {bool(base_filters)}) and {len(filters_dict)} filters from {resolved_filters_path}")
        return self._cached_config

    def get_setups_config(self) -> Dict[str, Any]:
        """Returns the cached setups and filter definitions."""
        if not self._cached_config:
            return self.load_config()
        return self._cached_config

    def get_setup_by_id(self, setup_id: str) -> Dict[str, Any]:
        """Returns the specific setup configuration by its ID."""
        config = self.get_setups_config()
        for s in config.get("setups", []):
            if s.get("id") == setup_id:
                return s
        return {}


setup_service = SetupService()

