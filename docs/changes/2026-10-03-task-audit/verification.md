# Verification：全项目任务盘点与本地收口

状态：IN_PROGRESS。最终验证命令和输出在实现完成后填写；当前先保留预期命令，不把未运行结果写成通过。

## 证据范围

- 任务源：`docs/governance/task-ledger.json`（92 项基线，新增审计及本轮收口项后重新计数）。
- 功能源：`docs/features/features.registry.json`（34 项基线）。
- 代码证据：`src/features/mcp/mcpClient.ts`、`src/features/agent/orchestrator.ts`。
- 测试证据：`tests/unit/mcpClient.test.ts`、`tests/unit/orchestrator.test.ts` 及最终全量命令输出。

## 命令记录

待实现完成后用直接 Node/Cargo 命令补齐每一项的日期、退出码、测试总数和关键警告。npm CLI 在当前环境不可用，若仍不可用，将同时记录项目定义命令无法启动的环境事实与等价脚本命令，避免伪造 npm 结果。
