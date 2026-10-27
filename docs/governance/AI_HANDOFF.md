# AI Handoff（最短恢复入口）

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-10-28
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

本文是跨会话 AI 的最短恢复入口（30 秒内读完）。任务状态只读 [`task-ledger.json`](task-ledger.json)；当前项目事实只读 [`PROJECT_STATE.md`](PROJECT_STATE.md)。

模块化优化恢复入口：TASK-MOD-P0，`refactor/TASK-MOD-P0-architecture-baseline`，任务树`D:/kk-studio/.worktrees/TASK-MOD-P0-architecture-baseline`；先读[规格](../changes/2026-10-28-modularity-p0/spec.md)与[验证](../changes/2026-10-28-modularity-p0/verification.md)。本卡不改产品源；本地主线与远端113/7分叉，原主checkout有受保护的Figma审计dirty内容。未满足合流条件前不得覆盖主仓、发布或开始依赖P0合入的P1。

## 1. 当前基线与门禁（2026-10-26）

- **唯一主仓**：`D:/kk-studio/KK-Studio-2.0`（主线分支 `main`，三端版本 `2.1.45` / `2.1.45` / `2.1.42`）。
- **快速开发门禁（Fast Loop）**：`npm run typecheck && npm run lint && npm test`。
- **合流交付门禁（Ship Gate）**：`npm run verify`。
- **架构契约**：`src/domain/` 零外部依赖；`src/features/<feature>/index.ts` 全部 23 个特性已具备标准公开入口。

## 2. 当前优先推进主线（无需重复请示，按全权宪章自主推进）

1. **Wave 1 — 接通与暴露**：参照 [优化路线图](../changes/2026-10-26-kk-optimization-roadmap/roadmap.md) 与 [竞品学习方针](../engineering/COMPETITIVE-LEARNING-POLICY.md)，优先推进 `OPT-101/102`（本地 ComfyUI 出图链 Tauri invoke 桥接通）与 `OPT-003/103`（MCP 服务端最小集暴露画布工具）。
2. **Wave 2 — 画布底座解耦**：推进 `OPT-201` 抽取 `CanvasAdapter` 接口，逐步解耦 `src/components/canvas/` 自研渲染层。
3. **Figma 设计先行**：涉及 UI 变更时，遵循 [`AGENTS.md`](../../AGENTS.md) 与 [`UI_INDEX.md`](../UI_INDEX.md) 先核验 Figma 真值再同步本地令牌与组件。

## 3. 历史交接归档

2026-10-25 及更早的阶段交接记录已归档至 [`docs/archive/AI_HANDOFF_HISTORY_202610.md`](../archive/AI_HANDOFF_HISTORY_202610.md)。
