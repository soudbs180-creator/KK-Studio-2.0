# Spec：MCP 服务器配置写读一致

- Task ID：TASK-MINIMAX-001
- 状态：IMPLEMENTED（子项）
- 基线：`origin/main@76339c9f`；`src/features/mcp/mcpClient.ts` 的 50 项读取 schema

## 契约

`McpServerRegistry.add` 在校验单条服务器后，先构造以 id 去重的候选列表。候选数超过 50 时抛出可读错误，不改变内存列表，也不调用存储写入。按相同 id 更新现有服务器不增加数量，保持可用。存储 key 和已有数据格式不变；损坏/写失败处理仍按原逻辑。

此限额只约束本地非敏感服务器元数据。会话 ID、发现工具和凭据仍仅在内存；不修改 URL/HTTPS 边界。无 schema 迁移或 ADR 需求，因为这次将既有读取上限应用到写入路径。

## 独立兼容缺口

当前客户端固定 `2025-11-25`、`initialize` 与 session 流程。MCP 官方 TypeScript SDK [协议版本说明](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions)指出 `2026-07-28` 改为 `server/discover`，不使用 `initialize`，自动协商可连接两代服务器。据此推断当前客户端无法连接仅支持新版协议的服务器；尚未以真实新版服务器端到端复现。`TASK-MCP-PROTO-001` 负责协商、旧版回退、安全边界及 Web/Desktop 真实连接验收。

## 验收映射

| 条件 | 预期 | 检查 |
| --- | --- | --- |
| AC-1 | 第 51 项失败且存储原样 | `tests/unit/mcpClient.test.ts` |
| AC-2 | 同 id 替换仍为 50 项 | 同上 |
| AC-3 | 兼容差距明确保留 | ledger、FEAT-012、官方文档 |
