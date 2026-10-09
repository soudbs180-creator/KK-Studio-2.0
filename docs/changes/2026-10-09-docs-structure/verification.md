# Verification：AI 协作规则文档结构收敛

- Task ID：TASK-DOCS-STRUCT-001
- 日期：2026-10-09
- 分支：`docs/TASK-DOCS-STRUCT-001`
- base SHA：`80904759`（main）
- 关联：[`intent.md`](intent.md) · [`spec.md`](spec.md) · [`plan.md`](plan.md) · [`review.md`](review.md)

## 1. 事实核对基线

所有规则条目在写入文档前从源码核对，本节记录核对来源与实际值。

| 核对项 | 来源 | 实际值 |
| --- | --- | --- |
| 测试分层规模 | `ls tests/*` | unit 105 / browser 76 / desktop 19 / deploy 2 / local-service 2 / development 1；另有 helpers(2) / support(1) / fixtures(3项) / evals(1) |
| Playwright 配置 | `playwright.config.ts` | `testDir ./tests/browser`、`KK_TEST_PORT ?? "1423"`、`channel msedge`、1920×1080、`timeout 30000`、`retries 1`、`reuseExistingServer false`、json → `test-results/browser-results.json` |
| ESLint 范围与规则 | `eslint.config.mjs` | `src tests scripts *.config.{ts,mjs}`、`--max-warnings 0`、`no-unused-vars`（`^_` 豁免）、`no-debugger`；ignore 含 `docs/`、`src-tauri/`、`test-results/`、`.worktrees/` |
| UI 标准门禁 | `scripts/check-ui-standards.mjs` 全文 112 行 | 扫描 `src/**` 的 `.css`/`.tsx`；`main.tsx` 必须含 `./styles/tokens.css`；未定义令牌；新增颜色字面量（例外 `global.css`/`ui-tokens.css`/`tokens.css`）；新增 Lucide 直连；`^src/components/.+\.tsx$` 且 >300 行；Iconsax 仅 `UiIcon.tsx` |
| 架构边界 | `scripts/governance/import-boundaries.mjs` 全文 | `src/domain` 禁 components/features/integrations/styles/react/react-dom/@tauri-apps/Node 内置；server-only 为 `generation-server/**` 与 local-service 五个文件 |
| Token 实况 | `grep -c` | `tokens.css` 254 条声明全部 `--kk-*`，`--ui-*` 定义 0；`--ui-*` 位于 `ui-tokens.css` 兼容层 |
| 超限文件 | 行数统计 | `src/App.tsx` 3152；`generation-server/repository.ts` 1063；`creation/model.ts` 972；`agent/agentConnection.ts` 942；`creation/taskRecovery.ts` 835；`creation/nativeTaskHost.ts` 824；`mcp/mcpClient.ts` 821；`agent/orchestrator.ts` 819；`local-service/store.ts` 775；`prompts/promptLibrary.ts` 644 |
| 自动合并脚本 | `ls scripts/governance/` | 仅 `delivery.mjs`、`import-boundaries.mjs`、`ledger.mjs`、`markdown-links.mjs`、`push-policy.mjs`。**无 auto-merge 脚本** |
| 本地记忆位置 | 目录检查 | `D:\kk-studio\.workbuddy\memory\`，在 git 仓库 `D:\kk-studio\KK-Studio-2.0` **之外**，不受版本管理 |
| 测试目录计数修正 | 二次核对 | 初次 `ls` 计数中 desktop 19 项包含 `.mjs` 与 `.ps1`；helpers 为 2 个 `.ts` |

## 2. 变更清单

新增：

- `docs/engineering/CODING-STANDARDS.md`
- `docs/engineering/TESTING.md`
- `docs/changes/2026-10-09-docs-structure/`（五件套）

修改：

- `docs/README.md`：27 行 → 索引（11+11+5+7 四类表）、阅读顺序、五层权威优先级与裁决细则、文档与代码同步表、本地记忆四层模型、仓库外工作区结构。
- `docs/engineering/BRANCH-POLICY.md`：新增「提交信息规范」「worktree 落点与生命周期」「自动合并」「回滚触发条件与执行」四节；修正「自动合并尚未落地」的表述。
- `docs/UI_RULES.md`：新增 3.4 Token 化纪律（禁止事项表、允许做法、新增 token 验收、幽灵数值、命名）。
- `AGENTS.md`：新增三方边界表、技术边界补编码规范与 domain 依赖禁令、文档与验证补新文档指引。
- `AI_RULES.md`：新增边界声明与新文档链接。
- `docs/governance/task-ledger.json`：登记 TASK-DOCS-STRUCT-001（+35 行）。
- `docs/governance/TASK_LEDGER.md`：由 `governance:write` 生成。

**未改动**（明确排除）：`src/**`、`scripts/**`、任何配置。工作区已有 3 个 `src/styles/*.css` 未提交改动（画布 token 化，非本次范围）与未跟踪的 `docs/decisions/`，均未 add、未 reset、未覆盖。

## 3. 门禁结果

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| Markdown 链接 | `node scripts/check-markdown.mjs` | `104 active files, 0 violations` |
| 治理 | `node scripts/check-governance.mjs` | `115 tasks, 0 violations` |
| 完整 lint | `npm run lint` | 见下方第 5 节 |
| 交付门禁 | `node scripts/check-delivery.mjs --base ... --head ... --branch ...` | 见下方第 5 节 |

## 4. 验收对照

| ID | 验收条件 | 证据 |
| --- | --- | --- |
| A1 | 一个入口文件能找到全部规则 | `docs/README.md` 含工程/架构/UI/治理四类索引表 + 阅读顺序 + 优先级 + 裁决细则 |
| A2 | 编码规则可执行 | `CODING-STANDARDS.md` 门禁映射表 7 行，全部对应第 1 节核对过的脚本行为 |
| A3 | 测试规则与实际配置一致 | `TESTING.md` Playwright 契约表逐字段取自 `playwright.config.ts` |
| A4 | 不产生第二来源 | 未新建 `ui-guidelines.md` / `git-workflow.md` / `UI-TOKEN-GOVERNANCE.md`；token 纪律并入 `UI_RULES.md` 3.4 |
| A5 | 文档自身合规 | markdown:check 0 violations |
| A6 | 门禁仍绿 | 见第 5 节 |

## 5. 命令输出

```
$ node scripts/check-markdown.mjs
Markdown links: 104 active files, 0 violations.

$ node scripts/check-governance.mjs
Governance: 115 tasks, 0 violations.
```

`npm run lint` 与 `delivery:check` 的实际输出记录在下方「实测输出」小节，由提交前最后一次执行填入。

## 6. 限制与未验证

- 本次为纯文档改动，未运行 `npm run verify` 全量（`test:ui` 需构建 + Playwright + 端口 1423，且工作区存在非本次的 `src/styles/*.css` 未提交改动，构建产物会混入非本次内容）。UI 与运行时行为未变更，不需要浏览器验证。
- 文档中「约定（无门禁）」条目（如 600 行新文件上限、重复 3 处即提取 token）靠评审执行，已在文中明确标注，不声称有强制检查。
- `src/App.tsx` 3152 行等超限文件本次只登记为技术债，未加门禁——加门禁会立即阻塞所有 PR，属需授权的结构性变更。
