# 测试规范

本文件定义 KK Studio 的测试分层、覆盖要求、运行契约和证据保存方式。测试目的是证明用户契约成立，不是刷通过数字。

流程与角色分工见 [SDLC](SDLC.md)，命令与运行入口见 [DEVELOPMENT](DEVELOPMENT.md)，严重度与审查见 [REVIEW](REVIEW.md)。

## 分层与落点

测试按「最快能证明什么」分层。新测试必须落在能真实证明目标的那一层。

| 目录 | 数量 | 运行器 | 证明什么 |
| --- | --- | --- | --- |
| `tests/unit/` | 218 文件 | `node --test` | 领域规则、纯函数、序列化、契约边界 |
| `tests/deploy/` | 2 文件 | `node --test` | 发布脚本、回滚流程 |
| `tests/browser/` | 128 文件 | Playwright（Edge） | 真实渲染、交互、布局、视觉回归 |
| `tests/desktop/` | 26 文件（20 `.mjs` + 6 `.ps1`） | `node` / `powershell` | Tauri 宿主、安装器、窗口、原生能力 |
| `tests/local-service/` | 2 文件 | `node` | 本地服务 HTTP 集成与生产冒烟 |
| `tests/development/` | 1 文件 | `node` | 插件装载等开发态行为 |
| `tests/helpers/` | `agentServer.ts`、`designSystem.ts` | 被引用 | 共享夹具，禁止含断言 |
| `tests/support/` | `pluginFlow.mjs` | 被引用 | 插件流程支撑 |
| `tests/fixtures/` | `image-edit-schema.json`、`stage-project.ts`、`project-package/` | 被引用 | 固定输入样本，禁止修改后仍沿用旧结论 |
| `tests/evals/` | `agent-contract.json` | 被引用 | AI 场景回归契约 |

分层判定：

- 只涉及数据形状与转换 → `unit`，不要为此起浏览器。
- 依赖真实 DOM 尺寸、CSS 计算值、点击命中 → `browser`。
- 依赖 WebView2、Tauri 命令、安装器、窗口拖拽 → `desktop`。
- 依赖真实服务进程与端口 → `local-service`。

## 运行命令

根单元入口预加载 `tests/support/public-entry-loader.mjs`：公开切片出口也导出UI，使用已安装TypeScript编译TSX并解析既有无后缀相对导入。仅Node单测忽略CSS模块执行；实际样式、顺序和DOM继续由生产Edge检查，不把该loader用于产品构建。Mobile和随包Agent保留各自运行器。

| 命令 | 覆盖 |
| --- | --- |
| `npm test` | `tests/unit/*.test.ts` + `tests/deploy/*.test.mjs` |
| `npm run test:ui` | 先 `npm run plugins:build` 与 `npm run build`，再 Playwright 跑 `tests/browser/` |
| `npm run test:agent` | `vendor/canvas-agent` 自身测试 |
| `npm run local-service:test` / `local-service:smoke` | 本地服务集成 / 生产冒烟 |
| `npm run test:development` | 插件装载 |
| `npm run test:design` | DESIGN.md 同步/校验与不执行 HTML 的单测、独立预览构建、真实 Edge 控件回归 |
| `npm run client:installer:test` / `client:taskhost:test` | 安装器 / 任务宿主生命周期 |
| `npm run verify` | lint + typecheck + test + agent:build + test:agent + ui:check + format:check + test:ui + test:design + test:development |

`npm run verify` 是合并前的**主闸门**，串联 lint、typecheck、test、agent:build、test:agent、ui:check、format:check、test:ui、test:design、test:development 共 10 步；Agent 必须真实编译通过，不能只用可执行 TS 测试代替构建。test:design 在产品浏览器之后串行运行，避免占用同一 1423。

它**不包含**：Rust/cargo 检查、`tests/desktop/`（26 个文件：20 `.mjs` + 6 `.ps1`）、`tests/local-service/`、`tests/proxy`、`test:gateway`。涉及 Desktop、Rust、本地服务或真实外部服务的改动必须按本文件「桌面与 Rust 测试」与 [DEVELOPMENT](DEVELOPMENT.md) 单独补跑相应检查。

只跑 `npm test` 不构成完整验证；只通过构建也不构成验收。

## Playwright 运行契约

`playwright.config.ts` 的固定配置，改动需同步本节：

