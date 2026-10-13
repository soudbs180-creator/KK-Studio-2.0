# 文档入口

现行文档的 `updatedAt`/`snapshotDate` 使用项目日历日期（`Asia/Shanghai`）；原始运行回执保留带时区的时间戳。日期门禁在 UTC CI 也按同一项目时区判断，不把本地凌晨误判为未来，不以改旧日期或关闭检查规避失败。

本文件是 KK Studio 全部工程文档的索引与冲突裁决入口。找规则先查这里，不要凭记忆猜文件位置。

所有 AI 的共同规则见仓库根的 [AGENTS.md](../AGENTS.md) 与 [AI_RULES.md](../AI_RULES.md)。Claude/Gemini/Copilot/Cursor 等工具入口只引用这两份，不复制另一套政策。

## 阅读顺序

新会话或新 AI 的最小启动序列：

1. [AGENTS.md](../AGENTS.md) — 总规则，技术边界与禁止事项。
2. [AI_RULES.md](../AI_RULES.md) — 协作分工与事实纪律。
3. 本文件的索引表 — 定位当前任务需要的专项规范。
4. [`governance/task-ledger.json`](governance/task-ledger.json) — 认领任务前必读。
5. [governance/PROJECT_STATE.md](governance/PROJECT_STATE.md) — 当前项目事实。

## 工程文档

| 文档                                                        | 承载内容                                               |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| [SDLC](engineering/SDLC.md)                                 | AI 自主开发、风险分级、产物链和维护                    |
| [DEVELOPMENT-WORKFLOW](engineering/DEVELOPMENT-WORKFLOW.md) | 任务领取、需求确认、状态流转、开发笔记、验证和竞品节奏 |
| [CODING-STANDARDS](engineering/CODING-STANDARDS.md)         | 命名、文件规模边界、模块依赖方向、错误处理、状态管理   |
| [TESTING](engineering/TESTING.md)                           | 测试分层、覆盖要求、Playwright 运行契约、证据保存      |
| [DEVELOPMENT](engineering/DEVELOPMENT.md)                   | 开发环境、命令与证明范围、UI 三个运行入口              |
| [BRANCH-POLICY](engineering/BRANCH-POLICY.md)               | 分支命名、PR、squash 合并、回滚、pre-push 防线         |
| [REVIEW](engineering/REVIEW.md)                             | 独立审核身份、必查范围、严重度与阻断条件               |
| [PROMPTING](engineering/PROMPTING.md)                       | 用户口语转 engineering brief                           |
| [AI-EVALS](engineering/AI-EVALS.md)                         | 规则回归场景与实际强制层的边界                         |
| [VERSIONING](engineering/VERSIONING.md)                     | 版本号策略                                             |
| [LAUNCHER](engineering/LAUNCHER.md)                         | 启动器行为                                             |
| [WINDOWS-INSTALLER](engineering/WINDOWS-INSTALLER.md)       | Windows 安装器                                         |
| [WORKTREE-LIFECYCLE](engineering/WORKTREE-LIFECYCLE.md)     | worktree 创建、登记、回收与落点                        |
| [AUTO-MERGE](engineering/AUTO-MERGE.md)                     | 自动合并工作流与其未启用边界                           |
| [ROLLBACK](engineering/ROLLBACK.md)                         | 回滚触发条件与执行                                     |

> 本表必须完整覆盖 `docs/engineering/` 下的全部 `.md`。新增工程文档必须同步本表，`npm run index:check` 会校验。

## 架构文档

`architecture/`：运行时架构、数据存储与数据分级。

| 文档                                                       | 承载内容                                    |
| ---------------------------------------------------------- | ------------------------------------------- |
| [ARCHITECTURE](architecture/ARCHITECTURE.md)               | 进程模型、模块依赖、数据流                  |
| [DATA-STORAGE](architecture/DATA-STORAGE.md)               | 存储 schema、生命周期、迁移                 |
| [DATA-CLASSIFICATION](architecture/DATA-CLASSIFICATION.md) | 数据分级与处理约束                          |
| [GENERATION-PLATFORM](architecture/GENERATION-PLATFORM.md) | 生成平台接入                                |
| [LEGACY-MIGRATION](architecture/LEGACY-MIGRATION.md)       | 旧工程能力 keep/migrate/rebuild/reject 清单 |
| `architecture/adr/`                                        | 架构决策记录                                |

## UI 文档

