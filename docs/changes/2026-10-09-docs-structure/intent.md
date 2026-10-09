# Intent：收敛 AI 协作规则文档结构

- Task ID：TASK-DOCS-STRUCT-001
- 状态：IMPLEMENTED
- 日期与提出者：2026-10-09，用户明确批准「开始把」
- 请求来源：用户先要求「为该项目编写一份完整的工程规范文档（AGENTS.md / 项目规范文档）」，随后给出 6 份文档的初拟结构并要求评估优化，最后批准执行。
- 用户授权范围与依据：用户说「开始把」，授权按已评估方案落地文档结构优化。授权限于文档层，不含代码重构、治理瘦身、worktree 收敛。
- 关联账本、spec、plan：[`docs/README.md`](../../README.md) 索引与优先级；本目录 `spec.md` / `plan.md` / `verification.md` / `review.md`

## 用户原意

用户的核心抱怨是「文档太多也很混乱」「快速了解项目」「保证指哪打哪的修改」。用户先自己拟了一套 6 份文档的结构让评估，评估结论是方向对但 4 份已存在实质内容，应收敛而非新建。用户批准后要求执行。

用户先前明确的两条底线在本次执行中继续有效：改动要精准、「指哪打哪」，不做无关大范围重写。

## AI 工程转译

目标：让接手者能通过单一入口在5 分钟内定位任意规则，并保证每条规则都能对应到可执行门禁或明确的评审约定。

具体动作：
1. 把 `docs/README.md` 从 26 行的散列升级为完整索引 + 五层权威优先级 + 冲突裁决细则 + 本地记忆四层模型。
2. 补齐真实缺口文档 `docs/engineering/CODING-STANDARDS.md` 与 `docs/engineering/TESTING.md`。
3. 补 `BRANCH-POLICY.md` 的四个真实缺口：提交信息规范、worktree 落点与生命周期、自动合并现状、回滚触发条件。
4. 在 `UI_RULES.md` 补 3.4 Token 化纪律，不新建第六份 UI 文档。
5. 明确 `AGENTS.md` / `AI_RULES.md` / `docs/README.md` 三者边界。

## 目标与非目标

- 预期结果：文档结构收敛，缺口补齐，规则与实际门禁一一对应。
- 包含范围：docs/ 下的规范文档、AGENTS.md、AI_RULES.md。
- 明确不包含：
  - 不新建 `ui-guidelines.md` 与 `git-workflow.md`（内容已存在，另建即制造第二来源）。
  - 不瘦身在 `PROJECT_STATE.md` 与 `AI_HANDOFF.md` 中的 36 个重复章节——影响面大，需单独授权。
  - 不治理 47 个注册 worktree（`git worktree list` 实测，另有多处已删除磁盘目录的历史残留）；不移除 `docs/changes` 中已跟踪的 760 PNG 与 108 log；不处理 `output/` 下 5 个外部嵌套仓库；不处理画布 token 化遗留。
  - 不改动任何 `src/` 或 `scripts/` 代码。会话开始时工作区有 3 个未提交的 `src/styles/*.css` 改动（`canvas-navigation.css`、`ui-tokens.css`、`workspace.css`，属画布 token 化，非本次范围），本次严格避开不add、不reset、不覆盖。
- 受影响平台/模块：仅文档层。
- 已有实现和规范来源：`scripts/check-ui-standards.mjs`、`scripts/governance/import-boundaries.mjs`、`playwright.config.ts`、`eslint.config.mjs`、`package.json`。

## 验收条件

| ID   | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| --- | --- | --- | --- |
| A1 | 一个入口文件能找到全部规则 | `docs/README.md` 含四类索引表 + 优先级 + 裁决细则 | 全部 |
| A2 | 编码规则可执行，不空泛 | `CODING-STANDARDS.md` 门禁表每行对应实际脚本行为，已逐条核对源码 | 全部 |
| A3 | 测试规则与实际配置一致 | `TESTING.md` 的 Playwright 参数与 `playwright.config.ts`逐字段一致 | 全部 |
| A4 | 不产生第二来源 | 未新建 `ui-guidelines.md` / `git-workflow.md` / `UI-TOKEN-GOVERNANCE.md` | 全部 |
| A5 | 文档自身合规 | `npm run markdown:check` 0 violations | 全部 |
| A6 | 门禁仍绿 | `npm run lint` exit 0 | 全部 |

## 非范围确认

本次只改文档。若用户在后续单独授权，才处理治理文档瘦身、worktree 收敛与大文件拆分。
