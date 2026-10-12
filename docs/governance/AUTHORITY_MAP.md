# 权威来源地图

更新：2026-10-09。机器可读版本见 [`AUTHORITY_MAP.json`](AUTHORITY_MAP.json)。本页说明冲突处理顺序与事实归属；它不复制其他规范，也不把历史证据升级为当前能力。

## 规则冲突的固定顺序

**本页不维护独立的优先级列表。** 权威顺序与冲突裁决的唯一来源是 [`docs/README.md` §权威优先级与冲突裁决](../README.md#权威优先级与冲突裁决)，本页只负责说明事实归属。当两份材料对"应该怎样做"发生冲突，按该文件的顺序解释。

要点提示（细节以 `docs/README.md` 为准）：

- **代码与规范冲突不默认以代码为准**：先判断是实现缺陷还是规范过时，写明依据，并同步修正对应一侧。
- 架构、数据与 UI 契约（[`docs/architecture/`](../architecture/)、[`DATA-STORAGE.md`](../architecture/DATA-STORAGE.md)、[`UI_INDEX.md`](../UI_INDEX.md) 及其路由文件）属**专项规范**，位于 `src/` 实际代码之上。
- 历史材料（`archive/`、已合并存根、带日期的 change package）不参与裁决，只用于追溯。

## 领域事实归属

- 任务状态、负责人、依赖和任务证据由 [`task-ledger.json`](task-ledger.json) 负责；`TASK_LEDGER.md` 是生成视图，不能手改。
- 项目当前事实和恢复入口由 [`PROJECT_STATE.md`](PROJECT_STATE.md) 与 [`AI_HANDOFF.md`](AI_HANDOFF.md) 的最新日期段负责；旧段落仍是历史证据。
- 功能能力真实程度由 [`docs/features/features.registry.json`](../features/features.registry.json) 和 `feat-*.md` 卡片负责；任务状态与功能状态正交。
- 存储与跨应用记忆契约由 [`DATA-STORAGE.md`](../architecture/DATA-STORAGE.md) 和 [`MEMORY-CONTRACT.md`](../MEMORY-CONTRACT.md) 负责。记忆同步门禁见 [`MEMORY-GOVERNANCE.md`](../MEMORY-GOVERNANCE.md)。
- UI 规则先读 [`UI_INDEX.md`](../UI_INDEX.md)，再读该索引指定的唯一承载文件。归档的旧 UI 文件只用于追溯。
- 源码、测试和 `verification.md` 只证明记录的版本、运行模式和边界。构建通过、静态比较或旧截图不能单独证明当前 REAL 能力。
- 竞品材料统一从 [`docs/reference/competitor/INDEX.md`](../reference/competitor/INDEX.md) 进入；研究材料是只读输入，不能证明 KK 已实现对方能力或已接入供应商。

## 生成文件和历史材料

`docs/governance/TASK_LEDGER.md` 与 `docs/features/README.md` 由脚本生成。历史 change package、`docs/archive/` 和 [`legacy-document-index.json`](legacy-document-index.json) 保留原文件，不删除或改写旧结论；索引中的 `supersededBy` 只表示后续入口，不表示旧证据失效。
