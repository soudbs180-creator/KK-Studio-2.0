# 2026-10-10 主线合并回读

## 合并范围

当前本地 `main` 已包含远端并发收口合并 `7557fb08`，以及以下三个已完成供应商分支的变更：

- `fix/TASK-PROV-005-provider-durable-config` → `2dcd2634`
- `fix/TASK-PROV-006-provider-gates` → `60adacc2`
- `fix/TASK-PROV-007-capacity-errors` → `e1ae063d`

合并过程中保留当前主线的治理账本和 Codex 画布门禁，只把对应任务条目和实现变更接入主线。之后的收口提交为 `bfa227c8`，当前完整 SHA 为 `bfa227c843056e9db943013b367dd7b67565466e`。

## 当前主线验证

| 检查 | 结果 |
| --- | --- |
| `npm run lint` | PASS；governance 118 tasks / 0 violations，features 36 / 0，Markdown 114 / 0 |
| `npm run typecheck` | PASS |
| `npm run format:check` | PASS |
| `node scripts/check-ui-standards.mjs` | PASS；215 files / 0 violations |
| `npm test` | 919 PASS / 8 SKIP / 0 FAIL（927 tests） |
| `npm run test:agent` | 172 PASS / 2 SKIP / 0 FAIL（174 tests） |
| `cargo fmt --check` | PASS |
| `cargo check` | PASS |
| `cargo test --bin kk-studio` | 110 PASS / 0 FAIL |
| `tests/desktop/provider-durable-config.mjs` | 8/8 PASS；证据 sourceHead 绑定当前主线 SHA |
| `tests/browser/task-intent.spec.ts` | 13/13 PASS；包含 Desktop provider config mock 与 durable intent failure 场景 |

完整浏览器套件在单 worker 主工作区运行时为 455/455 PASS；画布背景缩放任务的 50% 隐藏、400% 最大尺寸、连续插值与平铺行为均已通过浏览器回归。

## 未合并分支处理

带未提交改动的工作树、账本为 `TODO`/`PARTIAL`/`REVIEW` 的分支、缺少 Hosted/真实 Provider/用户验收证据的分支，以及基于旧主线且会覆盖当前实现的历史快照均未强行合并。当前主线保留这些分支和原始工作树，等待各自补齐证据后再单独审查。

远端 fetch/push 仍受代理网络限制；本次只完成本地合并和提交，没有宣称远端已同步。