[UI_INDEX.md](UI_INDEX.md) 是 **UI 规范唯一入口**，含现行文件分层表、冲突裁决规则和新增功能改病例。该索引的 §1 表是完整映射，新增 UI 文档须同步它。各文件分工：

| 文档                              | 承载内容                               |
| --------------------------------- | -------------------------------------- |
| [UI_RULES](UI_RULES.md)           | 零件规则、交互约束、复用约束           |
| [UI_ARCHETYPES](UI_ARCHETYPES.md) | 五种页面类型与选型                     |
| [DESIGN_TOKENS](DESIGN_TOKENS.md) | token 数值索引                         |
| [DESIGN-SYSTEM](DESIGN-SYSTEM.md) | 颜色与基础组件                         |
| [UI_SPEC](UI_SPEC.md)             | UI 运行与验证规范                      |
| [FRONTEND-SPEC](FRONTEND-SPEC.md) | 前端工程基线：技术栈、弹窗、供应商连接 |

`UI-STANDARDS.md` 与 `UI-ALIGNMENT.md` 已合并，保留为重定向存根，**不承载现行规则，也不要更新它们**；二者同样登记在 `UI_INDEX.md` §1.3。历史正文在 `archive/ui-history/`。

## 治理文档

`governance/`：项目级当前状态、规范索引、任务账本、已知问题和 AI 交接。不重复 feature change evidence。

| 文档                                                         | 承载内容                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [task-ledger.json](governance/task-ledger.json)              | **任务状态唯一事实源**                                                                    |
| [TASK_LEDGER.md](governance/TASK_LEDGER.md)                  | 账本生成视图，由 `npm run governance:write` 产出，不手改                                  |
| [TASK_STATUS](governance/TASK_STATUS.md)                     | 任务状态日期快照（current 路由；带 docId/updatedAt/source/status/supersededBy，不改状态） |
| [PROJECT_STATE.md](governance/PROJECT_STATE.md)              | 当前项目事实                                                                              |
| [AI_HANDOFF.md](governance/AI_HANDOFF.md)                    | AI 最短恢复入口（current 路由；历史证据回到 dated change package）                        |
| [PROJECT_GOALS](governance/PROJECT_GOALS.md)                 | 项目目标                                                                                  |
| [SPEC_BASELINE](governance/SPEC_BASELINE.md)                 | 各类状态的唯一来源映射                                                                    |
| [AUTHORITY_MAP](governance/AUTHORITY_MAP.md)                 | 权威来源地图与冲突处理顺序（机器可读版 `AUTHORITY_MAP.json`）                             |
| [KNOWN_ISSUES](governance/KNOWN_ISSUES.md)                   | 已知问题清单                                                                              |
| [WORKSPACE_MAP](governance/WORKSPACE_MAP.md)                 | 本机审计路径分布（非跨设备契约）                                                          |
| [RETENTION_MANIFEST](governance/RETENTION_MANIFEST.md)       | 保留意图声明（不授权删除或移动）                                                          |
| [MARKDOWN_AUDIT](governance/MARKDOWN_AUDIT.md)               | Markdown 链接审计与历史勘误索引                                                           |
| [UNIFIED-PROJECT-RULES](governance/UNIFIED-PROJECT-RULES.md) | 跨主题统一规则、目录/命名、编码流程、冲突裁决与规则变更机制                               |

> 本表必须完整覆盖 `docs/engineering/`、`docs/architecture/`、`docs/governance/` 下的全部 `.md`。`npm run index:check` 会校验覆盖率、ADR 编号唯一性与单一 ADR 目录。

`PROJECT_STATE.md` 与 `AI_HANDOFF.md` 使用稳定 `docId` 和 `updatedAt`。`PROJECT_STATE.md` 承载当前事实，`AI_HANDOFF.md` 只承载恢复入口；历史 change package 不参与当前路由。旧入口必须写 `status: superseded` 与 `supersededBy`，同一 `docId` 不得出现两份 `current`。

## 其他目录

| 目录           | 职责                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `changes/`     | 一次可审计的交付包：`intent` / `spec` / `plan` / `verification` / `review`                                                      |
| `features/`    | 功能卡与注册表看板，功能状态的唯一来源                                                                                          |
| `templates/`   | 交付包与功能卡模板                                                                                                              |
| `reference/`   | Figma、截图与外部参考索引                                                                                                       |
| `evidence/` | 已审历史证据保留；新运行日志/截图/报告先放容器 output/<task>/，只把经审阅的最小摘要或稳定回归夹具纳入仓库 |
| `archive/`     | 只读历史材料，不作为当前状态                                                                                                    |
| `superpowers/` | 历史技能沉淀与过程稿（与 `archive/` 分工：`archive/` 存被取代的文档，`superpowers/` 存技能/计划过程稿），均只读                 |

