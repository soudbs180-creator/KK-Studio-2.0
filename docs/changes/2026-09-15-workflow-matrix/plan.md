# Plan

- ID：workflow-matrix-2026-09-15
- 变更文件：`src/domain` 模型与审批/评论契约，`src/features/creation` 归档与执行，`src/components` 参考槽、工作台、素材详情与评论，`src/styles` 语义 token 和状态样式。
- 实施顺序：读取 Figma/UI 文档 → 扩展快照与 SHA-256 归档 → 连接执行与审批围栏 → 结果矩阵/工作台 → 评论/来源详情 → 浏览器与 Tauri 取证。
- 风险与回滚：Prototype 数据仅在本地快照；保留旧演示卡作为无任务空态；所有新增字段可由 normalize 回退，删除新字段即可回到旧 UI。
- 验证命令：`npm run typecheck`、`npm run test`、`npm run ui:check`、`npm run format:check`、`npm run build`、`npm run client:check`、`npm run client:build -- --no-bundle`、Playwright 1421/1423 与 Tauri WebView2 CDP。
