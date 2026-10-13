# 本地技能 Skills（FEAT-011）

2026-10-13：同一Registry新增五个原创编程/图片/视频助手与自定义保存/编辑。内置助手在编辑、导入和manifest覆写边界只读；3000字符留出任务输入空间。复用存储身份、失败原件保护，未新建助手库。见[本轮证据](../changes/2026-10-13-cherry-red-scope/verification.md)，联网目录/真实生成仍单独验收。

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-09-22
- 关联任务：TASK-CAP-001、TASK-DS-002

## 用户可见入口

- 侧栏技能页（SkillsPage）、技能编辑器（SkillEditor）、技能集合（SkillCollection）、输入框技能选择、设置 › 技能。

## 代码位置

- `src/features/skills/skillRegistry.ts`：模板、CRUD、prompt 触发，localStorage 持久化
- UI：`src/components/SkillsPage.tsx`、`SkillEditor.tsx`、`SkillCollection.tsx`、`SkillRecordCard.tsx`、`SkillPageControls.tsx`、`src/components/settings/SkillsSettings.tsx`
- 接线：App、StartComposer、StartPage、ConversationPanel 等

## 测试与证据

- 单测：`tests/unit/skillRegistry.test.ts`
- 证据：`docs/changes/2026-09-21-local-capabilities/`

## 当前能力

- 本地技能模板、新建/编辑/删除、prompt 触发真实可用。

## 差距与后端化

- 联网目录、官方安装、下载统计显示为“本地演示 Prototype”。
- 技能与 MCP 自动编排的结合属于 FEAT-012/BACKEND-MCP-AUTO。

## 变更记录

- 2026-09-21：创建卡片，状态 PARTIAL。

- 2026-09-22（TASK-DS-002）：目录和设置控件按Design System 1.1迁移；新增 `tests/browser/design-system-pages.spec.ts`，Web与实际Tauri证据见 `docs/changes/2026-09-22-design-system-pages/verification.md`。桌面重启已验证偏好和本地Skill记录保留；本证据不覆盖Provider/GPU或任务宿主恢复，功能状态保持PARTIAL。

2026-10-13 7da 主线候选：正式 production Tauri Native6、真实 Ollama13、严格隔离NSIS生命周期已通过相关链路；不同源码/产物和 Hosted/用户验收边界见[最终记录](../changes/2026-10-13-cherry-red-scope/mainline-final-status.md)。功能总体仍PARTIAL，不据此关闭其他开放任务或真实云/图片/视频能力。
