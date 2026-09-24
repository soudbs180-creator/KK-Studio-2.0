# TASK-PROV-003 remaining — 后续接线与依赖

- 日期：2026-09-24
- 承接：TASK-PROV-002 remaining 中的「渲染产物真实消费（Codex 对拍与落盘）」与「catalog 指针注入」已由本批落地（agent 侧 + CLI）。以下为仍未做的部分。

## 依赖阻塞（必须先于对应接线）

1. **app→agent 的 HTTP 端点（POST /providers/apply）**：server/http.ts 与未合入的 `feat/TASK-AGENT-006-workbuddy-gateway`（本地分支 @58377ab，含 server/http.ts 改动）存在同文件并发修改，按「同一文件串行或分配唯一写入者」规则，须等 TASK-AGENT-006 合入 main 后再接线，或与 TASK-AGENT-006 协调分配写入者。

## 待做接线（无阻塞，可并行推进）

2. **设置页导入导出 UI**：便携配置 JSON（providerConfigIO v1）上传/下载 + 一键「应用到 Codex」（调用 agent 能力）。
3. **聚合供应商**：故障转移/按请求轮转（显式 opt-in，复用 generation-server 的 credit/quarantine/circuit），参考 CodexPlusPlus 聚合模式（AGPL，仅借鉴设计）。
4. **Chat Completions ↔ Responses 协议转换代理**：为 wire_api=responses 的供应商提供 chat 兼容（或反之），复用 gateway 管道。
5. **Claude settings.json / OpenAI env 落盘**：与 Codex 相同的保守合并模式，写入前先与目标工具版本对拍。
6. **per-thread model_provider 注入**：探明 Codex app-server 是否支持 thread config 携带 model_provider/model；若支持，可在 agent codex-client 会话层注入，免改用户全局配置。

## 对拍验证（外部依赖）

7. **Codex 真实消费对拍**：在装有 Codex CLI/app 的机器上：a) 确认 `model_catalog_json` 相对指针被识别；b) 确认 `env_key` 从环境注入成功；c) `wire_api` 字段与目标 Codex 版本兼容（TASK-PROV-002 相同主张）。对拍结果若需调整渲染/合并逻辑，回写本模块并补测。
8. **TOML 完整解析器评估**：当前为保守行级合并；若用户配置中出现多行字符串、内联表等复杂 TOML 且与 kk_* 表共存，需评估引入 TOML 解析依赖（vendor 包新增依赖需治理评审）。

## 文档/治理

9. TASK-PROV-002 PR 与 TASK-PROV-003 PR 的合并顺序：003 堆叠于 002，应先合 002（或同批处理）再合 003；合并时注意 vendor/canvas-agent/src/index.ts 与 package.json 若被 TASK-AGENT-006 同时修改，需三方核对。
