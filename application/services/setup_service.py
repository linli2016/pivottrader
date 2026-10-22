import os
import yaml
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("pivottrader.setup_service")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT_DIR, "data")
DEFAULT_SETUPS_PATH = os.path.join(DATA_DIR, "screeners.yaml")

class SetupService:
    def __init__(self, yaml_path: str = DEFAULT_SETUPS_PATH):
        self.yaml_path = yaml_path
        self._cached_config: Dict[str, Any] = {}
        self.load_config()

    def _resolve_file_path(self, target_path: str) -> str:
        if os.path.exists(target_path):
            return target_path

        root_dir = ROOT_DIR
        data_dir = DATA_DIR
        app_dir = os.path.join(root_dir, "application")
        base_name = os.path.basename(target_path)

        candidates = [
            os.path.join(data_dir, base_name),
            os.path.join(root_dir, target_path),
            os.path.join(root_dir, base_name),
            os.path.join(app_dir, base_name),
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate
        return target_path

    def load_config(self) -> Dict[str, Any]:
        """Loads and validates screeners.yaml."""
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

        def _parse_visible(val: Any) -> bool:
            if val is None:
                return True
            if isinstance(val, bool):
                return val
            if isinstance(val, (int, float)):
                return val != 0
            if isinstance(val, str):
                return val.strip().lower() not in ("false", "0", "no", "off")
            return bool(val)

        setups_dict = raw_setups_data.get("setups", {}) if isinstance(raw_setups_data, dict) else {}

        # Convert setups dict to an ordered list based on display_order
        setups_list: List[Dict[str, Any]] = []
        for s_key, s_val in setups_dict.items():
            if isinstance(s_val, dict):
                s_val.setdefault("id", s_key)
                s_val.setdefault("display_order", 99)
                s_val.setdefault("filters", {})
                s_val.setdefault("visible_filters", [])
                s_val["visible"] = _parse_visible(s_val.get("visible", True))

                # Normalize sub_setups if defined
                sub_setups_raw = s_val.get("sub_setups")
                if isinstance(sub_setups_raw, list):
                    for sub in sub_setups_raw:
                        if isinstance(sub, dict):
                            sub["visible"] = _parse_visible(sub.get("visible", True))
                    s_val["sub_setups"] = sub_setups_raw
                elif isinstance(sub_setups_raw, dict):
                    normalized_subs = []
                    for sub_k, sub_v in sub_setups_raw.items():
                        if isinstance(sub_v, dict):
                            sub_v.setdefault("id", sub_k)
                            sub_v["visible"] = _parse_visible(sub_v.get("visible", True))
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

        # Convert folders dict/list to an ordered list based on display_order
        folders_raw = raw_setups_data.get("folders", {}) if isinstance(raw_setups_data, dict) else {}
        folders_list: List[Dict[str, Any]] = []
        if isinstance(folders_raw, dict):
            for f_key, f_val in folders_raw.items():
                if isinstance(f_val, dict):
                    f_val.setdefault("id", f_key)
                    f_val.setdefault("display_order", 99)
                    f_val["visible"] = _parse_visible(f_val.get("visible", True))
                    screeners_raw = f_val.get("screeners", [])
                    norm_screeners = []
                    if isinstance(screeners_raw, list):
                        for sc in screeners_raw:
                            if isinstance(sc, dict):
                                sc["visible"] = _parse_visible(sc.get("visible", True))
                                norm_screeners.append(sc)
                    elif isinstance(screeners_raw, dict):
                        for sc_k, sc_v in screeners_raw.items():
                            if isinstance(sc_v, dict):
                                sc_v.setdefault("id", sc_k)
                                sc_v["visible"] = _parse_visible(sc_v.get("visible", True))
                                norm_screeners.append(sc_v)
                    f_val["screeners"] = norm_screeners
                    folders_list.append(f_val)
        elif isinstance(folders_raw, list):
            for f_val in folders_raw:
                if isinstance(f_val, dict):
                    f_val.setdefault("display_order", 99)
                    f_val["visible"] = _parse_visible(f_val.get("visible", True))
                    screeners_raw = f_val.get("screeners", [])
                    if isinstance(screeners_raw, list):
                        for sc in screeners_raw:
                            if isinstance(sc, dict):
                                sc["visible"] = _parse_visible(sc.get("visible", True))
                    folders_list.append(f_val)

        folders_list.sort(key=lambda f: f.get("display_order", 99))

        tags_raw = raw_setups_data.get("tags", {}) if isinstance(raw_setups_data, dict) else {}
        tags_dict: Dict[str, Any] = {}
        if isinstance(tags_raw, dict):
            for t_key, t_val in tags_raw.items():
                if isinstance(t_val, dict):
                    t_val.setdefault("id", t_key)
                    tags_dict[t_key] = t_val

        self._cached_config = {
            "base_setup": {},
            "folders": folders_list,
            "setups": setups_list,
            "filters": {},
            "tags": tags_dict
        }
        self._last_mtime = os.path.getmtime(resolved_setups_path) if os.path.exists(resolved_setups_path) else 0.0
        logger.info(f"Loaded {len(folders_list)} folders, {len(setups_list)} setups, and {len(tags_dict)} tags from {resolved_setups_path}")
        return self._cached_config

    def get_setups_config(self, visible_only: bool = False) -> Dict[str, Any]:
        """Returns the cached setups and filter definitions, auto-reloading if setups.yaml changed."""
        resolved_path = self._resolve_file_path(self.yaml_path)
        current_mtime = os.path.getmtime(resolved_path) if os.path.exists(resolved_path) else 0.0
        if not self._cached_config or current_mtime > getattr(self, "_last_mtime", 0.0):
            self.load_config()

        if not visible_only:
            return self._cached_config

        filtered_folders = []
        for f in self._cached_config.get("folders", []):
            if not f.get("visible", True):
                continue
            f_copy = dict(f)
            f_copy["screeners"] = [sc for sc in f.get("screeners", []) if sc.get("visible", True)]
            filtered_folders.append(f_copy)

        filtered_setups = []
        for s in self._cached_config.get("setups", []):
            if not s.get("visible", True):
                continue
            s_copy = dict(s)
            if "sub_setups" in s_copy:
                s_copy["sub_setups"] = [sub for sub in s.get("sub_setups", []) if sub.get("visible", True)]
            filtered_setups.append(s_copy)

        return {
            **self._cached_config,
            "folders": filtered_folders,
            "setups": filtered_setups,
        }

    def get_setup_by_id(self, setup_id: str) -> Dict[str, Any]:
        """Returns the specific setup configuration by its ID, searching setups and folders."""
        config = self.get_setups_config(visible_only=False)
        for s in config.get("setups", []):
            if s.get("id") == setup_id:
                return s
        for f in config.get("folders", []):
            for sc in f.get("screeners", []):
                if sc.get("id") == setup_id:
                    return sc
        return {}

    def validate_expression(self, expr: str) -> Dict[str, Any]:
        """Validates a scan expression and returns compilation status."""
        from application.engine.expression import ScanExpressionEngine
        return ScanExpressionEngine.validate(expr)

    def get_expression_variables(self) -> Dict[str, Any]:
        """Returns the categorized catalog of supported scan expression variables."""
        from application.engine.expression import ScanExpressionEngine
        return ScanExpressionEngine.get_variables_by_category()

    def get_tags(self) -> Dict[str, Any]:
        """Returns the dictionary of configured setup tags."""
        config = self.get_setups_config(visible_only=False)
        return config.get("tags", {})

    def get_screener_tag(self, screener_id: str) -> Optional[str]:
        """Returns the setup tag associated with a screener ID, or None if not configured."""
        sc = self.get_setup_by_id(screener_id)
        return sc.get("tag")


setup_service = SetupService()
