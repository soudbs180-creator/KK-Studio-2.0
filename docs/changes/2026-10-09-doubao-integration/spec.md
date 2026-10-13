# Spec：KK 集成豆包（Doubao）能力

- Task ID：TASK-AI-GATEWAY-001（内部接入底座候选；产品化接入仍由 TASK-PROV-BYOK-001 跟踪）
- 状态：DRAFT（实现候选未验收）
- 日期：2026-10-09
- Intent / 账本：本目录 `intent.md`；内部基础实现由 `TASK-AI-GATEWAY-001` 跟踪，仍为 TODO/NOT_VERIFIED；产品化接入由 `TASK-PROV-BYOK-001` 跟踪
- 当前规范与实现基线：KK 现有 BYOK Provider 机制（`src/domain/modelProvider.ts`、`src/features/creation/providerRegistry.ts`、`src/integrations/generation/openAiImageAdapter.ts`、`src/features/creation/textGeneration.ts`）；生成适配器按 provider 特征路由（gemini → GeminiAdapter；image 能力 → OpenAiImageAdapter）。
- Source of truth：本文件描述目标与边界；当前能力以代码、任务账本和运行证据为准，不另写冲突副本。现有内部实现候选不代表真实上游或生产端点已接通。

## 用户行为与入口

- 主流程和相邻流程：
  1. 官方通道：设置 → 模型提供方 → 选「豆包（火山方舟）」预置 → 填 Key → 测试连接 → 创作选用。
  2. 网页通道：豆包设置面板 → 「豆包登录」→ 浏览器完成授权 → 本地网关采集会话凭证 → 测试连接 → 创作选用。
- 页面/route/组件或 API/命令入口：设置面板（`src/components/settings/ModelProviderSettings.tsx` 扩展）、豆包设置面板（新增）、本地网关 HTTP 服务（新增 sidecar）。
- loading、success、error、cancel、offline、timeout：登录/测试连接全状态覆盖；网关探活失败提示「会话失效，请重新登录」。
- 重试、幂等、stale async、unknown 受理与重启恢复：网关对提交请求幂等（复用 KK `idempotencyKey` 机制）；会话失效后请求不静默丢弃，进入冷却并提示。
- 键盘/焦点/Escape/IME、长文案、响应式：沿用设置面板现有规范（`docs/UI_INDEX.md`）。

## 架构、数据与权限

### 3.1 方案对比（调研结论）

| 维度 | A. 官方 API 直连（火山方舟） | B. 网页 headless（登录态复用） |
| --- | --- | --- |
| 可行性 | 高：KK 现有 BYOK 机制配置即用 | 中：社区成熟参考（doubao-free-api / doubao2api），需自建网关 |
| 免费额度 | 语言模型首次开通每模型 50 万 Tokens；新客 14 天 10 亿 token 5 折 | 豆包普通账号全功能免费，生图每日有限次数、次日重置 |
| 稳定性 | 高（官方 SLA） | 低（逆向接口随改版失效；session 过期需重登） |
| 风控风险 | 低 | 高（非官方调用路径，账号可能限流/封禁） |
| 合规风险 | 低（官方条款） | 高（违反豆包 ToS；对外分发触碰《生成式 AI 服务管理暂行办法》备案要求） |
| 开发成本 | 极低（零开发） | 高（网关 + 账号池 + 调度 + 保活 + 失效处理） |
| 运营成本 | 免费额度耗尽后按量计费 | 近零成本，受账号每日额度约束 |

**结论：混合分层。** 官方通道为合规底座（先用免费额度）；网页会话通道为个人自用免费补充，限定低并发、单/少账号、界面明示风险、失败自动降级官方。该形态与 Antigravity-Manager 多通道中继、one-api 多渠道负载均衡同构。

### 3.2 推荐架构与调用链路

```
KK 客户端（Tauri 2 + React）
  创作层（现有 BYOK Provider 机制）
  豆包设置面板：「豆包登录」/ 官方 Key 录入（凭据进系统凭据库）
        │ OpenAI 兼容（/v1/chat/completions · /v1/images/generations）
        ▼
本地豆包网关（Tauri sidecar，绑定 127.0.0.1）
  API 入口（Auth/限流） → 调度层 Dispatcher（账号池·额度·并发·轮换·冷却）
                               ├─ 通道 A 方舟官方 API（HTTPS）
                               └─ 通道 B 网页会话（sessionid 直连 / 浏览器托管）
        │                        ▼
  https://ark.cn-beijing.volces.com/api/v3     doubao.com 逆向接口（非官方）
```

