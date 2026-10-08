# 本轮状态与剩余任务

2026-10-08。权威逐项清单见[任务账本](../../governance/TASK_LEDGER.md)与[机器记录](../../governance/task-ledger.json)。本分支100项：DONE57 / TODO11 / PARTIAL27 / BLOCKED4 / REVIEW1。此为分支快照，T5及其他执行者的新任务尚待经过主线整合；不表示全项目已完成。

| 项目                                       | 状态                 | 证据/下一步                                                                                   |
| ------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------------- |
| PR #34 全量盘点返修                        | 已合并、主线CI通过   | main@5b0eb6a，历史失败保留                                                                    |
| PR #35 阶段计划工作台                      | 已合并、主线CI通过   | main@5dd6e6dd，唯一Plan和审批链保留                                                           |
| PR #36 精确模型能力                        | 已合并、主线CI通过   | main@1af0357；实际需求与能力仍各自标识                                                        |
| TASK-UI-011                                | 本地验收通过、REVIEW | 422browser/fresh Native13组、976db独立PASS关闭R1/R2；最终文档head/Hosted待完成                |
| T5 / PR #37                                | 源码独立PASS、REVIEW | 409browser/97Rust/native11组本机通过；21ac Hosted空Registry集合失败，26回归返修后新head待实测 |
| TASK-LAUNCH-001 / PR #38                   | 原执行者返修         | 新Windows路径问题在处理，不抢合旧head                                                         |
| TASK-UI-012 / TASK-IMAGE-EDIT-001          | 原执行者在途         | 新页面/模型入口与蒙版编辑独立任务，不覆盖未提交工作                                           |
| 旧PR13/17/18/19/20                         | 已集成               | PR31 source/landing mapping；不重复合并                                                       |
| minimax-deep-replica / 空integration准备树 | 未验收/无产品改动    | 保留，不创建空PR或称完成                                                                      |

| 优先级      | 尚未完成                              | 验收边界                                                                 |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------ |
| P1          | TASK-PROV-005/006（T5账本中）         | 非秘密配置原生durable恢复、native image健康/容量共享门禁；代码可本地实施 |
| P1          | BACKEND-MEDIA-001 → TASK-ORCH-003     | 视频/音频异步取消/unknown/归档，随后编排实际执行；付费验收另记           |
| P1          | TASK-TASKSTATE-002                    | 可验证报价/币种/账单来源；当前无回执继续未知                             |
| P2          | BACKEND-MCP-AUTO、TASK-PLUGIN-DEV-001 | 受控工具审批/取消/错误，以及development随包插件加载；不隐瞒既有错误      |
| 独立验收    | T7、T9/本机伴随服务、T12、UI-004      | 安装/离线/登录/容量、Mobile产物与Figma同状态最终视觉验收                 |
| 外部BLOCKED | EXT-PROVIDER、EXT-COMFY、T10、T11     | 真实Provider/GPU模型/VPS权限，fixture不升级为生产成功                    |

本轮新增统一上方选择工具栏与顶部恢复回归；修复实际任务/输出/评论控件偏差、自动视口占用undo及双击事件路径。最新完整Web和真实Native证据已保护，历史超时/设置失败与CHANGES REQUIRED保留。当前用户已授权合并通过验收的分支；仍以精确当前head独立审查、Hosted与最新main为门禁。回滚为revert本任务；原件、用户数据、分支及恢复证据保留。
