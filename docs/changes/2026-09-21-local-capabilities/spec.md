# Spec

- ID：CAP-001
- Source of truth：MiniMax Design 安装包静态能力审计、KK Studio 现有 `Settings`/`Catalog`/`Composer` 入口、`docs/architecture/DATA-STORAGE.md` 与仓库治理规则。
- 入口与状态：`Settings → Skills` 管理本地 Skill；开始创作与对话 Composer 可选择 Skill 并把受限 instructions 写入草稿；`Settings → MCP` 保存 endpoint、连接、取消、断开、发现工具并在显式确认后调用；`Catalog → ComfyUI` 管理本地工作流 JSON。连接中、错误、取消、禁用和 Prototype 状态均可见。
- 数据契约与权限：Skill 只接受受限 metadata/read-only manifest，instructions 最多 12,000 字，拒绝可执行字段、写权限、自依赖、重复权限和 secret-like 内容；Web 只在 localStorage 保存本地 metadata/已安装 ID。MCP 只允许 HTTPS 或 loopback HTTP，拒绝 credentials/query/hash，使用 2025-11-25 Streamable HTTP，限制 15 秒、2MB、500 工具和 32 页，不保存 token、Authorization 或 session ID；`tools/call` 需要 UI 确认和 `confirmed=true`。ComfyUI 只保存本地 API JSON 元数据，不执行节点数据。
- 验收标准：Skill 可安装、启用/禁用、导入/导出、编辑、搜索并保留用户 prompt；MCP 可完成 initialize → initialized → tools/list、分页/SSE 解析、断开与确认调用；ComfyUI 可创建 starter、导入合法 JSON、导出和删除；不安全 endpoint、非法 manifest、空工作流和坏 JSON 均 fail closed。
- 错误、取消、离线：连接支持取消并清理客户端；握手/工具列表失败显示错误；工具调用拒绝确认或参数不是对象时不发送请求；写入失败回滚 registry；未配置 ComfyUI 时运行按钮只发出本地 pending 请求并提示需要真实连接，不伪造生成成功。
