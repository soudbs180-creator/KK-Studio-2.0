# 开发协作流程实施计划

- Task ID：`TASK-DOCS-STRUCT-001`（延续现有治理任务，避免重复建卡）
- 状态：IMPLEMENTED AND VERIFIED（文档、治理隔离、验证和账本状态均已同步）
- 日期：2026-10-10
- Intent / Spec：用户当前请求；[`2026-10-10-development-workflow-design.md`](../specs/2026-10-10-development-workflow-design.md)
- Owner / branch / worktree：root；当前工作树 `D:\kk-studio\KK-Studio-2.0`，只修改治理文档
- Base / HEAD SHA：实施基线曾为 `b7c7266e`；共享工作树经并发提交推进到 `8933692e`，独立 review 已按当前 exact HEAD 重跑，未将并发提交误归入本任务
- Git dirty/index 状态、并行任务与文件归属：根工作树已有并发中的 Tauri 源码、secret_filter 和统一协议 change package 改动；本计划不触碰这些文件，也不覆盖既有治理审计改动

## 目标和完成门槛

把已通过的设计落成一个单一入口和一组可复用模板，使任务可以按“待领取 → 进行中 → 待复核 → 已完成”，或在必要时进入“阻塞/回归”推进。完成前必须通过文档/治理门禁，更新账本和变更包，并明确当前源码脏状态造成的验证限制。

## 开工证据

- 已读取：`AGENTS.md`、`AI_RULES.md`、`docs/README.md`、`docs/engineering/SDLC.md`、`BRANCH-POLICY.md`、`REVIEW.md`、`TESTING.md`、`WORKTREE-LIFECYCLE.md`、`docs/reference/competitor/INDEX.md` 及现有模板。
- 权威来源：`docs/governance/task-ledger.json`；生成视图 `TASK_LEDGER.md` 不手改。
- 已知并发状态：产品源码和 Tauri 配置存在未提交变更，不能运行会覆盖或重置工作树的操作；重新生成的 `pnpm-lock.yaml` 已按 SHA 移出主 checkout，npm/package-lock 仍是唯一受支持锁文件。
- 工具约束：优先使用项目脚本；若 npm 不在 PATH，使用已配置的 bundled Node 直接运行对应 `scripts/*.mjs`，在验证记录中注明。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | `docs/governance/task-ledger.json`、change package | 核对并延续既有 `TASK-DOCS-STRUCT-001`；追加本次范围、验收、证据和当前状态 | 现有账本结构与唯一 ID | JSON 解析；`ledger` 检查；生成视图 |
| 2 | `docs/engineering/DEVELOPMENT-WORKFLOW.md` | 新增日常入口：领取门禁、需求/AC 确认、状态流转、成果说明、阻塞/回归、根因闭环、竞品节奏和完成标准 | 设计说明 | Markdown 检查；逐项对照 spec |
| 3 | `docs/templates/intent.md`、`plan.md` | 加入需求确认、领取证据、依赖/文件归属、状态流转和开发笔记字段 | 步骤 2 的入口术语 | 模板字段与流程表一致；相对链接检查 |
| 4 | `docs/templates/verification.md`、`review.md`、`incident.md` | 加入自查、边界/恢复、成果摘要、根因复测和防复发提示 | 步骤 2 的验证语义 | 失败/未验证语义抽查；Markdown 检查 |
| 5 | `docs/README.md`、`docs/engineering/SDLC.md`、必要时 `docs/reference/competitor/INDEX.md`、`docs/PROGRESS.md` | 加入口链接和单一归属说明，避免新规则孤立或与旧规则重复；在进展记录中留下短摘要 | 步骤 2–4 | 入口链接、权威层级、竞品边界和进展记录复查 |
| 6 | `docs/changes/2026-10-10-development-workflow/` | 建立本次交付包，包含五份必需记录；`spec.md` 引用已通过的设计说明，`plan.md` 引用本实施计划，避免另造设计事实 | 步骤 1–5 | delivery/治理检查；当前 SHA 与 dirty 状态回读 |

