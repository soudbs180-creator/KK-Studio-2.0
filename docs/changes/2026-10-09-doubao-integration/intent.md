# Intent：KK 集成豆包（Doubao）能力

- Task ID：TASK-AI-GATEWAY-001（内部接入底座候选；产品化接入仍由 TASK-PROV-BYOK-001 跟踪）
- 状态：DRAFT（设计包；当前候选实现仍为 PROTOTYPE/NOT_VERIFIED）
- 日期与提出者：2026-10-09，用户（KK Studio 维护者）
- 请求来源：当前用户请求摘要——「调研并设计一个在 kk 软件中集成豆包的能力；理想路径是在 kk 客户端点击『豆包登录』后即可直接使用其免费额度」
- 用户授权范围与依据：本交付包原始范围为调研与设计；当前工作区另有 TASK-AI-GATEWAY-001 的受限内部基础实现候选，随本次变更一并校验，但不表示真实上游、用户入口或产品化能力已获验收。
- 关联账本、spec、plan：本目录 `spec.md`、`plan.md`；调研来源见 spec 附录

## 用户原意

用户希望 KK Studio 能直接使用豆包（Doubao）能力，且指出「Codex 等同类产品已支持接入，豆包也应可行」，理想形态是**在 KK 客户端点击『豆包登录』后直接使用其免费额度**，而非手动配置密钥。用户同时要求：参考 Antigravity-Manager / one-api / sub2api 三个开源项目，提炼多账号统一管理方案（账号池、额度监控、并发与负载分配、失效自动检测与轮换、调用日志与用量统计），并给出整体架构（kk 客户端 → 调度层 → 豆包通道 → 统一 OpenAI 兼容接口）、配置项、接口定义与异常处理。

## AI 工程转译

- **目标**：为 KK 增加「豆包通道」，包含官方 API 通道与网页登录态通道两条路径，上层统一为 OpenAI 兼容接口；账号池与调度层支撑多账号管理。
- **使用者**：KK 桌面端用户（本机自用为主）。
- **入口**：KK 设置 → 模型提供方 / 豆包设置面板（「豆包登录」按钮 + 官方 Key 录入）。
- **输入/输出**：OpenAI 兼容请求（`/v1/chat/completions`、`/v1/images/generations`）；文本与文生图为主。
- **数据与平台范围**：Desktop（Tauri）；凭据只进系统凭据库（`com.kkstudio.provider`）。
- **约束**：遵循仓库 AGENTS.md / AI_RULES.md / docs/README.md；网页会话通道存在合规与封号风险，仅限个人自用、低并发，界面明示风险，失败自动降级官方通道。
- **验收证据**：见下方验收条件；实现阶段补 verification.md。

## 目标与非目标

- 预期结果：①官方豆包通道配置即用（利用火山方舟免费额度）；②「豆包登录」复用网页登录态的本地网关通道（自用）；③多账号池与调度层（额度监控、并发负载、失效轮换、用量统计）；④统一 OpenAI 兼容出口。
- 包含范围：本交付包的调研结论、方案对比、架构与模块设计、分阶段计划。
- 明确不包含：不包含真实上游联调、用户可见产品入口、网页登录态通道的启用或产品化接入；不做网页通道的验证码/反爬对抗（合规红线）；不做对外分发与商用。当前候选中的内部通道、凭证与调度底座仍保持 PROTOTYPE/NOT_VERIFIED。
- 受影响平台/模块：`src/features/creation/model.ts`（doubao 文本判定）、`src/domain/modelProvider.ts`（预置 provider）、`src/features/creation/providerRegistry.ts`、设置面板、新增本地网关（Tauri sidecar）。
- 已有实现和规范来源：KK 现有 BYOK Provider 机制（`src/domain/modelProvider.ts`、`src/integrations/generation/*`）；docs 见 `docs/README.md`、`docs/architecture/ARCHITECTURE.md`、`docs/features/feat-032-provider-connectivity.md`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| ---- | -------------- | ------------- | -------- |
| AC-1 | 设置页出现「豆包（火山方舟）」预置，填 Key 后文本/文生图可生成 | 官方通道连通性测试通过；`modelSupportsKind` 对 doubao 模型名判定修正后有单测覆盖 | Desktop |
| AC-2 | 点击「豆包登录」完成网页授权后即可对话/生图 | 本地网关 `/v1/chat/completions`、`/v1/images/generations` 经会话通道成功；401/429 触发轮换或降级 | Desktop |
| AC-3 | 多账号可增删、显示健康度与用量；失效账号自动移出调度 | Dispatcher 单测覆盖权重/粘性/冷却/降级；用量统计落库 | Desktop |
| AC-4 | 会话/Key 失效时前端有明确提示，不静默失败 | 异常处理矩阵（见 spec 4.5）实现并有测试 | Desktop |

## 假设、风险和决策

- FACT（直接证据）：KK 现有 BYOK 机制支持任意 OpenAI 兼容 provider；`modelSupportsKind` 文本正则不含 `doubao`（`src/features/creation/model.ts`）；火山方舟 OpenAI 兼容 baseUrl 为 `https://ark.cn-beijing.volces.com/api/v3`，语言模型首次开通每模型 50 万免费 Tokens；社区存在成熟网页会话方案（doubao-free-api / doubao2api）。
- INFERENCE（假设及风险）：网页会话通道违反豆包 ToS、存在封号风控风险，且逆向接口随时可能失效——通道必须隔离并自动降级官方。
- UNKNOWN / CONFLICT：火山方舟文生图模型（Seedream）当前免费额度政策需在 P0 阶段实测确认；豆包网页接口变更频率未知。
- AI 自主决定的技术事项及理由：推荐「混合分层」架构（官方底座 + 网页补充），理由见 spec 第 3 节；首期先落地官方通道。
- 必须由用户决定的产品语义/范围事项：网页会话通道是否启用（存在封号/合规风险）；多账号规模上限。
- 外部条件、费用或不可逆动作及已有授权：火山引擎实名与 Key 申请由用户完成；网页通道启用即视为接受账号风控风险。
- 不在本次范围的问题与账本 ID：真实豆包上游接入、网页会话通道和用户自有 API 产品化不在本次范围；对应任务为 `TASK-AI-GATEWAY-001`（基础底座，TODO/NOT_VERIFIED）与 `TASK-PROV-BYOK-001`（产品化接入，TODO）。
