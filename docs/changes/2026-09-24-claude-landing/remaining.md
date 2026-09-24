# TASK-PROV-004 remaining — 后续接线与依赖

- 日期：2026-09-24
- 承接：TASK-PROV-003 remaining；本批完成 Claude Code settings.json 落盘（agent 侧 + CLI）。以下为仍未做的部分。

## 依赖阻塞

1. **app→agent HTTP 端点（POST /providers/apply / apply-claude）**：server/http.ts 与 `feat/TASK-AGENT-006-workbuddy-gateway`（本地分支 @58377ab）同文件并发，等 TASK-AGENT-006 合入 main 后接线。
2. **宿主 env 注入闭环**：认证密钥（Codex `KK_STUDIO_*`、Claude `ANTHROPIC_AUTH_TOKEN`）由 Tauri 凭据库 → 启动 agent 进程 env；agent 子进程（codex app-server / claude CLI）已天然继承（claude.ts spawn 未传 env）。需在端点任务中接通，并验证 Windows shell 继承语义。

## 待做接线（无阻塞）

3. **聚合供应商**：故障转移/按请求轮转（显式 opt-in，复用 generation-server credit/quarantine/circuit；参考 CodexPlusPlus 聚合模式，AGPL 仅借鉴设计）。
4. **Chat Completions ↔ Responses 协议转换代理**：wire_api=responses 与 chat 互通，复用 gateway 管道。
5. **OpenAI 兼容 env 目标落盘**：目前仅 renderer 输出 export 语句；进程注入视目标工具（如 OpenCode/OpenClaw）接入时再落（可复用 Claude 的 JSON/原子写模式）。
6. **per-thread model_provider 注入（Codex）**：探明 app-server 是否支持 thread config 携带 model_provider/model。

## 对拍验证（外部依赖）

7. **Claude Code 真实消费对拍**：装有 Claude Code 的机器上确认 `settings.json` 的 `model` 与 `env.ANTHROPIC_BASE_URL` 被 CLI 识别（与 Codex 对拍同批）。
8. **Codex 真实消费对拍**（003 遗留）：model_catalog_json 相对指针 / env_key / wire_api 兼容性。
9. **TOML 完整解析器评估**（003 遗留）：复杂 TOML（多行字符串、内联表）与 kk_* 共存时的行为。

## 文档/治理

10. PR 合并顺序：#16（002）→ #17（003）→ #18（004）；合并时核对 vendor/canvas-agent/src/index.ts、package.json 是否被 TASK-AGENT-006 同时修改（三方核对）。
11. 独立上下文 review：#16/#17/#18 可在同一批由独立会话执行；结论回填各 review.md。
