# ComfyUI 工作流库（FEAT-005）

- 状态：REAL
- 领域：creation
- 最近更新：2026-11-03
- 关联任务：TASK-COMFY-IMAGE-20261103

## 用户可见入口

设置 → 模型接入 → 本地，以及画布工作流卡片：创建、选择、导入和导出 JSON。

## 当前能力

API JSON 可直接调参运行；UI JSON 完整保留 widgets、连线和布局，先在原生编辑器转换。每张卡片保存独立快照，不依赖全局库恢复。新建模板包含完整 SD15 连线，选择本机 Checkpoint 后运行。导入拒绝凭据，保存失败保留原记录。

## 代码位置

src/features/comfyui/workflowRegistry.ts；src/components/settings/LocalWorkflowSettings.tsx。

## 测试与证据

[本轮验收](../changes/2026-11-03-comfy-production/verification.md) · [历史卡片](../archive/comfy-production-20261103/feat-005-comfyui-workflows.md)。

## 差距与后端化

运行前在界面配置连接、工作流与对应模型。各生成入口的统一接入由阶段 3 继续推进。
