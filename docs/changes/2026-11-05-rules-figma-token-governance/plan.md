# Plan — 规则体系重构与 Figma 全面同步 / 组件 Token 化（TASK-RULES-005）

1. **建立独立任务工作树**：从 `main@752f7dbd` 创建 `docs/TASK-RULES-005-figma-token-governance`（`D:/kk-studio/.worktrees/TASK-RULES-005`），不动主 checkout 并发改动；
2. **落地 `RULES.md` 与重构入口规则**：编写 `RULES.md`、重写主仓 `AGENTS.md` / `AI_RULES.md` / 容器 `AGENTS.md` / 4 个兼容入口，统一 `UNIFIED-PROJECT-RULES.md` 优先级引用；
3. **落地 `docs/FIGMA-SYNC.md` 与清理 `UI_INDEX.md`**：收敛单向同步协议、三层 Token 规范与组件 DoD，退役 `src/styles/tokens.json` 至 `docs/archive/ui-history/tokens-ardot-legacy.json`，修复 `tokens.css` 顶层未分层声明并执行 `npm run design:sync`；
4. **实现自动化门禁与测试**：实现 `scripts/check-rules.mjs`、`scripts/design-tokens/{naming,figma,check,cli}.mjs`、收紧 `scripts/check-ui-standards.mjs`，生成棘轮基线，补充 `tests/unit/rulesAndTokenGovernance.test.ts` 与 `tests/evals/agent-contract.json` 场景；
5. **登记账本与执行门禁验证**：更新 `task-ledger.json` 并生成 `TASK_LEDGER.md`，运行 `typecheck`、`lint`、`ui:check`、`tokens:check`、`rules:check` 与单测。
