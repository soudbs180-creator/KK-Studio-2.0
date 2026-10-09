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
| TS 规则实测 | `npx eslint` 探针 | `any` 报 `@typescript-eslint/no-explicit-any`（exit 1）；`// @ts-ignore` 报 `ban-ts-comment`（exit 1）；`as unknown as` 与 `import type` **不报**（`no-unnecessary-type-assertion` / `consistent-type-imports` 未启用）；`catch {}` 报 `no-empty`（exit 1） |
| ESLint 实际 `files` | `eslint.config.mjs` | `src/**/*.{ts,tsx}`、`tests/**/*.ts`、`scripts/**/*.mjs`、`*.config.{ts,mjs}`。**`tests/` 下 `.mjs`/`.ps1` 与任何目录的 `.tsx` 不被覆盖**（实测见下） |
| 令牌门禁边界 | `src/styles/__probe.css` 定义新 token | `ui:check` 仍 0 违规 → 门禁**不校验定义位置**，只校验 `var()` 引用是否已定义 |
| UI 标准门禁 | `scripts/check-ui-standards.mjs` 全文 111 行 | 扫描 `src/**` 的 `.css`/`.tsx`（实测 214 文件）；`main.tsx` 必须含 `./styles/tokens.css`；未定义令牌；新增颜色字面量（例外 `global.css`/`ui-tokens.css`/`tokens.css`）；新增 Lucide 直连；`^src/components/.+\.tsx$` 且 >300 行；Iconsax 仅 `UiIcon.tsx` |
| 架构边界 | `scripts/governance/import-boundaries.mjs` 全文 | `src/domain` 禁 components/features/integrations/styles/react/react-dom/@tauri-apps/Node 内置；**禁令列表不含 `runtime`**；server-only 为 `generation-server/**` 与 local-service 五个文件 |
| 实际依赖边 | `grep -rn` 统计 | `components → features` **178 处 / 101 文件**、`components → runtime` **7 处**、`domain → runtime` 2 处（`modelProvider.ts`、`settings.ts`）。`components ⇄ features` 为双向。**依赖方向表已按此实测数据重写** |
| Token 实况 | `grep -c` | `tokens.css` 254 条声明全部 `--kk-*`，`--ui-*` 定义 **0**；`--ui-*` 实际定义在 `ui-tokens.css`（127 条）与 `responsive-content.css` |
| baseline 台账 | `node` 读取 `config/ui-legacy-baseline.json` | 19 个文件、28 个颜色键、46 个 Lucide 符号、13 个文件含 Lucide |
| 超限文件 | Node 脚本按门禁同口径（`trimEnd().split(/\r?\n/).length`）统计 | `src/` 下 `.ts`/`.tsx` 超 300 行共 **32 个，被门禁覆盖 0 个**。前十：`App.tsx` 3152、`generation-server/repository.ts` 1063、`creation/model.ts` 972、`agent/agentConnection.ts` 942、`creation/taskRecovery.ts` 835、`creation/nativeTaskHost.ts` 824、`mcp/mcpClient.ts` 821、`agent/orchestrator.ts` 819、`local-service/store.ts` 775、`prompts/promptLibrary.ts` 644 |
| 自动合并脚本 | `ls scripts/governance/` | 仅 `delivery.mjs`、`import-boundaries.mjs`、`ledger.mjs`、`markdown-links.mjs`、`push-policy.mjs`。**无 auto-merge 脚本** |
| 本地记忆位置 | 目录检查 | `D:\kk-studio\.workbuddy\memory\`，在 git 仓库 `D:\kk-studio\KK-Studio-2.0` **之外**，不受版本管理 |
| worktree 数量 | `git worktree list \| wc -l` | **47**（含主仓）。此前记录的「83」为旧口径，未复核 |
| 治理文档重复章节 | 章节名比对 | `PROJECT_STATE.md` 与 `AI_HANDOFF.md` 精确 36 个同名二级章节 |
| 测试目录计数修正 | 二次核对 | 初次 `ls` 计数中 desktop 19 项包含 `.mjs` 与 `.ps1`；helpers 为 2 个 `.ts` |
| evidence 现状 | 目录检查 | `docs/evidence/` 约 80 个条目不符 `YYYY-MM-DD-<主题>/` 模式（含裸 `.png`/`.json`/`.txt`），索引已改为「约定 + 尚未迁移」 |
| `docs/decisions/` | `git ls-tree HEAD` | **未入库**，仅本地未跟踪。已从 `README.md` 目录索引移除 |

## 2. 变更清单

新增：

- `docs/engineering/CODING-STANDARDS.md`
- `docs/engineering/TESTING.md`
- `docs/changes/2026-10-09-docs-structure/`（五件套）

修改：

- `docs/README.md`：26 行 → 索引（工程 11、架构 5 份文档 + `adr/` 目录、UI 5、治理 7 四类表）、阅读顺序、五层权威优先级与裁决细则、文档与代码同步表、本地记忆四层模型、仓库外工作区结构。
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
| 完整 lint | `npm run lint` | exit 0 |
| 交付门禁 | `node scripts/check-delivery.mjs --base <base> --head <head> --branch docs/TASK-DOCS-STRUCT-001` | `Delivery: 15 files; 0 violations`，exit 0 |

## 4. 验收对照

| ID | 验收条件 | 证据 |
| --- | --- | --- |
| A1 | 一个入口文件能找到全部规则 | `docs/README.md` 含工程/架构/UI/治理四类索引表 + 阅读顺序 + 优先级 + 裁决细则 |
| A2 | 编码规则可执行 | `CODING-STANDARDS.md` 门禁映射表逐行对应第 1 节核对过的脚本行为 |
| A3 | 测试规则与实际配置一致 | `TESTING.md` Playwright 契约表逐字段取自 `playwright.config.ts` |
| A4 | 不产生第二来源 | 未新建 `ui-guidelines.md` / `git-workflow.md` / `UI-TOKEN-GOVERNANCE.md`；token 纪律并入 `UI_RULES.md` 3.4 |
| A5 | 文档自身合规 | markdown:check 0 violations |
| A6 | 门禁仍绿 | 见第 5 节 |

## 5. 实测输出

```
$ node scripts/check-markdown.mjs
Markdown links: 104 active files, 0 violations. File targets only; not historical snapshots or external URLs.
exit 0

