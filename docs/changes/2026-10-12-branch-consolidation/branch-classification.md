# 未合并分支全量分类与核验表（2026-10-12）

- 基线：本地 main `8915b6ae`（P0 完成后）；测量时点 2026-10-12
- 测量方法：全部 git 只读实测（rev-list / diff / cherry / merge-base / worktree list），不采信文档自述
- 覆盖 100 个未合并分支：**已完成 27 · 完成一半 68 · 未完成 4 · 无法判定 1**
- P0 已将 `codex/ui-redesign-20261011`（规则收敛）合入 main，不在本表

## 分类图例与判定规则

| 类 | 含义 |
|---|---|
| A 已集成 | 实质增量与 main 现存内容无差异（台账类文件除外，cherry/树比对证实） |
| G 历史备份 | 与 main 无共同祖先的旧历史备份（tree 同步而非提交集成） |
| B PR残留 | 已通过 PR/squash 进入 main，分支是历史残留（**再合并=用旧内容回滚 main**） |
| C 证据留存 | 仅剩交付包证据文件（.png/.json.gz 等），与主线无冲突 |
| D 文档 | 仅剩文档增量 |
| E-T1/T2/T3 | 有实质代码增量，按剩余实质文件数分级（T1>70，T2 15–70，T3<15） |

完成状态判定：**已完成**=内容已在 main；**完成一半**=有实质增量但未跑门禁/未验收/未收敛；**未完成**=绑定任务 TODO/BLOCKED 或自标 WIP；**无法判定**=数据矛盾。
列说明：beyond=领先 main 提交数；独有 delta=分支自叉点以来改动文件；仍差异=其中与 main 现存内容仍不同的文件；碰撞=分支与 main 自共同基点均改过的文件数。

## 主表（100 行）

