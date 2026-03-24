"""API routes for email content generation."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .claude_client import generate_emails, regenerate_single_language, polish_cta_label, parse_intent, translate_from_language, smart_regenerate
from .html_assembler import TEMPLATES
from .store import read_store


def _build_historical_context(template_id: str, audience: str) -> str:
    """Aggregate campaign metrics from store into a prompt-ready context string."""
    metrics = read_store("blocksec_campaign_metrics")
    if not metrics:
        return ""

    lines = []

    # Per-template aggregate stats
    by_template: dict = {}
    for m in metrics:
        tid = m.get("template_id", "")
        if not tid:
            continue
        if tid not in by_template:
            by_template[tid] = {"n": 0, "lang_opens": {}, "lang_clicks": {}}
        by_template[tid]["n"] += 1
        for lang, stats in m.get("metrics", {}).items():
            if "open_rate" in stats:
                by_template[tid]["lang_opens"].setdefault(lang, []).append(stats["open_rate"])
            if "click_rate" in stats:
                by_template[tid]["lang_clicks"].setdefault(lang, []).append(stats["click_rate"])

    if template_id in by_template:
        t = by_template[template_id]
        lang_parts = []
        for lang in ("zh", "en", "es", "ja"):
            opens = t["lang_opens"].get(lang, [])
            clicks = t["lang_clicks"].get(lang, [])
            if opens:
                avg_o = sum(opens) / len(opens)
                avg_c = sum(clicks) / len(clicks) if clicks else 0
                lang_parts.append(f"{lang.upper()} open={avg_o:.0%} click={avg_c:.0%}")
        if lang_parts:
            lines.append(f"- {template_id} ({t['n']} campaigns): {' | '.join(lang_parts)}")

    # Audience-overlapping campaigns from other templates
    if audience:
        kw = audience[:15].lower()
        for m in metrics:
            if m.get("template_id") == template_id:
                continue
            if kw in m.get("audience", "").lower():
                for lang, stats in m.get("metrics", {}).items():
                    if "click_rate" in stats:
                        lines.append(
                            f"- Similar audience ({m.get('template_id')}, {lang.upper()}): "
                            f"click={stats['click_rate']:.0%}"
                        )
                break  # one example is enough

    return "\n".join(lines)


def _build_all_metrics_summary() -> str:
    """Brief overall metrics summary for parse_intent (no template/audience filter)."""
    metrics = read_store("blocksec_campaign_metrics")
    if not metrics:
        return ""

    by_template: dict = {}
    for m in metrics:
        tid = m.get("template_id", "")
        if not tid:
            continue
        by_template.setdefault(tid, [])
        for lang, stats in m.get("metrics", {}).items():
            if "click_rate" in stats:
                by_template[tid].append((lang, stats["click_rate"]))

    lines = []
    for tid, pairs in by_template.items():
        if pairs:
            best_lang, best_rate = max(pairs, key=lambda x: x[1])
            lines.append(f"- {tid}: best lang={best_lang.upper()} click={best_rate:.0%} (from {len(pairs)} data points)")
    return "\n".join(lines)

router = APIRouter(prefix="/api")


class GenerateRequest(BaseModel):
    template_id: str
    subject: str
    audience: str
    trigger: str
    instructions: str = ""
    cta_url: str = ""
    languages: list[str] | None = None
    variables: str = ""


class RegenerateRequest(BaseModel):
    template_id: str
    subject: str
    audience: str
    trigger: str
    language: str
    existing_content: dict
    instructions: str = ""
    cta_url: str = ""
    scope: str = "both"  # 'both' | 'title_only' | 'body_only'
    variables: str = ""


@router.get("/templates")
def list_templates():
    """Return available email templates."""
    return {
        tid: {"name": meta["name"], "sender": meta["sender"], "has_unsubscribe": meta["has_unsubscribe"]}
        for tid, meta in TEMPLATES.items()
    }


@router.post("/generate")
def generate(req: GenerateRequest):
    """Generate email content for all 4 languages."""
    if req.template_id not in TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown template: {req.template_id}")
    try:
        historical_context = _build_historical_context(req.template_id, req.audience)
        result = generate_emails(
            template_id=req.template_id,
            subject=req.subject,
            audience=req.audience,
            trigger=req.trigger,
            instructions=req.instructions,
            cta_url=req.cta_url,
            languages=req.languages,
            historical_context=historical_context,
            variables=req.variables,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regenerate")
def regenerate(req: RegenerateRequest):
    """Regenerate content for a single language."""
    if req.template_id not in TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown template: {req.template_id}")
    if req.language not in ("en", "zh", "es", "ja"):
        raise HTTPException(status_code=400, detail=f"Invalid language: {req.language}")
    try:
        result = regenerate_single_language(
            template_id=req.template_id,
            subject=req.subject,
            audience=req.audience,
            trigger=req.trigger,
            language=req.language,
            existing_content=req.existing_content,
            instructions=req.instructions,
            cta_url=req.cta_url,
            scope=req.scope,
            variables=req.variables,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SmartRegenRequest(BaseModel):
    template_id: str
    subject: str
    audience: str
    trigger: str
    existing_content: dict
    instructions: str
    cta_url: str = ""
    variables: str = ""


@router.post("/smart_regen")
def smart_regen(req: SmartRegenRequest):
    if req.template_id not in TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown template: {req.template_id}")
    try:
        result = smart_regenerate(
            template_id=req.template_id,
            subject=req.subject,
            audience=req.audience,
            trigger=req.trigger,
            existing_content=req.existing_content,
            instructions=req.instructions,
            cta_url=req.cta_url,
            variables=req.variables,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ParseIntentRequest(BaseModel):
    description: str


@router.post("/parse_intent")
def parse_intent_endpoint(req: ParseIntentRequest):
    """Parse natural language campaign description into structured fields."""
    if not req.description.strip():
        raise HTTPException(status_code=400, detail="Description is empty")
    try:
        historical_context = _build_all_metrics_summary()
        return parse_intent(req.description.strip(), historical_context=historical_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PolishCtaRequest(BaseModel):
    label: str


@router.post("/polish_cta")
def polish_cta(req: PolishCtaRequest):
    """Polish a CTA button label using AI."""
    if not req.label.strip():
        raise HTTPException(status_code=400, detail="Label is empty")
    try:
        polished = polish_cta_label(req.label.strip())
        return {"polished": polished}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TranslateFromRequest(BaseModel):
    template_id: str
    source_lang: str
    source_title: str
    source_body: str
    target_langs: list[str]
    subject: str = ""
    audience: str = ""


@router.post("/translate_from")
def translate_from(req: TranslateFromRequest):
    """Translate source language email content into multiple target languages."""
    if req.template_id not in TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown template: {req.template_id}")
    valid_langs = {"en", "zh", "es", "ja"}
    if req.source_lang not in valid_langs:
        raise HTTPException(status_code=400, detail=f"Invalid source_lang: {req.source_lang}")
    invalid = [l for l in req.target_langs if l not in valid_langs]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid target_langs: {invalid}")
    if not req.source_body.strip():
        raise HTTPException(status_code=400, detail="source_body is empty")
    try:
        return translate_from_language(
            template_id=req.template_id,
            source_lang=req.source_lang,
            source_title=req.source_title,
            source_body=req.source_body,
            target_langs=req.target_langs,
            subject=req.subject,
            audience=req.audience,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
