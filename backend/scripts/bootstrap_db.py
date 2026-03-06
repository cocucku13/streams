from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

# Ensure imports like `from app...` work when running this file directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.settings import settings


USER_TABLES = {
    "users",
    "streams",
    "dj_profiles",
    "clubs",
    "club_memberships",
    "club_invites",
    "stream_settings",
    "media_assets",
}


def _run_alembic(*args: str) -> None:
    cmd = [sys.executable, "-m", "alembic", *args]
    subprocess.run(cmd, check=True)


def main() -> None:
    engine = create_engine(settings.database_url)
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    has_schema_tables = bool(table_names & USER_TABLES)
    has_alembic_version = "alembic_version" in table_names
    revision_row_exists = False

    if has_alembic_version:
        with engine.connect() as connection:
            revision_row_exists = connection.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).scalar() is not None

    if has_schema_tables and (not has_alembic_version or not revision_row_exists):
        print("[bootstrap_db] Existing schema detected without Alembic revision. Stamping head.")
        _run_alembic("stamp", "head")

    print("[bootstrap_db] Applying migrations to head.")
    _run_alembic("upgrade", "head")


if __name__ == "__main__":
    main()
