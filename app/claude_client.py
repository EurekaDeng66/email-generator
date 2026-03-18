"""Claude API client for generating multi-language email content."""

import json
import re
import anthropic
from .html_assembler import TEMPLATES

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

## HTML Rules for Email Body
- Use ONLY inline-styled HTML compatible with email clients
- Paragraphs: <p style="margin:0 0 0.9em 0;">text</p>
- Bold: <strong>text</strong>
- Links: <a href="URL" target="_blank" style="color:#ff8700; text-decoration:underline; font-weight:600;">text</a>
- Regular links (resources, community): <a href="URL" target="_blank" style="color:#2563EB; text-decoration:none;">text</a>
- Line breaks: <br/>
- NO <div>, NO CSS classes, NO external styles, NO <style> blocks
- CTA buttons should be simple text links with the orange style, NOT button elements

## Content Rules
- Keep emails 3-6 short paragraphs
- End with a casual sign-off matching the sender (e.g., "All the best,<br/>Ruby" or "Best,<br/>Jenna")
- Do NOT include the signature card (name/title/contact info block) — that comes from the template
- For Chinese (zh): write in natural mainland Chinese, not translated-sounding. 可以用 emoji 但要克制
- For Japanese (ja): use appropriate keigo/polite business Japanese (です/ます体)
- For Spanish (es): use formal usted form
- English (en): professional but approachable, not overly formal
- Preserve any template variables literally: {{expiry_date}}, {{renew_url}}, {{unsubscribe_url}}, {{Name}}, {{name}}
- Include relevant UTM parameters in links: utm_source=product_email&utm_content={context}

## Reference Examples (maintain this tone and style)

### Example 1: Welcome email (Ruby, EN)
Great to see you join!
Phalcon Compliance is your intelligent crypto AML platform. We help you keep illicit funds away, automate KYA/KYT screening, and stay compliant with confidence.
To get started, screen one address or transaction you already care about. You have 3 free risk screenings per month.
Run a Compliance Check →

### Example 2: Welcome email (Ruby, ZH)
欢迎加入 Phalcon Compliance 👋
Phalcon 帮你轻松搞定加密资产合规——自动化 KYT/KYA 筛查，隔离非法资金，让监管审核不再头疼。
我们为每位新朋友提供每月3次免费筛查，可以挑一个真实案例试试。
👉 开始免费筛查

### Example 3: 72h inactive (Ruby, EN)
I noticed you recently completed your first screening on Phalcon Compliance.
On-chain risk can change over time. If you're checking addresses, transactions, or counterparties repeatedly, ongoing monitoring can help you stay updated without re-screening manually.
"""


def _clean_json_response(text: str) -> str:
    """Strip markdown fences if Claude wraps the JSON."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def generate_emails(
    template_id: str,
    subject: str,
    audience: str,
    trigger: str,
    instructions: str = "",
    languages: list[str] | None = None,
) -> dict:
    """Generate multi-language email content using Claude API."""
    if languages is None:
        languages = ["en", "zh", "es", "ja"]

    meta = TEMPLATES[template_id]
    sender = meta["sender"]
    has_unsub = meta["has_unsubscribe"]

    user_prompt = f"""Generate email content for the following:

Template: {meta['name']}
Sender: {sender}
Email theme/subject: {subject}
Target audience: {audience}
Trigger/timing context: {trigger}
Has unsubscribe link: {"Yes (preserve {{{{unsubscribe_url}}}} in footer area)" if has_unsub else "No"}
Additional instructions: {instructions or "None"}
Languages to generate: {', '.join(languages)}

Generate the email content now. Output JSON only."""

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = response.content[0].text
    cleaned = _clean_json_response(raw)
    return json.loads(cleaned)


def regenerate_single_language(
    template_id: str,
    subject: str,
    audience: str,
    trigger: str,
    language: str,
    existing_content: dict,
    instructions: str = "",
) -> dict:
    """Regenerate content for a single language, using others as context."""
    meta = TEMPLATES[template_id]
    sender = meta["sender"]

    context_parts = []
    for lang, content in existing_content.items():
        if lang != language:
            context_parts.append(
                f"[{lang}] Title: {content.get('title', '')}\n"
                f"Body: {content.get('body', '')}"
            )
    context_str = "\n\n".join(context_parts)

    user_prompt = f"""Regenerate ONLY the {language} version of this email.

Template: {meta['name']}
Sender: {sender}
Email theme/subject: {subject}
Target audience: {audience}
Trigger/timing: {trigger}
Additional instructions: {instructions or "None"}

The other language versions (for reference/consistency):
{context_str}

Output JSON with only the "{language}" key:
{{"{language}": {{"title": "...", "body": "<p>...</p>"}}}}"""

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = response.content[0].text
    cleaned = _clean_json_response(raw)
    return json.loads(cleaned)