### 3.3 模块清单

| 模块 | 职责 | 设计要点（参考来源） |
| --- | --- | --- |
| M1 登录与凭据 | 官方 Key 录入；网页「豆包登录」授权与会话采集 | 凭据只进系统凭据库；OAuth 状态机参考 Antigravity-Manager |
| M2 账号池 | 账号注册/启停/删除；类型 `official` / `web_session`；状态机 healthy / cooling / quarantined / disabled | 类型抽象参考 sub2api；403 自动标记参考 Antigravity-Manager |
| M3 额度监控 | 官方查方舟余额/用量；网页按响应头与本地计数估算每日次数 | 不虚构配额（sub2api 原则）；阈值告警 |
| M4 并发与负载 | 权重轮询 + 粘性会话；账号级并发上限；请求/次数双限流 | 双层并发与限流参考 sub2api；智能选号参考 Antigravity-Manager |
| M5 失效检测与轮换 | 401/403/429/5xx/网络错误分类处理；冷却；定时探活；过期重登提示 | 错误策略矩阵见 4.5，参考 sub2api |
| M6 日志与用量统计 | 请求摘要（模型/账号/耗时/结果/错误类）；错误分类统计；成本/次数日报 | 参考 one-api 额度明细 |
| M7 安全 Vault | 复用 KK 系统凭据库；网关仅监听 127.0.0.1；日志脱敏 | AGENTS.md 数据安全规则 |

### 3.4 schema/API/事件/文件格式与兼容策略

- 网关对外：OpenAI 兼容（`/v1/chat/completions` SSE、`/v1/images/generations`、`/v1/models`），KK 现有适配器直接对接。
- 管理面：`/v1/doubao/*`（见 4.4），JSON。
- 配置：`config/doubao.json`，经 `src/domain/settings.ts` 扩展（Zod schema）。
- 兼容策略：上游响应做结构校验；网页通道响应格式变化时降级官方，不把解析错误当成功。

### 3.5 数据归属、原件保留、校验和、并发/原子性

- 会话凭据/Key 只存系统凭据库（service `com.kkstudio.provider`），不进 localStorage、项目文件、导出包、URL 与日志（AGENTS.md 强制）。
- 网关请求幂等键复用 KK `idempotencyKey`；并发控制见 M4。

### 3.6 凭据与日志边界、最小权限、外部传输与费用

- 网关绑定 127.0.0.1；网关接口本地鉴权（随机本地令牌）。
- 日志脱敏：不记录 Cookie/session/完整 Authorization。
- 费用：官方通道免费额度耗尽后按量计费，需额度告警（`freeQuotaAlertTokens`）；网页通道无直接费用但有账号风控成本。

### 3.7 相关 ADR

- 不新增 ADR 的理由：本交付包为功能设计（features/changes 域），无独立架构决策需要记录；若实现阶段引入「网页会话通道」这一影响数据流的决策，应在 `docs/architecture/adr/` 补 ADR。

## 4. 配置项与接口定义

### 4.1 配置项（`config/doubao.json` 草案）

```jsonc
{
  "enabled": true,
  "mode": "hybrid",                    // official | web | hybrid
  "ark": {
    "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
    "apiKeyRef": "credential://kk/doubao-ark",
    "models": ["doubao-seed-1-6-250615", "doubao-seedream-4-5-xxxx"],
    "freeQuotaAlertTokens": 100000
  },
  "web": {
    "channel": "session_direct",       // session_direct | browser_managed
    "maxAccounts": 3,
    "perAccountConcurrency": 1,
    "dailyLimitPerAccount": 200,
    "probeIntervalSec": 300,
    "cooldownSec": 60
  },
  "dispatcher": {
    "strategy": "weighted",            // weighted | sticky | round_robin
    "failureThreshold": 3,
    "maxRetries": 2,
    "fallbackOfficial": true
  },
  "usage": { "logRetentionDays": 30, "reportDaily": true }
}
```

