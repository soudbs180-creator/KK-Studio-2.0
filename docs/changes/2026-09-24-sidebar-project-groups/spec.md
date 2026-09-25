# Spec：侧栏项目分组与文件夹收纳交互增强

- Task ID：TASK-UI-009
- 状态：READY
- 日期：2026-09-24
- Intent / 账本：`docs/changes/2026-09-24-sidebar-project-groups/intent.md`、`docs/governance/task-ledger.json` TASK-UI-009
- 当前规范与实现基线：`docs/DESIGN-SYSTEM.md` 1.3；`docs/UI_SPEC.md`、`docs/UI-STANDARDS.md`、`docs/UI-ALIGNMENT.md`；`src/styles/sidebar.css`、`workspace.css`；main@76339c9
- Source of truth：用户 2026-09-24 请求 + 澄清（见 intent）；Figma 项目区几何沿用既有实现（`docs/reference/figma-recheck-2026-09-09/sidebar-projects.txt` 等）；本 spec 不另立冲突副本。

## 第三轮修订（2026-09-24 收敛模型，取代下文旧模型的冲突部分）

用户在验收中重定义模型（三处原话见 intent 第三轮）：**「项目」区第一层级只放项目文件夹（图标是文件夹的行）；文件夹内是第二层级（画布项目/对话项目）；「未分组」区放未放入文件夹的项目（第一层级）；文件夹行点击任意处展开/收起（行右侧两个按钮除外）；三点菜单设置含改名、移动到项目组、删除等，也可直接拖拽；项目没有文件夹时拖入后直接按项目名命名文件夹。」** 据此收敛：

- **第一层级容器**：`folders: SidebarFolderItem[]` 初始为演示 `{ id:"demo-group", title:"KK项目", expanded:true, children:[{ id:"demo-nested", title:"KK工作流" }] }`；「项目」区只渲染文件夹行（`SidebarFolderGroup`），不再有独立「分组项目行」，`groupedProjects` / 「创建分组项目」按钮移除。
- **未分组**：`ungroupedProjects` 初始 `[{ id:"demo-ungrouped", title:"KK工作流" }]`，第一层级可拖拽行。
- **拖拽收纳**：未分组行拖到文件夹行 → 加入该文件夹二级并展开（保留改名后标题）；未分组行拖到「项目」区空白处 → 自动创建以该项目命名的文件夹并收纳（`dropToSection`）。
- **三点菜单「移动到项目组」**（未分组行与文件夹二级行都有）：子面板列出已有文件夹 + 「新建项目文件夹」（按项目名新建文件夹并移入）。
- **文件夹行右侧两个按钮**：打开工作台（`aria-label=打开 {title} 工作台`，点击导航 workspace、不触发收展）、设置（`aria-label={title} 设置`，菜单「项目组设置」：置顶项目/改名字/删除项目组，删除后显示「恢复项目文件夹」undo）。右键 / Shift+F10 也打开该菜单。
- **折叠语义**：文件夹行点击（两个按钮除外）切换 aria-expanded；「项目」标题整组折叠/恢复；点击任意项目条目收起全部文件夹并导航 workspace；「未分组」标题折叠全部。
- **行内改名**：项目改名提交时同步父层标题（`renameProject`），保证移动/新建文件夹时取到最新名称。
- **状态全部本地 React state**，刷新恢复默认；组件拆分：`SidebarProjectGroups`（状态容器，≤300 行）、`SidebarProjectHeader`（标题行 + 显示/排序菜单）、`SidebarProjectSections`（两组渲染 + 项目区空白拖放）、`SidebarFolderGroup`（文件夹行 + 二级）、`SidebarProjectEntry`（未分组/二级项目行）；删除 `SidebarProjectGroup.tsx`。
- **交互修正（对应验收反馈）**：① 菜单/子面板打开时点击文件夹行：`useDismissible` 的 pointerdown 不再抢焦点（Escape 仍回焦触发器），避免点击被吞、行无法收起；② 文件夹行 `position:relative`，设置菜单锚定行右侧下方；③ 「移动到项目组」子面板向左展开（`right: calc(100% + 4px)`），不溢出侧栏进入工作台区域；④ 层级宽度：文件夹行 263px，文件夹内子项目行 231px（左侧缩进 32px、右缘与文件夹行右缘对齐），「文件夹比项目长」；⑤ 右侧图标列位统一：文件夹行/子项目行/未分组行均按 `right:27/right:5` 绝对定位（实测 x=230/252），不再错位。

