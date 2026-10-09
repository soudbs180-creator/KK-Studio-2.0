# 文档入口

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

| 文档 | 承载内容 |
| --- | --- |
| [SDLC](engineering/SDLC.md) | AI 自主开发、风险分级、产物链和维护 |
| [CODING-STANDARDS](engineering/CODING-STANDARDS.md) | 命名、文件规模边界、模块依赖方向、错误处理、状态管理 |
| [TESTING](engineering/TESTING.md) | 测试分层、覆盖要求、Playwright 运行契约、证据保存 |
| [DEVELOPMENT](engineering/DEVELOPMENT.md) | 开发环境、命令与证明范围、UI 三个运行入口 |
| [BRANCH-POLICY](engineering/BRANCH-POLICY.md) | 分支命名、PR、squash 合并、回滚、pre-push 防线 |
| [REVIEW](engineering/REVIEW.md) | 独立审核身份、必查范围、严重度与阻断条件 |
| [PROMPTING](engineering/PROMPTING.md) | 用户口语转 engineering brief |
| [AI-EVALS](engineering/AI-EVALS.md) | 规则回归场景与实际强制层的边界 |
| [VERSIONING](engineering/VERSIONING.md) | 版本号策略 |
| [LAUNCHER](engineering/LAUNCHER.md) | 启动器行为 |
| [WINDOWS-INSTALLER](engineering/WINDOWS-INSTALLER.md) | Windows 安装器 |

## 架构文档

`architecture/`：运行时架构、数据存储与数据分级。

| 文档 | 承载内容 |
| --- | --- |
| [ARCHITECTURE](architecture/ARCHITECTURE.md) | 进程模型、模块依赖、数据流 |
| [DATA-STORAGE](architecture/DATA-STORAGE.md) | 存储 schema、生命周期、迁移 |
| [DATA-CLASSIFICATION](architecture/DATA-CLASSIFICATION.md) | 数据分级与处理约束 |
| [GENERATION-PLATFORM](architecture/GENERATION-PLATFORM.md) | 生成平台接入 |
| [LEGACY-MIGRATION](architecture/LEGACY-MIGRATION.md) | 旧工程能力 keep/migrate/rebuild/reject 清单 |
| `architecture/adr/` | 架构决策记录 |

## UI 文档

[UI_INDEX.md](UI_INDEX.md) 是 **UI 规范唯一入口**，含现行文件分层表、冲突裁决规则和新增功能改病例。各文件分工：

| 文档 | 承载内容 |
| --- | --- |
| [UI_RULES](UI_RULES.md) | 零件规则、交互约束、复用约束 |
| [UI_ARCHETYPES](UI_ARCHETYPES.md) | 五种页面类型与选型 |
| [DESIGN_TOKENS](DESIGN_TOKENS.md) | token 数值索引 |
| [DESIGN-SYSTEM](DESIGN-SYSTEM.md) | 颜色与基础组件 |
| [UI_SPEC](UI_SPEC.md) | UI 运行与验证规范 |

`UI-STANDARDS.md` 与 `UI-ALIGNMENT.md` 已合并，保留为重定向存根，**不承载现行规则，也不要更新它们**。历史正文在 `archive/ui-history/`。

## 治理文档

`governance/`：项目级当前状态、规范索引、任务账本、已知问题和 AI 交接。不重复 feature change evidence。

| 文档 | 承载内容 |
| --- | --- |
| [task-ledger.json](governance/task-ledger.json) | **任务状态唯一事实源** |
| [TASK_LEDGER.md](governance/TASK_LEDGER.md) | 账本生成视图，由 `npm run governance:write` 产出，不手改 |
| [PROJECT_STATE.md](governance/PROJECT_STATE.md) | 当前项目事实 |
| [AI_HANDOFF.md](governance/AI_HANDOFF.md) | AI 交接上下文 |
| [PROJECT_GOALS](governance/PROJECT_GOALS.md) | 项目目标 |
| [SPEC_BASELINE](governance/SPEC_BASELINE.md) | 各类状态的唯一来源映射 |
| [KNOWN_ISSUES](governance/KNOWN_ISSUES.md) | 已知问题清单 |

