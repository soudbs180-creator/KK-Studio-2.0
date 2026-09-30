# Verification：侧栏项目分组与文件夹收纳交互增强

- Task ID：TASK-UI-009
- 日期：2026-09-24
- 分支/工作树：`feat/TASK-UI-009-sidebar-project-groups` @ `D:/kk-studio/.worktrees/TASK-UI-009-sidebar-project-groups`
- 基线：`origin/main` 76339c9；运行时 Node v24.21.0（便携，仓库要求 Node ≥24；系统 PATH 为 v22，本任务全部命令使用便携 Node 24，未改动系统）
- 验证人/方式：AI 执行（仓库单 owner 方案）；用户产品验收保留。

## 实现清单（与 plan 步骤对应）

| 步骤 | 文件 | 结果 |
| --- | --- | --- |
| 1 | `src/features/projects/sidebarProjectModel.ts`（新增） | 类型 + 拖拽 MIME + id 生成器 |
| 2 | `src/components/SidebarProjectEntry.tsx` | 新增 defaultTitle/autoEdit/draggable/dragId/onDragStart，行支持拖拽 |
| 3 | `src/components/SidebarGroupHeading.tsx` | 「创建创作页」（禁用）→「创建未分组项目」（启用）+ onCreateProject |
| 4 | `src/components/SidebarFolderGroup.tsx`（新增） | 文件夹行 + 二级条目 + 拖放目标 |
| 5 | `src/components/Sidebar.tsx` | 拆分：项目区迁入 `SidebarProjectGroups.tsx` + `SidebarProjectSections.tsx`；Sidebar 保留账户菜单/导航/焦点逻辑（421 行 → <300 行门禁通过） |
| 6 | `src/styles/sidebar.css` | 文件夹行/拖拽悬停/二级行样式（既有语义 tokens） |
| 7 | `src/components/SidebarDraftFolder.tsx`（删除） | 由 SidebarFolderGroup 取代 |
| 8 | `tests/browser/sidebar-project-groups.spec.ts`（新增） | 7 条用例覆盖 AC-1…AC-6 |
| 9 | 文档同步 | 本包 + PROGRESS + ledger + feat-015 |

## 门禁结果（worktree，Node 24.21.0）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck` | PASS（tsc --noEmit） |
| Lint + 治理/特性/Markdown | `npm run lint` | PASS（eslint --max-warnings 0；Governance 62 tasks 0 violations；Features 29 0；Markdown 81 0） |
| UI 标准 | `npm run ui:check` | PASS（161 文件 0 违规；组件 ≤300 行） |
| 格式 | `npm run format:check` | PASS（prettier --check） |
| 单元测试 | `npm test` | PASS（370/370） |
| 构建 | `npm run build` | PASS（tsc -b && vite build；chunk 体积警告为既有基线提示，非本次引入） |
| 浏览器套件（全量） | `npx playwright test` | PASS（307/307，1.6m，port 1423 preview） |
| 治理视图 | `npm run governance:write` 后 `npm run lint` | PASS（账本视图与 check 一致） |

## 浏览器定向回归（新 + 受影响既有用例）

- 新增 `sidebar-project-groups.spec.ts`：7 条全过（创建未分组/分组/文件夹、拖拽收纳、文件夹折叠、项目条目收起文件夹、项目标题整组折叠、未分组标题折叠全部）。
- 既有受影响用例：`sidebar.spec.ts`、`catalog-pages.spec.ts`、`interaction-state.spec.ts`、`ui-interactions.spec.ts` 全部通过（含「创建项目文件夹→新建文件夹 按钮 aria-expanded 切换与空提示可见性」「折叠分组保留改名状态」「未分组改名/删除/恢复」「显示与排序菜单」「断点收起恢复焦点」等契约）。
- 全量 307 通过（含 frame-accuracy 几何、design-system-pages、accessibility 等）。

## 用户反馈修复（2026-09-24 第二轮）

用户对着证据截图 `07-group-title-collapsed.png` 反馈两点：① 折叠态箭头「歪掉」（期望展开朝下、收起朝右）；②「项目收起来错误」（折叠后新建分组项目行仍可见）。