| # | 分支 | 类 | 家族 | 完成状态 | beyond | 独有delta | 仍差异 | src | 证据 | cherry | 远端 | worktree | 碰撞 | 台账 | 处置与核验 | 批次 |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|---|---|---|---|
| 1 | `codex/TASK-VERIFY-CONCURRENCY-002` | A 已集成 | — | 已完成 | +7 | 30 | 3 | 0 | 0 | 7/0 | Y | — | 30 | - | 仅登记，不合并（实质增量已在 main） | B1 |
| 2 | `codex/TASK-VERIFY-CONCURRENCY-002-closeout` | A 已集成 | — | 已完成 | +1 | 8 | 3 | 0 | 0 | 0/1 | Y | 有 | 8 | TASK-VERIFY-CONCURRENCY-002=PARTIAL | 仅登记，不合并（实质增量已在 main） | B1 |
| 3 | `docs/PLUGIN-DESKTOP-001-closeout` | A 已集成 | PLUGIN-DESKTOP | 已完成 | +3 | 11 | 4 | 0 | 0 | 3/0 | Y | — | 11 | PLUGIN-DESKTOP-001=DONE | 仅登记，不合并（实质增量已在 main） | B1 |
| 4 | `docs/TASK-CLOSEOUT-2026-09-28` | A 已集成 | — | 已完成 | +3 | 14 | 5 | 0 | 0 | 3/0 | Y | — | 14 | TASK-CLOSEOUT-2026-09-28=DONE | 仅登记，不合并（实质增量已在 main） | B1 |
| 5 | `docs/TASK-POSTMERGE-FINAL-2026-09-28` | A 已集成 | POSTMERGE | 已完成 | +2 | 14 | 3 | 0 | 0 | 2/0 | Y | — | 14 | TASK-POSTMERGE-MIGRATION-2026-09-28=DONE | 仅登记，不合并（实质增量已在 main） | B1 |
| 6 | `docs/TASK-RULES-004-closeout` | A 已集成 | — | 已完成 | +1 | 10 | 5 | 0 | 0 | 0/1 | Y | — | 10 | TASK-RULES-004=DONE | 仅登记，不合并（实质增量已在 main） | B1 |
| 7 | `fix/TASK-FIX-PUSH-GUARD-SPACES-001-main-replay` | A 已集成 | PUSH-GUARD-SPACES | 已完成 | +7 | 17 | 3 | 0 | 0 | 6/0 | Y | — | 17 | - | 仅登记，不合并（实质增量已在 main） | B1 |
| 8 | `fix/TASK-GEMINI-TEST-RACE` | A 已集成 | — | 已完成 | +1 | 1 | 0 | 0 | 0 | 0/1 | N | 有 | 1 | - | 仅登记，不合并（实质增量已在 main） | B1 |
| 9 | `codex/T5-native-lifecycle` | B PR残留 | — | 已完成 | +11 | 72 | 25 | 7 | 4 | 9/0 | Y | — | 72 | T5=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#37 78cea37a） | B1 |
| 10 | `codex/TASK-AGENT-008-image-transport` | B PR残留 | — | 已完成 | +2 | 50 | 17 | 5 | 0 | 2/0 | Y | — | 50 | TASK-AGENT-008=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#33 21d121d2） | B1 |
| 11 | `codex/TASK-IMAGE-EDIT-001-unified-mask` | B PR残留 | — | 已完成 | +12 | 202 | 30 | 19 | 0 | 10/0 | Y | — | 202 | TASK-IMAGE-EDIT-001=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#41 8c921a52） | B1 |
| 12 | `codex/TASK-MODEL-001-capabilities` | B PR残留 | — | 已完成 | +8 | 165 | 32 | 19 | 0 | 6/0 | Y | — | 165 | TASK-MODEL-001=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#36 1af0357b） | B1 |
| 13 | `codex/TASK-ORCH-002-stage-workbench` | B PR残留 | — | 已完成 | +5 | 102 | 21 | 11 | 0 | 4/0 | Y | — | 102 | TASK-ORCH-002=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#35 5dd6e6dd） | B1 |
| 14 | `codex/TASK-PROJECT-001-landing-integration` | B PR残留 | — | 已完成 | +41 | 624 | 108 | 83 | 0 | 33/0 | Y | — | 624 | TASK-PROJECT-001=DONE; TASK-PROJECT-S… | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#31 bd3bc668） | B1 |
| 15 | `codex/TASK-UI-011-image-selection-actions` | B PR残留 | — | 已完成 | +8 | 236 | 32 | 20 | 0 | 6/0 | Y | — | 236 | TASK-UI-011=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#39 f922cf8e） | B1 |
| 16 | `feat/TASK-ORCH-001-agent-orchestration-closure` | B PR残留 | — | 已完成 | +13 | 30 | 22 | 13 | 0 | 12/0 | Y | — | 30 | TASK-ORCH-001=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#14 f6264385） | B1 |
| 17 | `feat/TASK-PROV-002-provider-connectivity` | B PR残留 | — | 已完成 | +6 | 22 | 8 | 0 | 0 | 5/0 | Y | — | 22 | TASK-PROV-002=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#16 a89792ad） | B1 |
| 18 | `fix/TASK-UI-013-single-row-titlebar` | B PR残留 | — | 已完成 | +6 | 92 | 15 | 7 | 0 | 4/0 | Y | — | 92 | TASK-UI-013=DONE | 仅登记，禁合并（squash 已入 main，再合=旧内容回滚）（PR#40 1d6f640a） | B1 |
| 19 | `codex/T10-PREP-vps-migration` | C 证据留存 | T10 VPS | 完成一半 | +8 | 20 | 10 | 0 | 2 | 7/0 | Y | 有 | 20 | T10-PREP=PARTIAL | 登记；T10-PREP=PARTIAL，证据随 T10 家族收敛评估 | B1/家族9 |
| 20 | `codex/TASK-MINIMAX-001-reverse-audit` | C 证据留存 | MINIMAX | 已完成 | +3 | 9 | 9 | 0 | 7 | 3/0 | N | 有 | 2 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 21 | `codex/sync-pr44-main-20261010` | C 证据留存 | sync-pr44 | 已完成 | +6 | 110 | 107 | 0 | 93 | 6/0 | N | 有 | 11 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 22 | `codex/sync-pr44-main-7736c99` | C 证据留存 | sync-pr44 | 已完成 | +7 | 110 | 107 | 0 | 93 | 7/0 | N | 有 | 11 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 23 | `docs/TASK-FIX-PUSH-GUARD-SPACES-001-evidence-correction` | C 证据留存 | PUSH-GUARD-SPACES | 已完成 | +2 | 8 | 8 | 0 | 5 | 2/0 | N | 有 | 3 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 24 | `docs/TASK-GOV-20261009-ledger-closeout` | C 证据留存 | — | 已完成 | +1 | 8 | 8 | 0 | 5 | 1/0 | N | 有 | 3 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 25 | `docs/TASK-P0-REGISTRY-20261009` | C 证据留存 | — | 已完成 | +1 | 12 | 12 | 0 | 5 | 1/0 | Y | 有 | 5 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 26 | `docs/TASK-POSTMERGE-2026-09-28` | C 证据留存 | POSTMERGE | 已完成 | +2 | 9 | 9 | 0 | 5 | 2/0 | Y | — | 9 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 27 | `fix/TASK-PROV-CONFIG-004-safe-toml` | C 证据留存 | — | 已完成 | +9 | 146 | 143 | 0 | 129 | 7/0 | Y | 有 | 11 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 28 | `master` | C 证据留存 | — | 已完成 | +1 | 8 | 8 | 0 | 5 | 1/0 | N | 有 | 0 | - | 仅登记（证据与主线不冲突，可随单元取并集） | B1 |
| 29 | `codex/async-image-provider-adapters` | D 文档 | — | 完成一半 | +2 | 2 | 2 | 0 | 0 | 2/0 | N | 有 | 0 | - | 读内容判准确性：准确则合并，过时则转登记 | B2 |
| 30 | `codex/TASK-UI-012-core-interactions` | E-T1 大功能 | UI-012 | 完成一半 | +39 | 455 | 449 | 153 | 276 | 34/0 | N | 有 | 71 | - | 并入 UI-012 收敛分支（与 RESUME 相差 7 文件） | B5 |
| 31 | `codex/kaworkai-capability-map` | E-T1 大功能 | — | 完成一半 | +7 | 84 | 68 | 49 | 9 | 7/0 | N | 有 | 51 | - | 竞品研究产出，需确认功能定位；本轮不合并，待授权 | 待授权 |
| 32 | `docs/TASK-HEALTH-20261009-ui012-check` | E-T1 大功能 | UI-012 | 完成一半 | +21 | 157 | 157 | 104 | 35 | 18/0 | N | 有 | 58 | - | 并入 UI-012 收敛分支 | B5 |
| 33 | `feat/TASK-UI-009-ui010-integration` | E-T1 大功能 | — | 完成一半 | +6 | 264 | 100 | 77 | 2 | 6/0 | Y | 有 | 264 | - | 与 main 碰撞大；本轮不合并，待授权 | 待授权 |
| 34 | `fix/TASK-UI-010-ui-regression` | E-T1 大功能 | — | 完成一半 | +6 | 182 | 87 | 67 | 0 | 5/0 | Y | — | 182 | TASK-UI-010=DONE | 与 main 碰撞大；本轮不合并，待授权 | 待授权 |
| 35 | `fix/TASK-UI-012-RESUME-001-current-main` | E-T1 大功能 | UI-012 | 完成一半 | +41 | 460 | 454 | 153 | 281 | 35/0 | N | 有 | 71 | - | UI-012 收敛基线（两步合并·已授权） | B5 |
| 36 | `fix/TASK-UI-014-ui-audit` | E-T1 大功能 | — | 完成一半 | +3 | 192 | 192 | 163 | 8 | 3/0 | N | 有 | 83 | - | 与 main 碰撞大；本轮不合并，待授权 | 待授权 |
| 37 | `codex/feat/canvas-tags-likes-ui` | E-T1 新功能 | — | 完成一半 | +3 | 27 | 27 | 25 | 0 | 4/0 | N | 有 | 0 | - | 今日新功能无台账登记；本轮不合并，待授权 | 待授权 |
| 38 | `chore/TASK-REPO-TIDY-001-workspace-cleanup` | E-T2 中代码 | — | 完成一半 | +2 | 65 | 65 | 1 | 58 | 2/0 | N | 有 | 6 | - | 合并单元 | B4 |
| 39 | `codex/T10-VPS-AUTO-DEPLOY` | E-T2 中代码 | T10 VPS | 未完成 | +15 | 21 | 21 | 6 | 3 | 15/0 | N | 有 | 1 | - | T10 家族收敛基线；T10=BLOCKED，收敛后登记待 VPS 验收 | B4/家族9 |
| 40 | `codex/TASK-AUDIT-20261003` | E-T2 中代码 | — | 完成一半 | +45 | 76 | 39 | 23 | 0 | 45/0 | Y | 有 | 76 | TASK-MCP-PROTO-001=PARTIAL; TASK-MCP-… | 合并单元 | B4 |
| 41 | `codex/TASK-CLIENT-CONSOLIDATION-20261011` | E-T2 中代码 | CLIENT | 完成一半 | +12 | 44 | 44 | 14 | 24 | 12/0 | N | 有 | 7 | - | CLIENT 家族收敛基线 | B4/家族6 |
| 42 | `codex/TASK-UI-SETTINGS-20261010` | E-T2 中代码 | — | 完成一半 | +2 | 34 | 34 | 23 | 5 | 2/0 | N | 有 | 9 | - | 合并单元 | B4 |
| 43 | `codex/architecture-boundaries-phase1` | E-T2 中代码 | — | 完成一半 | +23 | 29 | 29 | 21 | 6 | 23/0 | N | 有 | 2 | - | 合并单元 | B4 |
| 44 | `codex/feat-kk-debug-mcp` | E-T2 中代码 | — | 完成一半 | +1 | 32 | 32 | 5 | 2 | 1/0 | N | 有 | 3 | - | 合并单元 | B4 |
| 45 | `codex/mcp-runtime-hardening` | E-T2 中代码 | MCP加固 | 完成一半 | +1 | 37 | 37 | 11 | 3 | 1/0 | N | 有 | 6 | - | MCP 家族收敛基线 | B4/家族8 |
| 46 | `codex/model-access-ui-20261010` | E-T2 中代码 | — | 完成一半 | +1 | 55 | 55 | 43 | 4 | 1/0 | N | 有 | 12 | - | 合并单元 | B4 |
| 47 | `codex/sync-pr45-main-7736c99` | E-T2 中代码 | — | 完成一半 | +4 | 39 | 34 | 8 | 17 | 4/0 | N | 有 | 15 | - | 17/26 为证据，先审计后合并 | B4 |
| 48 | `docs/TASK-HEALTH-20261009-mask-check` | E-T2 中代码 | HEALTH-20261009 | 完成一半 | +11 | 202 | 31 | 19 | 1 | 9/0 | N | 有 | 202 | - | 合并单元 | B4 |
| 49 | `feat/TASK-AGENT-004-google-closeout` | E-T2 中代码 | AGENT-004 | 完成一半 | +12 | 55 | 25 | 16 | 0 | 10/0 | Y | 有 | 55 | TASK-AGENT-004=PARTIAL; TASK-AGENT-00… | AGENT-004 家族收敛基线 | B4/家族2 |
| 50 | `feat/TASK-AGENT-005-google-cli-login` | E-T2 中代码 | — | 完成一半 | +3 | 82 | 71 | 24 | 42 | 3/0 | Y | 有 | 60 | - | 合并单元 | B4 |
| 51 | `feat/TASK-AGENT-006-workbuddy-gateway` | E-T2 中代码 | — | 完成一半 | +2 | 33 | 33 | 16 | 6 | 2/0 | N | 有 | 21 | - | 合并单元 | B4 |
| 52 | `feat/TASK-AGENT-007-codebuddy-cli` | E-T2 中代码 | — | 完成一半 | +7 | 68 | 29 | 11 | 0 | 7/0 | Y | 有 | 68 | TASK-AGENT-007=DONE | 合并单元 | B4 |
| 53 | `feat/TASK-ORCH-003-agent-roles-schema` | E-T2 中代码 | — | 完成一半 | +3 | 20 | 20 | 11 | 5 | 3/0 | N | 有 | 4 | - | 绑定任务 TASK-ORCH-003=TODO，但分支已有 20 文件增量（agent roles schema）——台账与分支状态不一致，合并前需认定 | B4 |
| 54 | `feat/TASK-PROV-003-provider-wiring` | E-T2 中代码 | PROV-003 | 完成一半 | +4 | 32 | 26 | 8 | 7 | 4/0 | Y | — | 31 | - | 并入 PROV-003 收敛分支 | B4/家族3 |
| 55 | `feat/TASK-PROV-003-provider-wiring-main` | E-T2 中代码 | PROV-003 | 完成一半 | +1 | 18 | 11 | 0 | 0 | 1/0 | N | 有 | 18 | TASK-PROV-003=PARTIAL | PROV-003 家族收敛基线 | B4/家族3 |
| 56 | `feat/TASK-PROV-004-claude-landing` | E-T2 中代码 | — | 完成一半 | +6 | 40 | 27 | 8 | 7 | 6/0 | Y | 有 | 39 | TASK-PROV-004=PARTIAL | 合并单元 | B4 |
| 57 | `fix/TASK-AGENT-004-conversation-boundary` | E-T2 中代码 | AGENT-004 | 完成一半 | +14 | 55 | 27 | 16 | 2 | 11/0 | N | 有 | 55 | - | 并入 AGENT-004 收敛分支 | B4/家族2 |
| 58 | `fix/TASK-FIX-PUSH-GUARD-SPACES-001-windows` | E-T2 中代码 | PUSH-GUARD-SPACES | 完成一半 | +7 | 52 | 41 | 1 | 29 | 7/0 | Y | — | 22 | - | 29/34 为证据，先审计后合并 | B4 |
| 59 | `fix/TASK-GOV-INTEGRITY-audit-remediation` | E-T2 中代码 | — | 完成一半 | +1 | 34 | 34 | 7 | 7 | 1/0 | N | 有 | 12 | - | 合并单元 | B4 |
| 60 | `task/minimax-ui-align-20261010` | E-T2 中代码 | MINIMAX | 完成一半 | +4 | 37 | 37 | 28 | 5 | 4/0 | N | 有 | 20 | - | MINIMAX 家族收敛基线 | B4/家族11 |
| 61 | `codex/feat/minimax-deep-replica` | E-T2 WIP | MINIMAX | 未完成 | +8 | 27 | 27 | 25 | 2 | 8/0 | N | — | 25 | - | 自标 unverified WIP；本轮不纳入，登记挂起待授权 | 待授权 |
| 62 | `feat/TASK-AGENT-004-google` | E-T2 WIP | AGENT-004 | 未完成 | +1 | 35 | 26 | 18 | 3 | 1/0 | N | — | 34 | - | 自标 unverified WIP；本轮不纳入，登记挂起待授权 | 待授权 |
| 63 | `codex/T7-desktop-installer` | E-T3 小代码 | — | 完成一半 | +10 | 52 | 14 | 3 | 0 | 10/0 | Y | — | 52 | TASK-DESKTOP-INSTALLER-001=DONE | 合并单元 | B3 |
| 64 | `codex/TASK-CLIENT-COMPLETE-20261010` | E-T3 小代码 | CLIENT | 完成一半 | +2 | 10 | 10 | 4 | 4 | 2/0 | N | 有 | 1 | - | 并入 CLIENT 收敛分支 | B4/家族6 |
| 65 | `codex/TASK-COMPARE-001-canvas-compare` | E-T3 小代码 | — | 完成一半 | +3 | 32 | 16 | 8 | 0 | 3/0 | Y | — | 32 | TASK-COMPARE-001=DONE | 合并单元 | B3 |
| 66 | `codex/TASK-GOV-PHASE0-governance-baseline` | E-T3 小代码 | — | 完成一半 | +1 | 10 | 10 | 2 | 5 | 1/0 | N | 有 | 4 | - | 合并单元 | B3 |
| 67 | `codex/TASK-LAUNCH-001-quiet-start` | E-T3 小代码 | — | 完成一半 | +7 | 80 | 18 | 6 | 0 | 5/0 | Y | — | 80 | TASK-LAUNCH-001=DONE | 合并单元 | B3 |
| 68 | `codex/TASK-MCP-CRITICAL-001-critical-hardening` | E-T3 小代码 | MCP加固 | 完成一半 | +1 | 10 | 10 | 2 | 5 | 1/0 | N | 有 | 3 | - | 孪生分支（与 PATCH-ANCHOR-001 树完全相同）：含 mcp-patch-anchor 五件套 + install-desktop-support.mjs + vendor-anchors.md；执行期二选一并入 MCP 收敛分支，另一登记重复 | B4/家族8 |
| 69 | `codex/TASK-MCP-PATCH-ANCHOR-001-anchor-decoupling` | E-T3 小代码 | MCP加固 | 完成一半 | +1 | 10 | 10 | 2 | 5 | 1/0 | N | 有 | 3 | - | 孪生分支（与 CRITICAL-001 树完全相同）：内容同上；执行期二选一并入 MCP 收敛分支，另一登记重复 | B4/家族8 |
| 70 | `codex/TASK-VERSION-001-platform-versions` | E-T3 小代码 | VERSION | 完成一半 | +3 | 33 | 25 | 4 | 2 | 2/0 | Y | — | 33 | TASK-VERSION-001=DONE | 先审计 delta 是否过时（与 version-rebased 同树） | B3 |
| 71 | `codex/TASK-WINDOWS-ENTRY-RECOVERY-003` | E-T3 小代码 | — | 未完成 | +2 | 12 | 12 | 4 | 5 | 2/0 | N | 有 | 4 | - | 绑定任务 TODO，等 Hosted 环境；合并前需确认增量未被取代 | B3 |
| 72 | `codex/fix-ui-focus-state` | E-T3 小代码 | ui-focus | 完成一半 | +1 | 19 | 9 | 7 | 1 | 0/1 | N | 有 | 19 | - | ui-focus 家族：执行期测同树后登记其一或收敛 | B3/家族10 |
| 73 | `codex/fix/BACKEND-MEDIA-001-media-gaps` | E-T3 小代码 | — | 完成一半 | +2 | 9 | 9 | 3 | 4 | 2/0 | N | 有 | 1 | - | 合并单元 | B3 |
| 74 | `codex/fix/TASK-TASKSTATE-001-002` | E-T3 小代码 | TASKSTATE | 完成一半 | +1 | 3 | 3 | 3 | 0 | 1/0 | N | 有 | 1 | - | 并入 TASKSTATE 收敛分支 | B3/家族5 |
| 75 | `codex/taskstate-closeout-exact-20261011` | E-T3 小代码 | TASKSTATE | 完成一半 | +2 | 13 | 8 | 2 | 4 | 2/0 | N | 有 | 9 | - | TASKSTATE 家族收敛基线 | B3/家族5 |
| 76 | `codex/ui-focus-main-integration` | E-T3 小代码 | ui-focus | 完成一半 | +1 | 19 | 9 | 7 | 1 | 0/1 | N | 有 | 19 | - | ui-focus 家族：执行期测同树后登记其一或收敛 | B3/家族10 |
| 77 | `feat/TASK-AI-GATEWAY-001` | E-T3 小代码 | — | 完成一半 | +1 | 18 | 17 | 13 | 0 | 0/1 | N | — | 18 | - | cherry 判定提交已被主线吸收，但 13 个 src 与 main 现存版本不同（主线为 doubao-p1 更新版），合并前逐文件确认增量 | B3 |
| 78 | `feat/TASK-LOCAL-SERVICE-001-companion` | E-T3 小代码 | — | 完成一半 | +15 | 49 | 17 | 5 | 0 | 15/0 | Y | 有 | 49 | TASK-LOCAL-SERVICE-001=PARTIAL | 合并单元 | B3 |
| 79 | `feat/TASK-MEMORY-001-local-memory` | E-T3 小代码 | — | 完成一半 | +6 | 41 | 20 | 10 | 0 | 6/0 | Y | 有 | 41 | TASK-MEMORY-001=PARTIAL; TASK-MEMORY-… | 合并单元 | B3 |
| 80 | `feat/TASK-UI-EXT-001-settings-split` | E-T3 小代码 | — | 完成一半 | +1 | 9 | 9 | 6 | 0 | 1/0 | N | 有 | 4 | - | 合并单元 | B3 |
| 81 | `fix/PLUGIN-DESKTOP-001-csp` | E-T3 小代码 | PLUGIN-DESKTOP | 完成一半 | +3 | 16 | 10 | 2 | 2 | 3/0 | Y | — | 16 | - | 合并单元 | B3 |
| 82 | `fix/PROJECT-NAMING-001-auto-title` | E-T3 小代码 | — | 完成一半 | +2 | 12 | 12 | 4 | 5 | 2/0 | N | 有 | 6 | - | 合并单元 | B3 |
| 83 | `fix/TASK-AGENT-010-provider-entry` | E-T3 小代码 | — | 完成一半 | +8 | 46 | 18 | 9 | 1 | 2/6 | N | 有 | 46 | TASK-AGENT-010=REVIEW | 合并单元 | B3 |
| 84 | `fix/TASK-COMPANION-RECOVERY-003-preserve-originals` | E-T3 小代码 | — | 完成一半 | +6 | 20 | 18 | 3 | 5 | 5/0 | N | 有 | 11 | - | 合并单元 | B3 |
| 85 | `fix/TASK-COMPARE-002-touch-target` | E-T3 小代码 | — | 完成一半 | +3 | 17 | 9 | 1 | 0 | 3/0 | Y | — | 17 | TASK-COMPARE-002=DONE | 合并单元 | B3 |
| 86 | `fix/TASK-GOV-STATE-001-authority-chain` | E-T3 小代码 | GOV-STATE-001 | 完成一半 | +1 | 17 | 17 | 3 | 6 | 1/0 | N | 有 | 6 | - | 并入 GOV-STATE-001 收敛分支 | B3/家族7 |
| 87 | `fix/TASK-GOV-STATE-001-main-authority` | E-T3 小代码 | GOV-STATE-001 | 完成一半 | +3 | 17 | 17 | 3 | 6 | 3/0 | N | 有 | 8 | - | GOV-STATE-001 收敛基线 | B3/家族7 |
| 88 | `fix/TASK-LOCAL-ASSET-002-expose-metadata` | E-T3 小代码 | — | 完成一半 | +3 | 23 | 21 | 5 | 5 | 2/0 | N | 有 | 13 | - | 合并单元 | B3 |
| 89 | `fix/TASK-MINIMAX-001-mcp-registry-limit` | E-T3 小代码 | MINIMAX | 完成一半 | +4 | 15 | 9 | 2 | 0 | 3/0 | Y | 有 | 15 | TASK-MINIMAX-001=PARTIAL | 合并单元 | B3 |
| 90 | `fix/TASK-PLUGIN-DEV-001-same-origin-modules` | E-T3 小代码 | — | 完成一半 | +14 | 217 | 17 | 5 | 0 | 13/0 | Y | — | 217 | TASK-DESKTOP-FLUSH-001=DONE; TASK-PLU… | 合并单元 | B3 |
| 91 | `fix/TASK-PROV-005-provider-durable-config` | E-T3 小代码 | — | 完成一半 | +1 | 16 | 10 | 8 | 0 | 1/0 | N | 有 | 16 | TASK-PROV-005=DONE | 合并单元 | B3 |
| 92 | `fix/TASK-PROV-006-provider-gates` | E-T3 小代码 | — | 完成一半 | +1 | 11 | 6 | 4 | 0 | 1/0 | N | 有 | 11 | TASK-PROV-006=DONE | 合并单元 | B3 |
| 93 | `fix/TASK-PROV-007-capacity-errors` | E-T3 小代码 | — | 完成一半 | +1 | 11 | 5 | 3 | 0 | 1/0 | N | 有 | 11 | TASK-PROV-007=DONE | 合并单元 | B3 |
| 94 | `fix/TASK-UI-015-canvas-background-zoom-scale` | E-T3 小代码 | UI-015 | 完成一半 | +5 | 33 | 21 | 9 | 7 | 0/5 | N | — | 33 | TASK-UI-015=DONE | UI-015 家族收敛基线 | B3/家族4 |
| 95 | `fix/TASK-UI-015-project-drag` | E-T3 小代码 | UI-015 | 完成一半 | +4 | 39 | 34 | 8 | 17 | 4/0 | Y | 有 | 15 | - | 并入 UI-015 收敛分支 | B3/家族4 |
| 96 | `fix/TASK-VERIFY-ORIGIN-003-main-7ebf143` | E-T3 小代码 | VERIFY-ORIGIN-003 | 完成一半 | +1 | 5 | 2 | 1 | 0 | 1/0 | Y | 有 | 5 | - | PR#51 已集成主体；分支独有提交 6e02a96b 仍差异 playwright.config.ts + image-selection-actions.spec.ts，执行期比对是否被主线取代 | B3 |
| 97 | `fix/TASK-VERIFY-ORIGIN-003-strict-origin` | E-T3 小代码 | VERIFY-ORIGIN-003 | 完成一半 | +5 | 13 | 13 | 2 | 5 | 5/0 | N | 有 | 7 | - | 先审计剩余增量是否被 6e02a96b/主线取代 | B3 |
| 98 | `test/TASK-IMAGE-RETRY-004-current-attempt` | E-T3 小代码 | — | 完成一半 | +5 | 89 | 6 | 1 | 0 | 5/0 | Y | — | 89 | TASK-WINDOWS-ENTRY-DIAG-002=DONE; TAS… | 合并单元 | B3 |
| 99 | `version-rebased` | E-T3 小代码 | VERSION | 完成一半 | +2 | 33 | 25 | 4 | 2 | 2/0 | N | — | 33 | - | 孪生分支（与 TASK-VERSION-001 同树）：平台版本体系 25 文件增量（VERSION/ADR-008/VERSIONING/Cargo 等）；由 B3 的 TASK-VERSION-001 单元合并带入后，本分支登记重复 | B3 |
| 100 | `backup/pre-master-migration-20261011` | G 历史备份 | — | 无法判定 | +23 | 0 | 0 | 0 | 0 | 23/0 | N | — | -1 | - | 与 main 无共同祖先（pre-master-migration 旧历史备份，tree 同步而非提交集成）；BRANCH-POLICY 禁止对无共同祖先历史盲目 merge，保留不合并 | B1 |

