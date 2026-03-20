// ─────────────────────────────────────────────
// STEP 1 — AI INTENT PARSE + FIELDS REVEAL
// ─────────────────────────────────────────────
function showFieldsSection() {
  document.getElementById('fields-section').classList.add('show');
  const btn = document.getElementById('manualToggleBtn');
  if (btn) btn.textContent = '收起 ↑';
}

function toggleFieldsManually() {
  const section = document.getElementById('fields-section');
  const btn = document.getElementById('manualToggleBtn');
  if (section.classList.contains('show')) {
    section.classList.remove('show');
    btn.textContent = '手动填写 →';
  } else {
    section.classList.add('show');
    btn.textContent = '收起 ↑';
    document.getElementById('subject').focus();
  }
}

function _hideClarification() {
  const area = document.getElementById('clarification-area');
  area.style.display = 'none';
  area.innerHTML = '';
}

function _showClarification(clarification) {
  const area = document.getElementById('clarification-area');
  const chips = clarification.options.map(opt =>
    `<button class="clarification-chip" onclick="applyChipAndReparse(${JSON.stringify(opt)})">${opt}</button>`
  ).join('');
  area.innerHTML = `<div class="clarification-box">
    <div class="clarification-q">✦ ${clarification.question}</div>
    <div class="clarification-chips">${chips}</div>
  </div>`;
  area.style.display = 'block';
}

function applyChipAndReparse(option) {
  const input = document.getElementById('intent-input');
  input.value = (input.value.trim() + '，' + option).trim();
  _hideClarification();
  parseIntentAndFill();
}

// ── Example data ──────────────────────────────────────────────────
const EXAMPLES = {
  welcome: {
    intent: '给刚注册的 Phalcon Compliance 新用户发一封欢迎邮件，介绍 KYT/KYA 核心功能和每月 3 次免费筛查，CTA 跳到 Compliance App，Ruby 来发',
    fields: {
      template_id: 'ruby_kyt',
      subject: '新用户注册后欢迎，介绍 Phalcon Compliance 核心功能与免费额度',
      audience: '刚完成注册的 Phalcon Compliance 新用户',
      trigger: '用户注册完成后立即发送',
      instructions: '语气温暖友好，突出每月 3 次免费筛查，降低用户启动门槛',
      cta_destination: 'https://app.blocksec.com/phalcon/compliance',
      cta_label: '开始免费筛查',
      utm_content: 'welcome_onboarding',
    },
  },
  crime_report: {
    intent: '给下载了 2026 BlockSec 加密犯罪报告的交易所合规人员发一封推广 KYT 产品的邮件，CTA 跳到 Compliance App，Ruby 来发',
    fields: {
      template_id: 'ruby_kyt',
      subject: '发送犯罪报告后跟进推广 Phalcon KYT 产品',
      audience: '下载了 2026 加密犯罪报告的交易所合规负责人',
      trigger: '报告下载后 1-2 天内发送',
      instructions: '引用报告中的关键数据建立背景，自然过渡到 KYT 产品价值',
      cta_destination: 'https://app.blocksec.com/phalcon/compliance',
      cta_label: '免费体验 KYT 筛查',
      utm_content: 'crime_report_kyt',
    },
  },
  inactive: {
    intent: '给 14 天未使用 Phalcon Compliance 的用户发一封召回邮件，提醒剩余免费额度，Jenna 来发',
    fields: {
      template_id: 'jenna_marketing',
      subject: '14 天未活跃用户召回，提醒免费筛查额度',
      audience: '注册后 14 天内未再次使用的 Phalcon Compliance 用户',
      trigger: '用户最后一次登录后满 14 天触发',
      instructions: '语气轻松不强硬，以"免费额度快用完"制造轻度紧迫感',
      cta_destination: 'https://app.blocksec.com/phalcon/compliance',
      cta_label: '继续免费筛查',
      utm_content: '14d_inactive',
    },
  },
};

function fillIntentExample(key) {
  const ex = EXAMPLES[key];
  if (!ex) return;
  document.getElementById('intent-input').value = ex.intent;
  _hideClarification();
  parseIntentAndFill();
}

