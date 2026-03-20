// ─────────────────────────────────────────────
// STATUS BAR
// ─────────────────────────────────────────────
function setStatus(msg, type = 'info') {
  const el = document.getElementById('statusBar');
  el.textContent = msg;
  el.className = `status-bar show ${type}`;
}
function clearStatus() { document.getElementById('statusBar').className = 'status-bar'; }
