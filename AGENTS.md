# KK Studio 工作台协作规范

## 核心档案分工与治理定位

项目确立三大顶级治理档案分工。**保持规则先治理好，然后再依靠这个规则来优化代码和 UI**：

| 档案 | 谁来读 | 它的定义 | 职责定位 |
| --- | --- | --- | --- |
| [`README.md`](README.md) | **人类**（开发者、用户） | **项目内容** | 项目定位、功能总览、运行环境、安装步骤与使用示例 |
| [`AGENTS.md`](AGENTS.md)（本文件） | **编码代理**（Coding Agents） | **如何构建项目** | 技术边界、数据安全、构建验证门禁、SDLC 交付与 Git 规则 |
| [`DESIGN.md`](DESIGN.md) | **设计代理**（Design Agents / UI Agents） | **项目应该是什么样子和感觉** | 视觉语言、设计令牌（Tokens）、三端响应式与视口双向自适应规范 |

本文件是全部编码 AI 的**最高规则入口**，定义技术边界、禁止事项与验证要求。本文件与 [`AI_RULES.md`](AI_RULES.md) 的分工：

| 文件 | 承载内容 | 性质 |
| --- | --- | --- |
| `AGENTS.md`（本文件） | 技术边界、数据安全、UI 门禁、Git 与交付约束 | 硬约束清单 |
| [`AI_RULES.md`](AI_RULES.md) | 用户与 AI 分工、事实纪律、审核与交付流程 | 协作契约 |
| [`docs/README.md`](docs/README.md) | 全部文档索引、权威优先级与冲突裁决 | 导航与裁决 |

两者不重复承载同类条目。发现同一规则在两处都出现时，以本文件为准并删除另一处。文档索引与冲突裁决规则见 `docs/README.md`。

> **防新页面违规刚性约束**：所有新建页面、卡片、组件在编码前**必须先读取并严格遵循 [`DESIGN.md`](DESIGN.md)**。严禁私自硬编码孤立色值、固定宽度或忽略矮屏适配，编码代理必须先以 `DESIGN.md` 的规范自检通过后方可提交。

## 所有 AI 必须先理解意图

- 先读根目录 `AI_RULES.md` 和 `docs/engineering/PROMPTING.md`。用户不必提供专业提示词，AI 负责将自然语言转换成有范围、约束、验收与失败边界的工程任务；允许中英术语混用，最终回复简洁、通俗、中文。
- 普通已授权技术工作由 AI 写好 intent/spec/plan 后自主执行，不逐阶段索取形式批准。用户主要负责产品含义、设计/交互和最终验收；真实高影响操作沿用具体授权。用户新反馈应同步更新任务，不丢弃此前目标。
- `CLAUDE.md`、`GEMINI.md`、`.github/copilot-instructions.md`、`.cursor/rules/project.mdc` 只是兼容入口，必须引用本文件和 AI_RULES，不能另立矛盾政策。新工具未加载规则不得写入；CI 不能证明模型确实读懂规则。
- 产品代码、配置、脚本和现行文档可作为冲突审计输入；修正须在当前用户授权范围内。用户限定只写规则时，不接管产品实现、既有测试或其他提交。历史证据用勘误和新证据纠正，不伪造旧结果。具体流程见 `docs/engineering/SDLC.md`、`docs/engineering/BRANCH-POLICY.md` 与 `docs/engineering/REVIEW.md`。

## 唯一工程与目标

