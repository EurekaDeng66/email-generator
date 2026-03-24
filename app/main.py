"""FastAPI application entry point."""

import os
import secrets
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

load_dotenv()

app = FastAPI(title="BlockSec Email Generator")
security = HTTPBasic()


def verify_auth(credentials: HTTPBasicCredentials = Depends(security)):
    """Simple HTTP Basic Auth for protecting this internal tool."""
    expected_user = os.getenv("AUTH_USER", "blocksec")
    expected_pass = os.getenv("AUTH_PASS", "")
    if not expected_pass:
        # No password configured = no auth required (local dev)
        return
    correct_user = secrets.compare_digest(credentials.username, expected_user)
    correct_pass = secrets.compare_digest(credentials.password, expected_pass)
    if not (correct_user and correct_pass):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )


# Import and include API routers
from .generate import router as generate_router
from .assemble import router as assemble_router
from .store import router as store_router
from .gmail import router as gmail_router

app.include_router(generate_router, dependencies=[Depends(verify_auth)])
app.include_router(assemble_router, dependencies=[Depends(verify_auth)])
app.include_router(store_router, dependencies=[Depends(verify_auth)])
app.include_router(gmail_router, dependencies=[Depends(verify_auth)])

# Serve static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", dependencies=[Depends(verify_auth)])
async def index():
    """Serve the main UI page."""
    return FileResponse(os.path.join(static_dir, "index.html"))
