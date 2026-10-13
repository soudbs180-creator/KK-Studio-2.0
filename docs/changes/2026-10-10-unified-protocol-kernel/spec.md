# 统一协议接入层（Unified Protocol Kernel）

- 状态：DESIGN PROPOSAL
- 领域：backend / architecture
- 日期：2026-10-10
- 关联：`docs/features/feat-038-ai-model-gateway.md`（FEAT-038）
- 目标读者：接入层维护者、桌面端接线人

---

## 0. 结论摘要

当前混乱不是"供应商太多"，而是**接入层存在两套互不相通的契约**（前端 `GenerationProviderAdapter` 与后端 `ChannelAdapter`），且二者都只实现了 OpenAI 一种协议。用户每接一个新来源都要回答三个问题：base URL 带不带 `/v1`、请求体按哪种方言写、错误算谁的。这三个问题本应由网关回答。

本设计引入 **Protocol Kernel**：一个规范中间表示（Canonical IR）+ 三个协议编解码器（OpenAI / Anthropic / Google）。用户只填 `baseUrl` + `apiKey` + `model` 三项，协议方言、路径前缀、鉴权头、流式帧格式、错误分类全部由 Kernel 内部消化。

**重要澄清**：题目中"以三种协议作为内部标准"如果实现为三套并行内部方言，会产生 3×3=9 条转换路径，比现状更乱。本文采用**单一规范 IR + 3 个编解码器**（1 条内部路径 + 3 进 3 出），三种协议是 IR 的**外部投影**，不是三个内部标准。

---

## 1. 必须先修的既存缺口

以下 4 处是当前实现的实际缺陷，不是新增设计。不先修，接入新协议会踩在同一个坑上。

| # | 缺口 | 位置 | 后果 |
|---|---|---|---|
| G1 | `openai_compatible` 已声明但零实现 | `src/features/ai-gateway/channels/adapter.ts:13` | 唯一可用于中转站的 `ChannelKind` 是空壳，通用兼容无法落地 |
| G2 | `doubaoAdapter` 从未在生产注册 | `channels/doubao.ts`，`registerAdapter(` 生产零调用点 | 调度层有豆包通道但无适配器，链路断开 |
| G3 | `createGenerationServer` 未注入 `chat` 依赖 | `src/features/generation-server/main.ts:97` | `/v1/models` 与 `/v1/chat/completions` 在生产**恒返回 404** `CHAT_NOT_ENABLED`（`http.ts:144,154`） |
| G4 | 前端适配器靠字符串匹配分发 | `src/integrations/generation/providerAdapterFactory.ts:18-23` | `provider.includes("gemini")` 判定协议；未匹配但含 image 模态的一律落到 `OpenAiImageAdapter`，Gemini 官方与聚合网关同名时行为不可预测 |

补充缺陷（非阻塞，但影响要求 1 的实现）：

- **对话被压平**：`chat.ts:111` 的 `buildPrompt()` 把多轮消息拼成 `[User]\n…\n\n[Assistant]\n…` 单个字符串。工具调用、system 隔离、原生多轮语义在此处已不可恢复——**要求 1 的"统一工具调用"必须先把 IR 换成结构化消息数组**。
- **流式是假的**：`http.ts:169-192` 的 `stream:true` 是单次 buffered SSE，首字节延迟等于完整响应延迟。要求 1 的"统一流式输出"目前只在形式上满足。
- **两套契约并存**：前端 `GenerationProviderAdapter`（7 方法）与后端 `ChannelAdapter`（4 方法）方法集不重叠，是同一概念的两份定义。

---

## 2. 分层结构

