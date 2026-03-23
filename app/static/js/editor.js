// ─────────────────────────────────────────────
// STEP 2 — QUILL EDITORS
// ─────────────────────────────────────────────
const QUILL_TOOLBAR = [
  ['bold', 'italic', 'underline'],
  ['link'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['clean'],
];

function initQuillEditors() {
  LANGS.forEach(lang => {
    quillEditors[lang] = new Quill(`#quill-${lang}`, {
      theme: 'snow',
      modules: { toolbar: QUILL_TOOLBAR },
    });
    // Mark dirty when user edits body
    quillEditors[lang].on('text-change', (delta, old, source) => {
      if (source === 'user') markDirty(lang);
    });
    // Mark dirty when user edits title
    const titleEl = document.getElementById(`title-${lang}`);
    if (titleEl) titleEl.addEventListener('input', () => markDirty(lang));
  });
}

function populateQuillEditors() {
  LANGS.forEach(lang => {
    const data = generatedContent[lang];
    if (!data) return;
    const titleEl = document.getElementById(`title-${lang}`);
    if (titleEl) titleEl.value = data.title || '';
    if (quillEditors[lang] && data.body) {
      quillEditors[lang].clipboard.dangerouslyPasteHTML(data.body);
    }
    // Mark dirty (new content, no HTML yet)
    markDirty(lang);
  });
  // Show/hide language tabs based on selectedLangs
  updateReviewTabVisibility();
}

function switchReviewTab(lang) {
  currentEditorLang = lang;
  document.querySelectorAll('#reviewTabs .lang-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.lang === lang));
  LANGS.forEach(l =>
    document.getElementById(`review-${l}`).classList.toggle('hidden', l !== lang));
}

function updateReviewTabVisibility() {
  const activeLangs = selectedLangs.length > 0 ? selectedLangs : LANGS;
  document.querySelectorAll('#reviewTabs .lang-tab').forEach(t => {
    const lang = t.dataset.lang;
    t.style.display = activeLangs.includes(lang) ? '' : 'none';
  });
  // Switch to first available lang
  const first = activeLangs[0] || 'en';
  switchReviewTab(first);
}

async function handleRegenerate(lang) {
  const templateId = document.getElementById('template').value;
  const subject    = document.getElementById('subject').value.trim();
  const audience   = document.getElementById('audience').value.trim();
  const trigger    = document.getElementById('trigger').value.trim();
  const ctaUrl     = document.getElementById('cta_url').value.trim();
  const ctaLabel   = document.getElementById('cta_label').value.trim();
  let   instructions = (document.getElementById(`revision-${lang}`).value || '').trim();
  if (ctaLabel && ctaUrl) {
    const note = `CTA button label: "${ctaLabel}" — translate this label naturally into ${lang} for the CTA link text.`;
    instructions = instructions ? `${instructions}\n${note}` : note;
  }

  // Snapshot current content from Quill for context
  const existing = {};
  LANGS.forEach(l => {
    existing[l] = {
      title: document.getElementById(`title-${l}`).value,
      body:  quillEditors[l] ? quillEditors[l].root.innerHTML : (generatedContent[l] ? generatedContent[l].body : ''),
    };
  });

  const btn = document.getElementById(`regen-${lang}`);
  btn.classList.add('spin'); btn.disabled = true;

  try {
    const resp = await fetch('/api/regenerate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId, subject, audience, trigger,
        language: lang, existing_content: existing,
        instructions, cta_url: ctaUrl,
      }),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.detail); }
    const result  = await resp.json();
    const newData = result[lang];
    if (newData) {
      generatedContent[lang] = newData;
      document.getElementById(`title-${lang}`).value = newData.title || '';
      if (quillEditors[lang] && newData.body) {
        quillEditors[lang].clipboard.dangerouslyPasteHTML(newData.body);
      }
      document.getElementById(`revision-${lang}`).value = '';
      markDirty(lang);
      document.getElementById(`output-${lang}`).classList.add('hidden');
    }
  } catch (e) {
    setStatus(`Regenerate failed: ${e.message}`, 'error');
  } finally {
    btn.classList.remove('spin'); btn.disabled = false;
  }
}

