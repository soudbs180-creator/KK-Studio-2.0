# Intent：侧栏项目分组与文件夹收纳交互增强

- Task ID：TASK-UI-009
- 状态：READY
- 日期与提出者：2026-09-24，用户（KK-Studio-2.0 维护者）
- 请求来源：当前会话用户原话（2026-09-24）：
  > 页面UI左侧的项目分组和未分组，可以单独创建未分组项目和分组项目，可以创建项目文件夹可以把未分组的拖进入项目文件夹里面也就是二级展开点击文件夹可以隐藏二级菜单，点击项目也可以隐藏创建的所有项目文件夹。未分组也是可以隐藏全部的。
- 用户授权范围与依据：用户明确描述左侧项目面板目标行为，属已授权 UI 实现。用户回答澄清：折叠语义为「两种都要」（点击「项目」分组标题折叠整组；点击任意项目条目也收起文件夹）；持久化为「会话内 Prototype（推荐）」（刷新恢复默认，不冒充持久化服务）。
- 关联账本、spec、plan：`docs/governance/task-ledger.json`（TASK-UI-009）、`docs/changes/2026-09-24-sidebar-project-groups/spec.md`、`plan.md`。

## 用户原意

左侧「项目分组 / 未分组」面板要具备：

1. 能**单独创建**「未分组项目」「分组项目」和「项目文件夹」三种对象；
2. 未分组项目可以**拖进项目文件夹**，成为文件夹下的二级条目（拖入后文件夹展开）；
3. **点击文件夹**可以收起/展开它的二级条目（隐藏二级菜单）；
4. **点击「项目」分组标题**可以隐藏整组（项目行 + 所有已创建文件夹一并隐藏）；
5. **点击任意项目条目**也把已创建文件夹收起（用户明确选择「两种都要」）；
6. 「未分组」标题同样可以隐藏该组全部条目；
7. 以上均为**会话内 Prototype**：刷新恢复默认，明确标注为前端演示，不冒充持久化项目服务。

## AI 工程转译

- 目标：扩展现有 `Sidebar.tsx` 项目区，引入会话级状态模型（未分组项目列表、分组项目列表、文件夹列表），补齐创建、拖拽收纳、三级折叠交互；保持既有默认状态 DOM 结构、Figma 几何与既有浏览器测试契约。
- 使用者：Web（Vite dev/preview）与 Desktop（Tauri 加载同一前端）左侧栏。
- 入口：`src/components/Sidebar.tsx`、`SidebarProjectEntry.tsx`、`SidebarGroupHeading.tsx`、新增 `SidebarFolderGroup.tsx`、新增领域类型文件、`src/styles/sidebar.css`（+必要时 workspace.css）；浏览器测试新增 `tests/browser/sidebar-project-groups.spec.ts`。
- 输入/输出：无外部 API；状态为组件内 React state（会话级 Prototype）。
- 约束：消费 Design System 1.3 语义 tokens（`docs/DESIGN-SYSTEM.md`）；不新增第二套状态源；不触碰项目持久化契约（FEAT-015 保持 PARTIAL）；默认状态几何不得变动（frame-accuracy 等既有断言）。
- 验收证据：typecheck/lint/ui:check/format/build 通过；浏览器同态证据（1421 端口、DOM + 截图）覆盖创建、拖拽、折叠三类交互；既有 sidebar 相关测试回归通过。

## 目标与非目标

- 预期结果：用户可会话内创建三种对象、拖未分组项目进文件夹、按文件夹/标题/项目条目三级折叠，刷新恢复默认且界面标注 Prototype。
- 包含范围：
  - 项目区状态模型（未分组项目 / 分组项目 / 文件夹，均会话级）；
  - 三个创建入口（未分组标题旁、项目标题旁、+ 新建文件夹）；
  - 未分组 → 文件夹的 HTML5 拖拽收纳（拖入即展开文件夹）；
  - 文件夹点击折叠二级、项目标题折叠整组、项目条目点击收起全部文件夹、未分组标题隐藏整组；
  - 新增浏览器测试与既有测试回归。
- 明确不包含：
  - 持久化（localStorage/IndexedDB）与真实项目服务接线；
  - 文件夹改名/删除、文件夹内项目拖回未分组、文件夹内排序；
  - 移动端原生验收、Tauri release 打包验证（Web 同态为主，Tauri 加载同一 dist 源码不变，按既有边界说明）；
  - 修改 FEAT-015 项目包/存储契约。
- 受影响平台/模块：Web/Desktop 共享前端 `src/components`、`src/styles`、`tests/browser`、`docs`。
- 已有实现和规范来源：`src/components/Sidebar.tsx`、`SidebarProjectGroup.tsx`、`SidebarProjectEntry.tsx`、`SidebarDraftFolder.tsx`、`SidebarGroupHeading.tsx`、`src/styles/sidebar.css`、`workspace.css`；`docs/DESIGN-SYSTEM.md` 1.3；`docs/features/feat-015-projects.md`；既有测试 `tests/browser/{sidebar,catalog-pages,frame-accuracy,interaction-state,ui-interactions}.spec.ts`。