`PROJECT_STATE.md` 与 `AI_HANDOFF.md` 存在大量同名二级章节（历史累积，尚未拆分）。读到重复内容时以 `PROJECT_STATE.md` 为当前事实，`AI_HANDOFF.md` 仅作交接线索。

## 其他目录

| 目录 | 职责 |
| --- | --- |
| `changes/` | 一次可审计的交付包：`intent` / `spec` / `plan` / `verification` / `review` |
| `features/` | 功能卡与注册表看板，功能状态的唯一来源 |
| `templates/` | 交付包与功能卡模板 |
| `reference/` | Figma、截图与外部参考索引 |
| `evidence/` | 按 `YYYY-MM-DD-<主题>/` 组织的运行证据 |
| `decisions/` | 决策记录 |
| `archive/` | 只读历史材料，不作为当前状态 |

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
- 规则变更必须同步「门禁映射」：`docs/engineering/CODING-STANDARDS.md` 的门禁表列出了每条规则对应的可执行检查，新增或放宽门禁时同表更新。

## 文档与代码同步

| 改动类型 | 必须同步 |
| --- | --- |
| 新增/移除功能 | `features/features.registry.json` + `features/feat-*.md`，跑 `npm run features:write` |
| 数据结构、存储、协议、依赖变化 | `architecture/adr/` 新增 ADR |
| 门禁脚本变化 | `engineering/CODING-STANDARDS.md` 门禁表 |
| 测试命令或配置变化 | `engineering/TESTING.md` 对应章节 |
| 任务状态变化 | `governance/task-ledger.json`，再跑 `npm run governance:write` |
| UI 令牌或组件契约变化 | `UI_INDEX.md` 指向的唯一承载文件 |

文档改动同样受门禁约束：`npm run markdown:check` 校验相对链接（跨仓库链接会失败，跨仓库引用写纯文本路径）；`npm run delivery:check` 校验交付包完整性。

## 本地记忆机制

本地记忆是 **AI 客户端的上下文辅助机制**，不是产品功能、不是数据存储、不参与运行时，也不能作为事实来源。它的唯一作用是让 AI 在跨会话时快速恢复工作上下文。

四层存储：

| 层 | 位置 | 内容 | 更新规则 |
| --- | --- | --- | --- |
| 项目日记 | `D:\kk-studio\.workbuddy\memory\YYYY-MM-DD.md` | 当日实际做了什么、遇到什么坑 | 追加式，不覆写；不记录搜索结果、临时路径等瞬时信息 |
| 项目长期约定 | `D:\kk-studio\.workbuddy\memory\MEMORY.md` | 跨会话仍有效的项目约定 | 每次实质工作后提炼更新 |
| 用户个人记忆 | `C:\Users\Administrator\.workbuddy\user-<id>\MEMORY.md` | 用户跨项目偏好与本机环境事实 | 只在用户明确要求长期记住时写入 |
| 任务账本 | 仓库内 `docs/governance/task-ledger.json` | 任务状态 | 走门禁 `npm run governance:check` |

作用边界（重要）：

- `.workbuddy/` 位于 **容器目录 `D:\kk-studio\`**，在 git 仓库 `D:\kk-studio\KK-Studio-2.0` 之外，因此**不受版本管理、不随分支切换、不参与 PR 审查、不会同步到其他机器**。
- 因此本地记忆不能替代仓库内文档。任何需要团队共享、需要跨设备、需要长期权威的内容，必须写进仓库文档。
- 本地记忆与仓库文档冲突时，**一律以仓库文档为准**。
- 记忆内容不构成授权。用户说过的话若只存在记忆里而仓库无记录，执行前仍需确认。

## 仓库外的工作区结构

`D:\kk-studio\` 是容器目录，不是 git 仓库。真正的仓库根是 `D:\kk-studio\KK-Studio-2.0`。容器级结构规范见纯文本路径 `D:\kk-studio\docs\REPO-STRUCTURE.md`，快速上手见 `D:\kk-studio\README.md`。

worktree 落点：`D:\kk-studio\.worktrees\TASK-ID-slug`。新建 worktree 后需把主仓 `node_modules` 以目录联接（junction）挂入，否则 `eslint` 与 `typescript` 解析失败。