| 项 | 值 |
| --- | --- |
| `testDir` | `./tests/browser` |
| 端口 | 固定 `1423`；显式 `KK_TEST_PORT` 仅接受 `1423` |
| `baseURL` | `http://127.0.0.1:1423` |
| 浏览器 | `channel: "msedge"`（真实 Edge，不用 Chromium 替身） |
| 视口 | 1920 × 1080 |
| `timeout` | 30000 |
| `retries` | 1 |
| `reuseExistingServer` | `false` |
| 报告 | `list` + 每轮独立的 `test-results/browser/<run-id>/browser-results.json`，metadata记录源码HEAD |

### 端口

- Playwright 自己拉起 preview，生产验收固定使用 `1423`，`--strictPort`；若显式 `KK_TEST_PORT` 不是 `1423`，配置在启动测试前直接拒绝。
- `reuseExistingServer: false` 是刻意设置：复用旧进程会让测试跑到过期 bundle 上，产生假绿。端口被占用时应先清理占用进程，**不得**改成随机端口或 `reuseExistingServer: true` 绕过。
- 固定占用 `1421`（Vite dev）与 `1423`（Playwright preview）的运行验证必须串行，不能为跑测试杀掉其他任务的进程。
- 独立设计预览使用 design/preview/playwright.config.ts、同一固定1423与共享Edge参数，独占分配test-results/design-md/<run-id>/；报告在run根、截图/trace在artifacts内。预览不读写产品storage，其通过不能替代产品和Desktop验收。
- 证据里必须写明实际端口。旧端口、旧窗口的截图不能作为当前源码的验证依据。

### retries 不得掩盖失败

`retries: 1` 是为吸收已知的偶发环境噪声，不允许用它把真实缺陷重试成绿色。判定规则：

- 首次失败即视为缺陷信号，先查原因再决定是否重跑。
- 报告 `0 failures` 时若同时存在 `flaky`，必须逐条列出 flaky 项与归因，不能只报总数。
- 靠提高 retry 次数、延长 timeout、放宽断言让测试变绿，属于掩盖缺陷，评审按 P1 处理。
- 已确认的偶发项要在 `docs/changes/<date>-<slug>/verification.md` 写清根因和处理，而不是调参绕过。

## 覆盖要求

每个功能按 [SDLC](SDLC.md) 的风险分级补覆盖。至少覆盖：

1. **用户主路径**：功能在真实状态转换下成立。
2. **故障路径**：错误、缺失、超时、断网、宿主不可用。
3. **取消与中断**：取消后不留半成品状态，不产生迟到写入。
4. **重复提交**：连点、重复回车、重试不产生重复任务。
5. **迟到响应**：过期响应不覆盖新状态。
6. **恢复**：刷新、重启、异常退出后能恢复到一致状态。
7. **跨端差异**：Web 与 Desktop 行为一致的部分与刻意不一致的部分，都要有说明。

无测试覆盖的「已完成」在交付包中要显式声明缺口，不能靠构建通过掩盖。

### 断言纪律

- 断言用户可见契约，不断言实现细节。改内部结构导致测试大面积失败，说明断言写错了位置。
- 禁止编写复述实现的假测试（断言一个刚写出的常量等于它自己）。
- 禁止删减有效断言让测试通过。修正被证实过时的断言时，必须在交付包记录产品契约依据、前后差异与复核结论。
- 快照（snapshot）必须人工审阅差异，不接受盲更新。

### 隔离要求

