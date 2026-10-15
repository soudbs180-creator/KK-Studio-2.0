# Intent：统一承接GDI测试保护

- Task ID：TASK-EXPLORER-GDI-20261015；Owner：root；日期：2026-10-15；角色：current；状态：READY。
- 来源：用户正式接管要求先GDI保护再HOME/REF等产品恢复；沿用已有稳定任务ID，不重复建任务。
- branch fix/TASK-EXPLORER-GDI-20261015-integration；worktree D:/kk-studio/.worktrees/TASK-GOV-PHASE0；临时base6374c23f76cac13a8d7d36686c497e068272f965，依赖治理PR61及测试输出保护。root单写入者，旧分支/worktree/dirty/原件保留。
- 只挑af8a32588b90b82feddfe33eef784d775d55fccc独有7个测试源码；其父tree与main235e tree相同，不带入已squash的HOME历史。先确认现有结果，再承接、Windows回归、独审和正常PR；PR61合后从实际main重绑独有提交。
- 验收：保留Playwright默认features并禁止新Shell TabProxy；真实Edge browser/renderer参数与100自有页面均通过；完整verify使用独立run，报告/截图同run且旧合成字节不变。
- 仅测试设施，无产品运行产物改变/版本递增/日常客户端更新；不重启Explorer、不运行不安全默认A/B、不触碰用户profile、密钥、项目或付费Provider。见[Spec](spec.md)、[Plan](plan.md)。

## 实际main承接

- PR61合并后已fetch核实main3a9925977792a7f948eceda9f54d46fbf6f8b294；tree与已独审89fba一致，产品源码/版本仍同235e。新branch fix/TASK-EXPLORER-GDI-20261015-main。
- 从此main串行挑选且只挑4独有提交：e5d→ab8e2a7d、6374→f05a74c3、a6e→07e77ed6、8729→384546c8；整体tree逐字与旧8729相同。旧output/integration/governance/原候选分支全部保留。当前ledger重新绑定base/main branch；此前临时base段落保留作来源。
