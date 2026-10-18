# Plan：生产收据五件包与当前文档门禁

- Task ID：TASK-MOBILE-12AI-001；REVIEW；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。
- docs分支/base9d10、前候选55e见Intent；实施者仅改文档，不提交/推送、不调用Provider。root独占live UI与外部验收收据写入。

1. 读取实际 `scripts/governance/delivery.mjs`，保留55e的Delivery FAIL1日志。
2. 在新明确后缀目录补齐五件包；旧包只变更角色/当前路由，不改红测、事实、source或审查。
3. 同TASK账本绑定本docs分支及新verification，生成TASK_LEDGER；更新PROGRESS说明本次文档修复。其他任务/feature对象不动。
4. 对working-tree候选调用同一Delivery检查函数，检查新五件包/当前账本/branch绑定；运行文档适用lint/链接检查。该预检不能冒充尚未提交的新head正式Delivery。
5. root真实图文收据及另一上下文离线复核均有界PASS；任务保留REVIEW/NOT_VERIFIED，最终文档head门禁待提交后执行。新提交后重新跑正式Delivery、另一上下文独审及Hosted，结果另冻结外部收据并在PR记录；不为自引用head或未来门禁循环改写文档。55e暂停审查不代替新head审核。

## 失败与恢复

55e生产收据虽然更新了旧包，仍因没有新dated change package被实际Delivery拒绝。只补同任务记录与绑定，不修改checker、豁免名单或产品测试；原FAIL日志保留。真实图文成功收据不消除该历史失败，也不代填尚未完成的新head审核或用户最终接受。
