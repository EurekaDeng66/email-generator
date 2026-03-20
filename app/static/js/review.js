// ─────────────────────────────────────────────
// REVIEW MODAL
// ─────────────────────────────────────────────
let reviewList = [];
let reviewIndex = 0;
let reviewLang = 'en';
let reviewHtmlCache = {};  // {lang: html} for current template
let reviewCurrentMode = 'web';

function buildReviewList() {
  const userItems = loadLibrary().map(e => ({ type: 'user', id: e.id, data: e }));
  const presetItems = Object.entries(PRESET_EMAILS).map(([id, p]) => ({
    type: 'preset', id,
    data: { name: p.name, template_id: p.template_id, subject: p.subject,
            audience: p.audience, trigger: p.trigger,
            content: p.content, assembled_html: {}, langs: Object.keys(p.content) }
  }));
  return [...userItems, ...presetItems];
}

function openReviewModal(type, id) {
  reviewList = buildReviewList();
  reviewIndex = reviewList.findIndex(r => r.type === type && r.id === id);
  if (reviewIndex < 0) reviewIndex = 0;
  reviewHtmlCache = {};
  document.getElementById('reviewOverlay').classList.remove('hidden');
  document.getElementById('reviewModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  loadReviewTemplate(reviewIndex);
}

function closeReviewModal() {
  document.getElementById('reviewOverlay').classList.add('hidden');
  document.getElementById('reviewModal').classList.add('hidden');
  document.body.style.overflow = '';
  reviewHtmlCache = {};
}

async function loadReviewTemplate(idx) {
  reviewIndex = idx;
  reviewHtmlCache = {};
  const item = reviewList[idx];
  const data = item.data;

  // Nav label & template name
  document.getElementById('reviewNavLabel').textContent = `${idx + 1} / ${reviewList.length}`;
  document.getElementById('reviewModalTitle').textContent = data.name || '(无标题)';

  // Available langs
  const availLangs = (data.langs && data.langs.length)
    ? data.langs
    : Object.keys(data.content || {}).filter(l => data.content[l] && (data.content[l].body || data.content[l].title));
  if (!availLangs.length) availLangs.push('en');

  // Render lang tabs
  const tabsEl = document.getElementById('reviewLangTabs');
  tabsEl.innerHTML = availLangs.map(l =>
    `<div class="lang-tab${l === availLangs[0] ? ' active' : ''}" data-lang="${l}" onclick="switchReviewLang('${l}')">${LANG_LABELS[l] || l.toUpperCase()}</div>`
  ).join('');

  // Reset view size
  setReviewView(reviewCurrentMode, false);

  // Show loading, hide email card
  document.getElementById('reviewLoadingTip').style.display = 'flex';
  document.getElementById('reviewEmailChrome').style.display = 'none';

  // Load first lang
  const firstLang = availLangs[0];
  reviewLang = firstLang;
  updateReviewSubject(data, firstLang);
  await renderReviewLang(item, firstLang);
}

function updateReviewSubject(data, lang) {
  const title = data.content && data.content[lang] && data.content[lang].title;
  document.getElementById('reviewSubjectText').textContent = title || '—';
}

async function switchReviewLang(lang) {
  reviewLang = lang;
  document.querySelectorAll('#reviewLangTabs .lang-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.lang === lang));
  const item = reviewList[reviewIndex];
  updateReviewSubject(item.data, lang);
  document.getElementById('reviewLoadingTip').style.display = 'flex';
  document.getElementById('reviewEmailChrome').style.display = 'none';
  await renderReviewLang(item, lang);
}

async function renderReviewLang(item, lang) {
  const html = await assembleReviewLang(item, lang);
  const iframe = document.getElementById('reviewIframe');
  if (html) {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => injectCtaTooltips_iframe(iframe), 200);
  }
  document.getElementById('reviewLoadingTip').style.display = 'none';
  document.getElementById('reviewEmailChrome').style.display = 'flex';
}

async function assembleReviewLang(item, lang) {
  // Check cache first
  if (reviewHtmlCache[lang]) return reviewHtmlCache[lang];
  const data = item.data;
  // Check stored assembled_html
  if (data.assembled_html && data.assembled_html[lang]) {
    reviewHtmlCache[lang] = data.assembled_html[lang];
    return data.assembled_html[lang];
  }
  // Need to assemble
  const bodyHtml = data.content && data.content[lang] && data.content[lang].body;
  if (!bodyHtml) return null;
  try {
    const resp = await fetch('/api/assemble', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: data.template_id, body_html: bodyHtml, language: lang }),
    });
    if (resp.ok) {
      const json = await resp.json();
      reviewHtmlCache[lang] = json.html;
      return json.html;
    }
  } catch {}
  return null;
}

