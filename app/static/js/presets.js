// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function esc(s)     { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(s) { return String(s).replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }

// ─────────────────────────────────────────────
// PRESET EMAIL DATA
// ─────────────────────────────────────────────
const P = 'style="margin:0 0 0.9em 0;"';
const PRESET_EMAILS = {
  'welcome': {
    name: 'Welcome — New User', template_id: 'ruby_sales',
    subject: 'Welcome to Phalcon Compliance — Quick Start',
    audience: 'New Phalcon Compliance free users', trigger: 'Account activation (welcome)',
    content: {
      en: { title: 'Welcome to Phalcon Compliance — Quick Start', body: `<p ${P}>Great to see you join!</p><p ${P}>Phalcon Compliance is your intelligent crypto AML platform. We help you keep illicit funds away, automate KYA/KYT screening, and stay compliant with confidence.</p><p ${P}>To get started, screen one address or transaction you already care about. You have <strong>3 free compliance checks this month</strong>. Make them count — each one could be the scan that catches a risk before it costs you.</p><p ${P}><a href="https://app.blocksec.com/phalcon/compliance?utm_source=product_email&utm_content=welcome" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">Run a Compliance Check →</a></p><p ${P}>Any questions? Feel free to contact me directly or join our Telegram community <a href="https://t.me/BlockSecTeam" target="_blank" style="color:#2563EB;text-decoration:none;">@BlockSecTeam</a> for real-time support and updates.</p><p ${P}>Resources: <a href="#" style="color:#2563EB;text-decoration:none;">User Guides</a> | <a href="#" style="color:#2563EB;text-decoration:none;">API Docs</a></p><p ${P}>Cheers,<br/>Ruby</p>` },
      zh: { title: '欢迎加入 Phalcon Compliance — 快速上手', body: `<p ${P}>欢迎加入 Phalcon Compliance 👋</p><p ${P}>Phalcon 帮你轻松搞定加密资产合规——自动化 KYT/KYA 筛查，隔离非法资金，让监管审核不再头疼。</p><p ${P}>无论你是审查钱包风险、监控资金流动，还是审核出入金地址，都能一站搞定。</p><p ${P}>我们为每位新朋友提供每月3次免费筛查，可以挑一个真实案例试试，比如入金审查或合规检查，看看能否帮你的日常合规更高效。</p><p ${P}><a href="https://app.blocksec.com/phalcon/compliance?utm_source=product_email&utm_content=welcome" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">👉 开始免费筛查 →</a></p><p ${P}>有任何问题随时邮件，也欢迎来 Telegram 社区 <a href="https://t.me/BlockSecTeam" target="_blank" style="color:#2563EB;text-decoration:none;">@BlockSecTeam</a> 一起交流。</p><p ${P}>相关资料：📄 <a href="#" style="color:#2563EB;text-decoration:none;">用户手册</a> | <a href="#" style="color:#2563EB;text-decoration:none;">API 文档</a></p><p ${P}>祝好，<br/>Ruby Xu ｜ COO @BlockSec</p>` },
      es: { title: 'Bienvenido a Phalcon Compliance: guía de inicio rápido', body: `<p ${P}>¡Nos alegra tenerle con nosotros!</p><p ${P}>Phalcon Compliance es su plataforma inteligente de AML para criptoactivos. Le ayudamos a mantener alejados los fondos ilícitos, automatizar los controles KYA/KYT y gestionar el cumplimiento con mayor seguridad.</p><p ${P}>Para empezar, analice una dirección o transacción que ya sea relevante para su equipo. Este mes tiene <strong>3 verificaciones de compliance gratuitas</strong>.</p><p ${P}><a href="https://app.blocksec.com/phalcon/compliance?utm_source=product_email&utm_content=welcome" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">Analizar ahora →</a></p><p ${P}>¿Tiene alguna pregunta? Puede ponerse en contacto conmigo directamente. También puede unirse a nuestra comunidad de Telegram, <a href="https://t.me/BlockSecTeam" target="_blank" style="color:#2563EB;text-decoration:none;">@BlockSecTeam</a>.</p><p ${P}>Saludos,<br/>Ruby<br/>COO @BlockSec</p>` },
      ja: { title: '【BlockSec】オンチェーン・コンプライアンス・アカウント有効化のお知らせ', body: `<p ${P}>PhalconComplianceへようこそ 🎉</p><p ${P}>BlockSecのRubyです。アカウントの有効化が完了しました。</p><p ${P}>Phalcon Complianceは、暗号資産のコンプライアンスを自動化するソリューションです。<strong>KYT/KYAスクリーニング</strong>により、不正資金の遮断、リスク評価、規制対応を効率化します。</p><p ${P}><strong>まずは無料でお試しください：</strong> 新規ユーザーの皆様には、<strong>毎月3回まで無料スクリーニング</strong>をご用意しています。入金審査などの実際の業務フローでその精度をぜひご確認ください。</p><p ${P}><a href="https://app.blocksec.com/phalcon/compliance?utm_source=product_email&utm_content=welcome" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">無料で始める →</a></p><p ${P}>ご不明な点がありましたら、本メールへの返信またはTelegram / WhatsAppにてお気軽にお問い合わせください。</p><p ${P}>BlockSec COO<br/>Ruby</p>` }
    }
  },
  '48h_no_scan': {
    name: '48h — No First Scan', template_id: 'ruby_sales',
    subject: 'Need help setting up on Phalcon Compliance?',
    audience: 'New Phalcon Compliance free users', trigger: '48h after sign-up, no first scan',
    content: {
      en: { title: 'Need help setting up on Phalcon Compliance?', body: `<p ${P}>Hi there,</p><p ${P}>Your Phalcon Compliance account is ready — you just haven't run your first screening yet.</p><p ${P}>You have 3 free screenings available this month. Pick one address or transaction you care about and check it now. It takes about 30 seconds.</p><p ${P}><a href="https://app.blocksec.com/phalcon/compliance?utm_source=product_email&utm_content=48h_no_scan" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">Screen Now →</a></p><p ${P}>On-chain risk can change quickly. In seconds, you'll know whether it's linked to known risks — and why.</p><p ${P}>If you need help getting started, just reply — happy to help. Or join our Telegram: <a href="https://t.me/BlockSecTeam" target="_blank" style="color:#2563EB;text-decoration:none;">@BlockSecTeam</a></p><p ${P}>All the best,<br/>Ruby</p>` }
    }
  },
  '72h_post_scan': {
    name: '72h — After First Scan', template_id: 'ruby_sales',
    subject: 'Check again — risk may have changed',
    audience: 'New Phalcon Compliance free users', trigger: '72h after first scan',
    content: {
      en: { title: 'Check again — risk may have changed', body: `<p ${P}>Hi,</p><p ${P}>I noticed you recently completed your first screening on Phalcon Compliance.</p><p ${P}>On-chain risk can change over time. If you're checking addresses, transactions, or counterparties repeatedly, ongoing monitoring can help you stay updated without re-screening manually.</p><p ${P}><a href="https://app.blocksec.com/phalcon/compliance?utm_source=product_email&utm_content=72h_post_scan" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">Explore monitoring →</a></p><p ${P}>Reply here or ping me on Telegram if you'd like the simplest setup.</p><p ${P}>Best,<br/>Ruby</p>` }
    }
  },
  'crime_report_kyt': {
    name: 'Crime Report — KYT Promo', template_id: 'ruby_kyt',
    subject: 'A few tools that might be useful for your team',
    audience: 'Crime report downloaders (crypto businesses)', trigger: 'Downloaded BlockSec 2026 Crypto Crime Report',
    content: {
      en: { title: 'A few tools that might be useful for your team', body: `<p ${P}>Hi there,</p><p ${P}>Hope you find our BlockSec 2026 Crypto Crime Report useful. Beyond the report, we have a few KYT solutions that might be relevant:</p><p ${P}><strong>Phalcon Compliance</strong> — a real-time KYT and AML compliance platform that helps crypto businesses detect illicit transactions, assess risk, and meet regulatory requirements.<br/><a href="https://app.blocksec.com/phalcon/compliance?utm_source=product_email&utm_content=crime_report_kyt" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">Start for Free →</a></p><p ${P}><strong>MetaSleuth</strong> — an on-chain investigation tool for analysts and law enforcement to trace complex fund flows and map transaction networks.<br/><a href="https://metasleuth.io/?utm_source=product_email&utm_content=crime_report_kyt" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">Try MetaSleuth →</a></p><p ${P}>If any of this resonates, feel free to reach out.</p><p ${P}>All the best,<br/>Ruby</p>` }
    }
  },
  'crime_report_network': {
    name: 'Crime Report — Network (ZH)', template_id: 'ruby_kyt',
    subject: 'Phalcon Network — 专为执法与监管机构',
    audience: 'Law enforcement & regulators', trigger: 'Downloaded BlockSec 2026 Crypto Crime Report',
    content: {
      zh: { title: '【BlockSec 2026】Phalcon Network 现已上线——专为执法与监管机构打造', body: `<p ${P}>您好，</p><p ${P}>希望《BlockSec 2026 加密犯罪报告》对您的工作有所裨益。除报告外，我有一项与您工作可能高度相关的信息想与您分享——我们近期正式推出了 Phalcon Network，这是一个面向执法机构、调查人员和监管机构的公众情报网络，旨在帮助各方在非法资金转移消失之前及时响应和行动。</p><p ${P}>加入 Phalcon Network，您可以：<br/>· 标记与诈骗、黑客攻击、金融犯罪相关的非法资金来源<br/>· 实时监控资金动向，追踪跨链洗钱路径<br/>· 在资金被取走前通知相关平台，从而实现更快速的协调干预</p><p ${P}><a href="https://blocksec.com/phalcon/network?utm_source=product_email&utm_content=crime_report_network" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">立即加入网络 →</a></p><p ${P}>如果您认为这与您的工作方向契合，我们诚挚邀请您加入该网络。</p><p ${P}>期待与您进一步沟通。</p><p ${P}>Ruby Xu ｜ COO @BlockSec</p>` }
    }
  },
  '14d_inactive': {
    name: '14d Inactive — Re-engage', template_id: 'jenna_marketing',
    subject: 'Still need compliance checks? Get clear risk signals in under a minute',
    audience: 'Inactive Phalcon Compliance users (2+ weeks)', trigger: '14+ days since last scan',
    content: {
      en: { title: 'Still need compliance checks? Get clear risk signals in under a minute', body: `<p ${P}>Hi,</p><p ${P}>It's been over 2 weeks since your last scan on Phalcon Compliance.</p><p ${P}>Need to check a wallet or transaction? You can run a new screen in under a minute and instantly review the risk signals and evidence.</p><p ${P}><a href="https://app.blocksec.com/phalcon/compliance?utm_source=product_email&utm_content=14d_inactive" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">🔍 Run a Free Scan Now →</a></p><p ${P}>Not sure what to scan? Try:<br/>• An inbound deposit address<br/>• A counterparty wallet<br/>• A transaction hash under review</p><p ${P}>Your 3 free screens refresh every month — they're ready whenever you are.</p><p ${P}>Best,<br/>Jenna</p>` }
    }
  },
  'paid_renewal': {
    name: 'Paid User — Renewal', template_id: 'jenna_marketing',
    subject: 'Checking in: Phalcon Compliance & your feedback',
    audience: 'Phalcon Compliance paid users', trigger: 'Plan expiry approaching',
    content: {
      en: { title: 'Checking in: Phalcon Compliance & your feedback', body: `<p ${P}>Hope you're having a great week 😊</p><p ${P}>Just wanted to see how you're finding Phalcon Compliance so far. Any favorite features or areas where we could improve?</p><p ${P}>A quick heads-up: your plan expires on <strong>{{expiry_date}}</strong>. You can <a href="{{renew_url}}" target="_blank" style="color:#ff8700;text-decoration:underline;font-weight:600;">Renew here →</a> to keep everything running smoothly.</p><p ${P}>Also, if your compliance needs have evolved (new chains, deeper labeling, etc.), just let me know.</p><p ${P}>Best,<br/>Jenna</p>` }
    }
  }
};
