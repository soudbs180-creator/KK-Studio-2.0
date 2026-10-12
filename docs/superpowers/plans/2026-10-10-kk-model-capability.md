# KK 多平台模型能力闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 kk 代码上实现可插拔文本/图片能力闭环，让网关、Codex 和模型选择器传递真实能力与模型元数据。

**Architecture:** 继续以 ChannelRegistry/Scheduler 为唯一热路径，扩展 ChannelAdapter 的结果联合类型。Ark 在同一适配器内按操作调用官方 OpenAI 兼容端点；generation-server 只做薄 OpenAI façade。Codex 图片沿现有 Agent 事件和 asset provenance 传递 effectiveModel，缺失时显式未知。

**Tech Stack:** React 18, TypeScript strict, Node test runner, Zod, existing Vite/Tauri contracts.

**Spec:** `docs/superpowers/specs/2026-10-10-kk-model-capability-design.md`

## Global Constraints

- 复用现有 `credentialRef`、`ProviderConnection`、`ChannelRegistry`、`Scheduler`、generation-server，不新增账号池、队列或凭据存储。
- 凭据只允许通过 system credential/memory resolver；模型接口和日志不得包含 secrets、prompt 或 response 原文。
- Codex 图片上游未返回型号时只能显示“图片模型未报告”，不能显示 `Codex` 充当图片模型。
- UI 继续使用现有 ModelPickerMenu、settings detail/list 和 tokens；不新增顶层导航或第二套管理台。

## Review Focus

- 旧图片适配器仍返回 `inline` 图片时，chat 路径必须拒绝类型错配而不是解码乱码（Task 1/2）。
- `stream:true` 客户端必须收到标准 SSE 完成帧和 `[DONE]`，异常仍是 OpenAI 错误（Task 2）。
- `/v1/models` 不得泄露 baseUrl、credentialRef 或 secret（Task 3）。
- API 图片模型行主文案必须保留完整 ID/displayName，Codex 未报告型号必须进入未知状态（Task 4）。
- 旧 `generate` capability/测试夹具要继续可调度，新增 `chat` 不得改变既有图片路径（Task 1/2）。

---

### Task 1: 明确通道操作和文本结果契约

**Files:**
- Modify: `src/domain/providerConnections.ts`
- Modify: `src/features/ai-gateway/channels/adapter.ts`
- Modify: `src/features/ai-gateway/chat.ts`
- Test: `tests/unit/aiGatewayChatEndpoint.test.ts`
- Test: `tests/unit/aiGatewayChannels.test.ts`

**Interfaces:**
- `CapabilityManifest.operations` accepts `chat` while retaining `generate`.
- `GenerationInput.operation?: "chat" | "generate"`.
- `InlineTextResult = { kind: "text"; text: string; usage?: ... }`; `SubmitResult` is `InlineResult | InlineTextResult | SubmittedJob`.
- `runChatCompletion` only accepts text result and returns `{channelId,text,usage?}`.

- [ ] Write failing tests for a text result and for rejecting an image result in chat.
- [ ] Run `node --test tests/unit/aiGatewayChatEndpoint.test.ts` and observe failure.
- [ ] Implement the additive discriminated union and operation field; set chat input operation to `chat`, preserving legacy image tests.
- [ ] Run the targeted tests and confirm pass.
- [ ] Commit `feat: define text gateway result contract`.

### Task 2: Ark text path and buffered OpenAI SSE

**Files:**
- Modify: `src/features/ai-gateway/channels/doubao.ts`
- Modify: `src/features/ai-gateway/chat.ts`
- Modify: `src/features/generation-server/http.ts`
- Test: `tests/unit/aiGatewayChannels.test.ts`
- Test: `tests/unit/aiGatewayChatEndpoint.test.ts`

**Interfaces:**
- Ark `submit` branches on `input.operation === "chat"` and calls `${baseUrl}/chat/completions`; it returns `kind:"text"` after validating the upstream OpenAI response.
- `runChatCompletion` supports `{stream?:boolean}`; a buffered stream result is serialized by HTTP as `data: <delta>\n\n` then `data: [DONE]\n\n`.

- [ ] Add failing fetch fixtures for Ark chat success/error and SSE response.
- [ ] Run the tests and observe failure (current adapter calls image endpoint/current 501).
- [ ] Implement the branch, response validation, usage normalization, and HTTP SSE headers without changing non-stream response shape.
- [ ] Run gateway channel/endpoint tests and confirm pass.
- [ ] Commit `feat: add Ark chat and compatible SSE`.

### Task 3: Public model discovery endpoint

**Files:**
- Modify: `src/features/ai-gateway/channels/registry.ts`
- Modify: `src/features/generation-server/http.ts`
- Test: `tests/unit/aiGatewayChatEndpoint.test.ts`

**Interfaces:**
- `ChannelRegistry.publicModels()` returns `{id,owned_by,capabilities}` for enabled, non-quarantined registrations; it never returns baseUrl/credentialRef/mapping.
- `GET /v1/models` requires the existing app principal and returns `{object:"list",data:[...]}`; disabled/quarantined channels are omitted.

- [ ] Add failing registry/HTTP tests for model serialization and secret omission.
- [ ] Run tests and observe missing method/route.
- [ ] Implement the projection and route using existing auth/error handling.
- [ ] Run targeted tests and confirm pass.
- [ ] Commit `feat: expose safe OpenAI model discovery`.

### Task 4: Preserve actual image model metadata in picker and Codex archive

**Files:**
- Modify: `src/domain/modelSelection.ts`
- Modify: `src/features/models/modelMenuEntries.ts`
- Modify: `src/features/models/modelPresentation.ts`
- Modify: `src/features/agent/agentImages.ts`
- Modify: `src/features/agent/agentHost.ts`
- Modify: `vendor/canvas-agent/src/agentTypes.ts` and related normalization only if the upstream event exposes a model field
- Test: `tests/unit/modelMenuEntries.test.ts` (create if absent)
- Test: `tests/unit/agentImages.test.ts`
- Test: `tests/unit/agentHost.test.ts`

**Interfaces:**
- `ModelSelection` may carry `displayName` and `effectiveModel` as optional non-secret metadata.
- API image rows use exact `model.id`/verified displayName as the primary label; family is secondary.
- `generatedImageItems` recognizes optional `effectiveModel`; `importGeneratedImage` persists it into asset/model/result metadata. When absent, label is `图片模型未报告` and provider/executor remains secondary.

- [ ] Add failing tests for exact image model labels and unknown Codex image model state.
- [ ] Run tests and observe current family/Codex fallback failure.
- [ ] Implement additive metadata projection and existing UI labels with no new layout/tokens.
- [ ] Run targeted tests and existing model/agent regressions.
- [ ] Commit `feat: preserve image model provenance in UI and assets`.

### Task 5: Verification and delivery records

**Files:**
- Modify: `docs/features/feat-038-ai-model-gateway.md`
- Modify: `docs/features/features.registry.json`
- Modify: `docs/PROGRESS.md`
- Create: `docs/changes/2026-10-10-kk-model-capability/verification.md`

- [ ] Run `node node_modules/typescript/bin/tsc --noEmit`, targeted tests, `npm test`, `npm run ui:check`, and `npm run format:check`.
- [ ] Record exact worktree/base/head, test counts, browser/live credential limitation, and NOT VERIFIED external Ark/Codex evidence.
- [ ] Commit `docs: record kk model capability closure evidence`.
