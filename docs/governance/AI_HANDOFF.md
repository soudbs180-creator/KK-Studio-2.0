# AI恢复入口

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-11-07
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

1. 先核对实时HEAD/dirty/远端和唯一worktree。当前复用`chore/sync-local-main-20261106`，origin/main仍为`9b1038a7`，PR #83尚未合。读取[主线续验](../changes/2026-11-06-ci-gate-repair/verification.md)、[当前状态](PROJECT_STATE.md)、[任务台账](task-ledger.json)。禁止擅自合并/删树/删分支/reset/clean/force；允许推审查分支重跑检查。
2. 不重开旧接线分支，不重复做P2。PR #81 已包含于 #83；其余开放PR各有独有历史，保留。
3. 222个任务状态保留；证据存在不等于已验收。外部桥/调度器/Delegation 的 helper 不能冒充生产接线。

4. UI-004 仍 PARTIAL：先读[UI验证](../changes/2026-11-05-figma-local-sync/verification.md)与当前 Figma。无基线不写像素 PASS。原 127 旧会话原件与读取保护禁止清空或覆盖。

5. 2026-11-07 全面治理：本地 typecheck/lint/format/ui/tokens/unit 通过；虚假的 test:fast 脚本名 命令已清；active-work 由 Cursor 接管 `TASK-SYNC-LOCAL-MAIN-20261106`。目标是把 dirty 推上审查分支，让 PR #83 Hosted `verify` 重跑。旧 `4990025b` 的 Prettier 失败不能当作当前结论。

6. 未完成边界：正式 SHA 独审、已安装 Desktop、真实 Provider/扣费、侧车、全页六态/像素、合并 main。
