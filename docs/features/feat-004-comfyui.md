# ComfyUI 本地出图链（FEAT-004）

- 状态：REAL
- 领域：creation
- 最近更新：2026-11-03
- 关联任务：TASK-COMFY-IMAGE-20261103

## 用户可见入口

画布 → 添加资源 → ComfyUI 工作流。连接本机服务，或选择目录由 KK 托管启动；记住每张卡片的工作流和连接。

## 当前能力

正反提示词、Seed、步数、宽高、采样器及 Checkpoint 在节点与右侧属性面板同步。原生编辑器载入当前卡片，返回保存实际 API 图和编辑布局。Host 与原生编辑生成的产物经 AssetPort 归档、生成结果节点与连线，重开项目恢复。受理不明时保留原任务，不自动重发。

## 代码位置

src/features/comfyui/index.ts；src/components/canvas/ComfyWorkflowNode.tsx；src-tauri/src/comfy_runtime.rs。

## 测试与证据

[本轮验收](../changes/2026-11-03-comfy-production/verification.md) · [历史卡片](../archive/comfy-production-20261103/feat-004-comfyui.md)。

## 差距与后端化

运行前在界面配置连接、工作流与对应模型。各生成入口的统一接入由阶段 3 继续推进。
