# 任务盘点与优先级

截至 2026-10-03，`docs/governance/task-ledger.json` 登记 94 项任务，`docs/features/features.registry.json` 登记 34 项功能。完整逐项清单、依赖、证据和状态以生成的 [TASK_LEDGER.md](../../governance/TASK_LEDGER.md) 为准；本文件记录本轮盘点的汇总和后续排序。

## 状态汇总

| 状态 | 数量 | 处理方式 |
| --- | ---: | --- |
| DONE | 53 | 已有证据，本轮抽样回归并重新跑全量门禁 |
| PARTIAL | 27 | 保留已实现部分，按下一步验收条件继续推进 |
| TODO | 10 | 已登记但未开始，按依赖顺序安排 |
| BLOCKED | 4 | 需要真实 Provider/GPU、VPS 或旧 Web 环境，不能用 fixture 代替 |

## 本轮新增任务与优先级

- **P0，数据完整性：** `TASK-MCP-REGISTRY-001`、`TASK-MCP-REGISTRY-002`。已完成多标签页写入冲突保护、51+ 原件导出和显式恢复；继续作为数据不丢失回归基线。
- **P1，协议与恢复：** `TASK-MCP-PROTO-001`、`TASK-ORCH-REPLAN-001`。本地实现、错误分类、依赖闭包和幂等持久化已完成；真实第三方 MCP/Desktop 验收及真实 Provider 执行分别由原任务 `TASK-MCP-PROTO-001`、`TASK-ORCH-003` 继续负责。
- **P2，治理收口：** `TASK-AUDIT-20261003`。已完成任务状态同步、证据生成、回归和风险清单。

## 本轮已执行的修复

- MCP 注册表写入改为通过浏览器 Web Locks 串行执行重读、冲突判断和提交，并增加写后校验；无该 API 时使用同上下文互斥和 localStorage 短租约。
- 超限和损坏的 MCP 原始配置都保留可导出入口；损坏 JSON 不再只在表单错误中提示而缺少操作路径。
- MCP 单测补齐 timeout、AbortController、2 MB 响应、500 工具、重复游标和 32 页上限；编排器补齐 partial 工作项重排回归。
- 最终证据已按实际结果更新为 MCP 23/23、orchestrator 25/25、Node 659（651/0/8）、Playwright 379/379。

## 未完成任务分组

- **PARTIAL（27）：** `T5`、`T6`、`T7`、`T10-PREP`、`UI-001`、`UI-003`、`UI-004`、`PERF-001`、`TASK-CAP-001`、`TASK-MINIMAX-001`、`TASK-MCP-PROTO-001`、`BACKEND-IMAGE-PARAMS`、`BACKEND-TEXT-NODE`、`BACKEND-CONVERSATION`、`TASK-DS-001`、`TASK-AGENT-001`、`TASK-AGENT-002`、`TASK-CANVAS-001`、`TASK-TASKSTATE-001`、`TASK-LOCAL-SERVICE-001`、`TASK-PROJECT-SIDEBAR-001`、`TASK-PROV-003`、`TASK-PROV-004`、`TASK-AGENT-004`、`TASK-AGENT-005`、`TASK-MEMORY-001`、`TASK-MEMORY-002`。
- **TODO（10）：** `T8`、`T9`、`T12`、`BACKEND-MEDIA-001`、`BACKEND-MCP-AUTO`、`BACKEND-PLATFORM`、`BACKEND-ASTRA-001`、`TASK-DOCS-HISTORY-001`、`TASK-ORCH-002`、`TASK-ORCH-003`。
- **BLOCKED（4）：** `EXT-PROVIDER`、`EXT-COMFY`、`T10`、`T11`。阻塞原因和解除条件保留在各自 ledger 条目中。

## 下一步排序

1. 完成 `TASK-MCP-PROTO-001` 的真实第三方 MCP 与 Desktop 实机验收，并把结果写入独立 evidence。
2. 收口 `T5` 的隔离 Tauri/WebView 提交、取消、进程重启和逐 slot 恢复，再推进 `T6` ComfyUI 最小真实链与 `T7` 发布恢复。
3. 在 `TASK-ORCH-003` 具备真实执行宿主后，将已验证的 `plan_replan` 接入真实 Provider；随后按依赖推进 `TASK-ORCH-002`、平台服务和 Mobile。
4. 保持 `EXT-PROVIDER`、`EXT-COMFY`、`T10`、`T11` 的外部阻塞状态，获得环境后再执行对应验收，不修改状态来掩盖缺口。