```
┌─ L0 用户配置层 ────────────────────────────────────────────┐
│  ConnectionProfile: { baseUrl, apiKey?, model }            │
│  用户唯一接触的界面；不含协议、不含鉴权方式、不含路径前缀     │
└────────────────────────┬───────────────────────────────────┘
                         ▼
┌─ L1 接入层 ProtocolResolver ───────────────────────────────┐
│  · URL 规范化（消除 /v1 歧义）                             │
│  · 协议探测（DialectProbe，带缓存与超时）                   │
│  · capabilityManifest 合成                                 │
│  输出：ResolvedEndpoint { baseUrl, dialect, authStyle }    │
└────────────────────────┬───────────────────────────────────┘
                         ▼
┌─ L2 规范层 Protocol Kernel（Canonical IR） ────────────────┐
│  CanonicalRequest / CanonicalResponse / StreamEvent        │
│  ToolCall / CanonicalError                                 │
│  ★ 唯一内部表示，所有协议进出必须经过此层                   │
└──────┬──────────────┬──────────────┬──────────────────────┘
       ▼              ▼              ▼
┌─ L3 编解码层 Codec（3 个，互不依赖） ───────────────────────┐
│  OpenAICodec    AnthropicCodec    GoogleCodec              │
│  IR ⇄ wire      IR ⇄ wire         IR ⇄ wire                │
└────────────────────────┬───────────────────────────────────┘
                         ▼
┌─ L4 调度层 Scheduler（已存在，扩展点） ─────────────────────┐
│  分档降级 / 冷却 / 隔离 / 粘性会话 / 多 Key 轮换            │
└────────────────────────┬───────────────────────────────────┘
                         ▼
┌─ L5 通道层 ChannelAdapter（已存在） ────────────────────────┐
│  doubao / openai_compatible / 本地 ComfyUI                  │
│  只负责：厂商特有模型 ID 解析、异步任务轮询                  │
└────────────────────────┬───────────────────────────────────┘
                         ▼
┌─ L6 传输层 fetch / canvas-proxy / Tauri ────────────────────┐
│  credentials:"omit", redirect:"error", AbortSignal.timeout  │
└────────────────────────────────────────────────────────────┘
```

关键约束：**L2 之下不得出现协议方言**。任何厂商适配器都不得直接构造 wire 格式，只能操作 IR。

---

## 3. 接口定义

### 3.1 协议标识

```ts
export type Dialect = "openai" | "anthropic" | "google";

export type AuthStyle =
  | { kind: "bearer" }                                  // Authorization: Bearer <key>
  | { kind: "bearer"; extraHeaders: Record<string,string> } // Anthropic 需 anthropic-version
  | { kind: "query_key"; param: string }                 // Google: ?key=<key>
  | { kind: "none" };                                    // 本地 ComfyUI
```

### 3.2 规范中间表示（Canonical IR）

替换现有 `GenerationInput`。核心变化：**消息是结构化数组，不是拼接字符串**。

```ts
// ── 内容块 ──
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mime: string; data: Uint8Array | string /*url*/ }
  | { type: "audio"; mime: string; data: Uint8Array | string }
  | { type: "file"; mime: string; name: string; data: Uint8Array | string };

// ── 工具定义 ──
export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: JsonSchema;        // JSON Schema 2020-12 子集
}

export type ToolChoice =
  | { mode: "auto" } | { mode: "any" } | { mode: "none" }
  | { mode: "tool"; name: string };

// ── 消息 ──
export type CanonicalMessage =
  | { role: "system"; content: ContentBlock[] }
  | { role: "user"; content: ContentBlock[] }
  | { role: "assistant"; content: ContentBlock[]; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: ContentBlock[] };

// ── 请求 ──
export interface CanonicalRequest {
  model: string;                  // kk 模型名（未解析）
  messages: CanonicalMessage[];
  tools?: ToolSpec[];
  toolChoice?: ToolChoice;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  stream: boolean;
  seed?: number;
  /** 会话粘性：同一 sessionId 优先命中同一通道 */
  sessionId?: string;
  idempotencyKey: string;
  /** 非文本模态的附加参数，原样透传给厂商 */
  passthrough?: Record<string, unknown>;
  attachments: AttachmentInput[];
}

// ── 工具调用 ──
export interface ToolCall {
  id: string;
  name: string;
  /** 增量累积；complete=false 时仅含部分 JSON 片段 */
  argumentsDelta: string;
  complete: boolean;
}

// ── 响应（单次） ──
export type CanonicalResponse =
  | { kind: "text"; text: string; usage?: Usage; finishReason: FinishReason }
  | { kind: "toolCalls"; toolCalls: ToolCall[]; usage?: Usage; finishReason: FinishReason }
  | { kind: "asset"; assetBase64: string; mime: string; usage?: Usage }
  | { kind: "submitted"; providerJobId: string; pollAfterMs?: number };

// ── 流式事件（统一 SSE 帧的内部形态） ──
export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call_start"; index: number; id: string; name: string }
  | { type: "tool_call_delta"; index: number; argumentsDelta: string }
  | { type: "tool_call_end"; index: number }
  | { type: "usage"; usage: Usage }
  | { type: "done"; finishReason: FinishReason }
  | { type: "error"; error: CanonicalError };

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;   // Anthropic prompt caching；OpenAI 无对应字段 → 置 undefined
  totalTokens?: number;
}

export type FinishReason =
  | "stop" | "length" | "tool_call" | "content_filter" | "error";

// ── 规范错误 ──
export interface CanonicalError {
  errorClass: ErrorClass;       // 复用 errors.ts 现有 11 类，零新增
  httpStatus: number;
  retryable: boolean;
  cooldownMs?: number;
  detail?: string;
  providerCode?: string;        // 厂商原始 code，用于排障
  channelId?: string;
}
```

