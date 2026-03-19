"""Claude API client for generating multi-language email content."""

import json
import os
import re
import concurrent.futures
from openai import OpenAI
from .html_assembler import TEMPLATES

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )
    return _client

SYSTEM_PROMPT = """You are a B2B email copywriter for BlockSec, a blockchain security company.
You write concise, professional, but warm sales/marketing emails for the crypto compliance industry.

## Output Format
Output ONLY valid JSON (no markdown fences, no extra text). Structure:
{
  "en": {"title": "email subject line", "body": "<p>...</p><p>...</p>"},
  "zh": {"title": "邮件标题", "body": "<p>...</p><p>...</p>"},
  "es": {"title": "asunto del correo", "body": "<p>...</p><p>...</p>"},
  "ja": {"title": "メール件名", "body": "<p>...</p><p>...</p>"}
}

## Title/Subject Rules
- Each language MUST have a UNIQUE, natively-written email subject line
- Do NOT copy the English subject verbatim into other languages — translate and adapt naturally
- The "Email topic/direction" in the user prompt describes the THEME, not the literal subject line to use
- Chinese: use natural business Chinese (可用【】brackets for emphasis)
- Japanese: use 【BlockSec】prefix convention for formal emails
- Spanish: use natural Spanish phrasing
- English: concise, action-oriented

## HTML Rules for Email Body
- Use ONLY inline-styled HTML compatible with email clients
- Paragraphs: <p style="margin:0 0 0.9em 0;">text</p>
- Bold: <strong>text</strong>
- CTA links (primary action): <a href="URL" target="_blank" style="color:#ff8700; text-decoration:underline; font-weight:600;">text →</a>
- Regular links (resources, docs, community): <a href="URL" target="_blank" style="color:#2563EB; text-decoration:none;">text</a>
- Line breaks: <br/>
- NO <div>, NO CSS classes, NO external styles, NO <style> blocks
- CTA buttons should be simple text links with the orange style, NOT button elements

## Senders & Sign-offs
Two senders are used. Match the sign-off to the sender:

**Ruby Xu (COO)** — ruby_sales / ruby_kyt templates
- Tone: warm, direct, personal. Signs off: "Cheers,<br/>Ruby" / "All the best,<br/>Ruby" / "Best,<br/>Ruby"
- ZH sign-off: "祝好，<br/>Ruby Xu ｜ COO @BlockSec"
- JA sign-off: "BlockSec COO<br/>Ruby"
- ES sign-off: "Saludos,<br/>Ruby<br/>COO @BlockSec"

**Jenna Cheng (Product Manager)** — jenna_marketing template
- Tone: helpful, product-focused, lighter. Signs off: "Best,<br/>Jenna" / "Thanks,<br/>Jenna"
- ZH sign-off: "Jenna" (简短)
- JA sign-off: "BlockSec PM<br/>Jenna"
- ES sign-off: "Un saludo,<br/>Jenna"

## Products & Messaging
- **Phalcon Compliance**: real-time KYT & AML compliance platform. Key value: detect illicit transactions, automate KYA/KYT screening, meet regulatory requirements, 20+ chains. Free users get 3 free scans/month.
- **MetaSleuth**: on-chain investigation tool for analysts and law enforcement. Traces complex fund flows, maps transaction networks.
- **Phalcon Network**: public intelligence network for law enforcement, investigators, regulators. Real-time fund movement monitoring, cross-chain laundering route tracking.
- Community: Telegram @BlockSecTeam
- Docs: User Guides | API Docs

## Content Rules
- Keep emails 3-6 short paragraphs
- End with the sign-off matching the sender. Do NOT include the signature card (name/title/contact info block) — that comes from the template
- For Chinese (zh): write in natural mainland Chinese, not translated-sounding. 可以用 emoji 但要克制（最多2个）
- For Japanese (ja): use appropriate keigo/polite business Japanese (です/ます体). Honorifics for recipients.
- For Spanish (es): use formal usted form. ¡Hola! / Saludos / Un cordial saludo.
- English (en): professional but approachable, not overly formal. First-person, conversational.
- Preserve template variables literally: {{expiry_date}}, {{renew_url}}, {{unsubscribe_url}}, {{Name}}, {{name}}, {{risk_type}}, {{cta}}

## Reference Examples

### Welcome email — Ruby, EN
Subject: Welcome to Phalcon Compliance — Quick Start
Great to see you join!
Phalcon Compliance is your intelligent crypto AML platform. We help you keep illicit funds away, automate KYA/KYT screening, and stay compliant with confidence.
To get started, screen one address or transaction you already care about. You have **3 free compliance checks this month**. Make them count — each one could be the scan that catches a risk before it costs you.
[Run a Compliance Check →]
Any questions? Feel free to contact me directly or join our Telegram community @BlockSecTeam for real-time support and updates.
Resources: User Guides | API Docs
Cheers,
Ruby / COO @BlockSec

### Welcome email — Ruby, ZH
欢迎加入 Phalcon Compliance 👋
Phalcon 帮你轻松搞定加密资产合规——自动化 KYT/KYA 筛查，隔离非法资金，让监管审核不再头疼。
无论你是审查钱包风险、监控资金流动，还是审核出入金地址，都能一站搞定。
我们为每位新朋友提供每月3次免费筛查，可以挑一个真实案例试试，比如入金审查或合规检查，看看能否帮你的日常合规更高效。
👉 [开始免费筛查]
有任何问题随时邮件或加微信，也欢迎来 Telegram 社区 @BlockSecTeam 一起交流。
相关资料：📄 [用户手册] | [API 文档]
祝好，
Ruby Xu ｜ COO @BlockSec

### Welcome email — Ruby, ES
Subject: Bienvenido a Phalcon Compliance: guía de inicio rápido
¡Nos alegra tenerle con nosotros!
Phalcon Compliance es su plataforma inteligente de AML para criptoactivos. Le ayudamos a mantener alejados los fondos ilícitos, automatizar los controles KYA/KYT y gestionar el cumplimiento con mayor seguridad.
Para empezar, analice una dirección o transacción que ya sea relevante para su equipo. Este mes tiene **3 verificaciones de compliance gratuitas**.
[Analizar ahora →]
¿Tiene alguna pregunta? Puede ponerse en contacto conmigo directamente. También puede unirse a nuestra comunidad de Telegram, @BlockSecTeam.
Saludos,
Ruby / COO @BlockSec

### Welcome email — Ruby, JA
Subject: 【BlockSec】オンチェーン・コンプライアンス・アカウント有効化のお知らせ
PhalconComplianceへようこそ 🎉
BlockSecのRubyです。アカウントの有効化が完了しました。
Phalcon Complianceは、暗号資産のコンプライアンスを自動化するソリューションです。**KYT/KYAスクリーニング**により、不正資金の遮断、リスク評価、規制対応を効率化します。
**まずは無料でお試しください：** 新規ユーザーの皆様には、**毎月3回まで無料スクリーニング**をご用意しています。入金審査などの実際の業務フローでその精度をぜひご確認ください。
[無料で始める]
ご不明な点がありましたら、本メールへの返信またはTelegram / WhatsAppにてお気軽にお問い合わせください。
BlockSec COO
Ruby

### 48h no first scan — Ruby, EN
Subject: Need help setting up on Phalcon Compliance?
Hi there,
Your Phalcon Compliance account is ready — you just haven't run your first screening yet.
You have 3 free screenings available this month. Pick one address or transaction you care about and check it now. It takes about 30 seconds.
[Screen Now →]
On-chain risk can change quickly. In seconds, you'll know whether it's linked to known risks — and why.
If you need help getting started, just reply — happy to help. Or join our Telegram Community: @BlockSecTeam
All the best,
Ruby / COO @BlockSec

### 72h after first scan — Ruby, EN
Subject: Check again — risk may have changed
Hi,
I noticed you recently completed your first screening on Phalcon Compliance.
On-chain risk can change over time. If you're checking addresses, transactions, or counterparties repeatedly, ongoing monitoring can help you stay updated without re-screening manually.
[Explore monitoring →]
Reply here or ping me on Telegram if you'd like the simplest setup.
Best,
Ruby / COO @BlockSec

### Crime report download — KYT promo (Ruby, EN)
Subject: A few tools that might be useful for your team
Hi there,
Hope you find our BlockSec 2026 Crypto Crime Report useful. Beyond the report, we have a few KYT solutions that might be relevant:
**Phalcon Compliance** — a real-time KYT and AML compliance platform that helps crypto businesses detect illicit transactions, assess risk, and meet regulatory requirements.
[Start for Free →]
**MetaSleuth** — an on-chain investigation tool for analysts and law enforcement to trace complex fund flows and map transaction networks.
[Try MetaSleuth →]
If any of this resonates, feel free to reach out.
All the best,
Ruby

### Crime report download — Network promo (Ruby, ZH)
Subject: 【BlockSec 2026】Phalcon Network 现已上线——专为执法与监管机构打造
您好，
希望《BlockSec 2026 加密犯罪报告》对您的工作有所裨益。除报告外，我有一项与您工作可能高度相关的信息想与您分享——我们近期正式推出了 Phalcon Network，这是一个面向执法机构、调查人员和监管机构的公众情报网络，旨在帮助各方在非法资金转移消失之前及时响应和行动。
加入 Phalcon Network，您可以：
· 标记与诈骗、黑客攻击、金融犯罪相关的非法资金来源
· 实时监控资金动向，追踪跨链洗钱路径
· 在资金被取走前通知相关平台，从而实现更快速的协调干预
[立即加入网络]
如果您认为这与您的工作方向契合，我们诚挚邀请您加入该网络。
期待与您进一步沟通。
Ruby Xu ｜ COO @BlockSec

### 14 days inactive — Jenna, EN
Subject: Still need compliance checks? Get clear risk signals in under a minute
Hi,
It's been over 2 weeks since your last scan on Phalcon Compliance.
Need to check a wallet or transaction? You can run a new screen in under a minute and instantly review the risk signals and evidence.
🔍 [Run a Free Scan Now →]
Not sure what to scan? Try:
• An inbound deposit address
• A counterparty wallet
• A transaction hash under review
Your 3 free screens refresh every month — they're ready whenever you are.
Best,
Jenna / Product Manager | BlockSec

### Paid user renewal — Jenna, EN
Subject: Checking in: Phalcon Compliance & your feedback
Hope you're having a great week 😊
Just wanted to see how you're finding Phalcon Compliance so far. Any favorite features or areas where we could improve?
A quick heads-up: your plan expires on **{{expiry_date}}**. You can **[Renew here]** to keep everything running smoothly.
Also, if your compliance needs have evolved (new chains, deeper labeling, etc.), just let me know.
Best,
Jenna / Product Manager | BlockSec
"""


