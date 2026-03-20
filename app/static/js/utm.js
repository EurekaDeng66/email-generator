// ─────────────────────────────────────────────
// UTM MANAGEMENT DRAWER
// ─────────────────────────────────────────────
function toggleUtmDrawer() {
  document.getElementById('utmPanel').classList.toggle('open');
  document.getElementById('utmOverlay').classList.toggle('hidden');
}

function loadUtmTemplates() { try { return JSON.parse(localStorage.getItem(UTM_KEY) || '[]'); } catch { return []; } }

function assembleUtmPreview() {
  const base = (document.getElementById('utm-tpl-base').value || '').trim();
  const src = (document.getElementById('utm-tpl-source').value || '').trim();
  const med = (document.getElementById('utm-tpl-medium').value || '').trim();
  const cam = (document.getElementById('utm-tpl-campaign').value || '').trim();
  const cnt = (document.getElementById('utm-tpl-content').value || '').trim();
  if (!base) { document.getElementById('utm-tpl-preview').value = ''; return; }
  const params = [];
  if (src) params.push(`utm_source=${encodeURIComponent(src)}`);
  if (med) params.push(`utm_medium=${encodeURIComponent(med)}`);
  if (cam) params.push(`utm_campaign=${encodeURIComponent(cam)}`);
  if (cnt) params.push(`utm_content=${encodeURIComponent(cnt)}`);
  document.getElementById('utm-tpl-preview').value = base + (params.length ? (base.includes('?') ? '&' : '?') + params.join('&') : '');
}

function saveUtmTemplate() {
  const name = (document.getElementById('utm-tpl-name').value || '').trim();
  if (!name) { alert('请输入模版名称'); return; }
  const tpl = {
    id: Date.now().toString(), name,
    base: (document.getElementById('utm-tpl-base').value || '').trim(),
    source: (document.getElementById('utm-tpl-source').value || '').trim(),
    medium: (document.getElementById('utm-tpl-medium').value || '').trim(),
    campaign: (document.getElementById('utm-tpl-campaign').value || '').trim(),
    content: (document.getElementById('utm-tpl-content').value || '').trim(),
  };
  const list = loadUtmTemplates();
  const idx = list.findIndex(t => t.name === name);
  if (idx >= 0) { if (!confirm(`替换 "${name}"？`)) return; list.splice(idx, 1); }
  list.unshift(tpl);
  localStorage.setItem(UTM_KEY, JSON.stringify(list));
  serverSave(UTM_KEY);
  ['utm-tpl-name','utm-tpl-base','utm-tpl-source','utm-tpl-medium','utm-tpl-campaign','utm-tpl-content','utm-tpl-preview'].forEach(id => document.getElementById(id).value = '');
  setStatus(`UTM 模版 "${name}" 已保存`, 'success');
  renderUtmTemplates();
}

function deleteUtmTemplate(id) {
  if (!confirm('确认删除该 UTM 模版？')) return;
  localStorage.setItem(UTM_KEY, JSON.stringify(loadUtmTemplates().filter(t => t.id !== id)));
  serverSave(UTM_KEY);
  renderUtmTemplates();
}

function applyUtmTemplate(id) {
  const tpl = loadUtmTemplates().find(t => t.id === id);
  if (!tpl) return;
  // Fill Step 1 CTA fields
  const selBase = document.getElementById('cta_base');
  const matchOpt = [...selBase.options].find(o => o.value === tpl.base);
  if (matchOpt) {
    selBase.value = tpl.base;
    document.getElementById('cta_custom_wrap').classList.add('hidden');
  } else if (tpl.base) {
    selBase.value = '__custom__';
    document.getElementById('cta_custom_wrap').classList.remove('hidden');
    document.getElementById('cta_custom_url').value = tpl.base;
  }
  if (tpl.source) document.getElementById('cta_utm_source').value = tpl.source;
  if (tpl.content) document.getElementById('cta_utm_content').value = tpl.content;
  assembleCTAUrl();
  toggleUtmDrawer();
  setStatus(`已应用 UTM 模版：${tpl.name}`, 'success');
}

function renderUtmTemplates() {
  const list = loadUtmTemplates();
  const el = document.getElementById('utmTplList');
  if (!list.length) {
    el.innerHTML = '<p class="text-muted" style="padding:4px 0;">暂无 UTM 模版。在上方创建一个。</p>';
    return;
  }
  el.innerHTML = list.map(t => {
    const params = [];
    if (t.source)   params.push(`source=${t.source}`);
    if (t.medium)   params.push(`medium=${t.medium}`);
    if (t.campaign) params.push(`campaign=${t.campaign}`);
    if (t.content)  params.push(`content=${t.content}`);
    const paramStr = params.join(' · ') || '(无参数)';
    return `<div class="tpl-card" style="margin-bottom:10px;">
      <div class="tpl-card-name">${esc(t.name)}</div>
      <div class="tpl-card-meta" style="word-break:break-all;">${esc(t.base || '(无 URL)')}</div>
      <div style="font-size:10px;color:#888;margin-bottom:8px;">${esc(paramStr)}</div>
      <div class="tpl-actions">
        <button class="btn btn-secondary btn-sm" onclick="applyUtmTemplate('${t.id}')">应用到 Step 1</button>
        <button class="btn btn-danger btn-sm" onclick="deleteUtmTemplate('${t.id}')">删除</button>
      </div>
    </div>`;
  }).join('');
}
