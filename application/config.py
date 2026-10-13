"""Unified application configuration.

Re-exports Config and config_service from application.services.config.
"""
from application.services.config import Config, ConfigService, config_service

__all__ = ["Config", "ConfigService", "config_service"]