def _clean_json_response(text: str) -> str:
    """Strip markdown fences if Claude wraps the JSON."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _generate_one_language(
    lang: str,
    template_id: str,
    subject: str,
    audience: str,
    trigger: str,
    instructions: str,
    cta_url: str,
) -> tuple[str, dict]:
    """Generate email content for a single language. Returns (lang, content_dict)."""
    meta = TEMPLATES[template_id]
    sender = meta["sender"]
    has_unsub = meta["has_unsubscribe"]

    cta_instruction = (
        f"Primary CTA URL: {cta_url}\n"
        f"Include a CTA link using this exact URL with appropriate button text in {lang}. "
        f"Style it with the orange link style from the HTML rules."
    ) if cta_url else "No specific CTA URL provided — include a relevant CTA if appropriate."

    user_prompt = f"""Generate email content for the following:

Template: {meta['name']}
Sender: {sender}
Email topic/direction (创作方向, NOT the literal subject — generate a unique native subject): {subject}
Target audience: {audience}
Trigger/timing context: {trigger}
Has unsubscribe link: {"Yes (preserve {{{{unsubscribe_url}}}} in footer area)" if has_unsub else "No"}
CTA: {cta_instruction}
Additional instructions: {instructions or "None"}
Language to generate: {lang}

Output JSON with ONLY the "{lang}" key:
{{"{lang}": {{"title": "...", "body": "<p>...</p>"}}}}"""

    model = os.getenv("MODEL", "anthropic/claude-sonnet-4-5")
    response = _get_client().chat.completions.create(
        model=model,
        max_tokens=1500,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw = response.choices[0].message.content
    cleaned = _clean_json_response(raw)
    data = json.loads(cleaned)
    # Accept both {lang: {...}} and bare {...} responses
    content = data.get(lang, data)
    return lang, content


def generate_emails(
    template_id: str,
    subject: str,
    audience: str,
    trigger: str,
    instructions: str = "",
    languages: list[str] | None = None,
    cta_url: str = "",
) -> dict:
    """Generate multi-language email content in parallel using Claude API."""
    if languages is None:
        languages = ["en", "zh", "es", "ja"]

    result = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(languages)) as executor:
        futures = {
            executor.submit(
                _generate_one_language,
                lang, template_id, subject, audience, trigger, instructions, cta_url,
            ): lang
            for lang in languages
        }
        for future in concurrent.futures.as_completed(futures):
            lang, content = future.result()
            result[lang] = content

    return result


def regenerate_single_language(
    template_id: str,
    subject: str,
    audience: str,
    trigger: str,
    language: str,
    existing_content: dict,
    instructions: str = "",
    cta_url: str = "",
    scope: str = "both",
) -> dict:
    """Regenerate content for a single language, using others as context.

    scope: 'both' | 'title_only' | 'body_only'
    """
    meta = TEMPLATES[template_id]
    sender = meta["sender"]

    current = existing_content.get(language, {})
    existing_title = current.get("title", "")
    existing_body  = current.get("body", "")

    context_parts = []
    for lang, content in existing_content.items():
        if lang != language:
            context_parts.append(
                f"[{lang}] Title: {content.get('title', '')}\n"
                f"Body: {content.get('body', '')}"
            )
    context_str = "\n\n".join(context_parts)

    cta_instruction = (
        f"Primary CTA URL: {cta_url}\n"
        f"Include a CTA link using this exact URL with appropriate button text in {language}. "
        f"Style it with the orange link style."
    ) if cta_url else "No specific CTA URL."

    if scope == "title_only":
        task = (
            f"Regenerate ONLY the subject/title line for the {language} version.\n"
            f"Keep the body EXACTLY as-is — do NOT modify it.\n"
            f"Current body (preserve verbatim): {existing_body}"
        )
        output_hint = f'{{"{language}": {{"title": "...", "body": {json.dumps(existing_body)}}}}}'
    elif scope == "body_only":
        task = (
            f"Regenerate ONLY the email body for the {language} version.\n"
            f"Keep the subject/title EXACTLY as-is — do NOT modify it.\n"
            f"Current title (preserve verbatim): {existing_title}"
        )
        output_hint = f'{{"{language}": {{"title": {json.dumps(existing_title)}, "body": "<p>...</p>"}}}}'
    else:
        task = f"Regenerate BOTH the subject/title and body for the {language} version."
        output_hint = f'{{"{language}": {{"title": "...", "body": "<p>...</p>"}}}}'

    user_prompt = f"""{task}

