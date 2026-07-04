import os
import sys
import subprocess
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
import yaml
import duckdb
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="PivotTrader Server", description="REST API for PivotTrader Momentum & Fundamental Screener")

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_PATH = "config.yaml"

def load_config_raw() -> Dict[str, Any]:
    if not os.path.exists(CONFIG_PATH):
        return {}
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f) or {}

def save_config_raw(data: Dict[str, Any]) -> None:
    with open(CONFIG_PATH, "w") as f:
        yaml.safe_dump(data, f, default_flow_style=False)

def get_db_path() -> str:
    config = load_config_raw()
    return config.get("database", {}).get("db_path", "market_data.db")

def get_read_only_conn():
    """Establishes a thread-safe read-only connection to DuckDB."""
    db_path = get_db_path()
    if not os.path.exists(db_path):
        # Create it if it doesn't exist, to avoid connection failure
        conn = duckdb.connect(db_path)
        conn.close()
    return duckdb.connect(db_path, read_only=True)

# ----------------- Models -----------------
class ConfigUpdateSchema(BaseModel):
    min_price: float
    min_volume_sma_50: int
    min_rs_percentile: int
    min_eps_growth_qoq: float
    provider_selected: str
    price_provider_selected: str

class SQLQuerySchema(BaseModel):
    query: str

# ----------------- Global State -----------------
screen_status = {
    "status": "idle", # idle, running, completed, failed
    "start_time": None,
    "end_time": None,
    "log_output": "",
    "error_message": None
}
screen_lock = threading.Lock()

def run_screener_subprocess():
    global screen_status
    with screen_lock:
        screen_status["status"] = "running"
        screen_status["start_time"] = datetime.now().isoformat()
        screen_status["end_time"] = None
        screen_status["log_output"] = ""
        screen_status["error_message"] = None

    # Call the python main.py pipeline
    cmd = [sys.executable, "main.py"]
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        log_acc = []
        for line in iter(process.stdout.readline, ""):
            log_acc.append(line)
            # Update log output live
            with screen_lock:
                screen_status["log_output"] = "".join(log_acc)
                
        process.stdout.close()
        return_code = process.wait()
        
        with screen_lock:
            if return_code == 0:
                screen_status["status"] = "completed"
            else:
                screen_status["status"] = "failed"
                screen_status["error_message"] = f"Pipeline exited with return code {return_code}"
            screen_status["end_time"] = datetime.now().isoformat()
            
    except Exception as e:
        with screen_lock:
            screen_status["status"] = "failed"
            screen_status["error_message"] = str(e)
            screen_status["end_time"] = datetime.now().isoformat()

# ----------------- Endpoints -----------------

@app.get("/api/summary")
def get_summary():
    """Retrieve metadata counts and database status."""
    try:
        with get_read_only_conn() as conn:
            # Check if tables exist
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            
            summary = {
                "symbols_count": 0,
                "daily_bars_count": 0,
                "fundamentals_count": 0,
                "last_price_date": "N/A"
            }
            
            if "symbols" in table_names:
                summary["symbols_count"] = conn.execute("SELECT count(*) FROM symbols").fetchone()[0]
            if "daily_bars" in table_names:
                summary["daily_bars_count"] = conn.execute("SELECT count(*) FROM daily_bars").fetchone()[0]
                latest_date = conn.execute("SELECT max(date) FROM daily_bars").fetchone()[0]
                summary["last_price_date"] = latest_date.strftime("%Y-%m-%d") if latest_date else "N/A"
            if "quarterly_fundamentals" in table_names:
                summary["fundamentals_count"] = conn.execute("SELECT count(*) FROM quarterly_fundamentals").fetchone()[0]
                
            return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/candidates")
