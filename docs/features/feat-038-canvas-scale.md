# 画布千张画面性能（FEAT-038）

- 状态：PLANNED
- 领域：canvas
- 最近更新：2026-10-09
- 关联任务：TASK-PERF-CANVAS-1000-001

## 用户可见入口

- 无限画布在单项目内放置上千张画面（图片/视频/音频/文本节点、连线、参考图）时的渲染、内存与响应体验。
- Web / Desktop 均适用；目标：千节点量级下拖拽、框选、缩放、生成回流不卡顿、不白屏。

## 代码位置

- `src/components/canvas/CanvasNodeLayer.tsx`：全量 `items.map()` 渲染，无视口裁剪（当前最大瓶颈）
- `src/components/canvas/CanvasNodeItem.tsx`：节点组件（待 memo 化与稳定回调）
- `src/components/canvas/CanvasConnections.tsx`：连线全量绘制（待视口裁剪/降级）
- `src/components/canvas/useCanvasControls.ts` / `useCanvasPointer.ts`：框选/拖拽遍历（待空间索引）
- `src/domain/canvasHistory.ts`：历史快照（limit=80 已有，待增量压缩）
- `src/features/creation/useCreationStorage.ts`：对象 URL 回收（已有 1s 后 revoke，待统一 LRU）
- `src/features/creation/assetRepository.ts`：素材元数据/原件按需读取（PERF-001 已有基础）

## 测试与证据

- 单测：`tests/unit/`（视口计算、空间索引、LRU 缓存新增）
- 浏览器回归：`tests/browser/`（千节点 fixture 渲染/交互新增）
- 门禁证据：`docs/changes/2026-10-09-p0-registry/verification.md`（登记包）

## 当前能力

- 无专项实现；现状为全量渲染，历史已有 limit=80，素材库已有按需读取（PERF-001）。
- 说明：本文为 PLANNED，不声明任何已实现能力。

## 差距与后端化

- 视口外节点仍渲染（数千 DOM）→ 视口裁剪（P0）
- 节点组件无 memo、父层 state 变化全量重渲染 → memo + useCallback（P0）
- 图片节点持大图 preview → 缩略图降采样 + 懒加载 + LRU（P0）
- 连线全量绘制 → 视口内绘制 + 超阈值降级（P1）
- 框选/拖拽每帧全量遍历 → 网格/四叉树空间索引（P1）
- 历史全量快照 → 增量快照/命令模式（P1）
- 多创作页同时挂载 → 页面级懒加载（P2）
- 对应任务：TASK-PERF-CANVAS-1000-001（P0 三件套先行）

## 变更记录

- 2026-10-09：创建卡片，登记于 `docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md`（方向三）。