- 本机唯一工程仓库是 `D:/kk-studio/KK-Studio-2.0`；`D:/kk-studio` 仅为容器目录。任务隔离使用本仓库登记的 worktree，每个 worktree 只承载一个 task branch。其他设备可使用自己的路径，但必须核对相同 Git remote、已推送 SHA 和仓库规则，不将本机绝对路径写成跨平台依赖。
- `kk-studio-next` 和旧 archive/backup 已由 TASK-CONSOLIDATE-200 收敛；不要重新建立重复工程或从历史路径启动。当前融合分支和验证状态先读 `docs/governance/PROJECT_STATE.md`。
- 历史源码、未提交候选、Git 和用户数据的恢复归档位于工程外 `D:/KK-Studio-recovery-20260921`。恢复必须到新目录并校验，不得自动覆盖当前用户数据。工程内 `releases/` 只放最新分享产物，禁止把恢复归档、凭据、开发 node_modules 或编译缓存打入分享包；Agent 生产运行时仅按已审阅 `runtime-manifest.json` 白名单包含其运行依赖。
- `2.0.0` 是历史融合基线；三端版本以 `config/platform-versions.json` 为源，历史初始规划版本均从 `2.1.1` 开始，正式安装包、Mobile 包和 tag 另行验收。按[版本管理规则](docs/engineering/VERSIONING.md)由任务作者自动选择受影响平台并递增版本，运行 `npm run version:check`；不要让用户逐次指定数字。保留原有存储 key/identifier，不能随目录或包名改动用户数据身份。
- 平台交付顺序固定为 **Desktop → Web → Mobile**。Desktop 的最小可用链路和稳定性验收完成前，不启动 Web 的同等能力交付；Web 从共享核心蒸馏为轻量版本，只能裁剪平台专属能力，核心生成链、任务/结果语义和基本交互必须与 Desktop 保持一致，并以双端切换同态证据验收；Web 的共享协议和基本链路稳定前，不启动 Mobile 的实现。Mobile 的性能与体验优化排在三端最小链路之后。

## 技术边界

- React 18 + TypeScript strict + Vite；桌面壳为 Tauri 2；Node 24；npm lockfile 是唯一锁文件。
- `src/components`：页面与组件；`src/domain`：Zod schema、领域模型、demo fixture；`src/integrations`：模型/API/provider 适配器；`src/runtime`：浏览器存储契约和运行时边界；`src-tauri`：桌面命令与文件系统。
- `public/design/figma` 是 Figma 导出资源，`public/fixtures/demo` 是固定本地演示素材，`design/figma-plugin` 是可编辑插件源。
- 新功能优先按 `src/features/<feature>` 拆分；组件超过 300 行按职责拆分。完整的编码约束（命名、文件规模边界、模块依赖方向、错误处理、门禁映射）见 [`docs/engineering/CODING-STANDARDS.md`](docs/engineering/CODING-STANDARDS.md)。
- `src/domain` 是纯领域层，不得依赖 React、Tauri、`components`、`features`、`integrations`、`styles` 或 Node 内置模块，由 `scripts/governance/import-boundaries.mjs` 强制。
- Desktop 与 Web 共用根 `src/` 的领域、功能、Provider、任务和 UI 逻辑；`src-tauri/` 只承载 Desktop 原生壳、IPC、凭据库和本地文件能力。未来 Mobile 必须使用独立顶层 `mobile/` 工程，不得把 Mobile 页面、平台 runtime 或原生依赖放入 `src/` 或 `src-tauri/`；跨端共享必须经过明确抽出的、与平台无关且可版本化的契约或核心包。
- **禁止重复造轮子与开源复用优先**：凡涉及通用且复杂度高的领域能力（包括但不限于：无限画布底座、手势交互与矩阵变换、贝塞尔曲线连线、节点碰撞检测、SSE/Chunked 流式解析与重试机制、图片框选/局部重绘 Mask 编辑器、Markdown 高级渲染、复杂状态机、断点续传/哈希校验等），**严禁在没有充分调研的情况下从零编写私有实现**。开工前必须优先理解并采用用户提供的参考代码；若无参考代码，AI 必须主动在 GitHub / npm 开源生态中检索 Star 数量高、维护活跃、测试覆盖完善的成熟方案，优先通过依赖引入或适配层（vendor/adapter）接入。仅在确实无合适开源库或存在不可调和协议冲突时，方可自研最小适配并在架构记录（ADR/Spec）中说明必要性。
- **现代架构分层与修改隔离准则（Clean Architecture & Feature-Sliced Isolation）**：
  - 严格采用垂直切片架构（Vertical Slice Architecture / FSD）：业务功能完全收敛于 `src/features/<feature>/`，模块间严禁跨层私有引用，对外交互必须经由明确类型化的入口 `index.ts` 暴露。保证修改单个功能时局部收敛，杜绝修改引起的全局破坏与隐式级联依赖。
  - 纯领域层单向依赖隔离：UI 层与基础设施层（Tauri/网络/本地存储）仅能单向依赖 `src/domain/` 领域模型，领域层保持绝对纯净，杜绝架构反向污染。
  - 外部参考与依赖适配器模式（Adapter / Facade）：外部参考代码或第三方集成必须通过适配器隔离，防止外部变更对内部产生连锁影响。
  - 工作区零污染与文件规范落位：仓库根目录严禁存放非受控的临时文件、构建日志（如 `*.log`、`*.bak`、`tmp/`）；临时调试文件统一落入 `.tmp/`（已 gitignore）；外部参考统一归位 `references/`，外部文档归入 `docs/05-references/`，运行日志与测试产物统一归入 `output/logs/` 或特定日期证据目录。

