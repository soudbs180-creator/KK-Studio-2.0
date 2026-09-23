# ComfyUI 工作流库（FEAT-005）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-22
- 关联任务：T6、TASK-CAP-001、TASK-DS-002

## 用户可见入口

- 工作流/素材库页（LibraryPage、CatalogPageBody）：查看 starter 工作流、导入 ComfyUI 导出 JSON、导出、收藏。

## 代码位置

- `src/features/comfyui/workflowRegistry.ts`：schema、`parseComfyWorkflow`、`createStarterWorkflow`、本地读写、`createImportedWorkflow`、`workflowToJson`
- UI：`src/components/LibraryPage.tsx`、`CatalogPageBody.tsx`、`WorkflowCard.tsx`、`WorkflowImportButton.tsx`
- 存储：localStorage（本地工作流记录）

## 测试与证据

- 单测：`tests/unit/workflowRegistry.test.ts`
- 浏览器：`tests/browser/catalog-pages.spec.ts`

## 当前能力

- ComfyUI 工作流 JSON 的解析、starter、导入/导出、本地列表与收藏均为真实能力。

## 差距与后端化

- 只管理文件，不执行工作流；执行链见 FEAT-004（T6）。
- 不扫描用户 ComfyUI 目录、不索引模型（Rust `comfyui_scan_directory` 已写未接）。

## 变更记录

- 2026-09-21：创建卡片，状态 REAL（限定为文件管理）。

## 本轮证据勘误（2026-09-22）

状态按 [本轮验证与勘误](../changes/2026-09-21-text-and-rule-audit/verification.md) 纠正为 PARTIAL；保留早期记录的历史含义，不当作现行完成结论。

- 2026-09-22（TASK-DS-002）：目录和设置控件按Design System 1.1迁移；新增 `tests/browser/design-system-pages.spec.ts`，Web与实际Tauri证据见 `docs/changes/2026-09-22-design-system-pages/verification.md`。桌面重启已验证偏好和本地Skill记录保留；本证据不覆盖Provider/GPU或任务宿主恢复，功能状态保持PARTIAL。
