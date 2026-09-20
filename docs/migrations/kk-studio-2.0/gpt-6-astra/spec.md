# Spec

- ID：GPT6-ASTRA-20260920
- 状态：拟议方案，尚未实施。
- 初稿调研基线：原目录 `codex/desktop-data-stability@609f524` 加已有未提交改动，保留为历史来源。
- 当前实施基线：已复核的本地 `main@80544af10ce3bd39988395ed12934d9940150e17`。集成工作树在 `<integration-worktree>`，复核时干净。本任务位于独立 `docs/TASK-ASTRA-001-migration-plan` 分支；后续执行从届时最新已验收 main 起步。
- 远端边界：用户明确选择 https://github.com/soudbs180-creator/KK-Studio-2.0 作为 2.0 远端；该仓库与本地 main 历史不相干，本轮只做分阶段、白名单同步；不绑定旧 `soudbs180-creator/kk-studio`，不把旧 main 与本地 main 混同。

## 当前事实与迁移范围

| 当前实现                                                                 | 证据                                                                                               | 迁移含义                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 首页、对话、画布统一 submitImageCommand；executeTask 先持久化 intent     | src/App.tsx:438,1147                                                                               | Astra 工具复用统一命令及其审批，不另建图片队列        |
| Desktop 已通过原生 TaskHost IPC 提交；Web 使用 generateImages/Images API | src/App.tsx:453,641；src/features/creation/nativeTaskHost.ts:119                                   | 两端传输不同；Astra 不能替换图片模型                  |
| T3b 项目包、T4 统一入口已 DONE；T5 实现已集成，运行态验收 PARTIAL        | docs/governance/task-ledger.json；docs/PROGRESS.md                                                 | 复用既有能力，图片工具等待 T5 剩余验收                |
| 默认图片 provider model 为空；models 探测与生成验证已分离                | src/domain/modelProvider.ts；src/features/creation/providerRegistry.ts                             | assistant 配置独立，不能由 models 成功推断 Astra 权限 |
| Rust 旧 Chat Completions 命令没有当前前端调用者                          | src-tauri/src/main.rs；src 调用搜索                                                                | 不修改旧默认值冒充产品迁移                            |
| 消息仍仅允许 user/system，normalizer 会转换未知 role                     | src/features/creation/model.ts:58,508；snapshotCodec.ts:56；creation_validation.rs:143             | TS、Rust、持久化和导出契约同步升级                    |
| 项目包还有独立 schema/字段白名单和 10,000 字正文限制                     | src-tauri/src/project_package_snapshot.rs:551,573,616；src/features/projects/projectPackage.ts:452 | v3 必须覆盖项目包导出、预检与恢复                     |
| 独立 Gateway 未接成正式平台账户产品链                                    | docs/architecture/GENERATION-PLATFORM.md                                                           | 不把原生 TaskHost 与平台 Gateway 混为一谈             |
| Prompt Compiler 是规则字符串拼接，Agent roles 是领域契约                 | src/features/creation/promptCompiler.ts；src/domain/agentWorkflow.ts                               | 没有现成的模型 Agent 可直接换 model                   |

## 官方兼容要求

