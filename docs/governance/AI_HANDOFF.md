# AI恢复入口

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-11-06
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

1. 核对main、Git状态和唯一worktree；本轮基准752f7dbd，当前第二阶段任务TASK-DEEP-WATER-20261105。读取[当前状态](PROJECT_STATE.md)、[任务台账](task-ledger.json)、[验证](../changes/2026-11-05-step2-deep-water/verification.md)与[审查](../changes/2026-11-05-step2-deep-water/review.md)。
2. 不重开已合入752f7dbd的旧接线分支；旧TASK-E2E-WIRING-20261104的未验边界仍按历史证据保留，当前树由本轮任务独占。
3. B1–B5与A1–A3源码、门禁和桌面构建按本次收据复核；生成质量、外部计费、用户验收和正式外部发布不能由本地夹具替代。未验项不标REAL。

4. UI-004：用户最新要求MCP-only、先修Figma再回读同步本地。当前main@3d7cc573+UI dirty，26定向生产浏览器通过；Desktop2.1.66 EXE659e1eb4141f/inputf2d7addff220来源稳定。先读[UI验证](../changes/2026-11-05-figma-local-sync/verification.md)与当前Figma，继续逐页/六态/像素、最新完整verify、Native窗口和正式SHA独审。原127旧会话迁移校验失败，原件禁止清空/覆盖；其他agent改动保留。
