# 画布图片对比（FEAT-036）

- 状态：PARTIAL
- 领域：canvas
- 最近更新：2026-09-30
- 关联任务：TASK-COMPARE-001/002（DONE）、UI-004（PARTIAL，用户最终视觉确认）

## 用户可见入口

- 图片卡片“加入对比”及画布对比选择条；2–4 张并排，恰好 2 张可滑块查看。
- Web/Desktop 共享前端，分别做了浏览器 preview 与 Tauri release 操作验收；移动端仅浏览器窄屏适配，原生运行未验收。

## 代码位置

- 领域逻辑：`src/features/compare/imageCompare.ts`
- 界面：`src/features/compare/`、`src/components/Canvas.tsx`、`src/components/nodes/`
- 存储/桌面 Rust：无；对比选择只在内存中，素材仍由现有画布/资产机制管理。

## 测试与证据

- 单测：`tests/unit/imageCompare.test.ts`
- 浏览器：`tests/browser/image-compare.spec.ts`
- 桌面：`tests/desktop/image-compare.mjs`
- 初次交付记录：`docs/changes/2026-09-27-canvas-image-compare/verification.md`
- 合并后回归与当前运行证据：`docs/changes/2026-09-28-compare-ci-fix/verification.md`
- 当前集成版本 Web 与 fresh Tauri 复验：[落地验证](../changes/2026-09-29-project-landing/verification.md)。

## 当前能力

- Web production preview 已通过 1440px、1220px、390px 的浏览器操作：加入/移除图片、并排缩放滚动、滑块键盘与仿真触摸拖动、错误重试和删除后剔除。390px 还量测了主要对比按钮至少 44px 的屏幕命中高度。截图与 DOM 证据见本轮验证记录。
- Tauri release 在独立数据根目录与 WebView profile 中完成了两张本地图片、并排对比、滑块键盘及 Escape 的原生 GUI 操作；JS/CSS 与本轮 Web 产物哈希一致。
- 选择仅在当前画布会话内保留；刷新或切换项目后清空。比较过程不修改素材或调用生成服务。

## 差距与后端化

- PR #21/#22 已合入主线；390px 子像素失败由 TASK-COMPARE-002 修复，当前完整浏览器与 fresh Tauri 图片比较再次通过。用户最终视觉确认仍属 UI-004，未记录，因此保持 PARTIAL。
- 此功能本身不需要新后端。真实模型生成、自动质量评分与云端分享在本轮范围外，不能由此推断可用。