### 4.2 接口定义（本地网关）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/v1/chat/completions` | 对话，SSE 流式（KK `textGeneration.ts` 直接对接） |
| POST | `/v1/images/generations` | 文生图（KK `openAiImageAdapter` 兼容） |
| GET | `/v1/models` | 可用模型列表 |
| POST | `/v1/doubao/login` | 发起网页登录（返回授权 URL / 轮询状态） |
| POST | `/v1/doubao/accounts` | 新增账号（official: key；web: 登录会话） |
| GET | `/v1/doubao/accounts` | 账号列表（健康度/额度/状态） |
| POST | `/v1/doubao/accounts/{id}/test` | 单账号连通性测试 |
| GET | `/v1/doubao/usage` | 用量统计（按账号/模型/日） |
| POST | `/v1/doubao/logout` | 注销账号并清除本地会话凭据 |

### 4.3 异常处理矩阵

| 上游响应 | 语义 | 处理动作 | 重试 |
| --- | --- | --- | --- |
| `401` | session/Key 失效或过期 | 移出调度 → 标记需重登 → 前端提示；官方 Key 提示换 Key | 否（先重登） |
| `403` | 权限/风控拒绝 | 冷却 + 标记 quarantine，人工确认；不做自动刷新循环 | 否 |
| `429` | 限流 | 按 `Retry-After` 或冷却时间暂移出；超阈值触发降级 | 是（有界，1 次换号） |
| `5xx` / 网络错误 | 上游故障 | 换账号 failover，≤ `maxRetries`；全部失败 → 降级官方通道 | 是（≤2） |
| `400 / 413 / 422` | 请求本身错误 | 直接返回客户端，不改账号状态 | 否 |
| 会话探活失败 | 登录态失效 | 后台自动重登（若可）或通知用户 | 周期重试 |

## 5. 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| ---- | --- | --- | --- | --- |
| 官方通道 | 规划（P1） | 不适用 | 不适用 | 本期仅 Desktop；Web/Mobile 后续评估 |
| 网页会话通道 | 规划（P3） | 不适用 | 不适用 | 仅本机自用，绑定 127.0.0.1 |
| 账号池与调度 | 规划（P4） | 不适用 | 不适用 | 同上 |

说明：全部为 PLANNED（仅设计，无实现）；实现后按 `docs/features/` 门禁要求补同态运行证据，未验证前不得标 REAL。

## 6. 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 官方通道连通；doubao 文本判定修正 | Desktop 实机 + 单测 | 测试日志 + 单测 PASS |
| AC-2 | 网页登录后可对话/生图；401/429 轮换或降级 | Desktop 实机 + 网关单测 | 调用日志 + 单测 PASS |
| AC-3 | 多账号管理；失效移出；用量统计 | Desktop 实机 + Dispatcher 单测 | 单测 PASS + 用量报表 |
| AC-4 | 失效提示不静默 | Desktop 实机 | UI 验收 + 错误日志 |

## 7. 风险和决策

- 可自主解决的技术决定及依据：推荐混合分层（官方底座 + 网页补充）；首期官方通道；`modelSupportsKind` 补 `doubao` 关键词。
- 待用户决定的产品语义：网页会话通道是否启用（封号/合规风险）；账号规模上限。
- 规范冲突、外部依赖与阻断范围：网页逆向接口为外部依赖，可能随时失效；实现阶段需 P0 实测 Seedream 免费额度政策。
- 与 intent 的差异及授权依据：无。
- 明确未承诺的能力：不做验证码/反爬对抗；不做对外分发与商用；不保证网页通道长期可用。

## 8. 附录：调研来源

### 开源参考项目
- Antigravity-Manager：https://github.com/lbjlaq/Antigravity-Manager
- one-api：https://github.com/songquanpeng/one-api
- sub2api：https://github.com/Wei-Shaw/sub2api

### 豆包通道社区方案
- doubao-free-api（LLM Red Team）：https://gitee.com/llm-red-team/doubao-free-api
- doubao2api：https://wangchuxiaoji-oss.github.io/doubao2api/
- autodoubao：https://himcp.ai/server/autodoubao
- doubao-browser-agent：https://www.npmjs.com/package/doubao-browser-agent

### 官方文档与额度政策
- 火山方舟产品简介（baseUrl/API Key）：https://docs.volcengine.com/docs/82379/1285467
- 兼容 OpenAI SDK：https://www.volcengine.com/docs/82379/1330626
- 豆包大模型 API 服务平台（50 万免费 Tokens）：https://ai.volcengine.com/
- 开通管理与免费额度说明：https://www.volcengine.com/docs/82379/1159200
- Seedream 4.0-5.0 教程：https://www.volcengine.com/docs/82379/1824121
- 新客福利活动：https://www.volcengine.com/docs/82379/1463946
