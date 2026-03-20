// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
(async () => {
  // Sync server data into localStorage before rendering
  await initServerSync();
  renderPipelineNav();
  restoreSavedDestinations();
  renderCTATemplates();
  renderLibrary();
  renderUtmTemplates();
  await loadTemplates();
  initQuillEditors();
  initScrollObserver();
  // Live preview for UTM template builder
  ['utm-tpl-base','utm-tpl-source','utm-tpl-medium','utm-tpl-campaign','utm-tpl-content'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', assembleUtmPreview);
  });
})();
