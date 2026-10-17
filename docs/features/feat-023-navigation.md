# 导航、侧栏与多创作页（FEAT-023）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-10-18
- 关联任务：TASK-UI-DISMISS-002、UI-004、TASK-UI-006、TASK-PROJECT-SIDEBAR-001、TASK-UI-013、TASK-UI-CONSOLIDATE-20261014

## 用户可见入口

- 左侧栏：导航、独立搜索（Ctrl/⌘+K）、项目列表/分组、设置；窄屏菜单。喜欢/标签屏幕面板见FEAT-039。

## 代码位置

- `src/components/Sidebar.tsx`、`SidebarProjectEntry.tsx`、`SidebarProjectGroups.tsx`、`SidebarFolderGroup.tsx`、`SidebarProjectSections.tsx`、`SidebarGroupHeading.tsx`
- 搜索由CatalogPanel承接；喜欢/标签由CanvasCollectionsPanels + SavedPane/CatalogTagResults承接。旧SearchPage/CollectionPage的历史去向保留溯源。
- 路由：`src/App.tsx` 的 open/modal 视图
- 桌面单排标题栏：`src/components/TopBar.tsx`、`WindowControls.tsx`、`src/styles/desktop-titlebar.css`

## 2026-10-18 当前有界本地验证

Desktop/Web2.1.39/source793ddaf3：项目/文件夹pin及manual/recent/priority排序在同CreationSnapshot/CAS持久化，存储未就绪/冲突时真实禁用。Web侧栏32PASS、820窄屏键盘/重载通过；fresh官方Native真实项目/组操作和priority/pin/unpin跨四次正常启闭保持，项目包新root完整往返保留偏好。宽图共享几何按真实主体修复，四比例Web24与fresh Native宽图6状态SVG/DOM/实际拖线/端口和生成按钮命中PASS。完整verify851浏览器及原用户库9项目11聊天21消息保全见[本轮验证](../changes/2026-10-18-sidebar-canvas/verification.md)。原任务仅本地技术完成，不提升本功能成熟度/runtimeEvidence；真实Provider/Hosted/发布及用户整体接受另验。

## 测试与证据

- 浏览器：`sidebar`、`sidebar-real-projects`、`sidebar-project-groups`、`menu-boundaries`、`catalog-pages`、`composer-menu-audit`、`topbar-popup-lifecycle`
- 单排标题栏：`tests/browser/titlebar.spec.ts`、`tests/desktop/titlebar.mjs`、`tests/unit/windowControls.test.ts`；[本轮验证](../changes/2026-10-08-single-row-titlebar/verification.md)。

## 当前能力

- 导航、搜索/收藏弹窗、真实项目库打开、窄屏菜单可用。侧栏项目与搜索结果由同一快照生成。历史 `13efa3fe→00e00e40` 已将分组、成员及名称持久化，项目库与侧栏共用菜单和完整项目软删除/恢复；production1423 Edge27/27首试、Native存储/包169项及精确独审通过。当时置顶未持久化；本轮结果见下文。自由拖动重排未新增，正式发布另验。

## 差距与后端化

- canonical snapshot3多聊天及独立草稿已接入，旧资料恢复见聊天迁移验收；真实新回复和Desktop/Web完整共仓协调仍由各自任务验收。本轮pin/sort持久化不扩展自由拖动排序。
- TASK-PROJECT-SIDEBAR-001有界本地技术验收本轮完成；Desktop/Web共仓库完整协调和用户整体产品验收仍由[统一验证](../changes/2026-10-15-kk-unified/verification.md)承接。
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