## 完成状态汇总

| 完成状态 | 数量 | 分支类 |
|---|---:|---|
| 已完成 | 27 | A 已集成 + B PR残留 + C 证据留存（内容已在 main） |
| 完成一半 | 68 | D/E 各类：有实质增量，待门禁/收敛/授权 |
| 未完成 | 4 | WIP 自标未验证 + TODO/BLOCKED 绑定任务 |
| 无法判定 | 1 | G 历史备份（无共同祖先，无法测量增量） |

## 家族收敛清单（同功能多分支 → 单一分支 → main）

| 家族 | 成员 | 收敛基线（最新） | 收敛分支 | 批次 |
|---|---|---|---|---|
| UI-012 | core-interactions + RESUME + HEALTH-ui012-check | fix/TASK-UI-012-RESUME-001-current-main | codex/TASK-UI-012-consolidated | B5（两步·已授权） |
| AGENT-004 | google(WIP) + google-closeout + conversation-boundary | feat/TASK-AGENT-004-google-closeout | feat/TASK-AGENT-004-consolidated | B4（WIP 不纳入） |
| PROV-003 | provider-wiring + provider-wiring-main | feat/TASK-PROV-003-provider-wiring-main | feat/TASK-PROV-003-consolidated | B4 |
| UI-015 | canvas-background-zoom-scale + project-drag | fix/TASK-UI-015-canvas-background-zoom-scale | fix/TASK-UI-015-consolidated | B3 |
| TASKSTATE | fix/TASK-TASKSTATE-001-002 + closeout-exact | codex/taskstate-closeout-exact-20261011 | codex/TASK-TASKSTATE-consolidated | B3 |
| CLIENT | CLIENT-CONSOLIDATION + CLIENT-COMPLETE | codex/TASK-CLIENT-CONSOLIDATION-20261011 | codex/TASK-CLIENT-consolidated | B4 |
| GOV-STATE-001 | authority-chain + main-authority | fix/TASK-GOV-STATE-001-main-authority | fix/TASK-GOV-STATE-001-consolidated | B3 |
| MCP加固 | CRITICAL-001 ≡ PATCH-ANCHOR-001 + mcp-runtime-hardening | codex/mcp-runtime-hardening | codex/TASK-MCP-consolidated | B4（同树对登记其一） |
| T10 VPS | T10-VPS-AUTO-DEPLOY + T10-PREP | codex/T10-VPS-AUTO-DEPLOY | codex/T10-consolidated | B4（T10=BLOCKED，收敛后待 VPS 验收） |
| ui-focus | fix-ui-focus-state + ui-focus-main-integration | 执行期测同树后定 | 条件性 | B3 |
| MINIMAX | minimax-ui-align + deep-replica(WIP) + reverse-audit + mcp-registry-limit | task/minimax-ui-align-20261010 | task/minimax-consolidated | B4（WIP 不纳入） |
| VERSION | VERSION-001 ≡ version-rebased | — | 不建（同树登记其一） | B1 |
| VERIFY-ORIGIN-003 | strict-origin + main-7ebf143(已集成) | — | 不建（PR#51 已集成） | B1/B3 |