function reviewNav(dir) {
  const len = reviewList.length;
  if (!len) return;
  const next = ((reviewIndex + dir) % len + len) % len;
  reviewHtmlCache = {};
  loadReviewTemplate(next);
}

function setReviewView(mode, persist = true) {
  if (persist !== false) reviewCurrentMode = mode;
  const iframe = document.getElementById('reviewIframe');
  const card  = document.getElementById('reviewEmailCard');
  const webBtn = document.getElementById('reviewWebBtn');
  const mobBtn = document.getElementById('reviewMobileBtn');
  if (mode === 'mobile') {
    iframe.style.width = '375px';
    iframe.style.height = '780px';
    card.style.width = '375px';
    webBtn.classList.remove('active');
    mobBtn.classList.add('active');
  } else {
    iframe.style.width = '680px';
    iframe.style.height = '600px';
    card.style.width = '680px';
    webBtn.classList.add('active');
    mobBtn.classList.remove('active');
  }
}

function loadFromReview() {
  const item = reviewList[reviewIndex];
  if (!item) return;
  closeReviewModal();
  if (item.type === 'user') {
    loadFromLibrary(item.id);
  } else {
    loadPreset(item.id);
  }
  // Close library drawer too
  document.getElementById('drawerPanel').classList.remove('open');
  document.getElementById('drawerOverlay').classList.add('hidden');
}

// Variant of injectCtaTooltips that takes iframe element directly
function injectCtaTooltips_iframe(iframe) {
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  if (!doc) return;
  const links = doc.querySelectorAll('a[href]');
  links.forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    a.addEventListener('mouseenter', function() {
      let tip = doc.getElementById('_cta_tooltip');
      if (!tip) {
        tip = doc.createElement('div');
        tip.id = '_cta_tooltip';
        Object.assign(tip.style, {
          position:'fixed', bottom:'12px', left:'12px', right:'12px',
          background:'rgba(0,0,0,0.85)', color:'#fff', padding:'8px 12px',
          borderRadius:'6px', fontSize:'11px', fontFamily:'monospace',
          zIndex:'99999', wordBreak:'break-all', lineHeight:'1.4',
          pointerEvents:'none', transition:'opacity 0.15s', opacity:'0'
        });
        doc.body.appendChild(tip);
      }
      tip.textContent = href;
      tip.style.opacity = '1';
    });
    a.addEventListener('mouseleave', function() {
      const tip = doc.getElementById('_cta_tooltip');
      if (tip) tip.style.opacity = '0';
    });
  });
}

// ─────────────────────────────────────────────
// PREVIEW VIEW TOGGLE (Web / Mobile)
// ─────────────────────────────────────────────
function setPreviewView(lang, mode, btn) {
  const wrap = document.getElementById(`preview-wrap-${lang}`);
  wrap.querySelectorAll('.view-toggle').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const iframe = document.getElementById(`inline-iframe-${lang}`);
  if (mode === 'mobile') {
    iframe.style.width = '375px';
    iframe.style.height = '667px';
  } else {
    iframe.style.width = '100%';
    iframe.style.height = '420px';
  }
}

// ─────────────────────────────────────────────
// CTA HOVER TOOLTIP (show UTM link on hover)
// ─────────────────────────────────────────────
function injectCtaTooltips(lang) {
  const iframe = document.getElementById(`inline-iframe-${lang}`);
  injectCtaTooltips_iframe(iframe);
}
