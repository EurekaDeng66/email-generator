"""HTML template parsing and body content injection."""

import os
from bs4 import BeautifulSoup

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")

# Font families per language
FONT_FAMILIES = {
    "en": "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    "zh": "'Microsoft YaHei UI','微软雅黑','PingFang SC',Helvetica,Arial,sans-serif",
    "es": "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    "ja": "'Yu Gothic','Meiryo','Microsoft YaHei UI',Helvetica,Arial,sans-serif",
}

# Template metadata
TEMPLATES = {
    "ruby_sales": {
        "name": "Ruby Sales (售前/Free Users)",
        "file": "ruby_sales.html",
        "sender": "Ruby Xu, COO",
        "has_unsubscribe": False,
    },
    "ruby_kyt": {
        "name": "Ruby KYT Follow-up (Crime Report)",
        "file": "ruby_kyt.html",
        "sender": "Ruby Xu, COO",
        "has_unsubscribe": False,
    },
    "jenna_marketing": {
        "name": "Jenna Marketing (售后/Paid Users)",
        "file": "jenna_marketing.html",
        "sender": "Jenna Cheng, PM",
        "has_unsubscribe": True,
    },
}


def load_template(template_id: str) -> str:
    """Load raw HTML template from disk."""
    meta = TEMPLATES[template_id]
    path = os.path.join(TEMPLATES_DIR, meta["file"])
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def assemble_email(template_id: str, body_html: str, language: str = "en") -> str:
    """Inject body_html into template, preserving signature/footer/unsubscribe.

    Finds the body content <div> (identified by line-height:1.8 in style)
    and replaces its contents with the provided body_html.
    """
    template_html = load_template(template_id)
    soup = BeautifulSoup(template_html, "html.parser")

    # Find the body content div - unique identifier is line-height:1.8
    body_div = soup.find("div", style=lambda s: s and "line-height:1.8" in s)
    if not body_div:
        raise ValueError(f"Could not find body content div in template {template_id}")

    # Update font-family for the target language
    font_family = FONT_FAMILIES.get(language, FONT_FAMILIES["en"])
    current_style = body_div.get("style", "")
    # Replace the font-family portion in the style
    import re
    current_style = re.sub(
        r"font-family:[^;]+;",
        f"font-family:{font_family};",
        current_style,
    )
    body_div["style"] = current_style

    # Clear existing body content and inject new content
    body_div.clear()
    new_content = BeautifulSoup(body_html, "html.parser")
    body_div.append(new_content)

    return str(soup)
