"""Modular REST API sub-routers."""
from application.routers.watchlists import router as watchlists_router
from application.routers.stocks import router as stocks_router
from application.routers.model_book import router as model_book_router
from application.routers.journal import router as journal_router

__all__ = ["watchlists_router", "stocks_router", "model_book_router", "journal_router"]
