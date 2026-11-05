# KK Studio 工作台协作规范

## 核心档案分工与治理定位

项目确立四大顶级规则入口，**各司其职、严禁跨文件重复抄写同一条款**（由 `npm run rules:check` 门禁强制）：

| 档案 | 谁来读 | 职责定位 |
| --- | --- | --- |
| [`RULES.md`](RULES.md) | **所有 AI（开工首读）** | 500 字高密度铁律卡片：5 大绝对红线 + 4 条量化硬约束 + 合并前 Checklist |
| [`AGENTS.md`](AGENTS.md)（本文件） | **编码代理**（Coding Agents） | 编号化技术边界（`R-*`）、数据安全、UI/Figma 门禁（`D-*`）、Git 与交付约束 |
| [`AI_RULES.md`](AI_RULES.md) | **全部 AI** | 人机全权自治契约（`C-*`）、事实与历史纪律、独立审查与发布流程 |
| [`DESIGN.md`](DESIGN.md) / [`docs/FIGMA-SYNC.md`](docs/FIGMA-SYNC.md) | **设计/UI 代理** | Figma 设计真值同步管线、三层 Token 强制分层与组件 Token 化完成标准 |
| [`README.md`](README.md) | **人类**（开发者、用户） | 项目定位、功能总览、运行环境、安装步骤与使用示例 |
| [`docs/README.md`](docs/README.md) | **全部角色** | 全部文档索引与**唯一冲突裁决优先级** |

> **UI 开工入口**：涉及 UI 时，先执行下文 `D-SYNC-*` / `D-TOKEN-*` 与 [`docs/FIGMA-SYNC.md`](docs/FIGMA-SYNC.md)，再读 [`DESIGN.md`](DESIGN.md) 与 [`docs/UI_INDEX.md`](docs/UI_INDEX.md)。本地文档不能代替读取当前 Figma。

## 一、 意图理解与入口一致性（`R-ENTRY-*`）

- **[R-ENTRY-01] 开工必读序列**：新会话先读 [`RULES.md`](RULES.md) → 本文件 → [`AI_RULES.md`](AI_RULES.md) → [`docs/engineering/PROMPTING.md`](docs/engineering/PROMPTING.md)。用户无需提供专业提示词，AI 负责将自然语言转化为有范围、约束、验收与失败边界的工程任务；回复保持简洁、通俗中文。
- **[R-ENTRY-02] 兼容入口零分叉**：`CLAUDE.md`、`GEMINI.md`、`.github/copilot-instructions.md`、`.cursor/rules/project.mdc` 仅作为指针路由至 `RULES.md`、`AGENTS.md` 与 `AI_RULES.md`，严禁另立政策。
- **[R-ENTRY-03] 授权边界内不越界**：代码、配置与文档可作为冲突审计输入，但**禁止顺手修改当前任务范围外的文件**（`RULE-NO-DRIVEBY`）。用户限定只改规则/文档时，不得接管产品实现或其他未提交改动。

## 二、 唯一工程与平台顺序（`R-REPO-*`）

- **[R-REPO-01] 唯一正式主仓**：本机唯一仓库是 `D:/kk-studio/KK-Studio-2.0`（容器目录为 `D:/kk-studio`）。任务隔离使用登记在 `D:/kk-studio/.worktrees/` 下的 worktree；严禁把本机绝对路径写成跨平台运行时依赖。历史归档位于工程外 `D:/KK-Studio-recovery-20260921`（只读恢复到新目录，严禁覆盖当前用户数据或打入 `releases/`）。
- **[R-REPO-02] 版本单源**：三端版本唯一源为 `config/platform-versions.json`（参见 [`docs/engineering/VERSIONING.md`](docs/engineering/VERSIONING.md)），修改后运行 `npm run version:check`；保留既有存储 key/identifier 不变。
- **[R-REPO-03] 平台交付顺序**：固定为 **Desktop → Web → Mobile**。Desktop 最小可用链路通过前不启动 Web 同等能力；Web 从共享核心蒸馏并保持生成链与状态同构；Web 稳定前不启动独立顶层 `mobile/` 工程。

## 三、 技术边界与清洁架构（`R-ARCH-*`）

