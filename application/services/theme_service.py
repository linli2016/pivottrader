import os
import yaml
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DEFAULT_THEMES = [
    {
        "name": "AI Compute Silicon",
        "description": "AI chips, accelerators, discrete GPUs, and high-speed silicon connectivity",
        "symbols": ["NVDA", "AVGO", "AMD", "MRVL", "QCOM", "INTC", "TSM", "ALAB", "CRDO"]
    },
    {
        "name": "AI Cloud & Data Centers",
        "description": "Hyperscalers, cloud hyperscale infrastructure, AI server builders, and networking fabric",
        "symbols": ["MSFT", "AMZN", "GOOG", "META", "ORCL", "SMCI", "DELL", "ANET", "HPE"]
    },
    {
        "name": "Power & Electrification",
        "description": "Grid modernization, electrical equipment, independent power producers, and utility power",
        "symbols": ["VST", "CEG", "GEV", "ETN", "PWR", "HUBB", "NRG", "TLN"]
    },
    {
        "name": "Nuclear Renaissance",
        "description": "Nuclear reactors, SMR technology, baseload clean energy, and nuclear plant operators",
        "symbols": ["CCJ", "OKLO", "SMR", "BWXT", "TLN", "CEG", "VST", "NNE", "LEU", "FLR", "GEV"]
    },
    {
        "name": "Copper",
        "description": "Copper mining, refined cathode production, and conductive metal infrastructure",
        "symbols": ["FCX", "SCCO", "ERO", "HBM", "TECK", "RIO"]
    },
    {
        "name": "Uranium & Nuclear Fuel",
        "description": "Uranium exploration, mining, enrichment, and nuclear fuel cycle suppliers",
        "symbols": ["CCJ", "NXE", "UEC", "DNN", "UUUU", "URG", "EU", "LEU", "UROY"]
    },
    {
        "name": "Rare Earths & Critical Minerals",
        "description": "Neodymium, dysprosium, critical mineral refining, and strategic supply chain elements",
        "symbols": ["MP", "LAC", "ALB", "SQM", "CRML", "NB", "AREC"]
    },
    {
        "name": "Gold Miners",
        "description": "Senior and intermediate gold producers, royalty streaming, and exploration",
        "symbols": ["NEM", "GOLD", "AEM", "KGC", "AU", "HMY", "AGI", "EGO"]
    },
    {
        "name": "Silver Miners",
        "description": "Primary silver mining companies, silver streamers, and polymetallic producers",
        "symbols": ["PAAS", "AG", "HL", "EXK", "FSM", "CDE"]
    },
    {
        "name": "Lithium & Battery Materials",
        "description": "Lithium brine, spodumene extraction, and EV battery cathode chemicals",
        "symbols": ["ALB", "SQM", "LAC", "SGML"]
    },
    {
        "name": "Steel & Aluminum",
        "description": "Electric arc furnace steelmakers, flat-rolled steel, and primary aluminum producers",
        "symbols": ["NUE", "STLD", "CLF", "AA", "RS", "CMC"]
    },
    {
        "name": "Quantum Computing",
        "description": "Quantum hardware processors, quantum algorithms, and photonic computing",
        "symbols": ["IONQ", "RGTI", "QBTS", "QUBT", "ARQQ"]
    },
    {
        "name": "Memory & Storage",
        "description": "DRAM, NAND flash memory, enterprise solid-state drives, and hard disk storage",
        "symbols": ["MU", "WDC", "STX", "NTAP"]
    },
    {
        "name": "Semiconductor Equipment",
        "description": "Wafer fab equipment, lithography, etch, deposition, and semiconductor process control",
        "symbols": ["ASML", "AMAT", "LRCX", "KLAC", "TER"]
    },
    {
        "name": "Cybersecurity",
        "description": "Cloud security, zero-trust network access, endpoint protection, and identity governance",
        "symbols": ["CRWD", "PANW", "FTNT", "NET", "ZS", "S", "TENB"]
    },
    {
        "name": "AI Software & Data",
        "description": "Enterprise AI platforms, cloud data warehouses, document search, and analytics software",
        "symbols": ["PLTR", "SNOW", "AI", "MDB", "ESTC", "DDOG"]
    },
    {
        "name": "Crypto & Blockchain",
        "description": "Bitcoin treasury holdings, crypto asset exchanges, and high-efficiency proof-of-work miners",
        "symbols": ["MSTR", "COIN", "MARA", "RIOT", "CLSK", "CIFR", "HUT", "IREN"]
    },
    {
        "name": "Fintech",
        "description": "Digital consumer banking, modern retail brokerage, point-of-sale credit, and neobanks",
        "symbols": ["SOFI", "AFRM", "UPST", "HOOD", "NU", "PYPL"]
    },
    {
        "name": "Space Economy",
        "description": "Small-sat launch services, lunar landers, space manufacturing, and Earth observation",
        "symbols": ["RKLB", "LUNR", "RDW", "BKSY", "PL", "SPCE"]
    },
    {
        "name": "Defense & Aerospace",
        "description": "Tactical defense systems, military aircraft, autonomous loitering drones, and naval shipbuilding",
        "symbols": ["LMT", "RTX", "NOC", "GD", "LHX", "HII", "KTOS", "AVAV"]
    },
    {
        "name": "Gene Editing & Genomics",
        "description": "CRISPR therapeutics, base editing, in-vivo gene correction, and next-gen DNA sequencing",
        "symbols": ["CRSP", "BEAM", "NTLA", "EDIT", "PACB"]
    },
    {
        "name": "GLP-1 & Obesity",
        "description": "Incretin mimetics, GLP-1/GIP dual agonists, oral weight loss drugs, and metabolic therapies",
        "symbols": ["LLY", "NVO", "VKTX", "ALT", "TNDM"]
    },
    {
        "name": "Robotics & Automation",
        "description": "Surgical robotics, industrial automation, machine vision, and automated testing robotics",
        "symbols": ["ISRG", "ROK", "CGNX", "TER"]
    },
    {
        "name": "EV & Autonomy",
        "description": "Electric vehicle manufacturers, autonomous driving software, and next-gen fleet mobility",
        "symbols": ["TSLA", "RIVN", "LCID"]
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
