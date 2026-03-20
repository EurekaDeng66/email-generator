# Changelog — BlockSec Email Generator

---

## [2026-03-20] — 草稿/发布 · 同步翻译 · UX 精简 · 手动输入模式

### 新功能

**草稿与正式模版分离保存**
- 模版库侧边栏新增两个保存按钮：「暂存草稿」和「存为模版 ✓」
- 草稿（橙色 tag）：立即保存，无需生成 HTML，卡片有「发布 →」一键升级入口
- 正式模版（绿色 tag）：自动为尚未生成 HTML 的语言调用 `/api/assemble`，全部完成后保存
- `publishDraft(id)`：从草稿直接发布为模版，自动补全缺失 HTML

**同步翻译（→ 同步翻译）**
- 每个语言编辑面板新增「→ 同步翻译」按钮
- 将当前编辑版本的标题+正文，并发翻译为其他所有已选语言
- 后端新增 `POST /api/translate_from` 接口，使用品牌语调 prompt 保持一致性
- 适合场景：先用母语写好正文，再一键生成其他语言版本

**手动输入模式（跳过 AI 生成）**
- Step 2 占位区新增「✏️ 直接输入邮件内容（跳过 AI 生成）」按钮
- 打开空白编辑器，用户可粘贴已有内容后直接生成 HTML
- AI 生成的内容不会覆盖手动输入的内容

**浏览器标签页 Favicon**
- 添加橙色信封 SVG favicon，via data URI 内嵌，无需额外文件

### 改进

**标题输入框内嵌操作按钮**
- 移除悬浮在输入框外的「✦ 标题」「✦ 正文」按钮
- 改为内嵌在输入框右侧的图标按钮：`↺` 重新生成标题，`↻` 重新生成正文
- HTML 输出标题框右侧内嵌 `⎘` 复制按钮
- CSS：`.input-icon-wrap` / `.input-icon-btns` / `.iib`

**Step 2 描述文案更新**
- 由「审阅 AI 生成的初稿」→「支持 AI 生成初稿，也可直接粘贴已有内容」

---

## [2026-03-19] — 历史性能数据 · 自然语言意图解析 · 审阅状态追踪

### 新功能
- `parse_intent()` 返回 `clarification`（信息不足时输出 chips 引导）和 `rationale` 字段
- Step 1 支持 clarification chips：AI 识别缺失信息后，以可点击选项引导补充
- 历史发送数据（开信率/点击率）写入 prompt，影响生成策略
- 每语言独立「已审阅 ✓」状态追踪

---

## [2026-03-18] — JS 模块拆分 · 模版库 · UTM 管理

### 新功能
- 单体 inline JS → 14 个独立模块（`static/js/*.js`）
- 模版库持久化到 Railway SQLite Volume（多人共享）
- UTM 模版管理抽屉，支持保存/应用/删除
- 历史邮件可复用：卡片展开显示发送对象、触发时机

---

## [2026-03-17] — 多语言并发生成 · 邮件模版

### 新功能
- 4 语言并发生成（ThreadPoolExecutor）
- 3 套邮件模版：Ruby Sales / Ruby KYT / Jenna Marketing
- Jenna 模版：DM Sans 字体 + 渐变色签名卡 + 复选框退订
- 邮件 HTML 修复：Outlook 居中（`align="center"` + `width="640"`）、响应式自适应

---

## [2026-03-16] — 初始版本上线

- FastAPI + SQLite 后端，部署于 Railway
- Quill 富文本编辑器 + 4 语言 tab 切换
- `/api/generate` → `/api/assemble` 两步流程
- Basic Auth 访问控制
