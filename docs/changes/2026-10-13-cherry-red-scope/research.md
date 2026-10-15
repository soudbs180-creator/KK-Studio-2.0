# Cherry Studio 开源借鉴与纠错评估（实施前研究快照）

> 此副本用于远端同步，保留实施前静态结论；后续实际改动和验收以[验证记录](verification.md)和[融合取舍](decisions.md)为准。仅将本仓源码链接改为可移植相对路径，容器原报告未移动或改写。

- 快照日期：2026-10-13。
- 文档性质：容器级竞品研究与能力比较，不承载 KK 现行产品规范。
- 用户目标：学习 Cherry Studio，矫正 KK 的已确认错误，优先复用免费开源能力，并支持 Windows、macOS、Linux。
- 本轮范围：官方文档、固定 SHA 静态源码、当前 KK 读取快照、发布包许可材料。
- 写入范围：仅本报告；容器索引由主任务单独维护。
- 未实施：产品改动、依赖安装、外部代码运行、真实 Provider 调用、三平台运行验收、账本状态变更。

## 1. 结论与证据边界

Cherry Studio 最值得借鉴的是 Provider 端点分工、模型身份、MCP 能力与绑定状态、文件和数据生命周期。
本轮确认的 KK 纠错项是 MCP 功能卡仍描述固定旧协议，而当前客户端已经包含 modern discovery 与 legacy fallback。
跨平台静态核对还确认非 Windows 凭据、随包 Agent 启动和原生桌面验证矩阵存在阻断。
现有 OpenAI 兼容端点实现符合当前契约；不能仅因 Cherry 支持更多协议，就将其认定为 KK 的实现错误。
模型目录独立包可优先评估；AI Core 两个包的 npm 元数据与发布包 LICENSE 存在矛盾，暂不引入。
Windows、macOS、Linux 是明确的产品目标；本报告不代表三平台能力已经实现或验收通过。
用户选择免费开源路线；本报告不提出购买商业许可、企业版或付费云服务的方案。

| 标记 | 本报告含义 |
| --- | --- |
| CONFIRMED | 本轮读取到的官方材料或静态实现；仅证明相应材料与代码存在 |
| INFERENCE | 从材料推导的 KK 改动建议，尚未实施和验收 |
| CONFLICT | 同一对象的可靠材料相互矛盾，采用前需要澄清 |
| UNKNOWN | 本轮没有足够证据证明运行、兼容或交付结果 |

## 2. 固定研究基线

