# 分支、跨设备同步与发布

## 当前生效的分支运作规则（2026-10-11）

本节是当前用户明确指定的优先规则，覆盖本文中针对旧 `main` 集成线的历史表述。今后的最终合并目标是本地 `master`；任务不得以“先堆在多个分支、最后集中合并”作为交付方式。

仓库当前仍存在一次性的基线事实：已核对的 `master` 为 `609f5243`，当前整合线 `main` 为 `a431923e`，两者存在分叉（`master...main` 为 23/171）。因此，必须先完成一次有记录的基线迁移，把要保留的当前项目树合并或重建到 `master`，解决冲突并通过主线验证；在迁移完成前，禁止把旧 `master` 当作可直接接收当前功能的正常基线，也禁止用 `main` 冒充已经迁移完成的 `master`。这项迁移是唯一例外，不得借此把多个未验收任务打包合入。

### 1. 派发与创建

1. 派发任务时先生成唯一 `TASK-ID`，明确目标、范围、依赖、受影响模块、验收命令、负责人和预计完成时间，并登记到 `docs/governance/task-ledger.json`。
2. 任务一旦派发，立即从最新 `master` 的明确 SHA 创建一个独立 worktree 和任务分支；没有任务 ID 不得创建长期分支。创建后记录 base SHA、branch、worktree 和初始 `git status`。
3. 一个任务只允许一个任务分支、一个主要写入者和一个逻辑目标。独立任务可以并行；修改同一文件、协议或公共契约的任务必须串行或指定唯一写入者。
4. 默认不创建堆叠分支。只有已登记的硬依赖才允许临时堆叠，并且只能有一层、写清上游 SHA 和拆除时间；上游未合入前，下游不得标记为可合并。

### 2. 命名与开发期限

- 默认格式：`codex/<TASK-ID>-<short-slug>`；按职责可用 `feat/`、`fix/`、`docs/`、`test/`、`chore/`、`perf/`、`refactor/` 或 `hotfix/`，但必须保留任务 ID。
- 分支名不能代表多人共享的“开发主线”，不能把 UI、后端、文档和无关修复混在同一个任务分支。
- 任务应在一个短周期内完成；连续 3 个工作日未形成可审查提交，或 diff 已明显跨越原任务范围时，必须拆分任务或回到派发人处重新登记，不得继续把分支做大。
- 每次准备推送、交接或合并前都要从 `master` fetch，记录新的 base/head SHA；共享分支不 rebase、不 amend 已发布提交。

### 3. 分支完成后的自查

任务作者在请求合并前必须在自己的 worktree 完成并记录：

1. `git status --short --branch` 干净，`git diff --check` 通过，staged diff 只包含本任务文件；配置、依赖锁文件、静态资源和文档变更逐项核对。
2. 账本状态、功能卡、变更包（`intent/spec/plan/verification/review`）与实际实现一致；未完成、外部依赖和未验证项必须保留为 `PARTIAL`、`TODO`、`BLOCKED` 或 `REVIEW`。
3. 至少运行与任务相关的治理、格式、类型、单元/集成测试和构建；桌面、Web、Provider、原生服务或静态资源变更必须运行对应的真实入口检查。fixture、mock、旧截图或历史成功记录不能替代当前 SHA 的运行证据。
4. 以 `master` 最新 SHA 为基线做一次冲突预检；发现冲突先在任务分支逐项解决，再完整重跑受影响检查。不得用无差别 `ours/theirs`、整文件覆盖或删除冲突内容来“消除”冲突。

### 4. 合并前条件

只有同时满足以下条件才能合并回 `master`：

- 任务分支已包含最新 `master`，无未解决冲突，且提交/PR 的 base、head、任务 ID 一致；
- 自查清单、相关测试、`npm run typecheck`、`npm run lint`、`npm run governance:check`、`npm run markdown:check`、必要的 `npm run build`/`npm run verify` 均有当前 SHA 证据；
- 独立 review 已完成，P0/P1、阻断评论和未解释失败为零；
- 依赖、配置、锁文件、静态资源、迁移脚本和回滚方案已纳入 diff；任务若仍有真实 Provider、Hosted、安装包或用户验收缺口，不得写成 DONE；
- 合并前重新确认 `master` 没有前移。前移后必须更新分支、解决新冲突并重跑检查，不能沿用旧 green 结果。

合并采用 PR 或等价的可审计合并操作，禁止直接 push `master`、force push、跳过 hook 或把多个任务的提交一次性打包。阻塞任务留在原分支并登记原因，不为清空分支列表而强行合并。

