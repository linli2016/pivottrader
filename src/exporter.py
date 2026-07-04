import os
import sys
import subprocess
from typing import List, Dict, Any

try:
    import pyperclip
    PYCLIPBOARD_AVAILABLE = True
except ImportError:
    PYCLIPBOARD_AVAILABLE = False

class TradingViewExporter:
    @staticmethod
    def format_watchlist(candidates: List[Dict[str, Any]], exchange_mapping: Dict[str, str] = None) -> str:
        """
        Formats candidates into TradingView format: 'EXCHANGE:SYMBOL, EXCHANGE:SYMBOL'.
        exchange_mapping can override local exchange names to TradingView equivalents (e.g. NASDAQ -> NASDAQ).
        """
        if not exchange_mapping:
            exchange_mapping = {"NASDAQ": "NASDAQ", "NYSE": "NYSE"}
            
        formatted_symbols = []
        for c in candidates:
            sym = c["symbol"]
            exch = c.get("exchange", "NYSE")
            tv_exch = exchange_mapping.get(exch.upper(), exch.upper())
            formatted_symbols.append(f"{tv_exch}:{sym}")
            
        return formatted_symbols

    @staticmethod
    def write_to_file(filepath: str, watchlist_str: str) -> None:
        """Writes the watchlist string to a text file on disk."""
        try:
            with open(filepath, "w") as f:
                f.write(watchlist_str)
            print(f"Watchlist successfully written to: {os.path.abspath(filepath)}")
        except Exception as e:
            print(f"Error: Failed to write watchlist file: {e}")

    @staticmethod
    def copy_to_clipboard(text: str) -> bool:
        """
        Attempts to copy text to the system clipboard across platforms.
        Uses pyperclip if available, falls back to native CLI commands.
        """
        # Try pyperclip first
        if PYCLIPBOARD_AVAILABLE:
            try:
                pyperclip.copy(text)
                return True
            except Exception:
                pass  # Fallback to subprocess methods
                
        # Subprocess fallbacks
        try:
            if sys.platform == "darwin":  # macOS
                process = subprocess.Popen('pbcopy', stdin=subprocess.PIPE, text=True)
                process.communicate(text)
                return True
            elif sys.platform.startswith("linux"):  # Linux (requires xclip or xsel)
                # Try xclip
                try:
                    process = subprocess.Popen(['xclip', '-selection', 'clipboard'], stdin=subprocess.PIPE, text=True)
                    process.communicate(text)
                    return True
                except FileNotFoundError:
                    # Try xsel
                    process = subprocess.Popen(['xsel', '--clipboard', '--input'], stdin=subprocess.PIPE, text=True)
                    process.communicate(text)
                    return True
            elif sys.platform == "win32":  # Windows
                process = subprocess.Popen(['powershell', '-Command', 'Set-Clipboard'], stdin=subprocess.PIPE, text=True)
                process.communicate(text)
                return True
        except Exception as e:
            print(f"Warning: Could not copy watchlist to clipboard automatically: {e}")
            
        return False
