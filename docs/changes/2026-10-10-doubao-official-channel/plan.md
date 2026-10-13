# Plan：豆包（火山方舟）官方通道 P1

- Task ID：TASK-AI-GATEWAY-001（P1 官方通道）
- 状态：IMPLEMENTED（代码与单测完成；真实上游联调 NOT VERIFIED）
- 日期：2026-10-10
- Intent / Spec：本目录 `intent.md`、`spec.md`
- 分支/工作区：`feat/TASK-AI-GATEWAY-001-doubao-p1` @ `D:/kk-studio/.worktrees/TASK-AI-GATEWAY-001-doubao-p1`（基线 5d4c9551；因仓库活动 worktree 超预算，经 `KK_MAX_ACTIVE_WORKTREES=24` 受控创建，未清理任何既有 worktree）

## 文件清单与顺序

| 步骤 | 文件 | 动作 |
| --- | --- | --- |
| 1 | `src/domain/modelProvider.ts` | 新增 `PROVIDER_PRESETS` 常量（含豆包（火山方舟）预置）并导出 |
| 2 | `src/features/creation/model.ts` | 修正 `modelSupportsKind`：text 加 doubao 并排除图片语义；image 排除纯文本 doubao 模型 |
| 3 | `src/components/settings/ProviderProfileFields.tsx` | 新增预置选择器（select），选择后经 `onUpdate` 填入 name/baseUrl |
| 4 | `tests/unit/creation.test.ts` | 新增 doubao 文本/图片/既有模型判定用例 |
| 5 | `tests/unit/modelProvider.test.ts` | 新增预置常量断言（baseUrl 合法、含豆包条目） |
| 6 | `docs/features/feat-038-ai-model-gateway.md` | 更新 P1 进展、代码/测试清单、状态说明 |
| 7 | `docs/features/features.registry.json` | 同步 FEAT-038 卡代码/测试/任务字段（与卡一致） |
| 8 | `docs/governance/task-ledger.json` | TASK-AI-GATEWAY-001 推进记录（代码就绪，真实联调 NOT VERIFIED） |
| 9 | `docs/PROGRESS.md` | 追加本轮迭代记录 |
| 10 | 本目录 `verification.md`、`review.md` | 验收与独立复核记录 |

## 验证

1. `npm run test`（unit + deploy）全绿，creation.test.ts 既有用例未删减。
2. `npm run typecheck`、`npm run lint`（eslint src tests --max-warnings 0）通过。
3. `npm run features:check`、`npm run governance:check` 通过（若 registry/账本变更需同步生成视图 `npm run features:write` / `npm run governance:write`，README/TASK_LEDGER 为生成文件禁止手改）。
4. 真实方舟联调：**不执行**（需用户 Key，外部条件）；verification 如实标 NOT VERIFIED。
5. UI 浏览器验证：本轮以单测 + 组件代码审查为准；如时间允许补 `test:ui` 冒烟，否则在 verification 缺口区声明。

## 风险与恢复

- `modelSupportsKind` 误伤既有模型：通过既有用例回归拦截；修正规则先于实现写入 spec。
- 预置 UI 与现有表单状态机冲突：选择器仅调用现有 `update()`，不引入新状态。
- 工作区并发：任务在独立 worktree，主仓 `docs/TASK-DOCS-STRUCT-001` checkout 未被触碰。
- 回滚：分支独立，合并前可整支丢弃；无破坏性迁移。
