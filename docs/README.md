# 文档入口

所有 AI 的共同规则见根目录 [AI_RULES.md](../AI_RULES.md) 与 [AGENTS.md](../AGENTS.md)。Claude/Gemini/Copilot/Cursor 入口仅引用共同规则；其他工具需要先加载这两份文件。

- [SDLC](engineering/SDLC.md)：AI 自主开发、风险分级、产物链和维护。
- [PROMPTING](engineering/PROMPTING.md)：用户口语转工程任务。
- [BRANCH-POLICY](engineering/BRANCH-POLICY.md)：多设备拉取、PR、合并完整性和版本收敛。
- [REVIEW](engineering/REVIEW.md)：独立审核、当前 SHA、阻断问题。
- [AI-EVALS](engineering/AI-EVALS.md)：规则回归和实际强制层的边界。

KK Studio 的文档按用途分层，当前工程的事实以代码、Figma 和验证记录为准。

- `architecture/`：运行时架构、数据存储和数据分级。
- [`architecture/LEGACY-MIGRATION.md`](architecture/LEGACY-MIGRATION.md)：旧工程能力的 keep/migrate/rebuild/reject 清单和 ProjectGraph 导入边界。
- `engineering/`：开发命令、AI-native SDLC 和评审规则。
- `changes/`：一次可审计的需求交付包，包含 intent、spec、plan、verification、review。
- `templates/`：后续需求使用的文档模板。
- `reference/`：Figma、截图和外部参考的索引。
- `archive/`：整合前进度和历史材料，只读保存，不作为当前状态。
- `governance/`：项目级当前状态、规范索引、任务账本、已知问题和 AI 交接；不重复 feature change evidence。
- [`UI_INDEX.md`](UI_INDEX.md)：**UI 规范唯一入口**（现行文件分层、冲突裁决、新增功能改病例）。具体分工见该文件的索引表：
  [`UI_RULES.md`](UI_RULES.md) 零件与交互规则 · [`UI_ARCHETYPES.md`](UI_ARCHETYPES.md) 页面类型 ·
  [`DESIGN_TOKENS.md`](DESIGN_TOKENS.md) 数值 · [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) 颜色与基础组件 ·
  [`UI_SPEC.md`](UI_SPEC.md) 运行与验证。`UI-STANDARDS.md` / `UI-ALIGNMENT.md` 已合并，历史正文在 `archive/ui-history/`。

任务状态权威是 [`task-ledger.json`](governance/task-ledger.json)，当前项目事实入口是 [`PROJECT_STATE.md`](governance/PROJECT_STATE.md)。[`PROGRESS.md`](PROGRESS.md) 保存迭代记录；新功能在合并前同步这三类各自适用的信息，不能用旧进度摘要覆盖账本当前状态。
