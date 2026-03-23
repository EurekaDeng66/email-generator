// ─────────────────────────────────────────────
// TEMPLATE LOADING
// ─────────────────────────────────────────────
async function loadTemplates() {
  try {
    const data = await (await fetch('/api/templates')).json();
    document.getElementById('template').innerHTML =
      '<option value="">— Select template —</option>' +
      Object.entries(data).map(([id, m]) => `<option value="${id}">${m.name} (${m.sender})</option>`).join('');
  } catch {
    document.getElementById('template').innerHTML = '<option value="">模版加载失败</option>';
  }
}

// ─────────────────────────────────────────────
// STEP 1 → GENERATE
// ─────────────────────────────────────────────
function getSelectedLangs() {
  return LANGS.filter(l => document.getElementById(`lang-check-${l}`).checked);
}

function updateGenerateBtn() {
  selectedLangs = getSelectedLangs();
  const btn = document.getElementById('generateBtn');
  btn.textContent = `✦ 生成邮件内容`;
}

function enterManualMode() {
  const templateId = document.getElementById('template').value;
  if (!templateId) {
    setStatus('请先在 Step 1 选择邮件模版', 'error');
    scrollToStep(1);
    return;
  }
  selectedLangs = getSelectedLangs();
  if (selectedLangs.length === 0) selectedLangs = [...LANGS];
  // Clear all state — user will type/paste their own content
  generatedContent = {}; assembledHtml = {};
  htmlReadyLangs = new Set(); dirtyLangs = new Set(); reviewedLangs = new Set();
  LANGS.forEach(l => {
    _updateReviewedMark(l);
    document.getElementById(`output-${l}`).classList.add('hidden');
    document.getElementById(`preview-wrap-${l}`).classList.add('hidden');
    if (quillEditors[l]) quillEditors[l].setText('');
    const titleEl = document.getElementById(`title-${l}`);
    if (titleEl) titleEl.value = '';
    _updateHtmlBtn(l);
  });
  updateReviewTabVisibility();
  document.getElementById('step2-placeholder').classList.add('hidden');
  document.getElementById('step2-editor').classList.remove('hidden');
  setStatus('编辑器已就绪，请粘贴或输入各语言内容', 'info');
  setTimeout(clearStatus, 3000);
  scrollToStep(2);
}

async function handleGenerate() {
  showFieldsSection(); // ensure fields are visible (e.g. if user typed then generated)
  const templateId   = document.getElementById('template').value;
  const subject      = document.getElementById('subject').value.trim();
  const audience     = document.getElementById('audience').value.trim();
  const trigger      = document.getElementById('trigger').value.trim();
  const ctaUrl       = document.getElementById('cta_url').value.trim();
  const ctaLabel     = document.getElementById('cta_label').value.trim();
  let   instructions = document.getElementById('instructions').value.trim();
  if (ctaLabel && ctaUrl) {
    const note = `CTA button label: "${ctaLabel}" — translate this label naturally into each language for the CTA link text.`;
    instructions = instructions ? `${instructions}\n${note}` : note;
  }

  if (!templateId) { setStatus('请选择邮件模版', 'error'); return; }
  if (!subject)    { setStatus('请输入邮件主题', 'error'); return; }

  selectedLangs = getSelectedLangs();
  if (selectedLangs.length === 0) { setStatus('请至少选择一种语言', 'error'); return; }

  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 生成中…';
  setStatus(`正在生成 ${selectedLangs.length} 种语言的邮件内容…`, 'info');

  try {
    const resp = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, subject, audience, trigger, instructions, cta_url: ctaUrl, languages: selectedLangs }),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.detail || resp.statusText); }
    generatedContent = await resp.json();
    htmlReadyLangs = new Set(); dirtyLangs = new Set(); reviewedLangs = new Set(); LANGS.forEach(_updateReviewedMark);
    assembledHtml = {};
    currentLibraryId = null; libraryDirtyLangs = new Set();
    LANGS.forEach(_updateSaveTplBtn);
    // Hide all output panels
    LANGS.forEach(l => document.getElementById(`output-${l}`).classList.add('hidden'));
    clearStatus();
    // Show Step 2 editor, hide placeholder
    document.getElementById('step2-placeholder').classList.add('hidden');
    document.getElementById('step2-editor').classList.remove('hidden');
    populateQuillEditors();
    markStepDone(1);
    scrollToStep(2);
  } catch (e) {
    setStatus(`Error: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = `✦ 生成邮件内容`;
  }
}
