# Plan：Issue 68 设置保存与关闭同步

- Task ID：`TASK-ISSUE-68`；状态：IN PROGRESS；日期：2026-10-18。
- 关联：[intent](intent.md)、[spec](spec.md)；最小测试同步修复无需 ADR。
- Owner：Issue 68 专项执行者；branch：`fix/TASK-ISSUE-68-settings-save`；worktree：本执行环境独占 `issue68` 隔离树。
- Base / 开工 HEAD：`6b933f4ffd80cdd5ca2d3508678a4562fc2b02d8`；远端目标：`origin/main` 的 draft PR。
- 文档开工时 dirty/index 为空；测试由专项执行者单独负责，文档协作者本轮仅更新 spec/plan。最终候选无 `src` 产品变更。

## 开工证据

- 已按根 [AGENTS](../../../AGENTS.md)、[AI_RULES](../../../AI_RULES.md)、[SDLC](../../engineering/SDLC.md)及[模板](../../templates/plan.md)形成本包；实现和测试继续遵守对应工程规则。
- 协调者已核对 Issue 68 无其他认领者、最新 main 及只读候选不重叠；候选与原脏目录均不写入、不盲目合并。
- PRE-EXISTING FAILURE：quality run `39060650077` 在 `tests/desktop/taskhost-lifecycle.mjs:629` 第二次“模型”点击超时；artifact `12111469102` 留存。
- 依赖/工具、本树 lint/typecheck/测试基线与实验细节由执行者补入 verification；浏览器 gate 2/2、真实延迟 native 13/13、正式 native 11/11 已通过，两份 native 回执均确认凭据清理完成。完整 verify 仍在进行，不混写结果。
- 用户已授权范围内的 AI 技术决定：隔离复现、最小修复、回归和独立审查；符合条件后提交、推送、draft PR，不包含合并或发布。

## 状态与开发笔记

| 时间       | 状态                                    | 原因/决策                                                                        | 证据                                                                                                        |
| ---------- | --------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-10-18 | IN_PROGRESS / native PASS，整体尚未验完 | 最小测试同步修复；浏览器 gate 2/2、真实延迟 native 13/13、正式 native 11/11 通过 | `native-delay-evidence-v3/receipt.json`、`native-final-evidence/receipt.json`；完整明细由 verification 承接 |

- FACT：原源码保存→关闭→模型缺显式保存完成与 dialog hidden 断言；浏览器 controlled native commit gate 在原产品源码上 2/2 通过。hold 时关闭 disabled、Escape/遮罩保护有效；release 后成功、正常关闭、dialog hidden 和模型菜单可见顺序通过。
- 独立只读诊断支持仅修测试同步，无产品逻辑改动。CI 中具体吞点击机制因无事件轨迹仍为 INFERENCE，不将该机制写成已证实根因。
- 真实 native 延迟实验已完成：外部脚本复用现有 `provider-credential-recovery` 的 fetch/postMessage 与 callbacks Map 暂扣真实 commit 回执，不提交脚本。`native-delay-evidence-v3/receipt.json` 为 `passed=true`、13 checks 全通过、`credentialCleanupComplete=true`；正式 `native-final-evidence/receipt.json` 为 `passed=true`、11 checks 全通过、清理完成。前两次冻结 Tauri invoke 替换因 hook 未安装失败的原件保留，归类注入方法失败，不能算产品失败。
- 不采用 force-click、延长超时、忽略失败或跳过测试；不改变保存期间禁止关闭的既有契约。

## 实施顺序