### 3.3 编解码器契约

```ts
export interface ProtocolCodec {
  readonly dialect: Dialect;

  /** 构造请求。endpoint 已由 ProtocolResolver 规范化，此处不再拼 baseUrl。 */
  encodeRequest(req: CanonicalRequest, auth: AuthHeader): {
    url: string;
    method: "POST";
    headers: Record<string, string>;
    body: string;
  };

  /** 解析非流式响应。异常必须已被归一化为 CanonicalError。 */
  decodeResponse(body: unknown): CanonicalResponse;

  /** 解析流式。yield 规范事件，禁止向上暴露厂商帧格式。 */
  decodeStream(body: ReadableStream<Uint8Array>): AsyncIterable<StreamEvent>;

  /** 把厂商 HTTP 失败映射为规范错误。 */
  decodeError(status: number, body: unknown): CanonicalError;

  /** 该方言的模型目录拉取（可选，不支持则回落 capabilityManifest 静态声明）。 */
  fetchModels?(endpoint: ResolvedEndpoint, auth: AuthHeader): Promise<ModelInfo[]>;
}
```

三个实现：`openaiCodec.ts` / `anthropicCodec.ts` / `googleCodec.ts`。它们**互相不引用**，只依赖 IR。

### 3.4 通道适配器（扩展现有契约）

现有 `ChannelAdapter` 保留，但职责收窄——协议相关的全部移交给 Codec：

```ts
export interface ChannelAdapter {
  readonly provider: string;
  readonly kind: ChannelKind;              // 新增 "aggregator"
  readonly dialects: readonly Dialect[];   // 该通道支持哪些协议（通常 1 个）

  /** 仅解析厂商模型 ID（如 Ark 的 ep- 前缀）。协议无关。 */
  resolveModel(context: ChannelContext, model: string): string;

  submit(ctx, ir: CanonicalRequest, req: ChannelRequestContext): Promise<CanonicalResponse>;
  poll(ctx, providerJobId, req): Promise<PollState>;
  probe(ctx, req): Promise<ProbeResult>;
  normalizeError(raw: unknown): CanonicalError;
  readonly asyncTasking?: boolean;
}
```

`doubao.ts` 的 `ENDPOINT_PATTERN`（`^ep-…`）从"阻碍通用兼容的硬编码"降级为**通道特有逻辑**——它本就该属于通道层，而非协议层。

---

## 4. 配置模型

### 4.1 用户侧（L0，唯一可见）

```ts
export interface ConnectionProfile {
  version: 1;
  baseUrl: string;              // 必填。允许不带 /v1，Resolver 负责补全
  apiKey?: string;              // 选填。本地 ComfyUI 等无鉴权场景
  model: string;                // 必填。可留空并由"测试连接"填充
  displayName?: string;
}
```