## 第四轮修订（2026-09-24 缩略图按内容类型区分，取代下文旧模型冲突部分）

用户在第三轮验收后追加：**「项目橙色的需要修改一下：这个是主要生成的内容图片（颜色）；如果项目是纯文案那么就（用）颜色然后增加一个聊天图标；如果创建没生成那么就纯色，这个颜色随机的。」** 据此补充：

- **行左侧缩略图三态**（`SidebarProjectVisual` 判别联合）：
  - `{ kind:"image", src }`：项目主要生成内容为图片 → 缩略图显示内容图片（25×25 圆角色块内 `img` 铺满，`object-fit:cover`）；
  - `{ kind:"chat", color }`：纯文案/对话项目 → 纯色块 + 白色聊天气泡图标（`project-chat-glyph.svg` 12×12 居中；圆角气泡 + 左下尾巴 + 三个对话点，点按 evenodd 挖空显示底色）；
  - `{ kind:"color", color }`：创建但未生成内容 → 纯色块（无图标），颜色从 `PROJECT_THUMB_COLORS` 8 色板随机。
- **随机色**：`randomProjectColor()` 每次调用独立随机；创建项目时取样一次存入条目，会话内固定（刷新重新随机）。
- **回退**：条目未提供 `visual` 时沿用旧 `.project-yellow` 橙色块（不破坏未显式配置行的既有渲染）。
- **移动/拖拽携带**：`findProjectVisual` 在 未分组/文件夹二级 中查找源条目 visual，拖入文件夹、移入已有文件夹、新建项目文件夹均保留缩略图。
- **演示数据**：未分组「KK工作流」= `chat`（蓝 `PROJECT_THUMB_COLORS[0]` + 聊天图标）；文件夹二级「KK工作流」= `image`（`/fixtures/demo/blue-hour.png`）；新建未分组项目 = `color`（随机）。
- **实现约束**：缩略图 25×25 与旧 `.project-yellow` 同尺寸，行几何（rows=[[231,29],[263,29]]、folders=[[263,29]]、图标列位 right:27/5）不变；组件内不出现十六进制颜色字面量（demo 色引用调色板常量）；`SidebarProjectGroups.tsx` ≤300 行。

## 用户行为与入口

### 状态模型（会话级 Prototype）

```
SidebarProjectItem { id: string; title: string }
SidebarFolderItem  { id: string; title: string; expanded: boolean; children: SidebarProjectItem[] }
```

- `ungroupedProjects: SidebarProjectItem[]`：初始 `[{ id:"demo-ungrouped", title:"KK工作流" }]`（保持默认单条目）。
- `groupedProjects: SidebarProjectItem[]`：初始 `[]`；「项目」区先渲染既有 `SidebarProjectGroup`（KK项目 + 二级 KK工作流 演示行，几何与既有断言不变），后接新建分组项目行。
- `folders: SidebarFolderItem[]`：初始 `[]`；新建时 `expanded: true`，标题按「新建文件夹」「新建文件夹 2」…顺序。
- 全部状态存于 `Sidebar.tsx`，刷新即恢复默认；新增控件 title/文案标注「会话内 Prototype」。

### 主流程

