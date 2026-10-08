# Intent：统一 Mask 主线整合

- Task ID：TASK-IMAGE-EDIT-001；2026-10-09，Asia/Shanghai。
- 用户要求合并已检查分支，未完成的继续完成。原e7cfd28本地源码与文档独立PASS；当前主线前移到1d6f640ac6f3a1e7af32c38d85596527704dc54a，必须完成组合验证后普通受保护合并。
- 保留原像素统一Mask、原件/未选像素保护、串行任务及unknown安全恢复；同时保留用户最新要求的选中卡片上方操作栏、静默启动和40px单排标题栏。
- [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)；[原需求范围](../2026-10-08-unified-image-mask/spec.md)。
- 普通PR/合并已有用户授权；不改变真实Provider/物理手机/用户视觉后续验收、发布、快捷方式或用户数据。

本轮精确技术基线1d6f640ac6f3a1e7af32c38d85596527704dc54a，产品27bdb8bda6bdd5eec041dd5e2fab28e4dd728d0a/drivereaa0886e99965d00a5a514b301adb665b150373d，实际证据和范围以最新verification/review为准；只合并已通过当前scope验收及托管门禁的分支。
