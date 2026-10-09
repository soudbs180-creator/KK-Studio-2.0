# Plan：AI 协作规则文档结构收敛

- Task ID：TASK-DOCS-STRUCT-001
- 日期：2026-10-09
- 分支：`docs/TASK-DOCS-STRUCT-001`
- 关联：[`intent.md`](intent.md) · [`spec.md`](spec.md) · [`verification.md`](verification.md) · [`review.md`](review.md)

## 步骤与依据

| # | 动作 | 依据 | 状态 |
| --- | --- | --- | --- |
| 1 | 读取现有 `docs/README.md`，确认不能简单覆盖 | 保留已有链接与内容 | 完成 |
| 2 | 核对 `src/` 六个一级目录与组件规模 | 依赖方向规则需对齐真实结构 | 完成 |
| 3 | 读 `scripts/check-ui-standards.mjs` 全文 | 提取门禁报错原文，不凭记忆写规则 | 完成 |
| 4 | 读 `scripts/governance/import-boundaries.mjs` 全文 | 同上 | 完成 |
| 5 | 读 `playwright.config.ts`、`eslint.config.mjs`、`package.json` scripts | TESTING 的参数必须逐字段一致 | 完成 |
| 6 | 实测 tests 各层文件数、`tokens.css` 令牌数 | 文档数字必须为实测值 | 完成 |
| 7 | 核对 `UI_RULES.md` 3.1–3.3 与 `UI_INDEX.md` 分工 | 判断是否需要新建 token 文档 → 结论不需要 | 完成 |
| 8 | 建分支 `docs/TASK-DOCS-STRUCT-001` | BRANCH-POLICY 分支规范 | 完成 |
| 9 | 新建 `engineering/CODING-STANDARDS.md` | 真实缺口 | 完成 |
| 10 | 新建 `engineering/TESTING.md` | 真实缺口 | 完成 |
| 11 | 扩写 `docs/README.md` 为索引 + 优先级 + 裁决 + 记忆模型 | 用户「快速了解项目」诉求 | 完成 |
| 12 | `BRANCH-POLICY.md` 补四节 | 真实缺口 | 完成 |
| 13 | `UI_RULES.md` 加 3.4 Token 化纪律 | 补缺失维度，不新建文档 | 完成 |
| 14 | `AGENTS.md` 加三方边界表与新文档指引 | 消除 AGENTS/AI_RULES 双总规则 | 完成 |
| 15 | `AI_RULES.md` 加边界声明与新文档链接 | 同上 | 完成 |
| 16 | 建交付包五件套 | 交付门禁 | 完成 |
| 17 | 账本登记 + `governance:write` | 账本门禁 | 完成 |
| 18 | 跑 lint / markdown:check / delivery:check | 验收 | 见 verification |

## 关键决策

1. **不新建 `ui-guidelines.md` 与 `git-workflow.md`**：内容已存在于 `UI_RULES.md` 系列与 `BRANCH-POLICY.md`，另建即制造第二来源。
2. **不新建 `UI-TOKEN-GOVERNANCE.md`**：`UI_RULES.md` 3.1–3.3 已承载唯一来源与尺寸轴，改为加 3.4 补「怎么用」。
3. **自动合并按实际写「未落地」**：核对 `scripts/governance/` 后确认无该脚本，修正文档中此前不准确的表述。这比补一个脚本更符合「不谎报」。
4. **`src/App.tsx` 3152 行不新增门禁**：加门禁会立刻让 `ui:check` 失败并阻塞所有 PR，属于需授权的结构性变更。本次在 `CODING-STANDARDS.md` 中列为已知技术债并说明评审约束。

## 风险与规避

| 风险 | 规避 |
| --- | --- |
| 工作区有 4 个 `src/styles/*.css` 未提交改动 | 只 `git add` 明确的文档文件；不 reset、不clean、不 checkout覆盖 |
| 文档与实际门禁不符 | 每条规则都从脚本源码提取报错原文，不凭记忆 |
| 引入断链 | 每批改动后跑 `check-markdown.mjs`；跨仓库引用写纯文本路径 |
| 重复定义 | 每份新文档先检查是否已有承载者，确认后才动手 |

## 回滚

纯文档改动，回滚成本低：删除新增的两份文档并 `git checkout -- docs/README.md docs/engineering/BRANCH-POLICY.md docs/UI_RULES.md AGENTS.md AI_RULES.md`。