- **[R-ARCH-01] 锁定技术栈**：React `18.3.1` + TypeScript `5.6.3`（strict） + Vite `7.3.6` + Tauri `2.11.1` + Node `24`；`package-lock.json` 是唯一锁文件。编码细则见 [`docs/engineering/CODING-STANDARDS.md`](docs/engineering/CODING-STANDARDS.md)。
- **[R-ARCH-02] 目录职责与纯领域核心**：
  - `src/domain/`：纯领域层（Zod schema、领域模型），**严禁依赖 React、Tauri、`components`、`features`、`integrations`、`styles` 或 Node 内置模块**（由 `scripts/governance/import-boundaries.mjs` 强制）。
  - `src/features/<feature>/`：垂直切片业务模块，对外**唯一经由 `index.ts` 暴露**，严禁跨 feature 深层私有导入；单组件文件 ≤ `300` 行。
  - `src/integrations/`：模型/API/第三方适配器（Adapter / Facade）；`src/runtime/`：存储与运行时契约；`src-tauri/`：仅承载桌面原生壳、IPC、系统凭据库与本地文件能力。
- **[R-ARCH-03] 严禁重复造轮子**：凡涉及无限画布、手势矩阵、贝塞尔连线、节点碰撞、SSE/流式解析、Mask 编辑器、复杂状态机等通用高复杂度能力，开工前必须优先吸收 `references/` 参考代码或引入 GitHub/npm 高星宽松协议（MIT / Apache-2.0 / BSD）成熟方案并经适配器隔离；仅在确无合适库或协议冲突时自研最小适配并在 ADR 说明。
- **[R-ARCH-04] 工作区四象限零污染**：
  1. 外部参考源码与资产 → `D:/kk-studio/references/`（资产入 `references/assets/`）；
  2. 调研与参考文档 → `D:/kk-studio/docs/05-references/`；
  3. 运行日志与验证证据 → `D:/kk-studio/output/logs/<topic-date>/` 或 `output/<topic>-<date>/`（禁止在 `output/` 根平铺裸文件）；
  4. 临时调试产物 → `.tmp/`（已 gitignore）；主仓根目录列表受 `config/repo-layout-rules.json` 严格白名单管控。

## 四、 数据与安全（`R-SEC-*`）

- **[R-SEC-01] 凭据零明文落盘**：API key、OAuth token 与代理凭据只进系统凭据库（`com.kkstudio.provider`）或请求内存；Web 仅允许经审查的客户端加密持久化（解锁密钥不随密文存放）。严禁进入明文 localStorage、项目文件、导出包、URL 或日志。
- **[R-SEC-02] 存储与账号边界**：桌面数据根为 `%APPDATA%\kk-studio`（详见 [`docs/architecture/DATA-STORAGE.md`](docs/architecture/DATA-STORAGE.md) 与 [ADR-019](docs/architecture/adr/ADR-019-unified-local-repository-and-optional-account.md)）；模型权重留在用户 ComfyUI 目录。Desktop/Web 均支持免登录本地使用；未接真实服务的云端/积分/Provider 能力必须标为 `Prototype` 或禁用。
- **[R-SEC-03] 记忆隐私契约**：本机共享记忆 `~/.kk-memory/memory.json` 遵循 [`docs/MEMORY-CONTRACT.md`](docs/MEMORY-CONTRACT.md)，完整文件严禁进同步、localStorage、日志或导出包。

## 五、 Figma 全面同步与组件 Token 化（`D-*`）

完整规范与命令见 [`docs/FIGMA-SYNC.md`](docs/FIGMA-SYNC.md)，导航见 [`docs/UI_INDEX.md`](docs/UI_INDEX.md)：

- **[D-SYNC-01] Figma 唯一真值，严禁逆向回填**：当前 Figma（`ZiadpErDoFweCjG3uHjkM3`）的 Variables、Styles、母版与页面是唯一设计真值。链路固定为：`Figma → DTCG 快照 (design/tokens/figma.tokens.json) → tokens.css → DESIGN.md → 组件`。**严禁先改本地代码再回填 Figma**。
- **[D-SYNC-02] 单一运行时 Token 注册处**：`src/styles/tokens.css` 是 `--kk-*` 唯一运行时注册处（历史 `tokens.json` 已归档退役）。
- **[D-SYNC-03] 设计前置证据与阻断**：修改本地 UI 前必须在变更记录登记 Figma fileKey、nodeId、读取时间与目标状态；Figma 不可读或未定义时记录 `BLOCKED` 并暂停对应 UI 修改，禁止套用旧规范。
- **[D-TOKEN-01] 三层 Token 强制分层**：Tier 1 Primitive（原始值，业务禁用）→ Tier 2 Semantic（语义层，承载 dark/light 与强调色切换）→ Tier 3 Component（`--kk-<组件>-<部件>-<属性>[-<状态>]`，只能 `var()` 引用 Tier 2/1，**禁止字面值**）。
- **[D-TOKEN-02] 零裸写与棘轮门禁**：业务 CSS/TSX 严禁新增 Hex/RGB 颜色字面量、裸 `px` 声明、未授权 `999px` 圆角或行内 `borderRadius`；由 `npm run ui:check` 与 `npm run tokens:check` 棘轮门禁强制（存量只减不增）。
- **[D-COMP-01] 组件 Token 化与映射表**：共享组件必须在 [`design/figma-component-map.json`](design/figma-component-map.json) 登记 `nodeId`、本地路径、Token 前缀与五态同步状态（`DESIGN_PENDING → FIGMA_READY → LOCAL_PENDING → SYNCED → RUNTIME_VERIFIED`），覆盖 default / hover / active / selected / disabled / focus 六态。
- **[D-LAYOUT-01] 全端弹性与双端互补**：
  1. 容器严禁写死固定像素宽（使用 `width: min(100%, ...)`、流式网格与 `min-width: 0`）；单行文本必带省略三件套；
  2. 弹窗/面板采用 Header + Scrollable Body + Sticky Footer 三段式，响应 `@media (max-height: 640px)`；
  3. 触控目标 ≥ `44px × 44px`；
  4. 电脑端以**无限画布**为主，手机端以**聊天流**为主，100% 复用同一套 Token、任务 9 状态机与多模态 5 槽位契约。
