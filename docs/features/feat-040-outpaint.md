# 扩图（FEAT-040）

- 状态：REAL
- 领域：creation
- 最近更新：2026-11-03
- 关联任务：TASK-COMFY-IMAGE-20261103

## 用户可见入口

选中已归档图片 → 扩图，配置本地 ComfyUI 连接、Checkpoint 和四边扩展像素。

## 当前能力

默认开启。复用 ComfyUI 的 Pad、VAE、采样和 Composite 节点，只写扩展区并保护原图像素。支持导入 API 工作流与编辑描述；任务产物归档、连接画布并随项目恢复。未配置时可检测保存连接或前往模型设置。

## 代码位置

src/features/image-edit/imageCapabilityWorkflow.ts；src/features/creation/nativeComfyWorkflow.ts；src-tauri/src/task_host_comfy.rs。

## 测试与证据

[本轮验收](../changes/2026-11-03-comfy-production/verification.md) · [历史卡片](../archive/comfy-production-20261103/feat-040-outpaint.md)。

## 差距与后端化

运行前在界面配置连接、工作流与对应模型。各生成入口的统一接入由阶段 3 继续推进。
