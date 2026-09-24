# 多供应商接入与多目标配置（FEAT-030）

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-09-24
- 关联任务：TASK-PROV-002（IN_PROGRESS）

## 用户可见入口

- 本批为纯逻辑能力模块，暂无 UI/运行时入口；用户可观察效果由接线任务提供：Agent 配置生成（Codex/Claude）、设置页导入导出、模型上下文窗口选择、MCP 管理页 stdio 服务器。
- Desktop / Web / Mobile 差异：逻辑层全平台可复用；MCP stdio 执行仅限 Node 侧（后续接线），浏览器保持 streamable_http。

## 代码位置

- 前端：`src/features/providers/providerTargetRenderers.ts`、`src/features/providers/providerConfigIO.ts`、`src/features/models/modelCatalogWindow.ts`、`src/features/mcp/mcpConfig.ts`
- 桌面 Rust：无
- 服务端：无（纯函数，供后续 Gateway/Agent 接线消费）
- 数据/存储：本批无存储写入；便携导出格式 v1 定义于 providerConfigIO；MCP stdio 契约面向持久化 schema（storage 接入后置）

## 测试与证据

- 单测：`tests/unit/providerTargetRenderers.test.ts`、`tests/unit/providerConfigIO.test.ts`、`tests/unit/modelCatalogWindow.test.ts`、`tests/unit/mcpConfig.test.ts`
- 浏览器回归：无（本批无 UI）
- Rust 测试 / 实机验收：无
- 变更与验证证据：`docs/changes/2026-09-24-provider-connectivity/{verification,remaining}.md`

## 当前能力

- 已真实可用（REAL）的子能力（逻辑层，带单测）：
  - 同一 ProviderConnection 渲染 Codex `config.toml` provider 块、Claude `settings.json`、OpenAI 兼容 env 三份目标配置，输出经 zod 校验且不含密钥明文。
  - 便携配置 v1 导出/导入/按 id 合并、cc-switch 风格 seed（name/baseUrl/model）导入适配。
  - `model[1M]/[200K]/[512k]/[1000000]` 后缀解析与剥离，生成 cc-switch 兼容 `model_catalog_json`。
  - MCP stdio 服务器持久化契约与命令白名单校验。
- 明确标注：以上均未接线到 UI/Agent/落盘，未在真实 Codex/Claude 消费，属于 PARTIAL。

## 差距与后端化

- “已实现但未验证/未接线”的点：渲染结果与真实 Codex/Claude 对拍；catalog 指针写入 config.toml；MCP stdio 客户端在 canvas-agent 接线；配置导入导出 UI；连接级 MCP 挂载。
- 变成 REAL 还缺什么：接线任务（Agent 配置生成、设置页、Gateway/Agent 消费）+ 真实运行证据 + DONE/PASS 账本任务。
- 外部依赖与阻断条件：Codex/Claude 版本字段兼容性需实跑确认；TASK-AGENT-006 在途完成后可复用其 config 接线。

## 变更记录

- 2026-09-24：创建卡片，状态 PARTIAL（TASK-PROV-002）。
