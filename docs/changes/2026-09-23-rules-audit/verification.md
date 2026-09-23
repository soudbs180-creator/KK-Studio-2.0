# Verification：规则与 Markdown 一致性审计

- Task ID：TASK-RULES-004
- 记录状态：本地检查与第三轮独立复审通过；草稿 PR #10 的 Hosted CI 在步骤前被账户计费阻断
- 执行时间：2026-09-23，Asia/Shanghai
- cwd / branch：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-RULES-004-md-audit` / `docs/TASK-RULES-004-md-audit`
- Base：`da811283e55ce699e4c5425d92ad31ffba7513e3`；本地验证运行于提交前的任务 worktree，正式 review 在提交后绑定 head/tree。
- 工具与日志：Windows PowerShell、Node v24.19.0；加入 Markdown 解析器依赖后重新执行 `npm ci`（含项目 postinstall），退出码 0。本轮完整 verify 原始输出留在本机 `%TEMP%/kk-rules-verify-ast-20260923.log`，退出码 0；前两轮记录仍在 `%TEMP%/kk-rules-verify-final-20260923-1403.log`、`%TEMP%/kk-rules-verify-reviewfix-20260923.log`。日志均未进入 Git。

## 规则与实际执行矩阵

| 控制                   | 仓库中的执行证据                                                                            | 当前结论与剩余边界                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| AI 开工阅读共同规则    | AGENTS/AI_RULES 与 Claude/Gemini/Copilot/Cursor 入口，`governance:check` 核对入口存在和引用 | 结构已接线；无法静态证明各模型实际阅读和理解，新工具需实际演练                       |
| 任务/功能唯一状态源    | `task-ledger.json`、`features.registry.json`、生成视图；lint 的治理/功能校验                | 结构和路径能检查；实现真实性仍需代码与运行证据                                       |
| 一任务一分支与并行冲突 | ledger 校验活动 worktree/branch 重复，BRANCH-POLICY 要求登记影响模块和依赖                  | 不能自动发现两个任务改同一文件；上游 squash 后需从 main 建承接分支，只移入本任务提交 |
| 本机 Git 防线          | `.githooks/pre-push` 和 push-policy 单测拒绝稳定线直推、非 FF、tag 覆盖与远端删除           | 只对安装钩子的本机 clone 生效，不能代替服务器保护                                    |
| PR 交付与复审          | `delivery:check` 核对五文件包与账本，CI 配置有 verify/delivery，REVIEW 要求独立上下文       | Hosted PR #9 jobs 因账户计费在步骤前失败，当前不能合并；独立复审需绑定本任务最终 SHA |
| Markdown 链接          | 新增 `markdown:check`，接入 lint/verify；CommonMark/GFM 语法树与缺失链接回归               | 只覆盖现行相对文件目标；旧快照、锚点、外部链接和事实语义需另查                       |
| 设计与发布事实         | Design System 1.3、候选分支和 PR #9 回读，对照现行入口                                      | 源码候选已上传，main/tag/安装包未完成；Desktop 插件 CSP 和真实服务继续按账本跟踪     |
| 远端强制               | rulesets/protection API 回读为 403                                                          | EXT-GIT 仍未解除；不能声称平台强制已生效                                             |

## 实际检查

| 检查                                                      | 结果                                                                 | 范围                                                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 基线 `npm ci` / `npm run lint` / 治理与 delivery 相关单测 | PASS                                                                 | 隔离工作树从候选 SHA 开始，未改其他 worktree                                                                                                    |
| 首次 `npm run verify`                                     | FAIL 于 `format:check`                                               | 新增 `package.json` 脚本行未按 Prettier 格式化；前置 368 Node、治理/功能/链接/类型/UI 检查已通过，随后仅格式化该文件                            |
| 第二轮 `npm run verify`                                   | PASS，退出码 0                                                       | 逐字符解析修复后 369 Node、300 browser；该实现随后被独立复审发现 R4，因此不能作为最终验收结果                                                   |
| 本轮 `npm run verify`                                     | PASS，退出码 0                                                       | 语法树修复后 370 Node、300 browser、治理 61/0、功能 29/0、Markdown 81/0、UI 159/0、typecheck、format 与 Web build；无 Rust/原生运行变更或本轮原生验收 |
| 新 `node --test tests/unit/markdownLinks.test.ts`         | PASS，3/3                                                            | R1/R2 与 R4 的回归分别先失败再修复；覆盖嵌套图片、转义括号、转义文字、缩进代码、跨段反引号和 GFM 表格                                           |
| 历史证据保护                                              | PASS，本轮 22 个跟踪中的自动生成文件恢复至本工作树起始 HEAD 字节     | 前几轮分别恢复 21、22、19 个；`git diff -- docs/evidence docs/changes` 仅保留本任务交付包，原有截图/报告未随提交改写                              |
| GitHub PR #9 回读                                         | open、unmerged；head `da811283e55ce699e4c5425d92ad31ffba7513e3`      | 最新 `verify`/`delivery` jobs 均 completed/failure 且 0 steps，账单/spending limit 门禁仍阻断 main 合并                                         |
| 本任务 `delivery:check` 与第三轮独立上下文 review          | PASS，`d8e12c0` 的 28 文件/0 违规；独立补审 PASS                     | 审查绑定已推送的 SHA；状态记录增量仍须定向复核，本地 PASS 不替代 Hosted CI                                                                        |
| 草稿 PR #10 Hosted CI                                     | FAIL，`verify`/`delivery` 均 0 steps                                 | GitHub annotation 明确指出近期账户付款失败或 spending limit；没有执行测试，不能把本地 PASS 写成远端 PASS                                        |

全库 365 个基线已跟踪 Markdown 的扫描发现 37 处历史链接目标问题：归档进度 16 处相对路径、旧 UI 审计 13 处 `:行号` 链接、旧验证/评审合计 8 处未入库日志。分类与可用替代路径见 [Markdown 审计索引](../../governance/MARKDOWN_AUDIT.md)；遗留处理进入 `TASK-DOCS-HISTORY-001`。它们不是现行规范入口；历史文档不为通过新门禁而重写，需使用时核对原始路径、行号和当时产物。

首轮独立审查在提交 `6d550a6` 发现 R1/R2（Markdown 解析与围栏误判）两项验收阻断，已由 RED→GREEN 回归修复；REL-2.1.0 账本当前 PR 状态遗漏也已补录。第二轮对 `ae142de` 的独立复审发现 R4（嵌套图片、转义和 Markdown 块边界）仍阻断 AC-3；本轮新增回归先失败，再改用 `remark-parse`、`remark-gfm` 和 `unified` 的语法树解析并通过。第三轮对 `d8e12c0` 的独立补审为 PASS，R1–R4 均已关闭。结论：本轮规则整理和本地门禁为 PASS；草稿 PR #10 及上游 PR #9 的 Hosted CI、main 合并仍为 PARTIAL。静态检查能证明入口、链接、账本结构和一部分 Git 保护行为，不能证明每个 AI 实际读懂规则、所有文档事实正确或 GitHub 服务器保护已生效。
