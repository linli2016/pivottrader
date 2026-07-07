# PivotTrader 📈

PivotTrader is a premium, high-performance stock scanner and momentum visualizer built around **Mark Minervini's** legendary trading principles (*Stage 2 Trend Template, Power Play, IPO Base, and Volatility Contraction Patterns (VCP)*). 

It features a decoupled architecture combining a vectorized Python/DuckDB analysis backend with a fast React frontend, allowing you to screen thousands of stocks and inspect their charts in real-time.

---

## 🌟 Key Features

* **Layered Screening Interface:** Enforce the classic Stage 2 Baseline Trend Template globally, then layer setup overlays (**Power Play**, **IPO Base**, or **VCP Setup**) dynamically with slider controls.
* **Vectorized DuckDB Engine:** Harnesses native SQL window functions to calculate Relative Strength (RS) percentile ranks, rolling 8-week run-ups, drawdown corrections, and moving averages on millions of price bars in under a second.
* **VCP Pattern Recognizer:** Parses price swing extremes (peaks/troughs) to verify Alternating Swing Contraction progressions ($D_1 > D_2 > D_3$) with a tight final contraction ($\le 10\%$).
* **Stock Inspector:** Double-height (600px) interactive lightweight-charts daily candlestick chart overlaid with **SMA 50** (blue), **SMA 150** (orange), and **SMA 200** (pink) lines alongside historical quarterly EPS statement trackers.
* **Export to TradingView:** Download list files of your current screened candidate tickers ready to load directly into TradingView.

---

## 📂 Repository File Layout

```
├── src/                      # Backend Python Core modules
│   ├── engine/
│   │   └── momentum.py       # Vectorized SQL calculations & VCP detection
│   ├── config.py             # Global configurations parser
│   └── database.py           # DuckDB schema and migration manager
├── frontend/                 # React Vite SPA Web Application
│   ├── src/
│   │   └── App.jsx           # Main screening board, dashboard, and Stock Inspector UI
│   └── dist/                 # Compiled static asset bundles served by FastAPI
├── config.yaml               # Active parameters configuration file
├── server.py                 # FastAPI REST API Backend server
├── main.py                   # Data Ingestion scheduler / Database synchronizer
├── data.db                   # Local embedded DuckDB file (Git ignored)
└── README.md                 # Project documentation
```

---

## 🛠️ How to Run Locally

### 1. Prerequisites
Ensure you have the following installed on your system:
* **Python 3.10+**
* **Node.js 18+** (with npm)

---

### 2. Setup Dependencies
Clone the repository and install requirements:

#### Backend Setup
We recommend setting up a virtual environment:
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

#### Frontend Setup
```bash
cd frontend
npm install
```

---

### 3. Initialize & Populate the Database
PivotTrader runs off a local DuckDB cache (`data.db`). Before running the server, sync yfinance price histories and quarterly statement details:
```bash
# Run ingestion sync (Step 2 daily bars + Step 4 statements + Step 5 sweeps)
python3 main.py
```
> [!TIP]
> On subsequent daily runs, you can skip slow statement fetches by checking the **Sync Price Data** checkbox on the dashboard to trigger rapid price-only ingestion.

---

### 4. Build and Compile Frontend
To generate the production-ready optimized static asset bundle served by the FastAPI backend:
```bash
cd frontend
npm run build
```

---

### 5. Start the Server
Launch the FastAPI server from the project root directory:
```bash
python3 server.py
```
The application will boot up at **`http://localhost:8000`**. Open this link in your browser to begin screening!

---

## ⚡ Setup Strategies Cheat Sheet

| Overlay Strategy | Trading History | Trend Baseline | Proximity Constraint | Consolidation Limit |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 2 Baseline** | $> 250$ trading days | `Close > SMA(50) > SMA(150) > SMA(200)` | Within 25% of 52-week High | $\ge 30\%$ above 52-week Low |
| **Power Play** | Any | `Close > SMA(50) > SMA(150) > SMA(200)` | consolidates near highs | Drawdown $\le 25\%$ |
| **IPO Base** | $10$ to $756$ days (3 yrs) | `Close > SMA(50)` (waives SMA 150/200) | Within 20% of IPO High | Drawdown $\le 35\%$ |
| **VCP Setup** | Any | Stage 2 / IPO Base Uptrend | alternates local extremes | Alternating swings contract ($D_n$) |
