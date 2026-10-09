# Review：浏览器并发失败原因与隔离复核

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 时间与时区：2026-10-10，Hosted 回执完成后追加复核
- Reviewer/context/工具或模型（已知时）：独立只读审计上下文；PowerShell、Git、Node JSON 解析
- 独立于实现上下文：是；reviewer 未参与矩阵运行或文档编写，仅读取最终 diff、规则、任务账本和压缩证据。
- Base SHA / reviewed head / 规则版本：base `8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`；此前独立复核绑定 `c46cdeb4a31957f474523f2f8254afaeaf34b804`；本次独立复核绑定 substantive head `872ba917f8cae15a27455a5948cd19b7abd7c508`。后续文档元数据提交不改 source/config/evidence，但必须取得其新 head Hosted 回执。规则为仓库当前 `AGENTS.md` / `AI_RULES.md`。
- PR / branch / worktree：PR #46（substantive head `872ba917f8cae15a27455a5948cd19b7abd7c508` 的 Hosted 回执已成功；本次提交为文档勘误 follow-up，实际 PR head 以 push 后 API 回读为准，base `8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`）；`codex/TASK-VERIFY-CONCURRENCY-002`；`D:/kk-studio/.worktrees/TASK-VERIFY-CONCURRENCY-002`
- Intent / Spec / Plan / Verification：本目录四份文档。

## 评审范围和方式

- 读取的真实 diff、实现、规范和证据：`playwright.config.ts`、`tests/browser`、task ledger、source105 verification/manifest、当前 intent/spec/plan/verification、当前 evidence manifest 和五档 receipt/report/resource 原件。
- 静态 review / 实际运行检查（逐项）：核对 base/source SHA；核对五档 JSON 的 `passed:447`、`retries=0`、workers、端口前后；核对 receipt hash 与 manifest；核对资源采样只含本次 runner 子树；核对没有 source/config diff；核对 PR #46 的 Hosted `verify`、`delivery`、`deploy-linux` 均以候选 head 成功完成。
- 未覆盖范围及原因：未执行合并，因此没有合并后 main 回读；真实 Provider 或 Mobile 仍不在范围内。Hosted CI 和当前 PR 状态已取得真实回执，但不能用当前 Hosted 绿灯推断历史 source105 首轮失败的根因已解决。
- self-review 与独立 review 的区别：self-review 负责记录命令和边界；本 review 重新读取原件与 SHA，独立判断是否可以标 DONE。

## Findings

| ID | P0–P3 | Pass | merge/release blocker | 文件/行或证据 | 重现与影响 | 处理/负责人 | 状态/复验 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IRV-CONC-001 | P2 | 否 | 否（阻断 DONE/根因已确定声明，不阻断当前诊断 PR） | 历史 source105 9 flaky 与当前五档证据 | 当前矩阵未复现历史首轮失败；资源压力只能支持假设，不能证明 Hosted 根因已解决 | root / 后续根因调查 | OPEN，有界 follow-up，任务保持 PARTIAL |
| IRV-CONC-002 | P2 | 否 | 否（合并后收口项） | verification 外部能力段、PR #46 | 当前 Hosted/PR 回执已取得；分支规则要求 squash 后回读 main，不能在合并前填充 | root / squash 后立即 fetch/readback | OPEN，当前 PR 门禁不阻断；main NOT VERIFIED until post-merge |
| IRV-CONC-003 | P3 | 是 | 否 | evidence manifest、各档 receipt | 证据固定 source、port、retries、hash，资源采样边界清楚 | root | CLOSED，本地证据复核通过 |
| IRV-CONC-004 | P1 | 是（经本次精确 head 绑定） | 是（已解除） | verification/review 的 reviewed head | c46 独立复核发现旧文档仍指向 6600/ff；本提交把 review 精确绑定到 c46，且未改变被复核内容 | root | CLOSED，后续 source/config/evidence/ledger 变化需重审 |
| IRV-CONC-005 | P2 | 是 | 是（已解除） | `ff195ed358296b47c903b23dc90fb2dd68c5ffd4` 与 delivery check | 6600 的 `docs/PROGRESS.md` 结构缺口已由后续 docs-only 同步提交补齐；当前 c46 delivery 为 0 violations | root | CLOSED，本地交付结构复核通过 |
| IRV-CONC-006 | P2 | 是（经本次边界勘误） | 否 | 各档 `receipt.json.gz` 的 `resourceBefore/resourceAfter` 与 `resources.jsonl.gz` | receipt 字段原先容易被误读为 runner subtree；现已明确为全机 node/msedge census，runner subtree 峰值只取 `resources.jsonl.gz`，并保留原始值 | root | CLOSED，边界说明已补齐；若改动采样脚本需重审 |

