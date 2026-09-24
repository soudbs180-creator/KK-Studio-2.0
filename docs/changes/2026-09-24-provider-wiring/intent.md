# TASK-PROV-003 intent — Codex Provider 配置注入与 model catalog 落盘（agent 侧）

- 日期：2026-09-24
- 任务：TASK-PROV-003（依赖 TASK-PROV-002，堆叠分支 feat/TASK-PROV-003-provider-wiring）
- 归属功能：FEAT-030 多供应商接入与多目标配置（PARTIAL）

## 为什么做

TASK-PROV-002 产出了纯逻辑层（多目标渲染、配置导入导出、model catalog 生成、MCP stdio 契约），但 Agent 还不能真实消费：Codex 的 provider 路由（`model_providers` / `model_catalog_json`）不在 per-thread `config` 参数支持范围内（该参数承载 mcp_servers 等，model provider 走文件级配置），因此要让 KK Studio“接入足够多的供应商”，必须把渲染产物落进 Codex 真实配置文件并写入 catalog 指针。这是 remaining.md 登记的“渲染产物真实消费（Codex config.toml 对拍与落盘）”与“model_catalog_json 相对路径指针注入”两项。

## 目标

1. Agent（vendor/canvas-agent，MIT）新增 Codex 配置注入能力：一个 ProviderConnection 集合 → 合并进 `CODEX_HOME || ~/.codex/config.toml`，并写入 `model-catalogs/<profileId>.json` 与相对路径指针。
2. 保守合并：只管理 `kk_*` 前缀的 `[model_providers.*]` 表与显式指定的顶层键（`model_provider`/`model`/`model_catalog_json`），用户的既有配置（注释、其他 provider、其他键）逐字节保留。
3. 密钥纪律不变：注入产物只含 `env_key`（环境变量名），绝不写密钥明文；文件权限 0600/0700。
4. 提供 Node CLI 入口（`providers apply` / `providers check`），app→agent 的 HTTP 端点因与 TASK-AGENT-006 存在同文件冲突而登记为后置依赖。

## 边界（不做）

- 不写 Claude settings.json / OpenAI env（本批仅 Codex 文件级注入；多目标落盘按目标工具逐步对拍）。
- 不在本批接 HTTP 端点（server/http.ts 与未合入的 TASK-AGENT-006 冲突，合并后另行接线）。
- 不做聚合供应商、协议转换、per-thread model_provider 注入（需 Codex app-server 支持性对拍）。
- 不引入 TOML 解析依赖：采用保守的行级合并，覆盖目标工具实际使用的键；对拍与完整 TOML 解析器留待接线验证任务。

## 成功标准

- 空文件/含注释/含用户自定义 provider/含历史 kk_* 表四类输入合并结果可预期且可测（单测覆盖）。
- 幂等：同一输入应用两次结果一致。
- 输出绝不含密钥形态文本（复用 TASK-PROV-002 防线模式）。
- CLI 在本机真实目录可跑通（验证记录真实路径与结果）。
