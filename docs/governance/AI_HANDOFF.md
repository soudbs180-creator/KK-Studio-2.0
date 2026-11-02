# AI Handoff（最短恢复入口）

## 当前Figma校正状态

2026-10-28当前：手机两排回归已修：素材操作恢复单排，窄档44图标、宽档保留88文字，实际最小阈值404/内380；手机仅聊天生成，无画布。03共享输入上传/发送44、模型80×44，参考素材72高横滚；05已建立320/390/768实例对照，退出旧画布场景与入口。最终文字/槽位截图及独立静态复核通过；本地产品代码未改，播放器、键盘、动态内容及本地同步未验，整体PARTIAL。 见[手机专项与本地映射](../changes/2026-10-28-figma-sync-governance/mobile-chat-layout.md)。

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-10-28
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

本文是跨会话 AI 的最短恢复入口（30 秒内读完）。任务状态只读 [`task-ledger.json`](task-ledger.json)；当前项目事实只读 [`PROJECT_STATE.md`](PROJECT_STATE.md)。

## 1. 当前基线与门禁（2026-10-26）

- **唯一主仓**：`D:/kk-studio/KK-Studio-2.0`（主线分支 `main`，三端版本 `2.1.45` / `2.1.45` / `2.1.43`）。
- **快速开发门禁（Fast Loop）**：`npm run typecheck && npm run lint && npm test`。
- **合流交付门禁（Ship Gate）**：`npm run verify`。
- **架构契约**：`src/domain/` 零外部依赖；`src/features/<feature>/index.ts` 全部 23 个特性已具备标准公开入口。

## 2. 当前优先推进主线（无需重复请示，按全权宪章自主推进）

1. **Wave 1 — 接通与暴露**：参照 [优化路线图](../changes/2026-10-26-kk-optimization-roadmap/roadmap.md) 与 [竞品学习方针](../engineering/COMPETITIVE-LEARNING-POLICY.md)，优先推进 `OPT-101/102`（本地 ComfyUI 出图链 Tauri invoke 桥接通）与 `OPT-003/103`（MCP 服务端最小集暴露画布工具）。
2. **Wave 2 — 画布底座解耦**：推进 `OPT-201` 抽取 `CanvasAdapter` 接口，逐步解耦 `src/components/canvas/` 自研渲染层。
3. **Figma 设计先行**：涉及 UI 变更时，遵循 [`AGENTS.md`](../../AGENTS.md) 与 [`UI_INDEX.md`](../UI_INDEX.md) 先核验 Figma 真值再同步本地令牌与组件。

当前Figma续作复用fix/TASK-FIGMA-PAGES-20261025-selection与账本登记工作树，先03后04/05及本地；当前Edge专项14/14，整体PARTIAL。详见[当前验证](../changes/2026-10-25-figma-04-05-rework/verification.md)及工程外figma-layer-recovery-20261026/state.json，不将专项通过当作全量/原生/合流完成。

**2026-10-28覆盖续作边界**：本阶段仅设计文档与03只读审计，禁止代码/Figma写入。五页职责、共用母件/变体集中、命名查找、UI与本地规范100%覆盖见[spec](../changes/2026-10-28-figma-sync-governance/spec.md)；从[03首轮清单](../changes/2026-10-28-figma-sync-governance/audit-03.md)继续逐族只读核查。用户辅助箭头要求高44/缩宽，24宽仅为AI候选，未实施。历史运行通过不能证明本轮同步；证据在工程外 `output/figma-sync-20261028-03-audit/`。

## 3. 历史交接归档

2026-10-25 及更早的阶段交接记录已归档至 [`docs/archive/AI_HANDOFF_HISTORY_202610.md`](../archive/AI_HANDOFF_HISTORY_202610.md)。
