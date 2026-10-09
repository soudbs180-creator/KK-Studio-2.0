# Verification：kk 多平台模型能力闭环增量

- 日期：2026-10-10
- 当前分支：`docs/TASK-DOCS-STRUCT-001`
- 验证代码 HEAD：`fb749157c91f06d11bda0f3faf5062805d2b8f9d`
- 合并提交：`1c244bb34a5f82cd1d4b608fa8cefcf915501bc4`
- 远端基线：`origin/main`=`8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`

## 已执行

| 命令 | 结果 |
| --- | --- |
| `node --test tests/unit/*.test.ts tests/deploy/*.test.mjs` | PASS，911 项：903 PASS、0 FAIL、8 SKIP |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `node node_modules/eslint/bin/eslint.js src tests scripts --max-warnings 0` | PASS |
| Prettier `--check` | PASS |
| `node scripts/check-ui-standards.mjs` | PASS，215 文件、0 违规 |
| `node scripts/check-governance.mjs` | PASS，117 tasks、0 violations |
| `node scripts/check-features.mjs`、`node scripts/check-markdown.mjs` | PASS，36 features、114 Markdown files、0 violations |
| `node scripts/platform-versions.mjs check` | PASS |
| `node node_modules/typescript/bin/tsc -b` + Vite production build | PASS |
| `node scripts/check-delivery.mjs --base 8090475958f1a0bdd1b4b36ada7f2aba1e4e6264 --head 2da627e7dbae302de31f07ef00697dd8372c8dda` | PASS，0 violations |

## 功能证据

- 文本通道使用 `kind:"text"`，Ark 请求 `/chat/completions`；图片 `kind:"inline"` 被聊天端点拒绝为统一上游错误。
- `stream:true` 返回 `text/event-stream`，包含一帧 JSON delta 和 `data: [DONE]`；非流式响应保留 OpenAI envelope 并映射 usage。
- `/v1/models` 只输出 `id`、`owned_by`、`capabilities`，disabled/quarantined 通道不会出现在列表中，且不泄露 baseUrl、credentialRef 或 vendor endpoint mapping。
- API 图片菜单显示完整模型 ID；Codex 图片场景不把文本模型当成图片模型，原生图片事件缺型号时显示“图片模型未报告”。
- 归档资产 provenance、CanvasCollectionItem 和 DemoResult 均保存有效 `model`。
- Codex 发送前会把持久化选择器和项目模型名过滤到当前 Agent 返回的模型列表，未知值回退默认模型；模型选择定向回归 26/26。

## 浏览器证据

- `tests/browser/frontend.spec.ts`：16/16 通过，串行运行于 `KK_TEST_PORT=1425`。
- `tests/browser/connection-drag.spec.ts`：7/7 通过，串行运行于 `KK_TEST_PORT=1424`。

## 真实 KK → Codex 联调证据（2026-10-10）

- 使用本机已登录的 Codex ChatGPT 账号，通过本地 Agent 与 KK 浏览器工作区建立连接；界面显示 `Codex 主 Agent · 已连接`。
- 文本调用：选择 `GPT-6-Astra Codex · 已登录账号` 后，KK 对话收到预期固定文本，证明 KK → Agent → Codex → KK 回执链路可用。
- 图片调用：Codex 内置图片生成返回 PNG，并实际回写当前画布；图片卡片显示 `图片模型未报告`，来源显示 `Codex 内置生图`，没有把 `Codex` 冒充为图片模型名。
- 画布操作：通过 `canvas_apply_ops` 新增文本节点，内容为 `Codex 画布操作验证`；随后再次通过 Codex 只读读取当前画布并确认该节点存在。
- 账号与模型发现：本机 Agent 返回六个可用 Codex 模型，包含 GPT-6-Astra、GPT-6-Sol、GPT-6-Luna、GPT-5.6-Sol、GPT-5.6-Terra、GPT-5.6-Luna。
- 首次联调发现的问题已修复并复验：不显式选择模型时，KK 原先会沿用本机旧配置 `gpt-6.1-sol` 并返回 400；现在发送前会按 Agent `/models` 列表校验，实测自动回退到 `gpt-6-astra`，默认文本调用成功。无效的项目图片模型也不会再传给 Codex 推理接口。

## 未验证和范围

- 未使用真实方舟 API key，未做真实出图/聊天联调；外部结果保持 `NOT VERIFIED`。
- 未实现网页 headless 登录、自动切号、绕过 CAPTCHA 或反爬；未接 sub2api 外部网关。
- SSE 当前为网关完成后的单帧 buffered SSE，不代表供应商 token 级流式传输。
- 本次使用本机已登录 Codex 账号完成了真实 KK 联调；DPAPI SecretProtector、远端 ruleset 和生产发布仍未验证。运行时仍提示 bundled Codex `0.155.1` 与本机 `0.162.0` 版本不一致。
