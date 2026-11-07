# Figma-first 同步治理与 03 页视觉审计 Implementation Plan

> 2026-10-28最新覆盖：用户授权修改Figma，本地产品代码不动；手机无画布、聊天生成；小屏单排与最小尺寸改为明确用途变体。已完成的手机专项及后续本地映射边界见[mobile-chat-layout](mobile-chat-layout.md)。本文原只读计划与旧自动换行候选按历史时点保留。

> **最新校正（2026-10-28）**：用户已允许修改Figma、本地代码不动，随后指出一排被改成两排及其他回归。当前停止继续Figma写入，只读整理差异；尚未回滚或验收。以[校正清单](correction-review.md)为本轮最新状态，下文只读阶段结论保留历史时点，不是当前写入事实。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可重复的 Figma→本地同步契约，并在不写入代码或 Figma 的前提下完成 03 页的视觉审计与问题清单。

**Architecture:** Figma 作为视觉真值，本地文档和 token/组件映射作为派生契约，代码只在来源达到 `FIGMA_READY` 后同步。当前阶段只读 Figma 结构、截图、变量和本地候选映射，审计证据写入 `output/`，不修改产品源码或设计文件。

**Tech Stack:** Figma MCP 只读工具、Figma Plugin API 只读脚本（如需结构补充）、PowerShell/rg、Markdown/JSON；不新增依赖。

**Spec:** `docs/changes/2026-10-28-figma-sync-governance/spec.md`

**Task / branch / HEAD:** 续作 `TASK-FIGMA-PAGES-20261025`；`fix/TASK-FIGMA-PAGES-20261025-selection`；`c2a0228a57be66b982d889c6710faa32cde49b7c`。不新建重复任务或分支。用户最新要求已纳入spec：01全部规则、02图标、03图标按钮/组件/组合/交互、04/05页面展示；共用母件、变体集中、逐层组合、清晰命名/查找、UI与本地规范100%覆盖。

## Global Constraints

- 本轮不得修改产品源码、`src/styles/tokens.css`、测试、版本、用户数据或 Figma。
- 保留现有 dirty worktree 的所有内容，不 reset、clean、覆盖、移动或混合提交。
- 当前 Figma 文件为 `ZiadpErDoFweCjG3uHjkM3`；03 页为 `91:3`。
- 历史截图和旧 Figma 文件不能替代当前实时读取；无法读取时必须标为 UNKNOWN/BLOCKED。
- 设计问题先记录，不在代码或 Figma 中自行定稿。

## Review Focus

- 组件定义数量与展示/实例数量混淆：清单必须分开记录并给出节点证据。
- 变体属性或公开属性只按名称推断：必须读取实际属性和主组件关系。
- 空 fills、外层命中区或历史说明被当成可见视觉：必须检查实际可见子树和几何。
- Dark/Light、状态和响应式覆盖不完整：缺少来源时保持 UNKNOWN，不补猜测。
- 本地映射被误报成运行一致：`SYNCED` 只有源码同步后才允许，`RUNTIME_VERIFIED` 需要同状态运行证据。

## Files and Evidence

- Create: `docs/changes/2026-10-28-figma-sync-governance/intent.md` — 用户意图和授权边界。
- Create: `docs/changes/2026-10-28-figma-sync-governance/spec.md` — 同步契约、审计维度和验收。
- Create: `docs/changes/2026-10-28-figma-sync-governance/plan.md` — 本执行计划。
- Create: `docs/changes/2026-10-28-figma-sync-governance/verification.md` — 本轮只读审计收据，逐步追加真实结果。
- Create: `docs/changes/2026-10-28-figma-sync-governance/audit-03.md`、`review.md` — 首轮发现/覆盖边界与独立上下文复核。
- Modify documentation only: `docs/UI_INDEX.md`、`docs/PROGRESS.md`、`docs/governance/PROJECT_STATE.md`、`AI_HANDOFF.md` — 当前入口与只读限制；原历史内容保留。
- Update existing task record: `docs/governance/task-ledger.json` 的TASK-FIGMA-PAGES-20261025；用现有renderLedger刷新 `TASK_LEDGER.md`，不改其他164条任务。
- Create outside Git: `D:/kk-studio/output/figma-sync-20261028-03-audit/` — Figma 结构、截图、变量和机器可读清单；不把生成证据平铺在 `output/` 根目录。
- Read only: `docs/UI_INDEX.md`, `docs/UI_RULES.md`, `docs/DESIGN_TOKENS.md`, `docs/DESIGN-SYSTEM.md`, `docs/UI_SPEC.md`, `src/styles/tokens.css`, `src/components/`, `src/features/`。

