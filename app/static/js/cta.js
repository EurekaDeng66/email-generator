// ─────────────────────────────────────────────
// CTA BUILDER
// ─────────────────────────────────────────────
function restoreSavedDestinations() {
  const opts = loadFieldOpts();
  const dests = opts.cta_destinations || [];
  const sel = document.getElementById('cta_base');
  dests.forEach(url => {
    const exists = [...sel.options].some(o => o.value === url);
    if (!exists) {
      const label = url.replace(/^https?:\/\//, '').substring(0, 45);
      const opt = new Option(label, url);
      sel.insertBefore(opt, sel.options[sel.options.length - 1]); // before "自定义 URL…"
    }
  });
}

function onCtaBaseChange() {
  const base = document.getElementById('cta_base').value;
  document.getElementById('cta_custom_wrap').classList.toggle('hidden', base !== '__custom__');
  if (base !== '__custom__') document.getElementById('cta_custom_url').value = '';
  assembleCTAUrl();
}

function assembleCTAUrl() {
  const base      = document.getElementById('cta_base').value;
  const src       = (document.getElementById('cta_utm_source').value || '').trim();
  const content   = (document.getElementById('cta_utm_content').value || '').trim();
  const customUrl = (document.getElementById('cta_custom_url').value || '').trim();
  let url = base === '__custom__' ? customUrl : base;
  if (!url) { document.getElementById('cta_url').value = ''; return; }
  const params = [];
  if (src)     params.push(`utm_source=${encodeURIComponent(src)}`);
  if (content) params.push(`utm_content=${encodeURIComponent(content)}`);
  if (params.length) url += (url.includes('?') ? '&' : '?') + params.join('&');
  const urlEl = document.getElementById('cta_url');
  urlEl.value = url;
  urlEl.title = url;
}

function saveCustomDest() {
  const url = (document.getElementById('cta_custom_url').value || '').trim();
  if (!url) return;
  const opts = loadFieldOpts();
  if (!opts.cta_destinations) opts.cta_destinations = [];
  if (!opts.cta_destinations.includes(url)) {
    opts.cta_destinations.push(url);
    saveFieldOpts(opts);
    const sel = document.getElementById('cta_base');
    const exists = [...sel.options].some(o => o.value === url);
    if (!exists) {
      const label = url.replace(/^https?:\/\//, '').substring(0, 45);
      const opt = new Option(label, url);
      sel.insertBefore(opt, sel.options[sel.options.length - 1]);
      sel.value = url;
    }
    assembleCTAUrl();
  }
}

function loadCTATemplates() { try { return JSON.parse(localStorage.getItem(CTA_KEY) || '[]'); } catch { return []; } }

function saveCTATemplate() {
  const url  = (document.getElementById('cta_url').value || '').trim();
  const name = (document.getElementById('cta_save_name').value || '').trim();
  if (!url || !name) { alert('请填写 URL 和模版名称'); return; }
  const tpls = loadCTATemplates();
  const idx  = tpls.findIndex(t => t.name === name);
  if (idx >= 0) { if (!confirm(`替换 "${name}"？`)) return; tpls[idx].url = url; }
  else tpls.push({ name, url });
  localStorage.setItem(CTA_KEY, JSON.stringify(tpls));
  serverSave(CTA_KEY);
  document.getElementById('cta_save_name').value = '';
  renderCTATemplates();
}
function deleteCTATemplate(name) {
  localStorage.setItem(CTA_KEY, JSON.stringify(loadCTATemplates().filter(t => t.name !== name)));
  serverSave(CTA_KEY);
  renderCTATemplates();
}
function applyCTATemplate(url) { document.getElementById('cta_url').value = url; }
function renderCTATemplates() {
  const tpls = loadCTATemplates();
  document.getElementById('cta_saved_list').innerHTML = tpls.map(t =>
    `<span class="cta-chip" onclick="applyCTATemplate('${escAttr(t.url)}')">${esc(t.name)}<span class="cta-chip-del" onclick="event.stopPropagation();deleteCTATemplate('${escAttr(t.name)}')">✕</span></span>`
  ).join('');
}

// ─────────────────────────────────────────────
// CTA LABEL — AI POLISH
// ─────────────────────────────────────────────
async function polishCtaLabel() {
  const inp = document.getElementById('cta_label');
  const raw = inp.value.trim();
  if (!raw) { setStatus('请先输入 CTA 按钮名称再润色', 'error'); return; }
  const btn = document.getElementById('ctaPolishBtn');
  btn.disabled = true; btn.textContent = '✦ 润色中…';
  try {
    const resp = await fetch('/api/polish_cta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: raw }),
    });
    if (!resp.ok) throw new Error((await resp.json()).detail || resp.statusText);
    const data = await resp.json();
    inp.value = data.polished || raw;
    clearStatus();
  } catch (e) {
    setStatus(`润色失败: ${e.message}`, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '✦ AI 润色';
  }
}
