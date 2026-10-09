# Verification：kk 多平台模型能力闭环增量

- 日期：2026-10-10
- 当前分支：`docs/TASK-DOCS-STRUCT-001`
- 当前 HEAD：`2da627e7dbae302de31f07ef00697dd8372c8dda`
- 合并提交：`1c244bb34a5f82cd1d4b608fa8cefcf915501bc4`
- 远端基线：`origin/main`=`8090475958f1a0bdd1b4b36ada7f2aba1e4e6264`

## 已执行

| 命令 | 结果 |
| --- | --- |
| `node --test tests/unit/*.test.ts tests/deploy/*.test.mjs` | PASS，908 项：900 PASS、0 FAIL、8 SKIP |
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

## 浏览器证据

- `tests/browser/frontend.spec.ts`：16/16 通过，串行运行于 `KK_TEST_PORT=1425`。
- `tests/browser/connection-drag.spec.ts`：7/7 通过，串行运行于 `KK_TEST_PORT=1424`。

## 未验证和范围

- 未使用真实方舟 API key，未做真实出图/聊天联调；外部结果保持 `NOT VERIFIED`。
- 未实现网页 headless 登录、自动切号、绕过 CAPTCHA 或反爬；未接 sub2api 外部网关。
- SSE 当前为网关完成后的单帧 buffered SSE，不代表供应商 token 级流式传输。
- 真实 Codex 凭据、DPAPI SecretProtector、远端 ruleset 和生产发布未验证。