### 5. 合并后的主线验证

合并完成后立即在干净的 `master` worktree 执行：

1. 记录合并 SHA，确认它属于 `master`，并确认 `git status --short --branch` 为空；
2. 检查本次任务的完整 tree，确认配置、依赖、静态资源和文档没有遗漏，必要时用 `git diff <pre-merge-sha> <merge-sha>` 对照；
3. 在合并后的 `master` 重跑治理、类型、相关测试、构建和受影响平台的真实入口检查；失败即标记回归并暂停后续合并；
4. 更新账本、功能注册表、`PROJECT_STATE.md` 和交付证据，明确哪些是本地通过、哪些仍是 `NOT_VERIFIED`；
5. 仅在主线验证通过后，才允许派发依赖该变更的新任务。

### 6. 清理时机

任务合并并完成主线验证后，逐项核对 PR merged 状态、合并 SHA、分支 head、worktree 是否干净、是否仍有未合入提交、未关闭 PR、外部引用或用户未保存改动。全部满足后才删除任务 worktree 和短期分支；删除动作及依据写入交付记录。

未合并、BLOCKED、REVIEW、dirty、仍被使用或含独有提交的分支必须保留。`master`、发布 tag、备份 ref 和恢复证据永不按此流程清理。不要用 `branch --merged` 单独判断，也不要批量删除“看起来旧”的分支。

## 旧规则迁移说明

以下历史段落保留已有迁移背景；其中出现的 `main`/`origin/main` 仅用于识别旧提交和旧远端，执行新任务时一律以本文件“当前生效的分支运作规则”中的 `master` 为准。不能因为旧段落仍保留 `main` 字样，就把 `main` 当成新的合并目标。

