# 设置、服务商预设与协议接入研究

- 日期：2026-10-14；只读公共官方资料研究。
- 写入范围：本文件。没有修改产品代码、执行 Git 写操作、访问凭据或修改用户数据，没有调用收费 Provider。
- 当前融合候选：`codex/TASK-UI-BASELINE-20261014@47d35a10e758376fa5b3cf4b33c9c19c76818140`；文件位于 root 指定复用的 `branch-consolidation-20261011` 工作树。
- 旧 primary 观察对象：`codex/ui-redesign-20261011@51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c` 加未提交实现；不能视作已审查 HEAD。
- Cherry / PR #58 本地比较对象：`codex/TASK-CHERRY-RED-001-mainline@7daeba25db511652dbd73833c21b3066f428d7f2`，使用 `git show <SHA>:<path>` 读取。没有把历史验证结果重跑或提升为当前验收。
- 外部来源通过 web 搜索、打开官方文档和官方 GitHub 源码读取；网络请求不携带 KK 源码、本机数据或任何凭据。

## 1. 结论与产品分类

用户列出的八类入口不等于八种独立 wire protocol：OpenAI Chat Completions、OpenAI Responses、Anthropic Messages、Gemini GenerateContent 是请求/流式协议；Azure 是部署与认证变体，New API 是多协议网关，LM Studio/Ollama 是本地服务产品。展示分类、服务类型、协议、认证与生成能力应分别保存，避免由服务商名称猜协议。

建议预设选择页采用搜索与“全部、官方、中转、自定义、本地”分类。搜索命中名称、中文/英文别名、域名；选择后补名称、协议、Base URL、认证方式，推荐模型只作为可编辑建议。模型目录真实刷新优先；无回传、无权限或不支持的协议明确显示原因。选择预设不启动服务、不安装模型、不发生成请求、不自动切换现有任务的连接。

官网、获取密钥和接口文档是每个预设的明确操作。对于本地服务，使用“密钥设置说明/本地服务说明”表达实际条件，不能伪造一个云端领 Key 页面；New API 的应用 Token 来自用户指定实例，不能指向项目官网假装提供该实例的密钥。

## 2. 官方协议与服务矩阵

以下 Base URL 约定为 KK 适配器的完整版本前缀；追加的 route 不应再次带 `/v1`。SDK 对 Anthropic 等产品的 base_url 约定可能使用 host 根，与此不同，不能直接套用 SDK 示例的拼接方式。

