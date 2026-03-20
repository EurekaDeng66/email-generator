// ─────────────────────────────────────────────
// FIELD OPTIONS (saveable dropdowns)
// ─────────────────────────────────────────────
const DEFAULT_OPTS = {
  audience: [
    'New Phalcon Compliance free users',
    'Crypto exchange compliance officers',
    'Crime report downloaders (crypto businesses)',
    'Law enforcement & regulators',
    'Inactive Phalcon Compliance users (2+ weeks)',
    'Phalcon Compliance paid users',
  ],
  trigger: [
    'Account activation (welcome)',
    '48h after sign-up, no first scan',
    '72h after first scan',
    'Downloaded BlockSec 2026 Crypto Crime Report',
    '14+ days since last scan',
    'Plan expiry approaching',
  ],
  utm_source:  ['product_email'],
  utm_content: ['welcome','48h_no_scan','72h_post_scan','crime_report_kyt','crime_report_network','14d_inactive','paid_renewal'],
  cta_destinations: [],
};

function loadFieldOpts() {
  try {
    const s = localStorage.getItem(FIELD_KEY);
    return s ? Object.assign({}, DEFAULT_OPTS, JSON.parse(s)) : JSON.parse(JSON.stringify(DEFAULT_OPTS));
  } catch { return JSON.parse(JSON.stringify(DEFAULT_OPTS)); }
}
function saveFieldOpts(opts) { localStorage.setItem(FIELD_KEY, JSON.stringify(opts)); serverSave(FIELD_KEY); }

// Combo field: maps combo key → input element id
const COMBO_INPUT = {
  audience: 'audience', trigger: 'trigger',
  utm_source: 'cta_utm_source', utm_content: 'cta_utm_content',
};

function comboInputEl(key)  { return document.getElementById(COMBO_INPUT[key]); }
function comboDropdownEl(key){ return document.getElementById(`combo-${key}`); }

function openCombo(key) {
  const dd = comboDropdownEl(key);
  if (!dd.classList.contains('show')) { renderComboDropdown(key); dd.classList.add('show'); }
}

function toggleCombo(key) { // kept for backward compat
  const dd = comboDropdownEl(key);
  const isOpen = dd.classList.contains('show');
  closeAllCombos();
  if (!isOpen) { renderComboDropdown(key); dd.classList.add('show'); }
}

function filterCombo(key) {
  const dd = comboDropdownEl(key);
  if (!dd.classList.contains('show')) { renderComboDropdown(key); dd.classList.add('show'); }
  else renderComboDropdown(key);
}

function renderComboDropdown(key) {
  const allOpts = loadFieldOpts()[key] || [];
  const query   = (comboInputEl(key).value || '').toLowerCase();
  const filtered = query ? allOpts.filter(v => v.toLowerCase().includes(query)) : allOpts;
  const dd = comboDropdownEl(key);
  const optHtml = filtered.length
    ? filtered.map(v =>
        `<div class="combo-opt" onclick="pickCombo('${key}',this)" data-val="${esc(v)}">
          <span class="combo-opt-text">${esc(v)}</span>
          <span class="combo-opt-del" onclick="event.stopPropagation();deleteComboOpt('${key}','${escAttr(v)}')">✕</span>
        </div>`).join('')
    : '<div class="combo-empty">暂无已保存选项</div>';
  dd.innerHTML = optHtml +
    `<div class="combo-dropdown-footer">
       <button class="combo-save-btn" onclick="saveComboOpt('${key}')">＋ 将当前输入保存为选项</button>
     </div>`;
}

function pickCombo(key, el) {
  const val = el.dataset.val;
  comboInputEl(key).value = val;
  closeAllCombos();
  // fire dependent handlers
  if (key === 'utm_source' || key === 'utm_content') assembleCTAUrl();
}

function saveComboOpt(key) {
  const val = (comboInputEl(key).value || '').trim();
  if (!val) return;
  const opts = loadFieldOpts();
  if (!opts[key]) opts[key] = [];
  if (!opts[key].includes(val)) {
    opts[key].push(val);
    saveFieldOpts(opts);
  }
  closeAllCombos();
  // brief visual feedback
  const btn = comboInputEl(key).closest('.combo-row').querySelector('.btn-save-opt');
  btn.textContent = '✓'; btn.style.color = '#16a34a'; btn.style.borderColor = '#86efac';
  setTimeout(() => { btn.textContent = '＋'; btn.style.color = ''; btn.style.borderColor = ''; }, 1200);
}

function deleteComboOpt(key, val) {
  const opts = loadFieldOpts();
  if (opts[key]) {
    opts[key] = opts[key].filter(v => v !== val);
    saveFieldOpts(opts);
    renderComboDropdown(key);
  }
}

function closeAllCombos() {
  document.querySelectorAll('.combo-dropdown.show').forEach(d => d.classList.remove('show'));
  document.querySelectorAll('.btn-combo-toggle.open').forEach(b => b.classList.remove('open'));
}

// Close combos on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.combo-field')) closeAllCombos();
});
