# BlockSec Email Generator

BlockSec 内部邮件内容生成工具，支持 AI 辅助撰写、4 语言并发生成、HTML 模版组装，全流程覆盖从意图输入到可发送 HTML 的闭环。

---

## 核心工作流

### Step 1 — 描述要发的邮件

用自然语言告诉 AI 你要发什么：

- **发送内容**：邮件主题方向（如「给下载了犯罪报告的用户推 KYT 产品」）
- **发送对象**：目标收件人（如「交易所合规团队」）
- **发送时机**：触发场景（如「下载报告后 24 小时内」）

点击 **✦ AI 解析并填写** 自动识别并填充表单，或点击「手动填写 →」直接输入。

可选配置：CTA 按钮 URL + UTM 参数、个性化变量（如 `{{name}}`）、补充指令。

---

### Step 2 — 邮件内容生成、调试与审阅

点击 **✦ 生成邮件内容** 并发生成中英西日 4 种语言初稿。

每种语言独立支持：

- **↺ 重新生成标题** / **↻ 重新生成正文** — 单独刷新不满意的部分
- **修改意见输入框 + ↻ 按钮** — 填写修改意见后重新生成整封邮件
- **→ 同步翻译** — 以当前语言为基准，一键翻译到其他语言

内容满意后点击「○ 标记已审阅」。

---

### Step 3 — HTML 模版生成（可选）

点击 **⬆ 生成 HTML** 将当前内容组装进品牌邮件模版（含 header / footer / 签名）。

- **预览邮件** — 内嵌 iframe 支持桌面/移动端切换预览
- **复制 HTML** — 一键复制可直接粘贴到邮件发送平台
- **保存为模版** — 存入模版库供后续复用；从已有模版编辑后变为「更新模版」

---

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | FastAPI + Python，部署于 Railway |
| AI | OpenRouter（Claude Sonnet via OpenAI-compatible API）|
| 前端 | 原生 HTML/CSS/JS + Quill 富文本编辑器 |
| 存储 | Railway Volume（SQLite JSON 文件，多人共享） |
| 认证 | HTTP Basic Auth（`AUTH_USER` / `AUTH_PASS` 环境变量）|

## 环境变量

```
OPENROUTER_API_KEY=   # OpenRouter API Key
MODEL=                # 模型 ID，默认 anthropic/claude-sonnet-4-5
AUTH_USER=            # 登录用户名，默认 blocksec
AUTH_PASS=            # 登录密码（留空则不需要认证）
```

## 本地运行

```bash
pip install -r requirements.txt
cp .env.example .env   # 填入 API Key
uvicorn app.main:app --reload
```

访问 http://localhost:8000
