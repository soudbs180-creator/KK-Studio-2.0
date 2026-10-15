# 意图：治理文档按稳定身份和最新时间收敛

## 用户授权

用户确认执行 `R+B3-1+B3-2`：补齐任务/文档更新时间与冲突规则，刷新 `TASK_STATUS.md`，瘦身 `AI_HANDOFF.md`。用户明确暂不执行 B3-3、B4-1、B4-2、B4-3。

## 范围

- 为当前治理入口增加稳定 `docId`、`updatedAt`、`source`、`status`、`supersededBy` 门禁。
- 以稳定 `taskId` 原位更新任务，不因日期创建第二条 current。
- 将 `TASK_STATUS.md` 刷新为当前 123 条账本快照。
- 将 `AI_HANDOFF.md` 收敛为当前恢复入口，历史事实回到 Git 和 dated change package。
- 同步 `PROJECT_STATE`、`AUTHORITY_MAP`、统一规则、门禁映射、PROGRESS 和任务视图。

## 非范围

- 不删除、移动、取消跟踪或合并任何 worktree、分支、二进制、输出或临时目录。
- 不执行 B3-3、B4-1、B4-2、B4-3。
- 不改产品代码、运行时行为、凭据、用户数据或历史证据内容。
