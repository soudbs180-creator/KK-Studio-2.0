# 高清修复（FEAT-041）

- 状态：REAL
- 领域：creation
- 最近更新：2026-11-03
- 关联任务：TASK-COMFY-IMAGE-20261103

## 用户可见入口

选中已归档图片 → 高清修复，选择本地模型和 2× / 4×。

## 当前能力

默认开启。RealESRGAN 执行真实修复，最后输出精确目标尺寸；无修复模型时界面明确提供 Lanczos 缩放。保存工作流、倍数、连接与描述，重开后保留；结果自动归档并连接画布。

## 代码位置

src/features/image-edit/index.ts；src/features/creation/nativeComfyWorkflow.ts；src-tauri/src/task_host_comfy.rs。

## 测试与证据

[本轮验收](../changes/2026-11-03-comfy-production/verification.md) · [历史卡片](../archive/comfy-production-20261103/feat-041-upscale.md)。

## 差距与后端化

运行前在界面配置连接、工作流与对应模型。各生成入口的统一接入由阶段 3 继续推进。
