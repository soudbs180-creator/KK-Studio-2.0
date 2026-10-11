# Intent：2026-10-11 项目收口增量

- 原意：继续推进全部开放任务，优先把已有代码、边界测试、任务状态和交付证据收口。
- Outcome：模型场景禁用态和图片原始尺寸回载有可复现浏览器证据；已有网关实现不再被错误标为 TODO；外部依赖仍明确保持未验证。
- Scope：`tests/browser/model-picker.spec.ts`、新增 `tests/browser/media-dimensions.spec.ts`、任务账本及其生成视图、当前进度和本变更包。
- Non-goals：不安装 Gemini CLI、不读取或写入凭据、不调用真实 Provider、不启动 Tauri 发布、不合并或推送 dirty 工作树。
- 用户授权：用户明确要求“继续，全部都得收口”；本轮技术收口在该范围内自主执行。