1. **创建未分组项目**：未分组标题行「创建未分组项目」按钮（替换原禁用的「创建创作页」）→ 追加 `{title:"新建项目"}` 行，自动进入改名（聚焦输入框）。
2. **创建分组项目**：「项目」标题行「创建分组项目」按钮 → 在演示组后追加分组项目行，自动进入改名。
3. **创建项目文件夹**：既有「+」按钮（aria-label 保持「创建项目文件夹」）→ 在「项目」区内追加文件夹行（`.project-folder-group`），`expanded:true`，显示空提示 `.project-folder-empty`（文案标注 Prototype 与拖拽提示）。
4. **拖拽收纳**：未分组行 `draggable`；拖到文件夹行释放 → 从未分组列表移除、加入 `folder.children`、该文件夹 `expanded:true`；拖拽悬停文件夹行显示 `is-drag-target` 反馈；文件夹行释放后展开显示二级条目。
5. **折叠**：
   - 点击文件夹行 → 切换自身 `expanded`（隐藏/显示二级条目，含空提示）；
   - 点击「项目」标题 → 折叠整组（组内演示行、新建分组项目行、所有文件夹行全部隐藏），再点恢复；
   - 点击任意项目条目（演示组行、新建分组项目行、未分组行、文件夹二级行）→ 所有文件夹 `expanded=false`（文件夹行保留），并照常导航到 workspace；
   - 点击「未分组」标题 → 隐藏全部未分组条目，再点恢复。

### 入口与组件

| 入口 | 位置 | 组件/类 |
| --- | --- | --- |
| 创建未分组项目 | 未分组标题行操作区 | `SidebarGroupHeading` 新增 `onCreateProject`；按钮 aria-label「创建未分组项目」 |
| 创建分组项目 | 「项目」标题行操作区 | `Sidebar.tsx` 新增按钮 aria-label「创建分组项目」 |
| 创建项目文件夹 | 「项目」标题行「+」 | `Sidebar.tsx` 既有按钮（aria-label 不变） |
| 文件夹行（含拖放目标） | 「项目」区内 | 新增 `SidebarFolderGroup.tsx`，类 `.project-folder-group` / `.folder-heading` / `.project-nested-entry` |
| 项目行拖拽 | 未分组行 | `SidebarProjectEntry` 新增 `draggable/dragId/onDragStart/defaultTitle/autoEdit` 可选 props |

### 状态覆盖

- loading/success/error：无外部异步，不适用（Prototype 本地状态）。
- cancel：改名输入 Escape 即退出编辑（沿用 `SidebarProjectEntry` 行为）。
- offline：不适用（无网络依赖）。
- 键盘/焦点/Escape/IME：
  - 文件夹行为 button，可 Tab 聚焦、Enter/Space 切换；aria-expanded 同步；
  - 项目行沿用既有 Shift+F10 菜单、Escape 关闭、回焦行为；
  - 新建行 `autoFocus` 进入改名，Escape/Enter 提交退出。
- 响应式/长文案：行标题单行省略（沿用 `.project-link` 溢出规则）；窄屏/收起侧栏时项目区隐藏逻辑不变（`!collapsed && groups[i]`）。

## 架构、数据与权限

- 模块职责和依赖方向：`Sidebar.tsx` 持有会话状态与动作；`SidebarProjectEntry` 只接收 props 渲染行与菜单；`SidebarFolderGroup` 渲染文件夹行与二级条目、处理拖放事件；领域类型放 `src/features/projects/sidebarProjectModel.ts`（复用既有 features/projects 目录）。`src/styles/sidebar.css` 追加文件夹行/拖拽反馈样式，消费既有语义 tokens。
- schema/API/事件：无外部契约。拖拽 MIME `application/x-kk-project-id`（值=项目 id），仅本组件内读取，避免与浏览器文本拖放冲突。
- 数据归属与并发：组件内 state，无持久化、无并发写入；不触碰 IndexedDB/localStorage 项目契约。
- 凭据与日志：无。
- 相关 ADR：不需要。属局部 UI 交互，不改变跨模块数据契约/存储 schema/权限/部署（SDLC 第 45 行标准）。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| --- | --- | --- | --- | --- |
| 创建三种对象 | 会话 Prototype | 会话 Prototype | 同 Web（浏览器窄屏） | 未接真实项目服务，FEAT-015 保持 PARTIAL |
| 拖拽收纳 | 会话 Prototype | 会话 Prototype | 触屏无 HTML5 DnD | 触屏拖拽需指针实现，不在本次范围；未分组行另有「移动到项目组」菜单标记 |
| 三级折叠 | 会话 Prototype | 会话 Prototype | 同 Web | 本地状态，刷新恢复默认 |
| 持久化 | 不提供 | 不提供 | 不提供 | 用户确认会话内 Prototype |

