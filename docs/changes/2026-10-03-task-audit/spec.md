# Spec：任务台账审计与本地能力收口

- Task ID：TASK-AUDIT-20261003；状态：IN_PROGRESS。
- 来源：[Intent](intent.md)、仓库 `AGENTS.md`、`AI_RULES.md`、`docs/engineering/SDLC.md` 和现有任务/功能台账。

## 验收条件

**AC-1 任务盘点。** 记录全部 92 个任务和 34 个功能卡的当前状态、证据、依赖、优先级和外部阻塞；新增本轮审计任务并将其排入台账。未开工、部分实现、占位逻辑和缺少错误处理的项目必须有明确动作或阻塞理由。

**AC-2 注册表一致性。** 两个实例从同一 49 项快照分别新增时，后写者不得静默覆盖先写者；可合并的独立变更要保留，达到 50 项上限时以明确冲突拒绝。跨实例删除和同 ID 更新必须有明确冲突语义。既有 51 项合法旧配置在查看、导出和显式恢复前保持原始字节，正常写入仍严格限制为 50 项；损坏 JSON 与超限 JSON 分别测试。

**AC-3 协议协商。** 客户端自动优先探测 `server/discover` 和 2026-07-28 modern；仅在明确的“不支持发现”响应下回退 2025-11-25 initialize。401/403、5xx、超时、响应过大、格式错误和取消不得伪装成旧版。modern 工具列表/调用使用版本头和无 session 的请求，legacy 行为保持兼容。

**AC-4 计划重排。** `plan_replan` 不再返回占位说明；失败或部分失败项与依赖下游进入新计划的 queued 状态，已成功项保留，审批门状态满足当前计划语义，结果持久化到项目，重复请求幂等且不修改原计划。编排器不在本任务内假装执行真实 Provider 任务。

**AC-5 回归与交付。** 直接 Node/Cargo 等价命令覆盖 lint、typecheck、unit/deploy、agent tests、UI standards、features、governance、markdown、format、tsc build、Vite build、Cargo check、Playwright 和新用例；输出真实记录于 verification。无 npm 可执行文件时记录环境事实和等价命令，不伪造 `npm run verify` 成功。

## 范围与边界

范围为 `src/features/mcp/mcpClient.ts`、其单测和必要的设置状态接口，`src/features/agent/orchestrator.ts` 与其单测，治理台账/生成视图/变更证据。保持现有存储 key、HTTP/HTTPS 限制、凭据不持久化、响应大小/分页/工具数限制和项目 API 兼容。

外部 Provider/GPU、真实 ComfyUI/模型、VPS/DNS/TLS、Mobile 运行时、Figma 用户视觉验收、完整 TaskWorkbench UI 和 MCP 自动执行层仍由原台账任务负责；本轮只修正能被本地代码和测试证明的根因，不把它们改成假完成。

## 优先级

P0：数据不丢失和安全边界（TASK-MCP-REGISTRY-001/002）。

P1：协议互操作（TASK-MCP-PROTO-001）和编排器占位分支（TASK-ORCH-003 的可本地验证计划重排部分）。

P2：同步任务状态、生成证据和更新下一批外部依赖任务的排序；不在本轮实现需要外部授权的功能。