**删除** `modelProviderSchema` 中对供应商语义的隐含假设（当前 `DEFAULT_MODEL_PROVIDER.name = "OpenAI 兼容 API"` 直接把协议写死进默认值）。

### 4.2 解析结果（缓存，不持久化）

```ts
export interface ResolvedEndpoint {
  /** 已含正确的版本前缀，codec 直接使用 */
  baseUrl: string;
  dialect: Dialect;
  authStyle: AuthStyle;
  capabilities: CapabilityManifest;
  /** 探测时间与来源，用于失效重探 */
  probedAt: number;
  probeSource: "user_hint" | "probe" | "preset";
}
```

`ResolvedEndpoint` **不持久化到 SQLite**，只进内存缓存 + localStorage（无敏感信息）。探测结果随上游变化，允许手动"重新探测"。

### 4.3 通道配置（后端，扩展现有 schema）

`schema.sql` 的 `gateway_connections` 增两列：

```sql
ALTER TABLE gateway_connections ADD COLUMN dialect TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE gateway_connections ADD COLUMN credential_slot INTEGER NOT NULL DEFAULT 0;
```

> `metadata_json` 已可容纳 `capabilities` / `modelMapping` / `dialect`，无需新建表。

### 4.4 预置列表（消除 `/v1` 猜测）

```ts
export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  { id: "doubao-ark",      label: "豆包（火山方舟）",  baseUrl: "https://ark.cn-beijing.volces.com/api/v3", dialectHint: "openai" },
  { id: "aipai",           label: "AI派（聚合）",     baseUrl: "https://aipaiai.cn",                        dialectHint: "openai" },
  { id: "anthropic",       label: "Anthropic 官方",  baseUrl: "https://api.anthropic.com",                 dialectHint: "anthropic" },
  { id: "google-gemini",   label: "Google Gemini",   baseUrl: "https://generativelanguage.googleapis.com", dialectHint: "google" },
  { id: "local-comfyui",   label: "本地 ComfyUI",    baseUrl: "http://127.0.0.1:8188",                     dialectHint: "openai" },
];
```

`dialectHint` 只是**探测起点**，不锁死协议。

---

## 5. 要求逐条对应

### 要求 1：三协议统一请求/响应/流式/工具/错误

| 维度 | 统一方式 | 差异处理 |
|---|---|---|
| 请求 | `CanonicalRequest` 结构化消息数组 | 各 codec 自行映射字段名与角色合并规则 |
| 响应 | `CanonicalResponse` 四分支联合 | — |
| 流式 | `StreamEvent` 七类事件 | Anthropic 的 `content_block_*` 与 OpenAI 的 `delta` 归一到同一事件集 |
| 工具调用 | `ToolSpec`（JSON Schema）+ `ToolCall` 增量 | OpenAI 的 `tool_calls` 与 Anthropic 的 `tool_use` 归一；Google 的 `functionCall` 需 JSON 反序列化 |
| 错误 | `CanonicalError` 复用现有 11 类 `ErrorClass` | **不新增错误分类**，各 codec 的 `decodeError` 只做映射 |

**已知无法完全对齐的部分（必须显式承认）**：

| 特性 | 差异 | 处理 |
|---|---|---|
| `cachedInputTokens` | OpenAI 无对应字段 | 置 `undefined`，UI 不显示；不伪造为 0 |
| 强制工具选择 | OpenAI 无 `any` 语义 | 降级为 `auto`，并在 `CanonicalResponse` 附 `degraded: ["tool_choice"]` |
| 系统消息位置 | Gemini 不允许 system role | 合并为首条 user 内容，标注降级 |
| 思考/推理内容 | 三家字段名与结构不同 | 统一为 `reasoning_delta` 事件；不支持的 codec 不产出该事件 |
| 流式 usage | OpenAI 需 `stream_options.include_usage` | codec 自行补参数；不返回则 usage 为 undefined |

### 要求 2：三字段开箱即用