- **[D-RUNTIME-01] UI 运行链路门禁**：Vite 固定端口 `1421`（`strictPort: true`）；报告 UI 完成前必须记录启动命令、URL、运行模式、route import 链路及 390 / 1099 / 1920 同状态浏览器 DOM/截图证据（Web 与 Desktop `frontendDist` 分别验证，详见 [`docs/UI_SPEC.md`](docs/UI_SPEC.md)）。每个可见控件必须有真实行为或禁用原因，异步覆盖 loading/success/error/cancel/offline。

## 六、 文档分级、事实与门禁（`R-DOC-*` / `R-FACT-*`）

- **[R-DOC-01] 变更文档按规模分级**（统一原流程冲突）：
  - **S 级（轻量修改）**：改动 ≤ `3` 个文件且不改变跨模块公共契约/schema → 直接以规范 Commit、单测覆盖与账本更新闭环，免建五件套目录；
  - **M/L 级（跨模块特性/架构/UI 同步）** → 按 `docs/templates/` 在 `docs/changes/<date>-<task>/` 建立 `intent/spec/plan/verification/review`。
- **[R-DOC-02] 功能卡与生成视图**：每个功能对应 `docs/features/feat-*.md` 与机器权威 `features.registry.json`（`docs/features/README.md` 由 `npm run features:write` 生成，严禁手改）。`REAL` 必须有双端同态运行证据，非 `REAL` 必须挂开放账本任务。
- **[R-FACT-01] 唯一状态源与事实标记**：
  - 任务状态唯一源：`docs/governance/task-ledger.json`（`TASK_LEDGER.md` 由 `npm run governance:write` 生成，严禁手改）；
  - 当前事实：`docs/governance/PROJECT_STATE.md`；恢复入口：`AI_HANDOFF.md`；权威映射：`AUTHORITY_MAP.md`。
  - 直接证据标 `FACT`，推断标 `INFERENCE`，缺证据标 `UNKNOWN`，来源冲突标 `CONFLICT`，外部阻塞标 `BLOCKED`。代码与规范冲突时不默认以代码为准。
- **[R-GATE-01] 门禁命令矩阵**：
  - 日常快速门禁：`npm run typecheck`、`npm run lint`、`npm test`、`npm run rules:check`、`npm run ui:check`、`npm run tokens:check`；
  - 交付前完整门禁：`npm run verify`。

## 七、 Git、工作树与合流（`R-GIT-*`）

- **[R-GIT-01] 主线保护与分支命名**：默认主线为 `main`，禁止直接 push 或 force push。使用 `<type>/<TASK-ID>-<description>` 短期分支；多代理严禁同时修改同一 dirty worktree，主 checkout 的无关未提交改动严禁 reset、clean、覆盖或夹带提交。
- **[R-GIT-02] 工作树复用与即时闭环**：开工前先查 `git worktree list` / `git branch` 复用既有任务分支；进入 worktree 记录基线（已有失败记 `PRE-EXISTING FAILURE`）。编码与门禁验证全部通过后，**立即合并入 `main` 并回收该临时 worktree**，严禁让已验证分支长期游离。
- **[R-GIT-03] 完成定义（DONE）**：`DONE = 实现 + 验收 + 门禁/回归通过 + 台账/文档同步`；未完成标 `PARTIAL`，未验证标 `NOT_VERIFIED`。相同错误复发必须补充自动化门禁脚本。
