# 多平台 AI 模型网关（FEAT-038）

- 状态：PROTOTYPE
- 领域：backend
- 最近更新：2026-10-09
- 关联任务：TASK-AI-GATEWAY-001

## 用户可见入口

- 无 UI 入口。`/v1/chat/completions` 仅在 `createGenerationServer({ chat })` 注入依赖时挂载，未注入时返回 404，既有部署行为不变。
- 豆包在 `ModelPickerMenu` 中**仍为置灰**：调度层可用了，但未接真实上游凭证，按「点了就报错」原则不解锁。

## 代码位置

- `src/features/ai-gateway/errors.ts`：11 类统一 errorClass 与分类规则
- `src/features/ai-gateway/credentials.ts`：凭证存储（端口注入，零 IO）
- `src/features/ai-gateway/channels/adapter.ts`：四方法适配器契约
- `src/features/ai-gateway/channels/registry.ts`：通道注册表与内存模型索引
- `src/features/ai-gateway/channels/doubao.ts`：火山方舟适配器
- `src/features/ai-gateway/scheduler.ts`：调度层（分档降级、冷却、粘性会话）
- `src/features/ai-gateway/chat.ts`：OpenAI 兼容端点逻辑
- `src/features/generation-server/http.ts`：`/v1/chat/completions` 路由挂载点
- 方案文档：`docs/ai-integration/kk-ai-gateway-architecture.md`

## 测试与证据

- 单测 47 项：`aiGatewayCredentials`(8) / `aiGatewayChannels`(11) / `aiGatewayScheduler`(15) / `aiGatewayChat`(9) / `aiGatewayChatEndpoint`(4)
- 连跑 3 轮零抖动（调度器测试注入固定 `random` 与 `now`）
- `tsc --noEmit` exit 0；`eslint` exit 0
- 回归验证：基线 814 tests / 20 fail → 加入后 861 tests / 20 fail，**零回归**
- 20 项基线失败为 git hook 与 Windows 安装器依赖项，与本功能无关

## 当前能力

- 通道抽象：新增平台是配置变更而非代码变更（四方法契约：submit/poll/probe/normalizeError）
- 失败分类：按信号优先级而非状态码分类。Ark 用同一个 400 同时表示「参数非法」与「内容审核拒绝」，只有响应体能区分
- 调度：分优先级档位降级、厂商冷却提示优先于本地退避、粘性会话、连续失败隔离
- 凭证：配置只存引用，明文由 vault 持有；适配器仅通过 `resolveSecret()` 闭包取用

## 三条不可违背约束

1. 客户端永不接触厂商 Endpoint ID 与凭证
2. 凭证只存一处，配置里只有 `credential_ref`
3. `capabilityManifest` 能力声明必须如实

## 重试铁律

- 流式请求一旦已发出首个 chunk，禁止任何重试（会产生重复内容）
- 不可重试错误直接中止整个 dispatch：内容审核/参数非法描述的是请求本身，换号只会重复被拒并累积风控信号

## 差距与后端化（Wave 3）

- **未接真实上游**：无 DPAPI `SecretProtector` 实现（需 Rust 侧或 PowerShell 桥），无真实凭证，任务保持 `TODO` / `NOT_VERIFIED`
- 调度层为纯内存状态，未接 generation-server 的 lease / dead-letter 持久化仓储
- 未接 sub2api-client（传 `session_id` header；注意 Nginx 需 `underscores_in_headers on;`）
- `stream: true` 返回 501，未实现 SSE
- 异步通道走 `/v1/jobs`，chat 端点遇 `submitted` 返回 409

## 已知陷阱（重建时踩过）

- `DispatchOutcome` 必须用 `type` 别名而非 `interface`：interface 会展平 `SubmitResult` 联合类型，`kind` 与 `assetBase64` 全部消失
- 调度器 `poll()` 必须经 `credentialRefFor()` 取凭证；误传 `channelId` 会让每次轮询都 `AUTH_INVALID`
- `LayeredCredentialStore` 的 read/delete 不可用 `??` / `||` 短路，否则另一层残留副本会在下次读取时复活
- 厂商 `cooldownMs` 不得被本地 `maxCooldownMs` 截断，否则 6 小时额度耗尽会变 30 分钟后重试
- `x.repeat(200)` 这类无分隔长串应判为 secret 而非 malformed，顺序反了会藏起「把密钥写进配置」的真问题

## 变更记录

- 2026-10-09：创建卡片。P0 凭证存取 + P1 调度层 + `/v1/chat/completions` 端点建成，47 项单测全绿，状态 PROTOTYPE（未接真实上游，不可标 DONE）。