用户填写流程：

```
① 选预置或填 baseUrl  →  ② 填 API Key（本地可空）  →  ③ 点「测试连接」
                                                                    │
                            ┌───────────────────────────────────────┘
                            ▼
                  ProtocolResolver.resolve()
                    1. 规范化 URL（补/去 /v1）
                    2. DialectProbe 依次试探三个协议
                    3. GET {base}/models 验证并拉取模型目录
                    4. 合成 capabilityManifest
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ✅ 一致              ⚠️ 部分              ❌ 失败
   直接可用          模型目录可用但       明确报错 + 可切换
                    缺流式/工具能力      协议手动指定
```

**中转站开箱即用**的前提：DialectProbe 能识别标准形态。对 aipaiai 这类站，`GET https://aipaiai.cn/v1/models` 返回 `{object:"list", data:[…]}` 即可判定 `openai`。

### 要求 3：适配范围与限制

| 能力 | OpenAI | Anthropic | Google | 说明 |
|---|:--:|:--:|:--:|---|
| 文本生成 | ✅ | ✅ | ✅ | 全覆盖 |
| 真流式 | ✅ | ✅ | ✅ | 需替换现有 buffered 实现 |
| 工具调用（单轮） | ✅ | ✅ | ✅ | |
| 工具调用（并行多轮） | ✅ | ⚠️ | ⚠️ | Anthropic 需在 assistant 消息回填 `tool_use` |
| 结构化输出 | ✅ | ⚠️ | ✅ | Anthropic 走 tool 模拟，降级 |
| 图像输入 | ✅ | ✅ | ✅ | |
| 图像生成 | ✅ | ❌ | ⚠️ | Anthropic 无原生生图；需经 L5 通道 |
| 视频/音乐生成 | ❌ | ❌ | ❌ | **三者均不覆盖** → 只经 L5 通道，不进 Codec |
| Prompt 缓存计量 | ⚠️ | ✅ | ❌ | |
| Web 搜索等内置工具 | ⚠️ | ⚠️ | ✅ | 归一为 `ToolSpec` 的厂商扩展位 |

**明确的限制**（不试图掩盖）：

1. **视频与音乐不进 Kernel**。Seedance / Suno 的任务式异步 API 与三种文本协议正交，塞进 Codec 会污染 IR。它们只经 L5 通道，Kernel 对其只做 `kind:"submitted"` 透传。
2. **取消能力不统一**。三协议均无通用 cancel；已取消的任务只由本地 lease 表标记。
3. **模型名不做跨协议自动翻译**。`claude-3` 在 OpenAI 兼容端不可用——这属于 L4 降级，不属于 L2 转换。
4. **未知扩展字段不透传**。IR 里没有的字段一律丢弃（避免把厂商私有参数泄漏到其他通道）。

### 要求 4：鉴权与登录流程

**两套鉴权必须严格分离**（现有代码已做对，沿用）：

| 层 | 凭据 | 存放 | 生命周期 |
|---|---|---|---|
| 应用访问 | `kk_session` / 应用令牌 | SHA-256 哈希（`http.ts:46`），Cookie HttpOnly | 会话级 |
| 厂商密钥 | 上游 API Key | Windows Credential Manager（service `com.kkstudio.provider`） | 长期 |
| 浏览器 BYOK | 上游 API Key | 仅内存 Map，**刷新即失** | 页面级 |

**配置中永不出现明文密钥**：`credentialRef` 有正则约束 `^[A-Za-z0-9_-]+$`（`providerConnections.ts:89`），且 `credentials.ts:45` 的 `SECRET_PATTERN` 会拒绝把裸 key 当引用写入。这两道防线保留。

**多 Key 轮换**（新增）：

```ts
export interface CredentialSlot {
  ref: string;                    // → vault
  weight: number;
  state: "active" | "cooldown" | "quarantined";
  cooldownUntil?: number;
  lastFailureClass?: ErrorClass;  // 决定冷却时长
}
```

轮换规则：

