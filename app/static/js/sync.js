// ─────────────────────────────────────────────
// SERVER SYNC (write-through to SQLite on Railway)
// ─────────────────────────────────────────────
async function initServerSync() {
  for (const key of STORE_KEYS) {
    try {
      const resp = await fetch(`/api/store/${key}`);
      if (!resp.ok) continue;
      const { value } = await resp.json();
      if (value !== null && value !== undefined) {
        // Server has data → use it (shared source of truth)
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        // Server has no data → push localStorage up (one-time migration)
        const local = localStorage.getItem(key);
        if (local) {
          fetch(`/api/store/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: JSON.parse(local) }),
          }).catch(() => {});
        }
      }
    } catch {}
  }
}

function serverSave(key) {
  const data = localStorage.getItem(key);
  if (!data) return;
  fetch(`/api/store/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.parse(data) }),
  }).catch(() => {});
}
