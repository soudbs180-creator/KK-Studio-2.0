# Plan

- ID：2026-09-14-multi-provider-generation
- 变更文件：provider/domain contract、creation task model、generation queue、image generation、asset repository、provider registry、settings/landing controls、adapter factory、agent workflow and tests。
- 实施顺序：先建立状态与能力契约，再接入幂等批量请求和错误分类，然后归档与素材索引，最后将连接和隐私状态接到已有创建面板。所有改动保留原有 dirty worktree。
- 风险与回滚：浏览器 BYOK 仍受服务 CORS 和供应商额度影响；供应商返回 URL 可能在下载前过期；平台连接、持久化 Worker 和外部对象存储尚未启用。回滚时删除本变更文件并保留旧 v2 快照迁移逻辑。
- 验证命令：`npm run typecheck`、`npm test`、`npm run ui:check`、`npm run format:check`、`npm run build`、`npm run test:ui`、`npm run client:check`、`npm run client:build -- --no-bundle`。
