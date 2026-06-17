"""Smart database bootstrap: Alembic migrations, legacy repair, optional seed."""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine, inspect, text

from app.config import settings

REVISION_HEAD = "003_diagram_alignment"


def _run_alembic(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["alembic", *args],
        check=False,
        capture_output=True,
        text=True,
    )


def _get_revision(engine) -> str | None:
    if "alembic_version" not in inspect(engine).get_table_names():
        return None

    with engine.connect() as conn:
        row = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
    return row[0] if row else None


def migrate() -> None:
    engine = create_engine(settings.database_url_sync, pool_pre_ping=True)
    tables = set(inspect(engine).get_table_names())
    revision = _get_revision(engine)
    has_core_tables = "users" in tables and "parking_spots" in tables

    if revision == REVISION_HEAD:
        print("[bootstrap] Database schema already at Alembic head.")
        return

    if has_core_tables and revision is None:
        print("[bootstrap] Legacy schema detected (tables without Alembic history). Stamping 001_initial...")
        result = _run_alembic("stamp", "001_initial")
        if result.returncode != 0:
            print(result.stderr or result.stdout, file=sys.stderr)
            sys.exit(result.returncode)
        print("[bootstrap] Stamped Alembic revision: 001_initial")

    print("[bootstrap] Applying Alembic migrations...")
    result = _run_alembic("upgrade", "head")
    output = f"{result.stdout}\n{result.stderr}"

    if result.returncode != 0:
        if "already exists" in output.lower() and has_core_tables:
            print("[bootstrap] Migration conflict detected. Repairing with alembic stamp head...")
            repair = _run_alembic("stamp", REVISION_HEAD)
            if repair.returncode != 0:
                print(repair.stderr or repair.stdout, file=sys.stderr)
                sys.exit(repair.returncode)
            print("[bootstrap] Repair complete.")
            return

        print(output, file=sys.stderr)
        sys.exit(result.returncode)

    print("[bootstrap] Migrations applied successfully.")


def maybe_seed() -> None:
    enabled = os.getenv("SEED_ON_STARTUP", "true").strip().lower()
    if enabled not in {"1", "true", "yes", "on"}:
        print("[bootstrap] SEED_ON_STARTUP disabled; skipping seed.")
        return

    from scripts.seed_data import seed

    print("[bootstrap] Ensuring demo seed data...")
    asyncio.run(seed())


def main() -> None:
    migrate()
    maybe_seed()
    print("[bootstrap] Database ready.")


if __name__ == "__main__":
    main()
