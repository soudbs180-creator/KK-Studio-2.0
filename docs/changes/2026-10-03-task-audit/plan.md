# Plan：全项目任务盘点与本地收口

- Task ID：TASK-AUDIT-20261003；状态：DONE（本地范围）。
- Owner：root；分支：`codex/TASK-AUDIT-20261003`。
- Worktree：`D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`。
- Base：`origin/main@21d121d2b884b2b7ced4a98eb0e03c590de5c3cd`。
- [Intent](intent.md) · [Spec](spec.md) · [Verification](verification.md) · [Review](review.md)。

## 全局约束与复核重点

保持 main 不变，只在本任务 worktree 操作；不引入依赖升级，不保存凭据，不扩大现有 50 项 MCP 注册表限制，不把外部验收写成通过。每个实现行为先添加能证明缺陷的失败测试，再写最小修复。重点复核并发写入、超限原件保留、协议错误分类、session 清理、分页上限、重排依赖闭包、审批门和幂等持久化。

## 执行步骤

### 1. 建立审计台账和证据骨架

1. 为 `TASK-AUDIT-20261003` 及四个本地收口任务登记当前分支、worktree、优先级、证据路径和依赖。
2. 生成 `TASK_LEDGER.md`，在 `PROGRESS.md`、`PROJECT_STATE.md`、`AI_HANDOFF.md` 中记录审计范围和仍受外部条件限制的任务。
3. 预期：治理脚本接受新任务，任务总数增加且所有状态/依赖合法。

### 2. MCP 注册表（TDD）

1. 在 `tests/unit/mcpClient.test.ts` 添加并发 rebase/冲突、跨实例删除与同 ID 更新、51 项超限查看/导出/恢复、损坏 JSON 分流和恢复后 50 项上限用例。
2. 运行定向单测，预期新用例因现有 last-writer 与超限清空逻辑失败。
3. 修改 `McpServerRegistry`：读取合法超限数组而不覆盖，暴露只读警告与原始导出，显式 `recover` 才裁剪；每次写入重新读取并合并基线，检测同 ID/容量冲突并用比较写入保护。
4. 运行定向和全量 Node 单测，预期全绿后提交独立 commit。

### 3. MCP modern/legacy 协商（TDD）

1. 添加 modern discover 成功、404/405 安全回退、401/403/5xx 不回退、modern list/call 无 session、取消和 malformed discover 用例。
2. 运行定向单测，预期现有固定 initialize 客户端在 modern 用例失败。
3. 在 `McpHttpClient` 引入自动/legacy/modern 协商状态，复用响应大小、超时、分页、工具 schema 和凭据边界；modern 请求不创建或删除 legacy session。
4. 运行 MCP 单测、全量 Node 单测和类型检查，预期全绿后提交独立 commit。

### 4. 编排器计划重排（TDD）

1. 在 `tests/unit/orchestrator.test.ts` 添加失败项、部分失败项、下游依赖、审批门和重复调用用例。
2. 运行定向单测，预期当前占位返回原 planId 且没有新计划，新增断言失败。
3. 在 `src/features/agent/orchestrator.ts` 提取失败项依赖闭包和新计划物化逻辑，持久化新计划并提供稳定 idempotency；只重排计划，不声称触发真实 Provider。
4. 运行定向单测、全量 Node 单测和类型检查，预期全绿后提交独立 commit。

### 5. 回归、治理和最终审查

1. 运行本项目可执行的 lint、format、typecheck、Node unit/deploy、canvas-agent tests、features、governance、markdown、tsc build、Vite build、Cargo check、Playwright 检查。
2. 修复本轮引入的所有失败；对已完成任务做清单式抽样回归，不修改无关候选分支。
3. 写入 `verification.md`、`review.md`，更新四个任务与审计任务的真实状态和证据，重新生成治理视图。
4. 进行独立于实现步骤的作者自审，并按代码审查技能请求一次只读 reviewer；把任何未能由本地证据证明的项目列为风险。

执行结果：步骤 1–5 均已完成。治理台账最终为 94 项（DONE 53、PARTIAL 27、TODO 10、BLOCKED 4）；本地可闭环的注册表、协议和计划重排实现与回归已记录在 verification，外部依赖项未被升级为已完成。

## 依赖图

`ledger/docs → registry → protocol → replan → full checks → review/status`。注册表和协议共享 `mcpClient.ts`，因此先完成注册表并在协议阶段复跑全部 MCP 单测；编排器独立但依赖统一的 final verification。

## 审查重点

- 不能因为超限或损坏而把原始 localStorage 字节覆盖为空。
- 不能把鉴权失败、服务端故障或取消请求误判为 legacy 支持。
- 不能用新计划 ID 覆盖原计划，也不能重跑已经成功的工作项。
- 所有新增公开方法都需要单测，所有任务状态都必须与可复核证据一致。
