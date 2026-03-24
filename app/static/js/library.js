// ─────────────────────────────────────────────
// LIBRARY DRAWER
// ─────────────────────────────────────────────
function toggleLibraryDrawer() {
  document.getElementById('drawerPanel').classList.toggle('open');
  document.getElementById('drawerOverlay').classList.toggle('hidden');
}

// ─────────────────────────────────────────────
// TEMPLATE LIBRARY (drawer)
// ─────────────────────────────────────────────
function loadLibrary() { try { return JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); } catch { return []; } }

function _saveEntry(name, status) {
  const lib = loadLibrary();
  const idx = lib.findIndex(e => e.name === name);
  const existing = idx >= 0 ? lib[idx] : {};
  const allLangs = LANGS.filter(l => generatedContent[l]?.body || generatedContent[l]?.title);
  const entry = {
    ...existing,
    id: existing.id || Date.now().toString(),
    name, status,
    template_id: document.getElementById('template').value,
    subject:  document.getElementById('subject').value.trim(),
    audience: document.getElementById('audience').value.trim(),
    trigger:  document.getElementById('trigger').value.trim(),
    content:  JSON.parse(JSON.stringify(generatedContent)),
    assembled_html: JSON.parse(JSON.stringify(assembledHtml)),
    langs: allLangs,
    saved_at: new Date().toLocaleDateString('zh-CN'),
    // revision_notes preserved from existing if not overwritten
  };
  if (idx >= 0) { if (!confirm(`Replace "${name}"?`)) return false; lib.splice(idx, 1); }
  lib.unshift(entry);
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  serverSave(LIB_KEY);
  document.getElementById('lib-save-name').value = '';
  renderLibrary();
  return true;
}

function saveToDraft() {
  const name = (document.getElementById('lib-save-name').value || '').trim();
  if (!name) { alert('请输入名称'); return; }
  if (_saveEntry(name, 'draft')) setStatus(`草稿 "${name}" 已保存`, 'success');
}

async function saveAsTemplate() {
  const name = (document.getElementById('lib-save-name').value || '').trim();
  if (!name) { alert('请输入名称'); return; }
  const pending = selectedLangs.filter(l => generatedContent[l]?.body && !htmlReadyLangs.has(l));
  if (pending.length) {
    setStatus('正在生成 HTML…', 'info');
    pending.forEach(l => {
      if (quillEditors[l]) {
        if (!generatedContent[l]) generatedContent[l] = {};
        generatedContent[l].body = quillEditors[l].root.innerHTML;
        const titleEl = document.getElementById(`title-${l}`);
        if (titleEl) generatedContent[l].title = titleEl.value.trim();
      }
    });
    await Promise.all(pending.map(l => assembleForLang(l).then(() => markClean(l))));
  }
  if (_saveEntry(name, 'published')) setStatus(`模版 "${name}" 已保存 ✓`, 'success');
}

async function publishDraft(id) {
  const lib = loadLibrary();
  const entry = lib.find(e => e.id === id);
  if (!entry) return;
  generatedContent = JSON.parse(JSON.stringify(entry.content || {}));
  assembledHtml    = JSON.parse(JSON.stringify(entry.assembled_html || {}));
  htmlReadyLangs   = new Set(Object.keys(assembledHtml).filter(l => assembledHtml[l]));
  selectedLangs    = entry.langs?.length ? [...entry.langs] : [...LANGS];
  const pending = selectedLangs.filter(l => generatedContent[l]?.body && !htmlReadyLangs.has(l));
  if (pending.length) {
    setStatus('正在生成 HTML…', 'info');
    await Promise.all(pending.map(l => assembleForLang(l).then(() => markClean(l))));
  }
  lib.splice(lib.findIndex(e => e.id === id), 1);
  const allLangs = LANGS.filter(l => generatedContent[l]?.body || generatedContent[l]?.title);
  const updated = { ...entry, status: 'published', assembled_html: JSON.parse(JSON.stringify(assembledHtml)), langs: allLangs };
  lib.unshift(updated);
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  serverSave(LIB_KEY);
  setStatus(`"${entry.name}" 已发布为正式模版 ✓`, 'success');
  renderLibrary();
}

