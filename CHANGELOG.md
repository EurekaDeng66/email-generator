# Changelog — BlockSec Email Generator

---

## [2026-03-23]

### 新功能
- **个性化变量字段**：在补充指令下方新增「个性化变量（选填）」输入框，支持快捷 chip 插入 `{{name}}`、`{{remain_quota}}` 等，AI 会在问候语等合适位置自动使用
- **UTM 模版编辑**：每条 UTM 模版新增「✏️ 编辑」按钮，点击后回填表单，保存按钮切换为「更新 UTM 模版」，支持取消编辑
- **CTA 模版同步到 UTM 库**：保存 CTA 链接模版时，自动将结构化参数（base URL、utm_source、utm_content）同步写入 UTM 模版库
- **保存为模版按钮智能状态**：output-panel 右下角新增保存按钮，三态切换：「保存为模版」/ 「↑ 更新模版」（有改动）/ 「✓ 模版已是最新」（无改动）
- **同步翻译 tooltip**：hover「→ 同步翻译」按钮显示气泡提示，各语言文案不同

### 改进
- **重新生成正文按钮独立**：`↻ 重新生成正文` 从标题 input 内移出，独立展示在 Quill 编辑器上方
- **重新生成 loading 状态修复**：改用 CSS spin 动画，不再修改按钮文字导致 26px 小按钮溢出
- **三大 CTA 样式统一**：「AI 解析并填写」「生成邮件内容」「保存邮件模版」统一为 13px / `btn-primary` 样式；「生成 N 种语言」重命名为「生成邮件内容」

### Bug 修复
- **JSON 解析多级兜底**：引入 `json-repair` 库作为 Pass 2.5，解决 LLM 在正文文本中输出未转义引号导致的 `Expecting ',' delimiter` 报错
- **variables DOM 空指针修复**：`handleRegenerate` 等函数中对 `#variables` 的读取改用可选链，避免旧 HTML 缓存时函数静默崩溃

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
