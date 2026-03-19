"""Server-side key-value store backed by SQLite (Railway Volume)."""

import json
import os
import sqlite3
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/store")

# Railway Volume mount point; falls back to local ./data/ for dev
DB_PATH = os.getenv(
    "DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "data", "app.db"),
)

ALLOWED_KEYS = {
    "blocksec_email_library",
    "blocksec_utm_templates",
    "blocksec_cta_templates",
    "blocksec_field_options",
}


def _conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS kv_store (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


@router.get("/{key}")
def get_value(key: str):
    """Return the stored JSON value for a key, or null if not found."""
    if key not in ALLOWED_KEYS:
        return {"value": None}
    with _conn() as conn:
        row = conn.execute(
            "SELECT value FROM kv_store WHERE key=?", (key,)
        ).fetchone()
        return {"value": json.loads(row[0]) if row else None}


class PutBody(BaseModel):
    value: Any


@router.put("/{key}")
def put_value(key: str, body: PutBody):
    """Upsert a JSON value for a key."""
    if key not in ALLOWED_KEYS:
        return {"ok": False, "error": "invalid key"}
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)",
            (key, json.dumps(body.value)),
        )
    return {"ok": True}