## 生命周期与恢复

- 初始化：默认状态与现有一致（未分组 1 条演示、项目组演示行、无文件夹）。
- 正常使用：见主流程；取消 = Escape 退出编辑。
- 升级/旧 schema：无持久化，不适用。
- 损坏/写失败/进程重启：刷新即回默认，不涉及数据。
- 备份/还原/回滚：代码改动经 Git 分支管理；回滚 = 恢复 main@76339c9。
- 导出/卸载/退役：不适用。
- 触屏（Mobile 浏览器）说明：拖拽入口对 `pointer: coarse` 不暴露 drag affordance，保持既有「移动到项目组」会话标记，属已知边界。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 三个创建入口产生对应行，新建行进入改名 | Vite 1421 浏览器 + 新增 Playwright 用例 | DOM 断言 + 截图 |
| AC-2 | 拖拽后未分组行消失、文件夹展开并含该条目 | 同上（Chromium HTML5 DnD） | dragTo + 状态断言 + 截图 |
| AC-3 | 文件夹 aria-expanded 与二级可见性联动 | 同上 | 断言 |
| AC-4 | 「项目」标题 aria-expanded=false 时组内行与文件夹全隐藏 | 同上 | 断言 + 截图 |
| AC-5 | 点击项目条目后所有文件夹收起（行保留） | 同上 | 断言 |
| AC-6 | 「未分组」标题隐藏/恢复全部条目 | 同上 | 断言 + 截图 |
| AC-7 | 默认状态无回归（几何/菜单/改名/删除/恢复） | 定向既有测试 + typecheck/lint/ui:check/format/build | 既有测试通过记录 |

## 风险和决策

- 可自主解决的技术决定及依据：
  - 未分组区改为列表渲染但保留 `.project-group-content` 包裹与默认单条目 → 默认几何不变；
  - 文件夹渲染移入「项目」区内部，使标题折叠能覆盖文件夹；
  - 新建文件夹顺序命名（首个固定「新建文件夹」）兼容既有 ui-interactions/catalog-pages 断言；
  - 文件夹行复用 `.project-link` 语义类做二级条目样式，视觉与既有嵌套一致。
- 待用户决定的产品语义：无（已澄清）。
- 规范冲突、外部依赖与阻断范围：无；Node 24 便携运行时为工程环境补充（仓库要求 Node ≥24，系统 PATH 为 22，记录于 plan）。
- 与 intent 的差异及授权依据：无。
- 明确未承诺的能力：跨刷新持久化、文件夹管理（改名/删除）、拖回/排序、触屏拖拽、真实项目服务接线。
## 第五轮（2026-09-24 下午）：生成对话框诊断与修复
- 修复项目行导航 bug：openProject(id) 曾把项目 id 当 App view 传入，导致点击文件夹内二级项目行弹出「使用说明」对话框且不导航；现固定 onNavigate("workspace")。
- 首页生成输入区单排：批量/数据 select 并入功能键同一行（桌面 1920 实测单行 y≈477），响应式 768–1200 flex-wrap 自然折行。
- 画布生成对话框：creation-controls 已单排（模型/自适应尺寸/语音/×8/生成 568×35）。
- 全量 310/310 + 门禁全绿，详见 verification.md 第五轮。
