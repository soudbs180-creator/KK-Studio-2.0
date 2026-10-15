# 意图：按全面审计报告收口当前 P1

## 用户需求

按 `D:/kk-studio/docs/plans/PROJECT-AUDIT-2026-10-12.md` 的 P1 顺序，先修复当前可本地验证的问题，再更新权威台账与发布/合并证据；真实 Hosted、Provider、第二环境和用户验收不能用本地结果代替。

## 范围

- 刷新 `PROJECT_STATE.md` 的当前事实块。
- 修复 `scripts/governance/branch-audit.mjs` 的格式门禁失败。
- 回读 PR #53 与当前 `origin/main` exact SHA 的 Hosted 检查，并更新 `TASK-FIX-PUSH-GUARD-SPACES-001` 证据边界。
- 记录 Windows 入口恢复候选和 `TASK-AGENT-010` 的当前阻断条件。
- 记录 `TASK-TASKSTATE-002` 与 `TASK-AI-GATEWAY-001` 的本地根因，不伪造真实供应商、DPAPI、桌面或账单证据。

## 非目标

- 不删除或移动 worktree/分支，不推送、不合并、不触发 Hosted CI。
- 不读取凭据，不调用真实 Provider，不生成未验证的安装包或签名收据。
- 不把 `TASK-MODEL-001` 或 `TASK-IMAGE-EDIT-001` 降级；当前台账已分别有主线集成证据和独立 `TASK-IMAGE-EDIT-VERIFY-002` TODO。
