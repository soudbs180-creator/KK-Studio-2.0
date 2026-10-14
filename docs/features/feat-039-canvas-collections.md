# 画布喜欢、标签与分类搜索（FEAT-039）

- 状态：PARTIAL
- 领域：canvas
- 最近更新：2026-10-14
- 关联任务：TASK-UI-CONSOLIDATE-20261014、TASK-PROTOCOL-CLI-20261014、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014

## 用户可见入口

卡片顶部工具栏的喜欢/标签；底栏“喜欢与标签”中的“我喜欢的”和“画布标签”；侧栏搜索与 Ctrl/⌘+K 的四类结果。

## 代码位置

CanvasCollectionsPanels、FloatingCollectionPanel、SavedPane、CatalogPanel、CatalogTagResults、TagEditor、CanvasImageActions；collectionTags / assets / canvasItems 领域字段；creation/model.ts、snapshotCodec.ts、原生 creation_validation.rs 与 project_package_snapshot.rs。屏幕位置使用非敏感界面偏好，世界节点坐标仍由项目 canvas 管理。

## 测试与证据

- 2.1.24源码候选（TASK-223，PARTIAL）：取消/删除/撤销后的喜欢/标签关联和重载保持仍需本轮回归；完整verify、Native和独立审查未完成，结果见[本轮验证](../changes/2026-10-14-action-usability-223/verification.md)。

- 2.1.23本地按钮修复：`tests/browser/canvas-node-actions.spec.ts`、`tests/browser/canvas-selected-zoom-menu.spec.ts`；结果及Web/Desktop边界见[2.1.23历史验证](../changes/2026-10-14-action-usability-222/verification.md)。

collectionTags / assets 单测；canvas-collection-panels、ui-unification 及迁移后的 frontend / ui-motion / redbox-ui / design-corrections / desktop-data-stability 浏览器规格；原生标签/项目包 fixture。历史结果见 [UI 收敛验证](../changes/2026-10-14-ui-consolidation/verification.md)：2.1.21产品提交7a463742完整browser545首试通过且0flaky；官方Desktop构建与实际Tauri9项检查通过，标签/收藏、独立面板、视频上传/重载及原件字节均核对。这些数字不覆盖本轮新增协议、CLI 和手机编辑器；此前2.1.22结果由[2.1.22协议/CLI验证](../changes/2026-10-14-protocol-cli-completion/verification.md)记录，安装器仍另行验收。

## 当前能力

- 本轮2.1.23已验证在删除卡片后保留喜欢与兼容收藏记录，撤销立即恢复显示，重载继续恢复；屏幕动作不随画布缩放降低物理命中区。

已有实现使用 likedIds 喜欢、tags/customTags 分类与 favoriteIds 兼容“收藏”标签；顶部动作和两个固定屏幕尺寸、自由拖动的独立面板。面板支持名称/提示词查找、改名、移除和定位；全局搜索分类与偏好管理分开。普通标签上限与额外收藏投影不互相截断；取消收藏标签更新旧字段，保存/重载按统一快照契约，见 [ADR-017](../architecture/adr/ADR-017-unified-ui-and-collection-compatibility.md)。

本轮手机网页屏幕编辑器复用节点状态，世界坐标与既有喜欢/标签字段不变。喜欢/标签面板仍高于画布工具栏和屏幕编辑器，低于设置/模态层；两面板各自打开、移动和关闭。编辑器命中尺寸修复不扩大搜索数据范围，也不表示项目包、供应商或 Native Mobile 已验收。

## 差距与后端化

完整首试、窗口层级/回焦和旧收藏兼容已有Web及当前Tauri标签/上传证据；项目包真实导入/导出窗口、日常用户资料和Native Mobile仍有独立验收边界，不能借用基础画布 FEAT-001 的历史 REAL 状态。搜索只覆盖当前项目与已加载归档页；全库索引、远端同步、Native Mobile和真实模型不在此能力声明范围。位置保存失败显示原因并允许继续本次拖动，不移动/复制原件。
