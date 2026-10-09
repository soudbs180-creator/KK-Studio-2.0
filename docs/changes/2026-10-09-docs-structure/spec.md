# Spec：AI 协作规则文档结构收敛

- Task ID：TASK-DOCS-STRUCT-001
- 日期：2026-10-09
- 关联：[`intent.md`](intent.md) · [`plan.md`](plan.md) · [`verification.md`](verification.md) · [`review.md`](review.md)

## 1. 文档分层与承载划分

原则：**一件事只有一处定义**。汇总文件只索引与裁决，不承载第二份内容。

| 层 | 文件 | 承载 |不承载 |
| --- | --- | --- | --- |
| L0 | `AGENTS.md` | 技术边界、数据安全、UI 门禁、Git/交付硬约束 | 协作流程细节 |
| L0' | `AI_RULES.md` | 用户与 AI 分工、事实纪律、审核交付流程 | 技术参数、命令清单 |
| L1 | `docs/README.md` | 索引、权威优先级、冲突裁决、本地记忆模型 | 具体规则正文 |
| L2 | `docs/engineering/*.md` | SDLC / CODING-STANDARDS / TESTING / DEVELOPMENT / BRANCH-POLICY / REVIEW / PROMPTING / AI-EVALS / VERSIONING / LAUNCHER / WINDOWS-INSTALLER | — |
| L2 | `docs/architecture/*.md` + `adr/` | 架构、数据存储、数据分级、决策记录 | — |
| L2 | `docs/UI_INDEX.md` 指向的 5 份 | UI 零件/页面/数值/颜色/验证 | — |
| L2 | `docs/governance/*.md` | 当前事实、账本、目标、已知问题、交接 | feature evidence |
| L3 | `docs/changes/` `docs/features/` `docs/evidence/` `docs/archive/` | 交付包、功能卡、证据、历史 | 现行规则 |

## 2. 权威优先级

1. 当前用户意图（决定产品目标）
2. `AGENTS.md`
3. `AI_RULES.md`
4. 专项规范（各领域唯一来源）
5. `src/` 实际代码与运行证据

裁决细则：代码与规范冲突不默认以代码为准；同层级冲突按承载划分删除重复处并补链接；派生视图（`TASK_LEDGER.md`、`features/README.md`）不承载第二份事实；`archive/` 不参与裁决。

## 3. 缺口判定

评估初拟的 6 份文档后逐份核对实际内容：

| 初拟 | 实际情况 | 裁决 |
| --- | --- | --- |
| `AGENTS.md` | 已存在，75 行 9 章节，内容充实 | 保留，升级为 L0唯一入口 |
| `docs/architecture.md` | 已有 `architecture/ARCHITECTURE.md` | 不新建，纳入索引 |
| `docs/ui-guidelines.md` | UI 规范已有成熟唯一承载机制（`UI_INDEX.md`） | **不新建**，会制造第二来源 |
| `docs/coding-standards.md` | **不存在**，真实缺口 | 新建 `engineering/CODING-STANDARDS.md` |
| `docs/git-workflow.md` | 已有 `engineering/BRANCH-POLICY.md` 63 行 5 章节 | **不新建**，改为补缺口 |
| `docs/testing.md` | **不存在**，真实缺口 | 新建 `engineering/TESTING.md` |

命名裁决：工程文档主要使用 UPPER-CASE.kebab（`BRANCH-POLICY.md`、`UI_RULES.md`、`DESIGN_TOKENS.md`），不引入第二套 kebab-case 小写风格。

## 4. CODING-STANDARDS 规格

每条规则必须绑定真实门禁。已核对：

- `eslint src tests scripts *.config.{ts,mjs} --max-warnings 0`，`no-unused-vars`（`^_` 豁免）、`no-debugger`
- `scripts/check-ui-standards.mjs`：扫描 `src/**` 全部 `.css`/`.tsx`；`main.tsx` 必须加载 `./styles/tokens.css`；未定义令牌；新增颜色字面量（例外 `global.css`/`ui-tokens.css`/`tokens.css`）；新增 Lucide 直连；`^src/components/.+\.tsx$` 且 >300 行；Iconsax 绕过 `UiIcon`
- `scripts/governance/import-boundaries.mjs`：`src/domain` 禁依赖 components/features/integrations/styles/react/react-dom/@tauri-apps/node 内置；`src/features/generation-server/**` 与 local-service五个 server 文件为 server-only
- 存量超限文件：门禁规则不覆盖 `src/App.tsx`（3152 行）与 `src/features/**` 的 `.ts` 大文件，标为已知技术债并列入表格，靠评审约束

## 5. TESTING 规格

分层落点（实测数量）：unit 105 / browser 76 / desktop 19 / deploy 2 / local-service 2 / development 1，另有 helpers / support / fixtures / evals。

Playwright 契约逐字段取自 `playwright.config.ts`：`testDir ./tests/browser`、`KK_TEST_PORT ?? "1423"`、Edge channel、1920×1080、timeout 30000、retries 1、`reuseExistingServer: false`、json reporter 落`test-results/browser-results.json`。

关键纪律：`retries: 1` 不得掩盖失败，首次失败即缺陷信号；端口被占用先清理占用进程，不得改随机端口或开`reuseExistingServer`；测试产物不得写入 `docs/`；需清理输出时用独立临时目录而非清空共享 `test-results/`。

## 6. BRANCH-POLICY 补充规格

新增四节：提交信息规范（Conventional Commits 中文）、worktree 落点与生命周期、自动合并现状、回滚触发条件与执行。

**自动合并的诚实结论**：仓库内 `scripts/governance/` 只有 `delivery.mjs`、`import-boundaries.mjs`、`ledger.mjs`、`markdown-links.mjs`、`push-policy.mjs`，无 auto-merge 脚本。文档按实际写「尚未落地」并说明阻塞原因（固定端口串行验证），不得声称已生效。

## 7. UI Token 化裁决

不新建 `UI-TOKEN-GOVERNANCE.md`。理由：`UI_RULES.md` 3.1–3.3 已承载唯一来源与封闭尺寸轴，另建即违反「一件事只有一处定义」。改为在 `UI_RULES.md` 新增 3.4 Token 化纪律，只补缺失维度：禁止事项表（对应门禁报错原文）、允许做法、新增 token 验收要求、幽灵数值、命名规则。

实测：`tokens.css` 254 条声明全部为 `--kk-*`，无 `--ui-*` 定义；`--ui-*` 位于 `ui-tokens.css` 兼容层。

## 8. 约束

- 文档改动同样受门禁：markdown 链接、账本同步、交付包完整。
- 不手改生成文件：`TASK_LEDGER.md`、`features/README.md`。
- 工作区已有 4 个 `src/styles/*.css` 未提交改动（画布 token 化，非本次范围），严格不add、不reset、不覆盖。

## 9. 未决与后续

以下均需用户单独授权，不在本次范围：治理文档 36 个重复章节瘦身、47 个注册 worktree 收敛、`docs/changes` 大文件处理、`output/` 嵌套仓库归置、画布 token 化遗留（3 个 CSS + `decisions/0001`）、`src/App.tsx` 3152 行是否纳入自动门禁、三个受凭据阻塞分支的推送。