Template: {meta['name']}
Sender: {sender}
Email topic/direction (创作方向, NOT the literal subject): {subject}
Target audience: {audience}
Trigger/timing: {trigger}
CTA: {cta_instruction}
Additional instructions: {instructions or "None"}

The other language versions (for reference/consistency):
{context_str}

Output JSON with only the "{language}" key:
{output_hint}"""

    model = os.getenv("MODEL", "anthropic/claude-sonnet-4-5")
    response = _get_client().chat.completions.create(
        model=model,
        max_tokens=2048,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw = response.choices[0].message.content
    cleaned = _clean_json_response(raw)
    return json.loads(cleaned)


def parse_intent(description: str) -> dict:
    """Parse a natural language campaign description into structured email config fields."""
    system = """You are a campaign configuration assistant for BlockSec email marketing.
Extract the campaign intent from the user's description and return ONLY valid JSON with these exact keys:
{
  "template_id": "ruby_sales|ruby_kyt|jenna_marketing",
  "subject": "...",
  "audience": "...",
  "trigger": "...",
  "instructions": "...",
  "cta_destination": "...",
  "cta_label": "...",
  "utm_content": "...",
  "clarification": null
}

Rules:
- template_id: ruby_sales = Ruby personal outreach/sales; ruby_kyt = Ruby KYT/compliance product focus; jenna_marketing = Jenna re-engagement/marketing
- subject: describe the email direction in Chinese (theme, not a literal subject line)
- audience: target recipients in Chinese
- trigger: send timing/trigger context in Chinese
- instructions: any tone/style/content notes mentioned
- cta_destination: pick the best matching URL or empty string:
    https://app.blocksec.com/phalcon/compliance
    https://blocksec.com/phalcon/network
    https://metasleuth.io/
    https://blocksec.com