定位与处置：

1. **箭头歪掉**：`[aria-expanded="false"] > .sidebar-heading-chevron` 的 `rotate(-90deg)` 本身正确（折叠态静止计算样式 `matrix(0,-1,1,0,0,0)`），但 `.sidebar-heading-chevron` 原有 `transition: transform 0.14s` 使折叠后箭头处于旋转中间态（斜向），截图为瞬时捕获即呈现「歪」。修复：移除该过渡动画，折叠/展开瞬时翻转，任何时刻只呈现「朝下（展开）/ 朝右（收起）」两种干净状态（`src/styles/sidebar.css`）。
2. **项目收起不彻底**：新建分组项目行（如「协同设计」）通过 `SidebarProjectEntry visible={groupedVisible}` 传入可见性，但组件行 div 此前未按 `visible` 渲染 `hidden`，演示行与文件夹行有容器隐藏而新建行没有。修复：`SidebarProjectEntry` 行 div 与「恢复未分组项目」按钮均加 `hidden={!visible}`，任何折叠场景下行随组隐藏。
3. 配套：`capture.mjs` 截图前等待 250ms 状态稳定、新增断言「折叠后新建分组项目行隐藏」（证据 22/22）；`sidebar-project-groups.spec.ts` AC-4 用例补「协同设计」折叠后 `toBeHidden` 断言；证据端口由 1421 改为 1424（1421 已被沙箱运行时主检出 vite 占用，未动该进程）。

修复后重跑：门禁全绿（typecheck/ui:check 161 文件 0 违规/lint 0/format/build）；`sidebar-project-groups.spec.ts` 7 条全过；受影响回归（sidebar/catalog-pages/frame-accuracy/interaction-state/ui-interactions）38 条全过；浏览器全量 **307/307**；证据截图 `07` 复查：`项目 >` 折叠态箭头朝右、「协同设计」已隐藏、未分组箭头朝下。

## 浏览器同态证据（port 1424 vite preview，Playwright 截图 + 断言，第三轮新模型）

脚本：`docs/changes/2026-09-24-sidebar-project-groups/evidence/capture.mjs`（端口可用 `EVIDENCE_BASE` 覆盖）；截图见同目录 `01-…09-*.png` 与 `zoom-03/04-sidebar.png`。

断言 29/29 通过（第三轮收敛模型）：

- 默认状态：项目区第一层只有 1 个文件夹行（KK项目，aria-expanded=true，二级 KK工作流 可见）；未分组 KK工作流 可见（两组各一，section 限定）。
- 创建未分组项目「需求笔记」：输入框自动聚焦、改名成功；三点菜单「移动到项目组」子面板列出已有文件夹 KK项目 并提供「新建项目文件夹」。
- 创建项目文件夹：初始展开、显示 Prototype 空提示。
- 未分组「需求笔记」拖入文件夹：文件夹展开、二级显示该行（改名标题保留）、未分组区移除。
- 点击文件夹收起二级（箭头朝右）再点展开；点击项目条目后全部文件夹收起、二级隐藏。
- 点击「项目」标题整组折叠（文件夹行隐藏）、再点恢复；点击「未分组」标题折叠/恢复全部条目。
- 拖未分组项目到「项目」区空白：自动创建以项目命名的文件夹并收纳（协同设计 → 新文件夹「协同设计」）。

截图抽查：`01-default-sidebar.png` 默认态文件夹 KK项目（展开）二级 KK工作流 + 未分组 KK工作流；`04-dragged-into-folder.png` 拖入后「新建文件夹」展开含「需求笔记」、未分组仅剩 KK工作流；`07-group-title-collapsed.png`「项目」标题收起（箭头朝右）组内文件夹行全隐藏、未分组独立保留；`zoom-04-sidebar.png` 文件夹行右侧打开/设置图标列位与子项目 231px 层级缩进特写；`zoom-05-many-expanded.png`/`zoom-06-many-collapsed.png` 多项目演示：12 个子项目拖入「新建文件夹」全部展开可见，点击文件夹行一键收起后 12 行全部隐藏、仅剩文件夹行（1920×1080 深色主题）。

