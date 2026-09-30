# 多供应商接入与多目标配置（FEAT-032）

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-09-30
- 关联任务：TASK-PROV-002（已合入）、TASK-PROV-003/004（PARTIAL）

## 用户可见入口

- 本批为纯逻辑能力模块，暂无 UI/运行时入口；用户可观察效果由接线任务提供：Agent 配置生成（Codex/Claude）、设置页导入导出、模型上下文窗口选择、MCP 管理页 stdio 服务器。
- Desktop / Web / Mobile 差异：逻辑层全平台可复用；MCP stdio 执行仅限 Node 侧（后续接线），浏览器保持 streamable_http。

- Agent CLI 入口：`node vendor/canvas-agent/dist/index.js providers apply/check <config.json>`；仅在显式运行时写入指定的 Codex 配置目录。

## 代码位置

- 前端：`src/features/providers/providerTargetRenderers.ts`、`src/features/providers/providerConfigIO.ts`、`src/features/models/modelCatalogWindow.ts`、`src/features/mcp/mcpConfig.ts`
- Agent：`vendor/canvas-agent/src/agent/codex-provider-config.ts`、`provider-cli.ts`、`src/index.ts`
- 桌面 Rust：无
- 服务端：无（纯函数，供后续 Gateway/Agent 接线消费）
- 数据/存储：前端逻辑模块无存储写入；Agent CLI 可显式写入指定配置目录，便携导出格式 v1 定义于 providerConfigIO；MCP stdio 契约面向持久化 schema（storage 接入后置）

## 测试与证据

- 单测：`tests/unit/providerTargetRenderers.test.ts`、`tests/unit/providerConfigIO.test.ts`、`tests/unit/modelCatalogWindow.test.ts`、`tests/unit/mcpConfig.test.ts`
- 浏览器回归：无（本批无 UI）
- Agent 单测：`vendor/canvas-agent/src/agent/codex-provider-config.test.ts`；当前完整 Agent 回归通过，另有 provider-cli.test.ts 的参数/目录/取消边界覆盖。
- Rust 测试 / 实机验收：无
- 变更与验证证据：`docs/changes/2026-09-24-provider-connectivity/{verification,remaining}.md`

## 当前能力

- 已真实可用（REAL）的子能力（逻辑层，带单测）：
  - 同一 ProviderConnection 渲染 Codex `config.toml` provider 块、Claude `settings.json`、OpenAI 兼容 env 三份目标配置，输出经 zod 校验且不含密钥明文。
  - 便携配置 v1 导出/导入/按 id 合并、cc-switch 风格 seed（name/baseUrl/model）导入适配。
  - `model[1M]/[200K]/[512k]/[1000000]` 后缀解析与剥离，生成 cc-switch 兼容 `model_catalog_json`。
  - MCP stdio 服务器持久化契约与命令白名单校验。
- Agent 侧 Codex Responses 配置合并、catalog 落盘与相对指针、apply/check，以及 Claude settings.json/apply-claude 已接入集成树。App UI/HTTP 尚未接线，未在真实 Codex/Claude 会话中验收，故保持 PARTIAL。
- 2026-09-26 复审修复：Codex 仅输出当前支持的 Responses 协议并把模型选择置于根级；Bash 环境导出不执行 URL 中的命令替换；stdio 配置解析拒绝凭据键/值；中文 seed 可生成不同 ID；catalog profile ID 不允许目录穿越。独立补审与最终 head 托管检查仍须完成。

## 差距与后端化

- “已实现但未验证/未接线”的点：渲染结果与真实 Codex/Claude 对拍；MCP stdio 客户端在 canvas-agent 接线；配置导入导出 UI；连接级 MCP 挂载。
- 变成 REAL 还缺什么：接线任务（Agent 配置生成、设置页、Gateway/Agent 消费）+ 真实运行证据 + DONE/PASS 账本任务。
- 外部依赖与阻断条件：Codex/Claude 版本字段兼容性需实跑确认；App 设置 UI、HTTP 配置入口与目标 CLI 消费仍需完成，不依赖旧 Gateway 分支才可合并本地配置模块。

## 变更记录

- 2026-09-27：TASK-PROV-003 从旧堆叠分支承接到已合入 #16 的主线；修正配置契约并复验中，状态保持 PARTIAL。

- 2026-09-24：创建卡片，状态 PARTIAL（TASK-PROV-002）。

- 2026-09-30：集成版本当前验证与剩余边界见 [落地验证](../changes/2026-09-29-project-landing/verification.md)。
