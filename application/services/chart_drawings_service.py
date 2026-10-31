"""Service for persisting and retrieving user chart drawings (lines, text annotations)."""
import os
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger("pivottrader.chart_drawings")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(REPO_ROOT, "data")
DRAWINGS_FILE_PATH = os.path.join(DATA_DIR, "chart_drawings.json")


class ChartDrawingsService:
    def __init__(self, file_path: str = DRAWINGS_FILE_PATH):
        self.file_path = file_path
        self._ensure_file()

    def _ensure_file(self) -> None:
        """Ensure the data directory and drawings JSON file exist."""
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        if not os.path.exists(self.file_path):
            try:
                with open(self.file_path, "w", encoding="utf-8") as f:
                    json.dump({}, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to initialize {self.file_path}: {e}")

    def _load_raw_drawings(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load the raw drawings dictionary from disk."""
        self._ensure_file()
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
                return {}
        except Exception as e:
            logger.error(f"Failed to read drawings from {self.file_path}: {e}")
            return {}

    def _write_drawings(self, data: Dict[str, List[Dict[str, Any]]]) -> None:
        """Write drawings dictionary atomically to disk."""
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        temp_path = f"{self.file_path}.tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp_path, self.file_path)

    def get_drawings(self, symbol: str) -> List[Dict[str, Any]]:
        """Retrieve drawings for a symbol."""
        if not symbol:
            return []
        sym = symbol.upper().strip()
        data = self._load_raw_drawings()
        drawings = data.get(sym)
        if isinstance(drawings, list):
            return drawings
        return []

    def save_drawings(self, symbol: str, drawings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Save drawings for a symbol. If drawings list is empty, removes the symbol key."""
        if not symbol:
            raise ValueError("Symbol is required")
        sym = symbol.upper().strip()
        cleaned_drawings = drawings if isinstance(drawings, list) else []

        data = self._load_raw_drawings()
        if cleaned_drawings:
            data[sym] = cleaned_drawings
        else:
            data.pop(sym, None)

        self._write_drawings(data)
        return cleaned_drawings

    def delete_drawings(self, symbol: str) -> bool:
        """Delete all drawings for a symbol."""
        if not symbol:
            return False
        sym = symbol.upper().strip()
        data = self._load_raw_drawings()
        if sym in data:
            del data[sym]
            self._write_drawings(data)
            return True
        return False

    def get_all_drawings(self) -> Dict[str, List[Dict[str, Any]]]:
        """Retrieve all drawings keyed by symbol."""
        return self._load_raw_drawings()


chart_drawings_service = ChartDrawingsService()

