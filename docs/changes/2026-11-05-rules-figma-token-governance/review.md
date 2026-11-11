# Review — 规则体系重构与 Figma 全面同步 / 组件 Token 化（TASK-RULES-005）

- **审查范围**：`main@752f7dbd...75e9ec70`（分支 `docs/TASK-RULES-005-figma-token-governance`，独立审查会话 `333075df-c41c-4a05-87fb-ac686f28ac09` 结论：**PASS**，P0=0 / P1=0 / P2=0）
- **核查项**：
  - `RULES.md` 是否遵循「禁止项优先、量化可验证、附理由、锁死版本、正反例、Checklist」且体积 ≤ 5KB：PASS；
  - `AGENTS.md` / `AI_RULES.md` / 容器 `AGENTS.md` 是否消除重复段落并全部编号化（50 个唯一规则 ID）：PASS（`npm run rules:check` 0 违规）；
  - `docs/FIGMA-SYNC.md`、`design/figma-component-map.json`、`scripts/design-tokens/*` 与 `scripts/check-ui-standards.mjs` 是否形成闭环棘轮门禁：PASS（`npm run tokens:check` 与 `npm run ui:check` 0 违规）；
  - 是否存在范围外顺手改动（`RULE-NO-DRIVEBY`）：PASS，全部变更文件均属规则、设计治理、门禁脚本与对应测试。
- **残余边界**：在线拉取 Figma Variables 需 Figma 桌面端选中 `91:2` 图层或提供 `FIGMA_TOKEN` 环境变量；首次拉取快照前，`design/figma-component-map.json` 种子条目诚实保持 `DESIGN_PENDING`。
