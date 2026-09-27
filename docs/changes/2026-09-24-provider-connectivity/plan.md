# Plan：多供应商接入与多目标配置（Provider Connectivity）

- Task ID：TASK-PROV-002
- 状态：IN PROGRESS
- 日期：2026-09-24
- Intent / Spec / ADR：docs/changes/2026-09-24-provider-connectivity/{intent,spec}.md；无新 ADR
- Owner / branch / worktree：root / feat/TASK-PROV-002-provider-connectivity / D:/kk-studio/.worktrees/TASK-PROV-002-provider-connectivity
- Base / HEAD SHA 与远端目标：base origin/main 76339c9；本地提交后推送同名分支（暂不合并 main）
- Git dirty/index 状态、并行任务与文件归属：主 checkout 有 TASK-AGENT-006 未提交改动（workbuddy-gateway），本次工作全部在独立 worktree，不触碰主 checkout 脏文件；vendor/canvas-agent 与 scripts/agent 不在本次修改范围。

## 开工证据

- 已读取的规则、账本、规范和实现：AGENTS.md、AI_RULES.md、docs/engineering/BRANCH-POLICY.md、docs/engineering/SDLC.md（流程）、docs/governance/PROJECT_STATE.md、task-ledger.json、docs/features/features.registry.json、scripts/features/registry.mjs、scripts/governance/ledger.mjs、docs/templates/{intent,spec,plan}.md；实现：src/domain/providerConnections.ts、src/domain/modelProvider.ts、src/features/models/modelCatalog.ts、src/features/mcp/mcpClient.ts、src/integrations/generation/providerAdapterFactory.ts、docs/architecture/GENERATION-PLATFORM.md。
- 参考项目：CodexPlusPlus README + docs/specs/2026-06-23-model-catalog-prototype-design.md；cc-switch README + docs 目录结构。
- 依赖/工具版本与安装：Node 24（.nvmrc）；npm ci 已在 worktree 后台执行（含 postinstall agent/plugins 构建）。
- 基线 lint/typecheck/相关测试：待 npm ci 完成后记录；主 checkout 存量脏文件不影响 worktree 基线。
- PRE-EXISTING FAILURE 与关联任务：TASK-AGENT-006 在途（未提交）；PLUGIN-DESKTOP-001 已知开放；无与本次模块冲突的进行中任务。
- 计划中 AI 自主事项：模块设计、格式字段、白名单规则。
- 必需外部条件与已存在的用户授权：用户已授权加入接入能力；无需外部密钥/服务。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| ---- | --------- | ---------- | ---- | ---- |
| 1 | docs/changes/2026-09-24-provider-connectivity/{intent,spec,plan}.md | 任务文档包 | 无 | markdown:check |
| 2 | docs/governance/task-ledger.json | 登记 TASK-PROV-002（IN_PROGRESS，branch/worktree 实值） | 步骤1 | governance:check |
| 3 | docs/features/feat-032-provider-connectivity.md + features.registry.json | 功能卡 + FEAT-032 登记（PARTIAL，关联 TASK-PROV-002） | 步骤2 | features:check |
| 4 | src/features/providers/providerTargetRenderers.ts | Codex/Claude/OpenAI 三目标渲染（纯函数+zod 输出） | 无 | 单测+typecheck |
| 5 | src/features/providers/providerConfigIO.ts | 便携 v1 导出/导入/合并/seed 适配 | 步骤4 的 domain 复用 | 单测+typecheck |
| 6 | src/features/models/modelCatalogWindow.ts | 后缀解析 + catalog JSON 生成 | 无 | 单测+typecheck |
| 7 | src/features/mcp/mcpConfig.ts | stdio 契约 + 命令白名单 | 无 | 单测+typecheck |
| 8 | tests/unit/{providerTargetRenderers,providerConfigIO,modelCatalogWindow,mcpConfig}.test.ts | 对应单测 | 步骤4-7 | node --test |
| 9 | docs/changes/2026-09-24-provider-connectivity/{verification,remaining}.md + docs/PROGRESS.md | 验证记录、遗留清单、进度 | 步骤8 | markdown:check |
| 10 | governance:write + features:write | 生成 TASK_LEDGER.md 与 features README | 步骤2-3 | governance:check/features:check |
| 11 | 提交 + 推送分支 | 交付单元 | 步骤10 | git 回读 + CI（推送后） |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：本任务独占 src/features/providers/、modelCatalogWindow.ts、mcpConfig.ts、tests/unit 四个新文件与 docs 包；TASK-AGENT-006 在主 checkout 未提交，与其在途文件零交集。
- 同文件写入的串行顺序：task-ledger.json 仅本任务修改（主 checkout 的 ledger 改动未提交，合并时由 Git 处理；若冲突在任务分支解决）。
- 整合负责人、目标 branch/base 和同步策略：root；先本地验证，推送分支，PR 指向 origin/main；合入走既有 PR + CI + 独立审阅 + 用户验收。
- 冲突后重新验证的范围：如合并期 ledger/registry 冲突，解决后重跑 governance:check/features:check 与相关单测。