function deleteFromLibrary(id) {
  if (!confirm('Delete this template?')) return;
  localStorage.setItem(LIB_KEY, JSON.stringify(loadLibrary().filter(e => e.id !== id)));
  serverSave(LIB_KEY);
  renderLibrary();
}

function loadFromLibrary(id) {
  const entry = loadLibrary().find(e => e.id === id);
  if (!entry) return;
  currentLibraryId = id;
  libraryDirtyLangs = new Set();
  loadData(entry);
  LANGS.forEach(_updateSaveTplBtn);
}

function _updateSaveTplBtn(lang) {
  const btn = document.getElementById(`save-tpl-btn-${lang}`);
  if (!btn) return;
  if (!currentLibraryId) {
    btn.textContent = '保存为模版';
    btn.disabled = false;
    btn.className = 'btn btn-sm btn-save-tpl btn-save-tpl-fresh';
    btn.onclick = () => saveOrUpdateTemplate(lang);
  } else if (libraryDirtyLangs.has(lang)) {
    btn.textContent = '↑ 更新模版';
    btn.disabled = false;
    btn.className = 'btn btn-sm btn-save-tpl btn-save-tpl-update';
    btn.onclick = () => saveOrUpdateTemplate(lang);
  } else {
    btn.textContent = '✓ 模版已是最新';
    btn.disabled = true;
    btn.className = 'btn btn-sm btn-save-tpl btn-save-tpl-synced';
    btn.onclick = null;
  }
}

async function saveOrUpdateTemplate(lang) {
  if (!currentLibraryId) {
    toggleLibraryDrawer();
    return;
  }
  const btn = document.getElementById(`save-tpl-btn-${lang}`);
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '保存中…';

  // Assemble HTML for all dirty selected langs before saving
  const toAssemble = selectedLangs.filter(l => dirtyLangs.has(l) && generatedContent[l]?.body);
  if (toAssemble.length) {
    toAssemble.forEach(l => {
      if (quillEditors[l]) {
        if (!generatedContent[l]) generatedContent[l] = {};
        generatedContent[l].body = quillEditors[l].root.innerHTML;
        const titleEl = document.getElementById(`title-${l}`);
        if (titleEl) generatedContent[l].title = titleEl.value.trim();
      }
    });
    await Promise.all(toAssemble.map(l => assembleForLang(l).then(() => { markClean(l); showInlineOutput(l); })));
  }

  const lib = loadLibrary();
  const idx = lib.findIndex(e => e.id === currentLibraryId);
  if (idx < 0) {
    setStatus('模版未找到，请重新保存', 'error');
    btn.disabled = false; btn.textContent = origText;
    return;
  }
  const allLangs = LANGS.filter(l => generatedContent[l]?.body || generatedContent[l]?.title);
  lib[idx] = {
    ...lib[idx],
    content: JSON.parse(JSON.stringify(generatedContent)),
    assembled_html: JSON.parse(JSON.stringify(assembledHtml)),
    langs: allLangs,
    saved_at: new Date().toLocaleDateString('zh-CN'),
  };
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  serverSave(LIB_KEY);
  libraryDirtyLangs.clear();
  setStatus(`模版已更新 ✓`, 'success');
  setTimeout(clearStatus, 2000);
  renderLibrary();
  LANGS.forEach(_updateSaveTplBtn);
}

