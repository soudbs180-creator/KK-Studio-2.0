# KK Studio 统一项目规范

**版本**：1.0.0  
**状态**：规范候选；合入 `origin/main` 后作为跨主题唯一治理入口  
**盘点日期**：2026-10-11（所有动态数量、SHA、远端状态以重新执行命令的结果为准）  
**适用范围**：`D:/kk-studio/KK-Studio-2.0` 主仓、其登记的任务 worktree、代码、测试、文档、构建、发布和 AI 协作。

本文件统一跨主题规则。`AGENTS.md` 继续承载硬性技术与安全边界，`AI_RULES.md` 继续承载用户与 AI 的协作契约，专项文档承载领域细节；它们不得再复制本文件的跨主题流程。任何新规则必须先归属到一个唯一来源，再通过索引和门禁暴露。

**版本记录**：`1.0.0`（2026-10-11，规则盘点、目录/命名、编码流程、冲突裁决和变更机制首次收敛；对应规则重构任务与采用证据应在合入时补入本表）。

## 1. 规则解释和事实分层

### 1.1 固定优先级

遇到两份材料说法不同，按以下顺序解释，并在 change package 中记录裁决：

1. 当前用户意图和明确授权；
2. `AGENTS.md` 的安全、数据、技术边界；
3. `AI_RULES.md` 的协作、事实和交付纪律；
4. 本文件的跨主题流程、目录、命名和变更机制；
5. 本文件索引的专项规范（工程、架构、UI、发布）；
6. 机器可读状态源和当前代码/测试/运行证据；
7. 带日期的 change package、`docs/archive/` 和历史快照。

代码或运行证据描述“现在怎样”，不自动批准与规范不一致的行为。没有直接证据写 `UNKNOWN`，推断写 `INFERENCE`，来源互信且不一致写 `CONFLICT`。历史 PASS 只对记录中的 SHA、运行模式和范围有效。

### 1.2 事实与状态唯一来源

| 事实类别                     | 唯一机器/文档来源                                         | 派生视图或证据                              | 禁止做法                                       |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| 任务状态、负责人、依赖、证据 | `docs/governance/task-ledger.json`                        | `TASK_LEDGER.md`、`TASK_STATUS.md`          | 手改生成视图、用聊天状态覆盖账本               |
| 功能成熟度                   | `docs/features/features.registry.json` + 对应 `feat-*.md` | `docs/features/README.md`                   | 用任务 `DONE` 推导功能 `REAL`                  |
| 当前项目事实                 | `PROJECT_STATE.md` 的 `CURRENT_FACTS`                     | `AI_HANDOFF.md`、`PROGRESS.md` 的链接       | 用历史段落覆盖首段事实                         |
| 版本                         | `config/platform-versions.json`                           | `package.json`、`VERSION`、Tauri/Cargo 镜像 | 单独手改镜像或把源码版本当发布完成             |
| UI 规则                      | `docs/UI_INDEX.md` 路由的唯一承载文件                     | `src/styles/tokens.css`、浏览器证据         | 更新历史存根、用旧截图覆盖现行规则             |
| ADR                          | `docs/architecture/adr/ADR-NNN-*.md`                      | ADR README 与索引                           | 重建 `docs/decisions/` 或复用编号              |
| 门禁行为                     | `package.json` scripts + `scripts/` 实现                  | 文档表格、CI                                | 只改文字不改脚本，或把配置文件当已启用远端规则 |

### 1.3 状态词的统一含义

| 词                                          | 允许用于   | 可验证条件                                                       |
| ------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| `TODO` / `READY` / `IN_PROGRESS` / `REVIEW` | 任务流     | 由账本脚本允许的枚举和字段决定                                   |
| `DONE`                                      | 任务流     | 实现、适用验证、文档同步、独立复核和用户可观察验收均绑定当前 SHA |
| `PARTIAL`                                   | 任务或功能 | 已有部分结果或证据，仍有明确缺口                                 |
| `BLOCKED`                                   | 任务       | 外部权限、产品决定、服务或依赖缺失，且记录解除条件和责任边界     |
| `REGRESSION` / `OBSOLETE`                   | 任务       | 已完成范围回归，或有明确废弃决定                                 |
| `REAL` / `PROTOTYPE` / `PLANNED`            | 功能       | 按功能卡和同态运行证据判定，与任务状态正交                       |
| `PASS`                                      | 一次检查   | 命令、退出码、SHA、环境和证据路径齐全                            |
| `NOT VERIFIED`                              | 外部能力   | 未取得 Hosted、Provider、Tauri、发布或用户验收证据               |

## 2. 现状盘点（来源清单）

下表是 2026-10-11 在当前 checkout 的规则与事实入口。动态数字只作本次盘点快照：账本 120 条（DONE 75、PARTIAL 29、TODO 11、BLOCKED 4、REVIEW 1），功能 36 条（REAL 2、PARTIAL 27、PROTOTYPE 5、PLANNED 2）；worktree 数量只接受每次 `git worktree list --porcelain` 的实时回读。当前分支为 `codex/ui-redesign-20261011`，checkout 非干净；当前 `HEAD` 与 `origin/main` 必须每次重新回读。

