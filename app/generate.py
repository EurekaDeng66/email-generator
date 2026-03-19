"""API routes for email content generation."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .claude_client import generate_emails, regenerate_single_language, polish_cta_label
from .html_assembler import TEMPLATES

router = APIRouter(prefix="/api")


class GenerateRequest(BaseModel):
    template_id: str
    subject: str
    audience: str
    trigger: str
    instructions: str = ""
    cta_url: str = ""
    languages: list[str] | None = None


class RegenerateRequest(BaseModel):
    template_id: str
    subject: str
    audience: str
    trigger: str
    language: str
    existing_content: dict
    instructions: str = ""
    cta_url: str = ""


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
        result = generate_emails(
            template_id=req.template_id,
            subject=req.subject,
            audience=req.audience,
            trigger=req.trigger,
            instructions=req.instructions,
            cta_url=req.cta_url,
            languages=req.languages,
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
        )
        return result
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