// ── Single-field regenerate (title_only / body_only) ──────────────
async function handleRegenField(lang, scope) {
  const templateId = document.getElementById('template').value;
  const subject    = document.getElementById('subject').value.trim();
  const audience   = document.getElementById('audience').value.trim();
  const trigger    = document.getElementById('trigger').value.trim();
  const ctaUrl     = document.getElementById('cta_url').value.trim();
  const ctaLabel   = document.getElementById('cta_label').value.trim();
  let   instructions = (document.getElementById(`revision-${lang}`).value || '').trim();
  if (ctaLabel && ctaUrl) {
    const note = `CTA button label: "${ctaLabel}" — translate naturally into ${lang}.`;
    instructions = instructions ? `${instructions}\n${note}` : note;
  }

  const existing = {};
  LANGS.forEach(l => {
    existing[l] = {
      title: document.getElementById(`title-${l}`).value,
      body:  quillEditors[l] ? quillEditors[l].root.innerHTML : (generatedContent[l]?.body || ''),
    };
  });

  const btnId = scope === 'title_only' ? `regen-title-${lang}` : `regen-body-${lang}`;
  const btn = document.getElementById(btnId);
  btn.disabled = true;
  btn.classList.add('loading');

  try {
    const resp = await fetch('/api/regenerate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId, subject, audience, trigger,
        language: lang, existing_content: existing,
        instructions, cta_url: ctaUrl, scope,
      }),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.detail); }
    const result  = await resp.json();
    const newData = result[lang];
    if (newData) {
      if (scope === 'title_only' && newData.title) {
        document.getElementById(`title-${lang}`).value = newData.title;
        if (generatedContent[lang]) generatedContent[lang].title = newData.title;
      }
      if (scope === 'body_only' && newData.body) {
        if (quillEditors[lang]) quillEditors[lang].clipboard.dangerouslyPasteHTML(newData.body);
        if (generatedContent[lang]) generatedContent[lang].body = newData.body;
      }
      markDirty(lang);
      document.getElementById(`output-${lang}`).classList.add('hidden');
    }
  } catch (e) {
    setStatus(`重新生成失败: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

// ── Batch regenerate (all selected langs, both title+body) ─────────
async function handleBatchRegen() {
  if (selectedLangs.length === 0) { setStatus('请先生成内容', 'error'); return; }
  const templateId = document.getElementById('template').value;
  const subject    = document.getElementById('subject').value.trim();
  const audience   = document.getElementById('audience').value.trim();
  const trigger    = document.getElementById('trigger').value.trim();
  const ctaUrl     = document.getElementById('cta_url').value.trim();
  const ctaLabel   = document.getElementById('cta_label').value.trim();

  const btn = document.getElementById('batchRegenBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin">⟳</span> 批量生成中…';
  setStatus(`正在批量重新生成 ${selectedLangs.length} 种语言…`, 'info');

  const existing = {};
  LANGS.forEach(l => {
    existing[l] = {
      title: document.getElementById(`title-${l}`).value,
      body:  quillEditors[l] ? quillEditors[l].root.innerHTML : (generatedContent[l]?.body || ''),
    };
  });

  const results = await Promise.allSettled(selectedLangs.map(lang => {
    let instructions = (document.getElementById(`revision-${lang}`).value || '').trim();
    if (ctaLabel && ctaUrl) {
      const note = `CTA button label: "${ctaLabel}" — translate naturally into ${lang}.`;
      instructions = instructions ? `${instructions}\n${note}` : note;
    }
    return fetch('/api/regenerate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId, subject, audience, trigger,
        language: lang, existing_content: existing,
        instructions, cta_url: ctaUrl, scope: 'both',
      }),
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.detail)));
  }));

  let succeeded = 0;
  results.forEach((res, i) => {
    const lang = selectedLangs[i];
    if (res.status === 'fulfilled') {
      const newData = res.value[lang];
      if (newData) {
        generatedContent[lang] = newData;
        document.getElementById(`title-${lang}`).value = newData.title || '';
        if (quillEditors[lang] && newData.body) quillEditors[lang].clipboard.dangerouslyPasteHTML(newData.body);
        document.getElementById(`revision-${lang}`).value = '';
        markDirty(lang);
        document.getElementById(`output-${lang}`).classList.add('hidden');
        succeeded++;
      }
    }
  });

  clearStatus();
  if (succeeded > 0) setStatus(`批量重新生成完成（${succeeded}/${selectedLangs.length} 种语言）`, 'success');
  btn.disabled = false;
  btn.textContent = '↻ 批量重新生成';
}

// ── Reviewed-state tracking ───────────────────────────────────────
function toggleReviewed(lang) {
  if (reviewedLangs.has(lang)) {
    reviewedLangs.delete(lang);
  } else {
    reviewedLangs.add(lang);
  }
  _updateReviewedMark(lang);
}

function _updateReviewedMark(lang) {
  const btn = document.getElementById(`reviewed-btn-${lang}`);
  const tab = document.querySelector(`#reviewTabs .lang-tab[data-lang="${lang}"]`);
  const isReviewed = reviewedLangs.has(lang);
  if (btn) {
    btn.textContent = isReviewed ? '✓ 已审阅' : '○ 标记已审阅';
    btn.classList.toggle('is-reviewed', isReviewed);
  }
  if (tab) tab.classList.toggle('reviewed', isReviewed);
}

// ── Dirty-state tracking ──────────────────────────────────────────
function markDirty(lang) {
  htmlReadyLangs.delete(lang);
  dirtyLangs.add(lang);
  // AI regen = content changed → clear reviewed
  reviewedLangs.delete(lang);
  _updateReviewedMark(lang);
  _updateHtmlBtn(lang);
  // Track library dirty state
  if (currentLibraryId) {
    libraryDirtyLangs.add(lang);
    _updateSaveTplBtn(lang);
  }
}

function markClean(lang) {
  dirtyLangs.delete(lang);
  htmlReadyLangs.add(lang);
  _updateHtmlBtn(lang);
}

function _updateHtmlBtn(lang) {
  const btn = document.getElementById(`html-btn-${lang}`);
  const tab = document.querySelector(`#reviewTabs .lang-tab[data-lang="${lang}"]`);
  if (!btn) return;
  const isClean = htmlReadyLangs.has(lang);
  if (isClean) {
    btn.textContent = '✓ HTML 已是最新';
    btn.className = 'btn btn-html-clean';
    btn.disabled = true;
  } else {
    btn.textContent = '⬆ 生成 HTML';
    btn.className = 'btn btn-html-dirty';
    btn.disabled = false;
  }
  if (tab) {
    tab.classList.toggle('html-ready', isClean);
    tab.classList.toggle('dirty', !isClean && dirtyLangs.has(lang));
  }
}

async function generateHtml(lang) {
  // Snapshot current editor content
  if (quillEditors[lang]) {
    if (!generatedContent[lang]) generatedContent[lang] = {};
    generatedContent[lang].body  = quillEditors[lang].root.innerHTML;
    generatedContent[lang].title = document.getElementById(`title-${lang}`).value;
  }
  const btn = document.getElementById(`html-btn-${lang}`);
  btn.disabled = true;
  btn.textContent = '⟳ 生成中…';
  await assembleForLang(lang);
  markClean(lang);
  showInlineOutput(lang);
}

async function assembleForLang(lang) {
  const templateId = document.getElementById('template').value;
  const data = generatedContent[lang];
  if (!data || !data.body) return;
  try {
    const resp = await fetch('/api/assemble', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, body_html: data.body, language: lang }),
    });
    if (resp.ok) { const json = await resp.json(); assembledHtml[lang] = json.html; }
  } catch {}
}