$ node scripts/check-governance.mjs
Governance: 115 tasks, 0 violations.
exit 0

$ npm run lint
> eslint src tests scripts *.config.{ts,mjs} --max-warnings 0
> node scripts/platform-versions.mjs check
Platform versions are consistent.
> node scripts/check-project-goals.mjs
Project goals: valid.
> node scripts/check-governance.mjs
Governance: 115 tasks, 0 violations.
> node scripts/check-features.mjs
Features: 35 features, 0 violations.
> node scripts/check-markdown.mjs
Markdown links: 104 active files, 0 violations.
exit 0

$ node scripts/check-delivery.mjs --base 8090475958f1a0bdd1b4b36ada7f2aba1e4e6264 \
    --head <head> --branch docs/TASK-DOCS-STRUCT-001
Delivery: 15 files; 0 violations. Structure only; not proof of review quality.
exit 0
```

补充验证（独立 reviewer 要求补做）：

```
$ printf 'const __unusedProbe = 1;\nexport const x = 2;\n' > tests/desktop/__probe.mjs
$ npx eslint tests/desktop/__probe.mjs
exit 0（无任何输出 → 未被检查，确认 .mjs 测试文件不受 ESLint 约束）
```

## 6. 限制与未验证

- 本次为纯文档改动，未运行 `npm run verify` 全量（`test:ui` 需构建 + Playwright + 端口 1423，且工作区存在非本次的 `src/styles/*.css` 未提交改动，构建产物会混入非本次内容）。UI 与运行时行为未变更，不需要浏览器验证。
- `verify` 的 8 步不包含 Rust/cargo、`tests/desktop/`、`tests/local-service/`；本次未涉及，不补跑。
- `docs/changes/` 目录不在 `markdown-links.mjs` 的 `activeDirectories` 内，因此第 5 节第一条门禁**不覆盖本交付包的 5 个文件**。已按同规则独立校验其相对链接，0 missing；结论成立但证据来自独立补验，非门禁。
- 文档中「约定（无门禁）」条目已逐节标注；`CODING-STANDARDS.md` 的命名规范、组件化与复用、状态与数据流、TypeScript 四节以及错误处理的多数条目均无脚本支撑，只靠评审执行。
- `src/App.tsx` 3152 行等超限文件本次只登记为技术债，未加门禁——加门禁会立即阻塞所有 PR，属需授权的结构性变更。

