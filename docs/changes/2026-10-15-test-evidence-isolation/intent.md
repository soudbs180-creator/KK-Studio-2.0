# Intent：测试输出不再清除历史证据

- Task ID：TASK-VERIFY-EVIDENCE-20261015；Owner：root；日期：2026-10-15；角色：current；状态：READY。
- 来源：用户要求继续实施独立测试输出、完整备份保护、回归与独审；原[证据事件](../2026-10-15-unified-execution/incident.md)保留缺失状态。
- branch `fix/TASK-VERIFY-EVIDENCE-20261015-output-isolation`；worktree `D:/kk-studio/.worktrees/TASK-GOV-PHASE0`；base89fba48244d58f0a18df8766951b02a785c5810b（已推送治理PR61的冻结head）。
- root是唯一写入者；治理分支冻结，不改原GDI候选/其他dirty工作树；不新增worktree或用户数据操作。
- 验收：默认Playwright成功/失败都保留合成旧receipt/截图/报告；每次产物和report目录独立；显式开发态输出目录已有内容时，在任何测试副作用前拒绝覆盖。
- 不改产品运行产物/版本，不调用真实Provider，不借新结果恢复旧回执；[Spec](spec.md)、[Plan](plan.md)。