| 分支/引用                                                  | 规则                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| master、release/*                                          | 禁止直接推送、force push、删除；master 是唯一集成线             |
| codex/TASK-ID-slug                                         | AI 默认任务分支，一项逻辑目标一个分支；其他工具同样可用          |
| feat/fix/docs/chore/test/perf/refactor/hotfix/TASK-ID-slug | 兼容既有任务命名；不能在同一分支处理无关需求                     |
| vMAJOR.MINOR.PATCH 或 -rc.N                                | 发布标签创建后不可更新或删除                                     |

## 版本变更与合并门禁

版本变更只在任务分支完成，并随同功能代码通过 PR 合入 `master`。作者先从最新 `origin/master` fetch，确认当前 base/head 和 dirty 文件，再按真实受影响平台运行 `npm run version:bump -- --platform ...`；禁止直接编辑镜像版本或为了“看起来最新”只改 `VERSION`。PR 必须写明各平台旧值/新值、目标 commit、实际构建工件及未发布边界。

合并前的最低门禁是 `npm run version:check`、`npm run version:consistency`、`npm run lint`、`npm run typecheck`、相关测试和 `npm run delivery:check -- --base <base-sha> --head <head-sha>`。桌面变更还要从本任务 checkout 通过 GUI 启动器或 `start-kk-studio.bat` 生成当前 EXE，并记录 receipt、源码输入 hash、EXE hash、实际路径和进程；Web 运行态单独记录实际 bundle。旧分支、旧 worktree、旧快捷方式或旧安装包即使“能打开”也不能作为当前候选的证据。

合并后先由 quality CI 验证合并候选 SHA；只有从通过门禁的 `master` 提交创建不可变 `vMAJOR.MINOR.PATCH` tag，`windows-release` 才会重建并上传绑定该 SHA 的安装器与 receipt 工件。部署或其他环境只消费该 SHA/tag 的工件，并在启动时回读产品版本、commit/tree、文件 hash 和进程路径。没有当前 SHA 绑定的 CI/工件回执时，状态保持 `NOT_VERIFIED`，不能称为“所有环境已更新”。

现有旧分支名可保留；禁止为命名整齐批量重命名/删除。没有删除授权时不清理分支；用户明确“验收并清理已合并分支”后，可将核对过的具体短期分支列入待清理清单，无需反复确认授权，但稳定线和 tag 不在清理范围。当前 pre-push 默认拒绝所有远端 ref 删除，仓库尚无已审阅的远端清理流程；有授权也不能绕过 hook 执行删除。先完成单独的清理方案、核对和门禁，再按方案处理。

本地分支也默认保留，禁止直接 `git branch -D` 丢弃未整合工作。本地清理必须核对对应 PR、当前 head、远端备份及 worktree 登记；仍被使用、有独有提交或未提交改动时不得删除。pre-push 不能拦截本地删除，依靠执行前规则、审查和备份约束，不能夸称 Git 原生不存在的本地删分支 hook 已生效。

## 开始、交接、拉取

在实际工作目录运行 `git status --short --branch`、`git worktree list`、`git log -1 --oneline --decorate`、`git fetch origin`。先查账本中的未完成/已认领任务、open PR 和相近功能卡，再认领 task ID，登记 owner、依赖、影响模块、branch、worktree、origin/base SHA 与本地未提交文件；有重叠先确认单一写入者和交付边界，避免重复造轮。提交前 `git add -- <明确文件>`，检查 staged diff；禁止广泛 stage 别人的变更。

每台机器 clone 后先读取 AGENTS/AI_RULES、执行 `npm ci`、`npm run git:guards`，再从当前 origin/master 建 task worktree。新 worktree 只能创建在 `D:/kk-studio/.worktrees`（其他机器通过 `KK_WORKTREE_ROOT` 覆盖），并先执行 `npm run worktree:check -- --branch=<branch>`；默认最多 4 个活动 worktree、生成物最多 20 GiB，已有分支必须复用。创建 worktree 不自动安装依赖，结束后先运行 `npm run worktree:reclaim` 生成不可变计划。详见 [`WORKTREE-LIFECYCLE.md`](WORKTREE-LIFECYCLE.md)。本机路径是实例，不是跨设备运行契约。同一个仓库登记多个 worktree 合法。独立任务可并行，修改同一文件/公共契约必须串行或分配唯一写入者；固定 1421/1423 的运行验证也串行，不偷停别的任务进程。

依赖尚未合入 master 的任务可从已推送的上游 PR head 建临时堆叠分支。账本和 PR 写明上游 PR、base/head SHA 与依赖，把本 PR 的 base 指向上游任务分支，使 diff 只包含本任务；上游未通过门禁前不能把下游当作 master 可合并。上游以默认 squash 合入 master 后，原提交不在 master 的祖先链上；下游不能仅合并 master 或直接改 PR base 后声称 diff 已去重。应从最新 origin/master 建新的承接分支，只挑选本任务提交，逐项解决冲突、重跑受影响检查和 delivery check、按新 SHA 复审；新 PR 指向 master 并关闭/关联旧堆叠 PR，保留审查链和原分支。若上游实际采用保留祖先的合并方式，可验证 ancestry 与 diff 后更新原 PR base。共享分支仍禁止 rebase/force push。

交接和每次准备推送前重新 fetch，核对上游 master/依赖 PR 是否前移、相关文件是否有并发改动，再记录已推送的分支和 SHA、base、已完成与未完成的功能、待审问题、冲突处置和验证证据；账本/功能卡/PR 描述随状态更新。时间差通过保留双方提交并在任务分支解决具体冲突处理，不能把整份文件简单覆盖成一方版本。新设备 fetch 后核对 SHA/tree 和依赖，不能用旧截图认定当前版本。fetch 不会修改当前文件；`fetch --prune` 仅清理失效的远程跟踪引用，不能代替远程删除或证明分支已合并，默认不需要执行。

已推送或共享的任务分支不 rebase、不 amend 已发布提交；更新用新提交。普通 PR 前将最新 origin/master merge 入任务分支；堆叠 PR 在上游未合入时核对其最新 head，若前移则将上游分支 merge 入下游，逐项解决冲突，不使用无差别 ours/theirs。无共同祖先时停止自动合并，使用已记录的迁移方案，不能重做首次 tree 替换。

## 提交信息规范

所有提交与 PR 标题使用中文Conventional Commits 前缀，作用域用真实模块名：

```
<type>(<scope>): <祈使摘要>
```

| type       | 用途                 |
| ---------- | -------------------- |
| `feat`     | 新功能               |
| `fix`      | 缺陷修复             |
| `docs`     | 文档、注释、规则     |
| `refactor` | 不改变外部行为的重构 |
| `test`     | 测试新增或修正       |
| `perf`     | 性能                 |
| `chore`    | 构建、依赖、脚本     |

`scope` 用模块或领域名（如 `canvas`、`agent`、`creation`、`governance`、`ui`），不使用 `misc`、`stuff`、`update`。摘要用祈使句、不加句号、不写「修改了」「修复了」这类无信息前缀。

一个提交只做一件事。格式类改动（`format:`）与功能改动不混在同一提交。涉及多模块的提交在 PR 描述中拆分说明，不用 `misc` 掩盖范围。

示例：

```
feat(canvas): 统一图片编辑蒙版与连续重绘
fix(agent): 修复随包插件加载失败
docs(governance): 收敛 AI 协作文档结构
test(browser): 补充侧栏窄屏关闭优先级回归
```

## worktree 落点与生命周期

- 新任务 worktree 统一落`D:\kk-studio\.worktrees\TASK-ID-slug`（容器级），避免散落到 `C:\Users\Administrator\.codex\worktrees\` 或仓库内部。落点规范是本机实例约定，不是跨设备契约。
- 历史遗留 worktree 分布在容器级、仓库内、codex 目录三处。清理是独立任务，需先核对分支是否已合并、worktree 是否 dirty，再逐个处理，不批量删除。
- 创建 worktree 后必须把主仓 `node_modules` 以目录联接（junction）挂到新 worktree 下，否则 `eslint` 不是命令、`typescript` 模块解析失败。junction 可能在重新创建 worktree 后丢失，需重新建立。
- 同一仓库登记多个 worktree 合法。`git worktree list` 是发现当前实例的唯一准确来源。
- 所有 git 命令在仓库根 `D:\kk-studio\KK-Studio-2.0` 执行。`D:\kk-studio` 不是 git 仓库，在容器根执行 git 命令会报 `not a git repository`。

## 自动合并

- 目标：分支门禁全绿后无需人工再执行合并动作。
- 当前状态：**仓库内尚无自动合并脚本**。`scripts/governance/` 下只有 `delivery.mjs`、`import-boundaries.mjs`、`ledger.mjs`、`markdown-links.mjs`、`push-policy.mjs`。本文档此前的相关表述已按实际落地情况修正，不得声称自动合并已生效。
- 固定运行端口（1421 / 1423）的串行验证要求，使「全量verify 后直接合并」无法在并行任务下无条件成立，这是自动合并未落地的主要技术原因。
- 未来实现时必须满足：默认 dry-run，`--apply` 才执行；依次执行治理、交付、lint、typecheck、test 门禁，任一失败不写入 ref；合并前核对目标分支基线是否前移；本地 squash 合并，不代替 GitHub 侧 PR 与 ruleset。
- 不因自动合并而降低 [PR 与审核](#pr-与审核) 的四条合并条件。用户产品验收与独立 AI review 不能被脚本代替。

## 回滚触发条件与执行

出现以下任一情况，不在原分支上继续修，而是执行回滚：

| 触发条件                                | 回滚动作                                         |
| --------------------------------------- | ------------------------------------------------ |
| 合并后发现 P0/P1 缺陷且修复风险高于撤回 | `git revert` 合并提交，或将发布指针退回上一 tag  |
| 数据结构迁移导致既有数据不可读          | revert 迁移代码，按 `DATA-STORAGE.md` 的备份恢复 |
| 依赖大版本升级引发不可控回归            | revert 升级提交，回到上一可用 lockfile           |
| 门禁在某环境持续失败且短期无法定位      | 撤回该次合并，登记账本任务再排查                 |

回滚要求：

1. 回滚前确认目标 tag/提交的实际存在，`git cat-file -t <sha>` 核对，不用记忆中的 SHA。
2. 已发布的 `v*` tag 不可更新或删除（见唯一主线表）。回滚通过新提交或新版本实现，不改历史 tag。
3. 回滚后必须重跑 `npm run verify` 并记录失败原因，不允许「先回滚再说」。
4. 回滚本身也要走 PR 与交付包，在 `review.md` 写明触发条件与恢复验证。
5. 至少保留上一可用产物与必要备份；不得为「只留最新」删除恢复能力。

## PR 与审核

所有代码、文档、配置和治理规则改变通过 PR。默认 squash merge，任务原提交与审查保留在 PR。不能直接 push master，也不能使用 `--force`、`--force-with-lease`、`--mirror`、强制 refspec 或关闭 hook 来绕开规则。

每个 PR 新建 `docs/changes/YYYY-MM-DD-task-slug/` 完整交付包，五个核心文件（intent/spec/plan/verification/review）均进入本次 diff；延续任务在后续 PR 使用新的日期或明确后缀，不能只改旧包冒充当前交付。新包的 verification 路径须关联本次新增/更新的账本任务，PR 分支须匹配该任务的 branch。旧包勘误可以作为辅助变更保留历史，但不替代新包。`delivery:check` 还检查 base 已包含在 head 中；本地可传 `--branch <任务分支>` 核对，CI 通过环境变量提供实际 PR 分支。

PR 必须包含验收、风险/回滚、base/head SHA、影响平台及未完成项。合并条件是：

1. 当前候选 SHA 的 CI `verify` 与 `delivery` 成功，无未解决冲突和阻断评论。
2. 独立上下文 AI review 完成，P0/P1 与验收阻断项清零；后续修改已补审。
3. 用户确认最终产品结果/发布范围；对已授权的技术准备不追加形式审批。
4. 平台当前真实审批规则满足；AI 不能批准自己的 PR。

当前单 owner 方案保留强制 PR、checks、禁 force/删除和评论解决，平台 required approvals 设 0，用户验收记录与独立 AI review 分开保存。有真实不同账号 reviewer/专用作者 bot 时才提升为 1 approval + CODEOWNERS + stale approval dismissal。不要要求作者用同一账号 approve 自己，或伪造第二审阅人。CI 检查结构不证明审查质量。

## 合并完整性与“只保留最新”

合并前核对本期任务账本、open PR、各分支提交/改动和依赖，形成收敛清单：已集成、待合并、未完成、保留原因。不能只合并当前分支就声称整个项目完整，也不把未验收分支强行合入。

合并后 fetch，记录 hosted PR 的 merged 状态、原 head、merge SHA；确认 merge SHA 属于 origin/master。必要时核对审查后候选的完整 tree；目标分支并发前移时不能用旧 tree equality 隐藏新增提交，需核对实际组合。新机器在有共同祖先且干净的本地 master 执行 `git pull --ff-only`；失败时审计，不 reset 覆盖。

默认只显示/使用最新稳定发布，分支在验收后收敛到 master，Git 历史、PR、不可变 tag 和回滚证据保留。清理 squash 分支不能只依赖 `branch --merged`：须回读 PR merged、head SHA、merge commit 及当前远端 ref；head 后有新提交/仍有 open PR/dirty worktree 时禁止删除。没有清理授权时保留。

从通过 CI 的 master commit 创建版本 tag，记录版本、commit、各端产物 hash、schema 兼容、用户验收、回滚目标。至少保留上一可用产物与必要备份，后续大二进制保留策略按成本批准；不能为了只留最新删除恢复能力。生产部署只使用具体验收版本和授权目标，不自动动 VPS/数据或创建付费服务。

## 执行层及限制

- `npm run git:guards` 安装本仓库共有的 pre-push 防线，拒绝稳定线直推、非 fast-forward、已有 tag 更新及默认所有远端删除；不覆盖第三方 hook。它覆盖本机本仓库 worktree，不会传播到其他 clone，其他设备必须安装。它不能阻止本地 `git branch -D` 或管理员绕过，只是补充防护。
- `npm run governance:check` 校验文档入口、账本和架构边界；`npm run markdown:check` 校验现行 Markdown 的相对文件链接；`npm run delivery:check -- --base <SHA>` 校验 PR 变更包；CI 跑完整 verify/Rust/desktop build。结构检查不能保证文档事实正确，也不能证明 AI 实际阅读。
- `config/github-rulesets/` 是可审阅的服务器配置，不是自动生效目录。稳定门禁声明 squash merge queue、严格 `verify`/`delivery`/`deploy-linux`/`governance` 检查、线程解决和过期审查撤销；单 owner 的平台 approval 可保持 0，独立 exact-head review 由自动门禁单独核验；分支 all-refs safety 禁 force/deletion，master/release 要求 PR/current checks，v* 禁更新/删除。无 bypass actors；管理员仍可修改设置，AI 不得利用此能力绕过审核。
- 真正远端强制需托管平台支持并成功写入、回读 active rules。历史 2026-09-23 回读的三套 ruleset 只证明当时的 PR、检查、禁止删除与非快进规则；本轮没有新的远端回读，不能把历史结果当作当前 merge queue 或 required-check 配置。管理员仍可修改配置，后续须定期回读；不能把本地 hook 当服务端保护。若将来改回不支持规则的套餐或可见性，应将 EXT-GIT 重新标为未验证或阻断。
- 已提交受控自动合并工作流，但远端 ruleset、merge queue、required checks 和 `AUTO_MERGE_ACTIVATION` 尚未在本轮回读确认；因此默认保持关闭，不能把工作流文件当成远端已启用。门禁、主线健康暂停和 revert 回滚见 [`AUTO-MERGE.md`](AUTO-MERGE.md) 与 [`ROLLBACK.md`](ROLLBACK.md)。自动生产发布和付费 AI review 仍未配置。

参考：[GitHub 分支保护](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)、[Rulesets API](https://docs.github.com/en/rest/repos/rules)、[PR reviews](https://docs.github.com/en/pull-requests/reference/pull-request-reviews)。
