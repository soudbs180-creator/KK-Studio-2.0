# Plan

- ID：CAP-001
- 变更文件：`src/features/skills/skillRegistry.ts`、`src/components/SkillsPage.tsx`、`src/components/SkillEditor.tsx`、`src/components/SkillRecordCard.tsx`、`src/components/settings/SkillsSettings.tsx`、`src/features/mcp/mcpClient.ts`、`src/components/settings/McpSettings.tsx`、`src/components/settings/McpServerCard.tsx`、`src/features/comfyui/workflowRegistry.ts`、`src/components/LibraryPage.tsx`、`src/App.tsx`、相关 CSS/浏览器和单元测试。
- 实施顺序：先审计安装包和现有入口；建立 Skill 安全 registry 并接入 Composer；建立 MCP endpoint schema、Streamable HTTP client 和设置卡片；建立 ComfyUI 本地工作流 registry 和目录卡片；加入显式调用确认与回归测试；同步治理账本和进度文档。
- 风险与回滚：本地 metadata 可能损坏，registry 写入失败时保持内存快照；MCP 服务器响应过大、分页死循环或超时则 fail closed；外部能力未接入时保持 Prototype。回滚可按提交边界移除本任务分支，不触碰用户已有项目数据或密钥。
- 验证命令：`npm run lint`、`npm run typecheck`、`npm test`、`npm run ui:check`、`npm run format:check`、`npm run build`、`npx playwright test tests/browser/catalog-pages.spec.ts tests/browser/mcp-settings.spec.ts`、`npm run client:check`。
