# Intent：豆包（火山方舟）官方通道落地（TASK-AI-GATEWAY-001 · P1）

- Task ID：TASK-AI-GATEWAY-001（延续；本包为 P1 官方通道落地，产品化接入仍由 TASK-PROV-BYOK-001 跟踪）
- 状态：IMPLEMENTED（代码与单测完成；真实上游联调 NOT VERIFIED，外部条件见下）
- 日期与提出者：2026-10-10，用户（KK Studio 维护者）
- 请求来源：用户询问「豆包画布能否用到我的项目中（UI/操作留在客户端内）」并指示「继续」落地；承接 2026-10-09 交付包 `docs/changes/2026-10-09-doubao-integration/` 的 P1 阶段
- 用户授权范围与依据：本会话用户明确要求落地「方舟 provider 适配器骨架 + 对接文档（按仓库流程先建 feat 卡再实现）」；P1 官方通道属 2026-10-09 plan.md 已规划范围，无新增产品语义
- 关联账本、spec、plan：本目录 `spec.md`、`plan.md`；上一交付包 `docs/changes/2026-10-09-doubao-integration/`

## 用户原意

用户希望 KK-Studio 能直接使用豆包（Doubao）能力：**不搬豆包画布 UI，而是在自己客户端里用上方舟的生成能力**。上一轮结论：豆包画布 UI 无公开 SDK 不可嵌入，但画布背后的 Seedream/Seedance 等能力已由火山方舟 OpenAI 兼容 API 对外开放，可直接接入 KK 现有 BYOK 生成链。用户回复「继续」授权落地。

## AI 工程转译

- **目标**：让 KK 画布图片节点可通过「豆包（火山方舟）」连接出图（文本/图片判定正确、设置可一键预置），复用现有 BYOK 浏览器直连链路，不引入第二套实现。
- **使用者**：KK 桌面端/Web 端用户（BYOK，用户自带方舟 Key）。
- **入口**：设置 → 模型供应商 → 选择「豆包（火山方舟）」预置 → 填 Key → 测试连接 → 画布选用。
- **输入/输出**：OpenAI 兼容 `/images/generations`（方舟 `https://ark.cn-beijing.volces.com/api/v3`），返回 `{data:[{b64_json|url}]}`。
- **数据与平台范围**：Desktop + Web 共用（`src/` 共享层）；凭据只进系统凭据库（Desktop）/会话内存（Web），沿用现有 `providerCredentials.ts`。
- **约束**：遵循 AGENTS.md / AI_RULES.md / docs/README.md；`modelSupportsKind` 判定修正须保持既有模型行为不变；不新增第二套 provider 适配器（方舟经 OpenAI 兼容通道直连）。
- **验收证据**：本包 `verification.md`（单测 + lint + typecheck）；真实连通性测试需用户提供方舟 Key（外部条件）。

## 目标与非目标

- 预期结果：①设置面板出现「豆包（火山方舟）」预置，一键填入 name/baseUrl；②`modelSupportsKind` 对 `doubao-*` 文本模型与 `doubao-seedream-*` 图片模型判定正确（修复当前 doubao 文本模型被误判为图片的缺陷）；③既有模型判定行为不回归；④`npm run verify` 通过。
- 包含范围：预置常量与 UI、`modelSupportsKind` 修正、对应单测、交付包、FEAT-038 卡与账本同步。
- 明确不包含：ai-gateway 服务端通道接线（P2 本地网关 MVP，另包跟踪）；网页登录态通道（P3，需用户确认合规）；真实方舟联调（需用户完成火山引擎实名与 Key）；Seedream 免费额度政策实测（UNKNOWN）。
- 受影响平台/模块：`src/domain/modelProvider.ts`（预置）、`src/features/creation/model.ts`（判定）、`src/components/settings/ProviderProfileFields.tsx`（预置 UI）、`tests/unit/creation.test.ts`、`docs/features/feat-038-ai-model-gateway.md`、`docs/governance/task-ledger.json`。
- 已有实现和规范来源：2026-10-09 交付包；`src/features/creation/imageGeneration.ts`（OpenAI 兼容请求与 `{data:[...]}` 解析）；`src/integrations/generation/openAiImageAdapter.ts`；`src/domain/modelProvider.ts`；`src/features/creation/providerRegistry.ts`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| ---- | -------------- | ------------- | -------- |
| AC-1 | 设置 → 模型供应商出现「豆包（火山方舟）」预置，选择后自动填入名称与接口地址 | 单测断言预置常量；浏览器 settings 页可见预置项（本轮验证以单测 + UI 代码审查为准，运行态证据见 verification 缺口） | Web/Desktop |
| AC-2 | 填 Key 后画布图片节点选 `doubao-seedream-*` 可出图；`doubao-seed-1-6` 等文本模型不再被误判为图片 | `modelSupportsKind` 单测覆盖 doubao 文本/图片/其他模型 | Web/Desktop |
| AC-3 | 既有模型判定行为不变（gpt/claude/gemini 等） | `npm run test` 全绿 + creation.test.ts 既有断言未删减 | Web/Desktop |
| AC-4 | （外部条件）真实方舟连通性 | 用户提供方舟 Key 后实测 `/images/generations` 成功；本包如实标 NOT VERIFIED | Desktop |

## 假设、风险和决策

- FACT（直接证据）：方舟 OpenAI 兼容 baseUrl `https://ark.cn-beijing.volces.com/api/v3`（2026-10-09 交付包附录）；`modelSupportsKind` 当前 text 判定不含 `doubao`，`doubao-seed-1-6-250615` 会被误判为 image（代码实测，见 `src/features/creation/model.ts`）；`generateImages` 已实现 OpenAI 兼容请求与 `{data:[{url|b64_json}]}` 解析，方舟响应兼容。
- INFERENCE（假设及风险）：方舟 `images/generations` 每请求 n 上限与 Seedream 免费额度政策未实测；超限将返回 4xx 并按现有错误分类提示，不阻塞预置落地。
- UNKNOWN / CONFLICT：Seedream 当前免费额度政策（需 P0 实测，2026-10-09 交付包已登记）；方舟对 `n>1` 的兼容性。
- AI 自主决定的技术事项及理由：预置只填 name/baseUrl、model 留空让用户从模型目录选择（模型清单随测试连接刷新，避免写死易过期的模型 ID）；判定规则采用「doubao 文本模型排除图片语义 + seedream 明确放行」的最小修正，不改动其他模型分支。
- 必须由用户决定的产品语义/范围事项：无（P1 为已规划官方通道；网页通道 P3 不在本包）。
- 外部条件、费用或不可逆动作及已有授权：火山引擎实名与 Key 申请由用户完成（2026-10-09 intent 已登记）；本包不做任何付费或外部写入。
- 不在本次范围的问题与账本 ID：P2 本地网关 MVP（TASK-AI-GATEWAY-001 后续阶段）、P3 网页会话通道（同任务后续）、TASK-PROV-BYOK-001 产品化接入（账本 TODO）。
