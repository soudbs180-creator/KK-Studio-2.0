# Intent：多供应商接入与多目标配置（Provider Connectivity）

- Task ID：TASK-PROV-002
- 状态：READY
- 日期与提出者：2026-09-24，用户（KK-Studio-2.0 维护者，当前位于日本）
- 请求来源：用户要求学习 CodexPlusPlus（github.com/BigPizzaV3/CodexPlusPlus）与 cc-switch（github.com/farion1231/cc-switch）的 API 管理 / MCP / 插件能力并优化本项目；原话摘要：“学习API管理能力，mcp，插件，帮助我的项目优化”“看那个合适都给我加入，我需要能够接入足够多的”。
- 用户授权范围与依据：用户明确授权将合适的“接入能力”加入项目。本次只实施范围内纯逻辑模块；聚合供应商、协议转换、MCP 接线等大改动登记为后续任务，不静默扩权。
- 关联账本、spec、plan：task-ledger.json TASK-PROV-002；docs/changes/2026-09-24-provider-connectivity/{spec,plan}.md

## 用户原意

保留原话范围：“我需要能够接入足够多的”。即：KK Studio 应能接入尽可能多的供应商（生成/模型 API）、尽可能多的 MCP 服务器，并且同一个 Provider 配置能复用到 Codex / Claude 等多款工具，而不是每个工具各自配一遍。

## AI 工程转译

1. **多目标渲染层**：同一 `ProviderConnection`（user_byok / managed_api）渲染为 Codex `config.toml` provider 块、Claude `settings.json`、OpenAI 兼容 env 三套目标配置。纯函数、无 I/O、无密钥输出，供后续 agent 接线消费。
2. **配置导入导出**：便携格式 v1（只含元数据与 `credentialRef` 占位，绝不写密钥），支持导出连接清单、按 id 合并导入、以及 cc-switch 风格 seed（name/baseUrl/model）导入适配。
3. **模型上下文窗口**：`model[1M]` / `[200K]` / `[512k]` / `[1000000]` 后缀解析与剥离，生成 cc-switch / CodexPlusPlus 兼容 `model_catalog_json`（context_window / max_context_window / auto_compact_token_limit=null），无后缀 no-op。
4. **MCP stdio 配置契约**：stdio 传输的持久化 schema + 命令白名单校验（安全基线），浏览器侧客户端保持 streamable_http 不变；agent 侧接线为后续任务。

## 目标与非目标

- 预期结果：4 个纯模块 + 对应单测 + 文档包 + 账本/功能卡登记，本地门禁（typecheck / unit tests / lint / ui:check / format / governance / features / markdown）通过。
- 包含范围：`src/features/providers/`（providerTargetRenderers、providerConfigIO）、`src/features/models/modelCatalogWindow.ts`、`src/features/mcp/mcpConfig.ts`、`tests/unit/*`、docs。
- 明确不包含：聚合供应商（故障转移/轮转，Gateway 服务端状态机改造）；Chat Completions↔Responses 协议转换代理；MCP stdio 客户端在 canvas-agent 的接线与连接级挂载；配置导入导出 UI；`model_catalog_json` 指针注入 Codex 配置落盘。以上登记为 remaining 后续任务。
- 受影响平台/模块：src/features（web/service 纯逻辑）、tests/unit、docs/features、docs/governance、docs/changes。
- 已有实现和规范来源：`src/domain/providerConnections.ts`、`src/features/models/modelCatalog.ts`、`src/features/mcp/mcpClient.ts`；CodexPlusPlus `docs/specs/2026-06-23-model-catalog-prototype-design.md`；cc-switch model catalog 格式（“抄 cc-switch template 思路”）。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| ---- | -------------- | ------------- | -------- |
| AC-1 | 一个 BYOK 连接能产出 Codex / Claude / OpenAI 兼容三份目标配置 | providerTargetRenderers 单测断言三份输出合法且不含密钥 | web/service |
| AC-2 | 配置可导出再导入，连接不丢、字段不变；密钥永不出现 | providerConfigIO round-trip 与拒绝用例单测 | web/service |
| AC-3 | `model[1M]` 显示为 1M 窗口、slug 不带后缀；catalog 字段兼容 cc-switch | modelCatalogWindow 单测 | web/service |
| AC-4 | MCP stdio 配置只接受白名单命令，拒绝 shell 元字符/注入 | mcpConfig 单测；浏览器 streamable_http 契约不变 | web/service |
| AC-5 | 门禁通过，无回归 | typecheck / node --test / lint / ui:check / format / governance / features / markdown | service |

## 假设、风险和决策

- FACT（直接证据）：providerConnections 已有 kind/baseUrl/credentialRef/model/capabilities；modelCatalog.ts 无 context_window 字段；mcpClient.ts transport 仅 streamable_http；main 基线 76339c9。
- INFERENCE（假设及风险）：Codex/Claude 对 provider 块/环境变量的精确字段随版本变化；渲染器只输出通用兼容形态，接线时对拍验证（风险可接受，纯函数不影响现有行为）。
- UNKNOWN / CONFLICT：cc-switch 的导出文件格式未公开为规范文档，seed 导入按“name/baseUrl/model”最小公共形态适配并校验。
- AI 自主决定的技术事项及理由：全部模块纯函数化、无 I/O，避免触碰 TASK-AGENT-006 在途文件；MCP stdio 契约先行定义但不在浏览器执行（浏览器无法 spawn 进程）。
- 必须由用户决定的产品语义/范围事项（无则写无）：无。
- 外部条件、费用或不可逆动作及已有授权：推送任务分支、后续 PR 走用户仓库既有流程；无付费、无外部服务调用。
- 不在本次范围的问题与账本 ID：聚合供应商 → remaining.md；协议转换 → remaining.md；MCP stdio 接线 → remaining.md（后续 TASK-MCP-002 候选）；catalog 指针注入 → remaining.md。
