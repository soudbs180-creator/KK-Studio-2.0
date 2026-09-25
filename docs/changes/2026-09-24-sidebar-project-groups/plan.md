# Plan：侧栏项目分组与文件夹收纳交互增强

- Task ID：TASK-UI-009
- 状态：IN PROGRESS
- 日期：2026-09-24
- Intent / Spec / ADR：`docs/changes/2026-09-24-sidebar-project-groups/{intent,spec}.md`；无 ADR（局部 UI 交互）
- Owner / branch / worktree：root / `feat/TASK-UI-009-sidebar-project-groups` / `D:/kk-studio/.worktrees/TASK-UI-009-sidebar-project-groups`
- Base / HEAD SHA 与远端目标：base = `origin/main` 76339c9；HEAD = 76339c9 + 本任务增量；PR 目标 `origin/main`
- Git dirty/index 状态、并行任务与文件归属：本 worktree 新建于 origin/main，干净；根工程 `D:/kk-studio/KK-Studio-2.0` 保持 main 干净不动；无其他任务改动同一文件。

## 开工证据

- 已读取的规则、账本、规范和实现：
  - `AGENTS.md`、`AI_RULES.md`、`docs/engineering/{SDLC,BRANCH-POLICY}.md`、`docs/governance/PROJECT_STATE.md`、`task-ledger.json`
  - `docs/DESIGN-SYSTEM.md`（1.3 语义 tokens）、`docs/UI_SPEC.md`、`docs/features/feat-015-projects.md`
  - 实现：`src/components/{Sidebar,SidebarProjectGroup,SidebarProjectEntry,SidebarDraftFolder,SidebarGroupHeading}.tsx`、`src/styles/{sidebar,workspace}.css`
  - 测试契约：`tests/browser/{sidebar,catalog-pages,frame-accuracy,interaction-state,ui-interactions}.spec.ts`
- 依赖/工具版本与安装：仓库要求 Node ≥24；系统 PATH 为 Node 22.23.2（sandbox runtime）。工程补充：便携 Node v24.21.0 置于 `D:/kk-studio/.tools/node24/`（仅本任务命令使用，不改系统）。worktree `npm ci` 后台执行中。
- 基线 lint/typecheck/相关测试：main 当前为已合入基线（76339c9 前各任务验证记录见 PROJECT_STATE）；本 worktree 首轮完整基线待 npm ci 完成后记录。
- PRE-EXISTING FAILURE 与关联任务：无已知。
- 计划中 AI 自主事项：三入口位置、默认标题/自动改名、拖拽数据格式、文件夹空提示文案、未分组区列表化渲染（保留几何）。
- 必需外部条件与已存在的用户授权：用户已授权本 UI 实现并澄清折叠语义与 Prototype 范围。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | `src/features/projects/sidebarProjectModel.ts`（新增） | 定义 `SidebarProjectItem` / `SidebarFolderItem` 类型 | 无 | typecheck |
| 2 | `src/components/SidebarProjectEntry.tsx` | 新增可选 props：`defaultTitle/autoEdit/draggable/dragId/onDragStart`；行 div 支持 HTML5 拖拽（编辑/菜单打开时不拖）；标题初值与编辑初值可注入 | 1 | typecheck + 既有行交互测试 |
| 3 | `src/components/SidebarGroupHeading.tsx` | 「创建创作页」（禁用）替换为「创建未分组项目」按钮 + `onCreateProject` prop | 2 | typecheck + 既有未分组标题测试 |
| 4 | `src/components/SidebarFolderGroup.tsx`（新增） | 文件夹行（chevron + 文件夹图标 + 标题 + aria-expanded + 拖放目标）与二级条目/空提示渲染 | 1 | typecheck |
| 5 | `src/components/Sidebar.tsx` | 项目区状态模型（ungrouped/grouped/folders）；三个创建动作；拖放移动；三级折叠（标题整组、项目条目收起全部文件夹、未分组标题）；文件夹移入「项目」区内；未分组区列表渲染；删除 `SidebarDraftFolder` 使用 | 2-4 | typecheck |
| 6 | `src/styles/sidebar.css` | 文件夹行/拖拽悬停/二级行样式，消费既有 tokens；`.project-folder-group` 区内间距 | 5 | ui:check + 浏览器 |
| 7 | `src/components/SidebarDraftFolder.tsx`（删除） | 被 SidebarFolderGroup 取代 | 5 | typecheck |
| 8 | `tests/browser/sidebar-project-groups.spec.ts`（新增） | 覆盖 AC-1…AC-6 创建/拖拽/三级折叠；既有用例不动 | 5-6 | test:ui 定向 |
| 9 | 文档同步 | verification.md、review.md、PROGRESS.md、task-ledger.json（TASK-UI-009）、feat-015 变更记录 | 8 | governance:check |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：无（本任务独占 Sidebar 相关文件）。
- 同文件写入的串行顺序：本任务为唯一写入者；根工程 main 不写入。
- 整合负责人、目标 branch/base 和同步策略：root；PR 目标 origin/main，squash 合并，合并后回读。
- 冲突后重新验证的范围：若 main 前移，merge 最新 origin/main 到任务分支后重跑受影响检查与浏览器用例。

## 风险与恢复

