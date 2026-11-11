# RULES.md — KK Studio AI 铁律（开工必读）

> **执行步骤**：每次会话开工前必须先读本文件与 [`AGENTS.md`](AGENTS.md)，全程严格遵守。任何改动必须先确认边界，绝对禁止顺手改无关代码。

## 1. 绝对不做（最高红线 · 禁止项优先）

1. **[RULE-NO-DRIVEBY] 禁止“顺手优化/重构”无关代码**
   - **要求**：只允许修改当前任务（`task-ledger.json`）明确声明的目标文件；禁止格式化、重命名或清理任务范围外的文件。
   - **理由**：防止污染 git diff、引发合并冲突与隐式回归。
2. **[RULE-NO-RAW-UI] 禁止裸写 UI 数值与先改代码再补设计**
   - **要求**：严禁在业务 CSS/TSX 写死 Hex/RGB 颜色、裸 `px` 圆角/字号或直接消费 Tier 1 原始令牌；未在 Figma（`ZiadpErDoFweCjG3uHjkM3`）核验前禁止改本地 UI。
   - **理由**：保证 Figma 唯一设计真值与组件 100% Token 化（[`docs/FIGMA-SYNC.md`](docs/FIGMA-SYNC.md)）。
   - **反例**：`style={{ color: '#21a673', borderRadius: 8 }}` 或 `background: var(--kk-dark-1)`
   - **正例**：`background: var(--kk-button-primary-bg-hover); border-radius: var(--kk-radius-control);`
3. **[RULE-NO-CROSS-SLICE] 禁止跨切片私有导入与领域层污染**
   - **要求**：`src/domain/` 严禁导入 React/Tauri/外部 IO；`src/features/<A>` 严禁导入 `src/features/<B>` 的内部文件（只能经由 `index.ts`）。
   - **理由**：隔离修改爆炸半径，由 `import-boundaries.mjs` 强制阻断。
   - **反例**：`import { helper } from "../agent/internal/helper"`
   - **正例**：`import { createAgentPlan } from "@/features/agent"`
4. **[RULE-NO-REINVENT] 禁止手写高复杂度通用轮子与无依据加依赖**
   - **要求**：画布矩阵、流式解析、遮罩编辑等必须复用 `references/` 或成熟 MIT/Apache-2.0 开源库并经 Adapter 隔离；禁止引入 GPL/商业付费库或未经说明的依赖。
   - **理由**：降低维护负担与传染性协议风险。
5. **[RULE-NO-FAKE-PASS] 禁止弱化测试断言、伪造证据或硬编码凭证**
   - **要求**：禁止删减/跳过失败断言、调高棘轮基线（`*baseline.json`）来混过门禁；禁止将 API Key 写入代码、localStorage、日志或导出包。
   - **理由**：守住质量底线与用户凭证安全。

## 2. 必须做（量化硬约束）

1. **[RULE-STACK-PIN] 技术栈锁定版本（严禁写“最新版”或切换工具链）**
   - **运行时与构建**：Node `24`（`.nvmrc`） / TypeScript `5.6.3`（strict） / React `18.3.1` / Vite `7.3.6` / Tauri `2.11.1` / Zod `4.6.7` / Playwright `1.63.0` / ESLint `10.10.0`。
   - **包管理器**：唯一使用 `npm` + `package-lock.json`；**禁止**使用 `pnpm` / `yarn` / `bun`。
   - **开发端口**：主应用固定 `1421`（`strictPort: true`），设计预览固定 `1423`，禁止自动漂移端口。
2. **[RULE-READ-FIRST] 修改前必读现有实现、契约与测试**
   - **要求**：动代码前先读目标模块、`docs/features/feat-*.md` 与对应单测；单组件文件不得超过 `300` 行（超限按职责拆分）；删除或重命名已导出的公共类型/接口/存储 key 前必须提供兼容迁移。
3. **[RULE-COMP-TOKEN] 新增/修改 UI 组件必须完成三层 Token 化**
   - **要求**：在 [`design/figma-component-map.json`](design/figma-component-map.json) 登记 Figma `nodeId` 与本地路径，通过 Tier 2（语义）或 Tier 3（`--kk-<组件>-<部件>-<属性>-<状态>`）消费样式，覆盖 default/hover/active/selected/disabled/focus 六态。
4. **[RULE-WORKTREE-GATE] 分支复用、门禁全绿、即时合流**
   - **要求**：先查 `git worktree list` 复用已有分支；改动后必须跑通：
     - 快速门禁：`npm run typecheck && npm run lint && npm test`
     - UI 门禁：`npm run ui:check && npm run tokens:check`
     - 规则自检：`npm run rules:check`
   - 验证通过后立即合入 `main` 并回收临时 worktree，禁止孤立分支长期悬挂。

## 3. 作用域与例外

- **严格生效域**：`src/`、`src-tauri/`、`packages/`、`vendor/`、`tests/`、`scripts/`、`design/`、`config/`。
- **例外域**：`docs/archive/`、`docs/changes/` 历史证据包（只读不改，勘误用新记录追加）；`.tmp/`（临时调试，禁止入库）。

## 4. 合并前红线检查清单（Checklist）

- [ ] **范围纯净**：`git diff --name-only` 100% 在当前任务声明范围内，零“顺手改动”。
- [ ] **零裸写 UI**：无新增 Hex/RGB、无新增裸 `px`、无 Tier 1 泄漏，`tokens:check` 与 `ui:check` 全绿。
- [ ] **边界合法**：`src/domain/` 零框架依赖、跨 feature 零私有导入、单组件 ≤ 300 行。
- [ ] **真实通过**：`typecheck` / `lint` / `test` / `rules:check` 真实跑通，未删断言、未上调基线。
