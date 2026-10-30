# Plan：草稿同步P2与统一发布接续

- Task ID：TASK-CANVAS-RELEASE-20261018；状态：IN_PROGRESS；日期：2026-10-18，Asia/Shanghai。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。
- Owner：root-release；branch：`fix/TASK-CANVAS-RELEASE-20261018-draft-race`；复用已登记锁定任务树；base87c，最终head待提交。

1. 保留main87c首次失败/重试日志，区分已证可编辑跨聊天帧和未完全重现的原文字拼接交错。
2. 只在ConversationPanel已有同步块改用布局阶段；原测试增加4倍CPU/rAF归属断言，保持原所有业务断言。
3. 当前工作差异lint、typecheck、两产品/测试文件Prettier及旧RED/新10次GREEN已通过或按实值记录；新包/ledger/PROGRESS同步后提交，冻结精确head。
4. 该head完成独审、完整验证、Hosted/Delivery与正常PR；合入后等最终main实际门禁。87c的绿色job和原PR零flaky不得代填新head。
5. 继续原任务完整发布：最终source的tag、包含Agent的唯一setup、正式安装与资料保护、kkai.plus和独立手机Web回读。未完成前整体NOT_VERIFIED，版本仍2.1.41且无已发布tag可重打。

本包独占写入新目录；root负责旧intent历史角色、单任务ledger及派生和恢复入口。保留其它任务/dirty内容。回滚用正常revert PR，不删用户数据，不更改现有秘密或部署权限；回滚会重新暴露已证草稿P2，不能以回滚替代发布验收。


## 正常整合并发主线文档

当前origin/main前移至b63de2271daac1e2941664d76e14998a6dd40a81（手机40生产收据，仅13文档/治理文件）。本分支正常merge保留双方记录；PROJECT_STATE冲突合并发布任务当前入口与手机40真实收据，TASK_LEDGER由合并后的JSON重建。其余153任务逐对象与新main一致，不覆盖手机任务的新证据。产品及测试Git blob与232907ce逐字相同；该head完整verify837首试/零flaky与精确独审为未变产品依据，融合后的lint/Delivery/独审及Hosted仍按新head执行，正式source待正常合入最终main。
