# 图层拆分（FEAT-042）

- 状态：REAL
- 领域：creation
- 最近更新：2026-11-03
- 关联任务：TASK-COMFY-IMAGE-20261103

## 用户可见入口

选中已归档图片 → 图层拆分，选择本地 BiRefNet 模型或导入明确输出节点的 API 工作流。

## 当前能力

默认开启。内置工作流输出前景、背景两个互补透明图层，保持原像素坐标。自定义图最多 16 个输出；失败分支保留成功图层，单图层重试只执行对应输出。所有产物归档、连线并支持重开。

## 代码位置

src/features/image-edit/imageCapabilityWorkflow.ts；packages/creation-contracts/imageCapability.ts；src-tauri/src/task_host_comfy_recovery.rs。

## 测试与证据

[本轮验收](../changes/2026-11-03-comfy-production/verification.md) · [历史卡片](../archive/comfy-production-20261103/feat-042-layer-split.md)。

## 差距与后端化

运行前在界面配置连接、工作流与对应模型。各生成入口的统一接入由阶段 3 继续推进。
