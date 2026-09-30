# 前端工程基线

> **本文只管「工程约束」，不再管「UI 长什么样」。**
> UI 规则 → [`UI_RULES.md`](./UI_RULES.md)；数值 → [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md)；
> 颜色/组件 → [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)；页面类型 → [`UI_ARCHETYPES.md`](./UI_ARCHETYPES.md)；
> 运行与验证 → [`UI_SPEC.md`](./UI_SPEC.md)；索引 → [`UI_INDEX.md`](./UI_INDEX.md)。
>
> 原文快照（只读，仅供溯源）：[`archive/ui-history/FRONTEND-SPEC-2026-09.md`](./archive/ui-history/FRONTEND-SPEC-2026-09.md)
> 原文件中的界面几何与交互测量已并入 [`UI_RULES.md`](./UI_RULES.md)，未在这里重复保存。

---

## 技术栈与工程约束

- React 18、TypeScript strict、现有 Vite、npm。
- **组件单文件不超过 300 行**（`npm run ui:check` 强制执行）。
- 弹窗使用原生 `dialog`，关闭恢复焦点，支持 Escape 和键盘；内容可滚动。
- 浏览器本地**只保存非敏感偏好**；API Key 只保留当前会话；Tauri 桌面通过系统凭据库保存。
- 数据边界由类型和运行时验证保证。
- 状态只报 Prototype，直到视觉和完整功能验收。

## 供应商连接（API）

- 测试连接必须验证 **JSON 模型列表结构**，不能把 HTTP 200 的网页当作连接成功。
- 编辑配置、关闭面板或取消时**终止旧请求**，旧响应不能覆盖新状态。
- Base URL 不接收内嵌凭据和查询参数；密钥不进入 `localStorage`。

## 验证

类型检查、构建、核心筛选/偏好测试、真实浏览器操作与 1920×1080 / 1440×900 / 768×1024 / 390×844 截图。
浏览器端的视觉验收规则见 [`UI_SPEC.md`](./UI_SPEC.md) §6。

---

## 已迁出到 UI 规范的部分

| 原内容 | 现行位置 |
|---|---|
| 卡片编辑器（选中态、提示词、上传入口） | [`UI_RULES.md`](./UI_RULES.md) §1.4 |
| 无限画布、节点拖动、缩放、连接线 | [`UI_RULES.md`](./UI_RULES.md) §1.4 / §1.5 / §1.6 |
| 底部工具栏职责 | [`UI_RULES.md`](./UI_RULES.md) §1.6 |
| 节点新增的选中态与视口避让 | [`UI_RULES.md`](./UI_RULES.md) §1.6 |
| 1920×1080 主工作台几何基准 | 历史测量，见归档快照；现行尺寸以 [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md) 为准 |
| 设置/资产/搜索等页面功能范围 | 产品需求，不在 UI 规范内 |
