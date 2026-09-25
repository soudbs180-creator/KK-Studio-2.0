# KK Studio 工作台协作规范

## 所有 AI 必须先理解意图

- 先读根目录 `AI_RULES.md` 和 `docs/engineering/PROMPTING.md`。用户不必提供专业提示词，AI 负责将自然语言转换成有范围、约束、验收与失败边界的工程任务；允许中英术语混用，最终回复简洁、通俗、中文。
- 普通已授权技术工作由 AI 写好 intent/spec/plan 后自主执行，不逐阶段索取形式批准。用户主要负责产品含义、设计/交互和最终验收；真实高影响操作沿用具体授权。用户新反馈应同步更新任务，不丢弃此前目标。
- `CLAUDE.md`、`GEMINI.md`、`.github/copilot-instructions.md`、`.cursor/rules/project.mdc` 只是兼容入口，必须引用本文件和 AI_RULES，不能另立矛盾政策。新工具未加载规则不得写入；CI 不能证明模型确实读懂规则。
- 产品代码、配置、脚本和现行文档可作为冲突审计输入；修正须在当前用户授权范围内。用户限定只写规则时，不接管产品实现、既有测试或其他提交。历史证据用勘误和新证据纠正，不伪造旧结果。具体流程见 `docs/engineering/SDLC.md`、`docs/engineering/BRANCH-POLICY.md` 与 `docs/engineering/REVIEW.md`。

## 唯一工程与目标

- 本机唯一工程仓库是 `D:/kk-studio/KK-Studio-2.0`；`D:/kk-studio` 仅为容器目录。任务隔离使用本仓库登记的 worktree，每个 worktree 只承载一个 task branch。其他设备可使用自己的路径，但必须核对相同 Git remote、已推送 SHA 和仓库规则，不将本机绝对路径写成跨平台依赖。
- `kk-studio-next` 和旧 archive/backup 已由 TASK-CONSOLIDATE-200 收敛；不要重新建立重复工程或从历史路径启动。当前融合分支和验证状态先读 `docs/governance/PROJECT_STATE.md`。
- 历史源码、未提交候选、Git 和用户数据的恢复归档位于工程外 `D:/KK-Studio-recovery-20260921`。恢复必须到新目录并校验，不得自动覆盖当前用户数据。工程内 `releases/` 只放最新分享产物，禁止把恢复归档、凭据、node_modules 或编译缓存打入分享包。
- `2.0.0` 是历史融合基线；当前 `main` 源码版本为 `2.1.0`，正式安装包和 tag 另行验收。后续版本按 SemVer 递增。同步 package.json、package-lock.json、Cargo.toml/Cargo.lock、tauri.conf.json 和应用显示；保留原有存储 key/identifier，不能随目录或包名改动用户数据身份。

## 技术边界

- React 18 + TypeScript strict + Vite；桌面壳为 Tauri 2；Node 24；npm lockfile 是唯一锁文件。
- `src/components`：页面与组件；`src/domain`：Zod schema、领域模型、demo fixture；`src/integrations`：模型/API/provider 适配器；`src/runtime`：浏览器存储契约和运行时边界；`src-tauri`：桌面命令与文件系统。
- `public/design/figma` 是 Figma 导出资源，`public/fixtures/demo` 是固定本地演示素材，`design/figma-plugin` 是可编辑插件源。
- 新功能优先按 `src/features/<feature>` 拆分；组件超过 300 行按职责拆分。

## 数据与安全

- 桌面数据根目录为 `%APPDATA%\\kk-studio`（跨平台规则见 `docs/architecture/DATA-STORAGE.md`）。模型权重留在用户选择的 ComfyUI 根目录，仓库只放适配器和索引契约。
- API key、OAuth token 和代理凭据只进系统凭据库（service `com.kkstudio.provider`）或请求内存，禁止进入 localStorage、项目文件、导出包、URL 和日志。
- Web 的项目/任务/消息和素材在 IndexedDB 本地持久化，localStorage 保存非敏感设置、provider 元数据与恢复副本；Desktop 创作快照及素材使用原生仓库。具体契约以 `docs/architecture/DATA-STORAGE.md` 为准。本地持久化不代表云端保存；账号、积分、记忆、云端保存或 Provider 生成未接真实服务时必须明确标为 Prototype 或禁用。

## 设计与交互

- **UI 规范唯一入口是 [`docs/UI_INDEX.md`](docs/UI_INDEX.md)**。任何 UI 改动先读索引，再读该主题的唯一承载文件，不要在多份规范里各取一份。分工：`UI_RULES.md`（零件/交互规则）· `UI_ARCHETYPES.md`（页面类型）· `DESIGN_TOKENS.md`（数值）· `DESIGN-SYSTEM.md`（颜色与基础组件）· `UI_SPEC.md`（运行与验证）。旧 `UI-STANDARDS.md` / `UI-ALIGNMENT.md` 已合并，仅作历史溯源，不再更新。
- 颜色、字体层级和基础组件以 `docs/DESIGN-SYSTEM.md` 为唯一现行规范（用户 Ardot `728457371665311 / 0:1`、2026-09-22 PDF 及逐项校正）。所有后续 UI 必须消费这一系统。旧 Figma 文件 `0nU0A7pq6eyjwfwm1TtWkO` 继续提供页面布局与图标资产依据：Workspace `404:28667`、收纳 `410:67357`、Landing `410:59708`；其旧调色/通用组件规则不能覆盖新 Design System，历史 `1:2` 不覆盖最新 Frame。**其历史几何/字号/间距只在 `archive/ui-history/` 溯源，落地时换算到 `DESIGN_TOKENS.md` 的档位，禁止直接引用原稿数值。**
- 每个可见控件必须有真实行为，或显示禁用原因；异步操作必须覆盖 loading、success、error、cancel 和离线状态。
- 视觉验收必须有相同状态的浏览器截图/DOM 证据；构建通过不等于 Figma 一致。

## 文档与验证

- 当前需求按 `docs/templates/` 创建 intent、spec、plan、verification、review，放入对应日期的 `docs/changes/<date>-<task>/`；旧整合记录是历史依据，不是后续任务的默认目录。
- 功能以 `docs/features/` 为唯一功能入口：每个功能一张 `feat-*.md` 卡片（用户入口、代码位置、测试证据、当前能力、差距与后端化），`features.registry.json` 是机器可读权威，`README.md` 看板由 `npm run features:write` 生成、禁止手改；新增功能先建卡并在账本建任务，再实现。演示功能后端化顺序见 `docs/features/BACKEND-ROADMAP.md`。功能状态（REAL/PARTIAL/PROTOTYPE/PLANNED）描述产品能力真实程度，与任务状态正交，REAL 必须有同态运行证据，非 REAL 必须挂开放任务（排除 DONE/OBSOLETE）。
- 代码、数据契约或行为改变时同步 `docs/PROGRESS.md`。
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
