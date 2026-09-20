# KK Studio 工作台协作规范

## 唯一工程与目标

- 唯一工程仓库是 `D:\\kk-studio-next`。任务隔离可以使用该仓库登记的 `.worktrees/<TASK-ID>`；这不是第二套工程或旧目录复活。每个 worktree 只承载一个 task branch。
- `D:\\kk-studio` 已清理，不得重新创建或作为运行目录。
- 历史代码和用户数据只从 `D:\\KK-Studio-legacy-archive-20260909`、`D:\\KK-Studio-user-data-backup-20260909` 读取；迁移必须经过 schema、checksum 和用户明确操作。

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

- Figma 文件 `0nU0A7pq6eyjwfwm1TtWkO` 是 UI 唯一权威；当前基线为 Workspace `404:28667`、收纳 `410:67357`、Landing `410:59708`，其他界面从 page `0:1` 读取最新节点。历史 `1:2` 不得覆盖最新 Frame。实现前读取 `docs/UI-ALIGNMENT.md`、`docs/UI-STANDARDS.md`、`docs/UI_SPEC.md`。
- 每个可见控件必须有真实行为，或显示禁用原因；异步操作必须覆盖 loading、success、error、cancel 和离线状态。
- 视觉验收必须有相同状态的浏览器截图/DOM 证据；构建通过不等于 Figma 一致。

## 文档与验证

- 当前需求按 `docs/templates/` 创建 intent、spec、plan、verification，放入对应日期的 `docs/changes/<date>-<task>/`；旧整合记录是历史依据，不是后续任务的默认目录。
- 代码、数据契约或行为改变时同步 `docs/PROGRESS.md`。
- 常用命令：`npm run typecheck`、`npm run test`、`npm run ui:check`、`npm run format:check`、`npm run build`、`npm run client:check`；交付前执行 `npm run verify`。
- 验证不足只能写 `Prototype`，不能把占位 UI、硬编码账号或本地 demo 描述为真实服务。

## UI 运行链路门禁

- UI 改动必须按 `最新 Figma Frame → Design Tokens → Shared Components → Actual Source → Browser Verification` 执行。
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
- `docs/governance/PROJECT_STATE.md` 保存当前事实；`SPEC_BASELINE.md` 指向已有规范；`task-ledger.json` 是任务/已知问题状态的机器可读权威，`TASK_LEDGER.md` 是生成视图；`AI_HANDOFF.md` 只保存恢复入口。`docs/PROGRESS.md` 和 change verification 保存已完成迭代证据。
- 修改模块前检查相关 TODO/FIXME/PARTIAL/REGRESSION/Prototype 与旧方案；不因没有 TODO 字符串就宣布没有遗留任务。额外独立问题加入账本，明确目标、验收、依赖、Owner、Branch、Worktree、Affected Modules、状态、证据和更新时间。
- FACT 必须有直接证据，推断标 INFERENCE，缺证据标 UNKNOWN，可信来源冲突标 CONFLICT；BLOCKED 只用于外部必要条件。Prototype/Mock/构建通过不等于真实服务完成。
- AI 自主执行可从仓库决定的技术工作。只升级真正的产品语义分歧、不可逆操作、外部权限/密钥/付款、无法解决的有效规范冲突和重大范围扩展。不要重复要求用户确认已授权动作。

## Git、并行与交付

- 默认稳定主线为 main；历史 master 未经过审阅迁移前不自动重命名、不假设为新 main。主线禁止直接开发、普通 direct push 和 force push。
- 使用 `<type>/<TASK-ID>-<description>` 短期分支（feat/fix/perf/refactor/test/docs/chore/hotfix）。先列任务依赖图，只有独立且低冲突任务并行；多代理不得同时改同一 dirty worktree。原 checkout 的无关改动不可 reset、clean、覆盖或悄悄提交。
- 进入 task worktree 后记录依赖安装、lint/typecheck/相关测试基线，已有失败记 PRE-EXISTING FAILURE。需捕获未提交实现时只创建明确标为未验收的候选快照，不移动主线、不改变原 checkout/index；排除 secrets、运行数据、临时文件和生成证据。
- 合并前 self-review、lint/typecheck/test/build、相关 regression、文档与验收全部通过；UI/runtime 适用时必须完成上述运行链路门禁。冲突在源分支解决，解决后重新验证。
- PR 一项逻辑目标，使用 `.github/PULL_REQUEST_TEMPLATE.md`；默认 squash merge，合并后验证最新主线。无 remote/权限时保留可审阅本地提交与 PR 内容并明确 remote gate 未完成。远端保护需实际托管配置，不能把 CI 文件当 ruleset 已启用。
- DONE = 实现 + 验收 + 相关验证/回归 + 文档同步；未完成写 PARTIAL，未验证写 NOT VERIFIED。结束迭代更新 ledger、Project State、Handoff 和相关规范；相同错误复发必须补自动 guardrail。不要因文件长而机械拆分，按职责边界整理。
