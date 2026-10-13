# Plan：引入 hermes-agent 工程实践——代码健康棘轮、Windows 不安全模式扫描与 Actions SHA 固定

- Task ID：TASK-ENG-001
- 状态：IMPLEMENTED（PR 已建，未合并）
- 日期：2026-10-12
- Intent / Spec / ADR：intent.md / spec.md；无 ADR（工具链内部实现）
- Owner / branch / worktree：root / `feat/TASK-ENG-001-code-health` / `D:/kk-studio/.worktrees/TASK-ENG-001-code-health`
- Base / HEAD SHA 与远端目标：base = HEAD = origin/main `1f6cbd37091326a899fa600baba53bf6efd9cf16`；远端目标 main（PR）
- Git dirty/index 状态、并行任务与文件归属：worktree 干净起步；主 checkout（codex/ui-redesign-20261011）有未提交文档改动，本任务不读写该目录；package.json、docs/engineering/DEVELOPMENT.md、.github/workflows 为共享文件，冲突在合并时解决

## 开工证据

- 已读取的规则、账本、规范和实现：AGENTS.md、AI_RULES.md、SDLC.md、DEVELOPMENT-WORKFLOW.md、BRANCH-POLICY.md（主 checkout）、docs/engineering/DEVELOPMENT.md、task-ledger.json（123 条）、package.json、.github/workflows/*；hermes-agent CONTRIBUTING.md、architecture 文档与 scripts/code_health 源码（config/cli/compare/model/gitio/measure/ts_units.mjs/check-windows-footguns.py）
- 依赖/工具版本与安装：Node 24.20.0（engines >=24）；`npm ci --ignore-scripts`（244 包，16s）；typescript ^5.6.3 既有
- 基线 lint/typecheck/相关测试：见 verification.md（origin/main 基线逐项）
- PRE-EXISTING FAILURE 与关联任务：test:ui（Playwright msedge）与 test:agent 在基线状态于 verification.md 记录；存量超标代码（App.tsx 等）为已知债，属棘轮存量清单而非失败
- 计划中 AI 自主事项：全部实现与验证（已授权范围）
- 必需外部条件与已存在的用户授权：无；用户 2026-10-12 授权"改进我的项目"

## 状态与开发笔记

| 时间             | 旧状态      | 新状态      | 原因/决策                | 负责人 | 证据路径        |
| ---------------- | ----------- | ----------- | ------------------------ | ------ | --------------- |
| 2026-10-12 19:0x | TODO        | IN_PROGRESS | 用户授权落地 hermes 实践 | root   | intent.md       |
| 2026-10-12 19:4x | IN_PROGRESS | REVIEW      | 实现与自测完成，门禁跑完 | root   | verification.md |

关键技术方案、放弃方案、影响范围和遗留问题：

- 决策与依据：度量走 TS AST（解析级，零类型检查成本）；匹配五通道与 hermes 一致但相似度用集合重叠近似；模式规则三条（EMPTY_CATCH/AS_ANY/CONSOLE_LOG-src）；advisory 起步；ENFORCEMENT 从 origin/main 读、缺失失败关闭。
- 方案取舍：放弃 v1 实现 difflib SequenceMatcher 行级存活匹配与跨文件迁移抵扣（只会更严不会放行，advisory 下无门禁影响）；放弃 JSON 输出开关（预留）。
- 数据/平台/并发影响：无数据影响；CI verify job（windows-latest, fetch-depth 0）新增两个 advisory 检查，不改变既有退出码。
- 遗留问题、后续 Task ID 和解除条件：① CODING-STANDARDS.md 门禁表补齐（待 ui-redesign 合并）；② windows-release.yml rust-toolchain@stable SHA 固定（同前）；③ hermes 功能层思路评估；④ 存量 burn-down 与 advisory→blocking 翻转时机。

## 实施顺序

| 步骤 | 文件/模块                                                                 | 改动和目的                                               | 依赖 | 验证                   |
| ---- | ------------------------------------------------------------------------- | -------------------------------------------------------- | ---- | ---------------------- |
| 1    | scripts/governance/{diff-scope,code-health.config}.mjs                    | git 作用域与配置（目标/规则/开关/glob）                  | 无   | 直跑单元自测           |
| 2    | scripts/governance/code-health-measure.mjs                                | TS AST 度量（移植 ts_units.mjs + 模式命中 + allow 注释） | 1    | 自测文件命中           |
| 3    | scripts/governance/code-health-compare.mjs                                | 五通道匹配与裁决（移植 compare.py 语义）                 | 2    | CC/FILE_LINES/模式自测 |
| 4    | scripts/check-code-health.mjs                                             | CLI、退出码、--report、ENFORCEMENT 读取                  | 3    | 退出码 0/1/2           |
| 5    | scripts/governance/footgun-rules.mjs + scripts/check-windows-footguns.mjs | 规则表与扫描器（移植 footguns 思路，规则按本项目栈重写） | 1    | 自测命中 + 自匹配修复  |
| 6    | package.json                                                              | 注册 health:check/footguns:check 并并入 lint             | 4,5  | npm run lint           |
| 7    | .github/workflows/{git-guards,quality}.yml                                | action tag → commit SHA + 版本注释                       | 无   | grep + YAML 有效性     |
| 8    | docs/engineering/DEVELOPMENT.md                                           | 命令表两行 + 新门禁章节                                  | 6,7  | markdown:check         |
| 9    | docs/changes/2026-10-12-TASK-ENG-001-code-health/* + task-ledger.json     | 五件套与账本登记                                         | 1-8  | governance:check       |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：无并行任务；本任务独立 worktree。
- 同文件写入的串行顺序：package.json 与 docs/engineering/DEVELOPMENT.md 可能被其他分支修改——本分支只做最小 diff，合并时以源分支解决。
- 整合负责人、目标 branch/base 和同步策略：root；目标 main；合并后重跑 verify。
- 冲突后重新验证的范围：package.json（lint 链）、DEVELOPMENT.md（markdown:check）、workflows（CI）。

## 风险与恢复

- 最危险的失败场景与预防：新门禁在 CI 误失败阻断合并——预防：advisory 模式 + merge-base 缺失时跳过（exit 0）+ 本地全量跑通 lint；action SHA 写错导致 CI 起不来——预防：SHA 来自 GitHub API tag/branch tip 实测，版本注释可对照。
- 数据备份/原件保护/回滚或补偿：无数据写入；回滚 = 还原三处 diff + 删七个新文件。
- 触发恢复的条件及 runbook：CI verify job 因新检查失败 → 先看 ENFORCEMENT 是否被误改 → 直跑复现 → 必要时本分支 revert。
- 高风险外部动作的授权、权限和费用边界：推送分支与建 PR 在用户授权范围内；不合并、不发布。
- 不选择的方案及理由：不接 hermes 本体（语言/领域不匹配、48k open issues、API 动荡）；不引 mypy/pyright 类检查（项目无 Python）；不做全库 blocking 起步（存量 69+41 会立刻阻断所有 PR）。

## 验证和交付

- 定向回归：棘轮四类规则 + allow + 退出码自测（CC=26、2001 行文件、as any、空 catch）；footgun 自测与自匹配修复记录。
- 完整验证与必要 Rust/native/live 检查：`npm run lint`、`npm run typecheck`、`npm test`、`npm run format:check`、`npm run governance:check`、`npm run markdown:check`；`npm run verify` 全量在 verification.md 记录（test:ui/test:agent 按基线状态记录，环境受限项标 NOT RUN/PRE-EXISTING）。
- UI 的 Figma/DOM/截图证据：不适用（无 UI 改动）。
- 独立 reviewer 与当前 SHA 审查：review.md（AI 独立上下文复核本 diff）。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：DEVELOPMENT.md + ledger + 本交付包；PROGRESS 由迭代收口时更新。
- PR、用户产品验收、发布和回滚记录：PR #56 https://github.com/soudbs180-creator/KK-Studio-2.0/pull/56（head `ae72d61f` → base `main`，**未合并**）；用户仅授权实施，无产品验收需求；发布不适用。
- 暂不可验证项及准确状态：CI 实跑（推送后由 GitHub Actions 执行，本地记 NOT RUN）；ui-redesign 合并后的 CODING-STANDARDS 补齐（后续任务）。

## 计划变更记录

- 2026-10-12：scope 增加 `scripts/**/*.ts`（自测发现 scripts 下 .ts 不在范围）；footgun 规则表移入 scripts/governance/ 并排除出扫描范围（自匹配修复）；glob `**/` 语义修正为零或多目录段（修复 src/App.tsx 漏测）。均未改变产品意图与验收标准。

## 主线承接补充（2026-10-13）

基于最新 `origin/main` 重建后，新增的 `auto-merge.yml`、`main-guard.yml`、`windows-release.yml` 纳入同一 AC-4 复核并固定所有 action SHA；同时修复 `--head` 检查读取工作区而非指定修订的问题，并为无效 revision 增加 fail-closed。原始 base 与未合并分支的历史判断不改写。
