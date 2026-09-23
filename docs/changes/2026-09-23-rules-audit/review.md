# Review：规则与 Markdown 一致性审计

- Task ID：TASK-RULES-004
- 状态：独立上下文复审待执行
- Base：`da811283e55ce699e4c5425d92ad31ffba7513e3`
- Head / PR：待最终提交和远端创建后补录
- 范围：[intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[verification](verification.md)、真实 Git diff 和可执行脚本

## 审查要求

审阅者独立核对规则文档与当前账本/设计系统/PR 状态是否一致、堆叠 PR 能否在上游合并后安全转向 main、Markdown 检查是否有漏报或误报、历史证据是否被改写，以及本地结果是否被错误描述为远端 CI 成功。审查绑定最终 base/head SHA；任何修复提交后补审。

## 门禁状态

| 门禁            | 当前结果                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Self-review     | 待最终 diff 检查                                                                                 |
| 独立 AI review  | NOT VERIFIED，待独立上下文                                                                       |
| 本地 verify     | 368 Node、300 browser、治理 61/0、功能 29/0、Markdown 81/0、UI 159/0 通过；delivery 待提交后运行 |
| Hosted CI       | PR #9 因账户付款或 spending limit 在步骤前失败；本任务 PR 待创建                                 |
| main 合并与发布 | 未执行；不可把本任务完成等同 2.1.0 发布                                                          |

结论待复审后填写；本文件不预填 PASS。