## 验收条件

| ID   | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| ---- | -------------- | ------------- | -------- |
| AC-1 | 「未分组」标题旁可创建未分组项目，新行出现并可直接改名；「项目」标题旁可创建分组项目；「+」可创建项目文件夹 | 浏览器同态：三个入口点击后对应行出现；DOM/截图证据 | Web/Desktop |
| AC-2 | 未分组项目可拖入文件夹，拖入后文件夹展开且条目出现在其二级位置，未分组区不再显示该行 | Playwright dragTo + 状态断言 + 截图 | Web |
| AC-3 | 点击文件夹收起/展开其二级条目 | 文件夹按钮 aria-expanded 与二级内容可见性断言 | Web/Desktop |
| AC-4 | 点击「项目」标题隐藏整组（含文件夹），再点恢复 | 标题 aria-expanded、组内行与文件夹隐藏/恢复断言 | Web/Desktop |
| AC-5 | 点击任一项目条目后所有文件夹收起（文件夹行保留） | 点击项目后各文件夹 aria-expanded=false + 二级隐藏断言 | Web/Desktop |
| AC-6 | 点击「未分组」标题隐藏全部未分组条目，再点恢复 | 标题 aria-expanded、条目可见性断言 | Web/Desktop |
| AC-7 | 默认状态外观与交互不回归（折叠、显示/排序菜单、改名/删除/恢复、几何） | 既有 sidebar/catalog-pages/frame-accuracy/interaction-state/ui-interactions 定向回归 + typecheck/lint/ui:check/build | Web |

## 假设、风险和决策

- FACT（直接证据）：现有侧栏 项目/未分组 两组，`+` 只创建单个固定「新建文件夹」草稿（`SidebarDraftFolder`），文件夹渲染在分组外、不受「项目」标题折叠影响；项目行为本地 Prototype；既有测试契约见上文。
- INFERENCE（假设及风险）：
  - 「点击项目也可以隐藏创建的所有项目文件夹」按用户澄清实现为：点击任意项目条目 → 所有文件夹收起（保留文件夹行）；点击「项目」标题 → 整组隐藏（含文件夹行）。
  - 拖拽只做未分组 → 文件夹单向，未要求移出/排序。
  - 新建文件夹标题按「新建文件夹」「新建文件夹 2」…顺序命名，避免多个同名；首个保持「新建文件夹」以兼容既有断言。
- UNKNOWN / CONFLICT：无未决产品语义；持久化范围已由用户确认（会话内 Prototype）。
- AI 自主决定的技术事项及理由：
  - 三个创建入口的位置（未分组标题旁按钮 / 项目标题旁按钮 / 既有 + 按钮）；新建项目/文件夹默认标题与自动改名焦点；拖拽数据格式 `application/x-kk-project-id`；文件夹为空时保留 `.project-folder-empty` 提示并更新文案标注 Prototype。
  - 未分组区改为由状态列表渲染（保留 `.project-group-content` 结构与默认单条目几何），使创建与拖拽可表达。
- 必须由用户决定的产品语义/范围事项：已澄清（折叠语义两种都要；会话内 Prototype）。
- 外部条件、费用或不可逆动作及已有授权：无。
- 不在本次范围的问题与账本 ID：文件夹改名/删除、拖回未分组、排序 → 不建新账本任务（属后续产品扩展）；持久化接线 → FEAT-015 PARTIAL 既有差距（T9）。

## 第四轮补充（2026-09-24，用户验收后追加）

- 用户原话：
  > 可以，然后这个项目橙色的需要修改一下，这个是主要生成的内容图片颜色如果项目是纯文案那么就颜色然后增加一个聊天图标，如果创建没生成那么就纯色这个颜色随机的。
- 用户意图：项目行左侧缩略图不再统一橙色，按项目内容类型区分：
  1. **有生成图片的项目** → 缩略图显示内容图片；
  2. **纯文案（对话）项目** → 纯色块 + 聊天图标；
  3. **创建但未生成的项目** → 纯色块，颜色随机。
- 范围：会话级 Prototype 演示数据 + 新建项；缩略图 25×25 与旧几何一致；随机色板 8 中深色；演示「KK工作流」（未分组=chat 蓝+聊天气泡、文件夹二级=image 城市夜景图）；移动/拖拽后缩略图随项目保留。
- 验收证据：浏览器用例第 10 条 + capture.mjs 断言 33/33 + 截图 zoom-07/08/09/10；全量 310/310 无回归。
## 第五轮（2026-09-24 下午）：生成对话框诊断与修复
- 修复项目行导航 bug：openProject(id) 曾把项目 id 当 App view 传入，导致点击文件夹内二级项目行弹出「使用说明」对话框且不导航；现固定 onNavigate("workspace")。
- 首页生成输入区单排：批量/数据 select 并入功能键同一行（桌面 1920 实测单行 y≈477），响应式 768–1200 flex-wrap 自然折行。
- 画布生成对话框：creation-controls 已单排（模型/自适应尺寸/语音/×8/生成 568×35）。
- 全量 310/310 + 门禁全绿，详见 verification.md 第五轮。