## 验收条件映射

| AC | 结果 | 证据 |
| --- | --- | --- |
| AC-1 | 通过 | 浏览器用例 1-3 + 证据断言 2-7 |
| AC-2 | 通过 | 浏览器用例 4 + 证据断言 8-10 |
| AC-3 | 通过 | 浏览器用例 3、4 及证据断言 11-12 |
| AC-4 | 通过 | 浏览器用例 6 + 证据断言 15-18 |
| AC-5 | 通过 | 浏览器用例 5 + 证据断言 13-14 |
| AC-6 | 通过 | 浏览器用例 7 + 证据断言 19-21 |
| AC-7 | 通过 | 定向回归 + 全量 307 + 门禁全绿 |

## 第三轮收敛模型验证（2026-09-24，全量重跑）

### 实现清单（本轮变更）

| 文件 | 变更 |
| --- | --- |
| `src/components/SidebarProjectGroups.tsx` | 状态容器重写：删 `groupedProjects`/「创建分组项目」，`folders` 含演示 KK项目 文件夹；新增 `openFolder`（导航 workspace）/`toggleFolder`/`renameFolder`/`renameProject`（改名同步父层）/`dropToSection`（拖空白按项目名建文件夹）/`dropProject`/`moveProjectToFolder`/`createFolderForProject` |
| `src/components/SidebarProjectHeader.tsx`（新增） | 项目标题行 + 显示/排序菜单，使状态容器 ≤300 行 |
| `src/components/SidebarProjectSections.tsx` | 「项目」区只渲染文件夹；section 空白为拖放目标（自动建以项目命名的文件夹）；移除 active/selected 残留 |
| `src/components/SidebarFolderGroup.tsx` | 文件夹行（`.folder-heading-row` + `.folder-heading-toggle`，aria-expanded）+ 右侧 打开/设置 两按钮（静态布局对齐项目行图标列）+ 「项目组设置」菜单（置顶/改名字/删除项目组 + 恢复）+ 二级 SidebarProjectEntry；拖放悬停/投放 |
| `src/components/SidebarProjectEntry.tsx` | 删 grouped 分支；新增「移动到项目组」子面板（列已有文件夹 + 新建项目文件夹）+ `onRename` 上行回调 |
| `src/components/Sidebar.tsx` | 移除对 SidebarProjectGroups 的 `active` 传参 |
| `src/components/SidebarProjectGroup.tsx` | 删除（新模型无引用） |
| `src/components/useDismissible.ts` | pointerdown 关闭菜单不再抢焦点（Escape 仍回焦触发器），修复「菜单开着时点击文件夹行无法收起」 |
| `src/styles/sidebar.css` | `.folder-heading-row`（position:relative、flex、263px 固定宽）+ `.folder-heading-toggle`（flex:1 铺满整行，点击任意处收展）；行内两按钮与项目行同规则绝对定位（right:27/right:5，实测列位 x=230/252，三行一致）；`is-drag-target` 行/区样式；`.project-nested-entry` 231px 左缩进右对齐（文件夹 263 > 子项目 231，层级缩进，右缘对齐）；`.project-menu-sub` 向左展开防溢出 |
| `tests/browser/sidebar-project-groups.spec.ts` | 重写为 9 条新模型用例 |
| `tests/browser/{frame-accuracy,menu-boundaries,catalog-pages,ui-interactions}.spec.ts` | 按新交互语义适配（文件夹行几何 [14,409,219,29]/pin [235,413,20,21]/more [257,413,20,21]；右键菜单点击行收起关闭；文件夹置顶/改名菜单；折叠保留文件夹名） |

### 门禁结果（worktree，Node 24.21.0）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck` | PASS（tsc --noEmit） |
| Lint + 治理/特性/Markdown | `npm run lint` | PASS（Governance 62 tasks 0 violations；Features 29 0；Markdown 81 0） |
| UI 标准 | `npm run ui:check` | PASS（161 文件 0 违规；组件 ≤300 行） |
| 格式 | `npm run format:check` | PASS（prettier --check） |
| 单元测试 | `npm test` | PASS（370/370） |
| 构建 | `npm run build` | PASS（chunk 体积警告为既有基线提示） |
| 浏览器套件（全量） | `npx playwright test` | PASS（309/309，1.4m，port 1423 preview） |