def get_candidates():
    """Retrieve candidates satisfying active screening criteria."""
    try:
        query = """
            WITH latest_date_const AS (
                SELECT MAX(date) as val FROM daily_bars
            ),
            latest_fundamentals AS (
                SELECT 
                    symbol,
                    report_date,
                    fiscal_quarter,
                    eps_diluted,
                    eps_qoq_growth,
                    total_revenue,
                    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY fiscal_quarter DESC) as rn
                FROM quarterly_fundamentals
            ),
            ranked_bars AS (
                SELECT symbol, close, volume, vol_50d_ma, rs_score, rs_rank, adr_20d, pp_runup_pct, pp_drawdown_pct
                FROM daily_bars
                WHERE date = (SELECT val FROM latest_date_const)
            )
            SELECT 
                r.symbol,
                r.close,
                r.vol_50d_ma,
                r.rs_score,
                r.rs_rank,
                f.report_date,
                f.fiscal_quarter,
                f.eps_diluted,
                f.eps_qoq_growth,
                f.total_revenue,
                s.exchange,
                r.adr_20d,
                r.pp_runup_pct,
                r.pp_drawdown_pct,
                r.volume
            FROM ranked_bars r
            LEFT JOIN latest_fundamentals f ON r.symbol = f.symbol AND f.rn = 1
            JOIN symbols s ON r.symbol = s.symbol
            WHERE r.rs_score IS NOT NULL
            ORDER BY r.rs_rank DESC;
        """
        
        with get_read_only_conn() as conn:
            # Check if tables exist
            tables = conn.execute("SHOW TABLES").fetchall()
            table_names = [t[0] for t in tables]
            if "daily_bars" not in table_names:
                return []
                
            res = conn.execute(query).fetchall()
            
            candidates = []
            for row in res:
                candidates.append({
                    "symbol": row[0],
                    "close": row[1],
                    "vol_50d_ma": row[2],
                    "rs_score": row[3],
                    "rs_rank": row[4],
                    "report_date": row[5].strftime("%Y-%m-%d") if row[5] else None,
                    "fiscal_quarter": row[6],
                    "eps_diluted": row[7],
                    "eps_qoq_growth": row[8],
                    "total_revenue": row[9],
                    "exchange": row[10],
                    "adr_20d": row[11],
                    "pp_runup_pct": row[12],
                    "pp_drawdown_pct": row[13],
                    "volume": row[14]
                })
            return candidates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stocks/{symbol}")
