# 批量生成防护与资源回收（FEAT-039）

- 状态：PLANNED
- 领域：creation
- 最近更新：2026-10-09
- 关联任务：TASK-PROTECT-BATCH-GEN-001

## 用户可见入口

- 用户在单个项目画布中持续批量生成、无限刷新（图片/视频/音频/文本节点连续触发）时，系统限流、节流、队列控制、内存回收与降级策略，保证不崩溃、不卡死。
- Web / Desktop 均适用；生成结果回流画布时的分批渲染体验。

## 代码位置

- `src/features/creation/generationQueue.ts`：已有底层原语（canStartQueueItem 冷却/并发门禁、selectConnection 负载均衡、retryDelayMs 指数退避、mapWithConcurrency 有界池）
- `src/features/creation/providerSubmission.ts`：outputCount ≤64 校验已有
- `src/components/canvas/CanvasNodeLayer.tsx`：`reserveGeneratedResults` / `addGeneratedResults` 一次性入画布（待分批）
- `src/features/creation/useCreationStorage.ts`：对象 URL 1s 后 revoke（待节点删除/替换即时回收）
- `src/features/creation/taskRecovery.ts`：失败只重试 failed_item_ids（已有基础）

## 测试与证据

- 单测：`tests/unit/`（节流、队列容量、分批入画布、URL 回收新增）
- 浏览器回归：`tests/browser/`（连续触发生成与满载降级新增）
- 门禁证据：`docs/changes/2026-10-09-p0-registry/verification.md`（登记包）

## 当前能力

- 底层队列/冷却/幂等/退避原语已存在并被本地与 BYOK 图片路径使用。
- UI 提交侧节流、单画布 running 上限、结果分批入画布、队列容量上限、节点删除即回收对象 URL 未实现。
- 说明：本文为 PLANNED，UI 侧防护不声明已实现。

## 差距与后端化

- 节点连续触发批量生成无限制 → 提交侧全局节流 + 单画布 running 上限（P0）
- 批量结果一次性入画布 → 分批（≤5）+ rAF 间隔（P0）
- 队列无限堆积 → 容量上限 + FIFO + 超时自动 cancel（P1）
- 对象 URL 泄漏 → 节点删除/结果替换即时 revoke + LRU（P1）
- 编辑随机性无限重试 → 重试节流 + 提示词微调引导 + 幂等展示（P1）
- 云端回写高并发 → WebSocket 节流合并 + 轮询退避（P2）
- 长会话内存增长 → 会话窗口化 + 不可见页卸载（P2）
- 对应任务：TASK-PROTECT-BATCH-GEN-001（P0 两件套先行）

## 变更记录

- 2026-10-09：创建卡片，登记于 `docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md`（方向四）。