function fillExampleData(key) {
  const ex = EXAMPLES[key];
  if (!ex) return;
  const f = ex.fields;
  const sel = document.getElementById('template');
  if (f.template_id && sel.querySelector(`option[value="${f.template_id}"]`)) sel.value = f.template_id;
  document.getElementById('subject').value      = f.subject      || '';
  document.getElementById('audience').value     = f.audience     || '';
  document.getElementById('trigger').value      = f.trigger      || '';
  document.getElementById('instructions').value = f.instructions || '';
  if (f.cta_destination || f.cta_label || f.utm_content) {
    document.getElementById('ctaToggleBody').classList.add('open');
    document.getElementById('ctaArrow').classList.add('open');
    if (f.cta_destination) {
      const ctaSel = document.getElementById('cta_base');
      const match = [...ctaSel.options].find(o => o.value === f.cta_destination);
      if (match) { ctaSel.value = f.cta_destination; onCtaBaseChange(); }
    }
    if (f.utm_content) document.getElementById('cta_utm_content').value = f.utm_content;
    if (f.cta_label)   document.getElementById('cta_label').value = f.cta_label;
    assembleCTAUrl();
  }
}

function toggleCtaSection() {
  const body  = document.getElementById('ctaToggleBody');
  const arrow = document.getElementById('ctaArrow');
  const open  = body.classList.toggle('open');
  arrow.classList.toggle('open', open);
}

function _applyAiBadge(fieldId, value) {
  if (!value) return;
  const el = document.getElementById(fieldId);
  if (el) el.value = value;
  const label = document.querySelector(`label[id="${fieldId}-label"]`);
  if (label) label.classList.add('ai-badge');
}

async function parseIntentAndFill() {
  const description = (document.getElementById('intent-input').value || '').trim();
  if (!description) { setStatus('请输入邮件描述', 'error'); return; }
  const btn = document.getElementById('intentParseBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin">⟳</span> 解析中…';
  try {
    const resp = await fetch('/api/parse_intent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.detail || resp.statusText); }
    const data = await resp.json();
    // If AI needs clarification, show chips and stop
    if (data.clarification) {
      _showClarification(data.clarification);
      // Still fill whatever fields were parsed
    } else {
      _hideClarification();
    }
    // Remove AI badges from previous parse
    document.querySelectorAll('label.ai-badge').forEach(l => l.classList.remove('ai-badge'));
    // Fill template
    const sel = document.getElementById('template');
    if (data.template_id && sel.querySelector(`option[value="${data.template_id}"]`)) {
      sel.value = data.template_id;
    }
    // Fill text fields
    _applyAiBadge('subject',  data.subject);
    _applyAiBadge('audience', data.audience);
    _applyAiBadge('trigger',  data.trigger);
    if (data.instructions) document.getElementById('instructions').value = data.instructions;
    // Fill CTA fields if provided
    if (data.cta_destination || data.cta_label || data.utm_content) {
      const body  = document.getElementById('ctaToggleBody');
      const arrow = document.getElementById('ctaArrow');
      body.classList.add('open'); arrow.classList.add('open');
      if (data.cta_destination) {
        const ctaSel = document.getElementById('cta_base');
        const match = [...ctaSel.options].find(o => o.value === data.cta_destination);
        if (match) { ctaSel.value = data.cta_destination; onCtaBaseChange(); }
      }
      if (data.utm_content) document.getElementById('cta_utm_content').value = data.utm_content;
      if (data.cta_label)   document.getElementById('cta_label').value = data.cta_label;
      assembleCTAUrl();
    }
    // Show rationale card if AI provided reasoning
    if (data.rationale) {
      document.getElementById('rationale-text').textContent = data.rationale;
      document.getElementById('rationale-card').style.display = 'block';
    } else {
      document.getElementById('rationale-card').style.display = 'none';
    }
    if (!data.clarification) {
      showFieldsSection();
      clearStatus();
      setStatus('✦ AI 已填写字段，请检查并按需调整', 'success');
      setTimeout(clearStatus, 3000);
    }
  } catch (e) {
    setStatus(`解析失败: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ AI 解析并填写';
  }
}
