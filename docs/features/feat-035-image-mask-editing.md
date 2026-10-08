# 图片蒙版编辑（FEAT-035）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-10-08
- 关联任务：TASK-IMAGE-EDIT-001、TASK-IMAGE-EDIT-VERIFY-002

## 用户可见入口

图片节点/生成结果/图片灯箱 → 重绘。框选、画笔、色块产生同一编辑蒙版；无选区时整图连续编辑。

## 代码位置

- src/domain/imageEdit.ts：共享数据契约
- src/features/image-edit：Mask、坐标、区域、上下文、处理和界面
- src/features/creation：现有任务、模型适配、原件归档和恢复
- src-tauri/src/task_host.rs / image_edit_schema.rs：原生传输和包校验

## 测试与证据

[本轮验证](../changes/2026-10-08-unified-image-mask/verification.md) / [独立审查](../changes/2026-10-08-unified-image-mask/review.md)。本地verify、100 Rust测试、两端production bundle与原生重启/包恢复通过；具体范围和fixture错误勘误见验证记录。

## 当前能力

统一原像素Mask/历史、5%偶数正方形、反复合并、最多三块串行及整图回退。明确能力时原生PNG mask优先，色块保留标注图，参考编辑fallback仍保护Mask外每一RGBA像素。失败区域独立重试、取消保留成功候选、连续上下文有界；同一灯箱可浏览/下载/重绘/生成新候选/删除。Web/native项目包和原生重启保留编辑证据，已删除节点不复活。

## 差距与后端化

真实付费模型效果、任意语义几何/透视位移自动识别、手机键盘与物理触控、用户最终视觉验收尚未完成，归TASK-IMAGE-EDIT-VERIFY-002。当前按比例检查和人工候选复核处理模型映射风险。Mobile原生应用未改；不以fixture或窄屏截图代替真机证据。保留原有生成服务、权限、归档和unknown边界，无新队列或依赖。
