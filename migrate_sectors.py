#!/usr/bin/env python3
"""
migrate_sectors.py — One-shot migration tool for PivotTrader databases.

Remaps symbols.sector from the legacy 15 broad GICS-style sector names
(Technology, Financials, Health Care, etc.) to the 30 IBD-style tactical
sectors (Software, Chips, Medical, Banks, etc.) by deriving them from the
more granular industry field using the taxonomy defined in
application/services/taxonomy.py.

Usage:
    python migrate_sectors.py                 # uses default data.db
    python migrate_sectors.py path/to/data.db  # any database file

On the remote machine:
    1. Pull the latest code so taxonomy.py is up-to-date.
    2. Run: python migrate_sectors.py /path/to/your/data.db
"""

import sys
import os

def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else "data.db"

    if not os.path.exists(db_path):
        print(f"Error: Database not found at '{db_path}'")
        sys.exit(1)

    print(f"Migrating sectors in: {db_path}")

    try:
        import duckdb
    except ImportError:
        print("Error: duckdb is not installed. Run: pip install duckdb")
        sys.exit(1)

    try:
        from application.services.taxonomy import get_tactical_sector, TACTICAL_SECTORS
    except ImportError:
        print("Error: Could not import taxonomy. Make sure you're running from the project root.")
        sys.exit(1)

    conn = duckdb.connect(db_path)

    # --- Before ---
    before = conn.execute(
        "SELECT sector, COUNT(*) FROM symbols WHERE asset_type = 'Common Stock' AND active = true "
        "GROUP BY sector ORDER BY COUNT(*) DESC"
    ).fetchall()
    print(f"\nBefore migration — {len(before)} distinct sectors:")
    for sec, cnt in before:
        print(f"  {sec!r:30s} {cnt}")

    # --- Migrate ---
    rows = conn.execute(
        "SELECT symbol, industry FROM symbols WHERE industry IS NOT NULL AND industry != ''"
    ).fetchall()
    print(f"\nRemapping {len(rows)} symbols with a non-empty industry...")

    updates = [(get_tactical_sector(industry), sym) for sym, industry in rows]
    conn.executemany("UPDATE symbols SET sector = ? WHERE symbol = ?", updates)
    conn.commit()
    conn.close()

    # --- After ---
    conn = duckdb.connect(db_path, read_only=True)
    after = conn.execute(
        "SELECT sector, COUNT(*) FROM symbols WHERE asset_type = 'Common Stock' AND active = true "
        "GROUP BY sector ORDER BY COUNT(*) DESC"
    ).fetchall()
    conn.close()

    print(f"\nAfter migration — {len(after)} distinct sectors:")
    for sec, cnt in after:
        flag = "✓" if sec in TACTICAL_SECTORS else " "
        print(f"  {flag} {sec!r:30s} {cnt}")

    tactical_present = [sec for sec, _ in after if sec in TACTICAL_SECTORS]
    print(f"\n{len(tactical_present)}/30 tactical sectors populated.")
    missing = [s for s in TACTICAL_SECTORS if s not in tactical_present]
    if missing:
        print(f"Missing (no stocks in db with that sector): {missing}")
    print("\nDone.")


if __name__ == "__main__":
    main()

