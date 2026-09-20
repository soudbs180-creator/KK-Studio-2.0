## Task and goal

- Task: TASK-ASTRA-001
- Goal: 将 GPT-6 Astra 迁移计划对齐已整合的 KK Studio 2.0 主线，并记录分支/规则/远端同步边界。
- Why: 初稿读取的是旧 dirty checkout；当前 main 已包含 T3b/T4 和 T5 原生 TaskHost，必须避免重复建设或把旧 monorepo 当作新远端。

## Scope

- In scope: Astra intent/spec/plan/verification、分支规则审计、任务账本与恢复入口。
- Out of scope: Astra 实现、模型调用、UI 修改、付费请求、部署、历史分支合并/清理、旧 GitHub 仓库改动。
- Affected modules: docs/changes/2026-09-20-gpt-6-astra、docs/governance、docs/PROGRESS.md。

## Acceptance and verification

- Acceptance criteria: 从当前已验收 main 独立分支；原 dirty checkout/index 保持；计划反映 Desktop/Web 真实入口并补齐项目包/unknown 迁移；新远端身份明确后仅同步可审阅范围。
- Tests: 以同目录 verification.md 本轮结果为准；未执行或未通过的门禁不得改写为通过。
- Runtime/UI evidence: 本次无 UI/runtime 变更，人工 Figma 对比不适用；仓库要求的完整 verify 仍执行。
- Regression surface: 文档/账本 schema、任务依赖与历史边界；没有应用行为变更。

## Risks and documentation

- Known risks or remaining PARTIAL / BLOCKED items: Astra 未实施；T5 运行态仍待验收；新目标仓库为 https://github.com/soudbs180-creator/KK-Studio-2.0，远端保护和 CI 未验收。
- Documentation updated: 计划、规则审计、Progress、Project State、Handoff、canonical ledger 与生成视图。
- Secrets or external credentials involved: none；不读取 provider key，不上传运行数据。
