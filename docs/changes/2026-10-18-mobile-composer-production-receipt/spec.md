# Spec：生产事实与验收边界

- Task ID：TASK-MOBILE-COMPOSER-001；交付包角色：current。产品范围沿用[原Spec](../2026-10-18-mobile-composer/spec.md)，不在文档PR增加能力。
- 产品固定source `b457d3a05759ca7a2f6a8c4bb62a8ba8aea908ea` / tree `bbcab2a0d5e4a0fe4241b3d3f32d01e6b69b5334`；文档基线为该source，后续docs HEAD不是生产source。
- 验收要求：正式Release与真实release-event部署同源，公开build-info/手机entry吻合；320与390宽六按钮同排圆形、模型名可点、任务结果优先；已有图文/unknown与原件散列保持；current40/唯一previous39。
- 不新增持久化契约/迁移、付费请求、服务器权限或Native包；不得把fixture、普通停留、按钮可见当作真实生成、实体后台或真实语音接受。FEAT-028 PARTIAL/T12开放。
- 当前命令与事实见[Verification](verification.md)，审查独立性见[Review](review.md)；[Intent](intent.md) / [Plan](plan.md)。