| 失败分类 | 对该 Key 的处置 | 是否换 Key 重试 |
|---|---|---|
| `AUTH_INVALID` | 立即 `quarantined` | ✅ 是 |
| `QUOTA_EXHAUSTED` | 冷却 6h（取厂商 `cooldownMs`） | ✅ 是 |
| `RATE_LIMITED` | 冷却 60s | ✅ 是 |
| `ENDPOINT_STALE` | 不动 Key（是配置问题） | ❌ 否，直接报配置错 |
| `CONTENT_BLOCKED` / `BAD_REQUEST` | 不动 Key | ❌ 否（现有铁律） |

**已发出首个流式 chunk 后禁止一切重试**（现有铁律，`scheduler.ts:11`），新增多 Key 不放宽此约束。

**会话持久化**：

| 环境 | 凭据 | 目录 | 加密 |
|---|---|---|---|
| 桌面 | Credential Manager | `com.kkstudio.provider` | DPAPI |
| 桌面（配置） | 仅 `credentialRef` | `%APPDATA%\kk-studio\providers\` | 无需 |
| Web | 仅内存 | — | 刷新即失 |
| 托管部署 | 环境变量注入进程 | `config.credentialEnv` | 进程退出即清 |

`schema.sql` 末尾的注释（"Provider credentials, refresh tokens… are deliberately absent"）必须保持。

### 要求 5：降级策略

**降级链**（按序，每步都可中断）：

```
① 协议降级    探测到非首选协议 → 换 codec 重试（仅 4xx 判定，不重试 5xx）
② 通道降级    分档下移 priority tier（现有 scheduler.plan）
③ Key 降级    同通道内换 credential slot
④ 能力降级    缺失能力 → 按 §3.5 表逐项降级并标注 degraded[]
⑤ 模态降级    text→image 不可降级；直接报 NO_CHANNEL_AVAILABLE
```

**硬性中止条件**（不降级，立即失败）：

- `CONTENT_BLOCKED` — 换号只会重复被拒并累积风控
- `BAD_REQUEST` — 描述请求本身
- `ENDPOINT_STALE` — 配置问题，重试无意义
- 已发出流式首 chunk

**降级可见性**：每次降级在 `kk_meta` 中记录 `degraded[]` 与 `channelId`，UI 必须显示，不得静默降级。`ProviderConnection.verificationStatus` 沿用现有 `unverified/verified` 语义——**降级过的通道不得标记为 `verified`**。

---

## 6. 落地顺序

| 阶段 | 内容 | 依赖 |
|---|---|---|
| P0 | 修 G1–G4（补 `openai_compatible`、注册适配器、注入 `chat` 依赖、替换字符串分发） | 无 |
| P1 | `CanonicalRequest` 引入，`buildPrompt()` 降级为兼容垫片 | P0 |
| P2 | `OpenAICodec`（先做，复用现有 Chat Completions 逻辑） | P1 |
| P3 | `ProtocolResolver` + `DialectProbe`，接入预置列表 | P2 |
| P4 | `AnthropicCodec` / `GoogleCodec` | P2 |
| P5 | 真流式（替换 buffered SSE） | P2 |
| P6 | 多 Key 轮换 | P0 |

---

## 7. 待验证项（NOT VERIFIED）

本文档所有设计未经真实上游验证，具体状态：

- `DialectProbe` 对 aipaiai.cn 的探测结果**未实测**（浏览器 CORS 未验证，详见交付说明）
- 三个 codec 的 wire 格式映射**未实现、未测试**
- `google` 方言的 `?key=` 鉴权在 Gemini 官方端的表现**未实测**
- 视频/音乐通道归入 L5 的边界划分**未在代码中体现**
- 本文不含任何真实厂商密钥，所有示例为占位符

按项目纪律（`feat-038-ai-model-gateway.md` 状态 PROTOTYPE），本设计落地前不得对外声称已支持任何协议。

---

## 8. 变更记录

- 2026-10-10：创建。基于 FEAT-038 现状与 aipaiai.cn 开发者文档，设计统一协议接入层；识别 G1–G4 四处既存缺口。