### 浏览器定向验证（新模型 9 条 + 受影响回归）

- `sidebar-project-groups.spec.ts` 9 条全过：创建未分组项目并改名；项目区第一层只有文件夹且行点击收展（右侧两按钮除外）；创建文件夹空提示与收展；未分组拖入文件夹收纳（保留改名标题）；拖到项目区空白自动建以项目命名的文件夹并收纳；点击项目条目收起所有文件夹；「项目」标题整组折叠/恢复；「未分组」标题折叠/恢复；三点菜单移动到项目组（移入已有文件夹 + 新建以项目命名的文件夹）。
- 受影响既有用例适配后全过：frame-accuracy（文件夹行几何 [14,409,263,29]/pin [230,413,20,21]/more [252,413,20,21]/子项目行 [46,443,231,29]——文件夹 263 比子项目 231 长、图标列位三行一致 + 打开/设置/键盘菜单管理 + 侧栏动画 rows=[[231,29],[263,29]]、folders=[[263,29]]）、menu-boundaries（右键菜单点击行收起关闭）、catalog-pages（文件夹置顶/改名字）、ui-interactions（折叠保留文件夹名）、interaction-state（未分组置顶/更多设置/改名/删除恢复）、frontend/sidebar 等。
- 修复验证：菜单开着点击文件夹行可收起（`useDismissible` 不再吞点击）；设置菜单锚定行右下；子面板向左展开不进入工作台区域；文件夹行（263px）比子项目行（231px）长、子项目右缘对齐文件夹行右缘、右侧图标列位三行一致。

### 验收条件映射（第三轮收敛模型）

| AC | 结果 | 证据 |
| --- | --- | --- |
| 文件夹容器模型（第一层文件夹/第二层项目） | 通过 | 浏览器用例 2、3 + frame-accuracy 几何 |
| 拖入文件夹收纳 / 拖空白自动建文件夹 | 通过 | 浏览器用例 4、5 |
| 三点菜单移动到项目组（已有/新建） | 通过 | 浏览器用例 9 |
| 文件夹收展（行点击，两按钮除外） | 通过 | 浏览器用例 2、3 + menu-boundaries |
| 项目条目收起全部文件夹 / 标题折叠语义 | 通过 | 浏览器用例 6、7、8 |
| 右侧图标列位一致 / 文件夹行比子项目行长（263>231 层级缩进） | 通过 | frame-accuracy 几何 + 证据截图 |
| 默认状态无回归 | 通过 | 全量 309/309 + 门禁全绿 |

## 第四轮验证：项目行缩略图按内容类型区分（2026-09-24）

### 需求口径（用户原话）

> 项目橙色的需要修改一下：这个是主要生成的内容图片（颜色）；如果项目是纯文案那么就（用）颜色然后增加一个聊天图标；如果创建没生成那么就纯色，这个颜色随机的。

收敛为三条规则：

| 项目内容类型 | 行左侧缩略图 | 演示数据 |
| --- | --- | --- |
| 有生成图片 | 内容图片缩略图（`img` 铺满圆角色块） | 文件夹二级「KK工作流」→ `/fixtures/demo/blue-hour.png` |
| 纯文案（对话） | 纯色块 + 白色聊天气泡图标 | 未分组「KK工作流」→ 蓝 `PROJECT_THUMB_COLORS[0]` + `project-chat-glyph.svg` |
| 创建未生成 | 纯色块（颜色随机，无图标） | 新建未分组项目 → `randomProjectColor()` 8 色板 |

### 实现清单（本轮变更）