## 数据与安全

- 桌面数据根目录为 `%APPDATA%\\kk-studio`（跨平台规则见 `docs/architecture/DATA-STORAGE.md`）。模型权重留在用户选择的 ComfyUI 根目录，仓库只放适配器和索引契约。
- API key、OAuth token 和代理凭据使用系统凭据库（service `com.kkstudio.provider`）或请求内存；Web 仅允许经审查的客户端加密持久化，解锁密钥不得随密文明文存放。秘密禁止进入明文 localStorage、项目文件、项目导出包、URL 和日志；用户选择的密钥同步使用独立加密内容。
- 当前 Web 的项目/任务/消息和素材仍在 IndexedDB 本地持久化，localStorage 保存非敏感设置、provider 元数据与恢复副本；Desktop 创作快照及素材使用原生仓库。Web 的目标部署与账号、会话、积分、会员和用量控制面位于 VPS；项目/素材是否云端保存或同步仍由独立数据契约决定，本机伴随服务仍是当前本地持久化路径。Desktop/Web 均可免登录本地使用；登录不自动上传产品数据，只有用户在网络设置手动同步所选内容。Mobile 的独立交付与设备持久化由原任务承接。本地持久化不代表云端保存；账号、积分、记忆、云端保存或 Provider 生成未接真实服务时必须明确标为 Prototype 或禁用。具体现状与目标以 `docs/architecture/DATA-STORAGE.md` 与相关 ADR 为准。
- 当前已授权实施用户自有 API 接入、四渠道模型选择、统一本地仓库和可选账号；按 Desktop→Web 顺序及真实功能链双门验收，不把消费者登录推断为 API 能力。账号、本机目录授权与模型渠道凭据分开；详细边界见 [ADR-019](docs/architecture/adr/ADR-019-unified-local-repository-and-optional-account.md)。
- 用户记忆的存储契约是本机共享文件（`~/.kk-memory/memory.json`）：完整文件不进同步/localStorage/日志/导出包；开启记忆时，相关片段可随当前请求发送给所选模型用于推理。豆包、WorkBuddy 原生客户端只有完成适配并经真实联调后才可标为已共享。任何 Agent 遵循 `docs/MEMORY-CONTRACT.md` 的读取/写入/隐私规则。

## 设计与交互

