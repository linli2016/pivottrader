import os
import time
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from application.router import router

# Configure logging to output detailed messages and tracebacks to the terminal
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("pivottrader")

app = FastAPI(title="PivotTrader Server", description="REST API for PivotTrader Momentum & Fundamental Screener")

# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code >= 500:
        logger.error(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        if response.status_code >= 400:
            logger.warning(f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.1f}ms)")
        return response
    except Exception as exc:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"{request.method} {request.url.path} ERROR ({duration_ms:.1f}ms): {exc}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"detail": str(exc)})

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

# Serve React static SPA bundle if compiled
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")
else:
    @app.get("/")
    def index():
        return {
            "message": "PivotTrader Server is running.",
            "instructions": "Run 'npm run build' inside 'frontend' folder to compile the dashboard interface, then refresh this page."
        }

if __name__ == "__main__":
    import uvicorn
    # Load port configurations (default to 8000)
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
