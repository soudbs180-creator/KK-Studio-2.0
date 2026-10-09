# Review：浏览器并发失败原因与隔离复核

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 时间与时区：2026-10-10，最终文档提交后
- Reviewer/context/工具或模型（已知时）：独立只读审计上下文；PowerShell、Git、Node JSON 解析
- 独立于实现上下文：是；reviewer 未参与矩阵运行或文档编写，仅读取最终 diff、规则、任务账本和压缩证据。
- Base SHA / reviewed head / 规则版本：base `8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`；实质证据与文档提交为 `6600c40d29e239f914471722e8267bbce5e7143d`，其后 `ff195ed358296b47c903b23dc90fb2dd68c5ffd4` 仅修改 `docs/PROGRESS.md`，当前分支 head 为该 docs-only successor；规则为仓库当前 `AGENTS.md` / `AI_RULES.md`。
- PR / branch / worktree：无 PR；`codex/TASK-VERIFY-CONCURRENCY-002`；`D:/kk-studio/.worktrees/TASK-VERIFY-CONCURRENCY-002`
- Intent / Spec / Plan / Verification：本目录四份文档。

## 评审范围和方式

- 读取的真实 diff、实现、规范和证据：`playwright.config.ts`、`tests/browser`、task ledger、source105 verification/manifest、当前 intent/spec/plan/verification、当前 evidence manifest 和五档 receipt/report/resource 原件。
- 静态 review / 实际运行检查（逐项）：核对 base/source SHA；核对五档 JSON 的 `passed:447`、`retries=0`、workers、端口前后；核对 receipt hash 与 manifest；核对资源采样只含本次 runner 子树；核对没有 source/config diff。
- 未覆盖范围及原因：没有 Hosted CI、PR approval、合并后 main、真实 Provider 或 Mobile；这些依赖外部回执，不能用本地证据代填。
- self-review 与独立 review 的区别：self-review 负责记录命令和边界；本 review 重新读取原件与 SHA，独立判断是否可以标 DONE。

## Findings

| ID | P0–P3 | Pass | merge/release blocker | 文件/行或证据 | 重现与影响 | 处理/负责人 | 状态/复验 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IRV-CONC-001 | P2 | 否 | 是（对 DONE/merge 声明） | 历史 source105 9 flaky 与当前五档证据 | 当前矩阵未复现历史首轮失败；资源压力只能支持假设，不能证明 Hosted 根因已解决 | root / 后续 Hosted 与 main 回读 | OPEN，保持 PARTIAL |
| IRV-CONC-002 | P2 | 否 | 是（对普通 PR/main 关闭） | verification 外部能力段 | 当前没有 Hosted/PR/合并后 main 收据 | root / 外部回执可用后复验 | OPEN，NOT VERIFIED |
| IRV-CONC-003 | P3 | 是 | 否 | evidence manifest、各档 receipt | 证据固定 source、port、retries、hash，资源采样边界清楚 | root | CLOSED，本地证据复核通过 |
| IRV-CONC-006 | P2 | 是（经本次边界勘误） | 否 | 各档 `receipt.json.gz` 的 `resourceBefore/resourceAfter` 与 `resources.jsonl.gz` | receipt 字段原先容易被误读为 runner subtree；现已明确为全机 node/msedge census，runner subtree 峰值只取 `resources.jsonl.gz`，并保留原始值 | root | CLOSED，边界说明已补齐；若改动采样脚本需重审 |

没有发现应修改产品或测试断言的 P0/P1 finding；降低并发不会被记录为修复。

## 适用门禁

| 门禁 | 真实结果 | 证据与 SHA/时间 | 未满足的影响 |
| --- | --- | --- | --- |
| Self-review | PASS | verification/plan 与五档原件 | 无 |
| 独立 AI review | PASS WITH FOLLOW-UPS | 本文件；最终 head 绑定后有效 | 根因和外部推广仍开放 |
| CI / 定向回归 | PASS（本地定向矩阵） | 1/2/4/8/12，447/447，retries=0 | 不等价于 Hosted |
| GitHub 实际审批数量/身份 | NOT RUN | 无 PR | 不能合并 |
| 用户 UI/交互/产品验收 | NOT RUN | 用户尚未做产品验收 | 不能发布 |
| 推送/合并/发布授权 | NOT RUN | 用户未授权外部发布动作 | 保持本地分支 |
| 恢复/回滚实证（适用） | N/A | 无产品改动 | 无 |

## 结论

- PASS WITH FOLLOW-UPS（本地诊断证据，审查范围为 `6600c40d29e239f914471722e8267bbce5e7143d` 及其 docs-only successor `ff195ed358296b47c903b23dc90fb2dd68c5ffd4`）；任务不满足 DONE。
- 未关闭 blocker：历史 Hosted 根因 UNKNOWN；Hosted/PR/普通合并/main 回读缺失。
- 非阻断后续任务与理由：可在远端回执可用后用同一 source/head 重跑并更新 ledger；若新 main 或 Hosted 失败，再按实际失败做最小修复。
- 后续 source/config/evidence/ledger 变化会使本 review 失效并要求重审；`ff195ed358296b47c903b23dc90fb2dd68c5ffd4` 已核对为仅同步 `docs/PROGRESS.md` 的 docs-only successor。
- 本结论不代替合并、发布或用户最终验收。

## 追加勘误

- 无。后台采集异常已在 verification 的追加勘误中说明，未被当作正式 PASS/FAIL。
