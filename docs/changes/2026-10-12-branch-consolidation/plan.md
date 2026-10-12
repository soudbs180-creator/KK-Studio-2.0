# 计划：分批执行序列与本轮完成度

## 阶段总览

```
P0 止血 ✅ 已完成（main 0706fb3a → 8915b6ae）
 └─ P1 全量核验 ✅ 已完成（branch-classification.md，100 行）
     └─ P2 家族收敛 ×11 ⏳ 待执行
         └─ P3 分批：B1 登记 ✅（本轮） → B2 文档 ⏳ → B3 小代码 24+3 ⏳ → B4 中代码 15+6 ⏳ → B5 UI-012 两步 ⏳
             └─ P4-P5 收尾 ⏳
```

## P0 已执行（2026-10-12）

| 步 | 结果 |
|---|---|
| 0.1 快照 | `backup/pre-consolidation-20261012` @ 0706fb3a |
| 0.2 移出 pnpm-lock.yaml | → `output/pnpm-lock.yaml.ignored-20261012`，governance 门禁阻断解除 |
| 0.3 台账 | 新增 TASK-GOV-003（B1+B2 规则收敛，DONE/PASS），121 项；governance:write 重生 TASK_LEDGER.md |
| 0.4 提交 | `c8807d3e docs(governance): 收敛统一项目规则与文档同步门禁`（31 文件） |
| 0.5 门禁 | version:check ✅ version:consistency ✅ lint ✅（含 2 新门禁）typecheck ✅ test 970/986（8 失败=已记录 symlink 环境性既有失败，PRE-EXISTING）delivery:check 31 files 0 violations ✅ |
| 0.6 合并 | main → 8915b6ae（consolidation merge）；合并后 governance 122 tasks 0 violations / lint ✅ / typecheck ✅ |
| 0.7 存档 | `backup/post-p0-20261012` @ 8915b6ae |
| 附加快照 | `wip/ui-governance-css-cleanup-20261012`（merge-ui-main worktree 在途的 CSS 清理+test 基建，此前未提交于任何分支） |

## P1 已执行

- 100 个分支逐项测量（branch-audit.mjs 可复现）
- 产出 `branch-classification.md`：**已完成 27 · 完成一半 68 · 未完成 4 · 无法判定 1**
- 关键发现：58 个分支无远端副本；2 组同树孪生分支；UI-012 core/RESUME 相差 7 文件、与 main 碰撞约 32 文件；1 个分支与 main 无共同祖先

## B1 已执行（零合并登记）

- 10 个 PR 已集成分支的 11 个台账任务追加 nextAction：「已通过 PR#xx 集成 main，保留作历史追溯，禁止再次合并（会以旧内容回滚主线）」
- 其余登记记录于分类表（表即登记册）

## 待执行（下一批次起）

| 批次 | 内容 | 授权 |
|---|---|---|
| P2 | 11 个家族收敛分支 | 否（WIP 纳入项除外） |
| B2 | codex/async-image-provider-adapters 文档类 1 单元 | 否 |
| B3 | 小代码 24 单元 + 收敛 ×3 | 否 |
| B4 | 中代码 15 单元 + 收敛 ×6 | 否 |
| B5 | UI-012 两步收敛合并 | **已授权** |
| 待授权 | UI-014/UI-009/UI-010/kaworkai/canvas-tags/minimax-deep-replica(WIP)/AGENT-004-google(WIP) | 逐项 |
