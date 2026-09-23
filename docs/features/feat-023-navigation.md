# 导航、侧栏与多创作页（FEAT-023）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-09-22
- 关联任务：TASK-UI-DISMISS-002、UI-004、TASK-UI-006

## 用户可见入口

- 左侧栏：导航、搜索/收藏（Ctrl/⌘+K）、项目列表/分组、设置；窄屏菜单。

## 代码位置

- `src/components/Sidebar.tsx`、`SidebarProjectEntry.tsx`、`SidebarProjectGroup.tsx`、`SidebarGroupHeading.tsx`
- 搜索/收藏实际由 `CatalogPanel` + `SavedPane` 承接（旧 SearchPage/CollectionPage 已删除）
- 路由：`src/App.tsx` 的 open/modal 视图

## 测试与证据

- 浏览器：`sidebar`、`menu-boundaries`、`catalog-pages`、`composer-menu-audit`、`topbar-popup-lifecycle`

## 当前能力

- 导航、搜索/收藏弹窗、项目打开、窄屏菜单真实可用。

## 差距与后端化

- 多创作页/多画布分组在侧栏标注“尚未接入（Prototype）”。
- 部分页面 Figma Frame 缺失随 UI-004 处理。

## 变更记录

- 2026-09-21：创建卡片；同日删除被取代的 SearchPage/CollectionPage 孤儿组件。

- 2026-09-22：TASK-UI-006修复折叠、HUD背景与弹层生命周期；关联 `tests/browser/ui-interactions.spec.ts`、`ui-interaction-matrix.spec.ts`，验收见 `docs/changes/2026-09-22-ui-interactions/verification.md`。不升级外部服务或分组持久化能力状态。