## 风险与恢复

- 最危险的失败场景与预防：渲染器输出形态与真实 Codex/Claude 消费不匹配 → 本批只交付纯函数 + 契约，接线任务对拍验证；catalog 字段不被某版本 Codex 识别 → 字段与 cc-switch/CodexPlusPlus 双重印证，接线时实跑确认。
- 数据备份/原件保护/回滚或补偿：不写用户数据；导出格式不含密钥；回滚 = 分支不合并。
- 触发恢复的条件及 runbook：npm ci 失败 → 读日志重试；门禁失败 → 修复后重跑。
- 高风险外部动作的授权、权限和费用边界：仅推送任务分支（仓库既有流程授权）；无费用。
- 不选择的方案及理由：不在浏览器实现 stdio 执行（无 spawn 能力）；不直接改 vendor/canvas-agent（避免与在途任务冲突，接线后置）。

## 验证和交付

- 定向回归：4 个新单测 + 存量 node --test 全量；typecheck；lint（含 governance/features/markdown 子门禁）；ui:check；format:check。
- 完整验证与必要 Rust/native/live 检查：无 Rust/UI 改动；浏览器 test:ui 由推送后 CI 执行（本环境记录为暂不可验证项）。
- UI 的 Figma/DOM/截图、1421/1423/Tauri 证据（适用时）：不适用（无 UI 改动）。
- 独立 reviewer 与当前 SHA 审查：review.md 登记“待独立上下文审阅”，不伪造第二审阅人。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：更新 PROGRESS.md 与 ledger；PROJECT_STATE/AI_HANDOFF 由合并期更新。
- PR、用户产品验收、发布和回滚记录：推送后由用户确认 PR；本任务不发布。
- 暂不可验证项及准确状态：浏览器 test:ui、真实 Codex/Claude 消费对拍、catalog 指针落盘 = NOT VERIFIED / 后续任务。

## 计划变更记录

- 无（首版）。

## 2026-09-26 独立复审修复计划

当前候选 `42c3f26` 的只读独立审查发现四项 P1、两项 P2；原 24 项单测没有覆盖这些输入。继续沿用本任务分支和交付包，以下每项都先补能在现有代码上失败的真实输出测试，再做最小实现、定向复验。Codex 格式以[当前官方配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)为准：`wire_api` 仅 `responses`，模型选择是根级键，provider 表须放在用户级配置中。

| 顺序 | 失败测试和行为 | 最小修复文件 | 复验 |
| --- | --- | --- | --- |
| 1 | `$(...)` 和单引号进入 Bash 环境导出时不触发命令替换；Codex 只输出 `responses` 且根级模型选择正确；不同连接 ID 不共用目标配置键 | `tests/unit/providerTargetRenderers.test.ts` → `src/features/providers/providerTargetRenderers.ts` | 定向 Node 测试、官方配置字段对照 |
| 2 | stdio schema 和 v2 union 都拒绝 `TOKEN=sk-...`、`API_KEY=plainsecret`，普通 `REGION` 保持可用 | `tests/unit/mcpConfig.test.ts` → `src/features/mcp/mcpConfig.ts` | 定向 Node 测试 |
| 3 | “阿里”和“腾讯” seed 经合并后同时存在且 ID 稳定；同 ID 的不同输入不得静默丢失 | `tests/unit/providerConfigIO.test.ts` → `src/features/providers/providerConfigIO.ts` | 定向 Node 测试 |
| 4 | `../../outside` 等 profile ID 不产生越界相对路径 | `tests/unit/modelCatalogWindow.test.ts` → `src/features/models/modelCatalogWindow.ts` | 定向 Node 测试 |
| 5 | 更新 spec/review/verification、任务账本和功能卡的准确状态；接入合并后的最新 main，解决治理视图冲突 | 本交付包、ledger/registry/生成视图 | governance/features/markdown、完整 `verify`、delivery、独立补审、精确 head Hosted CI |

所有修复保持纯逻辑层，不在本 PR 接线真实工具、执行 shell、写用户配置或提升 FEAT-032 的 PARTIAL 状态。主 checkout 的未提交 UI 文件不参与本轮修改。

## 2026-09-27 合并后独立复审修复计划

当前 PR head `39369c9` 的独立只读复审发现合法中文连接 id 在多目标渲染时被静默跳过（P1）、同名 ASCII seed 不同地址生成相同 id（P2）及功能卡任务状态滞后（P3）。先为两个行为补失败测试，再让无 ASCII 片段的 id 使用可读占位与原 id 指纹；多目标渲染只对缺少 `baseUrl` 返回空，其余异常向调用方暴露；所有 seed id 包含名称和地址指纹。功能卡同步账本状态。随后跑完整 `verify`、delivery、独立补审和精确 head Hosted 检查。
