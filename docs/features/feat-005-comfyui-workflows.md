# ComfyUI 工作流库（FEAT-005）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-10-16
- 关联任务：T6、TASK-CAP-001、TASK-DS-002

## 用户可见入口

- 设置→模型接入→本地→ComfyUI工作流：导入、导出及删除已有记录。移除独立ComfyUI主侧栏，旧入口重定向到本地设置；原工作流ID和存储key保留。既有库中的导出/查看组件继续复用。

## 代码位置

- `src/features/comfyui/workflowRegistry.ts`：schema、`parseComfyWorkflow`、`createStarterWorkflow`、本地读写、`createImportedWorkflow`、`workflowToJson`
- UI：`src/components/settings/LocalWorkflowSettings.tsx`、`src/components/LibraryPage.tsx`、`CatalogPageBody.tsx`、`WorkflowCard.tsx`、`WorkflowImportButton.tsx`
- 写入ACK与失败保全：`src/features/comfyui/useLocalWorkflows.ts`
- 存储：localStorage（本地工作流记录）

## 测试与证据

- 单测：`tests/unit/workflowRegistry.test.ts`
- 浏览器：`tests/browser/catalog-pages.spec.ts`

## 当前能力

- ComfyUI 工作流 JSON 的解析、starter、导入/导出及本地管理已有实现。新设置入口写入成功后才发布状态；存储不可用时保留原记录并显示错误。`f32baad8` 精确独审及相关生产测试见[统一验证](../changes/2026-10-15-kk-unified/verification.md)；没有用空工作流或预览冒充执行。

## 差距与后端化

- 只管理文件，不执行工作流；执行链见 FEAT-004（T6）。
- 不扫描用户 ComfyUI 目录、不索引模型（Rust `comfyui_scan_directory` 已写未接）。

## 变更记录

- 2026-09-21：创建卡片，状态 REAL（限定为文件管理）。

## 本轮证据勘误（2026-09-22）

状态按 [本轮验证与勘误](../changes/2026-09-21-text-and-rule-audit/verification.md) 纠正为 PARTIAL；保留早期记录的历史含义，不当作现行完成结论。

- 2026-09-22（TASK-DS-002）：目录和设置控件按Design System 1.1迁移；新增 `tests/browser/design-system-pages.spec.ts`，Web与实际Tauri证据见 `docs/changes/2026-09-22-design-system-pages/verification.md`。桌面重启已验证偏好和本地Skill记录保留；本证据不覆盖Provider/GPU或任务宿主恢复，功能状态保持PARTIAL。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。

## 2026-10-29 P6.1候选更新（PARTIAL）

TASK-MOD-P6-1已接通桌面画布工作流卡片：选择本地根目录并隐藏启动、健康检查、进入原生编辑器/返回、选择保存的API工作流快速执行、WS/归属history→AssetPort→结果图片连线。返回保留原生编辑内容。旧段落的“没有接线/只管理文件”描述历史版本，不覆盖本追加；旧生成任务入口并未因此全部改造。

代码入口为src/features/comfyui/index.ts、src/components/canvas/ComfyWorkflowNode.tsx及src-tauri/src/comfy_runtime.rs/comfy_transport.rs。隔离Native夹具已核验host/editor两个client、原件SHA、持久化边、重载重开及停止；编辑器使用键盘提交，实际鼠标未验收。真实GPU/完整原生ComfyUI图界面、卡片参数面板、独审与主线交付仍开放，不提升REAL。后续只做浏览器与命令行验证，不再控制用户桌面。详见[验证](../changes/2026-10-29-p6-1-comfy-canvas/verification.md)与[ADR-033](../architecture/adr/ADR-033-comfy-canvas-runtime.md)。
