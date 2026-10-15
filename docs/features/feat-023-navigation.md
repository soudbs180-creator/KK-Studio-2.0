# 导航、侧栏与多创作页（FEAT-023）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-10-14
- 关联任务：TASK-UI-DISMISS-002、UI-004、TASK-UI-006、TASK-PROJECT-SIDEBAR-001、TASK-UI-013、TASK-UI-CONSOLIDATE-20261014

## 用户可见入口

- 左侧栏：导航、独立搜索（Ctrl/⌘+K）、项目列表/分组、设置；窄屏菜单。喜欢/标签屏幕面板见FEAT-039。

## 代码位置

- `src/components/Sidebar.tsx`、`SidebarProjectEntry.tsx`、`SidebarProjectGroups.tsx`、`SidebarFolderGroup.tsx`、`SidebarProjectSections.tsx`、`SidebarGroupHeading.tsx`
- 搜索由CatalogPanel承接；喜欢/标签由CanvasCollectionsPanels + SavedPane/CatalogTagResults承接。旧SearchPage/CollectionPage的历史去向保留溯源。
- 路由：`src/App.tsx` 的 open/modal 视图
- 桌面单排标题栏：`src/components/TopBar.tsx`、`WindowControls.tsx`、`src/styles/desktop-titlebar.css`

## 测试与证据

- 浏览器：`sidebar`、`sidebar-real-projects`、`sidebar-project-groups`、`menu-boundaries`、`catalog-pages`、`composer-menu-audit`、`topbar-popup-lifecycle`
- 单排标题栏：`tests/browser/titlebar.spec.ts`、`tests/desktop/titlebar.mjs`、`tests/unit/windowControls.test.ts`；[本轮验证](../changes/2026-10-08-single-row-titlebar/verification.md)。

## 当前能力

- 导航、搜索/收藏弹窗、真实项目库打开、窄屏菜单可用。当前集成版本的侧栏项目与搜索结果由同一项目快照生成，静态 `KK项目 / KK工作流` 行已移除；文件夹、拖拽和置顶仅在当前会话生效。fresh Tauri release 已复验；正式安装器尚未完成，主线推广以集成 PR 记录为准。

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

## 2026-10-14 源码候选与验收边界

当前搜索源码按全部/画布卡片/项目/已加载资源分类并支持类型/标签筛选；喜欢和标签是独立屏幕面板，旧收藏深链转标签，见FEAT-039。“已加载”不冒充完整资源库；历史fresh Tauri不批准新候选。

新结果见[本轮验证](../changes/2026-10-14-ui-consolidation/verification.md)，未完成的平台/外部服务不由源码或fixture推导PASS。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。