## 文件所有权与并行策略

- 本任务唯一写入者是当前 root 会话；模板和索引之间存在引用关系，按上表串行修改。
- 不修改 `src/`、`src-tauri/`、`package.json`、锁文件、运行产物、用户数据或其他 agent 正在写入的文件。
- 不创建新 worktree：本次是已授权的治理文档变更，且当前实例已有大量 worktree；如实施时发现目标文档正在被其他写入者修改，立即停在该文件并记录冲突，不覆盖。

## 记录格式落地

流程入口给出以下最小记录约定：

- **任务领取**：Task ID、Owner、branch/worktree、base SHA、依赖、文件归属、AC、基线结果。
- **状态变更**：时间、旧状态、新状态、原因、负责人、证据路径；阻塞必须写解除条件。
- **成果说明**：用户可见结果、改动范围、验证命令/结果、当前 SHA、未验证项、遗留任务和回滚入口。
- **关键决策**：spec/ADR；**故障根因**：incident；重复问题必须关联回归测试和防复发规则。
- **竞品观察**：日期、对象、模式、来源、证据、静态/运行边界、本地差距、最多三项候选动作和放弃条件。

## 验证和交付

1. 先运行 JSON 解析、`git diff --check`，确认没有破坏既有未提交内容。
2. 运行 `node scripts/check-markdown.mjs`、`node scripts/check-features.mjs`、`node scripts/check-project-goals.mjs` 和 `node scripts/check-governance.mjs`；若发现被忽略的 pnpm 锁文件，先按 SHA 隔离并写入 retention manifest，再重跑治理检查。
3. 运行 `delivery:check` 或等价脚本，确认 change package 五份记录、`docs/PROGRESS.md` 和账本绑定完整；不运行会触碰 Tauri/固定端口的全量产品验证，除非并发源码已清理并得到独立授权。
4. 自审所有新增/修改文档的 diff，核对状态词、权威来源、链接和中英文命名；确认没有重复定义旧规则或把本地证据写成 live/发布/用户验收。
5. 在 `review.md` 绑定实施后的实际 head SHA；若 SHA 或并发文件发生变化，重新判断并复验受影响检查。

## 风险与恢复

- **文档冲突**：发现同一文件被其他任务写入时保留双方改动，暂停该文件，记录冲突位置和责任人；不使用整文件覆盖。
- **账本生成失败**：保留原始 JSON 和失败日志，修正 schema 后再生成视图；不手改生成文件。
- **治理门禁预存失败**：把失败归类为 PRE-EXISTING，不虚构全绿；关联现有任务或新增后续任务。
- **状态误标完成**：恢复到 `PARTIAL`/`REVIEW`，追加勘误和缺证据原因；不删除历史结论。

## 计划变更记录

- 2026-10-10：根据设计评审确认采用单一账本 + 单一流程入口方案；新增竞品节奏和阻塞前置路径；未改变产品范围。
- 2026-10-10：按用户确认执行；复用既有 `TASK-DOCS-STRUCT-001`，完成流程入口、五个模板、索引、账本和五件套交付包；重新生成的 pnpm 锁文件已按 SHA 可恢复隔离，治理门禁为 0 violations，exact-head review 通过后已同步账本为 DONE/PASS。

## 计划自审

- `TASK-DOCS-STRUCT-001` 已存在且占用当前根工作树；本次作为其治理文档收敛的延续，避免重复任务和活动 worktree 冲突。
- 计划只写治理文档、账本、进展和交付包，明确排除当前并发的 `src/`、`src-tauri/`、锁文件和运行产物。
- `delivery:check` 所需的五份交付记录、账本绑定和 `docs/PROGRESS.md` 已列入实施范围。
- `pnpm-lock.yaml` 不是项目支持的锁文件；处理必须保留原件哈希并移出主 checkout，不得覆盖 npm/package-lock 或伪造门禁结果。
- 任务已在实际验证、独立复核和账本同步完成后从 `REVIEW` 进入 `DONE`；后续若门禁或证据回退，按流程恢复为 `IN_PROGRESS`。



