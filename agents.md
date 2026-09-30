# Agent Guidelines & Engineering Rules

## 1. Mandatory Pre-Flight Reading
- **Requirements First**: Always read [`docs/requirements.md`](docs/requirements.md) before planning or executing any changes to verify functional constraints and algorithmic rules.
- **Architecture Reference**: Consult [`docs/architecture.md`](docs/architecture.md) and the relevant subsystem document in `docs/modules/` when modifying system components.
- **Backward Compatibility**: **No backwards compatibility is needed**. Favor clean refactoring over legacy adapters.

## 2. Testing & Verification Discipline
- **Frontend Changes**: Only run `npm run build` in `frontend/` (~200ms). Never run Python backend tests for UI edits.
- **Backend Changes**: Only run the specific unit test file related to the modified component (e.g. `./.venv/bin/python -m unittest tests/test_<feature>.py`, <1s). **Do NOT run the entire 102-test discovery suite (`unittest discover tests`)** unless explicitly instructed.
- **Execution Efficiency**: Avoid background command polling loops (`manage_task`). Use appropriate synchronous timeouts so commands return immediately.

## 3. Data Integrity & Financial Domain Guardrails
- **Zero Lookahead Bias**: Historical indicator calculations, rolling windows, and market regime scans for day $T$ must NEVER reference data from day $T+1$.
- **Window Boundaries**: Always use bounded SQL window frames: `ROWS BETWEEN N PRECEDING AND CURRENT ROW`.
- **Split & Corporate Actions**: Price/volume adjustments must never retroactively corrupt historical indicator baselines.

## 4. DuckDB Concurrency & Database Locking
- **Locking Policy**: DuckDB enforces a single-writer, multiple-reader model on `data.db`.
- **FastAPI / Web Server**: Web queries MUST ALWAYS use read-only connections (`duckdb.connect(db_path, read_only=True)`). Never acquire write locks in API handlers.
- **Background Pipeline**: Writing processes must utilize `DatabaseManager.get_connection()` with retry backoff to avoid colliding with active locks.