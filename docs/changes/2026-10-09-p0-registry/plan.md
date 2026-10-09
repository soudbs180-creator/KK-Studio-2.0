# 登记包实施计划

## 已完成

1. 读台账（`docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md`）与审计（09-25 功能状态审计）核实 P0 现状
2. 新建功能卡 FEAT-038 / FEAT-039（模板字段全填：入口/代码/测试/能力/差距）
3. features.registry.json 追加 2 条（Python 原子写入，保留 UTF-8）
4. task-ledger.json 追加 3 条（字段经 validateLedger 全绿校验）
5. 重新生成 README.md 与 TASK_LEDGER.md

## 待后续（另开 worktree + PR）

- TASK-FIX-PUSH-GUARD-SPACES-001：修 pre-push 空格路径（钩子或 push-policy 内联、cygpath/URL 转换 + 三类 fixture）
- TASK-PERF-CANVAS-1000-001：视口裁剪 + 节点 memo + 缩略图懒加载/LRU
- TASK-PROTECT-BATCH-GEN-001：提交节流 + running 上限 + 结果分批入画布

## 校验命令

- `node scripts/check-features.mjs --write`（0 violations）
- `validateLedger`（0 issues）
- delivery:check 由 PR 流程执行
