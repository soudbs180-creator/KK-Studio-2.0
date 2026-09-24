# 多供应商接入与多目标配置（FEAT-030）

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-09-24
- 关联任务：TASK-PROV-002（REVIEW，待合入）、TASK-PROV-003（REVIEW，待合入）、TASK-PROV-004（REVIEW，待合入）

## 用户可见入口

- 本批为能力模块 + agent 侧接线 CLI，暂无 UI 入口；用户可观察效果由接线任务提供：Agent 配置生成（Codex/Claude）、设置页导入导出、模型上下文窗口选择、MCP 管理页 stdio 服务器。
- Desktop / Web / Mobile 差异：逻辑层全平台可复用；MCP stdio 执行仅限 Node 侧（后续接线），浏览器保持 streamable_http。
- Codex 落盘入口（当前）：`node vendor/canvas-agent/dist/index.js providers apply <config.json> [--catalog <id>] [--config-dir <dir>] [--dry-run]` / `providers check <config.json>`。
- Claude 落盘入口（当前）：`node vendor/canvas-agent/dist/index.js providers apply-claude <config.json> [--config-dir <dir>] [--dry-run]`。

## 代码位置

- 前端：`src/features/providers/providerTargetRenderers.ts`、`src/features/providers/providerConfigIO.ts`、`src/features/models/modelCatalogWindow.ts`、`src/features/mcp/mcpConfig.ts`
- Agent（vendor/canvas-agent）：`src/agent/codex-provider-config.ts`（渲染/合并/catalog/落盘）、`src/agent/provider-cli.ts`（apply/check）、`src/index.ts`（providers 子命令分派）
- 桌面 Rust：无
- 服务端：无（纯函数，供后续 Gateway/Agent 接线消费）
- 数据/存储：本批无存储写入；便携导出格式 v1 定义于 providerConfigIO；MCP stdio 契约面向持久化 schema（storage 接入后置）

## 测试与证据

- 单测：`tests/unit/providerTargetRenderers.test.ts`、`tests/unit/providerConfigIO.test.ts`、`tests/unit/modelCatalogWindow.test.ts`、`tests/unit/mcpConfig.test.ts`；agent 侧 `vendor/canvas-agent/src/agent/codex-provider-config.test.ts`
- 浏览器回归：无（本批无 UI）
- Rust 测试 / 实机验收：无（Codex 真实消费对拍登记 remaining）
- 变更与验证证据：`docs/changes/2026-09-24-provider-connectivity/{verification,remaining}.md`、`docs/changes/2026-09-24-provider-wiring/{verification,remaining}.md`

## 当前能力

- 已真实可用（REAL）的子能力（逻辑层/agent 层，带单测）：
  - 同一 ProviderConnection 渲染 Codex `config.toml` provider 块、Claude `settings.json`、OpenAI 兼容 env 三份目标配置，输出经 zod 校验且不含密钥明文。
  - 便携配置 v1 导出/导入/按 id 合并、cc-switch 风格 seed（name/baseUrl/model）导入适配。
  - `model[1M]/[200K]/[512k]/[1000000]` 后缀解析与剥离，生成 cc-switch 兼容 `model_catalog_json`。
  - MCP stdio 服务器持久化契约与命令白名单校验。
  - Agent 侧：Codex config.toml 保守合并（只管理 kk_* 表与显式顶层键，幂等、保留用户配置）、`model-catalogs/<id>.json` 落盘与相对指针、providers apply/check CLI（密钥只写 env_key）。
- 明确标注：以上逻辑已接线到 agent CLI 与真实落盘（本机验证），但 app→agent HTTP 端点、Claude/OpenAI 落盘、UI 入口未做，且未在装有 Codex 的机器上做真实会话对拍，属于 PARTIAL。

## 差距与后端化

- “已实现但未验证/未接线”的点：Codex 真实消费对拍（model_catalog_json/env_key/wire_api 兼容性）；app→agent HTTP 端点（等待 TASK-AGENT-006 合入避免同文件冲突）；Claude settings.json / OpenAI env 落盘；MCP stdio 客户端在 canvas-agent 接线；配置导入导出 UI；聚合供应商；协议转换代理。
- 变成 REAL 还缺什么：接线任务（HTTP 端点、设置页、Gateway/Agent 消费）+ 装有 Codex 的机器上的真实运行证据 + DONE/PASS 账本任务。
- 外部依赖与阻断条件：Codex/Claude 版本字段兼容性需实跑确认；TASK-AGENT-006 合入后可复用其 config 接线。

## 变更记录

- 2026-09-24：创建卡片，状态 PARTIAL（TASK-PROV-002）。
- 2026-09-24：TASK-PROV-003 落地 agent 侧 Codex 配置注入 + catalog 落盘 + providers CLI；根 verify 纳入 test:agent；状态保持 PARTIAL。