模型 ID 固定为 `gpt-6-astra`。Astra 支持文本输出和图像输入；图片生成可以由工具完成，不能由此推断它是 Images API 的图片模型。[模型页](https://developers.openai.com/api/docs/models/gpt-6-astra)

采用 Responses；Astra 的工具调用需要该 API。新路径不发送 temperature、top_p、top_logprobs 或输出 logprobs。当前没有有效的对话 reasoning 配置，因此 `low` 是本项目初始试验值，随后与 `medium` 做任务评估。若发现真实旧配置，则按官方要求保留有效 effort，none/minimal 从 low 开始。[官方迁移说明](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart)

请求使用 input，响应解析 output 中的 typed items；工具结果通过 call_id 关联。结构化输出使用 text.format。使用原始 fetch/reqwest 时不要假设存在 SDK 的 output_text 便捷字段。[Responses 迁移指南](https://developers.openai.com/api/docs/guides/migrate-to-responses)

新路径默认 `store: false`，应用本地管理历史；这只是 Responses 对象存储选择，不承诺零数据保留。第一阶段不依赖云端 conversation/previous_response_id。工具续轮保留必要的输出 items，按官方 API 契约处理 reasoning.encrypted_content；不将推理过程写入可见聊天或诊断日志。[Responses 创建接口](https://developers.openai.com/api/reference/resources/responses/methods/create)

## 推荐架构和交付边界

1. 第一交付：独立的 Astra assistant 配置、文本/图像理解、流式回答、取消、项目内历史和错误状态。默认关闭开关；启用只影响新的 assistant run。
2. 第二交付：assistant 通过一个受限工具提交图片任务，复用已验证的连接选择、审批、任务和素材归档。不得把未闭合的持久任务链伪装为自动 Agent。
3. 传输层：共享 TypeScript 请求构造及 typed-event 归一化；Desktop 使用小型 Tauri Responses transport，从系统凭据库取 key；Web BYOK 只用会话内 key。Web 直连必须通过实际 origin/CORS 验证，否则显示不可用原因，另排受信后端接入，不开放代理规避限制。
4. 使用现有 fetch、reqwest、Zod，不为本迁移引入 Agents SDK、多 Agent 平台或全局依赖升级。新代码放 `src/features/assistant`、`src/integrations/assistant`；Rust 新模块从 main.rs 注册。

## 入口与状态

- 现有“生成图片”语义和项目 image model 保留。新“助手”模式明确使用 assistantModel，不能仅根据输入文字暗中切换任务类型。
- 工作台按 `App → ConversationPanel` 接入；首页进入助手项目时保留原始意图与草稿，图片入口继续走现有创建流程。
- 状态：idle、awaiting_approval、running、succeeded、failed、cancelled、offline、interrupted；工具提交另有 unknown 状态。
- response.completed 且输出有效才标为 succeeded；refusal、incomplete、failed、流中断和只有工具调用的输出不能算回答成功。中文分片必须完整。
- 请求绑定 projectId/runId/attempt、connectionId、credentialRef、model 与参数；切换项目、取消、关闭面板或迟到回调不能改写其他项目。
- local_only 禁止远程 Astra 请求。助手的文字和图像外发同样必须执行 remote_transfer 门禁，在任何 HTTP 请求前取得与本次目的地、输入和引用资产范围绑定的审批；同一 run 内复用有效审批，不把模型回复当授权。参考图只在必要时解析原生/IDB asset；缺失资源明确失败，不能退化为无参考图请求。

## 数据契约与回滚

- 新配置 `AssistantProfile` 与图片 `ModelProviderProfile` 分离，默认 disabled。只保存非敏感路由和模型参数；密钥仍由 `com.kkstudio.provider` 或 Web 请求内存提供。
- 将 CreationMessage 扩展为 user/system/assistant，role 与状态须显式校验，不把未知 role 当 user。当前 system 是产品状态消息，不能直接当作模型 system/developer 指令；模型指令只来自应用控制的 assistantPrompt，历史状态消息不转为高优先级指令。
- assistant 正文上限拟设为 65,536 个 UTF-16 code units；前后端一致校验。超过上限显示明确错误并保留可恢复原文，不沿用旧 normalizer 的 10,000 字符静默裁剪；UI 对长文使用滚动/折叠，不修改实际内容。
- 推荐将快照升级为 version 3；v2 读取必须先通过旧校验，转换在内存完成，写入前保存可校验的不可变原件。当前一个快照包含所有项目，因此版本升级与旧版兼容影响是整个存储库范围；迁移预览/确认必须说明这一点。assistant 启用仍可逐项目进行，不能把它描述为逐项目 schema 升级。
- 主快照继续使用现有 storage 位置以保持一份权威数据；文件名含 v2 不代表内部 payload 必须停留在 v2。迁移保留 revision CAS、原子提交、锁、读失败冻结、素材 checksum；备份原件单独命名为 `pre-astra-v3`，不覆盖普通恢复备份。
- Web 的迁移、原件保护以及普通 backup/snapshot 同时升级为 v3，放在同一 IDB transaction 内。
- Web 迁移必须先冻结现有恢复优先级：保留并校验 localStorage 高 revision 副本、session 的 pending journal 与 pending:recovery journal 原件；schema v2 的副本不能仅凭 revision 覆盖已提交的 v3 IDB 选择。迁移提交后，旧 tab 写入和 v2 journal 只能进入隔离预览/人工恢复，不得自动覆盖 v3；以迁移 fence/epoch 拒绝旧 tab 的回写。覆盖“旧 tab + v2 高 revision localStorage + v2 pending/recovery journal + v3 IDB”组合测试。Desktop 持有现有跨进程锁：先落盘并 sync 不可变 v2 原件，再原子写入并同步有效的 v3 普通备份，最后原子提交 v3 主文件；迁移方法不能沿用把 v2 主文件再次覆盖普通备份的旧写入步骤。主文件提交前不启用助手或写入 assistant 历史。主文件仍为 v2 的中断状态只允许显式重试迁移；一旦提交成功，普通主备均为 v3，v2 原件永不成为自动恢复候选。迁移失败、磁盘满、主备损坏均不写空快照。
- 功能回滚采用新版本中的 assistantEnabled=false，保留 v3 读取/导出与现有图片创作。旧二进制降级不是无损回滚；它应拒绝 v3。新数据须先由兼容版本导出，不能将旧备份覆盖新快照。
- 项目包 manifest 版本与内嵌 snapshot 版本分别管理；保持已验证 v2 包读取，明确支持 v3 的字段白名单、消息上限和 checksum，覆盖导出→预检→隔离恢复。不能只改普通快照校验。
- 迁移保留 sourceItemId、submissionState、submittedAt、idempotencyKey、unknown 与逐 slot 输出；native reconcile 先于 interruption recovery，不能重建旧图片任务身份或把 unknown 改为可普通重试。
- 第一阶段持久化可见消息、run 状态和安全 usage；原始 provider bodies、完整工具返回和 reasoning items 不进入通用快照/日志。运行中的 reasoning/tool context 只在请求内存保留；重启标为 interrupted，不自动续交付费工具。

## 工具与运行限制

- 第一阶段 tools 为空。第二阶段仅提供 submit_image_task，执行端独立验证 schema、当前项目、privacyMode、模型能力、成本/输出数限制和 requiredApprovalGates。
- 工具 arguments 不能含 key、Base URL、credentialRef、任意路径、价格、ownerId；这些由应用根据已固定连接解析。
- 以 runId + call_id 建立持久执行去重记录；已受理但结果未知不得自动重新提交。网络取消只表示客户端停止等待，不能承诺供应商停止计费。
- T4 统一生成入口已 DONE；T5 原生 TaskHost 已集成、仍为 PARTIAL。开放图片工具前须补完隔离 Tauri/WebView 提交、取消、reload 重连、完整进程重启和逐 slot 恢复证据；真实付费 Provider 另走 EXT-PROVIDER 验收。无需重建 T4 或第二套 TaskHost，门禁未完成时助手只输出可审阅方案。
- Fast mode、异步工具、mid-turn steering、多 Agent 和 cache 策略优化都放在完成基本迁移后按测量结果单独评估。

## 验收标准

- 同一项目下文本、多轮与一张参考图理解可用，历史重开保持角色；图片生成仍使用原图片模型。
- 401/403、429/Retry-After、超时、取消、离线、断流、未知事件和格式错误均有明确可恢复行为；日志无凭据。
- 30 条固定人工评审用例覆盖设计需求理解、参考图忠实性、约束保留、工具选择、错误处理和连续对话；关键安全/数据场景必须全部通过。
- low 与 medium 比较任务成功率、用户可见首响应、端到端 p50/p95、input/output/reasoning/cached token usage 与实际可核算成本。阈值在首次基线评审时固定；未达标不扩大启用范围。
- 不伪造旧模型 A/B 基线：当前没有活跃 GPT 对话链。可对比规则 Prompt Compiler 的结果，但必须标明任务和产物不同。
- 完整 verify、Rust 检查以及 1421/1423/Tauri 实际运行证据通过后，才扩大启用。只通过 mock 的部分仍标注 Prototype/未完成 live 验收。