- cta_label: CTA button text if mentioned, otherwise empty string
- utm_content: short snake_case identifier e.g. welcome, crime_report_kyt, 14d_inactive
- clarification: If the description is too vague to fill "audience" OR "trigger" reliably, set this to:
    {"question": "<one short Chinese question about the most important missing info>", "options": ["<option1>", "<option2>", "<option3>", "<option4>"]}
    Options should be concrete, mutually-exclusive choices in Chinese (max 4).
    If description is sufficient, set clarification to null.
    Only ask ONE clarification question at a time — the most critical missing piece.
Return ONLY the JSON object, no other text."""

    model = os.getenv("MODEL", "anthropic/claude-sonnet-4-5")
    response = _get_client().chat.completions.create(
        model=model,
        max_tokens=500,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": description},
        ],
    )
    raw = response.choices[0].message.content
    cleaned = _clean_json_response(raw)
    return json.loads(cleaned)


def polish_cta_label(label: str) -> str:
    """Polish a CTA button label — make it concise, action-oriented, and marketing-ready."""
    model = os.getenv("MODEL", "anthropic/claude-sonnet-4-5")
    response = _get_client().chat.completions.create(
        model=model,
        max_tokens=100,
        messages=[
            {"role": "system", "content": (
                "You are a B2B SaaS email copywriter. "
                "The user gives you a draft CTA button label. "
                "Return ONLY the polished label text — concise, action-oriented, "
                "compelling for crypto/compliance audience. "
                "Keep it under 6 words. No quotes, no explanation."
            )},
            {"role": "user", "content": label},
        ],
    )
    return response.choices[0].message.content.strip().strip('"\'')
