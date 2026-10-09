# 导航、侧栏与多创作页（FEAT-023）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-10-09
- 关联任务：TASK-UI-DISMISS-002、UI-004、TASK-UI-006、TASK-PROJECT-SIDEBAR-001、TASK-UI-013、TASK-UI-015

## 用户可见入口

- 左侧栏：导航、搜索/收藏（Ctrl/⌘+K）、项目列表/分组、设置；窄屏菜单。

## 代码位置

- `src/components/Sidebar.tsx`、`SidebarProjectEntry.tsx`、`SidebarProjectGroups.tsx`、`SidebarFolderGroup.tsx`、`SidebarProjectSections.tsx`、`SidebarGroupHeading.tsx`
- 搜索/收藏实际由 `CatalogPanel` + `SavedPane` 承接（旧 SearchPage/CollectionPage 已删除）
- 路由：`src/App.tsx` 的 open/modal 视图
- 桌面单排标题栏：`src/components/TopBar.tsx`、`WindowControls.tsx`、`src/styles/desktop-titlebar.css`

## 测试与证据

- 浏览器：`sidebar`、`sidebar-real-projects`、`sidebar-project-groups`、`menu-boundaries`、`catalog-pages`、`composer-menu-audit`、`topbar-popup-lifecycle`
- 单排标题栏：`tests/browser/titlebar.spec.ts`、`tests/desktop/titlebar.mjs`、`tests/unit/windowControls.test.ts`；[本轮验证](../changes/2026-10-08-single-row-titlebar/verification.md)。
- 项目收纳：`tests/browser/sidebar-project-groups.spec.ts`、`tests/desktop/sidebar-project-drag.mjs` 与原生鼠标助手 `.ps1`；[拖放验证](../changes/2026-10-09-sidebar-project-drag/verification.md)。

## 当前能力

- 导航、搜索/收藏弹窗、真实项目库打开、窄屏菜单可用。当前集成版本的侧栏项目与搜索结果由同一项目快照生成，静态 `KK项目 / KK工作流` 行已移除；文件夹、拖拽和置顶仅在当前会话生效。fresh Tauri release 已复验；正式安装器尚未完成，主线推广以集成 PR 记录为准。
- TASK-UI-015 已修复 Windows 原生拖放接管：未分组项目可拖到「项目」标题自动建立同名文件夹；拖到已有文件夹标题或内容区成为子项。Web 与隔离新桌面包及 Hosted quality #303 验证通过；持久化能力仍按下方开放任务处理。

## 差距与后端化

- 多创作页/多画布分组仍未接入；现有侧栏文件夹为会话态 Prototype。
- TASK-PROJECT-SIDEBAR-001：持久文件夹、成员顺序和置顶仍需快照/项目包迁移；候选 Web 与隔离 Desktop 验证通过，持久分组和用户最终产品验收待完成。
- 部分页面 Figma Frame 缺失随 UI-004 处理。

## 变更记录

- 2026-09-21：创建卡片；同日删除被取代的 SearchPage/CollectionPage 孤儿组件。

- 2026-09-22：TASK-UI-006修复折叠、HUD背景与弹层生命周期；关联 `tests/browser/ui-interactions.spec.ts`、`ui-interaction-matrix.spec.ts`，验收见 `docs/changes/2026-09-22-ui-interactions/verification.md`。不升级外部服务或分组持久化能力状态。

- 2026-09-30：集成版本当前验证与剩余边界见 [落地验证](../changes/2026-09-29-project-landing/verification.md)。

- 2026-10-08：TASK-UI-013 关闭重复原生标题栏，复用 40px 菜单栏与真实窗口控制；Web 导航不变。新 Tauri 的单排、菜单、拖动、最大化/还原、最小化和关闭通过；能力状态仍 PARTIAL，合并与正式发布另记。

- 2026-10-08：最新主线组合86e712f保留首页按需加载、图片上方操作栏与T5；窗口乱序状态及同步/异步监听清理故障回归先RED后GREEN，当前独立关闭001/002，fresh带Agent原生与Web两态回归通过。最终PR40 Hosted/普通合并/主线CI独立回读，功能状态仍PARTIAL。

- 2026-10-09：TASK-UI-015 修复项目拖入空组及文件夹内部，保留取消与外部文本/文件边界；旧桌面真实鼠标先 RED，新包四条路径 GREEN，现有会话态 Prototype 与 PARTIAL 状态不变。
