# Verification：浏览器并发失败原因与隔离复核

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 记录状态：FINAL（本地诊断范围；外部推广仍未验证）
- 执行时间与时区：2026-10-09 23:46–2026-10-10 00:13 Asia/Shanghai（UTC 收据见 evidence）
- Intent / Spec / Plan / AC：本目录 `intent.md`、`spec.md`、`plan.md`；AC-1–AC-4
- cwd / branch：`D:/kk-studio/.worktrees/TASK-VERIFY-CONCURRENCY-002` / `codex/TASK-VERIFY-CONCURRENCY-002`
- 被验证 base SHA / tested source head / tree SHA：base 与 tested source head 均为 `8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`；tested source tree 为 `ede7a1b181b01e84cf49f89621ca265ea62e1d4b`。诊断证据与五件套的实质提交为 `6600c40d29e239f914471722e8267bbce5e7143d`；其后 `ff195ed358296b47c903b23dc90fb2dd68c5ffd4` 只同步 `docs/PROGRESS.md`，未改 source/config/evidence/ledger。当前分支 head 为 `ff195ed358296b47c903b23dc90fb2dd68c5ffd4`；review 绑定实质提交及该 docs-only successor，避免用自引用的当前提交哈希伪造可验证 head。
- dirty 状态及 patch/文件指纹：运行矩阵前 source worktree clean；生产 dist、node_modules 和 `.tmp` 收据为 ignored runtime artifacts；源代码/config 无修改。
- Node/npm/Rust/浏览器/OS/工具版本：Node `v24.20.0`、npm `11.19.0`、Vite `7.3.6`、Playwright `@playwright/test`（lockfile）、Windows x64、Edge channel `msedge`；Rust 不适用。
- 规则版本或 commit：仓库当前 `AGENTS.md` / `AI_RULES.md` 及 `docs/engineering/{SDLC,BRANCH-POLICY,REVIEW}.md`；规则未改。

## 实际命令和结果

| 命令/检查 | 时间 | 退出码 | PASS/FAIL/NOT RUN/N/A | 证据路径 | 范围与限制 |
| --- | --- | ---: | --- | --- | --- |
| `npm ci --no-audit --no-fund` | 2026-10-09 | 0 | PASS | worktree install log；依赖状态由 lockfile 定义 | 运行 postinstall，未修改源文件 |
| `npm run build` | 2026-10-09 | 0 | PASS | build output；同一 `dist` 被五档复用 | Rollup warning 仅来自 zod 注释，未影响 exit 0 |
| `node node_modules/@playwright/test/cli.js test --workers=1 --retries=0` | 2026-10-09/10 | 0 | PASS | `evidence/workers-1/{browser-results.json.gz,console.log.gz,receipt.json.gz,resources.jsonl.gz}` | 447/447，0 retry |
| `node node_modules/@playwright/test/cli.js test --workers=2 --retries=0` | 2026-10-10 | 0 | PASS | `evidence/workers-2/*` | 447/447，0 retry |
| `node node_modules/@playwright/test/cli.js test --workers=4 --retries=0` | 2026-10-10 | 0 | PASS | `evidence/workers-4/*` | 447/447，0 retry |
| `node node_modules/@playwright/test/cli.js test --workers=8 --retries=0` | 2026-10-10 | 0 | PASS | `evidence/workers-8/*` | 447/447，0 retry |
| `node node_modules/@playwright/test/cli.js test --workers=12 --retries=0` | 2026-10-10 | 0 | PASS | `evidence/workers-12/*` | 447/447，0 retry |

固定条件：同一 source `8090475`、同一次 production build、`KK_TEST_PORT=1423`、Vite preview `--strictPort`、`reuseExistingServer:false`、Edge、retries=0。每档 `portBefore=[]` 且 `portAfter=[]`；每档 browser JSON 的结果状态为 `passed:447`。receipt 中的 `resourceBefore/resourceAfter` 是运行器脚本用全机 `node/msedge` 进程快照记录的 census（不含 PID/root，因此不作为 runner subtree 峰值）；runner subtree 的可追溯资源边界以 `resources.jsonl.gz` 为准。

## 验收覆盖

