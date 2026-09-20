# Verification — TASK-GOV-001

状态：TASK-GOV-001 的治理本地验收 DONE；源提交 987c908 已从干净 worktree 重建并通过完整验证，最新 Desktop 基础运行检查通过。完整产品和主线整合尚未达到DoD。57节治理要求的审计映射见 audit.md。

## 来源与隔离

- 原checkout D:/kk-studio-next：codex/desktop-data-stability @609f524，178项dirty。仅添加Git worktree登记和info/exclude，没有修改原源码或原索引。
- 用独立GIT_INDEX_FILE捕获限定源码/测试/配置/docs形成29d0d9b（chore/TASK-BASE-001-source-snapshot）。排除临时脚本、pnpm文件、shortcuts/backups、运行数据和自动生成截图。原始源码hash清单留在原目录.tmp/governance-20260917/source-manifest.json。
- 工作在独立chore/TASK-GOV-001-engineering-baseline。曾因在diff中临时关闭autocrlf导致CRLF被误报为行尾空白；检查原始字节并用正常Git行尾规则复核后无真实whitespace错误。未修改源码行尾以掩盖检查。
- 初始npm ci成功；基线verify日志确认104Node、139Edge、UI116/0/typecheck/format/build通过。最初所谓定向npm参数放在文件glob后，实际执行全105项，不能把它称为过滤运行。

## 实际结果

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| npm run verify | PASS | .tmp/governance/final-verify.log |
| lint (ESLint10 + governance) | PASS，0违规 | 同上；25项账本与导入边界 |
| npm run typecheck | PASS | 同上 |
| npm test | 111/111 PASS | 同上；Node24本机HTTP、SQLite及进程重启测试，不是付费API |
| npm run ui:check | 116文件/0违规 | 同上 |
| npm run format:check | PASS | src/tests/scripts/config；不以格式代替行为 |
| Vite production build | PASS | index-Bsm9uCZD.js / index-CMZpbv5y.css |
| production Edge browser suite | 139/139 PASS，无flaky | 127.0.0.1:1423，Playwright自建preview strictPort |
| cargo test --manifest-path src-tauri/Cargo.toml --no-default-features --locked | 36/36 PASS | .tmp/governance/rust-tests.log |
| cargo fmt --manifest-path src-tauri/Cargo.toml --check | PASS | .tmp/governance/rust-format.log |
| npm run client:check | PASS | .tmp/governance/client-check.log |
| git diff --check | PASS | 原行尾配置 |

上表保留第一次完整验证。独立复核修正后，在全新 detached worktree `D:/kk-studio-next/.worktrees/TASK-GOV-001-verify` 从 `987c908aeaf508293f277f121e900883f3f2702a` 执行 `npm ci`（177 packages，audit 0 vulnerabilities）和 `npm run verify`，均 exit 0。最终结果为 **115/115 Node、139/139 Edge、0 skipped/0 flaky/0 unexpected、UI116/0、lint/typecheck/format/build PASS**。Rust tests 36/36、fmt、client:check 和 client:build -- --no-bundle 也再次通过。

持久证据：[verification.json](../../evidence/governance-2026-09-17/verification.json)、[完整 verify 输出](../../evidence/governance-2026-09-17/verify-output.txt)。独立源码快照的生产 JS 与任务工作树重建产物 SHA-256 相同。原 checkout 664 项文件 hash 与开始时的 manifest 全部一致，Git status 仍178项、原索引未改变。

测试涵盖读失败保护、保存重试、revision冲突、原生文件故障/原图完整性、项目图恢复、审批、批量部分结果、取消和运行态交互。初始ESLint34项错误已修复，没有关闭有效规则或忽略出错文件。

## 真实修复与回归边界

- 底层Provider deadline前/时/后，未来注入时钟，missing deadline、quarantined/disabled/degraded、满载、错误能力/操作均有测试；尝试资格不写入假health成功。
- Host Provider JSON外部边界改为unknown，并安全读取object/array；错误数组/空项/非字符串URL的HTTP200响应保持uncertain，不触发重复提交。
- ESLint、账本结构/依赖环/外部阻塞/证据及边界import检查是实际脚本。远端CI文件不等于CI已运行，保护规则也未启用。
- 无UI布局改动；JSX全角空格改为显式unicode表达式，保持原呈现。未重新读取Figma，不宣称全画面一致。Route/import仍src/main.tsx→App.tsx，浏览器检查只对本次生产产物有效。
- 自审发现App默认连接fallback/pinned入口能绕过调度；任务TASK-PROV-001继续处理，不能将helper验证推广到整个Provider产品路径。
- 实时Figma、真实外部Provider/ComfyUI、VPS、Mobile、完整T3a原生素材恢复验收：NOT VERIFIED；不以旧截图或历史测试覆盖。

## 最终运行链路

- import：`src/main.tsx → src/App.tsx`；App state 切换 landing/settings，URL route 均 `/`。
- Development：`npm run dev -- --host 127.0.0.1 --port 1421 --strictPort`，实际 `http://127.0.0.1:1421/`、development、`/src/main.tsx`。验证打开设置、主题保存刷新恢复、Escape关闭，console/page errors=0。
- Preview：上述干净 checkout 的 `npm run verify` 通过 Playwright 自建 strictPort 1423 preview，运行139项实际Edge浏览器测试。
- Desktop：`npm run client:build -- --no-bundle` 后启动本任务的 `src-tauri/target/release/kk-studio.exe --data-dir <绝对隔离目录>`，同时指定独立 `WEBVIEW2_USER_DATA_FOLDER`。先用 IPC `get_storage_root` 断言隔离根，再验证上述设置交互；实际 `http://tauri.localhost/`、production、`index-Bsm9uCZD.js`，console/page errors=0。最终正常 CloseMainWindow 退出，仅操作本轮创建的 PID。
- [开发端 DOM](../../evidence/governance-2026-09-17/dev-runtime.json)、[桌面 DOM](../../evidence/governance-2026-09-17/native-runtime.json)、[桌面退出](../../evidence/governance-2026-09-17/native-close.json)、[开发设置截图](../../evidence/governance-2026-09-17/dev-settings.png)、[桌面设置截图](../../evidence/governance-2026-09-17/native-settings.png)。截图等待动画结束；这是运行证据，不是实时Figma设计验收。

## 整合与后续

原工作区保持原状态。没有remote，不伪造PR或merge；本轮范围提交为987c908，最后补交文档和证据不改变被验证的产品/测试源。待审PR内容已写入pr.md，主线整合仍属T0/EXT-GIT。

子代理早期容量失败，后续 repo_audit 只读复核成功：指出 DONE 可接受失败、active 隔离冲突、Node bare/index 导入绕过、浏览器持久化文档冲突及贡献门禁不一致；已修复并补治理/AST边界回归（最终7/7）。路径规范化用例先复现失败，再修复通过；代理复核未发现本次范围内剩余可行动问题。剩余产品实现/外部条件以docs/governance/task-ledger.json为权威。