| 领域           | 当前来源文件                                                                                                                                        | 当前承担内容                                               | 统一后的处理                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| 总规则入口     | `AGENTS.md`、`AI_RULES.md`、`CONTRIBUTING.md`、`CLAUDE.md`、`GEMINI.md`、`.github/copilot-instructions.md`                                          | 技术/安全边界、AI 分工、贡献摘要、兼容入口                 | `AGENTS` 保留硬边界，`AI_RULES` 保留协作契约，其他只路由到本文件及两份入口 |
| 文档索引和裁决 | `docs/README.md`、`docs/governance/SPEC_BASELINE.md`、`AUTHORITY_MAP.md/.json`                                                                      | 文档索引、优先级、事实归属、生成文件规则                   | 本文件给出唯一跨主题流程；索引和 JSON 不复制正文                           |
| 任务和项目状态 | `docs/governance/task-ledger.json`、`TASK_LEDGER.md`、`TASK_STATUS.md`、`PROJECT_STATE.md`、`AI_HANDOFF.md`、`PROGRESS.md`                          | 任务状态、当前事实、交接、历史进度                         | JSON/`CURRENT_FACTS` 是唯一源，历史只作证据                                |
| Owner 映射快照 | `docs/governance/OWNER_MAP.json`                                                                                                                    | 历史 owner/账本快照                                        | 不作为当前任务源；owner 以 `task-ledger.json` 为准，快照必须带日期         |
| 工程流程       | `docs/engineering/SDLC.md`、`DEVELOPMENT-WORKFLOW.md`、`DEVELOPMENT.md`、`PROMPTING.md`                                                             | 任务领取、brief、产物链、验证和交接                        | 本文件第 5 节统一顺序，专项文档只保留字段和命令细节                        |
| Git 与合入     | `BRANCH-POLICY.md`、`WORKTREE-LIFECYCLE.md`、`REVIEW.md`、`AUTO-MERGE.md`、`ROLLBACK.md`、`.githooks/`、`.github/`                                  | 分支、worktree、PR、审查、回滚、CI                         | 本文件定义唯一主流程；实际门禁以脚本和托管回读为准                         |
| 编码与架构     | `CODING-STANDARDS.md`、`architecture/ARCHITECTURE.md`、`DATA-STORAGE.md`、`DATA-CLASSIFICATION.md`、`GENERATION-PLATFORM.md`、`architecture/adr/`   | 目录依赖、命名、类型、数据、安全、ADR                      | 本文件规定归属和触发条件，细节仍由专项文档承载                             |
| 测试与证据     | `TESTING.md`、`DEVELOPMENT.md`、`UI_SPEC.md`、`tests/**`、`docs/evidence/**`                                                                        | 测试分层、端口、浏览器/桌面证据                            | 本文件统一证据等级和交付门禁                                               |
| UI             | `UI_INDEX.md`、`UI_RULES.md`、`UI_ARCHETYPES.md`、`DESIGN_TOKENS.md`、`DESIGN-SYSTEM.md`、`UI_SPEC.md`、`FRONTEND-SPEC.md`、`src/styles/tokens.css` | Figma 基线、组件、token、运行验证                          | `UI_INDEX` 是唯一路由，旧 `UI-STANDARDS`/`UI-ALIGNMENT` 只作存根           |
| 功能治理       | `docs/features/features.registry.json`、`feat-*.md`、`BACKEND-ROADMAP.md`                                                                           | 功能入口、成熟度、后端化波次                               | 先建卡/账本，再实现；看板只能生成                                          |
| 交付包         | `docs/changes/YYYY-MM-DD-task-slug/`、`docs/templates/*`                                                                                            | `intent/spec/plan/verification/review` 及 incident/release | 每个逻辑任务一个包，缺件不得进入 `REVIEW`                                  |
| 版本/发布/启动 | `VERSIONING.md`、`LAUNCHER.md`、`WINDOWS-INSTALLER.md`、`RELEASE.md`、`deploy/`、`releases/`、`config/platform-versions.json`                       | 版本源、桌面启动、安装器、部署和分享产物                   | 版本源、receipt、EXE/工件 hash 和 Hosted 回读分开证明                      |
| 可执行门禁     | `package.json`、`scripts/`、`tests/evals/agent-contract.json`、`.github/workflows/`                                                                 | lint、typecheck、verify、治理、索引、版本、交付检查        | 文档必须写明自动/显式/人工三类门禁                                         |
| 容器结构       | `D:/kk-studio/docs/REPO-STRUCTURE.md`、外层 `README.md`                                                                                             | 仓库根、worktree、外部参考和临时目录                       | 容器文档只管路径分布；现行规则仍以主仓为准                                 |