| 文件 | 变更 |
| --- | --- |
| `src/features/projects/sidebarProjectModel.ts` | 新增 `SidebarProjectVisual` 判别联合（image/chat/color）、`PROJECT_THUMB_COLORS`（8 中深色）、`randomProjectColor()`；`SidebarProjectItem` 增 `visual?` |
| `src/components/SidebarProjectEntry.tsx` | 增 `visual?` prop；`.project-link` 首子元素按类型渲染 `.project-thumb`（image→`img.project-thumb-image-src` 铺满；chat→纯色块+聊天气泡 `project-chat-glyph.svg`；color→纯色块；无 visual 回退 `.project-yellow`） |
| `src/components/SidebarProjectGroups.tsx` | 初始演示数据带 visual（chat/image）；`createUngroupedProject` 新建项 `{kind:"color",color:randomProjectColor()}`；新增 `findProjectVisual`，拖入文件夹/移入文件夹/新建项目文件夹均携带 visual（项目移动不丢缩略图） |
| `src/components/SidebarFolderGroup.tsx` / `SidebarProjectSections.tsx` | 二级/未分组行透传 `visual` |
| `src/styles/workspace.css` | `.project-thumb` 基类（25×25、圆角 8、grid 居中、flex-shrink:0、overflow:hidden 防图溢出）；`.project-thumb-image-src`（100% 铺满、object-fit:cover）；`.project-thumb-chat-icon`（12×12 白气泡） |
| `src/styles/sidebar.css` | `.project-thumb` 并入 flex-shrink:0 规则 |
| `tests/browser/sidebar-project-groups.spec.ts` | 新增第 10 条用例「项目行缩略图按内容类型区分」：图片 src、聊天图标 src、新建行 `.project-thumb-color` 计数 1 且无 `.project-thumb-chat`、拖入文件夹后仍为纯色块 |
| `evidence/capture.mjs` | 第四轮 4 条断言（33/33）+ `zoom-07-thumbnails.png`/`zoom-08-random-colors.png` |

### 实现中的两个坑（已修）

1. **类名冲突导致行宽错乱**：模板类 `project-thumb-${kind}` 生成 `project-thumb-image` 与内层 `img` 类同名，CSS `.project-thumb-image{width:100%}` 同时作用于 span → 缩略图撑满整行、标题被挤成 0 宽（Playwright 判定 hidden）。修复：img 类改名 `.project-thumb-image-src`。
2. **ui:check 颜色字面量/行数**：组件内演示色 `#3D6FE0` 改用 `PROJECT_THUMB_COLORS[0]` 引用（避免组件内十六进制字面量）；组件头注释压缩后 `SidebarProjectGroups.tsx` 295 行（≤300 门禁）。

### 门禁结果（worktree，Node 24.21.0）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck` | PASS |
| Lint + 治理/特性/Markdown | `npm run lint` | PASS（62/29/81 全 0） |
| UI 标准 | `npm run ui:check` | PASS（161 文件 0 违规） |
| 格式 | `npm run format:check` | PASS |
| 单元测试 | `npm test` | PASS（370/370） |
| 构建 | `npm run build` | PASS |
| 浏览器套件（全量） | `npx playwright test` | PASS（**310/310**，1.3m，port 1423 preview） |

### 浏览器证据（port 1424，断言 33/33）

- 第四轮新增断言：有生成图片的项目行显示内容图片缩略图（blue-hour.png）；纯文案项目行显示纯色块+聊天图标（logo-message.svg）；新建未生成项目行显示随机纯色块且不带聊天图标。
- 截图：`zoom-07-thumbnails.png`（默认态三类型并排）、`zoom-08-random-colors.png`（连续新建 项目A/B 随机色）、`zoom-09-thumbs-detail.png`（3× 高倍率：文件夹图标行/二级城市夜景图/未分组聊天气泡）、`zoom-10-random-colors-detail.png`（3×：蓝色 KK工作流 白气泡 + 绿色 项目C 随机色块）、`zoom-11-chat-icon-detail.png`（4× 聊天气泡图标特写：白色气泡 + 三点）。
- 用户反馈迭代（聊天气泡图标）：首版复用品牌 `logo-message.svg`（双翼造型，视觉像兔子，用户反馈不够形象）。新增标准聊天气泡图标 `public/design/figma/project-chat-glyph.svg`（圆角气泡 + 左下尾巴 + 三个对话点，白色填充、点按 evenodd 挖空显示底色），组件/测试/证据脚本同步换引用，全量 310 复跑通过。
- 行几何无回归：缩略图 25×25 与旧 `.project-yellow` 同尺寸，frame-accuracy rows=[[231,29],[263,29]]、folders=[[263,29]]、图标列位断言仍全绿（310 全量含 frame-accuracy）。

