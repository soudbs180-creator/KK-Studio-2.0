# 遗留清单：多供应商接入与多目标配置（TASK-PROV-002）

本批交付逻辑层能力；以下为明确未承诺/后续接线项（按 BRANCH-POLICY 登记，不静默扩权）。

## 接线与消费（后续任务候选）

1. **渲染产物真实消费**：Codex `config.toml` provider 块 / Claude `settings.json` / OpenAI 环境变量的写入与注入；渲染字段与目标工具版本对拍（Codex wire_api、Claude ANTHROPIC_BASE_URL 兼容性）。
2. **model_catalog_json 指针落盘**：按 CodexPlusPlus spec 思路，把 `renderModelCatalogJson` 产物写入 `model-catalogs/<profile>.json` 并注入 `model_catalog_json` 相对路径指针；保留用户手写指针不覆盖；无后缀 no-op。
3. **MCP stdio 执行接线**：`mcpConfig.ts` 契约接入 Node 侧（canvas-agent/网关）：按白名单 spawn、env 密钥从系统凭据库解析、`mcpServerConfigV2` 持久化（新存储 key，不破坏 `kk-studio-next:mcp-servers:v1`）；连接级 MCP 挂载。
4. **配置导入导出 UI**：设置页导入/导出便携 v1 文件与 cc-switch 风格 seed；凭据走系统凭据库（service `com.kkstudio.provider`），文件永不落密钥。
5. **聚合供应商（P1 候选）**：故障转移 / 按会话 / 按请求 / 权重轮转；复用 Gateway 的 credit/quarantine/circuit/connection_acl，显式 opt-in 的 managed 能力，不破坏“不自动跨账户切换”的隔离语义。
6. **协议转换代理（P2 候选）**：Chat Completions ↔ Responses（参考 CodexPlusPlus 本地代理思路，AGPL 仅借鉴设计不搬代码）。

## 验收边界

- 以上任何一项未完成前，FEAT-030 保持 PARTIAL，不宣称“已接入足够多供应商/工具”为 REAL。
- 渲染/导入导出仅在本模块单测内验证；真实第三方工具消费属于接线任务证据。