function loadData(data) {
  showFieldsSection(); // always show fields when loading data
  document.getElementById('subject').value   = data.subject  || '';
  document.getElementById('audience').value  = data.audience || '';
  document.getElementById('trigger').value   = data.trigger  || '';
  document.getElementById('instructions').value = '';
  const sel = document.getElementById('template');
  if (data.template_id && sel.querySelector(`option[value="${data.template_id}"]`))
    sel.value = data.template_id;
  generatedContent = JSON.parse(JSON.stringify(data.content || {}));
  assembledHtml    = JSON.parse(JSON.stringify(data.assembled_html || {}));
  htmlReadyLangs = new Set(); dirtyLangs = new Set(); reviewedLangs = new Set(); LANGS.forEach(_updateReviewedMark);
  // Fill revision notes if entry has them
  const revNotes = document.getElementById('revision-global');
  if (revNotes) revNotes.value = data.revision_notes || '';
  const revRow = document.getElementById('globalRevisionRow');
  if (revRow) revRow.style.display = 'flex';
  // Update language checkboxes to match loaded data
  selectedLangs = Object.keys(data.content || {}).filter(l => data.content[l] && (data.content[l].title || data.content[l].body));
  if (selectedLangs.length === 0) selectedLangs = [...LANGS];
  LANGS.forEach(l => {
    const cb = document.getElementById(`lang-check-${l}`);
    if (cb) cb.checked = selectedLangs.includes(l);
  });
  updateGenerateBtn();
  // Show Step 2 editor
  document.getElementById('step2-placeholder').classList.add('hidden');
  document.getElementById('step2-editor').classList.remove('hidden');
  // Hide all output panels first
  LANGS.forEach(l => document.getElementById(`output-${l}`).classList.add('hidden'));
  populateQuillEditors();
  // For langs with assembled HTML → mark clean; others → mark dirty
  LANGS.forEach(l => {
    if (assembledHtml[l]) { markClean(l); showInlineOutput(l); }
    else if (generatedContent[l]) markDirty(l);
  });
  // Close drawer if open
  document.getElementById('drawerPanel').classList.remove('open');
  document.getElementById('drawerOverlay').classList.add('hidden');
  scrollToStep(2);
}

function renderLibrary() { renderUserTpls(); renderPresetTpls(); }

function toggleCardMeta(id, btn) {
  const meta = document.getElementById(`meta-${id}`);
  if (!meta) return;
  const open = meta.classList.toggle('open');
  btn.textContent = open ? '收起详情 ▴' : '展开详情 ▾';
}

const TMPL_LABELS = { ruby_sales: 'Ruby Sales', ruby_kyt: 'Ruby KYT', jenna_marketing: 'Jenna Marketing' };

// ─────────────────────────────────────────────
// METRICS HELPERS
// ─────────────────────────────────────────────
function loadMetrics() {
  return JSON.parse(localStorage.getItem(METRICS_KEY) || '[]');
}

