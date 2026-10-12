# 规格：分支核验方法、分类体系与判定规则

## 测量方法（全部只读，不采信文档自述）

每个分支执行：

```bash
git rev-list --count main..<b>                  # beyond：领先 main 提交数
git diff --name-only main...<b>                 # 独有 delta：自叉点以来改动文件
git diff --name-only main <b>                   # 与 main 现存差异
comm -12 <上述两者>                              # remaining：真正未集成的增量
git cherry main <b>                             # 补丁等价判定（−=已在 main）
git merge-base main <b>                         # 共同基点（失败=无共同祖先）
git log main --oneline --grep=<TASK-ID> -i      # PR/squash 集成证据
git branch -r | grep origin/<b>                 # 远端副本
git worktree list --porcelain                   # worktree 持有
```

工具化：`scripts/governance/branch-audit.mjs`（纯只读，可复跑复现全表）。

## 分类体系

| 类 | 判定 |
|---|---|
| A 已集成 | 实质增量（剔除台账类文件后）与 main 无差异 |
| B PR残留 | main 历史含该任务的 PR/squash 合并记录 |
| C 证据留存 | 仅剩交付包证据文件 |
| D 文档 | 仅剩文档增量 |
| E-T1/T2/T3 | 有实质代码增量（T1>70、T2 15–70、T3<15 实质文件） |
| F 本轮新增 | 本轮执行中产生的分支（如 WIP 保全） |
| G 历史备份 | 与 main 无共同祖先 |

台账类文件（main 已演进、不计入实质增量）：PROGRESS.md、task-ledger.json、TASK_LEDGER.md、PROJECT_STATE.md、AI_HANDOFF.md、VERSION、platform-versions.json、package.json、package-lock.json、features.registry.json、docs/README.md、AGENTS.md 等。

## 完成状态判定

- **已完成**：实质增量已在 main（A/B/C 类）
- **完成一半**：有实质增量但未跑门禁/未验收/未收敛（D/E 类）
- **未完成**：绑定任务 TODO/BLOCKED，或分支自标 WIP unverified
- **无法判定**：无共同祖先等无法测量的情形（G 类）

## 家族收敛规则

同一 TASK-ID 的多个分支：以**最新方向成员**为基线建收敛分支 → `merge --no-ff` 合入其余成员 → `merge --no-ff main` 暴露冲突 → 解冲突 → 单元门禁 → 合入 main。WIP 成员（自标 unverified）本轮不纳入。

## 合并单元流程（后续批次）

快照 → 同步 main 基线 → 五件套 → 台账回写 + governance:write → 最低门禁（version:check/version:consistency/lint/typecheck/test）→ delivery:check → merge --no-ff 入 main → 合并后复跑 lint/governance/typecheck。

## 冲突裁决协议

- 台账类：task-ledger.json 按 task.id 结构化合并；生成视图跑 --write 重生；PROGRESS.md 主线为基追加新日期段；VERSION 不接受旧值
- 源码：三向合并；主线重写过的碰撞文件以主线为基语义级重落增量；UI 源码须 1421/1423 串行复跑+截图后才裁
- 证据：路径不重叠取并集
- 禁止：`-X ours/theirs`、整文件取边、rebase/force 已推送分支