**逐项来源清单**：根入口为 `AGENTS.md`、`AI_RULES.md`、`CONTRIBUTING.md`、`CLAUDE.md`、`GEMINI.md`、`.cursor/rules/project.mdc`、`.github/copilot-instructions.md`；工程规则为 `docs/engineering/SDLC.md`、`DEVELOPMENT-WORKFLOW.md`、`DEVELOPMENT.md`、`CODING-STANDARDS.md`、`TESTING.md`、`BRANCH-POLICY.md`、`REVIEW.md`、`PROMPTING.md`、`AI-EVALS.md`、`VERSIONING.md`、`LAUNCHER.md`、`WINDOWS-INSTALLER.md`、`WORKTREE-LIFECYCLE.md`、`AUTO-MERGE.md`、`ROLLBACK.md`；架构技术文档为 `docs/architecture/ARCHITECTURE.md`、`DATA-STORAGE.md`、`DATA-CLASSIFICATION.md`、`GENERATION-PLATFORM.md`、`LEGACY-MIGRATION.md` 和 `docs/architecture/adr/ADR-*.md`；治理文档为 `docs/governance/PROJECT_STATE.md`、`SPEC_BASELINE.md`、`AUTHORITY_MAP.md/.json`、`PROJECT_GOALS.md`、`KNOWN_ISSUES.md`、`WORKSPACE_MAP.md`、`RETENTION_MANIFEST.md`、`MARKDOWN_AUDIT.md`、`AI_HANDOFF.md`、`task-ledger.json`、`TASK_LEDGER.md`、`TASK_STATUS.md`；功能文档为 `docs/features/features.registry.json`、`feat-*.md`、`BACKEND-ROADMAP.md`、`README.md`；UI 文档由 `docs/UI_INDEX.md` 路由到 `UI_RULES.md`、`UI_ARCHETYPES.md`、`DESIGN_TOKENS.md`、`DESIGN-SYSTEM.md`、`UI_SPEC.md`、`FRONTEND-SPEC.md`，旧 `UI-STANDARDS.md`/`UI-ALIGNMENT.md` 仅为存根；执行来源还包括 `package.json`、`scripts/`、`.githooks/`、`.github/workflows/`、`.github/CODEOWNERS`、`.github/PULL_REQUEST_TEMPLATE.md`、`config/github-rulesets/` 和 `config/platform-versions.json`。

## 3. 目录职责与内容边界

### 3.1 仓库和容器

| 路径                                     | 允许内容                         | 禁止内容                                | 验证/处置                                                                            |
| ---------------------------------------- | -------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `D:/kk-studio/KK-Studio-2.0/`            | 唯一主仓源码、规范、测试和配置   | 在容器根执行 Git、第二套现行规则        | 所有 Git 命令在此执行                                                                |
| `D:/kk-studio/.worktrees/TASK-ID-slug/`  | 一个任务分支的隔离源码和验证     | 新建在仓库内 `.worktrees`、混放多个任务 | `git worktree list` + `worktree:check`；超过活动上限时复用或先走回收计划，不强行新增 |
| `D:/kk-studio/docs/`                     | 容器级审计、计划、竞品和外部输入 | 作为主仓现行规范源                      | 现行规范只进主仓 `docs/`                                                             |
| `D:/kk-studio/output/`、`.verification/` | 可重建审计原始输出和验证留存     | 凭据、唯一源码、不可追溯的“通过”结论    | 任务结束保留 manifest/hash                                                           |
| `D:/kk-studio/.tmp/`、主仓 `tmp/`        | 一次性脚本、日志、临时缓存       | 提交到 Git、作为验收证据唯一来源        | 可清理，但先确认无恢复用途                                                           |

### 3.2 主仓顶层