def get_stock_detail(symbol: str):
    """Retrieve metadata and quarterly financials for a symbol."""
    symbol = symbol.upper()
    try:
        with get_read_only_conn() as conn:
            # Metadata
            meta = conn.execute("SELECT * FROM symbols WHERE symbol = ?", [symbol]).fetchone()
            if not meta:
                raise HTTPException(status_code=404, detail="Symbol not found")
                
            meta_dict = {
                "symbol": meta[0],
                "exchange": meta[1],
                "name": meta[2],
                "asset_type": meta[3],
                "active": meta[4]
            }
            
            # Fundamentals
            funds = conn.execute("""
                SELECT report_date, fiscal_quarter, eps_diluted, eps_qoq_growth, total_revenue
                FROM quarterly_fundamentals 
                WHERE symbol = ?
                ORDER BY fiscal_quarter DESC
            """, [symbol]).fetchall()
            
            fund_list = []
            for row in funds:
                fund_list.append({
                    "report_date": row[0].strftime("%Y-%m-%d") if row[0] else None,
                    "fiscal_quarter": row[1],
                    "eps_diluted": row[2],
                    "eps_qoq_growth": row[3],
                    "total_revenue": row[4]
                })
                
            # Get latest RS and ADR metrics
            latest_bar = conn.execute("""
                SELECT rs_score, rs_rank, adr_20d
                FROM daily_bars
                WHERE symbol = ? AND date = (SELECT MAX(date) FROM daily_bars)
            """, [symbol]).fetchone()
            
            rs_score = latest_bar[0] if latest_bar else None
            rs_rank = latest_bar[1] if latest_bar else None
            adr_20d = latest_bar[2] if latest_bar else None
                
            return {
                "metadata": meta_dict,
                "fundamentals": fund_list,
                "rs_score": rs_score,
                "rs_rank": rs_rank,
                "adr_20d": adr_20d
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stocks/{symbol}/prices")
def get_stock_prices(symbol: str, limit: int = 252):
    """Retrieve historical daily price bars for charting."""
    symbol = symbol.upper()
    try:
        with get_read_only_conn() as conn:
            bars = conn.execute("""
                SELECT date, open, high, low, close, volume
                FROM daily_bars
                WHERE symbol = ?
                ORDER BY date ASC
            """, [symbol]).fetchall()
            
            # limit output bars
            if len(bars) > limit:
                bars = bars[-limit:]
                
            bars_list = []
            for row in bars:
                bars_list.append({
                    "time": row[0].strftime("%Y-%m-%d") if row[0] else None,
                    "open": row[1],
                    "high": row[2],
                    "low": row[3],
                    "close": row[4],
                    "volume": row[5]
                })
            return bars_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config")
def get_config():
    """Retrieve current screener parameters."""
    try:
        config = load_config_raw()
        return {
            "min_price": config.get("universe_rules", {}).get("min_price", 5.00),
            "min_volume_sma_50": config.get("universe_rules", {}).get("min_volume_sma_50", 300000),
            "min_rs_percentile": config.get("momentum_filters", {}).get("min_rs_percentile", 70),
            "min_eps_growth_qoq": config.get("fundamental_filters", {}).get("min_eps_growth_qoq", 20.0),
            "provider_selected": config.get("provider", {}).get("selected", "YFINANCE"),
            "price_provider_selected": config.get("provider", {}).get("price_provider", "YFINANCE")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config")
def update_config(payload: ConfigUpdateSchema):
    """Update config parameters inside config.yaml."""
    try:
        config = load_config_raw()
        
        # Merge changes
        if "universe_rules" not in config:
            config["universe_rules"] = {}
        config["universe_rules"]["min_price"] = payload.min_price
        config["universe_rules"]["min_volume_sma_50"] = payload.min_volume_sma_50
        
        if "momentum_filters" not in config:
            config["momentum_filters"] = {}
        config["momentum_filters"]["min_rs_percentile"] = payload.min_rs_percentile
        
        if "fundamental_filters" not in config:
            config["fundamental_filters"] = {}
        config["fundamental_filters"]["min_eps_growth_qoq"] = payload.min_eps_growth_qoq
        
        if "provider" not in config:
            config["provider"] = {}
        config["provider"]["selected"] = payload.provider_selected
        config["provider"]["price_provider"] = payload.price_provider_selected
        
        save_config_raw(config)
        return {"message": "Configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/screen/run")
def trigger_screening_run(background_tasks: BackgroundTasks):
    """Triggers the screening pipeline in the background."""
    global screen_status
    with screen_lock:
        if screen_status["status"] == "running":
            return {"message": "Screening pipeline is already running", "status": screen_status}
            
    background_tasks.add_task(run_screener_subprocess)
    return {"message": "Screening pipeline triggered in background", "status": "running"}

@app.get("/api/screen/status")
def get_screening_status():
    """Retrieve background screening run logs and status."""
    global screen_status
    with screen_lock:
        return screen_status

@app.post("/api/sql/query")
def execute_sql_query(payload: SQLQuerySchema):
    """Executes a raw SQL query on the database in read-only mode."""
    query = payload.query.strip()
    
    # Simple block check for malicious attempts, though read-only mode handles it natively
    lower_query = query.lower()
    destructive_keywords = ["drop", "delete", "update", "insert", "alter", "truncate"]
    if any(kw in lower_query for kw in destructive_keywords):
        # We can try executing it anyway, knowing DuckDB will reject it,
        # but returning a clean rejection message early is friendlier
        pass
        
    try:
        with get_read_only_conn() as conn:
            cursor = conn.execute(query)
            
            # Fetch headers
            if cursor.description:
                columns = [col[0] for col in cursor.description]
            else:
                columns = ["Status"]
                
            rows = cursor.fetchall()
            
            # Format row values to be JSON-serializable
            formatted_rows = []
            for row in rows:
                formatted_row = []
                for val in row:
                    if val is None:
                        formatted_row.append(None)
                    elif isinstance(val, (int, float, str, bool)):
                        formatted_row.append(val)
                    else:
                        # Convert date, datetime, bytearrays, etc. to strings
                        formatted_row.append(str(val))
                formatted_rows.append(formatted_row)
                
            return {
                "columns": columns,
                "rows": formatted_rows,
                "count": len(formatted_rows)
            }
    except Exception as e:
        return {
            "error": str(e),
            "columns": ["Error"],
            "rows": [[str(e)]],
            "count": 0
        }

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
