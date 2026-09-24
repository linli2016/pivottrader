# Agent Guidelines & Rules

- **No backwards compatibility is needed.**

## Testing & Verification
- **Targeted Verification**:
  - **Frontend changes**: Only run `npm run build` in `frontend/` (~200ms). Do NOT run the backend Python test suite for UI-only edits.
  - **Backend changes**: Only run the specific unit test file related to the modified component (e.g. `./.venv/bin/python -m unittest tests/test_<feature>.py`, <1s). Do NOT run the entire 102-test discovery suite (`unittest discover tests`) unless explicitly requested by the user.
- **Execution Efficiency**:
  - Avoid background command polling loops (`manage_task`). Use appropriate synchronous timeouts so commands return immediately.
  - Be aware that concurrent background pipelines may hold DuckDB file locks on `data.db`.