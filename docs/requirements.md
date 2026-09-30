# PivotTrader System Requirements Specification

> [!IMPORTANT]
> **MANDATORY FOR ALL AI CODING AGENTS & DEVELOPERS:**
> You **MUST** read and understand this document before proposing, planning, or implementing any code changes in PivotTrader.
> All code contributions must adhere to the functional definitions, algorithmic formulas, concurrency constraints, and verification protocols outlined below.

---

## 1. Executive Summary & Product Vision

**PivotTrader** is a high-performance, institutional-grade quantitative momentum stock screener, technical pattern visualizer, and market regime intelligence platform. It is engineered around the legendary trading principles of **Mark Minervini** (*Trade Like a Stock Market Wizard*, *Think & Trade Like a Champion*), **Kristjan Qullamaggie** (*Breakouts, EP, Parabolic Shorts*), and **Pradeep Bonde / Stockbee** (*Market Monitor, 4% / 25% Movers*).

The core technical philosophy is **vectorized processing with embedded columnar storage (DuckDB)** paired with a decoupled **FastAPI REST backend** and a responsive **React 18 / Vite SPA frontend**.

---

## 2. Functional Requirements (FR)

### FR-1: Data Ingestion & Multi-Provider Sourcing
* **FR-1.1 Provider Abstraction**: All market data providers must implement the abstract contract defined in [`AbstractDataProvider`](../application/providers/base.py) (`connect`, `fetch_historical_bars`, `fetch_fundamentals`, `fetch_institutional_holdings`).
* **FR-1.2 Sourcing Channels**:
  - Primary EOD & historical price bars: Yahoo Finance (`yfinance`).
  - Optional real-time / alternative broker data: Interactive Brokers (`ib_insync`).
  - Institutional Sponsorship: SEC 13F quarterly filings via EDGAR scraper.
* **FR-1.3 Corporate Actions & Split Adjustments**:
  - Historical bars must account for stock splits and corporate actions without corrupting historical volatility or moving average baselines.
  - Verification: Enforced by [`tests/test_split_adjustment.py`](../tests/test_split_adjustment.py).
* **FR-1.4 Multi-Stage Ingestion Pipeline**:
  - The CLI orchestrator [`application.pipeline`](../application/pipeline.py) runs sequentially across 5 steps:
    1. Universe resolution (US Exchanges: NYSE, NASDAQ, AMEX).
    2. Daily price bar ingestion with incremental delta updates.
    3. Vectorized technical indicator generation.
    4. Quarterly fundamentals & EPS statement scraping.
    5. Setup pattern recognition sweeps.

### FR-2: Vectorized Technical & Momentum Analytics
* **FR-2.1 DuckDB Vectorized Calculations**: Technical indicators must be computed directly inside DuckDB utilizing native SQL window functions for maximum throughput on millions of bars:
  - **Moving Averages**: SMA 50, SMA 150, SMA 200, EMA 10, EMA 20.
  - **Slope & Trending**: 20-day historical slope of SMA 200 (`sma_200 > sma_200_20d_ago`).
  - **52-Week Range**: Distance from 52-week High (`dist_from_52w_high`), Distance from 52-week Low (`surge_off_low_pct`).
  - **Volatility Metrics**: 20-day Average Directional Movement / True Range (ATR 20d, ADR% 20d).
  - **Volume & Liquidity**: 50-day average volume (`vol_50d_ma`), Relative Volume ratio (`rel_vol_50d`).
* **FR-2.2 Relative Strength (RS) Percentile Engine**:
  - Weighted composite momentum calculation across 1-quarter, 2-quarter, 3-quarter, and 4-quarter performance:
    $$\text{RS Score} = 0.4 \times \text{Ret}_{3M} + 0.2 \times \text{Ret}_{6M} + 0.2 \times \text{Ret}_{9M} + 0.2 \times \text{Ret}_{12M}$$
  - Cross-sectional daily percentile rank ($1 \text{ to } 99$) computed per trading date across the active US equities universe.
  - **RS Blue Dot Indicator**: Triggered when a stock achieves a 52-week high in Relative Strength before price hits a 52-week high (verified in [`tests/test_rs_blue_dot.py`](../tests/test_rs_blue_dot.py)).

### FR-3: Setup & Pattern Recognition Engines
* **FR-3.1 Minervini Stage 2 Trend Template**:
  1. Current price $> \text{SMA}(50) > \text{SMA}(150) > \text{SMA}(200)$.
  2. $\text{SMA}(200)$ trending upward for at least 20 trading sessions.
  3. Current price within 25% of 52-week High.
  4. Current price at least 30% above 52-week Low.
  5. RS Rank $\ge 70$ (preferably $\ge 80$).
* **FR-3.2 Volatility Contraction Pattern (VCP)**:
  - Alternating swing peak/trough extraction over consolidation bases ($2 \text{ to } 6$ contractions).
  - Contraction depth hierarchy: each successive pullback must be tighter than the prior ($D_1 > D_2 > D_3$).
  - Final contraction must be tight ($\le 10\%$, ideally $\le 6\%$) with drying volume.
* **FR-3.3 Power Play (High-Tight Flag)**:
  - Prior explosive run-up: $\ge 100\%$ gain within $\le 8$ weeks ($\le 40$ trading days).
  - Consolidation near highs: Pullback depth $\le 25\%$ (max 30%), trading $\ge 10$ days in base.
* **FR-3.4 Low Cheat Setup**:
  - Early entry within the lower third of a consolidation base following a shakeout and recovery over EMA 10 / SMA 50.
  - Verified by [`tests/test_low_cheat.py`](../tests/test_low_cheat.py).