## 顶层文档

`docs/` 顶层只允许索引类与规范族入口。现存两份共享记忆文档不在上表各目录内，在此登记：

| 文档                                      | 承载内容                                                 |
| ----------------------------------------- | -------------------------------------------------------- |
| [MEMORY-CONTRACT](MEMORY-CONTRACT.md)     | 共享记忆契约：本机 Agent 的文件读写契约（产品功能规格）  |
| [MEMORY-GOVERNANCE](MEMORY-GOVERNANCE.md) | 记忆运维检查表：MEMORY-CONTRACT 的审计入口，不替换契约   |
| [PROGRESS](PROGRESS.md)                   | 里程碑流水，只记录已发生的变更并引用证据，不替代任务状态 |

## 容器层与产物区（仓库外，无版本管理）

| 位置                              | 职责                                                               | 入口                                        |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| `D:/kk-studio/`（容器）           | 非 git 仓库；worktree 唯一合法落点 `.worktrees/`                   | 容器上手：`D:/kk-studio/README.md`          |
| `D:/kk-studio/docs/`              | 容器级文档：竞品/审计/方案/架构参考/API 契约（**不承载现行规范**） | 容器文档索引：`D:/kk-studio/docs/README.md` |
| `D:/kk-studio/output/` | 任务运行输出、交付物与恢复包；恢复原件按 receipt/hash 保护，任务状态仍回读仓库账本 | 任务输出入口与收据 |
| `D:/kk-studio/.verification/`     | 任务验收留存，一任务一目录                                         | 结构调整方案 B2 建索引                      |
| `D:/kk-studio/.workbuddy/memory/` | AI 本地记忆（上下文辅助，非事实源；冲突以仓库文档为准）            | 见下方「本地记忆机制」                      |

## 源码、数据与文档的落点

| 内容 | 唯一落点与边界 |
| --- | --- |
| Desktop/Web 共享源码 | src/ 的现有 domain、features、components、runtime、styles；就近组织，按职责拆分 |
| Desktop 原生壳 | src-tauri/；IPC、文件和凭据能力不搬进浏览器领域层 |
| Native Mobile | 后续独立 mobile/ 工程；当前窄屏是响应式 Web，不复制桌面几何 |
| 静态设计与 demo | public/design/figma、public/fixtures/demo；保留版本化来源，不把真实生成原件混入 fixtures |
| 构建与依赖缓存 | dist、node_modules、target、vendor 构建输出默认留在产物区；已版本化宿主 schema 仍按其输入契约审阅 |
| 用户项目、原件和凭据 | 原数据根与系统凭据库；仓库、文档、测试报告不保存秘密或生产用户快照 |
| 当前规则与状态 | 本索引路由到主题唯一承载文件；功能看注册表，任务看账本，生成视图不手改 |
| 任务证据与恢复 | output/<task>/ 保留运行模式、SHA、hash、恢复清单；历史证据不重写成新 PASS |

新规则改对应承载文件和索引，不另建“统一规范副本”；交付包只记录本任务的意图、约束、实际变更与证据，不复制整套规范。历史目录和用户资料的删除/移动是独立授权与恢复流程。

## 权威优先级与冲突裁决

同一问题存在多份说法时，按以下顺序裁决，**上位覆盖下位**：

1. **当前用户意图** — 决定产品目标。任何文档都不能与之对抗。
2. **`AGENTS.md`** — 全部 AI 的最高规则入口。
3. **`AI_RULES.md`** — 协作分工、事实纪律、交付要求。
4. **专项规范** — 本文件索引表中的 engineering / architecture / UI / governance 文档，各自领域内唯一来源。
5. **`src/` 实际代码与运行证据** — 说明当前实际怎样。

裁决细则：