function saveMetrics(arr) {
  localStorage.setItem(METRICS_KEY, JSON.stringify(arr));
  fetch(`/api/store/${METRICS_KEY}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: arr }),
  }).catch(() => {});
}

function updateTemplateHint(tplId) {
  const hint = document.getElementById('template-perf-hint');
  if (!tplId) { hint.style.display = 'none'; return; }
  const metrics = loadMetrics().filter(m => m.template_id === tplId);
  if (!metrics.length) { hint.style.display = 'none'; return; }
  const agg = {};
  metrics.forEach(m => {
    Object.entries(m.metrics || {}).forEach(([lang, s]) => {
      if (!agg[lang]) agg[lang] = { opens: [], clicks: [] };
      if (s.open_rate != null) agg[lang].opens.push(s.open_rate);
      if (s.click_rate != null) agg[lang].clicks.push(s.click_rate);
    });
  });
  const parts = Object.entries(agg).map(([lang, s]) => {
    const o = s.opens.length ? (s.opens.reduce((a,b)=>a+b,0)/s.opens.length*100).toFixed(0)+'%' : '—';
    const c = s.clicks.length ? (s.clicks.reduce((a,b)=>a+b,0)/s.clicks.length*100).toFixed(0)+'%' : '—';
    return `${lang.toUpperCase()} 打开${o} 点击${c}`;
  });
  hint.textContent = `📊 基于 ${metrics.length} 次发送：${parts.join(' · ')}`;
  hint.style.display = 'block';
}

function openMetricsEntry(campaignId) {
  const modal = document.getElementById('metricsEntryModal');
  document.getElementById('metricsEntryId').value = campaignId;
  // Reset fields
  ['en','zh','es','ja'].forEach(l => {
    ['sent','open_rate','click_rate'].forEach(f => {
      const el = document.getElementById(`me_${l}_${f}`);
      if (el) el.value = '';
    });
  });
  // Pre-fill if already exists
  const existing = loadMetrics().find(m => m.campaign_id === campaignId);
  if (existing) {
    Object.entries(existing.metrics || {}).forEach(([lang, s]) => {
      if (s.sent != null) { const el = document.getElementById(`me_${lang}_sent`); if (el) el.value = s.sent; }
      if (s.open_rate != null) { const el = document.getElementById(`me_${lang}_open_rate`); if (el) el.value = (s.open_rate * 100).toFixed(1); }
      if (s.click_rate != null) { const el = document.getElementById(`me_${lang}_click_rate`); if (el) el.value = (s.click_rate * 100).toFixed(1); }
    });
  }
  modal.style.display = 'flex';
}

function closeMetricsEntry() {
  document.getElementById('metricsEntryModal').style.display = 'none';
}

function saveMetricsEntry() {
  const campaignId = document.getElementById('metricsEntryId').value;
  const lib = loadLibrary();
  const entry = lib.find(e => e.id === campaignId);
  if (!entry) return;

  const metrics = {};
  ['en','zh','es','ja'].forEach(l => {
    const sent = parseFloat(document.getElementById(`me_${l}_sent`)?.value);
    const open = parseFloat(document.getElementById(`me_${l}_open_rate`)?.value);
    const click = parseFloat(document.getElementById(`me_${l}_click_rate`)?.value);
    if (!isNaN(sent) || !isNaN(open) || !isNaN(click)) {
      metrics[l] = {};
      if (!isNaN(sent))  metrics[l].sent = sent;
      if (!isNaN(open))  metrics[l].open_rate  = open / 100;
      if (!isNaN(click)) metrics[l].click_rate = click / 100;
    }
  });
  if (!Object.keys(metrics).length) { closeMetricsEntry(); return; }

  const all = loadMetrics();
  const idx = all.findIndex(m => m.campaign_id === campaignId);
  const record = {
    campaign_id: campaignId,
    template_id: entry.template_id,
    audience: entry.audience || '',
    trigger: entry.trigger || '',
    metrics,
    recorded_at: new Date().toISOString().slice(0, 10),
  };
  if (idx >= 0) all[idx] = record; else all.push(record);
  saveMetrics(all);
  closeMetricsEntry();
  updateTemplateHint(document.getElementById('template').value);
  setStatus('✦ 数据已记录', 'success'); setTimeout(clearStatus, 2000);
}

function renderUserTpls() {
  const lib  = loadLibrary();
  const grid = document.getElementById('userTplGrid');
  if (!lib.length) {
    grid.innerHTML = '<p class="text-muted" style="padding:4px 0;">暂无模版。在上方输入名称保存当前邮件。</p>';
    return;
  }
  const allMetrics = loadMetrics();
  grid.innerHTML = lib.map(e => {
    const hasMet = allMetrics.some(m => m.campaign_id === e.id);
    const metLabel = hasMet ? '<span class="tag" style="background:#d4edda;color:#155724;">📊 有数据</span>' : '';
    const isDraft = e.status === 'draft';
    const statusLabel = isDraft
      ? '<span class="tag tag-draft">草稿</span>'
      : '<span class="tag tag-published">模版</span>';
    const audience = e.audience ? esc(e.audience) : '—';
    const trigger  = e.trigger  ? esc(e.trigger)  : '—';
    const subject  = e.subject  ? esc(e.subject)  : '—';
    const publishBtn = isDraft
      ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();publishDraft('${e.id}')">发布 →</button>`
      : '';
    const previewBtn = isDraft
      ? `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();previewDraft('${e.id}')">👁 预览</button>`
      : '';
    return `
    <div class="tpl-card" onclick="${isDraft ? '' : `openReviewModal('user','${e.id}')`}" style="${isDraft ? 'cursor:default;' : ''}">
      <div class="tpl-card-name">${esc(e.name)}</div>
      <div class="tpl-card-meta">${e.saved_at || ''}</div>
      <div class="tpl-tags">
        ${statusLabel}
        <span class="tag tag-tmpl">${TMPL_LABELS[e.template_id] || e.template_id}</span>
        ${(e.langs||[]).map(l=>`<span class="tag tag-lang">${l.toUpperCase()}</span>`).join('')}
        ${metLabel}
      </div>
      <div class="tpl-expand-meta" id="meta-${e.id}" onclick="event.stopPropagation()">
        <div><strong>发送方向：</strong>${subject}</div>
        <div><strong>发送对象：</strong>${audience}</div>
        <div><strong>触发时机：</strong>${trigger}</div>
      </div>
      <div class="tpl-actions">
        <button class="tpl-expand-toggle" onclick="event.stopPropagation();toggleCardMeta('${e.id}',this)">展开详情 ▾</button>
        ${previewBtn}
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();loadFromLibrary('${e.id}')">✏️ 编辑</button>
        ${publishBtn}
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openMetricsEntry('${e.id}')">📊 录入数据</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteFromLibrary('${e.id}')">删除</button>
      </div>
    </div>`;
  }).join('');
}