- 最危险的失败场景与预防：
  - 默认状态 DOM 变化破坏 frame-accuracy 几何 → 保持演示行渲染顺序与类名，改动后跑既有浏览器用例；
  - 拖拽在 Playwright 下不稳定 → 用 `locator.dragTo` + 断言状态；必要时以 DataTransfer 手工分派 dragstart/dragover/drop；
  - `ui:check` 新字面量/token 违规 → 样式只消费既有语义 tokens，文案走 JSX。
- 数据备份/原件保护/回滚或补偿：无用户数据；代码回滚 = 丢弃任务分支即可。
- 触发恢复的条件及 runbook：任一既有浏览器用例失败 → 先修实现再重跑；不改测试凑数。
- 高风险外部动作的授权、权限和费用边界：无。
- 不选择的方案及理由：不接持久化（用户确认 Prototype）；不做文件夹改名/删除/拖回/排序（范围外）；不用自定义指针拖拽实现触屏 DnD（范围外）。

## 验证和交付

- 定向回归：新增 `sidebar-project-groups.spec.ts`（AC-1…AC-6）；既有 `sidebar/catalog-pages/frame-accuracy/interaction-state/ui-interactions` 定向回归（AC-7）。
- 完整验证：`npm run typecheck`、`npm run lint`、`npm run ui:check`、`npm run format:check`、`npm test`、`npm run test:ui`；条件允许时 `npm run build` 与 `npm run verify`。
- UI 的 Figma/DOM/截图：Vite 固定端口 1421（`strictPort`）启动，Playwright 捕获创建/拖拽/折叠各态 DOM 与截图，存 `docs/changes/2026-09-24-sidebar-project-groups/evidence/`。
- 独立 reviewer 与当前 SHA 审查：按仓库单 owner 方案，本任务由 AI 按 review.md 检查表执行并如实记录边界（无第二账号审批；用户产品验收保留）。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：verification/review/PROGRESS/ledger（TASK-UI-009 → DONE，证据关联本包）；feat-015 变更记录追加。
- PR、用户产品验收、发布和回滚记录：本任务交付本地分支与证据；是否开 PR/合入 main 由用户决定（当前会话不自动 push/merge）。
- 暂不可验证项及准确状态：触屏拖拽（未实现，明确范围外）；Tauri release 打包复验（Web 源码同态为准，按既有边界说明）；真实项目持久化（FEAT-015 PARTIAL）。

## 计划变更记录

- 无。

## 第三轮修订记录（2026-09-24）

- 用户验收重定义模型：项目区第一层级=项目文件夹（图标文件夹行可收展，右侧两按钮除外），文件夹内第二层级=画布/对话项目；未分组=未放入文件夹的项目（第一层级）；未分组可拖入文件夹、拖到项目区空白自动按项目名建文件夹；三点菜单设置含改名/移动到项目组/删除。
- 对应实施变更：重写 SidebarProjectGroups/SidebarProjectSections/SidebarFolderGroup/SidebarProjectEntry（新增 SidebarProjectHeader），删除 SidebarProjectGroup 与「创建分组项目」；useDismissible pointerdown 不再抢焦点；CSS 修文件夹行定位（263px）与子项目行层级缩进（231px，右缘对齐，文件夹比项目长）/右侧图标列位三行统一/子面板向左防溢出；重写 sidebar-project-groups.spec.ts 为 9 条新模型用例并适配受影响既有用例。
- 门禁全绿 + 全量浏览器 309/309；证据截图按新模型重截（01–09）。
- 旧计划第 2（创建分组项目）、第 5（Sidebar.tsx 持有状态）等条目被上述变更取代；状态容器收敛在 SidebarProjectGroups（≤300 行）。

## 第四轮修订记录（2026-09-24）

- 用户追加需求：项目行左侧缩略图按内容类型区分——有生成图片的项目显示内容图片；纯文案项目显示纯色块 + 聊天图标；创建未生成项目显示随机纯色块（无图标）。
- 对应实施变更：`sidebarProjectModel.ts` 加 `SidebarProjectVisual`（image/chat/color）+ `PROJECT_THUMB_COLORS`（8 色）+ `randomProjectColor()`；`SidebarProjectEntry` 加 `visual` 渲染分支（`.project-thumb` 系列，img 类 `.project-thumb-image-src` 避免与模板类冲突）；`SidebarProjectGroups` 演示数据带 visual、新建项随机色、`findProjectVisual` 使移动/拖拽携带缩略图；`SidebarFolderGroup`/`SidebarProjectSections` 透传 visual；`workspace.css`/`sidebar.css` 增 `.project-thumb` 基类与子类（25×25 圆角 8，几何不变）；spec 新增第 10 条用例；capture.mjs 新增 4 条断言（33/33）+ zoom-07/08 截图。
- 门禁全绿 + 全量浏览器 310/310；行几何（rows/folders/图标列位）无回归。
- 无。
## 第五轮（2026-09-24 下午）：生成对话框诊断与修复
- 修复项目行导航 bug：openProject(id) 曾把项目 id 当 App view 传入，导致点击文件夹内二级项目行弹出「使用说明」对话框且不导航；现固定 onNavigate("workspace")。
- 首页生成输入区单排：批量/数据 select 并入功能键同一行（桌面 1920 实测单行 y≈477），响应式 768–1200 flex-wrap 自然折行。
- 画布生成对话框：creation-controls 已单排（模型/自适应尺寸/语音/×8/生成 568×35）。
- 全量 310/310 + 门禁全绿，详见 verification.md 第五轮。
