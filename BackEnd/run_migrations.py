from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    backend_dir = Path(__file__).resolve().parent
    alembic_ini = backend_dir / "alembic.ini"

    if not alembic_ini.exists():
        print(f"Could not find alembic.ini at {alembic_ini}")
        return 1

    try:
        from alembic import command
        from alembic.config import Config
    except Exception as exc:
        print("Alembic is not installed in the current Python environment.")
        print(f"Details: {exc}")
        return 1

    config = Config(str(alembic_ini))
    config.set_main_option("script_location", str(backend_dir / "alembic"))

    try:
        command.upgrade(config, "head")
    except Exception as exc:
        print("Migration failed.")
        print(f"Details: {exc}")
        return 1

    print("Migration completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
