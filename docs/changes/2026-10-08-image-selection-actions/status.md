# 本轮状态与剩余任务

2026-10-08。逐项权威清单见[任务账本](../../governance/TASK_LEDGER.md)及[机器记录](../../governance/task-ledger.json)。本分支102项：DONE59 / TODO13 / PARTIAL26 / BLOCKED4；不表示全项目完成。[跨工作树只读盘点](evidence/cross-worktree-audit.json)另记其他执行者的新任务，本地DONE与主线落地分别核验。

| 项目 | 状态 | 证据/下一步 |
| --- | --- | --- |
| PR34 全量盘点返修 | 已合并、主线CI通过 | main5b0eb6a，历史失败保留 |
| PR35 阶段工作台 | 已合并、主线CI通过 | main5dd6e6dd，唯一Plan及审批链保留 |
| PR36 精确模型能力 | 已合并、主线CI通过 | main1af0357，实际需求/能力各自标识 |
| T5 / PR37 | DONE、已合并、主线CI通过 | source04260ad独立与HostedPASS；main78cea37完整tree一致，main37773335548 SUCCESS |
| TASK-UI-011 / PR39 | DONE、最终文档推广待验 | source7d27265完整423browser/97Rust/UI13+TaskHost11+模型门禁/独立/HostedPASS；随后文档head补审与当前CI通过才普通合并 |
| TASK-LAUNCH-001 / PR38 | 原执行者本地完成、远端待验 | Unicode/Windows路径返修保留，草稿及当前CI分别核对 |
| TASK-UI-013 | 原执行者本地完成、待集成 | 单排标题栏独立审查及实际窗口验收；当前PR/Hosted另验 |
| TASK-UI-012 / TASK-IMAGE-EDIT-001 | 原执行者在途 | 模型入口与蒙版分别实现，不覆盖未提交工作 |
| 旧PR13/17/18/19/20 | 已集成 | PR31 source/landing mapping，不重复合并 |
| minimax-deep-replica / 空integration准备树 | 未验收/无独立产品改动 | 保留，不创建空PR或称完成 |

| 优先级 | 尚未完成 | 验收边界 |
| --- | --- | --- |
| P1 | TASK-PROV-005/006 | 非秘密供应商配置原生durable恢复、native image健康/容量共享门禁；代码可本地实施 |
| P1 | BACKEND-MEDIA-001 → TASK-ORCH-003 | 视频/音频异步取消、unknown、归档，随后编排执行；付费验收另记 |
| P1 | TASK-TASKSTATE-002 | 可验证报价、币种与账单来源；无回执继续未知 |
| P2 | BACKEND-MCP-AUTO、TASK-PLUGIN-DEV-001 | 受控工具审批、取消、错误与development插件加载 |
| 独立验收 | T7、T9/本机伴随服务、T12、UI-004 | 安装、离线、登录、容量、Mobile产物与最终Figma视觉验收 |
| 外部BLOCKED | EXT-PROVIDER、EXT-COMFY、T10、T11 | 真实Provider/GPU模型/VPS权限，fixture不升级为生产成功 |

本轮实现卡片上方唯一选中操作栏；修复顶部拖动/取消后重选恢复、双击路径、自动视口undo和实际非空任务/输出/评论控件偏差；新页面的32px按钮/最小12px字号与窄屏布局已核验，规则写入UI_RULES。T5修复取消/可选元数据归档/unknown重试，26项CI策略边界及真实Hosted原生验收完成。另登记PROV005/006，其他任务按上述优先级推进。

原件、用户数据、分支与旧失败证据保留；源码Desktop2.1.8/Web2.1.9/Mobile规划2.1.1，不表示用户现有快捷方式已换包或线上安装发布。用户已授权验收后普通合并；最终文档精确head门禁、落地完整tree与合并后main CI分别记录在PR39及交付回执。回滚为revert本任务。