## Execution Tasks

### Task 1: Freeze source and capture audit baseline

**Files:**

- Modify: `docs/changes/2026-10-28-figma-sync-governance/verification.md`
- Create outside Git: `D:/kk-studio/output/figma-sync-20261028-03-audit/baseline.json`

- [x] Record branch, worktree, HEAD and dirty status without altering existing files. 首次持久化在创建本包文档后，见baseline.phase；不是事前全工作区内容快照。
- [x] Record Figma file key, page node `91:3`, read timestamp and tool/session identity when available. session为 `9d875dc6-2433-4239-a997-fa7ee51915f3`。
- [x] Record any OAuth or Figma read blocker as a factual boundary. 当前Figma读取可用；page级变量工具提示未选择图层，已改用只读变量API，不要求用户重做OAuth。

### Task 2: Read the 03 page structure and visual snapshots

**Files:**

- Create outside Git: `page-structure.json`, `page-91-3.png`、A/B/C分区截图及7张细节截图
- Modify: `verification.md`

- [x] Read page metadata and visible top-level sections/components using Figma read-only tools.
- [x] Capture a current screenshot for the page or the smallest useful page frames; record node IDs and max dimension.
- [x] Split large property reads into0–16、16–64、64–128、128–192四包；不把48KB超限失败当读取完成。
- [x] Preserve limitations: 主容器17984×58610.875总览只适合导航；B组合分区缩图不能充当逐族视觉验收。

### Task 3: Inventory component definitions, variants, properties and references

**Files:**

- Create outside Git: `component-inventory.json`, `reference-inventory.json`
- Modify: `verification.md`

- [x] Enumerate all component sets and standalone components reachable from `91:3`：207个定义，当前192、归档15；当前含2个演示。
- [x] Record all192 current definitions' source nodes, public-property schemas and1253 variants' axes/bounds；实际属性接线仍待审。
- [x] Aggregate10839 current-root instances to247 source owners；未找到母件数0，但不等于外观继承无覆盖。
- [x] Separate definitions, presentation samples and actual page instances；15个归档不计新映射，当前引用归档的2处继续追踪。

### Task 4: Audit visual rules and state coverage

**Files:**

- Create outside Git: `visual-findings.json`, `state-coverage.json`
- Modify: `verification.md`

- [ ] Check fills/strokes, text styles, font/size/weight, radius, spacing, icon geometry, layer depth and visible bounds.
- [ ] Check applicable default/hover/pressed/selected/focus/disabled/loading/success/error states and theme/viewport coverage.
- [x] First pass:214图标槽尺寸、58标题页签游标、工具栏角色/辅助箭头、搜索/任务面板代表截图；结论见audit-03.md。
- [x] Mark each finding as FACT, INFERENCE, UNKNOWN or CONFLICT and attach node IDs/evidence.
- [x] Classify each issue as design source issue, local mapping pending, runtime verification pending or out of scope.
- [ ] Audit all families' naming,母件/变体集中程度和四条查找路径；不能以现有A/B/C分区代替逐族验收。

### Task 5: Build local mapping candidates without changing implementation

**Files:**

- Create outside Git: `local-candidate-map.json`
- Modify: `verification.md`

- [x] Read existing token/component names and locate candidate files with `rg`.
- [x] Record15 family-level candidate maps；未核定props或全量覆盖，不冒称已绑定。
- [x] Do not edit product source, CSS, tests, product generated files, or Figma；外部只读审计脚本作为证据保存。
- [x] Keep `FIGMA_READY`, `LOCAL_PENDING`, `SYNCED`, and `RUNTIME_VERIFIED` distinct.
- [ ] Extend candidates to every applicable01规则、02图标、03母件/变体与04/05页面；当前03缺陷未关闭。

### Task 6: Close the audit with a prioritized issue list

**Files:**

- Modify: `verification.md`
- Create outside Git: `audit-summary.json`

- [x] Produce first-pass findings with source node, impact, evidence, owner boundary and next action；5项，包含用户辅助箭头要求。
- [x] State what is complete, partial, blocked and not verified；本轮03全量审计仍PARTIAL。
- [x] Record the next read-only slice；共享组件实现仍受本轮写入限制。

