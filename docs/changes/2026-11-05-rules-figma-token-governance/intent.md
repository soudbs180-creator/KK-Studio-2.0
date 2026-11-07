# Intent — 规则体系重构与 Figma 全面同步 / 组件 Token 化（TASK-RULES-005）

- **用户目标**：
  1. 在根目录新增一份约 500 字、高密度、禁止项优先的 AI 铁律文件（`RULES.md`），用规则管住 AI 不乱改无关代码（`RULE-NO-DRIVEBY`）；
  2. 优化 `AGENTS.md`、`AI_RULES.md` 等全套规则文件，消除三处重复、两套优先级冲突与文档流程打架，引入可引用的规则编号；
  3. 设计规范全面同步 Figma，建立组件三层 Token 化体系（Primitive → Semantic → Component）、机械可逆命名与棘轮（Ratchet）门禁。
- **范围**：
  - 根规则与兼容入口：`RULES.md`（新增）、`AGENTS.md`、`AI_RULES.md`、`CLAUDE.md`、`GEMINI.md`、`.github/copilot-instructions.md`、`.cursor/rules/project.mdc`、容器层 `D:/kk-studio/AGENTS.md`；
  - 设计与治理规范：`docs/FIGMA-SYNC.md`（新增）、`docs/UI_INDEX.md`、`docs/DESIGN_TOKENS.md`、`docs/README.md`、`docs/governance/UNIFIED-PROJECT-RULES.md`；
  - Token 与门禁工具链：`scripts/design-tokens/{naming,figma,check,cli}.mjs`、`scripts/check-rules.mjs`、`scripts/check-ui-standards.mjs`、`design/figma-component-map.json`、`config/design-token-baseline.json`、`config/ui-legacy-baseline.json`、`config/repo-layout-rules.json`；
  - 历史来源退役：`src/styles/tokens.json` → `docs/archive/ui-history/tokens-ardot-legacy.json`，修复 `src/styles/tokens.css` 顶层未分层声明与颜色字面量。
- **非目标**：不触碰主 checkout 中并行任务的未提交业务代码；不在未取得 Figma 桌面端选中层或 `FIGMA_TOKEN` 时伪造在线拉取快照。
