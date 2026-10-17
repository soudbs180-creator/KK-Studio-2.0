# Review：旧聊天迁移与恢复

- Task ID：TASK-CHAT-MIGRATION-20261017；NOT_VERIFIED；base bbc8a766，最终head待冻结。
- [Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Verification](verification.md)。
- 三只读诊断已确认root/chat双权威、未接生产迁移、无损缺口与protocol6可变canvas风险。实现者自检和诊断不算独立验收。
- 最终由独立上下文reviewer核对真实base/head、原件与候选对账、Native/IDB每步失败、线程所有权/scope、真实产物及实际资料迁移。未知/未来格式仍须失败关闭；不能仅审schema或给Map模拟器PASS。
- 原审计source469/C/d356失败与最终bbc8文档收据全部保留原阶段，不改变历史结论。