| AC | 平台/状态 | 预期 | 观察结果 | 证据 | PASS/FAIL/NOT VERIFIED |
| --- | --- | --- | --- | --- | --- |
| AC-1 | Web/历史边界 | 首轮失败和来源不被覆盖 | source105 9 flaky 与原始压缩证据仍在旧目录；本目录只追加当前结果 | `docs/changes/2026-10-09-windows-entry-diagnostics/verification.md`、旧 manifest、当前 `evidence/manifest.json` | PASS |
| AC-2 | Web/Edge/retries=0 | 1/2/4/8/12 不靠 retry 隐藏失败 | 五档均 447/447，结果数组只有 `passed:447` | 各档 `browser-results.json.gz`、receipt | PASS |
| AC-3 | Web/资源采样 | 可以比较并发、进程和内存条件 | `resources.jsonl.gz` 的 runner subtree 峰值：1→16/2.07 GiB，2→24/2.96 GiB，4→43/4.67 GiB，8→78/7.82 GiB，12→114/10.75 GiB；最低空闲内存约 21.4/20.6/19.7/17.9/16.5 GB。receipt 的 `resourceBefore/resourceAfter` 另作为全机 node/msedge census 保留 | 各档 `resources.jsonl.gz` 与 receipt | PASS（边界已记录） |
| AC-4 | 工程治理 | 不把本机绿化写成根因修复 | 当前 12 workers 未复现历史 9 flaky；资源压力是假设，不是已证实根因；Hosted/PR/main 仍未回读 | 本文件、`review.md`、ledger | PARTIAL |

## UI / 运行态证据

- 实际启动命令、cwd 与进程：从 worktree 运行 Playwright CLI；每档由配置启动并清理 Vite preview。`resources.jsonl` 只追踪本次 runner 子树并逐快照回溯 root；receipt 的 `resourceBefore/resourceAfter` 是全机 node/msedge census，二者不混称。
- URL/端口、Vite development / Vite preview / Tauri release：`http://127.0.0.1:1423`，Vite production preview；不涉及 1421 development 或 Tauri。
- route → import → 页面/组件链：完整 browser suite 通过现有测试入口覆盖；本任务未改页面。
- data-runtime-mode / data-runtime-entry / index script：未改产品 bundle；不重复声称 UI 视觉验收。
- Web bundle hash、Tauri EXE hash、数据根目录/profile：同一 build dist 由本地运行使用；Tauri/用户数据不适用。
- Figma 当前 URL/node/读取结果、同状态与工程补充边界：不适用，任务无 UI 变更。
- 视口、动态文案、交互/键盘/错误/取消/离线：由 447 browser cases 覆盖，五档均无失败。
- DOM、computed style、截图与日志路径：不新增截图；原始 console/JSON/资源日志在 evidence 压缩件。
- 原生重启/恢复/安装验证与范围：不适用。

## 外部能力与真实性

- 本地 fixture 验证范围：完整本地 production preview + Edge fixture。
- live Provider/ComfyUI/GPU/账号/账单/部署验收及凭据授权来源：NOT RUN；没有发送真实 Provider 请求。
- live eval 的模型、规则版本、样例、预算上限、run ID、结果：NOT RUN。
- 远端 PR/CI/ruleset 回读与时间：NOT RUN；此前 fetch 受网络代理失败，不能推断 Hosted/main 状态。
- 未验证事项、外部条件和不受影响的本地工作：Hosted 当前结果、普通 PR、合并后 main、历史 Hosted 9 flaky 根因均 UNKNOWN/NOT VERIFIED；本地资源采样不能替代这些回执。

## 结论和后续

- 实现：PARTIAL（诊断证据与文档完成；无产品修复）
- 验证：PARTIAL（本地矩阵 PASS；外部推广和历史根因 NOT VERIFIED）
- 产品能力：Web 本地 production browser regression 已按五档验证；Desktop/Mobile/真实 Provider 未涉及。
- 独立 review 记录与审查 SHA：本目录 `review.md`；review 绑定实质提交 `6600c40d29e239f914471722e8267bbce5e7143d` 及其后仅改 `docs/PROGRESS.md` 的 `ff195ed358296b47c903b23dc90fb2dd68c5ffd4`。
- 用户产品验收和发布授权：未发生；用户授权的是继续技术工作，不包含发布/合并。
- 未关闭风险与账本 ID：`TASK-VERIFY-CONCURRENCY-002`（根因 UNKNOWN、Hosted/main 未回读）、`TASK-VERIFY-ORIGIN-003`（端口/来源契约）、`TASK-WINDOWS-ENTRY-RECOVERY-003`（Hosted Windows 原因）。
- 新 SHA 或配置变化后需要的复验：任何 `tests/browser`、`playwright.config.ts`、Vite、Edge/Node 版本变化都必须重跑受影响矩阵；合并后必须在新 main 重新读取结果。

## 追加勘误

- 2026-10-10：首次后台 `Start-Process` 采集因 Playwright 清理 `test-results` 和 stderr 管道行为产生不稳定目录；停止本次自启 runner/preview，未把其结果计入矩阵。随后改用前台直接执行，证据写入 `.tmp` 后立即复制到本目录；五档正式结果均来自直接命令，旧历史记录未覆盖。
