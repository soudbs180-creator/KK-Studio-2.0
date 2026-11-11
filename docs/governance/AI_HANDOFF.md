# AI恢复入口

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-11-09
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

2026-11-09 恢复入口：先读[当前闭环需求](../changes/2026-11-09-local-closure/intent.md)、[验证](../changes/2026-11-09-local-closure/verification.md)和[审查](../changes/2026-11-09-local-closure/review.md)。主 checkout 为 cc222004 加未提交候选；恢复目标格式保护、迁移 origins 保留及 body-parser/qs 安全锁修复已经组合本地验证。verify-02 退出 0，像素因缺基线跳过；当前安装包另从隔离快照核验，不沿用旧安装收据。先核对源码指纹与 worktree，保留既有改动，不把本地内容审查当作正式 SHA 审批或主线合入。

续验：隔离产品快照 df597194 / tree b71d9d22 已通过正式独立只读 SHA 审查与新安装包收据校验；TaskHost 11/11、后补当前契约脚本的官方 BAT 38/38（3 次启动）通过。系统存在既有 2.1.42 安装，登记/EXE/快捷方式已核对未改，未跑 NSIS 安装升级卸载；签名 NotSigned。测试脚本新 SHA 与产品快照分开绑定，前三/四轮测试失败原件不删除。后续仍先做存储契约与安全来源缺口，不跳到无权限的真实计费/生产或新增功能。

1. 先核对实时HEAD/dirty/远端和唯一worktree。当前复用`chore/sync-local-main-20261106`，origin/main仍为`9b1038a7`，PR #83尚未合。读取[主线续验](../changes/2026-11-06-ci-gate-repair/verification.md)、[当前状态](PROJECT_STATE.md)、[任务台账](task-ledger.json)。禁止擅自合并/删树/删分支/reset/clean/force；允许推审查分支重跑检查。
2. 不重开旧接线分支，不重复做P2。PR #81 已包含于 #83；其余开放PR各有独有历史，保留。
3. 222个任务状态保留；证据存在不等于已验收。外部桥/调度器/Delegation 的 helper 不能冒充生产接线。

4. UI-004 仍 PARTIAL：先读[UI验证](../changes/2026-11-05-figma-local-sync/verification.md)与当前 Figma。无基线不写像素 PASS。原 127 旧会话原件与读取保护禁止清空或覆盖。

5. 2026-11-07 全面治理：本地 typecheck/lint/format/ui/tokens/unit 通过；虚假的 test:fast 脚本名 命令已清；active-work 由 Cursor 接管 `TASK-SYNC-LOCAL-MAIN-20261106`。目标是把 dirty 推上审查分支，让 PR #83 Hosted `verify` 重跑。旧 `4990025b` 的 Prettier 失败不能当作当前结论。

6. 未完成边界：Hosted quality 的 verify 已失败，需修复根因后重跑；真实 Provider/扣费、侧车、全页六态/像素、合并 main仍未完成。
- 2026-11-07续验：正式 SHA 只读凭证已写入 `output/mainline-governance-20261106/sha-independent-review-20261107.json`，本地/远端/PR83 head 为 `eb7863a96354ceda3af3bf08bf8154ffeedd7491`、tree `f8a831df4ca4e510bc47261e9c6dc31595d93b66`；windows-release #22、git-guards #174 成功，quality #543/#544 均因 verify exit 1 失败。当前 SHA 的安装器收据、真实隔离 lifecycle 与 `client:installed:verify` 已通过 4532 文件，安装器 SHA `4d9a4f24...445591b`；不要把旧 `4990025b` 收据或旧 Hosted 结果套到当前版本。
