# Plan：项目建设目标与验收基线

- Task ID：TASK-GOV-GOALS-001。
- 状态：IMPLEMENTED；日期：2026-10-03。
- Intent / Spec：[`intent.md`](intent.md) · [`spec.md`](spec.md)。
- Owner / branch / worktree：root / `codex/TASK-AUDIT-20261003` / `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`。
- Base / HEAD：`origin/main` 为治理基线；实现完成后以本分支最新 HEAD 为准。

## 开工证据

- 已读取：`AGENTS.md`、`AI_RULES.md`、`docs/engineering/PROMPTING.md`、`SDLC.md`、`SPEC_BASELINE.md`、`PROJECT_STATE.md`、`TASK_LEDGER.md`、`UI_INDEX.md`、功能注册表和相关实现。
- 依赖：仓库已安装 Node 依赖；npm CLI 可用性需在 verification 真实记录。
- 预存事实：此前 TASK-AUDIT 已盘点 94 个任务和 34 个功能；本任务新增治理基线，不改变其外部阻塞结论。

## 实施顺序

| 步骤 | 文件/模块                                          | 改动和目的                                                 | 依赖               | 验证                              |
| ---- | -------------------------------------------------- | ---------------------------------------------------------- | ------------------ | --------------------------------- |
| 1    | `docs/governance/PROJECT_GOALS.md`                 | 写入产品目标、四条主路径、代码/UI/链路/质量/交付标准和假设 | 现行治理与 UI 规则 | 文档链接与章节检查                |
| 2    | `scripts/check-project-goals.mjs`、`package.json`  | 增加确定性目标检查并接入 lint/verify                       | 步骤 1             | 直接运行与 lint 链验证            |
| 3    | `docs/governance/*`、`task-ledger.json`            | 更新治理索引、状态入口、账本和生成视图                     | 步骤 1–2           | governance/features/markdown 检查 |
| 4    | `docs/changes/2026-10-03-project-goals-baseline/*` | 保存 intent/spec/plan/verification/review 证据             | 步骤 1–3           | 当前 SHA 复核                     |

## 风险与恢复

- 目标文档缺失或章节漂移时门禁失败；修正文档后重新生成账本并复验。
- 不修改运行时数据和用户文件；回滚只需恢复本任务提交。
- 若外部条件仍缺失，继续保持原任务状态，不能为满足“全完成”而改写状态。

## 验证和交付

- 定向：`node scripts/check-project-goals.mjs`、治理/功能/Markdown/格式检查。
- 完整：沿用当前审计分支的 Node、Agent、Playwright、Vite、Cargo 回归；文档变更后至少重跑受影响门禁。
- 交付：更新 `PROJECT_STATE.md`、`AI_HANDOFF.md`、`docs/PROGRESS.md` 和 `TASK_LEDGER.md`，绑定本 change package。
