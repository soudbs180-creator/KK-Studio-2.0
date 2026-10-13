# 画布喜欢、标签与分类搜索（FEAT-039）

- 状态：PARTIAL
- 领域：canvas
- 最近更新：2026-10-14
- 关联任务：TASK-UI-CONSOLIDATE-20261014

## 用户可见入口

卡片顶部工具栏的喜欢/标签；底栏“喜欢与标签”中的“我喜欢的”和“画布标签”；侧栏搜索与 Ctrl/⌘+K 的四类结果。

## 代码位置

CanvasCollectionsPanels、FloatingCollectionPanel、SavedPane、CatalogPanel、CatalogTagResults、TagEditor、CanvasImageActions；collectionTags / assets / canvasItems 领域字段；creation/model.ts、snapshotCodec.ts、原生 creation_validation.rs 与 project_package_snapshot.rs。屏幕位置使用非敏感界面偏好，世界节点坐标仍由项目 canvas 管理。

## 测试与证据

collectionTags / assets 单测；canvas-collection-panels、ui-unification 及迁移后的 frontend / ui-motion / redbox-ui / design-corrections / desktop-data-stability 浏览器规格；原生标签/项目包 fixture。实际结果见 [本轮验证](../changes/2026-10-14-ui-consolidation/verification.md)，完整browser、实际Desktop与安装器尚无最终通过声明。

## 当前能力

源码候选已接入 likedIds 喜欢、tags/customTags 分类与 favoriteIds 兼容“收藏”标签；顶部动作和两个固定屏幕尺寸、自由拖动的独立面板。面板支持名称/提示词查找、改名、移除和定位；全局搜索分类与偏好管理分开。普通标签上限与额外收藏投影不互相截断；取消收藏标签更新旧字段，保存/重载按统一快照契约，见 [ADR-017](../architecture/adr/ADR-017-unified-ui-and-collection-compatibility.md)。

## 差距与后端化

候选仍需补完整首试、窗口层级/回焦、旧数据恢复与实际 Tauri UI/项目包证据，不能借用基础画布 FEAT-001 的历史 REAL 状态。搜索只覆盖当前项目与已加载归档页；全库索引、远端同步、Native Mobile和真实模型不在此能力声明范围。位置保存失败显示原因并允许继续本次拖动，不移动/复制原件。