* **FR-3.5 Episodic Pivot & Parabolic Extension**:
  - **Episodic Pivot (EP)**: Catalyst-driven gap up ($\ge 8\%$) with massive relative volume ($\ge 3\times \text{50-day average}$).
  - **Parabolic Climax**: Extreme extension above moving averages for short or mean-reversion setups (verified by [`tests/test_parabolic.py`](../tests/test_parabolic.py)).

### FR-4: Safe Dynamic Expression Engine
* **FR-4.1 Dynamic Formula Evaluation**:
  - Provide users with an expression builder allowing custom SQL-based screening rules (e.g., `close > sma_50 and rs_rank >= 85 and adr_20d >= 5.0`).
* **FR-4.2 AST Security & Validation**:
  - All user expressions must be parsed via Python AST with strict allowlists to prevent SQL injection or arbitrary code execution.
  - Verified by [`tests/test_expression.py`](../tests/test_expression.py).

### FR-5: Market Intelligence & Breadth Monitoring
* **FR-5.1 Stockbee Market Monitor**:
  - Daily counting of stocks gaining $\ge 4\%$, $\ge 25\%$ in a month, and stocks making new 52-week highs vs. lows to determine market regime health.
  - Verified by [`tests/test_market_pulse.py`](../tests/test_market_pulse.py) and [`tests/test_market_monitor_as_of.py`](../tests/test_market_monitor_as_of.py).
* **FR-5.2 Group Radar & Relative Rotation Graphs (RRG)**:
  - Sector and Industry momentum tracking with J-Ratio (RS-Ratio) and J-Momentum (RS-Momentum) quadrant classification (Leading, Weakening, Lagging, Improving).
  - Verified by [`tests/test_group_radar.py`](../tests/test_group_radar.py).
* **FR-5.3 Theme & Leaderboard Tracking**:
  - Thematic baskets ([`data/themes.yaml`](../data/themes.yaml)) and automated Leaderboards based on composite multi-timeframe scores.

### FR-6: Watchlists & Execution Playbook
* **FR-6.1 Watchlist Management**: Full CRUD operations for custom user watchlists and ticker associations, verified in [`tests/test_watchlists.py`](../tests/test_watchlists.py).
* **FR-6.2 Model Book & Saved Trades**: Archiving historical exemplary trades with entry, exit, target notes, and annotated candlestick charts ([`data/saved_model_book.json`](../data/saved_model_book.json)).
* **FR-6.3 Playbook Markdown Sync**: Live editing and reading of [`data/setups_and_rules.md`](../data/setups_and_rules.md) from the web UI.

### FR-7: Frontend Charting & Visual Inspection
* **FR-7.1 High-Performance Canvas Charts**: Built with TradingView Lightweight Charts, rendering 1,000+ daily candlesticks with overlaid SMAs (50, 150, 200), EMAs (10, 20), and volume bars.
* **FR-7.2 Stock Detail Drawer & Inspection**: Visualizing quarterly earnings acceleration, VCP contraction troughs, Low Cheat footprints, and company profile data.

### FR-8: External Interoperability
* **FR-8.1 TradingView Export**: One-click formatting of screened candidates into comma-separated symbol lists copied to system clipboard for instant import into TradingView.

---

## 3. Non-Functional Requirements (NFR)

### NFR-1: Performance & Latency
* **Screening Latency**: Complete universe screener scans across 5,000+ symbols and millions of historical bars must return in $< 1.0\text{s}$ via vectorized DuckDB execution.
* **API Response Time**: Static metadata and stock price bar requests must respond in $< 100\text{ms}$.
* **Frontend Bundle Speed**: Vite compilation must complete in $< 500\text{ms}$ (`npm run build`).

### NFR-2: DuckDB Concurrency & Database Locking
* **Single-Writer / Multiple-Reader Model**:
  - The FastAPI backend must **always** connect in read-only mode: `duckdb.connect(db_path, read_only=True)`.
  - Ingestion processes (`application.pipeline`) require exclusive write locks and must handle `duckdb.IOException` with exponential backoff retries.
  - Never allow API handlers to hold open write locks.
  - Verified by [`tests/test_concurrency.py`](../tests/test_concurrency.py).

### NFR-3: Deterministic Financial Correctness & Zero Lookahead Bias
* **Temporal Integrity**:
  - All historical indicators computed for date $T$ must strictly utilize information available on or before date $T$.
  - Historical backtests, "As-Of" market monitor scans, and setup evaluations must never reference date $T+1$.
* **Missing & Delisted Tickers**:
  - Correctly handle corporate bankruptcies, mergers, and delistings without crashing the universe pipeline (verified in [`tests/test_delisting.py`](../tests/test_delisting.py)).

### NFR-4: Clean Code & No Backwards Compatibility Burden
* As codified in the repository policy, **no backwards compatibility is needed**. Deprecated columns, old schema designs, and outdated endpoints can be refactored cleanly rather than accumulating legacy adapters.

---

## 4. Verification & Testing Requirements

1. **Frontend Changes**:
   - Only execute `npm run build` in `frontend/` (~200ms).
   - Do **NOT** run backend Python tests for UI-only edits.
2. **Backend Changes**:
   - Only run the specific unit test file related to the modified component (e.g. `./.venv/bin/python -m unittest tests/test_<feature>.py`, <1s).
   - Do **NOT** run the full 100+ test discovery suite (`unittest discover tests`) unless explicitly instructed by the user.
3. **Execution Efficiency**:
   - Never initiate background command polling loops. Always use adequate synchronous timeouts.

