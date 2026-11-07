# 图片蒙版编辑（FEAT-035）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-11-03
- 关联任务：TASK-COMFY-IMAGE-20261103、TASK-IMAGE-EDIT-VERIFY-002

## 用户可见入口

选中已归档图片 → 浮动工具栏 → 局部重绘；也可从预览打开编辑器。生产入口和能力派发默认开启。

## 当前能力

矩形、画笔、色块共用原像素 Mask，支持撤销、清除和连续编辑。按已配置模型使用原生蒙版或参考图编辑，通过原任务宿主执行并保护选区外 RGBA 像素，结果归档并回写画布。没有模型或能力时显示模型设置引导；失败保留原件和草稿。

## 代码位置

src/features/image-edit/index.ts；src/features/creation/inpaintCapabilityDispatch.ts；src-tauri/src/task_host.rs。

## 测试与证据

[本轮验收](../changes/2026-11-03-comfy-production/verification.md) · [历史卡片](../archive/comfy-production-20261103/feat-035-image-mask-editing.md)。

## 差距与后端化

运行前在界面配置连接、工作流与对应模型。外部真实模型效果由 TASK-IMAGE-EDIT-VERIFY-002 承接；当前 12ai 连接的地址解析受到网络安全校验限制，阶段 3 继续处理连接链路。