function renderPresetTpls() {
  document.getElementById('presetTplGrid').innerHTML =
    Object.entries(PRESET_EMAILS).map(([id, p]) => `
    <div class="tpl-card" onclick="openReviewModal('preset','${id}')">
      <div class="tpl-card-name">${esc(p.name)}</div>
      <div class="tpl-card-meta">系统预置</div>
      <div class="tpl-tags">
        <span class="tag tag-sys">系统</span>
        <span class="tag tag-tmpl">${TMPL_LABELS[p.template_id] || p.template_id}</span>
        ${Object.keys(p.content).map(l=>`<span class="tag tag-lang">${l.toUpperCase()}</span>`).join('')}
      </div>
      <div class="tpl-expand-meta" id="meta-preset-${id}" onclick="event.stopPropagation()">
        <div><strong>发送对象：</strong>${esc(p.audience || '—')}</div>
        <div><strong>触发时机：</strong>${esc(p.trigger || '—')}</div>
      </div>
      <div class="tpl-actions">
        <button class="tpl-expand-toggle" onclick="event.stopPropagation();toggleCardMeta('preset-${id}',this)">展开详情 ▾</button>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();loadPreset('${id}')">✏️ 编辑</button>
      </div>
    </div>`).join('');
}

function loadPreset(id) {
  const p = PRESET_EMAILS[id];
  if (!p) return;
  currentLibraryId = null; libraryDirtyLangs = new Set();
  const data = {
    template_id: p.template_id, subject: p.subject,
    audience: p.audience, trigger: p.trigger,
    content: {}, assembled_html: {}, langs: Object.keys(p.content),
  };
  LANGS.forEach(l => { data.content[l] = p.content[l] || { title: '', body: '' }; });
  loadData(data);
  LANGS.forEach(_updateSaveTplBtn);
}