## Future Sync Phases (not executed in this run)

### Task 7: Close03 source and organisation review

- Files: 本包audit-03.md/verification.md、外部state-coverage.json；后续允许写入时才修改Figma。
- [ ] 按A基础控件→B的启动/侧栏/会话/画布/设置/其他→C明暗交互，逐族截图、实际属性和上下游核对。
- [ ] 全部母件/变体同族、名称职责清楚、索引与四条查找路径完成；归档/演示与当前取源区分。
- [ ] 关闭03-AUDIT-001/002/003，裁决004，核验005；用户的窄辅助箭头只在该用途实现。
- [ ] 形成逐族FIGMA_READY清单；任何缺陷/UNKNOWN保留，不把214槽位通过扩展成全族通过。

### Task 8: Build complete source-to-local maps and rule coverage

- Files: 扩充既有 `docs/changes/2026-10-23-figma-04-mapping/mapping.json` 或在新包记录替代关系；`docs/UI_INDEX.md`、`DESIGN_TOKENS.md`、`UI_RULES.md`、`DESIGN-SYSTEM.md`、`UI_SPEC.md`。不新建第二个现行映射权威。
- [ ] 读取01全条款、02图标、已确认03依赖和04/05页面实例；稳定键沿用现有身份。
- [ ] 每项绑定规则/token/icon/母件、实际变体、props/class/token、平台/状态和本地消费者；NO_LOCAL_MATCH进入待实施清单。
- [ ] 生成独立规则/组件/变体/页面分母，N/A写依据；规则清单不得以“仅当前已实现”缩小。
- [ ] 每次来源变化，保存快照/指纹/变更清单，沿依赖闭包退回受影响旧验收；离线/权限不足不猜测。

### Task 9: Apply foundations and shared components after write restrictions are lifted

- Files: `src/styles/tokens.css`、既有主题/动效CSS、实际共享组件调用方；派生文档；受影响测试。此时再基于最终映射确定最小精确文件列表，不预填臆造API。
- [ ] 先同步01语义tokens/字体/层级和02资源，再03基础控件、组合本体和适用变体；无页面私有色板。
- [ ] 同步本地设计规范及数值映射；运行 `npm run design:sync` 只更新CSS→DESIGN.md投影。
- [ ] 按调用方补真实行为回归；不为纯文案写复述测试，不丢焦点/IME/草稿/连接ID/数据恢复。
- [ ] 每次代码改动执行 `npm run typecheck`、`npm run lint`、`npm test`；保留基线失败。

### Task 10: Apply page compositions and same-state acceptance

- Files: Task8确定的页面/import链、现有浏览器/原生测试、证据清单与当前任务文档。
- [ ] 04/05用03组件组合；共享尺寸/颜色/层级不可在页面重画，响应式采用01已定义规则。
- [ ] 390/1099/1920、767/768、1199/1200/1201边界、矮屏、深浅主题、长文/滚动/键盘/触控及全部适用状态逐项验收。
- [ ] Web development1421、production preview1423、当前源码构建的Desktop分别记录入口/route/import、bundle/EXE身份与证据。原生Mobile需要自身证据，不用窄屏Web替代。
- [ ] 当前Figma参考齐全后，才启用现有或成熟工具的几何/像素比较；固定字体、内容、加载态和动效，差异阈值按渲染类型登记；不能用自动截图更新掩盖回归。
- [ ] 所有适用规则/组件/变体/页面/平台分母达到100%，文档与UI均一致，完整 `npm run verify`、独立review和用户视觉验收后按项目流程合流；生产发布另行授权。

## Verification and Delivery

- Current run is read-only Figma audit plus documentation; product tests and build are not required unless a file is accidentally modified, in which case stop and report.
- Verify新文档的限定Prettier、Markdown链接、必需证据存在/JSON可解析、图像完整性和引用路径；`git diff --check`仅覆盖tracked改动，不能单独证明untracked新文件合格。
- Keep the audit evidence outside Git under `D:/kk-studio/output/figma-sync-20261028-03-audit/`.
- Do not merge or clean the existing dirty worktree in this phase.

## Plan Change Log

- 2026-10-28: Initial plan created from the user-approved Figma-first approach; scope explicitly limited to documentation and read-only 03 audit.
