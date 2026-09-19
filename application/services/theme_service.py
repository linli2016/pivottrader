import os
import yaml
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DEFAULT_THEMES = [
    {
        "name": "Crypto & Blockchain",
        "description": "Cryptocurrency miners, exchanges, and Bitcoin treasury infrastructure",
        "symbols": ["MSTR", "COIN", "MARA", "RIOT", "CLSK", "CIFR", "HUT", "CORZ", "WULF", "IREN"]
    },
    {
        "name": "AI & Data Center Infrastructure",
        "description": "AI accelerators, optical networking, server hardware, and power suppliers",
        "symbols": ["NVDA", "AVGO", "SMCI", "ANET", "VST", "CEG", "DELL", "MRVL", "ALAB"]
    },
    {
        "name": "Nuclear & Uranium Power",
        "description": "Nuclear reactors, uranium miners, small modular reactors (SMR), and clean baseload power",
        "symbols": ["CCJ", "OKLO", "SMR", "BWXT", "TLN", "CEG", "VST"]
    },
    {
        "name": "GLP-1 & Obesity",
        "description": "Weight loss therapies, GLP-1 agonists, and metabolic biopharma",
        "symbols": ["LLY", "NVO", "VKTX", "ALT"]
    },
    {
        "name": "Cybersecurity",
        "description": "Cloud security, zero-trust network access, and endpoint protection",
        "symbols": ["CRWD", "PANW", "FTNT", "NET", "ZS"]
    },
    {
        "name": "Quantum Computing",
        "description": "Quantum hardware processors, quantum algorithms, and photonic computing",
        "symbols": ["IONQ", "RGTI", "QBTS", "QUBT"]
    },
    {
        "name": "Defense Tech & Drones",
        "description": "Unmanned aerial vehicles, defense intelligence, tactical systems, and aerospace defense",
        "symbols": ["PLTR", "KTOS", "AVAV", "RKLB", "LMT", "NOC", "LHX", "AXON"]
    },
    {
        "name": "Gold & Silver Miners",
        "description": "Precious metals exploration, gold and silver producers, and royalty streaming",
        "symbols": ["AEM", "KGC", "PAAS", "AG", "HMY", "AU", "WPM"]
    },
    {
        "name": "Semiconductor Equipment",
        "description": "Lithography, wafer fabrication, etching, metrology, and chip test equipment",
        "symbols": ["ASML", "AMAT", "LRCX", "KLAC", "AMKR", "TER"]
    },
    {
        "name": "Neobanks & Modern Fintech",
        "description": "Digital banking, consumer credit, alternative lending, and digital brokerages",
        "symbols": ["SOFI", "AFRM", "UPST", "HOOD", "NU", "PYPL"]
    },
    {
        "name": "Space & Satellite",
        "description": "Commercial space launch, orbital satellite communications, and space technology",
        "symbols": ["RKLB", "LUNR", "BKSY", "RDW", "PL"]
    },
    {
        "name": "Solar & Clean Energy",
        "description": "Solar inverters, photovoltaic systems, and clean energy storage",
        "symbols": ["FSLR", "ENPH", "SEDG", "RUN", "NXT"]
    },
    {
        "name": "Homebuilders & Housing",
        "description": "Residential home construction, building materials, and housing infrastructure",
        "symbols": ["TOL", "LEN", "DHI", "PHM", "KBH", "BLDR"]
    }
]


class ThemeService:
    def __init__(self, file_path: str = "themes.yaml"):
        self.file_path = file_path
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Initializes the themes.yaml file with default themes if it does not exist."""
        if not os.path.exists(self.file_path):
            self.save_themes(DEFAULT_THEMES)

    def load_themes(self) -> List[Dict[str, Any]]:
        """Loads themes from themes.yaml, falling back to default themes if empty or invalid."""
        if not os.path.exists(self.file_path):
            return DEFAULT_THEMES

        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if isinstance(data, dict) and "themes" in data:
                    return data["themes"] or []
                elif isinstance(data, list):
                    return data
                return DEFAULT_THEMES
        except Exception as e:
            logger.error(f"Error loading {self.file_path}: {e}")
            return DEFAULT_THEMES

    def save_themes(self, themes: List[Dict[str, Any]]) -> bool:
        """Saves themes to themes.yaml atomically."""
        try:
            temp_path = f"{self.file_path}.tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                yaml.dump({"themes": themes}, f, sort_keys=False, default_flow_style=False)
            os.replace(temp_path, self.file_path)
            return True
        except Exception as e:
            logger.error(f"Error saving {self.file_path}: {e}")
            return False

    def get_theme(self, name: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single theme by name (case-insensitive)."""
        themes = self.load_themes()
        target = name.strip().lower()
        for t in themes:
            if t.get("name", "").strip().lower() == target:
                return t
        return None

    def create_or_update_theme(self, name: str, description: str, symbols: List[str]) -> Dict[str, Any]:
        """Creates or updates a theme."""
        clean_name = name.strip()
        clean_desc = description.strip()
        # Clean and uppercase symbols
        clean_symbols = []
        seen = set()
        for s in symbols:
            s_clean = s.strip().upper()
            if s_clean and s_clean not in seen:
                clean_symbols.append(s_clean)
                seen.add(s_clean)

        themes = self.load_themes()
        target = clean_name.lower()
        updated = False

        for idx, t in enumerate(themes):
            if t.get("name", "").strip().lower() == target:
                themes[idx] = {
                    "name": clean_name,
                    "description": clean_desc or t.get("description", ""),
                    "symbols": clean_symbols
                }
                updated = True
                break

        if not updated:
            themes.append({
                "name": clean_name,
                "description": clean_desc,
                "symbols": clean_symbols
            })

        self.save_themes(themes)
        return {"name": clean_name, "description": clean_desc, "symbols": clean_symbols}

    def delete_theme(self, name: str) -> bool:
        """Deletes a theme by name."""
        themes = self.load_themes()
        target = name.strip().lower()
        filtered = [t for t in themes if t.get("name", "").strip().lower() != target]

        if len(filtered) != len(themes):
            self.save_themes(filtered)
            return True
        return False
