# AI恢复入口

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-11-06
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

1. 核对main、Git状态和唯一worktree；本轮基准752f7dbd，当前第二阶段任务TASK-DEEP-WATER-20261105。读取[当前状态](PROJECT_STATE.md)、[任务台账](task-ledger.json)、[验证](../changes/2026-11-05-step2-deep-water/verification.md)与[审查](../changes/2026-11-05-step2-deep-water/review.md)。
2. 不重开已合入752f7dbd的旧接线分支；旧TASK-E2E-WIRING-20261104的未验边界仍按历史证据保留，当前树由本轮任务独占。
3. B1–B5与A1–A3源码、门禁和桌面构建按本次收据复核；生成质量、外部计费、用户验收和正式外部发布不能由本地夹具替代。未验项不标REAL。

4. UI-004当前承接基准 `00b6c5c9`，Desktop/Web源码2.1.66；先读[UI验证](../changes/2026-11-05-figma-local-sync/verification.md)和当前Figma映射，继续全量浏览器失败项、Desktop收据与独立审查。当前14项三宽度定向通过不代表全页完成；原127入口IndexedDB旧线程/Google会话校验失败，禁止清空或覆盖原件。其余dirty与staged证据归档不是本任务提交范围。
