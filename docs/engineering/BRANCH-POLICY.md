# 分支、跨设备同步与发布

## 唯一主线

远端 `origin/main` 是今后任务和发布的集成基线。一个完整项目树，短期任务分支通过 PR 集成；不长期保留互相漂移的“桌面版/网页版”产品分支。历史本地 main/master 与远端曾通过 tree 同步但没有共同提交祖先，不能对历史本地 main 盲目 pull/merge unrelated histories。新任务从 fetch 后的 origin/main 创建登记 worktree，保留历史分支和 dirty 根工作区供追溯。

| 分支/引用                                                  | 规则                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| main、master、release/*                                    | 禁止直接推送、force push、删除；master 只读历史，main 唯一集成线 |
| codex/TASK-ID-slug                                         | AI 默认任务分支，一项逻辑目标一个分支；其他工具同样可用          |
| feat/fix/docs/chore/test/perf/refactor/hotfix/TASK-ID-slug | 兼容既有任务命名；不能在同一分支处理无关需求                     |
| vMAJOR.MINOR.PATCH 或 -rc.N                                | 发布标签创建后不可更新或删除                                     |

现有旧分支名可保留；禁止为命名整齐批量重命名/删除。没有删除授权时不清理分支；用户明确“验收并清理已合并分支”后，可将核对过的具体短期分支列入待清理清单，无需反复确认授权，但稳定线和 tag 不在清理范围。当前 pre-push 默认拒绝所有远端 ref 删除，仓库尚无已审阅的远端清理流程；有授权也不能绕过 hook 执行删除。先完成单独的清理方案、核对和门禁，再按方案处理。

本地分支也默认保留，禁止直接 `git branch -D` 丢弃未整合工作。本地清理必须核对对应 PR、当前 head、远端备份及 worktree 登记；仍被使用、有独有提交或未提交改动时不得删除。pre-push 不能拦截本地删除，依靠执行前规则、审查和备份约束，不能夸称 Git 原生不存在的本地删分支 hook 已生效。

## 开始、交接、拉取

在实际工作目录运行 `git status --short --branch`、`git worktree list`、`git log -1 --oneline --decorate`、`git fetch origin`。先查账本中的未完成/已认领任务、open PR 和相近功能卡，再认领 task ID，登记 owner、依赖、影响模块、branch、worktree、origin/base SHA 与本地未提交文件；有重叠先确认单一写入者和交付边界，避免重复造轮。提交前 `git add -- <明确文件>`，检查 staged diff；禁止广泛 stage 别人的变更。

每台机器 clone 后先读取 AGENTS/AI_RULES、执行 `npm ci`、`npm run git:guards`，再从当前 origin/main 建 task worktree。本机路径是实例，不是跨设备运行契约。同一个仓库登记多个 worktree 合法。独立任务可并行，修改同一文件/公共契约必须串行或分配唯一写入者；固定 1421/1423 的运行验证也串行，不偷停别的任务进程。

依赖尚未合入 main 的任务可从已推送的上游 PR head 建临时堆叠分支。账本和 PR 写明上游 PR、base/head SHA 与依赖，把本 PR 的 base 指向上游任务分支，使 diff 只包含本任务；上游未通过门禁前不能把下游当作 main 可合并。上游以默认 squash 合入 main 后，原提交不在 main 的祖先链上；下游不能仅合并 main 或直接改 PR base 后声称 diff 已去重。应从最新 origin/main 建新的承接分支，只挑选本任务提交，逐项解决冲突、重跑受影响检查和 delivery check、按新 SHA 复审；新 PR 指向 main 并关闭/关联旧堆叠 PR，保留审查链和原分支。若上游实际采用保留祖先的合并方式，可验证 ancestry 与 diff 后更新原 PR base。共享分支仍禁止 rebase/force push。

交接和每次准备推送前重新 fetch，核对上游 main/依赖 PR 是否前移、相关文件是否有并发改动，再记录已推送的分支和 SHA、base、已完成与未完成的功能、待审问题、冲突处置和验证证据；账本/功能卡/PR 描述随状态更新。时间差通过保留双方提交并在任务分支解决具体冲突处理，不能把整份文件简单覆盖成一方版本。新设备 fetch 后核对 SHA/tree 和依赖，不能用旧截图认定当前版本。fetch 不会修改当前文件；`fetch --prune` 仅清理失效的远程跟踪引用，不能代替远程删除或证明分支已合并，默认不需要执行。

已推送或共享的任务分支不 rebase、不 amend 已发布提交；更新用新提交。普通 PR 前将最新 origin/main merge 入任务分支；堆叠 PR 在上游未合入时核对其最新 head，若前移则将上游分支 merge 入下游，逐项解决冲突，不使用无差别 ours/theirs。无共同祖先时停止自动合并，使用已记录的迁移方案，不能重做首次 tree 替换。

## PR 与审核

所有代码、文档、配置和治理规则改变通过 PR。默认 squash merge，任务原提交与审查保留在 PR。不能直接 push main，也不能使用 `--force`、`--force-with-lease`、`--mirror`、强制 refspec 或关闭 hook 来绕开规则。

每个 PR 新建 `docs/changes/YYYY-MM-DD-task-slug/` 完整交付包，五个核心文件（intent/spec/plan/verification/review）均进入本次 diff；延续任务在后续 PR 使用新的日期或明确后缀，不能只改旧包冒充当前交付。新包的 verification 路径须关联本次新增/更新的账本任务，PR 分支须匹配该任务的 branch。旧包勘误可以作为辅助变更保留历史，但不替代新包。`delivery:check` 还检查 base 已包含在 head 中；本地可传 `--branch <任务分支>` 核对，CI 通过环境变量提供实际 PR 分支。

PR 必须包含验收、风险/回滚、base/head SHA、影响平台及未完成项。合并条件是：

1. 当前候选 SHA 的 CI `verify` 与 `delivery` 成功，无未解决冲突和阻断评论。
2. 独立上下文 AI review 完成，P0/P1 与验收阻断项清零；后续修改已补审。
3. 用户确认最终产品结果/发布范围；对已授权的技术准备不追加形式审批。
4. 平台当前真实审批规则满足；AI 不能批准自己的 PR。

当前单 owner 方案保留强制 PR、checks、禁 force/删除和评论解决，平台 required approvals 设 0，用户验收记录与独立 AI review 分开保存。有真实不同账号 reviewer/专用作者 bot 时才提升为 1 approval + CODEOWNERS + stale approval dismissal。不要要求作者用同一账号 approve 自己，或伪造第二审阅人。CI 检查结构不证明审查质量。

## 合并完整性与“只保留最新”

合并前核对本期任务账本、open PR、各分支提交/改动和依赖，形成收敛清单：已集成、待合并、未完成、保留原因。不能只合并当前分支就声称整个项目完整，也不把未验收分支强行合入。

合并后 fetch，记录 hosted PR 的 merged 状态、原 head、merge SHA；确认 merge SHA 属于 origin/main。必要时核对审查后候选的完整 tree；目标分支并发前移时不能用旧 tree equality 隐藏新增提交，需核对实际组合。新机器在有共同祖先且干净的本地 main 执行 `git pull --ff-only`；失败时审计，不 reset 覆盖。

默认只显示/使用最新稳定发布，分支在验收后收敛到 main，Git 历史、PR、不可变 tag 和回滚证据保留。清理 squash 分支不能只依赖 `branch --merged`：须回读 PR merged、head SHA、merge commit 及当前远端 ref；head 后有新提交/仍有 open PR/dirty worktree 时禁止删除。没有清理授权时保留。

从通过 CI 的 main commit 创建版本 tag，记录版本、commit、各端产物 hash、schema 兼容、用户验收、回滚目标。至少保留上一可用产物与必要备份，后续大二进制保留策略按成本批准；不能为了只留最新删除恢复能力。生产部署只使用具体验收版本和授权目标，不自动动 VPS/数据或创建付费服务。

## 执行层及限制

- `npm run git:guards` 安装本仓库共有的 pre-push 防线，拒绝稳定线直推、非 fast-forward、已有 tag 更新及默认所有远端删除；不覆盖第三方 hook。它覆盖本机本仓库 worktree，不会传播到其他 clone，其他设备必须安装。它不能阻止本地 `git branch -D` 或管理员绕过，只是补充防护。
- `npm run governance:check` 校验文档入口、账本和架构边界；`npm run markdown:check` 校验现行 Markdown 的相对文件链接；`npm run delivery:check -- --base <SHA>` 校验 PR 变更包；CI 跑完整 verify/Rust/desktop build。结构检查不能保证文档事实正确，也不能证明 AI 实际阅读。
- `config/github-rulesets/` 是可审阅的服务器配置，不是自动生效目录。分支 all-refs safety 禁 force/deletion，main/release 要求 PR/current checks，v* 禁更新/删除。无 bypass actors；管理员仍可修改设置，AI 不得利用此能力绕过审核。
- 真正远端强制需托管平台支持并成功写入、回读 active rules。用户已确认将此仓库公开；2026-09-23 回读三套 ruleset 为 active，`main` 的有效规则包含 PR、必需检查、禁止删除与非快进。管理员仍可修改配置，后续须定期回读；不能把本地 hook 当服务端保护。若将来改回不支持规则的套餐或可见性，应将 EXT-GIT 重新标为未验证或阻断。
- 本次尚未配置自动合并、自动生产发布或付费 AI review 服务。功能不可用要明确记录，后续接入有预算的独立 reviewer 身份与受限凭据。

参考：[GitHub 分支保护](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)、[Rulesets API](https://docs.github.com/en/rest/repos/rules)、[PR reviews](https://docs.github.com/en/pull-requests/reference/pull-request-reviews)。
