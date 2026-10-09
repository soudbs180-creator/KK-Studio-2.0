# Verification：kk 多平台模型能力闭环增量

- 日期：2026-10-10
- 分支：`feat/TASK-AI-GATEWAY-001-doubao-p1`
- 工作区：`D:/kk-studio/.worktrees/TASK-AI-GATEWAY-001-doubao-p1`
- 基线：`f04a8f8b`（豆包官方通道 P1）
- 当前提交：见交付时 `git rev-parse HEAD`

## 已执行

| 命令 | 结果 |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `node --test tests/unit/aiGatewayChannels.test.ts tests/unit/aiGatewayChatEndpoint.test.ts tests/unit/generationServerChatRoute.test.ts` | PASS，21 项 |
| `node --test tests/unit/agentImages.test.ts tests/unit/agentHost.test.ts tests/unit/modelMenuEntries.test.ts` | PASS，12 项 |
| 以上四组网关/Agent/模型回归合并执行 | PASS，30 项 |
| `node scripts/check-ui-standards.mjs` | PASS，215 文件、0 违规 |
| `node scripts/check-governance.mjs` | PASS，117 tasks、0 violations |
| `node node_modules/prettier/bin/prettier.cjs --check`（受影响源码/测试） | PASS |
| `node --test tests/unit/*.test.ts tests/deploy/*.test.mjs` | 903 项：893 PASS、2 FAIL、8 SKIP |

全量中的 2 个失败均为 `tests/unit/desktopAgentRuntime.test.ts`，原因是该隔离 worktree 没有已构建的 Agent `dist` 运行产物，失败发生在桌面 Agent 启动环境准备，与本次改动无 import 依赖；不能把它们记为全量通过。

## 功能证据

- 文本通道使用 `kind:"text"`，Ark 请求 `/chat/completions`，图片 `kind:"inline"` 被聊天端点拒绝为统一上游错误。
- `stream:true` 返回 `text/event-stream`，包含一帧 JSON delta 和 `data: [DONE]`；非流式响应保留 OpenAI envelope 并映射 usage。
- `/v1/models` 只输出 `id`、`owned_by`、`capabilities`，disabled/quarantined 通道不会出现在列表中；测试断言 baseUrl、credentialRef、endpoint mapping 不泄露。
- API 图片菜单主文案为完整模型 ID，family/variant 仅作次级信息；Codex 图片场景未把文本模型当成图片模型，原生图片事件缺型号时显示“图片模型未报告”。
- 归档资产 provenance、CanvasCollectionItem 和 DemoResult 均保存有效 `model`；Codex 的执行器仍以 provider 次级展示。

## 未验证和范围

- 未使用真实方舟 API key，未做真实出图/聊天联调；外部结果保持 `NOT VERIFIED`。
- 未实现网页 headless 登录、自动切号、绕过 CAPTCHA 或反爬；未接 sub2api 外部网关。
- SSE 当前为网关完成后的单帧 buffered SSE，不代表上游 token 级流式传输。
- 未新增顶层 UI 或账号管理台，继续复用 kk 的 ProviderConnection、模型目录、ModelPickerMenu 和 Design System。
