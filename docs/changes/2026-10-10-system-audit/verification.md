# 系统梳理与核查记录

日期：2026-10-10。范围：当前主仓、任务账本、功能注册表、治理记录和已登记 worktree。

## 结论

- `task-ledger.json` 当前 119 项：DONE 72、PARTIAL 27、TODO 15、BLOCKED 4、REVIEW 1；开放 47 项。
- `features.registry.json` 当前 36 项：REAL 2、PARTIAL 27、PROTOTYPE 5、PLANNED 2。
- 已完成项 72 项的 evidence 路径全部存在，核心字段完整；历史 DONE 仅对各自 verification scope 生效。
- 当前登记 worktree 68 个（approved-root 35、nested 30、external 2、primary 1）；最新只读 reclaim audit 为 `worktree-reclamation-plan-a32b6b9e-3ff4-402b-913f-d04b64a3de56.json`，无可安全回收的完整 worktree 或生成目录。
- 23 个未登记残留目录仍保留：深层含 junction/reparse point，未满足删除门禁；本轮未删除任何源码、证据或工作树。

## 反向复核问题

- 17 个历史 DONE 记录仍指向已收敛的 `kk-studio-next` 或旧外部 worktree（`T0`、`TASK-GOV-001`、`TASK-PROV-001`、`T3b`、`T4`、`UI-002`、`TEST-PROV-001`、`TASK-ASTRA-001`、`TASK-KK2-MAIN-SYNC`、`TASK-UI-UNMERGED-001`、`TASK-UI-MAIN-001`、`TASK-UI-DISMISS-002`、`TASK-MAIN-CLOSE-002`、`TASK-UI-CLOSE-003`、`TASK-PERF-ASSETS-001`、`TASK-GOV-002`、`TASK-AUDIT-SEC-001`）；对应 evidence 仍存在，因此只能确认历史 scope，不能恢复旧运行目录。
- 4 个历史 DONE（`T1`、`T2`、`T3a`、`EXT-GIT`）没有可复现的 branch/worktree 绑定；保留历史状态，后续若需要重验必须从 evidence 指定的 SHA 或新隔离工作树重建。
- `TASK-DOCS-STRUCT-001` 仍为 REVIEW：本地门禁 PASS，但账本要求独立复核闭环；没有提前改成 DONE。`TASK-AGENT-004/005`、`TASK-MEMORY-001/002` 共享组合分支，`TASK-AI-GATEWAY-001` 与文档结构任务共用当前主 checkout，需在下一次交付前明确单一写入者，未在本轮强行拆分。

## 记录修正

| 改动 | 原因 | 影响 |
| --- | --- | --- |
| 更新 `PROJECT_STATE.md`、`TASK_STATUS.md` 的实时统计与脏工作区事实 | 原记录 117 项/54 worktree 已陈旧 | 只改治理摘要，不改产品行为 |
| 更新 `WORKTREE-LIFECYCLE.md` 与 workspace/reclaim 指针 | 让当前 worktree 数量和审计计划可回读 | 只改审计导航 |
| 规范化 `TASK-MEMORY-002` 的 worktree 路径斜杠 | 消除双斜杠路径歧义 | 不改变分支或文件内容 |

## 未闭合项

- P1 未完成项 8 个，P2 未完成项 39 个；依赖链和下一步以 `task-ledger.json` 为准。
- 真实 Provider/DPAPI、ComfyUI、VPS/Mobile、Hosted/独立审查和用户视觉验收仍未由本轮本地证据关闭。
- `node scripts/check-governance.mjs` 当前剩 1 个可重复的治理阻断：工作区存在被忽略的 `pnpm-lock.yaml`，而项目规则只允许 npm/package-lock；该文件最近由并发进程生成，本轮保留原件，未删除或搬移。
- 当前源码中的 secret-filter 合并属于并发脏改动，本轮避让；未发现可确认的源码乱码。

## 追加勘误：pnpm 锁文件隔离

原记录在当时准确保留了并发生成的 `pnpm-lock.yaml`。后续确认没有运行中的 pnpm 进程，且项目规则只允许 npm/package-lock；因此将该原件按 SHA-256 `99A1B62757992ABD34B586A1FAFD1289AC77EB2AD5D63BB3B2B9FF7F965E2903` 移至 `D:/kk-studio/.verification/governance/pnpm-lock.yaml.regenerated-20261010-99A1B6275799.yaml`。重新运行 `node scripts/check-governance.mjs` 得到 `Governance: 120 tasks, 0 violations.`，原件可按 retention manifest 恢复。
