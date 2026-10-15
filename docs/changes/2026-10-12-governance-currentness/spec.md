# 规格：当前文档生命周期和时间冲突规则

1. 任务身份使用稳定 `taskId`；文档身份使用稳定 `docId`，日期只表示更新时间。
2. 当前治理入口必须写 `docId`、`status`、`updatedAt`、`source`、`supersededBy`。
3. `status: current` 必须使用 `supersededBy: null`；`status: superseded` 必须指向新入口。
4. 同一 `docId` 只能有一份 `current`；dated change package 是历史证据，不参与当前路由。
5. 冲突按权威来源、有效更新时间、exact SHA/commit/receipt 依次裁决；文件名日期和 mtime 不能单独证明最新。
6. `TASK_STATUS` 是账本路由快照，不改变任务状态；`AI_HANDOFF` 是恢复入口，不复制历史任务报告。