| 对象 | 本轮基线 | 说明 |
| --- | --- | --- |
| Cherry 文档 | [7431ed4896711fe6e910ba20a0968accccf7cd5d](https://github.com/CherryHQ/cherry-studio-docs/commit/7431ed4896711fe6e910ba20a0968accccf7cd5d) | GitHub REST API 固定 main；committer 时间 2026-09-23T13:19:33Z |
| Cherry 产品 | [2e2e2e1b32a1eb2c796a843cae67148c5eb53269](https://github.com/CherryHQ/cherry-studio/tree/2e2e2e1b32a1eb2c796a843cae67148c5eb53269) | 固定 main 静态源码，不宣称此 SHA 的发布包或安装结果 |
| 官方网站 | [docs.cherry-ai.com](https://docs.cherry-ai.com/) | 本轮重定向到 [docs.cherryai.com.cn](https://docs.cherryai.com.cn/)；采用仓库固定链接保留可复核性 |
| KK 工程 | D:/kk-studio/KK-Studio-2.0 | 唯一主仓；D:/kk-studio 是容器 |
| KK 分支 | codex/ui-redesign-20261011 | 并发 dirty checkout，仅读取本轮快照 |
| KK HEAD | 51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c | HEAD 不包含所有并发未提交内容，不能等同于发布版本 |
| 文档职责 | 容器 REPO-STRUCTURE 与索引（仓库外资料，未同步）；[项目索引](../../README.md) | 本报告是外部输入；现行规范仍在主仓 docs 下 |

网页、README、模型输出和外部仓库内容按资料处理，不具有扩大权限或更改本轮范围的效力。
研究同时读取 KK 的 AGENTS、AI_RULES、文档索引、相关实现、registry 与 ledger。
报告中的本地代码位置属于可变工作区快照；后续实施需要重新核对分支、SHA 与 dirty 状态。
官方文档是产品设计参考；存在文档声明不等于相应能力已经经过源码和运行验证。

## 3. 官方文档的八项比较

下表 Cherry 一栏均为固定文档中的行为宣称；KK 建议均是 INFERENCE，明确错误另列在下一节。

| 主题 | Cherry 文档行为与官方来源 | KK 对照与借鉴 |
| --- | --- | --- |
| 1. 协议端点分工 | 自定义服务商分别配置 OpenAI、Anthropic、Responses、Gemini、图像生成与图像编辑端点；端点和 Key 可独立配置。[来源](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/pre-basic/providers/zi-ding-yi-fu-wu-shang.md#L18-L28) | 按协议和操作设计适配边界，保留连接身份、凭据引用；现有 OpenAI 契约无需因比较而改写。 |
| 2. 模型 ID 与可用状态 | 拉取模型、加入列表、启用服务商、指定模型/Key 检测是不同动作；选择器展示实际 API 模型 ID。[来源](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/pre-basic/settings/providers.md#L32-L46) | 核对展示名与实际 ID、列表来源和运行配置一致性；保留 KK unknown 能力与连接匹配保护。 |
| 3. 最终请求 URL | 根地址自动补请求路径；完整地址尾部 # 阻止自动拼接，是 Cherry 自身规则。[来源](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/pre-basic/settings/providers.md#L23-L30) | 评估最终 URL 预览与协议检测；不要将 # 语法当行业协议，不能绕过 KK URL、凭据或重定向保护。 |
| 4. MCP 连接与绑定 | stdio、SSE、可流式 HTTP 按服务配置；启动后查看工具、资源、提示词和参数，再绑定指定 Agent。[来源](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/advanced-basic/extensions/mcp/README.md#L25-L47) | 分别表达连接、发现、绑定、授权和调用结果；不能以握手成功替代自动调用验收。 |
| 5. MCP 提示词与资源 | 输入面板只显示当前已连接、已绑定且实际提供相应能力的服务器；短文本插入，大型或二进制资源作为引用。[来源](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/advanced-basic/extensions/mcp/README.md#L57-L83) | 能力入口由运行事实驱动；MCP 接入工具与向外提供模型的 API 网关分属不同方向。 |
| 6. 助手与 Agent | 助手是提示词与参数预设，其下有多个独立对话；Agent 是自主调用工具、读写文件、完成多步任务的系统。[助手](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/cherrystudio/preview/chat.md#L13-L43)、[Agent](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/advanced-basic/agent.md#L6-L29) | 明确角色预设、模型、执行通道与权限的边界，避免把预设模板展示为已具备执行能力。 |
| 7. 备份与迁移 | 完整备份包含 API Key，精简备份跳过数据文件；跨设备 WebDAV 以备份/恢复描述；V1→V2 单向迁移，读取原数据目录。[备份](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/pre-basic/data-settings/README.md#L10-L33)、[迁移](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/cherry-studio/installation/v1-to-v2-migration.md#L7-L30) | 学习完整性清单和迁移核对，保留 KK 导出拒密钥契约；备份恢复不能宣称实时同步。 |
| 8. 文件与处理边界 | 文件集中管理，提供回收站、缺失标记；知识库保存副本、解析文本、Chunks、索引，云处理环节可能发送资料。[文件](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/cherrystudio/preview/files.md#L16-L48)、[数据边界](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/knowledge-base/data.md#L6-L32) | 核对原件、引用、软删除、恢复与清理关系；按解析/OCR/嵌入/重排/聊天分别表达数据去向。 |

文档中“模型分工与 Agent 绘画”页面仅有截图，不能由页面标题推出完整实现：[固定页面](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/advanced-basic/agent-workspace/models-image.md)。
用户要求免费开源，因此云端解析、付费存储和付费模型能力只用于识别边界，不列入本轮吸纳候选。

## 4. KK 当前静态核对

| 分类 | 已读取证据 | 结论 |
| --- | --- | --- |
| CONFIRMED：OpenAI 兼容检查 | [checkModelProvider](../../../src/integrations/modelProvider.ts) 第 7 行；[getModelsEndpoint](../../../src/domain/modelProvider.ts) 第 92 行 | GET /models，使用 OpenAI 兼容模型列表 schema；直接追加路径是现有明确契约。 |
| CONFIRMED：文本端点 | [textGeneration](../../../src/features/creation/textGeneration.ts) 第 152 行 | 追加 /chat/completions；多协议接入属于扩展设计，尚未构成已确认缺陷。 |
| CONFIRMED：模型身份保护 | [modelCatalog](../../../src/features/models/modelCatalog.ts) 第 150 行 | 匹配 connection id、baseUrl、credentialRef；能力未报告时保留 unknown，不按名称猜测。 |
| CONFIRMED：文本边界 | [textGeneration](../../../src/features/creation/textGeneration.ts) 第 40、67、84 行 | 存在终止标识、32 KiB 文本和 2 MiB 响应限制；采用 SDK 时不能丢失这些门禁。 |
| CONFIRMED：TaskHost 约束 | [ADR-012 文件](../../../docs/architecture/adr/ADR-012-taskhost-text-output.md) | 文本扩展复用现有幂等、journal、取消与 unknown 恢复，不建立第二队列或状态源。 |
| CONFIRMED：MCP 文档滞后 | [mcpClient](../../../src/features/mcp/mcpClient.ts) 第 226 行；[feat-012](../../../docs/features/feat-012-mcp.md) 第 14、30 行 | 当前源码已有 2026 modern discovery 与 legacy fallback，功能卡仍写固定 2025 和推断不支持 modern。 |
| CONFIRMED：项目包保护 | [projectPackage](../../../src/features/projects/projectPackage.ts) 第 103、206、461 行 | manifest version 1、checksum、preflight 与 secret 拒绝存在；不是无校验 ZIP 导入。 |
| CONFIRMED：配置导出保护 | [providerConfigIO](../../../src/features/providers/providerConfigIO.ts) 第 19、40 行 | version 1，凭据使用不透明引用，导出扫描拒绝密钥明文；不照搬 Cherry 备份包含 API Key。 |

MCP 文档应首先校准为“源码支持已存在，真实兼容性仍待验证”。
此处只登记差异，本轮未修改功能卡、源码、测试、ADR 或账本。
现有 OpenAI 兼容契约、连接身份检查、unknown 能力、受理未知不自动重复提交均应保留。
TASK-PROV-BYOK-001 仍为 TODO；端点研究不授权新增跨端 onboarding、服务端代理或账户复用。

## 5. 账本与功能状态

来源：[features.registry.json](../../../docs/features/features.registry.json)、[task-ledger.json](../../../docs/governance/task-ledger.json)，均为本轮当前文件读取。

| 对象 | 读取状态 | 本报告的证明边界 |
| --- | --- | --- |
| FEAT-008 / 009 / 011 / 012 / 013 | PARTIAL | 不因竞品比较或静态代码存在升级为 REAL |
| FEAT-019 / 022 / 030 / 031 / 032 | PARTIAL | 运行、跨端、外部能力和用户验收分别按原任务证据判断 |
| FEAT-038 | PROTOTYPE | API 网关不能由 MCP 或文档声明推成真实后端 |
| TASK-MCP-PROTO-001 | PARTIAL | ledger 记录本地 25 项 MCP 单测与浏览器握手；本轮没有重新运行 |
| BACKEND-MCP-AUTO | TODO | 自动调用仍待实现/验收，手动连接不能替代 |
| TASK-PROV-BYOK-001 | TODO | 本地 API Key 直连不等于 BYOK 产品化完成 |
| EXT-PROVIDER | BLOCKED | 本轮未做真实第三方生成调用，保持原状态 |

TASK-MCP-PROTO-001 记录的真实第三方服务器及 Desktop 实机验收仍待外部环境。
以上是读取的状态和已有验证文本，不是本轮重新测得的 PASS。
并发工作区后续可能变化；执行改动前必须刷新上述文件。

## 6. 免费开源与许可筛选

只考虑可从公开源码或正式发布包免费获得、且许可可满足 KK 使用方式的能力。
“开源客户端”与“其连接的云服务免费”是两件事；免费额度和商业 API 不作为免费开源依赖。
不吸纳企业版封闭功能、商业授权豁免方案、订阅能力、付费解析或付费云服务。
AGPL 是免费开源许可，带有条件；不能直接归为付费库，也不能当作 MIT。
Cherry [社区版 README](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/README.md#L224-L230) 与 [LICENSE](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/LICENSE) 标为 AGPL-3.0。
README [企业版比较](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/README.md#L172-L196) 列出收费与部分公开材料，排除在免费开源吸纳范围之外。
源码学习、行为借鉴与复制代码/引入依赖分开判断；复制和依赖采用前必须核对许可及 KK 适用方式。

| 候选 | 本轮官方材料结果 | 采用建议 |
| --- | --- | --- |
| @cherrystudio/provider-registry 0.1.0 | npm 元数据与发布包 LICENSE 均为 MIT，CONFIRMED。[元数据](https://registry.npmjs.org/@cherrystudio%2fprovider-registry/0.1.0)、[发布包](https://registry.npmjs.org/@cherrystudio/provider-registry/-/provider-registry-0.1.0.tgz) | 优先评估目录数据及无平台依赖接口；兼容性和能力真实性仍 UNKNOWN。 |
| @cherrystudio/ai-core 2.2.0 | npm metadata license=MIT，实际 package/LICENSE 为 GNU AGPL Version 3，CONFLICT。[元数据](https://registry.npmjs.org/@cherrystudio%2fai-core/2.2.0)、[发布包](https://registry.npmjs.org/@cherrystudio/ai-core/-/ai-core-2.2.0.tgz) | 不按 MIT 直接引入；等待上游免费澄清，保留独立适配方案，不购买许可。 |
| @cherrystudio/ai-sdk-provider 0.1.7 | npm metadata license=MIT，实际 package/LICENSE 为 GNU AGPL Version 3，CONFLICT。[元数据](https://registry.npmjs.org/@cherrystudio%2fai-sdk-provider/0.1.7)、[发布包](https://registry.npmjs.org/@cherrystudio/ai-sdk-provider/-/ai-sdk-provider-0.1.7.tgz) | 同上；本轮不安装、导入或运行该包。 |
| @modelcontextprotocol/sdk | Cherry 声明 1.32.0；该确切 npm 包内 LICENSE 为 MIT。KK vendor Agent lock 已有 1.30.0。[发布包](https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.32.0.tgz)、[官方文档](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md) | 优先评估现有依赖；stdio 留在宿主。v1/v2 协议能力需分别核对，不直接用 Cherry 版本替换 KK modern/legacy 客户端。 |
| ai 与官方 AI SDK adapters | Cherry 使用 ai 6.0.185；官方项目为 Apache-2.0，KK 尚未引入。[Cherry 依赖](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/package.json)、[官方许可](https://github.com/vercel/ai/blob/main/LICENSE) | 可评估协议适配，SDK 免费不代表上游推理免费；本轮不接付费模型，不改变任务和凭据边界。 |
| zod、remark-gfm | Cherry 使用 zod 4.4.3、remark-gfm ^4.0.1；KK 根 lock 已有 4.5.4、4.0.1。[Zod 许可](https://github.com/colinhacks/zod/blob/main/LICENSE)、[GFM 许可](https://github.com/remarkjs/remark-gfm/blob/main/license) | 复用已有依赖与校验/Markdown 管线；Agent 侧 Zod 3 与根 Zod 4 的 schema 不可直接混用。 |
| dexie | Cherry 声明 ^4.0.8，Apache-2.0；KK 未引入。[官方项目](https://github.com/dexie/Dexie.js)、[许可](https://github.com/dexie/Dexie.js/blob/master/LICENSE) | 浏览器 IndexedDB 候选，不能直接替换 Desktop 原生仓库；先核存储身份、迁移与失败恢复成本。 |
| pdfjs-dist | Cherry 使用 5.4.296，Apache-2.0；KK 未引入。[官方说明](https://mozilla.github.io/pdf.js/)、[许可](https://github.com/mozilla/pdf.js/blob/master/LICENSE) | 免费本地 PDF 渲染/文本提取候选；三平台 WebView 的 Worker、CSP、字体、大文件限制均须实测。 |

Cherry 的 file-preview 包为 AGPL-3.0-only 且依赖 React 19；ui 包依赖 React 19/Tailwind 4，不整包搬进 KK 的 React 18 体系。[file-preview](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/packages/file-preview/package.json)、[ui](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/packages/ui/package.json)。
未确认 Cherry 根直接采用 react-markdown、rehype-sanitize 或 eventsource-parser，不将它们冒充已核实的 Cherry 直接依赖。

主任务只读核验方式：从 npm 官方下载 tgz 到内存，以 .NET TarReader 读取 LICENSE；未写盘或执行包代码。
材料矛盾是采用前置条件；此处不作法律适用的确定结论。
发布包 SHA-256 与实际许可文件 SHA-256 如下，供后续同一包复核：

- ai-core 2.2.0 tgz：6916E4C1D24B9A6B6441D7B92E9420B18F528921FC7779C70A994544AC7E1A57。
- ai-sdk-provider 0.1.7 tgz：5B16461D6D87A7BD9ADAE268FC96342C0C045C11C3868E1F48F5B21E9DD603AF。
- 上述两包 LICENSE：0D96A4FF68AD6D4B6F1F30F713B18D5184912BA8DD389F86AA7710DB079ABCB0。
- provider-registry 0.1.0 tgz：C9CC34319FB398FC6EDBEE9B3D271BEE695CE6937C09657733C4F89C42921B9F。

### 6.1 源码与测试设计可借鉴点

以下绑定产品固定 SHA；仅阅读测试，未执行。产品主源码按根 AGPL 管理；具有独立许可的包另按其确切材料判断。本轮只学习契约，未复制代码。

| 模式 | 固定源码/测试依据 | KK 落点 |
| --- | --- | --- |
| Provider、协议与 adapter 分开 | [endpoint.ts](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/provider/endpoint.ts#L35)、[endpoint.test.ts](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/provider/__tests__/endpoint.test.ts#L87) | 按 endpoint 的 adapterFamily 路由，目录规范化与实际 API ID 分开；不把协议回退做成换账号/重发。 |
| 目录向前兼容 | [forward-compatibility.test.ts](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/packages/provider-registry/src/__tests__/forward-compatibility.test.ts#L29) | 未知能力不自动启用，已知模型可保留；声明能力与生成实测分开。 |
| 流式广播、累积与终态持久化分工 | [pipeStreamLoop.ts](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/streamManager/pipeStreamLoop.ts#L30)、[测试](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/streamManager/__tests__/pipeStreamLoop.test.ts#L37) | UI 草稿与最终结果分开，保留中断输出；终态保存后再通知，沿用 KK TaskHost/journal。 |
| MCP 错误分类和授权上下文 | [ExternalMcpConnection.ts](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/mcp/connections/ExternalMcpConnection.ts#L45)、[ClientMcpConnection.ts](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/mcp/connections/ClientMcpConnection.ts#L50) | 404/405 的传输不匹配与 401/403 认证错误分开；反向请求、roots 与操作绑定有效会话及授权范围。 |
| 捕获 adapter 实际请求 | [captureRequest.ts](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/provider/custom/__tests__/boundary/captureRequest.ts)、[豆包边界测试](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/provider/custom/__tests__/boundary/doubao.boundary.test.ts#L97) | 检查最终 URL、headers、body、响应和取消，不能只测配置对象；fixture 仍不等于真实 Provider 验收。 |

## 7. Windows、macOS、Linux 目标

Cherry [固定 README](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/README.md#L30-L32) 宣称支持 Windows、Mac、Linux；本轮没有替其验收。
其静态打包配置分别包含 Windows NSIS/portable、macOS dmg/zip、Linux AppImage/deb/rpm，并配有平台测试；这提供工程参考，尚不证明对应 SHA 的产物通过安装。[打包配置](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/electron-builder.yml#L111)、[平台 CI](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/.github/workflows/ci.yml#L258)。
Cherry 也明确部分 OS/arch 缺少原生绑定；三端支持需要逐能力门禁。[platform.ts](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/core/platform.ts#L8)。
KK 的三平台桌面目标复用既有共享领域与 Tauri 宿主边界，不能直接复制 Electron 专属进程或窗口实现。
Desktop 优先的现行交付顺序仍有效；Windows 一次成功不能替代 macOS 或 Linux 的同态证据。

| 平台 | 后续必须覆盖的实际验收 | 本轮状态 |
| --- | --- | --- |
| Windows | 实际安装/启动、凭据库、路径和原件读写、MCP 本地进程、取消与重启恢复 | UNKNOWN：本轮无运行验收 |
| macOS | Intel/Apple Silicon 目标、系统凭据与文件授权、MCP 子进程、窗口生命周期与恢复 | UNKNOWN：本轮无构建或真机验证 |
| Linux | 实际发行环境、系统凭据可用性、目录权限、WebView 与 MCP 子进程、安装/重启恢复 | UNKNOWN：本轮无构建或实机验证 |

免费开源候选必须在三平台核对 native addon、外部二进制、安装脚本、Node 专属依赖和最低运行环境。
模型目录数据可进入共享层；系统凭据、文件、进程和窗口能力必须留在平台适配层。
不把任一候选包的 TypeScript 接口或 Cherry 三平台声明视为 KK 的三平台兼容证明。
签名、安装、应用更新、发布渠道和用户验收需要后续各平台证据，不能从本轮静态研究得出。
免费路线先研究已有设备上的本地构建、离线测试与 hash 收据；不引入付费签名服务或新证书采购。未签名/未公证状态单列，不能承诺与正式签名分发相同的安装体验。[Tauri 分发文档](https://v2.tauri.app/distribute/)。

### 7.1 已确认的三平台阻断

| 阻断 | 本轮静态证据 | 影响与建议 |
| --- | --- | --- |
| 系统凭据只接 Windows | [Cargo.toml](../../../src-tauri/Cargo.toml) 第 32–34 行仅配置 windows-native；[main.rs](../../../src-tauri/src/main.rs) 第 375–376、394–395、410–411 行非 Windows set/get/delete 返回不支持；[task_host.rs](../../../src-tauri/src/task_host.rs) 第 1216–1219 行非 Windows credential 返回 None | CONFIRMED：macOS/Linux 原生持久凭据链缺失；沿现有系统凭据适配边界补平台能力，避免明文降级。 |
| 随包 Agent 启动只接 Windows | [agent_runtime.rs](../../../src-tauri/src/agent_runtime.rs) 第 88–92 行 available 要求 cfg!(windows) 与 node.exe，第 174–181 行启动 node.exe；[runtime-package.mjs](../../../scripts/agent/runtime-package.mjs) 第 96 行却按 OS 复制 node.exe 或 node | CONFIRMED：打包与启动的跨 OS 契约不一致；按 platform/arch 统一资源清单、可执行名和宿主生命周期。 |
| 原生桌面 CI/发布缺三平台矩阵 | [quality.yml](../../../.github/workflows/quality.yml) 第 77 行完整 verify 为 windows-latest，第 26 行 deploy-linux 是部署脚本测试；[windows-release.yml](../../../.github/workflows/windows-release.yml) 第 13 行 Windows NSIS | CONFIRMED：现有 Linux job 不证明 Linux 原生桌面，未见 macOS/Linux 原生矩阵；补各 OS/arch 构建、安装、运行与恢复证据。 |

[tauri.conf.json](../../../src-tauri/tauri.conf.json) 第 34 行 bundle.targets=all 只表达配置意图，不能证明已构建或支持所有系统。
[storage_paths.rs](../../../src-tauri/src/storage_paths.rs) 第 39 行使用 dirs::data_dir；已有 asset_io、creation_storage、project_package 的 Unix 分支应复用。
以上是当前读取快照，报告没有实施跨平台修复，也未复跑历史 Windows 验证。
现有 keyring 3.6.3 官方已支持三系统；macOS 可评估 apple-native，Linux 需选择实际可用的持久 Secret Service 后端，不能误用无 feature 的 mock store。[确切版本官方文档](https://docs.rs/keyring/3.6.3/keyring/)。
伴随二进制按 OS/arch/目标三元组、执行权限及 hash 核对，沿 Tauri 与现有资源清单适配。[Tauri sidecar](https://v2.tauri.app/develop/sidecar/)、[Cherry Linux 原生校验](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/scripts/linux-native/compat.js#L119)。

## 8. 建议改动清单与验收

本表是待实施的优先级建议；当前授权只保存研究报告，未把任何建议标为已实现。

| 优先级 | 建议与分类 | 影响模块 | 验收要求 |
| --- | --- | --- | --- |
| P0 | 校准 MCP 功能卡旧协议描述，CONFIRMED | docs/features/feat-012-mcp.md、相关 verification 引用 | 与当前 discovery/fallback 源码一致；保留 PARTIAL 和第三方/Desktop 未验边界，不改写历史测试。 |
| P0 | 补 macOS/Linux 凭据与 Agent 宿主阻断，CONFIRMED | src-tauri/Cargo.toml、main.rs、task_host.rs、agent_runtime.rs | 系统凭据不落明文；打包资源与启动平台一致，启动/取消/退出/同身份恢复均有实际证据。 |
| P1 | 评估独立模型目录包，INFERENCE | src/features/models/modelCatalog.ts、src/domain/modelProvider.ts | 固定版本与许可；保留真实模型 ID、连接 id/baseUrl/credentialRef 和 unknown；不凭名称补能力。 |
| P1 | 协议端点设计与最终 URL 预览，INFERENCE | src/integrations/modelProvider.ts、src/domain/modelProvider.ts、src/features/creation/textGeneration.ts | OpenAI 现有行为回归；验证自定义路径、协议错误、认证失败、取消和最终 URL；不扩展 BYOK 产品化范围。 |
| P1 | MCP 连接→绑定→授权→调用状态链，INFERENCE | src/features/mcp、Agent 接线与设置 UI | 断连、未绑定、能力为空、待授权、调用失败可区分；真实第三方与 Desktop 分别留证。 |
| P2 | Markdown 与文件能力按模块评估，INFERENCE | 渲染入口、文件仓库、项目结果引用 | 长文与嵌入内容安全边界、缺失引用、软删除/恢复、跨平台打开位置及原件回写。 |
| P2 | 迁移/备份完整性与恢复核对，INFERENCE | src/features/projects/projectPackage.ts、providerConfigIO、存储宿主 | 保留 checksum/preflight/拒密钥；确认原件和引用恢复、版本不兼容、失败不覆盖与回滚。 |
| P1 | 三平台打包、CI 与真实机安装，INFERENCE | src-tauri、scripts/agent/runtime-package.mjs、平台工作流 | 每个平台/架构实际构建、安装与最小文本/图片/恢复链路留证；不从 Windows 结果外推。 |

采用任何 SDK 都必须保留 bounded SSE、协议终止、取消、迟到响应、unknown 不自动重复提交、幂等和 journal 恢复。
本报告不增加第二任务队列、第二模型状态源或第二工程，不改变 runtime-storage 身份。
技术选择由后续工程评估完成；无需用户逐项决定协议实现细节。
如确需改变产品语义、权限或数据外发范围，应在具体任务中按现行规则处理。

## 9. Cherry 路线图映射

[固定 README Roadmap](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/README.md#L81-L113) 是计划宣称，不是当前完成状态的机器可读账本。
README 同时链接 Mobile 项目且仍列 Android/iOS Phase 1；不能据此断言移动端缺失或已完成。
主任务本轮以 GitHub REST 读取 issue/PR 状态；旧路线图文字与当前状态需要分别记录。

| Cherry 方向 | 本轮材料与状态 | KK 吸纳方式 |
| --- | --- | --- |
| Agent 生命周期与恢复 | [固定运行时说明](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/docs/references/ai/agent-session-runtime.md) 是静态架构依据 | 优先研究进程、取消、产物和恢复契约；复用 KK 现有 TaskHost，不另造任务状态源。 |
| 深度研究 | README 列计划；[issue #6387](https://github.com/CherryHQ/cherry-studio/issues/6387) 为 closed/not_planned，closed_at=2025-12-04 | 只评估免费开源研究工具组合，不写成 Cherry 当前开发进度，不新增付费检索依赖。 |
| 记忆 | [issue #6388](https://github.com/CherryHQ/cherry-studio/issues/6388) 为 closed/completed；[固定设计说明](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/docs/references/memory/overview.md) 明确旧 v1 GlobalMemory 已移除，现分 FileMemory/Knowledge/MCP Memory | 后续按知识与记忆职责学习；保留 KK 现有记忆和隐私契约，旧任务完成不代表旧实现仍有效。 |
| 划词助手 | README 列计划；[PR #5900](https://github.com/CherryHQ/cherry-studio/pull/5900) 已于 2025-05-26 合并 | 评估快捷入口与权限行为，合并事实不能替代该版本三平台运行证据。 |
| 本地文档/OCR | [OcrInferenceService](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/localModel/capabilities/ocr/OcrInferenceService.ts) 为本地实现线索 | 次优先评估免费引擎；模型权重、运行时与传递依赖许可分别核对，本轮不安装模型。 |
| 文档预处理、知识与画布 | README 列 OCR、笔记、Dynamic Canvas 等方向 | 先核对 KK 已有模块，按免费解析、原件引用和恢复契约补差距，不另造第二画布/存储。 |
| MCP 市场 | [McpCatalogService](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/main/ai/mcp/McpCatalogService.ts) 为静态实现线索 | 先完成连接、权限、安装回执与调用事实链，再研究市场入口。 |
| ASR/TTS/插件系统 | [ASR #6399](https://github.com/CherryHQ/cherry-studio/issues/6399)、[TTS #6394](https://github.com/CherryHQ/cherry-studio/issues/6394)、[Plugin System #6400](https://github.com/CherryHQ/cherry-studio/issues/6400) 为历史 closed/not_planned | 不按 README 推成正在开发；仅吸纳经免费许可与实际源码核实的独立能力。 |
| 平台与多窗口 | README 列 HarmonyOS、移动端、多窗口和置顶 | 本轮优先落实用户明确的 Windows/macOS/Linux 桌面目标，Mobile 沿现行平台交付门禁。 |

本轮公开 [Project 7](https://github.com/orgs/CherryHQ/projects/7) 返回 24 项 closed/merged 历史记录，不是完整现行产品路线图。
公共 project board 或 README 的计划项只作研究入口；是否完成需要对应提交、版本和运行证据。
本报告的路线图映射没有新增任务、变更优先级账本或实施产品功能。

## 10. 交互学习与 KK 约束

只吸纳行为与状态表达；KK 继续遵循 [UI_INDEX](../../../docs/UI_INDEX.md) 和当前 Figma 视觉规范。
不整搬 Cherry React 19/Electron UI；平台壳与渲染实现必须符合 KK 当前架构。
下表是文档依据与 INFERENCE 验收建议，未进行真实 Cherry 交互操作。

| 交互 | 官方文档依据 | KK 后续验收重点 |
| --- | --- | --- |
| 模型选择 | [对话助手](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/cherrystudio/preview/chat.md#L63-L73) 区分助手默认与临时切换；[Provider](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/pre-basic/settings/providers.md#L32-L46) 区分列表与启用 | 显示实际 API ID、当前连接与能力；切换结果同持久化和运行请求一致。 |
| 附件 | [输入面板](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/cherrystudio/preview/chat.md#L111-L126) 包含附件、图片预览和视觉能力要求 | 上传、解析、预览、移除、大小限制及不支持模型的禁用原因可观察。 |
| 发送/停止 | [发送键](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/cherrystudio/preview/chat.md#L128-L139) 与[后台命令停止入口](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/advanced-basic/agent-workspace/permissions-memory-background.md#L37-L48) | 发送状态、取消受理、后台命令停止和模型生成停止分开核对；不由后台停止文档推出所有流式生成可取消。 |
| 工具审批 | [权限模式](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/advanced-basic/agent-workspace/permissions-memory-background.md#L10-L24) 与等待批准通知 | 说明操作范围、危险影响及待批准状态，批准结果绑定实际调用，不把保存设置视为批准。 |
| 失败恢复 | [MCP 排错](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/advanced-basic/extensions/mcp/troubleshooting.md#L11-L13) 优先看日志修配置，删除前保存无密钥副本 | 保留配置、草稿、原件和 unknown；日志脱敏，失败时不自动清空或重复提交。 |
| 设置保存反馈 | [Provider 启用与检测](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/pre-basic/settings/providers.md#L37-L46)、[MCP 绑定](https://github.com/CherryHQ/cherry-studio-docs/blob/7431ed4896711fe6e910ba20a0968accccf7cd5d/advanced-basic/extensions/mcp/README.md#L89-L92) | 保存、持久化、启用、运行加载和连通分别反馈；本轮文档未证明 Cherry 保存弹窗的实际时序。 |

### 10.1 交互源码与故障测试依据

| 交互契约 | 固定 Cherry 源码/测试 | 对 KK 的具体约束 |
| --- | --- | --- |
| 模型同名消歧与可用集合 | [useModelSelectorData](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/ModelSelector/useModelSelectorData.ts#L98)、[测试](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/ModelSelector/__tests__/useModelSelectorData.test.ts#L406) | 名称分组不改真实路由；过滤禁用/孤儿候选，保留连接身份与 unknown 能力。 |
| 发送/停止、快捷键与输入法 | [ComposerSurface](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/composer/ComposerSurface.tsx#L236)、[快捷键测试](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/composer/__tests__/ComposerSurface.test.tsx#L5107) | 同一发送入口覆盖 IME、重复按键、面板 Enter 优先；停止绑定实际任务，异步完成不抢焦点。 |
| 完整草稿按会话隔离 | [chatDraftCache](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/composer/variants/chat/chatDraftCache.ts#L7)、[测试](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/composer/variants/__tests__/chatDraftCache.test.ts#L55) | 文本、附件与工具引用配对恢复；KK [附件读取](../../../src/components/useConversationAttachments.ts) 已有 draftKey/generation 围栏，应保留；多窗口编辑冲突本轮未核验。 |
| 审批请求身份和提交失败 | [PermissionRequestComposer](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/composer/variants/PermissionRequestComposer.tsx#L161)、[队列测试](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/composer/__tests__/useToolApprovalComposerOverrides.test.ts#L91) | 工具/参数/目标清楚，提交中防重，失败保留待审批项；KK [停止和审批](../../../src/components/AgentConversationMessages.tsx) 已存在，不重造入口。 |
| 文件错误状态有准确动作 | [FilePreview](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/FilePreview/FilePreview.tsx#L23)、[测试](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/components/FilePreview/__tests__/FilePreview.test.tsx#L105) | 缺失、读失败、无插件、目录、无效路径分别显示；只有已确认存在的文件可外部打开。回收站仍仅文档证据。 |
| 设置草稿与运行状态分开 | [McpSettings](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/pages/settings/McpSettings/McpSettings.tsx#L255)、[测试](https://github.com/CherryHQ/cherry-studio/blob/2e2e2e1b32a1eb2c796a843cae67148c5eb53269/src/renderer/pages/settings/McpSettings/__tests__/McpSettings.test.tsx#L153) | 同 ID 的后台刷新不覆盖未保存编辑；保存成功但重启失败时分别反馈。Cherry 该流程仍有合并报错口径，不原样照搬。 |

后续在 KK 既有 model-picker、input-contract、interaction-state、mcp-settings 与附件浏览器回归中补契约，分别验证三平台；不把阅读 Cherry 测试称作测试通过。

## 11. 本轮验证记录与剩余限制

- 已读取固定 Cherry 官方文档与产品 README、LICENSE，核对文档 SHA 和研究源链接。
- 已读取 KK 当前相关源码、功能 registry、任务 ledger 和规则；未运行产品测试。
- 已静态确认 MCP 文档与当前源码描述不一致；未实施修正。
- 已按官方发布包核对候选许可文本与哈希；未安装或运行依赖。
- 报告及容器索引共 75 个本地链接已检查，均存在；索引仅登记一条本报告入口。
- 独立研究上下文已复核许可、免费约束、路线图和验收边界；这不构成产品代码审查或运行验收。
- 研究报告不修改产品版本、源码、配置、功能状态或任务状态。
- 产品运行、真实第三方 MCP、真实 Provider、三平台安装及用户验收：UNKNOWN。
- npm 发布包与 KK 现有架构、运行环境和依赖图的兼容性：UNKNOWN。
- 采用候选前需重新核对确切版本、许可、传递依赖和运行证据；免费路线不包含商业许可采购。
- 本轮只校验源文件、文档与许可材料；没有运行验收，也不构成发布或可用性证明。