function startNew() {
  currentLibraryId = null; libraryDirtyLangs = new Set();
  generatedContent = {}; assembledHtml = {};
  htmlReadyLangs = new Set(); dirtyLangs = new Set(); reviewedLangs = new Set(); LANGS.forEach(_updateReviewedMark);
  stepDoneState = {};
  // Hide fields section, reset intent input
  document.getElementById('fields-section').classList.remove('show');
  const _mBtn = document.getElementById('manualToggleBtn');
  if (_mBtn) _mBtn.textContent = '手动填写 →';
  document.getElementById('intent-input').value = '';
  document.getElementById('rationale-card').style.display = 'none';
  _hideClarification();
  document.querySelectorAll('label.ai-badge').forEach(l => l.classList.remove('ai-badge'));
  const revRow2 = document.getElementById('globalRevisionRow');
  const revGlobal = document.getElementById('revision-global');
  if (revGlobal) revGlobal.value = '';
  if (revRow2) revRow2.style.display = 'none';
  LANGS.forEach(l => {
    if (quillEditors[l]) quillEditors[l].setText('');
    document.getElementById(`title-${l}`).value = '';
    htmlReadyLangs.delete(l); dirtyLangs.delete(l); _updateHtmlBtn(l);
    document.getElementById(`output-${l}`).classList.add('hidden');
    document.getElementById(`preview-wrap-${l}`).classList.add('hidden');
  });
  ['subject','audience','trigger','instructions','variables','cta_url'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  // Reset language checkboxes
  LANGS.forEach(l => { document.getElementById(`lang-check-${l}`).checked = true; });
  selectedLangs = [...LANGS];
  updateGenerateBtn();
  // Reset placeholders
  document.getElementById('step2-placeholder').classList.remove('hidden');
  document.getElementById('step2-editor').classList.add('hidden');
  renderPipelineNav();
  scrollToStep(1);
}

// ─────────────────────────────────────────────
// DRAFT PREVIEW MODAL
// ─────────────────────────────────────────────
let _draftPreviewEntry = null;
let _draftPreviewLang = 'zh';

function previewDraft(entryId) {
  const entry = loadLibrary().find(e => e.id === entryId);
  if (!entry) return;
  _draftPreviewEntry = entry;

  document.getElementById('draftPreviewName').textContent = entry.name;
  document.getElementById('draftReviewNotes').value = entry.revision_notes || '';

  // Build lang tabs
  const langs = entry.langs?.length ? entry.langs : LANGS;
  _draftPreviewLang = langs[0] || 'zh';
  const tabsEl = document.getElementById('draftPreviewTabs');
  tabsEl.innerHTML = langs.map(l =>
    `<div class="lang-tab${l === _draftPreviewLang ? ' active' : ''}" onclick="_switchDraftPreviewLang('${l}')">${l.toUpperCase()}</div>`
  ).join('');

  _renderDraftPreviewContent();

  document.getElementById('draftPreviewOverlay').style.display = 'block';
  document.getElementById('draftPreviewModal').style.display = 'flex';
}

function _switchDraftPreviewLang(lang) {
  _draftPreviewLang = lang;
  document.querySelectorAll('#draftPreviewTabs .lang-tab').forEach(t =>
    t.classList.toggle('active', t.textContent.toLowerCase() === lang));
  _renderDraftPreviewContent();
}

function _renderDraftPreviewContent() {
  if (!_draftPreviewEntry) return;
  const content = (_draftPreviewEntry.content || {})[_draftPreviewLang] || {};
  document.getElementById('draftPreviewTitle').textContent = content.title || '（无标题）';
  document.getElementById('draftPreviewBody').innerHTML = content.body || '<em style="color:#aaa">（无正文）</em>';
}

function closeDraftPreview() {
  document.getElementById('draftPreviewOverlay').style.display = 'none';
  document.getElementById('draftPreviewModal').style.display = 'none';
  _draftPreviewEntry = null;
}

function saveDraftReviewNotes() {
  if (!_draftPreviewEntry) return;
  const notes = document.getElementById('draftReviewNotes').value.trim();
  const lib = loadLibrary();
  const idx = lib.findIndex(e => e.id === _draftPreviewEntry.id);
  if (idx < 0) return;
  lib[idx].revision_notes = notes;
  _draftPreviewEntry = lib[idx];
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
  serverSave(LIB_KEY);
  setStatus('审阅意见已保存', 'success');
  setTimeout(clearStatus, 1500);
}

function editDraftFromPreview() {
  if (!_draftPreviewEntry) return;
  // Save notes first
  saveDraftReviewNotes();
  // Load the entry into the editor
  closeDraftPreview();
  currentLibraryId = _draftPreviewEntry?.id || null;
  libraryDirtyLangs = new Set();
  loadData(_draftPreviewEntry);
  LANGS.forEach(_updateSaveTplBtn);
}
