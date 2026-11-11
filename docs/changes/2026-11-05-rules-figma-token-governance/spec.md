# Spec — 规则体系重构与 Figma 全面同步 / 组件 Token 化（TASK-RULES-005）

## 1. 根目录 AI 铁律卡片（`RULES.md`）

1. 遵循「禁止项优先、每条可量化可验证并附理由、写死技术栈版本号、明确作用域与例外、配正/反例与合并前 Checklist」六原则；
2. 5 条最高红线：`RULE-NO-DRIVEBY`（禁顺手改无关代码）、`RULE-NO-RAW-UI`（禁裸写 UI 数值与逆向回填 Figma）、`RULE-NO-CROSS-SLICE`（禁跨切片私有导入与领域层污染）、`RULE-NO-REINVENT`（禁重复造高复杂度轮子）、`RULE-NO-FAKE-PASS`（禁删减断言/上调基线/硬编码凭证）；
3. 4 条量化硬约束：`RULE-STACK-PIN`（Node `24` / TS `5.6.3` / React `18.3.1` / Vite `7.3.6` / Tauri `2.11.1` / Zod `4.6.7` / Playwright `1.63.0` / ESLint `10.10.0`，唯一锁文件 `package-lock.json`，端口 `1421`/`1423`）、`RULE-READ-FIRST`（先读实现与单测，单组件 ≤ `300` 行）、`RULE-COMP-TOKEN`（组件三层 Token 化与六态覆盖）、`RULE-WORKTREE-GATE`（分支复用、门禁全绿、即时合流）。

## 2. 规则体系去重与编号化

1. 主仓 `AGENTS.md`（`R-*`/`D-*`，≤ 12KB）、`AI_RULES.md`（`C-*`，≤ 8KB）、`RULES.md`（`RULE-*`，≤ 5KB）职责正交，严禁跨文件重复抄写长段落；
2. `docs/governance/UNIFIED-PROJECT-RULES.md` 移除自带优先级列表，统一路由至 `docs/README.md` §权威优先级与冲突裁决；
3. 变更文档统一按 `R-DOC-01` 分级：S 级（≤3 文件且无公共契约变化）免五件套，M/L 级建 `docs/changes/<date>-<task>/`；
4. `scripts/check-rules.mjs`（`npm run rules:check`）并入 `npm run lint`，自动检查文件体积上限、必填编号唯一性、跨文件重复段落、兼容入口路由。

## 3. Figma 同步管线与组件三层 Token 化（`docs/FIGMA-SYNC.md`）

1. **单向真值链**：`Figma 01 页 Variables → figma:audit:pull → tokens:export (design/tokens/figma.tokens.json) → tokens:css (src/styles/tokens.figma.css → tokens.css) → design:sync (DESIGN.md YAML) → 组件 CSS/TSX`；
2. **三层模型**：Tier 1 Primitive（仅限 `tokens*.css` 内部）→ Tier 2 Semantic（承载 dark/light 与强调色切换）→ Tier 3 Component（`--kk-<组件>-<部件>-<属性>[-<状态>]`，仅允许 `var()` 引用 Tier 2/1，禁止字面值）；
3. **机械可逆命名**：`scripts/design-tokens/naming.mjs` 将 `button/primary/bg/hover` 映射为 `--kk-button-primary-bg-hover`；
4. **组件映射表**：`design/figma-component-map.json` 登记稳定 ID、Figma `nodeId`、本地路径、Token 前缀与五态同步状态（`DESIGN_PENDING` → `FIGMA_READY` → `LOCAL_PENDING` → `SYNCED` → `RUNTIME_VERIFIED`）；
5. **棘轮门禁**：`npm run tokens:check` 与 `scripts/check-ui-standards.mjs`（取消 `global.css` 整体豁免、新增裸 `px` 声明棘轮）并入 `npm run ui:check`，存量只减不增。
