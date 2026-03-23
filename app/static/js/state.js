// ─────────────────────────────────────────────
// STATE — global constants and mutable state
// ─────────────────────────────────────────────
const LANGS = ['zh', 'en', 'es', 'ja'];
const LANG_LABELS = { zh: '中文', en: '英文', es: '西班牙语', ja: '日语' };
let activeNavStep = 1;    // which step is highlighted in nav
let stepDoneState = {};   // {1: bool, 2: bool}
let generatedContent = {};
let assembledHtml = {};
let htmlReadyLangs = new Set();  // langs whose assembled HTML matches current content
let reviewedLangs  = new Set();  // langs explicitly marked as reviewed by user
let dirtyLangs     = new Set();  // langs with unsaved edits since last HTML gen
let quillEditors = {};
let currentEditorLang = 'en';
let selectedLangs = [...LANGS]; // languages selected for generation
let currentLibraryId = null;    // id of the library entry currently being edited (null = new)
let libraryDirtyLangs = new Set(); // langs modified since last library load/save

const CTA_KEY     = 'blocksec_cta_templates';
const FIELD_KEY   = 'blocksec_field_options';
const LIB_KEY     = 'blocksec_email_library';
const UTM_KEY     = 'blocksec_utm_templates';
const METRICS_KEY = 'blocksec_campaign_metrics';
const STORE_KEYS  = [CTA_KEY, FIELD_KEY, LIB_KEY, UTM_KEY, METRICS_KEY];
