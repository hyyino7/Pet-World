"""Prepare the existing Mnemosyne schema without a service or background jobs."""
import os
from pathlib import Path
import sqlite3
import sys

os.umask(0o077)
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "vendor/mnemosyne/service/src"))

from cognitive_memory.storage.db import Database
from cognitive_memory.storage.paths import ensure_layout
from cognitive_memory.storage.migrations import MIGRATIONS
from cognitive_memory.governance.authority import ensure_authority_row
from cognitive_memory.governance.capability_gate import ensure_default_capabilities
from cognitive_memory.identity import ensure_default_principals
from cognitive_memory.memory.banks import ensure_default_banks

paths = ensure_layout(Path(sys.argv[1]))
database = paths["db"]
if database.exists():
    # Existing data is never migrated or backed up as a side effect of binding.
    with sqlite3.connect(database.as_uri() + "?mode=ro", uri=True) as connection:
        applied = {row[0] for row in connection.execute("SELECT id FROM schema_migrations")}
        if any(key not in applied for key, _ in MIGRATIONS):
            raise RuntimeError("Memory schema needs an explicit upgrade; existing Bank retained")
else:
    db = Database(database)
    try:
        db.ensure_schema()
        ensure_default_capabilities(db)
        ensure_default_principals(db)
        ensure_default_banks(db)
        ensure_authority_row(db)
    finally:
        db.close()
