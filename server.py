import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from src.router import router

app = FastAPI(title="PivotTrader Server", description="REST API for PivotTrader Momentum & Fundamental Screener")

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
