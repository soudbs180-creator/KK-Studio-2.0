# Spec：规则入口、分支依赖与 Markdown 检查

- Task ID：TASK-RULES-004
- 状态：IMPLEMENTED；第三轮独立复审通过，Hosted CI 因账户计费阻断
- 日期：2026-09-23
- 来源：[intent](intent.md)、[任务账本](../../governance/task-ledger.json)
- 规范基线：[AGENTS](../../../AGENTS.md)、[AI_RULES](../../../AI_RULES.md)、[分支规则](../../engineering/BRANCH-POLICY.md)、[设计系统](../../DESIGN-SYSTEM.md)

## 规则归属

- `AGENTS.md` 和 `AI_RULES.md` 是 AI 共同入口，工具专属入口只转发；不能证明模型实际阅读或理解。
- `docs/governance/task-ledger.json` 决定任务状态、依赖和分支归属；`docs/features/features.registry.json` 决定功能能力状态。生成视图不得手改。
- `docs/DESIGN-SYSTEM.md` 决定现行颜色、字阶和基础组件；Figma 依据页面布局与资产。历史文件中的“当前”只反映其当时的快照。
- `origin/main` 是唯一稳定集成线。依赖未合并 PR 的任务可短期堆叠；上下游都必须独立检查，最终目标仍是 main。远端分支删除需单独经过现有钩子允许的审阅流程，不以“已授权”跳过防线。

## 可执行检查

`scripts/check-markdown.mjs` 枚举根规则入口、`docs/` 当前索引及 architecture/engineering/features/governance/templates 的直接 Markdown 文件（含 architecture/adr）。使用 `remark-parse`、`remark-gfm` 与 `unified` 解析语法树，提取链接、图片和参考链接定义，再校验相对文件目标及其是否留在仓库内；代码块、行内代码和转义文字由解析器按 Markdown 语义排除。同页锚点、绝对路径和外部 URL 不检查。它检查文件目标是否存在，不检查锚点内容、外部 URL 可用性、历史 `docs/changes`/`docs/evidence`/`docs/archive` 或文档事实语义。历史快照仍需按用途人工核对，不因未纳入 lint 而视为正确。

检查接入 `npm run markdown:check` 与 `npm run lint`，因此进入 `npm run verify` 和 hosted `verify` 的定义；是否实际执行以本地/远端结果为准。Markdown 整体 Prettier 格式不在 `format:check` 范围，修改文件另以差异和链接检查核对。

本任务不改变应用数据、凭据、产品运行时、桌面包或发布流程；无需 ADR。PR #9 是本分支上游，交付 PR 先以该任务分支为 base，上游合入后按分支规则重新对齐 main。
