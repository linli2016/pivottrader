# Module Design: Storage & Database Engine

[<- Back to Master Architecture](../architecture.md) | [Requirements](../requirements.md)

---

## 1. Overview & Purpose

The **Storage & Database Engine Module** provides the analytical backbone for PivotTrader. By leveraging **DuckDB**—an embedded, columnar analytical database (OLAP)—PivotTrader achieves sub-second filtering across millions of price bars without the operational complexity or latency of external client-server databases like PostgreSQL.

---

## 2. Component Structure

```
application/
├── database.py           # Core DDL schema, migrations, connection management, upsert queries
└── services/
    └── database.py       # Database query service, server-side filtering, statistical aggregations
```

### Key Classes & Methods
* [`DatabaseManager`](../../application/database.py): Manages database lifecycle, migrations, and safe connection acquisition.
  - `init_db()`: Executes DDL schemas and sequence creations.
  - `get_connection(read_only=True)`: Context manager yielding thread-safe DuckDB connection.
  - `upsert_daily_bars(df)`: High-speed batch upserts utilizing DuckDB temp tables.
* [`DatabaseService`](../../application/services/database.py): Business query interface consumed by the FastAPI router.
  - `get_candidates(filter_params)`: Dynamic multi-parameter candidate filtering.
  - `get_symbol_history(symbol)`: Retrieves chronological price and moving average history.
  - `get_financials(symbol)`: Retrieves quarterly statement metrics.

---

## 3. Schema Architecture & DDL

```mermaid
erDiagram
    SYMBOLS ||--o{ DAILY_BARS : "tracks daily OHLCV"
    SYMBOLS ||--o{ QUARTERLY_FUNDAMENTALS : "reports financial filings"
    WATCHLISTS ||--o{ WATCHLIST_ITEMS : "contains"
    SYMBOLS ||--o{ WATCHLIST_ITEMS : "saved in"

    SYMBOLS {
        VARCHAR symbol PK
        VARCHAR exchange
        VARCHAR name
        VARCHAR asset_type
        BOOLEAN active
        VARCHAR sector
        VARCHAR industry
        VARCHAR next_earnings_date
    }

    DAILY_BARS {
        VARCHAR symbol PK
        DATE date PK
        DOUBLE open
        DOUBLE high
        DOUBLE low
        DOUBLE close
        BIGINT volume
        DOUBLE rs_score
        INTEGER rs_rank
        DOUBLE sma_50
        DOUBLE sma_150
        DOUBLE sma_200
        DOUBLE adr_20d
        DOUBLE dist_from_52w_high
        BOOLEAN vcp_is_setup
        BOOLEAN pp_runup_pct
    }

    QUARTERLY_FUNDAMENTALS {
        VARCHAR symbol PK
        VARCHAR fiscal_quarter PK
        DATE report_date
        DOUBLE eps_diluted
        DOUBLE eps_qoq_growth
        DOUBLE total_revenue
    }

    WATCHLISTS {
        INTEGER id PK
        VARCHAR name UK
        TIMESTAMP created_at
    }

    WATCHLIST_ITEMS {
        INTEGER watchlist_id PK
        VARCHAR symbol PK
        TIMESTAMP added_at
    }
```

---

## 4. Concurrency & Lock Management

DuckDB enforces a **single-writer, multiple-reader** file lock policy on the database file (`data.db`):

```
┌────────────────────────────────────────────────────────┐
│                   DuckDB Lock Policy                   │
├──────────────────────────┬─────────────────────────────┤
│ Web Application (FastAPI)│ Ingestion Pipeline (Worker) │
│ - Infinite Readers       │ - Single Exclusive Writer   │
│ - read_only=True         │ - Acquires Write Lock       │
│ - Never Blocks Readers   │ - Exponential Backoff Retry │
└──────────────────────────┴─────────────────────────────┘
```

1. **FastAPI Web Service**:
   All HTTP endpoints MUST instantiate connections with `read_only=True`:
   ```python
   con = duckdb.connect(db_path, read_only=True)
   ```
   This ensures that end users screening stocks or viewing charts never hold write locks or block other web queries.

2. **Ingestion & Writing Operations**:
   The ingestion orchestrator ([`pipeline.py`](../../application/pipeline.py)) requires write access. When acquiring a write connection, it wraps the connection in an exponential retry loop to gracefully wait if another process momentarily holds a lock ([`tests/test_concurrency.py`](../../tests/test_concurrency.py)).

---

## 5. Performance Optimization Techniques

* **Columnar Execution**: Filters on `daily_bars` (such as `rs_rank >= 80 AND close > sma_50`) only scan the relevant numeric columns, executing in tens of milliseconds.
* **Indexed Temporal Lookups**: Explicit indices on `daily_bars(date)` accelerate date-slicing queries for Market Monitor and Universe scans.
* **Conflict-Free Bulk Upsert**: Ingestion uses DuckDB `ON CONFLICT (symbol, date) DO UPDATE` syntax, avoiding duplicate key errors and enabling safe incremental daily delta syncs.

---

## 6. Related Modules & Documentation

* [Data Providers Module](data_providers.md) - Pipeline writer populating `daily_bars`.
* [Quantitative Analytics Engine Module](analytics_engine.md) - SQL queries computing indicators on database tables.
* [Backend Services Module](backend_services.md) - Service layer wrapping DuckDB queries for REST endpoints.

