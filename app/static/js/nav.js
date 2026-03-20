// ─────────────────────────────────────────────
// PIPELINE NAV (scroll-based, always visible)
// ─────────────────────────────────────────────
const STEP_LABELS = ['创建邮件营销事件', '内容审阅 / HTML 输出'];

function renderPipelineNav() {
  const el = document.getElementById('pipelineSteps');
  let h = '';
  for (let i = 1; i <= 2; i++) {
    const done   = stepDoneState[i];
    const active = i === activeNavStep;
    const cls    = done ? 'done' : active ? 'active' : '';
    h += `<div class="pipeline-step clickable ${cls}" onclick="scrollToStep(${i})">
      <div class="step-circle">${done ? '✓' : i}</div>
      <div class="step-label">${STEP_LABELS[i-1]}</div>
    </div>`;
    if (i < 2) h += `<div class="pipe-connector ${done ? 'done' : ''}"></div>`;
  }
  el.innerHTML = h;
}

function scrollToStep(n) {
  document.getElementById(`step-${n}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function highlightNavStep(n) {
  activeNavStep = n;
  renderPipelineNav();
}

function markStepDone(n, done = true) {
  stepDoneState[n] = done;
  renderPipelineNav();
}

// IntersectionObserver: update nav highlight as user scrolls
function initScrollObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        highlightNavStep(parseInt(e.target.dataset.step));
      }
    });
  }, { threshold: 0.25 });
  [1,2].forEach(n => {
    const el = document.getElementById(`step-${n}`);
    if (el) observer.observe(el);
  });
}
