"""API route for HTML template assembly."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .html_assembler import assemble_email, TEMPLATES

router = APIRouter(prefix="/api")


class AssembleRequest(BaseModel):
    template_id: str
    body_html: str
    language: str = "en"


@router.post("/assemble")
def assemble(req: AssembleRequest):
    """Assemble full email HTML by injecting body into template."""
    if req.template_id not in TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unknown template: {req.template_id}")
    if req.language not in ("en", "zh", "es", "ja"):
        raise HTTPException(status_code=400, detail=f"Invalid language: {req.language}")
    try:
        html = assemble_email(
            template_id=req.template_id,
            body_html=req.body_html,
            language=req.language,
        )
        return {"html": html}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