没有发现仍开放的 P0/P1 或当前 PR acceptance blocker；IRV-CONC-001/002 保持为 P2 follow-up，分别约束 DONE/根因声明和合并后 main 收口。降低并发不会被记录为修复。

## 适用门禁

| 门禁 | 真实结果 | 证据与 SHA/时间 | 未满足的影响 |
| --- | --- | --- | --- |
| Self-review | PASS | verification/plan 与五档原件 | 无 |
| 独立 AI review | PASS WITH FOLLOW-UPS（substantive head） | 本文件；本次绑定 `872ba917f8cae15a27455a5948cd19b7abd7c508` | 根因和合并后 main 仍是有界 follow-up，不把它们写成已解决 |
| CI / 定向回归 | PASS（本地与 Hosted substantive head） | 本地 1/2/4/8/12，447/447，retries=0；PR run `37971288430` 与 push run `37971283525` 的 `verify`、`delivery`、`deploy-linux` 均 success，head 精确为 `872ba917` | Hosted 绿灯仍不等价于历史根因已确定 |
| GitHub 实际审批数量/身份 | PASS（平台要求 0，实际 0） | PR #46 状态 open、mergeable clean；规则回读显示 required approvals 0 | AI review 已独立完成，不能用作者自批代替 |
| 用户 UI/交互/产品验收 | NOT RUN | 用户授权了继续验证与合并准备；本任务没有产品行为变更或独立 UI 验收 | 不能把技术授权扩展为已完成产品验收 |
| 推送/合并/发布授权 | 推送已授权并完成；合并待新 docs-only head Hosted 回读 | 用户明确要求“检验并且合并提交”；AC-1–AC-3 与当前 substantive head 门禁通过，IRV-CONC-001/002 为不阻断当前 PR 的有界 follow-up | 新 head checks clean 后按默认 squash；合并后立即 main readback |
| 恢复/回滚实证（适用） | N/A | 无产品改动 | 无 |

## 结论

- PASS WITH FOLLOW-UPS（substantive head `872ba917`）；任务保持 PARTIAL，不把根因或 main 回读写成 DONE。
- 当前 PR 的 P0/P1 与 acceptance blockers 为零。IRV-CONC-001 仍阻断根因已确定/DONE 声明；IRV-CONC-002 是合并后 main readback 收口项；二者均不阻断当前技术诊断 PR 的 squash merge。
- 当前 Hosted `verify` 默认沿用 Playwright 配置的 `retries: 1`，不能覆盖历史首轮失败的根因问题；AC-4 要求显式保留这一边界。
- 后续 source/config/evidence/ledger 变化会使本 review 失效并要求重审；本次文档 follow-up 不改被测 source/config/evidence，形成新 head 后仍须取得新 Hosted 回执。
- 本结论不代替合并、发布或用户最终验收。

## 追加勘误

- 2026-10-10：`9b023969` / `37966523539` 标记为 prior；substantive head `872ba917` 的 PR/push runs `37971288430` / `37971283525` 均 completed/success。按 `spec.md` 勘误，IRV-CONC-001 是 DONE/根因声明 follow-up，IRV-CONC-002 是 post-merge main readback follow-up；不能把二者默认为当前 PR merge blocker。
- 后台采集异常已在 verification 的追加勘误中说明，未被当作正式 PASS/FAIL。