- **代码与规范冲突**时，不能默认以代码为准。先判断是实现缺陷还是规范过时，写明依据，并同步修正对应一侧。历史错误保留原貌，用追加勘误处理。
- **同层级文档冲突**时，以本文件的承载内容划分为准：一份文档只承载一类事实。若两份文档出现同类条目，说明归属划分有误，需删除其中一处并补链接，不允许两处都留。
- **汇总文档不新增事实**。`TASK_LEDGER.md`、`docs/README.md`、看板等派生视图只能从来源生成或索引，不手工维护第二份内容。
- **历史材料不参与裁决**。`archive/` 与已合并存根只用于追溯。
- **当前文档按稳定身份更新**。任务使用稳定 `taskId`，文档使用稳定 `docId`；更新时修改 `updated`/`updatedAt` 和来源，不因日期新建第二条 current。旧版本保留历史含义并通过 `supersededBy` 指向新入口；文件名、目录名和 mtime 不能单独决定最新版本。
- 规则变更必须同步「门禁映射」：`docs/engineering/CODING-STANDARDS.md` 的门禁表列出了每条规则对应的可执行检查，新增或放宽门禁时同表更新。

## 文档与代码同步

| 改动类型                       | 必须同步                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| 新增/移除功能                  | `features/features.registry.json` + `features/feat-*.md`，跑 `npm run features:write` |
| 数据结构、存储、协议、依赖变化 | `architecture/adr/` 新增 ADR                                                          |
| 门禁脚本变化                   | `engineering/CODING-STANDARDS.md` 门禁表                                              |
| 测试命令或配置变化             | `engineering/TESTING.md` 对应章节                                                     |
| 任务状态变化                   | `governance/task-ledger.json`，再跑 `npm run governance:write`                        |
| UI 令牌或组件契约变化          | `UI_INDEX.md` 指向的唯一承载文件                                                      |

文档改动同样受门禁约束：`npm run markdown:check` 校验相对链接（跨仓库链接会失败，跨仓库引用写纯文本路径）；`npm run index:check` 校验本索引覆盖率、顶层文档覆盖率、ADR 编号唯一性与单一 ADR 目录；`npm run snapshot:check` 校验任务快照的日期、数据源和非权威声明；`npm run doc:commands:check` 校验文档中 `npm run` 脚本真实存在；`npm run delivery:check` 校验交付包完整性。

## 本地记忆机制

本地记忆是 **AI 客户端的上下文辅助机制**，不是产品功能、不是数据存储、不参与运行时，也不能作为事实来源。它的唯一作用是让 AI 在跨会话时快速恢复工作上下文。

四层存储：

| 层           | 位置                                                                                             | 内容                         | 更新规则                                           |
| ------------ | ------------------------------------------------------------------------------------------------ | ---------------------------- | -------------------------------------------------- |
| 项目日记     | `D:\kk-studio\.workbuddy\memory\YYYY-MM-DD.md`                                                   | 当日实际做了什么、遇到什么坑 | 追加式，不覆写；不记录搜索结果、临时路径等瞬时信息 |
| 项目长期约定 | `D:\kk-studio\.workbuddy\memory\MEMORY.md`                                                       | 跨会话仍有效的项目约定       | 每次实质工作后提炼更新                             |
| 用户个人记忆 | AI 客户端的用户级记忆目录（各客户端不同，本机为 `%USERPROFILE%\.workbuddy\user-<id>\MEMORY.md`） | 用户跨项目偏好与本机环境事实 | 只在用户明确要求长期记住时写入                     |
| 任务账本     | 仓库内 `docs/governance/task-ledger.json`                                                        | 任务状态                     | 走门禁 `npm run governance:check`                  |

作用边界（重要）：

- `.workbuddy/` 位于 **容器目录 `D:\kk-studio\`**，在 git 仓库 `D:\kk-studio\KK-Studio-2.0` 之外，因此**不受版本管理、不随分支切换、不参与 PR 审查、不会同步到其他机器**。
- 因此本地记忆不能替代仓库内文档。任何需要团队共享、需要跨设备、需要长期权威的内容，必须写进仓库文档。
- 本地记忆与仓库文档冲突时，**一律以仓库文档为准**。
- 记忆内容不构成授权。用户说过的话若只存在记忆里而仓库无记录，执行前仍需确认。

## 仓库外的工作区结构

`D:\kk-studio\` 是容器目录，不是 git 仓库。真正的仓库根是 `D:\kk-studio\KK-Studio-2.0`。容器级结构规范见纯文本路径 `D:\kk-studio\docs\REPO-STRUCTURE.md`，快速上手见 `D:\kk-studio\README.md`。

worktree 落点：`D:\kk-studio\.worktrees\TASK-ID-slug`。新建 worktree 后需把主仓 `node_modules` 以目录联接（junction）挂入，否则 `eslint` 与 `typescript` 解析失败。