function showInlineOutput(lang) {
  const panel = document.getElementById(`output-${lang}`);
  panel.classList.remove('hidden');
  document.getElementById(`output-title-${lang}`).value = generatedContent[lang]?.title || '';
}

async function copyOutputTitle(lang, btn) {
  await copyText(document.getElementById(`output-title-${lang}`).value, btn);
}

async function copyOutputHtml(lang, btn) {
  await copyText(assembledHtml[lang] || '', btn);
}

function toggleInlinePreview(lang, btn) {
  const wrap = document.getElementById(`preview-wrap-${lang}`);
  const isHidden = wrap.classList.contains('hidden');
  wrap.classList.toggle('hidden');
  if (btn) btn.textContent = isHidden ? '收起预览 ▴' : '预览邮件 ▾';
  if (isHidden && assembledHtml[lang]) {
    const iframe = document.getElementById(`inline-iframe-${lang}`);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(assembledHtml[lang]); doc.close();
    // Inject CTA hover tooltips after content loads
    iframe.onload = () => injectCtaTooltips(lang);
    setTimeout(() => injectCtaTooltips(lang), 200);
  }
}

async function handleTranslateFrom(sourceLang) {
  // Snapshot source lang content from editor
  const titleEl = document.getElementById(`title-${sourceLang}`);
  const sourceTitle = titleEl ? titleEl.value.trim() : '';
  const sourceBody = quillEditors[sourceLang] ? quillEditors[sourceLang].root.innerHTML : '';
  if (!sourceBody || sourceBody === '<p><br></p>') {
    setStatus('请先填写源语言正文内容', 'error'); return;
  }
  if (!generatedContent[sourceLang]) generatedContent[sourceLang] = {};
  generatedContent[sourceLang].title = sourceTitle;
  generatedContent[sourceLang].body  = sourceBody;

  const targetLangs = selectedLangs.filter(l => l !== sourceLang);
  if (!targetLangs.length) { setStatus('没有其他已选语言可翻译', 'error'); return; }

  const btn = document.getElementById(`translate-from-btn-${sourceLang}`);
  if (btn) { btn.disabled = true; btn.textContent = '翻译中…'; }
  setStatus(`正在将 ${sourceLang.toUpperCase()} 同步翻译到 ${targetLangs.map(l=>l.toUpperCase()).join('/')}…`, 'info');

  try {
    const resp = await fetch('/api/translate_from', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: document.getElementById('template').value,
        source_lang: sourceLang,
        source_title: sourceTitle,
        source_body: sourceBody,
        target_langs: targetLangs,
        subject: document.getElementById('subject').value.trim(),
        audience: document.getElementById('audience').value.trim(),
      }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    const result = await resp.json();
    targetLangs.forEach(lang => {
      if (!result[lang]) return;
      if (!generatedContent[lang]) generatedContent[lang] = {};
      generatedContent[lang].title = result[lang].title || '';
      generatedContent[lang].body  = result[lang].body  || '';
      if (quillEditors[lang]) quillEditors[lang].root.innerHTML = generatedContent[lang].body;
      const tEl = document.getElementById(`title-${lang}`);
      if (tEl) tEl.value = generatedContent[lang].title;
      markDirty(lang);
    });
    setStatus(`✓ 已同步翻译到 ${targetLangs.map(l=>l.toUpperCase()).join('/')}`, 'success');
  } catch (e) {
    setStatus('翻译失败：' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '→ 同步翻译'; }
  }
}

async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = Object.assign(document.createElement('textarea'), {value:text}); document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  if (btn) { const orig = btn.textContent; btn.textContent = '✓ 已复制!'; btn.style.color='#16a34a'; setTimeout(()=>{ btn.textContent=orig; btn.style.color=''; }, 2000); }
}