## 本轮不执行（仅登记，逐项授权后按单元流程处理）

`fix/TASK-UI-014-ui-audit`、`feat/TASK-UI-009-ui010-integration`、`fix/TASK-UI-010-ui-regression`、`codex/kaworkai-capability-map`、`codex/feat/canvas-tags-likes-ui`、`codex/feat/minimax-deep-replica`(WIP)、`feat/TASK-AGENT-004-google`(WIP)。

## 关键核验事实

- **58/100 个分支无 origin 远端副本**（本地独有资产，误删不可恢复——本轮不删任何分支）
- 67 个分支被 worktree 持有；2 个 worktree 处于 detached 状态
- 同树对：`codex/TASK-MCP-CRITICAL-001-critical-hardening` ≡ `codex/TASK-MCP-PATCH-ANCHOR-001-anchor-decoupling`；`codex/TASK-VERSION-001-platform-versions` ≡ `version-rebased`
- UI-012 core 与 RESUME 相差仅 7 文件（RESUME 更新）；两者与 main 碰撞约 32 文件
- P0 中发现并保全：`wip/ui-governance-css-cleanup-20261012`（merge-ui-main worktree 在途的 CSS 清理 + test 基建，此前未提交于任何分支）
- 台账 120→122 项：P0 新增 TASK-GOV-003；主线侧带入 TASK-FIX-PUSH-GUARD-SPACES-001=REVIEW
