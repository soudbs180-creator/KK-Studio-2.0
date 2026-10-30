# Intent：隔离安装验收先验证首页Agent启停

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；Owner：root-release。
- 状态：IN_PROGRESS / NOT_VERIFIED（本阶段历史记录，整体交付未完成）。
- 交付包角色：historical；当前恢复入口转至[公开资产名修复](../2026-10-19-release-asset-name/intent.md)，本包原范围、SHA、失败和验证结果保留。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-lifecycle`；base：e43c5efaa9e80ad7ee617c852868a20e6093e08a/tree d9c0ee4206fb83bc413696b50356a887d10ad049；新head待提交。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

延续用户已授权的工具栏居中/不横向滚动/允许画布遮挡、正常main合并、统一2.1.42单一内置Windows Agent setup、kkai.plus和独立手机Web上线，并保留原项目配置全部目标。PR77已正常squash合入基线，产品完整树等于已独审d965；最终发布尚未完成，不缩减为仅测试修复。

真实候选安装后新建项目，会触发自动Agent对话初始化；旧安装验收随即直接native stop，与prepare并发而FAIL。追加同包诊断观察HTTP409及4225ms自然ready，健康启动并非停止时已经空闲。本任务只将纯随包Agent启停放在空库首页，保留全部持久化验收和生产停止保护。

仅测试与文档改变，按[版本规则](../../engineering/VERSIONING.md)保持尚未发布的2.1.42；42未tag。原41tag/失败、d965原安装失败、自有seed39和原cold均保留。原阶段见[历史验证](../2026-10-19-installer-clean-build/verification.md)。