| 步骤 | 文件/模块                                                                           | 改动和目的                                                                                                               | 依赖                       | 验证                                                                 |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------- |
| 1    | 日志、artifact、相关设置源码与测试                                                  | 核对完成回执、关闭现场、busy 传播和既有契约                                                                              | 已完成只读归属检查         | 保留原失败，列 FACT / INFERENCE / UNKNOWN                            |
| 2    | 独占测试环境及外部实验脚本                                                          | 浏览器 gate 2/2、暂扣真实 native commit 回执实验 13/13 与正式 native 11/11 已通过                                        | 1                          | 分开记录浏览器结果、注入失败与两份真实 native 通过回执，凭据清理完成 |
| 3    | `tests/desktop/taskhost-lifecycle.mjs`、`tests/browser/settings-navigation.spec.ts` | native 等待官方 API 配置成功 status，再关闭并断言 hidden；浏览器延迟用例补 hold 无成功、release 成功及关闭后模型菜单断言 | 2 的受控实验与独立只读诊断 | 保持原保护断言；无 `src` 产品变更，无扩大超时                        |
| 4    | 本分支受影响检查与交付包                                                            | 运行定向、静态及适用完整门禁，记录限制                                                                                   | 3                          | 命令、退出码、运行环境与源码身份                                     |
| 5    | 已提交 diff、专用分支、draft PR                                                     | 秘密/无关文件检查，精确 SHA 独立 review，推送关联 Issue 68                                                               | 4                          | review、PR 和当前 CI；交协调者统一集成                               |

## 并行与冲突

- 仅三份计划文档可与只读诊断并行；同一产品/测试文件由专项执行者串行修改。
- 固定端口运行验证须串行，不停止其他任务进程；冲突或权限阻断先报告，继续独立安全调查。
- 由协调者处理 main 集成；推送前重新核对 origin/main、open PR 和重叠文件，基线变化后重跑受影响检查及审查。

## 风险与恢复

- 最大风险是把待决保存误当完成或绕过关闭保护；受控延迟与失败路径回归必须验证真实完成边界。
- 本专项不恢复旧源码、不删除/移动文件和工作树、不清理依赖与产物、不改原脏树，不替换日常客户端。
- Web 2.1.38 的成功部署保持；本次测试失败不触发生产回滚。版本号无变更。

## 验证和交付

- 原 CI 失败、浏览器 gate 2/2、前两次 hook 注入失败、真实延迟 native 13/13 与正式 native 11/11 通过回执分别保留。继续完成适用的 lint、typecheck、test、build、verify、Markdown 和 delivery 门禁，具体结果写 verification。
- 阶段记录（已由本地收尾替代）：当时完整 verify 仍在进行：Node 1852 PASS / 20 SKIP、Agent 199 PASS / 2 SKIP 已通过，browser 827 项正在运行；不得据此宣称完整 verify 通过。最终 commit、独立当前 SHA 审查及 Hosted 仍待办。
- native 检查绑定本树源码和实际工件；如需 UI 运行证据，按仓库端口及 Tauri 契约记录，不能以 Web 或旧 EXE 代替。
- 实现者自检后由独立上下文审查已提交 base/head；新 head 需要补审。verification/review 由专项执行者补齐。
- 既有账本及 PROGRESS 等状态同步由专项执行者处理，本计划文档协作者不写这些文件。
- 最终提交精确 commit、验证证据、draft PR、当前 CI 和剩余阻断；不 merge、发布、部署或宣称最终产品验收。

## 计划变更记录

- 2026-10-18：浏览器 gate 2/2 与独立只读诊断将方案收敛为两份测试的同步/断言修复，无产品改动；随后真实延迟 native 13/13 与正式 native 11/11 均通过且凭据清理完成。当时验收条件保持，完整 verify、最终 commit、独审与 Hosted 待办；现以本地收尾及review为准；CI 精确吞点击时序仍为 INFERENCE。
- 产品意图与授权范围无变化；不修改 intent 或其他任务记录。后续新证据若改变修复层，继续同步 spec/plan 并重跑受影响检查。

本地收尾追加：完整 verify exit0，产品浏览器827首试/0flaky/skip、设计41+8、开发态4步，Node1852/20既有skip、Agent199/2既有skip；Rust213/1ignored+41通过。此前进行中描述保留原阶段含义，以 verification 本地收尾为准；C1提交独审已PASS，最终文档head补审、draft PR及Hosted仍独立待验。