- **UI 设计规范唯一入口是根目录 [`DESIGN.md`](DESIGN.md)**（对齐 Google Stitch Specification 标准）。任何 UI、页面、卡片、浮层或组件改动，**编码代理必须先读 `DESIGN.md`，严格遵循其样式规则、Tokens、流式网格自适应与矮屏弹性规范**。细分主题索引见 [`docs/UI_INDEX.md`](docs/UI_INDEX.md)。
- **防止新页面违规的刚性法则**：所有新页面、新卡片、新控件必须满足以下五项硬约束方可合入：
  1. **禁止裸写颜色**：所有颜色必须消费 `DESIGN.md` 注册的语义令牌（如 `var(--bg-surface)`、`var(--text-primary)`），严禁直接出现 Hex/RGB 硬编码；
  2. **双向自适应弹性**：页面与卡片容器严禁使用写死固定像素宽度（必须使用 `width: min(100%, ...)`、流式网格 `grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr))` 与 `min-width: 0` 防溢出）；
  3. **矮屏与弹性高度**：所有弹窗与面板必须使用三段式结构（Header + Scrollable Body + Sticky Footer），并响应 `@media (max-height: 640px)`，确保主操作按钮在任何矮屏下始终可见可点；
  4. **触控与桌面双达标**：移动端与平板端所有交互元素触控面积不小于 `44px × 44px`；
  5. **单行防爆与全端拓扑**：文字单行容器必须带 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;`；
  6. **双端互补与同构规范（Mobile & Desktop Complementary Dual-Track）**：开发手机端（React Native / 移动 Web）与电脑端（Desktop / 宽屏 Web）时，必须严格遵照 `DESIGN.md`：电脑端发挥大屏优势以**无限画布（Infinite Canvas）**为主；手机端遵从单手舒适模式以**聊天为主（Chat-Centric）**（聊天流直接显示图片卡片、底部直达资源库与排队任务页）；相同部分（色彩阶梯、任务 9 状态机、多模态 5 槽位、Token、Schema）必须 100% 复用，保证跨端同态漫游。
- 每个可见控件必须有真实行为，或显示禁用原因；异步操作必须覆盖 loading、success、error、cancel 和离线状态。
- UI/交互与功能链路是每个平台的最高优先级双门。平台最小链路必须先通过“连接健康检查 → 一次文本生成 → 一次图片生成 → 结果/原件回写 → 保存或重载恢复”，并在同一版本提供 UI 状态证据；静态 UI、fixture、mock 或单一平台证据不能替代真实 API 回执。性能优化与 Mobile 体验优化只能在对应平台最小链路通过后进行。
- 视觉验收必须有相同状态的浏览器截图/DOM 证据；构建通过不等于设计一致。

## 文档与验证

- 当前需求按 `docs/templates/` 创建 intent、spec、plan、verification、review，放入对应日期的 `docs/changes/<date>-<task>/`；旧整合记录是历史依据，不是后续任务的默认目录。
- 功能以 `docs/features/` 为唯一功能入口：每个功能一张 `feat-*.md` 卡片（用户入口、代码位置、测试证据、当前能力、差距与后端化），`features.registry.json` 是机器可读权威，`README.md` 看板由 `npm run features:write` 生成、禁止手改；新增功能先建卡并在账本建任务，再实现。演示功能后端化顺序见 `docs/features/BACKEND-ROADMAP.md`。功能状态（REAL/PARTIAL/PROTOTYPE/PLANNED）描述产品能力真实程度，与任务状态正交，REAL 必须有同态运行证据，非 REAL 必须挂开放任务（排除 DONE/OBSOLETE）。
- 代码、数据契约或行为改变时同步 `docs/PROGRESS.md`。
- 改代码前先读 [`docs/engineering/CODING-STANDARDS.md`](docs/engineering/CODING-STANDARDS.md)；加测试前先读 [`docs/engineering/TESTING.md`](docs/engineering/TESTING.md)（测试分层、Playwright 端口契约、覆盖要求、证据保存）。
- 常用命令：`npm run typecheck`、`npm run test`、`npm run ui:check`、`npm run format:check`、`npm run build`、`npm run client:check`、`npm run features:check`、`npm run governance:check`、`npm run markdown:check`；交付前执行 `npm run verify`（已含功能、账本和现行 Markdown 链接门禁）。
- 验证不足不得标为 `REAL`，按已有能力标为 `PARTIAL` 或 `PROTOTYPE`；不能把占位 UI、硬编码账号或本地 demo 描述为真实服务。

## UI 运行链路门禁

- UI 改动必须按 `用户 Design System + 页面来源 → Design Tokens → Shared Components → Actual Source → Browser Verification` 执行。
- 报告 UI 完成前，必须记录实际启动命令、浏览器 URL/端口、运行模式（Vite development、Vite preview 或 Tauri release）、当前 route、route 到页面组件的 import 链路，以及同状态浏览器 DOM/截图证据。
- 代码 diff、Figma 读取或构建通过都不能代替浏览器验证；如果页面没有发生可见变化，必须继续检查端口、旧 build、缓存、重复 app/package 和路由引用，不能标记完成。
- Web（Vite）与 Desktop（Tauri `frontendDist`）必须分别验证；修改源码后要重新生成实际被加载的 production `dist` 或 release 包。
- 页面级 CSS 的加载顺序由 `App.tsx` 统一管理；同一 CSS 从组件提前 import 后，再次 import 不会改变顺序。必须以浏览器 style sheet 顺序和 computed style 确认最终生效规则。
- 默认、hover、active、selected、disabled、focus 必须消费同一套语义 tokens；原稿未定义的状态标记为工程补充。示例内容、真实运行内容与桌面专属控件不得混作同状态验收。
- 运行 Vite 时必须固定端口 1421（`vite.config.ts` 中设置 `strictPort: true`）；如果 1421 被占用，不得自动切到其他端口渲染。
- 若启动后页面仍是旧界面，需先确认 `index.html` 与当前进程的 `script/src`（`/src/main.tsx` 或 `/assets/index-*.js`）、`data-runtime-mode`、`data-runtime-entry`，再排除：
  - 旧窗口/旧端口残留
  - 浏览器缓存（`Ctrl+Shift+R` 后重试）
  - 错误指向其他 app 的 `dist` 或其他 checkout

## 上下文、任务与证据

- 新 session 先检查当前和嵌套 AGENTS、`docs/governance/`、相关 architecture/spec/change records、Git status/history/worktrees，再读取相关实现。当前事实、规范、历史证据发生冲突时记录 CONFLICT 并据来源与时间判定；代码与规范冲突不自动以代码为准。
- `docs/governance/PROJECT_STATE.md` 保存当前事实；`SPEC_BASELINE.md` 指向已有规范；`task-ledger.json` 是任务/已知问题状态的机器可读权威，`TASK_LEDGER.md` 是生成视图；`docs/features/features.registry.json` 是功能真实程度的机器可读权威，`docs/features/README.md` 与 `feat-*.md` 卡片是功能视图（README.md 为生成文件禁止手改；registry 与功能卡由维护者同步修改）；`AI_HANDOFF.md` 只保存恢复入口。`docs/PROGRESS.md` 和 change verification 保存已完成迭代证据。
- 修改模块前检查相关 TODO/FIXME/PARTIAL/REGRESSION/Prototype 与旧方案；不因没有 TODO 字符串就宣布没有遗留任务。额外独立问题加入账本，明确目标、验收、依赖、Owner、Branch、Worktree、Affected Modules、状态、证据和更新时间。
- FACT 必须有直接证据，推断标 INFERENCE，缺证据标 UNKNOWN，可信来源冲突标 CONFLICT；BLOCKED 只用于外部必要条件。Prototype/Mock/构建通过不等于真实服务完成。
- AI 自主执行可从仓库决定的技术工作。只升级真正的产品语义分歧、不可逆操作、外部权限/密钥/付款、无法解决的有效规范冲突和重大范围扩展。不要重复要求用户确认已授权动作。

## Git、并行与交付

- 默认稳定主线为 main；历史 master 未经过审阅迁移前不自动重命名、不假设为新 main。主线禁止直接开发、普通 direct push 和 force push。
- 使用 `<type>/<TASK-ID>-<description>` 短期分支（codex/feat/fix/perf/refactor/test/docs/chore/hotfix）。先列任务依赖图，只有独立且低冲突任务并行；多代理不得同时改同一 dirty worktree。原 checkout 的无关改动不可 reset、clean、覆盖或悄悄提交。
- 进入 task worktree 后记录依赖安装、lint/typecheck/相关测试基线，已有失败记 PRE-EXISTING FAILURE。需捕获未提交实现时只创建明确标为未验收的候选快照，不移动主线、不改变原 checkout/index；排除 secrets、运行数据、临时文件和生成证据。
- 合并前 self-review、lint/typecheck/test/build、相关 regression、文档与验收全部通过；UI/runtime 适用时必须完成上述运行链路门禁。冲突在源分支解决，解决后重新验证。
- PR 一项逻辑目标，使用 `.github/PULL_REQUEST_TEMPLATE.md`；默认 squash merge，合并后验证最新主线。无 remote/权限时保留可审阅本地提交与 PR 内容并明确 remote gate 未完成。远端保护需实际托管配置，不能把 CI 文件当 ruleset 已启用。
- DONE = 实现 + 验收 + 相关验证/回归 + 文档同步；未完成写 PARTIAL，未验证写 NOT VERIFIED。结束迭代更新 ledger、Project State、Handoff 和相关规范；相同错误复发必须补自动 guardrail。不要因文件长而机械拆分，按职责边界整理。
- **工作树与分支严格复用与即时闭环合流（Worktree & Branch Immediate Closure）**：开工前必须先检查现有工作树与分支（`git worktree list` / `git branch`），已有工作树或分支在处理相同/关联任务时必须直接复用，严禁新建重复分支或平行工作树（避免工作树蔓延）。分支任务一旦编码完成并经门禁验证确认无误（lint/typecheck/test/build/UI 验收全部通过），**必须立即执行合并（Merge）并清理/回收该工作树**，严禁让通过验证的分支长期独立游离或滞留工作树。所有子任务/工作树变更全部合流并通过整体门禁后，统一进行完整交付与提交。