| 目录                                                   | 应放置                                                                | 禁止放置                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/`                                                 | Web/Desktop 共享 TypeScript、React、领域、功能、适配器、runtime、样式 | Mobile 原生工程、密钥、服务端私有入口                                           |
| `src/domain/`                                          | 纯领域模型、schema、fixture                                           | React、Tauri、Node 内置、组件、功能、集成和样式依赖；`runtime` 仅允许纯契约常量 |
| `src/components/`                                      | 页面和共享 UI 组件                                                    | 服务端专用实现、重复第二套交互                                                  |
| `src/features/`                                        | 业务能力按 feature 分组                                               | `local-service`/`generation-server` 被浏览器共享代码导入                        |
| `src/integrations/`                                    | Provider/API/外部系统适配                                             | 保存凭据或把宿主实现塞入领域层                                                  |
| `src/runtime/`                                         | 存储 key、宿主桥接和运行时契约                                        | 业务 UI 和第二份领域状态                                                        |
| `src-tauri/`                                           | Rust 桌面壳、IPC、凭据库、本地文件、原生测试                          | Web 页面、Mobile 工程、构建缓存进入提交                                         |
| `mobile/`（未来）                                      | 独立 Mobile 工程和原生依赖                                            | 放入 `src/` 或 `src-tauri/`                                                     |
| `tests/`                                               | 分层测试、fixture、helper、eval 契约                                  | 生产目录写入、把 fixture 结果写成 live                                          |
| `scripts/`                                             | 确定性门禁、构建、治理、Windows 工具                                  | 业务运行时逻辑、秘密配置                                                        |
| `docs/`                                                | 规范、架构、功能卡、变更包、证据索引、归档                            | 根目录散落审计/截图/二进制                                                      |
| `config/`                                              | 版本源、白名单、非秘密配置和可审阅托管配置                            | API key、OAuth token、用户项目数据                                              |
| `deploy/`                                              | 部署、健康检查、回滚配置                                              | 运行时凭据和未审阅的生产状态                                                    |
| `public/`                                              | Figma 导出资源、演示 fixture、插件静态资源                            | 可执行秘密、用户资产、模型权重                                                  |
| `design/`                                              | 可编辑 Figma 插件源和设计生成代码                                     | 生产运行时逻辑                                                                  |
| `vendor/`                                              | 受控 Agent、插件、代理源码及相邻 lock                                 | 随意复制的外部仓库、未经审阅的运行服务                                          |
| `releases/`、`dist/`、`node_modules/`、`test-results/` | 本地或分享构建产物（按各自忽略规则）                                  | 当作源码或唯一发布证明提交                                                      |

### 3.3 `docs/` 子目录

| 子目录               | 唯一职责                                                   | 命名和禁止项                                                                           |
| -------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `docs/governance/`   | 当前事实、账本、权威地图、交接、项目目标                   | 账本 JSON 是源；不在 Markdown 手改状态                                                 |
| `docs/engineering/`  | SDLC、分支、编码、测试、发布和运行规则                     | 新增文件必须登记 `docs/README.md`                                                      |
| `docs/architecture/` | 架构、数据契约、ADR                                        | ADR 只在 `architecture/adr/`，编号不可复用                                             |
| `docs/features/`     | 功能卡、registry、后端路线图                               | README 由脚本生成                                                                      |
| `docs/changes/`      | 单任务交付包                                               | `YYYY-MM-DD-task-slug/`；不放长期规则                                                  |
| `docs/evidence/`     | 跨任务基线和历史证据                                       | 新交付证据跟随对应 `docs/changes/YYYY-MM-DD-task-slug/evidence/`，不把新日志散落到顶层 |
| `docs/templates/`    | intent/spec/plan/review/verification/release/incident 模板 | 模板不记录项目当前事实                                                                 |
| `docs/reference/`    | Figma、竞品和外部只读输入                                  | 研究材料不能证明产品已实现                                                             |
| `docs/archive/`      | 只读历史材料和存根原文                                     | 不参与冲突裁决、不更新正文                                                             |
| `docs/superpowers/`  | 历史设计/计划沉淀                                          | 不作为当前规则入口                                                                     |

## 4. 文件、目录和语言命名

新文件按下表执行；已有文件先保持路径稳定，迁移必须单独任务并保留重定向/历史记录。

| 对象          | 新规则                                                                                                                                                          | 示例                                         | 检查方式               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------- |
| 任务 ID       | 新任务使用 `TASK-<AREA>-<NNN>`，AREA 大写短词；旧 `T0–T12`、`UI-*`、`EXT-*` 等只读沿用，不批量改名                                                              | `TASK-GOV-001`                               | 账本 schema/评审       |
| 分支          | `<kind>/TASK-<AREA>-<NNN>-<slug>`；kind 为 `feat`、`fix`、`refactor`、`perf`、`test`、`docs`、`chore` 或 `hotfix`                                               | `docs/TASK-GOV-001-rules`                    | `worktree:check`、PR   |
| 旧分支        | 已存在的 `codex/...` 可继续到合入；新分支不再创建该形式                                                                                                         | `codex/TASK-UI-012...`                       | 迁移清单，不批量重命名 |
| worktree      | `D:/kk-studio/.worktrees/TASK-ID-slug`                                                                                                                          | `D:/kk-studio/.worktrees/TASK-GOV-001-rules` | `git worktree list`    |
| 交付包        | `YYYY-MM-DD-task-slug/`                                                                                                                                         | `2026-10-11-rules-restructure/`              | `delivery:check`       |
| ADR           | `ADR-NNN-kebab-title.md`，三位、只增不复用                                                                                                                      | `ADR-016-rule-governance.md`                 | `index:check`          |
| 功能卡        | `feat-NNN-kebab-title.md`                                                                                                                                       | `feat-039-rule-governance.md`                | `features:check`       |
| React 组件    | PascalCase `.tsx`                                                                                                                                               | `TaskWorkbench.tsx`                          | ESLint/评审            |
| Hook          | `use` + camelCase                                                                                                                                               | `useCanvasViewport.ts`                       | ESLint/评审            |
| 普通 TS 模块  | camelCase                                                                                                                                                       | `providerHealth.ts`                          | ESLint/评审            |
| CSS           | kebab-case `.css`                                                                                                                                               | `responsive-content.css`                     | `ui:check`             |
| 测试          | 与被测主题同名，`.test.ts`/`.spec.ts`；桌面脚本可 `.mjs`/`.ps1`                                                                                                 | `canvasGraph.test.ts`                        | 测试清单               |
| 稳定规范文档  | UPPER-KEBAB `.md`                                                                                                                                               | `BRANCH-POLICY.md`                           | `index:check`          |
| JSON/配置路径 | 一律正斜杠；新机器路径和证据文件名使用 ASCII lower-kebab                                                                                                        | `D:/kk-studio/.worktrees/task-gov-001-rules` | 治理脚本               |
| 中英文        | 规则正文用中文；代码标识、路径、协议字段和命令保留英文；用户可见文案按产品语言；`TASK-*`、`ADR-*` 是明确的大写标识例外；Rust/Android/Tauri 固定文件遵循平台命名 | `status: PARTIAL`                            | 评审                   |

## 5. 从创建到合入的编码流程

### 5.1 阶段和产物

| 阶段         | 必做动作                                                                                                        | 产物/门禁                                               | 继续条件                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| 0. 接收      | 复述目标、范围、非范围、授权和成功条件                                                                          | `intent.md`；确认是否已有任务/功能卡                    | 产品语义没有未决冲突                                               |
| 1. 登记      | 查账本、功能卡、当前事实、相邻 change package；登记 owner、依赖、模块、分支、worktree、base SHA                 | `task-ledger.json`；基线命令与预存失败                  | 有唯一 Task ID 和 AC                                               |
| 2. 隔离      | `git fetch origin`；从 `origin/main` 创建任务分支和外部 worktree；安装锁定依赖；先运行 `npm run worktree:check` | worktree 记录、`npm ci`、`npm run git:guards`           | 没有重叠写入者且未超过活动 worktree 上限；超限时复用或生成回收计划 |
| 3. 设计      | 读真实实现，选择最小方案；涉及公共契约/数据/权限/依赖时写 ADR                                                   | `spec.md`、必要的 ADR；状态/错误/回滚                   | 方案可验证，风险可回退                                             |
| 4. 实现      | 按职责边界修改；同步代码、测试、功能卡和文档；只 stage 自有文件                                                 | `plan.md`、代码和测试                                   | 本地自检无未解释失败                                               |
| 5. 验证      | 运行受影响层级和完整 `verify`；桌面、Rust、本地服务另跑专项命令                                                 | `verification.md`，含 SHA、命令、退出码、端口、产物身份 | 失败已分类，flaky/缺口已写明                                       |
| 6. 审查      | 实现者 self-review；独立上下文 reviewer 绑定 exact base/head；P0/P1 和阻断意见清零                              | `review.md`、PR、CI/delivery                            | head 不变且审查结论有效                                            |
| 7. 合入      | PR 通过后默认 squash；合入后 fetch，回读 PR/head/merge SHA 和 `origin/main`                                     | 合入证据、`PROGRESS`/`PROJECT_STATE`/账本同步           | 组合树重新验证                                                     |
| 8. 发布/维护 | 按平台版本源 bump，构建 receipt/签名/哈希；安装/Hosted/Provider/用户验收分开记录                                | `release.md` 或发布包、回滚目标、incident/eval          | 未证实项保持 `NOT VERIFIED`                                        |

### 5.1.1 代码运行链

共享代码按以下方向流动：`src/main.tsx → App.tsx/route → components → features → integrations/runtime`；纯规则和 schema 从 `domain` 被上层消费，不能反向依赖 UI、宿主或 Node。Desktop 另由 `src-tauri/src/main.rs → IPC/凭据/本地文件 → 共享前端产物` 接入；未来 Mobile 由独立 `mobile/` 工程消费版本化的跨端契约。测试按最快能证明的边界落在 `tests/unit`、`browser`、`desktop`、`local-service` 或 `development`，fixture 只提供固定输入，不代表真实 Provider。

任何新增模块先确认目录归属、依赖方向、状态源、错误/取消/恢复路径和对应测试层；组件超过 300 行按职责拆分，领域层和服务端专用边界由治理脚本拦截，未覆盖的架构债务必须登记而不能用“当前代码如此”改写规则。

### 5.2 分支、提交和 PR

1. `origin/main` 是唯一集成基线；禁止在 `main`、`master`、release 分支直接开发、force push 或删除历史 tag。
2. 一项逻辑目标对应一个 Task ID、一个短期分支、一个 worktree 和一个 PR；公共文件或协议有唯一写入者。
3. 提交信息使用中文 Conventional Commits：`<type>(<scope>): <祈使式摘要>`。`type` 与分支 kind 对齐；scope 使用真实模块；摘要不加句号、不写“修改了/修复了”，建议不超过 72 个字符。
4. 一个提交聚焦一件事；格式化、依赖升级和无关重构不得混入功能提交。提交前使用 `git add -- <明确路径>` 并检查 staged diff。
5. PR 标题和正文写清用户结果、影响平台、风险/回滚、base/head SHA、验证命令、未完成项和外部门禁状态。默认 squash；不把本地合并写成远端合入。

### 5.3 测试和证据矩阵

| 变更               | 至少执行                                                                                                                                     | 额外证据                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 领域/纯函数        | `npm run typecheck`、受影响 `tests/unit`、`npm test`                                                                                         | schema/迁移边界                                           |
| Web UI/交互        | `npm run verify` 或受影响命令、`npm run ui:check`                                                                                            | 1421 开发或 1423 preview 的 route、DOM、截图、bundle 身份 |
| Desktop/Tauri/Rust | `npm run client:check`、cargo test/fmt（适用时）、`npm run client:build`、受影响 `tests/desktop`                                             | 当前 EXE 路径、源码/输入 hash、receipt、进程身份          |
| 本地服务/网关      | `local-service:test`、`local-service:smoke`、受影响单测                                                                                      | loopback、端口、协议回执、取消/恢复                       |
| 规则/提示词/门禁   | `npm run governance:check`、`npm run markdown:check`、`npm run index:check`、`npm run doc:commands:check`、`tests/evals/agent-contract.json` | 确定性 guardrail 与 live eval 分开；无凭据写 `NOT RUN`    |
| 发布/部署          | `version:check`、`version:consistency`、`delivery:check`、平台构建/安装校验                                                                  | immutable tag/commit、receipt、文件 SHA-256、回滚验证     |

`npm run verify` 是合入前主闸门，但不包含 Rust、`tests/desktop`、本地服务、真实 Provider、Hosted、安装器和用户产品验收。固定端口 1421/1423 的运行验证串行执行；Playwright 的实际 `retries` 以 `playwright.config.ts` 为准，证据必须记录。

## 6. 冲突、重复和过时规则的裁决

下表是本次重构的逐条变更对照。原文保留在历史或专项文件中用于追溯；新规则从本文件生效，后续修改应只改唯一承载文件。

| 编号 | 原规则/来源                                                                                                                    | 新规则                                                                                                                                                                 | 取舍理由与落地检查                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| C-01 | `AGENTS.md`、`AI_RULES.md`、`docs/README.md`、`SPEC_BASELINE.md`、`AUTHORITY_MAP.*` 都各自重复优先级和事实纪律                 | 只保留本文件的跨主题优先级；`AGENTS`=硬边界、`AI_RULES`=协作契约、`README/AUTHORITY_MAP`=索引与事实归属                                                                | 避免五套层级；`docs/README` 索引、本文件表格与 JSON 同步检查         |
| C-02 | `SDLC`、`DEVELOPMENT-WORKFLOW`、`CONTRIBUTING`、`README` 重复任务领取和交付顺序                                                | 第 5 节是一条唯一流程；专项文件只保留字段、命令和领域例外，入口只链接                                                                                                  | 减少复制漂移；`delivery:check`、`doc:commands:check` 验证            |
| C-03 | `AGENTS.md`、`BRANCH-POLICY.md` 和外层 `REPO-STRUCTURE.md` 同时列 `codex/TASK-ID-slug` 与 `<type>/<TASK-ID>-slug`              | 新分支统一 `<kind>/TASK-AREA-NNN-slug`；已有 `codex/...` 允许过渡到合入，不批量改名                                                                                    | 兼容在途分支，同时让新规则可匹配；`worktree:check`/PR 评审           |
| C-04 | `REPO-STRUCTURE.md` 写 ADR `NNNN-kebab`，`check-doc-index.mjs` 强制 `ADR-NNN-kebab`                                            | 以已执行脚本和现有 `ADR-001..015` 为准，统一 `ADR-NNN-kebab-title.md`                                                                                                  | 可执行检查优先于过时文字；`npm run index:check`                      |
| C-05 | worktree 分布于容器、仓库内、Codex 目录；旧文档允许多处                                                                        | 新任务只落 `D:/kk-studio/.worktrees`；其他位置只登记/迁移，不作为新规范                                                                                                | 路径稳定且不污染主仓；`git worktree list`、`worktree:check`          |
| C-06 | `task-ledger.json` 的 `status` 与 `displayStatus`、旧快照和 `TASK_LEDGER.md` 并列                                              | 只有 `status` 可驱动流程；`displayStatus`/Markdown 是展示；旧快照标历史                                                                                                | 消除“显示完成”覆盖真实状态；`governance:check`                       |
| C-07 | 任务 `DONE`、功能 `REAL`、构建 PASS 常被叙述混用                                                                               | 任务、功能、检查、外部验收四套状态正交；REAL 必须同态运行证据                                                                                                          | 防止本地 fixture 冒充产品能力；features/governance/verification 检查 |
| C-08 | `CODING-STANDARDS` 曾概括“门禁已并入 lint”，但 delivery、平台链路和 Hosted 仍需显式/人工                                       | 每条门禁标 `自动`、`显式` 或 `人工`；`verify` 不扩张证明范围                                                                                                           | 以真实脚本/托管回读为准；文档命令和 PR checklist                     |
| C-09 | `AGENTS` 要求 domain 纯净，编码规范又允许 `domain → runtime`，存量存在 components↔features 双向依赖                            | 区分硬禁、明确例外和存量债务；新增依赖不得扩大例外，先登记再治理                                                                                                       | 不把存量事实误写成目标；import-boundaries + review                   |
| C-10 | Playwright 文档和部分任务对 retries 写法不同                                                                                   | 运行参数唯一来自 `playwright.config.ts`；任务可用显式 profile，但证据记录实际值                                                                                        | 避免重试掩盖缺陷；browser receipt                                    |
| C-11 | `PROJECT_STATE`、`AI_HANDOFF`、`PROGRESS` 含重复当前事实和旧 SHA                                                               | `PROJECT_STATE/CURRENT_FACTS` 只存当前快照；handoff 只存恢复入口；PROGRESS/dated change 只存历史                                                                       | 防止旧计数和 SHA 被误读；唯一 marker/历史审计                        |
| C-12 | `AUTHORITY_MAP.json` 同时有重复的 `rule_hierarchy` 和 `precedence`                                                             | 保留一个 canonical precedence；Markdown/JSON 从同一源生成                                                                                                              | 消除机器源内部冲突；治理脚本                                         |
| C-13 | 根 README/RELEASE/历史文档含固定版本数字，可能落后于版本源                                                                     | “当前版本”只从 `config/platform-versions.json` 读取；历史版本必须带日期/tag/receipt                                                                                    | 版本数字随时间漂移；`version:check`/`version:consistency`            |
| C-14 | UI 旧标准、对齐文档与新版 Figma 规则并存                                                                                       | `UI_INDEX.md` 路由到唯一承载文件；旧文件只保留重定向存根和 archive 原文                                                                                                | 保留历史引用但不产生第二规范；`ui:check`/index                       |
| C-15 | 本地 hook、CI 配置和 `config/github-rulesets` 容易被描述为已启用远端规则                                                       | 只有 Hosted 回读（时间、仓库、规则、SHA）才可写“生效”；其余写 `NOT VERIFIED`                                                                                           | 配置文件不是托管事实；发布/PR receipt                                |
| C-16 | `README.md`、`RELEASE.md`、`CHANGELOG.md` 仍写 2.1.0；历史状态材料写 2.1.10/2.1.12；实际版本源和镜像已变化                     | “当前版本”只读 `config/platform-versions.json`；旧数字必须带日期、tag 或 receipt，未有 immutable tag/安装回读不得写“已发布”                                            | `version:check`、`version:consistency`、release receipt              |
| C-17 | `WORKTREE-LIFECYCLE.md`/reclamation JSON 固定写历史 worktree 数，但实时 `git worktree list --porcelain` 会变化                 | 规则正文只写上限和实时命令；数字只进带日期审计，不把历史快照当当前事实                                                                                                 | `workspace:inventory`、`worktree:reclaim`                            |
| C-18 | `TESTING.md` 固定写 unit/browser/desktop 数量，当前目录计数已不同                                                              | 规则只定义落点、运行器和覆盖要求；每次 verification 写本次实际计数                                                                                                     | 测试收据 + `npm run test*`                                           |
| C-19 | `DEVELOPMENT.md` 要求每个 worktree 独立 `npm ci`；`BRANCH-POLICY.md` 又要求 junction 共享主仓 `node_modules`                   | CI、发布和高风险验证必须独立 `npm ci`；开发并行可受控 junction 加速，但记录来源和 hash，不能用于 release receipt                                                       | `npm ci`、verification、发布脚本                                     |
| C-20 | 历史证据文件有中文/空格，当前规则未区分存量与新文件                                                                            | 历史文件保持原名以保护 manifest；新增目录和证据文件使用 ASCII lower-kebab，显示文案放 Markdown/JSON                                                                    | `markdown:check`、评审和 evidence manifest                           |
| C-21 | 外层 `D:/kk-studio/docs/REPO-STRUCTURE.md` 仍写旧分支 `codex/TASK-ID-slug`、ADR `NNNN-kebab-title` 和多处动态数量              | 外层文档改为容器路径路由；现行分支/ADR/数量只引用本文件和主仓实时命令，旧段落标 `SUPERSEDED`                                                                           | 外层结构审计 + 主仓 `index:check`                                    |
| C-22 | 外层 `REPO-STRUCTURE.md` 禁止把任何日志/截图放进 `docs/changes`，而历史交付包已保存部分受控 evidence；同时静态写死包和文件数量 | 新交付证据必须放对应 change package 的 `evidence/` 并由 `verification.md` 索引；顶层 `docs/evidence` 只收跨任务/历史基线；历史文件不批量迁移，数量改为实时/dated audit | `delivery:check`、evidence manifest、外层文档迁移任务                |
| C-23 | `.github/workflows/quality.yml` 仍可能同时触发 `master`，但主线规则只认 `main`                                                 | `main` 是唯一集成线；`master` 仅保留迁移/历史回读，不作为新 CI/发布目标                                                                                                | workflow 审查、Hosted 回读                                           |
| C-24 | `AI-EVALS.md` 的历史 active/ruleset 回读段落容易被当成当前远端事实                                                             | 所有 Hosted/eval 回读必须绑定日期、仓库、SHA、运行 ID；历史结果标为 dated evidence，当前缺回读统一 `NOT VERIFIED`                                                      | eval/Hosted receipt                                                  |
| C-25 | `OWNER_MAP.json` 保留 2026-10-09 的 117 条 ledger 快照，而当前账本为 120 条                                                    | owner、任务计数和状态只读 `task-ledger.json`；OWNER_MAP 只能是带日期的生成快照，不能手工维护或覆盖当前事实                                                             | 账本生成脚本/快照审计                                                |

## 7. 新任务、规则变更和旧规则处理

### 7.1 新增任务

1. 先搜索现有 `task-ledger.json`、功能 registry、open PR、change package 和相邻模块；能复用就不新建。
2. 新任务必须使用 `TASK-AREA-NNN`、目标、范围/非范围、AC、依赖、Owner、branch、worktree、影响模块、风险、回滚入口和更新时间；历史 ID 只读兼容，不因格式不符阻断治理。
3. 功能变化先建/更新 `feat-*.md` 和 registry，再实现；任务完成后按证据推进功能状态。
4. 任务状态只能按 `TODO → READY → IN_PROGRESS → REVIEW → DONE` 或进入 `PARTIAL/BLOCKED/REGRESSION/OBSOLETE`，不能跳过证据。

### 7.2 新增或修改规则

| 步骤        | 要求                                                                            | 可验证结果                                            |
| ----------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1. 提案     | 建 `docs/changes/YYYY-MM-DD-rules-<slug>/intent.md`，写问题、来源、影响、非目标 | 有 Task ID 和原文链接                                 |
| 2. 冲突分析 | 列出受影响来源，逐条写“原规则 → 新规则”、取舍、兼容期、门禁                     | `spec.md` 有冲突表和唯一承载文件                      |
| 3. 设计     | 说明文档归属、机器字段、脚本/测试、回滚和迁移顺序                               | `plan.md` 有文件清单和命令                            |
| 4. 实施     | 先改规范源，再改索引/脚本/测试；生成视图用脚本刷新                              | `markdown:check`、`index:check`、`doc:commands:check` |
| 5. 验证     | 运行规则场景回归；分别报告确定性检查和 live eval                                | `verification.md` 有 SHA、命令、退出码、缺口          |
| 6. 采用     | PR 独立 review；合入后更新 `PROJECT_STATE`、`PROGRESS`、账本和本文件版本        | `review.md` + 合入 SHA                                |

### 7.3 版本和兼容过渡

- **补丁版**：措辞、链接、示例和不改变行为的澄清；保留原规则编号，追加变更记录。
- **次版本**：新增字段、门禁或改变默认流程；旧规则标 `DEPRECATED`，至少保留一个交付周期的兼容说明。
- **主版本**：改变权威顺序、状态语义、目录/分支契约或删除兼容入口；必须有迁移任务、回滚方案和用户可见影响说明。
- 废弃规则移动到 `docs/archive/` 或保留重定向存根，文件头写 `SUPERSEDED BY <path> since <date>`；禁止静默删除、覆盖历史证据或让旧入口继续看起来有效。
- 每次规则变更在本文件顶部版本号和变更表中记录 `date / task / source / old → new / migration / verification`；变更记录进入 Git，不能依赖聊天记忆。

## 8. 文档与代码同步

| 触发条件                            | 同步要求                                                            | 落地检查                                    |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| 新增/移除功能或入口                 | registry、功能卡、账本、README 生成视图                             | `npm run features:check` / `features:write` |
| 数据 schema、存储、协议、权限、依赖 | ADR、数据文档、迁移/回滚、对应测试                                  | ADR 评审 + 受影响测试                       |
| 代码行为或公共契约改变              | 同一任务包的 spec、verification、`PROGRESS`；必要时 `PROJECT_STATE` | `delivery:check` + review                   |
| 新增/修改门禁或命令                 | `package.json`、脚本、专项规范门禁表、测试                          | `doc:commands:check`、目标脚本              |
| 分支、worktree、合入和发布流程      | 本文件、`BRANCH-POLICY`/`WORKTREE-LIFECYCLE`、模板和 CI             | `worktree:check`、delivery/CI               |
| UI token/组件/状态                  | `UI_INDEX` 指向文件、`tokens.css`、组件、browser/desktop 证据       | `ui:check` + 同状态截图/DOM                 |
| 规则、提示词、模型或工具变化        | `AI-EVALS` 场景、确定性检查、失败样例                               | live eval 缺条件写 `NOT RUN`                |
| 版本或发布产物                      | `config/platform-versions.json`、镜像、receipt、CHANGELOG/RELEASE   | `version:check`、hash/安装回读              |

文档改动不得写入密钥、用户数据、未脱敏日志或不可追溯二进制。Markdown 链接必须通过 `npm run markdown:check`；`docs/engineering`、`docs/architecture`、`docs/governance` 新 Markdown 必须登记 `docs/README.md`；脚本引用的命令必须存在于 `package.json`。

## 9. 合入、发布和回滚判定

### 9.1 合入判定

只有以下条件全部有当前 head 证据，任务才可写 `DONE`：

- 适用的 lint、typecheck、unit/browser/desktop/service 测试通过，失败和 flaky 已解释；
- 交付包五件套齐全，账本、功能卡和相关文档同步；
- 独立 review 绑定 exact head，P0/P1/阻断意见清零；
- PR/CI/托管 ruleset 状态实际回读；
- 用户产品验收与技术准备、Hosted、Provider、Tauri、发布状态分开记录；
- 合入后重新 fetch，确认 merge SHA 属于 `origin/main`，并对受影响范围回归。

### 9.2 发布判定

发布必须从干净的不可变 tag/commit 开始，读取版本源，锁定依赖，构建并生成 receipt。receipt 至少包含 commit/tree、平台版本、构建入口、输入文件 hash、产物 hash、工具版本和时间。旧快捷方式、文件 mtime、旧 worktree、旧 EXE 或本地 `reason: current` 不能单独证明发布、安装或用户验收完成。

### 9.3 回滚判定

P0/P1、数据不可读、依赖引发不可控回归、持续门禁失败或部署健康检查失败时，按 `ROLLBACK.md` 通过新提交/新版本回滚；不可改写已发布 tag。回滚同样需要 Task ID、PR、verification、review、保留上一可用产物和恢复证据。

## 10. 采用清单

本文件合入主线时按以下顺序完成：

1. 在 `docs/README.md` 的治理表登记本文件；
2. 在 `AGENTS.md`、`AI_RULES.md`、`CONTRIBUTING.md` 只保留入口链接，删除重复流程正文，并把 `codex/` 过渡说明标明为 legacy；
3. 将 `D:/kk-studio/docs/REPO-STRUCTURE.md` 的 ADR 命名、evidence 落点、worktree 数量和动态版本改为“容器路由 + 命令回读”，把旧数字移到 dated audit；
4. 让 `SPEC_BASELINE.md`、`AUTHORITY_MAP.json` 与 Markdown 只链接本文件并从一个 precedence 源生成，移除重复排序和重复键；
5. 给 `PROJECT_STATE.md`、`PROGRESS.md`、`AI_HANDOFF.md` 加唯一 current/history marker 检查；
6. 更新模板，使每个规则/代码任务都带 Task ID、source/base/head SHA、范围、证据和遗留项；
7. 运行 `npm run governance:check`、`npm run markdown:check`、`npm run index:check`、`npm run doc:commands:check`、`npm run typecheck`、`npm test`，再运行适用的 `npm run verify`/平台检查；
8. 合入后重新回读 `git rev-parse HEAD`、`git rev-parse origin/main`、`git worktree list`、账本/registry 数量，生成新的采用证据。

在第 1–7 项未完成前，旧入口保持可读但标记为 `TRANSITIONAL`；不得声称整个规则体系已经在远端生效。