| 入口 | KK 表单 Base URL / 路由 | 认证 | 流式与模型发现 | 依据 |
| --- | --- | --- | --- | --- |
| OpenAI Chat Completions | `https://api.openai.com/v1`；POST `/chat/completions`，消息放 `messages` | API Key 的 `Authorization: Bearer` | `stream=true`；SSE 的 `choices[].delta`、finish_reason 与 `[DONE]`；GET `/models` 返回 `data[].id` | [Chat API](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[模型列表](https://developers.openai.com/api/reference/resources/models/methods/list) |
| OpenAI Responses | 同一 `/v1` 前缀；POST `/responses`，输入放 `input`，可用 `instructions` | 同上 | `stream=true`；命名事件如 `response.output_text.delta`、`response.completed`，还需处理 failed/incomplete/error；不是 Chat chunks。模型目录同上，目录出现不证明该模型支持所有端点 | [Responses API](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create)、[流式指南](https://developers.openai.com/api/docs/guides/streaming-responses)、[事件规范](https://developers.openai.com/api/reference/resources/responses/streaming-events) |
| Gemini | `https://generativelanguage.googleapis.com/v1beta`；POST `/models/<id>:generateContent` 或 `/models/<id>:streamGenerateContent?alt=sse` | `x-goog-api-key`；避免把 Key 写 URL | 请求为 contents/parts，assistant role 映射为 model；流为 candidates/content/parts，终态依据 finishReason，usageMetadata 与文本分开。GET `/models` 返回 `models[]/nextPageToken`，需分页并识别支持的 generation methods | [API 入口](https://ai.google.dev/api)、[生成接口](https://ai.google.dev/api/generate-content)、[模型列表](https://ai.google.dev/api/models) |
| Anthropic | `https://api.anthropic.com/v1`；POST `/messages` | `x-api-key` 仍受支持；当前 overview 也列出 Bearer 认证。需 `anthropic-version`，例如 `2023-06-01`；多 workspace key 可能还需 workspace 标识 | system 与 messages 分开，需 max_tokens；SSE 包含 message/content block/delta/stop，不使用 `[DONE]`。GET `/models` 使用 data、has_more、last_id/after_id 分页 | [API overview](https://platform.claude.com/docs/en/api/overview)、[Messages](https://platform.claude.com/docs/en/api/messages/create)、[streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)、[models](https://platform.claude.com/docs/en/api/models/list) |
| Azure OpenAI | 用户的 `https://<resource>.openai.azure.com/openai/v1`，也支持相应 services.ai.azure.com 域；POST `/responses` 或 `/chat/completions` | v1 REST 文档给出 `api-key`；Entra 使用 Bearer access token，刷新是独立能力 | v1 不要求 dated api-version；请求 model 填用户 deployment name。GET `/models` 官方存在，但不能把 offering 名单等同于该资源已配置的 deployment alias | [v1 生命周期](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle?tabs=key)、[Azure models](https://learn.microsoft.com/en-us/rest/api/aifoundry/azureopenai/models)、[部署端点](https://learn.microsoft.com/en-us/azure/ai-studio/ai-services/concepts/endpoints) |
| New API | 用户实例的 `<origin>/v1`；按选择 POST `/chat/completions` 或 `/responses`；不要预填不存在的统一官方推理 host | 用户实例创建的应用 API Token，Bearer；管理 Access Token/Session 是不同权限域 | Chat 支持 stream；Responses schema 有 stream。GET `/models`；其返回格式还可能随认证头改变。上游/实例版本决定实际能力，不由“New API”名称保证 | [Chat](https://docs.newapi.pro/en/docs/api/ai-model/chat/openai/createchatcompletion)、[Responses](https://docs.newapi.pro/en/docs/api/ai-model/chat/openai/createresponse)、[models](https://docs.newapi.pro/en/docs/api/ai-model/models/list/listmodels)、[应用 Token](https://docs.newapi.pro/en/docs/guide/console/api-token) |
| LM Studio | 本地默认 `http://127.0.0.1:1234/v1`；Chat `/chat/completions`；Responses `/responses` | 默认无需认证；0.4.0+ 可开启 Require Authentication 并创建 API Token，届时需要 Bearer Token | 兼容端点支持 SSE；GET `/models` 为服务器可见模型，JIT 时可能含下载而未加载的模型。原生 `/api/v1/*` 是另一组管理接口 | [兼容端点](https://lmstudio.ai/docs/developer/openai-compat)、[认证](https://lmstudio.ai/docs/developer/core/authentication)、[models](https://lmstudio.ai/docs/developer/openai-compat/models)、[Responses](https://lmstudio.ai/docs/developer/openai-compat/responses) |
| Ollama | 本地兼容前缀 `http://127.0.0.1:11434/v1`；Chat `/chat/completions`、Responses `/responses`。原生 API 另用 `/api/chat`、`/api/tags` | 本地服务不要求认证；直连 `https://ollama.com/v1` 云 API 必须 Bearer Key，不能继承本地免密 | 兼容 Chat/Responses 与原生 NDJSON 分开。Responses 文档标注 v0.13.3+ 且不支持 previous_response_id/conversation；原生 streaming 使用 application/x-ndjson、done=true。兼容 GET `/v1/models`，原生 GET `/api/tags` | [兼容协议](https://docs.ollama.com/api/openai-compatibility)、[认证](https://docs.ollama.com/api/authentication)、[原生 streaming](https://docs.ollama.com/api/streaming)、[tags](https://docs.ollama.com/api/tags) |

Azure classic/preview 模式与 v1 不能混配：旧模式有不同路径与 api-version 要求，Codex 官方配置文档还保留 Azure preview 示例。若产品要兼容旧 Azure，应单独保存 apiStyle/apiVersion/deployment 等非敏感元数据；当前 schema 禁止 Base URL query，不应通过放开密钥 query 解决这个需求。参考 [Codex 配置](https://learn.chatgpt.com/docs/config-file/config-advanced) 与上表 Azure v1 文档。

New API 是网关，除了 OpenAI 形状还可暴露 Anthropic/Gemini 入口；本轮最小建议先支持用户显式选择 Chat/Responses，其他协议继续交给真实适配器和实例验收。[官方路由源码](https://github.com/QuantumNous/new-api/blob/main/router/relay-router.go) 与 [Gemini 目录](https://docs.newapi.pro/en/docs/api/ai-model/models/list/listmodelsgemini) 可追溯此差别。不得把其管理 API 令牌、登录 Cookie、供应商上游 Key 当作应用 API Token。

## 3. 预设跳转信息

URL 是本次官方公开页面读取或官方文档链接提供的入口。需要登录的控制台并未登录；“入口存在”不是用户已获授权/余额/生成权限的证明。

| 预设 | 官网/产品入口 | 获取密钥或本地设置 | 接口文档 |
| --- | --- | --- | --- |
| OpenAI Chat | [OpenAI API](https://developers.openai.com/api/) | [API Keys](https://platform.openai.com/api-keys) | [Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) |
| OpenAI Responses | [OpenAI API](https://developers.openai.com/api/) | [API Keys](https://platform.openai.com/api-keys) | [Responses](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create) |
| Gemini | [Google AI](https://ai.google.dev/) | [AI Studio API Key](https://aistudio.google.com/apikey)，来源：[Key 指南](https://ai.google.dev/gemini-api/docs/api-key) | [Gemini API](https://ai.google.dev/api) |
| Anthropic | [Claude Platform](https://platform.claude.com/) | [API Keys](https://platform.claude.com/settings/keys)，来源：[overview](https://platform.claude.com/docs/en/api/overview) | [Messages](https://platform.claude.com/docs/en/api/messages/create) |
| Azure OpenAI | [Azure 产品](https://azure.microsoft.com/en-us/products/ai-foundry/models/openai/) | 用户 [Azure Portal](https://portal.azure.com/) 资源的 Keys and Endpoint；具体资源 URL 由用户环境确定 | [v1 配置](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle?tabs=key) |
| New API | [项目官网](https://www.newapi.ai/en) | [应用 Token 操作说明](https://docs.newapi.pro/en/docs/guide/console/api-token)；实际入口为用户实例控制台，不自动猜测路径 | [API reference](https://docs.newapi.pro/en/docs/api) |
| LM Studio | [LM Studio](https://lmstudio.ai/) | [本地 Server Settings / Manage Tokens 说明](https://lmstudio.ai/docs/developer/core/authentication)；无云端 Key 领取页面 | [兼容接口](https://lmstudio.ai/docs/developer/openai-compat) |
| Ollama | [Ollama](https://ollama.com/) | 本地模式显示“无需密钥”；[云 API Key 说明](https://docs.ollama.com/api/authentication) 链向 Ollama Settings Keys，仅用于另选的云模式 | [API](https://docs.ollama.com/api/introduction)、[兼容接口](https://docs.ollama.com/api/openai-compatibility) |

外链字段应为静态受审目录或用户显式配置的非敏感 URL，限制合法 HTTP(S)、无账号/密码/秘密 query；外链打开不得携带当前 API Key、Token、prompt、项目 ID。不要复制供应商推广/邀请参数。自定义服务无法查到官方链接时显示“未提供”，允许用户填写，不能生成假官网。

## 4. 旧 schema 与 Cherry 候选对照

| 能力 | 旧 primary / 本轮初始融合候选 | Cherry 比较 SHA 的源码事实 | 尚需工作 |
| --- | --- | --- | --- |
| 协议字段 | ModelProviderProfile 只有 name/baseUrl/model/connectionId；ProviderConnection 没有文本协议选择 | `src/domain/modelProvider.ts:7` 有 openai-compatible、anthropic-messages、gemini；默认保持旧 OpenAI 兼容语义 | 增加独立 Responses，不把旧 openai-compatible 记录改成 Responses；Azure/New API/本地产品类型与协议分开 |
| 认证 | 默认 Bearer；系统 vault / 内存凭据引用 | `resolveProviderAuthMode:40`；api_key/none，none 仅严格 localhost/127.0.0.1/[::1]；不接受远程免密 | LM Studio 开启 Token 的显式切换；Azure api-key/Entra 刷新；不扩张 loopback 到任意 LAN |
| 请求 | BYOK Chat 与图片 OpenAI 路径 | `providerTextProtocol.ts:14/39` 按三协议选择头/body/path；system 分离，Gemini role 映射与 alt=sse | Responses input/event 模型、Azure deployment、按 service kind 的端点策略 |
| 流式 | Chat SSE | `providerTextStream.ts:12` + `src-tauri/src/task_host_text.rs:135` 有三协议解析与严格终止；拒绝工具/媒体输出假成功 | Responses 完整/失败/不完整事件，Token 回执；原生 Ollama NDJSON 若纳入是另一个 adapter |
| 模型发现 | `<baseUrl>/models` + OpenAI data[] | `integrations/modelProvider.ts:17/104` 处理 Gemini models[] 与 Anthropic/Gemini 分页；有页数/数量/重复游标边界 | Azure deployment 输入；New API 格式与认证选择；不能把发现成功标成生成已验证 |
| 本地发现 | Web fetch，受跨域/平台网络影响 | `nativeModelDiscovery.ts:5` 为 Desktop 显式 none 的 loopback discovery IPC，支持取消 | keyed 本地、Web 跨域、Mobile 网络能力分别验收；不能通过浏览器失败声称本地服务未安装 |
| 预设 | 一个火山方舟；select 只填 name/baseUrl | Cherry `modelProvider.ts:121` 有 OpenAI、Anthropic、Gemini、Ollama、LM Studio、Ark；填 protocol/authMode，模型仍由目录刷新 | 搜索/分类、八类入口、官网/Key/docs、建议模型、目录更新时间和未知态 |

以上为 SOURCE-VERIFIED，不是此次运行 PASS。Cherry 已有 Browser/Rust/fixture 历史记录，但文档也保留真实 Provider、最终 Head 审查、Hosted、安装/签名与用户验收边界。本轮没有复跑它们；只按模块/净 diff 提取，不整 branch 覆盖 root 当前 Agent recovery 和信息架构。

建议复用既有 `providerRegistry`、`providerCredentials`、保存恢复、TaskHost、模型 catalog 和 draft isolation；不新建第二份连接/队列。新增 schema 字段默认值必须兼容旧记录，protocol/auth/baseUrl 变化不得借用旧连接的 verified/capability/credential 身份。运行中的任务保持原绑定，收到首个输出后不自动换协议/供应商重提。

## 5. cc-switch 固定来源与复用限制

2026-10-14 通过 `git ls-remote https://github.com/farion1231/cc-switch.git refs/heads/main` 回读公开 main 为 `2635dfffcee949b6056b936c992dfcdbdd940298`，并通过 web 打开该 [commit](https://github.com/farion1231/cc-switch/commit/2635dfffcee949b6056b936c992dfcdbdd940298) 和同 SHA 源码。下列结论绑定该提交，不绑定未来 main。

- [MIT LICENSE](https://github.com/farion1231/cc-switch/blob/2635dfffcee949b6056b936c992dfcdbdd940298/LICENSE#L1)：署名 Copyright (c) 2025 Jason Young；复制/实质复用应保留版权及许可文本。许可不自动授予第三方服务、账号、品牌或图标使用条件。
- [CodexProviderPreset](https://github.com/farion1231/cc-switch/blob/2635dfffcee949b6056b936c992dfcdbdd940298/src/config/codexProviderPresets.ts#L17)：包含 name、websiteUrl、apiKeyUrl、category、endpointCandidates、apiFormat、modelCatalog；也包含工具专属 auth/config、OAuth 标记与合作字段。只抽取受审非敏感目录，不复制凭据配置、推广排序或 runtime。
- [ProviderCategory](https://github.com/farion1231/cc-switch/blob/2635dfffcee949b6056b936c992dfcdbdd940298/src/types.ts#L1) 与 [presetGroup](https://github.com/farion1231/cc-switch/blob/2635dfffcee949b6056b936c992dfcdbdd940298/src/components/providers/forms/presetGroups.ts#L40) 分开：official/OAuth 被展示为账号登录；cn_official 为模型厂商。不能机械照搬到 KK 的“官方 API/中转/自定义/本地”。
- [search](https://github.com/farion1231/cc-switch/blob/2635dfffcee949b6056b936c992dfcdbdd940298/src/components/providers/forms/presetGroups.ts#L102) 支持名、域名和别名；[selector](https://github.com/farion1231/cc-switch/blob/2635dfffcee949b6056b936c992dfcdbdd940298/src/components/providers/forms/ProviderPresetSelector.tsx#L505) 提供搜索、分类数量、自定义入口和空结果；适合借鉴交互。
- [requires-routing](https://github.com/farion1231/cc-switch/blob/2635dfffcee949b6056b936c992dfcdbdd940298/src/components/providers/forms/presetGroups.ts#L395) 是其产品能力，不能把目录中的协议转换/OAuth 标记转成 KK 已可用。官方来源与实时模型目录仍需独立核对。

## 6. CLI 入口优化依据与边界

| 入口 | 官方事实 | KK 的建议呈现 |
| --- | --- | --- |
| Codex | [auth](https://learn.chatgpt.com/docs/auth) 区分 ChatGPT 订阅登录与 API Key；CLI 有 login、login status；[provider config](https://learn.chatgpt.com/docs/config-file/config-advanced) 使用 Responses wire API | 默认主 Agent 保持 Codex。分列已安装版本、登录方式、桥服务健康、当前项目会话归属、所选模型；“检测连接”与“付费生成测试”明确区分。不得因官网已登录或服务 ready 宣称项目已连接 |
| Gemini CLI | [官方认证](https://geminicli.com/docs/get-started/authentication/) 区分 Google 登录、Gemini Key、Vertex AI；组织账号/Vertex 可能需要 Cloud project | 复用当前 detection/bridge。缺软件、未登录、桥离线、项目缺失、模型未回报分别显示；Google 官网登录、CLI 登录和 API Key 不共享为一个成功状态 |
| CodeBuddy CLI | [quickstart](https://www.codebuddy.cn/docs/cli/quickstart) 区分国内/海外/企业/iOA 登录；[IAM](https://www.codebuddy.cn/docs/cli/iam) 列出认证和地区配置 | 复用当前 CLI 路径与桥状态；提供官方帮助和正确地区入口。命令版本检测不等同于成功推理；当前测试如消耗账号额度须按现有文案显式点击，不作为自动健康检查 |
| Claude Code（若后续纳入） | [官方认证](https://code.claude.com/docs/en/authentication) 与 API Messages Key 是不同入口 | 本轮没有 KK 已实现的 Claude CLI 端到端证据；可展示说明/禁用理由，不从 Anthropic API preset 推导 Claude CLI 已接入 |

CLI 的 OAuth/登录由用户调用的官方客户端完成；KK 不读取或移植消费者 Cookie，不复制第三方 auth.json，不把诊断输出中的凭据回填设置。Codex 的 Responses provider rendering 与 KK 的 BYOK Chat 文本通道是不同消费者，不能因为现有 renderer 有 wire_api=responses 就说 KK 已支持 Responses 文本生成。

## 7. 设置 2/3 栏与跨平台组织建议

此节是设计建议（INFERENCE），不是已实现或视觉验收。现行 [UI_INDEX](../../UI_INDEX.md)、[UI_ARCHETYPES](../../UI_ARCHETYPES.md)、[UI_RULES](../../UI_RULES.md) 决定模板、tokens、唯一 Primary 与控件状态。不得另建固定字号/按钮尺寸体系。

- Desktop 宽屏三栏：分类导航、连接/预设列表、选中对象详情；较窄 Desktop/Web 两栏：分类导航、详情，列表作为详情中的选择步骤。添加服务商时采用“选择预设 → 编辑连接”步骤，搜索/类别仍沿用共享控件。
- Mobile 使用一级分类列表进入详情，预设列表与连接表单顺序导航；同样的标签、控件高度、图标、focus/disabled/loading、返回和保存语义。不得将三个固定宽度栏横向塞到手机。
- 模型接入保留 Codex 主 Agent、官方/中转 API、CLI/OAuth 的真实能力层级；协议选择属于具体连接表单。官网/Key/docs 为次级操作，保存为唯一 Primary。
- 标签、喜欢/收藏、资源库是作品组织；存储是目录/空间/备份/缓存；使用记录是任务与消耗。长期记忆文件与运行 RAM 分别命名，未知数不显示 0。已有项目 likedIds/favoriteIds 不合并为同一字段。
- 储存统计使用实际当前数据根和去重原件的统计契约；当前分页加载条数不能当全部资源总数。Web 浏览器存储不可伪造磁盘路径，Mobile 不能借用 Desktop 的目录命令。

## 8. 验收清单与未知能力

本文件仅完成官方资料与源码比对。八类预设的真实 Key/授权/模型可用性、CORS、Desktop vault、Web/Native 流式、Azure deployment、New API 实例版本、LM Studio/Ollama 版本与模型加载、CLI 真实账号调用、Mobile 都没有在本轮实测；状态为 NOT VERIFIED。

实现阶段至少覆盖：旧 schema 恢复；preset 搜索/分类/无结果/键盘；草稿切换保留与取消；官网链接缺失与非法 URL；native none 的严格 loopback；协议路径不重复版本前缀；模型分页/损坏 JSON/401/429/离线/取消；各流式明确终止与截断 unknown；无工具/媒体支持时不假成功；真实 usage 缺失显示未报告；修改后 Web development/production 与 Desktop 的实际 route/bundle/同态截图。固定端口及 390/1099/1920 依现行规范，Mobile 独立项目仅在平台门禁满足后实施。

官方网页个别链接发生重定向或 fetch 失败时，已改用同站可读取页面/官方源码；没有把失败页面作为事实依据。OpenAI Responses 通用 REST 页面本次 fetch 失败，实际成功读取官方 TypeScript Responses reference 与 streaming docs；CodeBuddy 国际站详细页 fetch 失败，使用成功读取的官方中文 quickstart/IAM。控制台和本地服务器未登录/未访问，不能把跳转入口核对说成用户账号能力验证。
