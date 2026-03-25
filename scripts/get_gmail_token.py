"""
一次性运行，获取 Gmail OAuth refresh_token。
运行前确保 credentials.json 在当前目录或项目根目录。

用法：
  cd /Users/eureka266/email-generator
  pip install google-auth-oauthlib
  python scripts/get_gmail_token.py
"""

import json
import os
import sys

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    print("请先安装：pip install google-auth-oauthlib")
    sys.exit(1)

SCOPES = ["https://www.googleapis.com/auth/gmail.compose"]

# 查找 credentials.json
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
cred_path = os.path.join(project_root, "credentials.json")

if not os.path.exists(cred_path):
    print(f"找不到 credentials.json，请把它放到：{cred_path}")
    sys.exit(1)

flow = InstalledAppFlow.from_client_secrets_file(cred_path, scopes=SCOPES)
creds = flow.run_local_server(port=0)

with open(cred_path) as f:
    client_info = json.load(f)

installed = client_info.get("installed") or client_info.get("web") or {}

print("\n" + "="*60)
print("✓ 认证成功！请将以下值设置为 Railway 环境变量：")
print("="*60)
print(f"GMAIL_CLIENT_ID     = {installed.get('client_id', '')}")
print(f"GMAIL_CLIENT_SECRET = {installed.get('client_secret', '')}")
print(f"GMAIL_REFRESH_TOKEN = {creds.refresh_token}")
print("="*60)
print("\n⚠️  请妥善保存 refresh_token，此窗口关闭后不会再显示。")