- 测试之间不共享可变状态；每个测试自建自清 fixture。
- 普通浏览器编辑场景使用明确version3并经serializeCreationSnapshot处理的canonical种子；page.goto后不得把emptySnapshot默认的v2写回已迁移的仓库。仅专门验证旧格式迁移/兼容的场景保留v2，不能清空IDB或标记绕过降级保护。
- 固定夹具放 `tests/fixtures/`，修改夹具内容必须重跑受影响测试并更新证据，不允许「改了夹具沿用旧结论」。
- 测试不得写生产目录。禁止把运行产物、日志、截图直接写进 `docs/`。
- 需要清理输出目录时使用独立临时目录（如 `.tmp/pw-out-default`），不要清空被其他任务共用的 `test-results/`。
- 显式浏览器截图必须在内联options中直接使用当前testInfo.outputPath，禁止固定写回test-results旧路径；单测AST守卫检查当前全部截图调用；quoted路径同等检查，条件/变量options/shorthand/spread未知形态失败关闭。控制进程分配唯一run并传给worker，报告和worker/重试产物须在同一run内。
- 默认Playwright仅清理新建run目录中的`artifacts/`，不得把`test-results/`本身作为outputDir；旧报告、开发态receipt和截图留在原处。共享分配器通过独占mkdir拒绝已有目录、文件和链接，不自动清理历史证据。
- 开发态默认写入`test-results/development-plugins/<run-id>/`，原生插件恢复写入`test-results/desktop-plugin-recovery/<run-id>/`；显式`KK_PLUGIN_EVIDENCE_DIR`必须是本次尚未存在的新目录，冲突在启动服务/客户端前失败。运行前仍须确认CLI覆盖参数及外部工具不会扩大清理范围；若会清理既有路径，先完整备份全部报告/回执/截图并核对清单和hash，不能只备份JSON摘要。

## 桌面与 Rust 测试

Rust 侧：`cargo test --manifest-path src-tauri/Cargo.toml`、`cargo fmt --check`、`cargo check`。命名建议 `Tauri release 具备 desktop_<模块>_<行为> 语义`，避免与前端测试同名导致 CI 日志无法区分。

Desktop 侧：`tests/desktop/*.mjs` 覆盖安装器、窗口、原生菜单、任务宿主；`*.ps1` 覆盖 Windows 专属路径。执行前确认目标构建产物是当前候选，旧 exe 上的通过结果无效。

注意：Vite 构建成功不能验证 Desktop。Desktop 需要重新构建并启动对应 release 产物后单独验证。

## 证据保存

测试通过只是一次运行结果，验收依赖可回溯证据。规则见 [DEVELOPMENT](DEVELOPMENT.md) 的证据章节，这里只列测试相关的最小要求：

1. 每次交付在 `docs/changes/YYYY-MM-DD-task-slug/verification.md` 记录实际执行的命令与真实数字（用例数、失败数、flaky 数）。
2. 记录当次运行的 base/head SHA、工作目录（worktree 路径）、端口。
3. UI 相关证据记录 route、入口脚本（`/assets/index-*.js`）、运行模式（development / production preview / Tauri release），三者不可混用。
4. 失败的历史证据保留当时含义，勘误用追加方式，不改写失败日志、测试数字或截图让结果看似成功。
5. 证据目录按 `docs/evidence/YYYY-MM-DD-<主题>/` 组织。

## AI 场景回归

改动 `AGENTS.md`、`AI_RULES.md`、提示词或门禁脚本时，按 [AI-EVALS](AI-EVALS.md) 跑 `tests/evals/agent-contract.json` 定义的场景回归。静态检查通过不等于 live 模型评估通过；无模型凭据或预算时保留场景定义并转人工独立复核，不谎报评估结果。

## 新增测试的检查清单

- [ ] 落在能真实证明目标的那一层，不是为了凑数量放在更高层。
- [ ] 文件命名符合 `camelCase.test.ts` / `camelCase.spec.ts`。
- [ ] 覆盖了失败路径，不只是成功路径。
- [ ] 无外部状态依赖，可重复运行。
- [ ] 未写入生产目录，未污染共享输出目录。
- [ ] `npm run verify` 通过；flaky 项已逐条说明。
- [ ] 交付包 `verification.md` 已记录真实数字与运行身份。

参考：[Node.js Test Runner](https://nodejs.org/docs/latest/api/test.html)、[Playwright Configuration](https://playwright.dev/docs/test-configuration)、[Rust 测试](https://doc.rust-lang.org/book/ch11-01-writing-tests.html)。

### 测试证据保护回归

`node tests/desktop/test-evidence-preservation.mjs`仅在Windows使用已经接入GDI保护的真实Edge，先校验保护再打开自有本地合成页面；正常/主动失败均核对旧PNG/report原字节、新真实PNG签名与report同run。probe使用独立临时profile、无Vite/用户数据/外部Provider，预期失败只属于夹具，脚本总体必须exit0。

复用工作树或曾使用--ignore-scripts时，需完成既定postinstall的Agent和随包插件依赖/构建；UI与development测试入口先plugins:build，缺插件依赖须在浏览器前失败，不能把少四个插件菜单的环境误判为产品回归。
