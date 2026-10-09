# Plan：浏览器并发失败原因与隔离复核

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：IMPLEMENTED（诊断范围）
- 日期：2026-10-10
- Intent / Spec / ADR：本目录 `intent.md`、`spec.md`；无新增 ADR
- Owner / branch / worktree：root / `codex/TASK-VERIFY-CONCURRENCY-002` / `D:/kk-studio/.worktrees/TASK-VERIFY-CONCURRENCY-002`
- Base / reviewed HEAD SHA 与远端目标：base/source `8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`；独立复核绑定文档/证据 head `c46cdeb4a31957f474523f2f8254afaeaf34b804`；本提交只记录复核结果；远端目标为普通 PR 后回读 main，未执行。
- Git dirty/index 状态、并行任务与文件归属：代码基线干净；证据先写 `.tmp` 再复制到本目录；只读审计 agent 未修改文件。

## 开工证据

- 已读取的规则、账本、规范和实现：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/PROMPTING.md`、`SDLC.md`、`BRANCH-POLICY.md`、`REVIEW.md`、`docs/governance/task-ledger.json`、Playwright config、历史 source105 verification/evidence。
- 依赖/工具版本与安装：Node 24.20.0、npm 11.19.0；`npm ci --no-audit --no-fund` exit 0；一次 `npm run build` exit 0。
- 基线 lint/typecheck/相关测试：本 worktree 的目标是并发诊断；仅运行完整 browser 矩阵，不把其他 worktree 的 verify 结果冒充本分支新证据。
- PRE-EXISTING FAILURE 与关联任务：历史 source105 默认并发 9 个首轮 flaky；历史原因 UNKNOWN；关联 `TASK-VERIFY-ORIGIN-003` 与 `TASK-WINDOWS-ENTRY-RECOVERY-003` 保持开放。
- 计划中 AI 自主事项：固定端口/同 dist/retries=0，逐档留原件和资源收据；无复现则不改产品。
- 必需外部条件与已存在的用户授权：用户已授权继续；不需要外部凭据。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | worktree/dependencies | 安装锁定依赖并构建一次 production dist | clean source | npm ci/build exit 0 |
| 2 | Playwright 运行器 | 固定 1423、同 dist、retries=0，执行 workers 1/2/4/8/12 | 步骤 1 | 每档 447 用例报告、exit code |
| 3 | evidence 收据 | 保存 JSON、console、receipt、进程树资源与哈希 | 步骤 2 | manifest、资源峰值、端口前后为空 |
| 4 | docs/ledger | 写 intent/spec/plan/verification/review，更新任务为 PARTIAL | 步骤 3 | 精确 tested source 与 reviewed docs head、独立 review、无 DONE 越界 |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：只读审计 agent 仅检查配置/历史证据；主代理独占本 worktree 运行矩阵。
- 同文件写入的串行顺序：证据完成后串行写 docs 和 ledger；不修改根目录 dirty checkout。
- 整合负责人、目标 branch/base 和同步策略：root；普通 PR/main 回读另需后续远端回执。
- 冲突后重新验证的范围：任何 source/config 变化都必须重跑受影响并发档位；本轮无 source/config 变化。

## 风险与恢复

- 最危险的失败场景与预防：端口残留、reporter 清理 `test-results`、retry 掩盖首轮失败；用 strictPort、`.tmp` evidence、retries=0 和每档 hash 预防。
- 数据备份/原件保护/回滚或补偿：只写隔离 worktree；历史证据不覆盖；停止的进程仅限本次启动的 runner/preview。
- 触发恢复的条件及 runbook：若出现端口占用或启动异常，保存 receipt 并停止本次子进程，不能杀外部服务。
- 高风险外部动作的授权、权限和费用边界：不执行 push/merge/release/Provider 请求。
- 不选择的方案及理由：不降低默认 timeout、不修改测试断言、不把 workers4 绿化为修复，因为那会隐藏根因。

## 验证和交付

- 定向回归，bug 修复的预期失败及修复后结果：无代码 bug 修复；历史失败与当前全矩阵分开报告。
- 完整验证与必要 Rust/native/live 检查：本任务只需完整 browser 矩阵；Rust/native/live Provider N/A。
- UI 的 Figma/DOM/截图、1421/1423/Tauri 证据（适用时）：Web preview 1423 已记录；UI 产品改动和 Tauri 不适用。
- 独立 reviewer 与当前 SHA 审查：由独立上下文读取最终 docs/evidence 后记录在 `review.md`。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：更新本任务 docs 与 task ledger；根目录 dirty checkout 不直接修改。
- PR、用户产品验收、发布和回滚记录：未执行，保持未验证。
- 暂不可验证项及准确状态：Hosted/PR/普通合并/main 回读、历史 Hosted 根因均 UNKNOWN/BLOCKED 外部回执，任务 PARTIAL。

## 计划变更记录

- 2026-10-10：后台 Start-Process 采集方式因 Playwright/报告清理行为产生不稳定目录，停止本次自启进程并改为前台直接执行；证据改放 `.tmp` 后逐档复制，未改变产品或测试。
