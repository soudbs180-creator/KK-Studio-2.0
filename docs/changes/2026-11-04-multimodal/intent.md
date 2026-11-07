# 阶段 3：真实多模态生成

- Task ID：BACKEND-MEDIA-001 / TASK-STAGE3
- 状态：IN_PROGRESS；current；2026-11-04
- 授权：用户要求从干净 `main@3d1a48f9` 连续完成阶段 3、4，通过门禁后本地合流并回收分支。
- Owner：root；branch：`codex/TASK-STAGE3-multimodal`；worktree：`D:/kk-studio/.worktrees/TASK-STAGE3-multimodal`。
- 目标：首页、对话和画布生成都使用真实持久任务。无配置时显示设置引导；不加载固定演示结果。
- 范围：FEAT-025、FEAT-006/007/031，既有 TaskHost、Provider 适配器和 AssetPort；不发布、不调用未授权的付费服务、不改用户存储身份。
- 验收：多模态参数/参考原件不静默丢失；轮询、取消、未知受理和恢复保持统一任务语义；结果归档并通过 result 边返回；配置缺失不产出素材。
- 方案与执行：[spec](spec.md)、[plan](plan.md)；[验证](verification.md)、[审查](review.md)。
