"""Abstract base class and registry for quantitative setup detectors."""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Type


class BaseSetupDetector(ABC):
    """Abstract interface that all pattern and setup recognizers must implement."""

    name: str = ""

    @abstractmethod
    def detect(self, **kwargs) -> Optional[Dict[str, Any]]:
        """Run pattern detection on market bars.

        Returns a dictionary containing pattern metrics if detected, else None.
        """
        pass


class SetupRegistry:
    """Registry for discovering and instantiating setup detectors."""

    _detectors: Dict[str, Type[BaseSetupDetector]] = {}

    @classmethod
    def register(cls, name: str):
        def decorator(subclass: Type[BaseSetupDetector]):
            cls._detectors[name.lower()] = subclass
            subclass.name = name.lower()
            return subclass
        return decorator

    @classmethod
    def get(cls, name: str) -> Optional[Type[BaseSetupDetector]]:
        return cls._detectors.get(name.lower())

    @classmethod
    def list_setups(cls) -> List[str]:
        return list(cls._detectors.keys())
