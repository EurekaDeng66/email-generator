"""Gmail draft creation API."""

import os
import base64
import email.mime.multipart
import email.mime.text
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

router = APIRouter(prefix="/api/gmail")


class DraftRequest(BaseModel):
    to: str        # recipient(s), comma-separated; may be empty
    subject: str   # email subject
    html: str      # fully assembled HTML
    language: str  # en/zh/es/ja (for logging only)


@router.post("/draft")
def create_draft(req: DraftRequest):
    """Save email content as a Gmail draft."""
    client_id     = os.getenv("GMAIL_CLIENT_ID")
    client_secret = os.getenv("GMAIL_CLIENT_SECRET")
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN")
    if not all([client_id, client_secret, refresh_token]):
        raise HTTPException(status_code=503, detail="Gmail credentials not configured")
    try:
        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
        )
        service = build("gmail", "v1", credentials=creds)
        msg = email.mime.multipart.MIMEMultipart("alternative")
        msg["To"] = req.to
        msg["Subject"] = req.subject
        msg.attach(email.mime.text.MIMEText(req.html, "html"))
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        draft = service.users().drafts().create(
            userId="me", body={"message": {"raw": raw}}
        ).execute()
        draft_id = draft["id"]
        return {
            "draft_id": draft_id,
            "link": f"https://mail.google.com/mail/#drafts/{draft_id}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
