# AI Handoff（最短恢复入口）

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-10-28
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

本文是跨会话 AI 的最短恢复入口（30 秒内读完）。任务状态只读 [`task-ledger.json`](task-ledger.json)；当前项目事实只读 [`PROJECT_STATE.md`](PROJECT_STATE.md)。

模块化整顿先读[四份原文总清单](../changes/2026-10-28-modularity-p0/four-document-coverage.md)和TASK-MOD-FOUR-DOC-COVERAGE。原始审计/复核草案由执行规范修正，补篇还含STD现代化与ORG-0–7；最近五项只是优先批次。用户禁止子代理，主代理直接执行，不把自审称为独审。

P0、安全补丁和格式有各自候选与限定独审，均未合流；17个测试文件修复后定向29项通过，完整verify仍有浏览器失败。P1只做前置、ORG只备份校验未迁出、P2未实施，其余P/STD/ORG不得漏报。main与origin/main仍113/7分叉，主checkout21个dirty文件受保护。实现/审查/合流证据必须逐项记录。

最新任务树候选：b8acad1c后修复折叠侧栏的HUD宽度归零，源码Desktop/Web2.1.47、Mobile2.1.43；保存6项含三宽度同宽reload通过，30项邻接27 pass/3 fail，原HUD取消裁切另挂开放任务。ORG-2守卫与ORG-5首包62日志已形成候选，不再是“仅副本”，均未主线整合。优先处理TASK-MOD-GATE-ADJACENT和TASK-UI-HUD-CANCEL-CLIP，完整verify未过，P1/P2仍未实施。

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