### 验收条件映射（第四轮）

| AC | 结果 | 证据 |
| --- | --- | --- |
| 有生成图片项目 → 内容图片缩略图 | 通过 | 浏览器用例 10 + 证据断言 30 + zoom-09 |
| 纯文案项目 → 纯色块 + 聊天图标 | 通过 | 浏览器用例 10 + 证据断言 31 + zoom-09/10 |
| 创建未生成项目 → 随机纯色块（无图标） | 通过 | 浏览器用例 10 + 证据断言 32-33 + zoom-08/10 |
| 移动/拖拽后缩略图随项目保留 | 通过 | 浏览器用例 10（拖入文件夹仍 `.project-thumb-color`） |
| 行几何与既有交互无回归 | 通过 | 全量 310/310 + 门禁全绿 |

### 第五轮（2026-09-24 下午）：生成对话框诊断与修复
**1. 项目行导航 bug（已修）**
- 现象：点击侧栏文件夹内二级项目行（「KK工作流」）不进入工作台，反而弹出标题为「使用说明」的对话框，页面停留在首页。
- 根因：SidebarProjectGroups.openProject(id) 把**项目 id** 当作 App view 传入 onNavigate(id)；App.open() 的合法 view 白名单不包含项目 id → 走 else 分支 setModal(id)，Modal 标题 fallback 为「使用说明」且不切换视图。未分组行因传入字面量 "workspace" 而正常，掩盖了问题。
- 修复：openProject 收起全部文件夹后固定 onNavigate("workspace")（id 仅标识被点项目，Prototype 不做持久选中）。
- 验证：点击文件夹二级「KK工作流」→ landing 卸载、画布 3 节点可见、无弹窗。
**2. 首页生成输入区单排（用户诉求「数字选择这么长一条…不能分成两层…一排百分百能排得下」）**
- 改造：GenerationOptions（批量/数据 select）从 footer 外的第二排 grid（216px×2）并入 footer 同一 flex 行（.start-composer-options order 5），select 压缩至 89/132px。
- 桌面 1920 实测全部单行 y≈477：添加 32 + 模型 260 + Skill 59 + 插件 60 + 批量 89 + 数据 132 + mic 32 + 自动 54 + 发送 32（footer 1026×34）。
- 响应式：≤1200 grid 三行（options 独立行）；768–1200 flex-wrap（834 起单行；768 物理宽度不足时 submit 自然折行，仍在视口内）。
**3. 画布生成对话框**
- 选中卡片后 creation-controls 已单排（模型 129 + 自适应尺寸 89 + 语音 32 + ×8 34 + 生成 82 = 568×35）；参考槽（主体/风格/材质/构图/Mask）与 textarea 独立成行属既有设计，待用户确认是否进一步调整。
**门禁结果（worktree，Node 24.21.0，本分支未 commit）**：typecheck / lint / ui:check 161 / format:check / unit 370 / build /
px playwright test 310/310 全绿。
**证据**：5-home-single-row.png（首页单排）、5-canvas-composer-final.png（画布生成对话框）。
## 已知边界与暂不可验证项

- 触屏拖拽（`pointer: coarse`）不在本次范围：未暴露拖拽 affordance，未分组行保留既有「移动到项目组」会话标记（spec 平台能力表已记录）。
- 跨刷新持久化不提供：用户确认会话内 Prototype；FEAT-015 保持 PARTIAL。
- 文件夹改名/删除、拖回未分组、文件夹内排序未实现（范围外）。
- Tauri release 打包复验未执行：Web 源码同态为准，桌面端加载同一 dist（既有边界）。
- 独立 reviewer：仓库当前为单 owner 工作流，review.md 为 AI 自查记录，无第二账号审批。
