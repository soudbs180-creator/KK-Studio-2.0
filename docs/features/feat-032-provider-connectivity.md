# 多供应商接入与多目标配置（FEAT-032）

2026-10-13：已有Provider身份/目录沿用，增量支持OpenAI兼容、Anthropic Messages、Gemini文本协议及Ollama/LM Studio显式loopback免密，Web/Native同任务快照传递协议/认证/历史。网站账号入口独立，不复用订阅与cookies；未调用付费云服务或新增Cherry依赖。见[取舍](../changes/2026-10-13-cherry-red-scope/decisions.md)与[验证](../changes/2026-10-13-cherry-red-scope/verification.md)，真实服务/多平台缺口不升级REAL。

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-10-14
- 关联任务：TASK-PROV-002（已合入）、TASK-PROV-003/004（PARTIAL）、TASK-UI-CONSOLIDATE-20261014、TASK-PROTOCOL-CLI-20261014、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014

## 用户可见入口

- 设置 → 模型接入提供公共预设、协议/认证选择、保存、只读模型获取和手填模型。Desktop / Web 的文本任务共用冻结协议语义；Gemini 走独立 Google 配置；Native Mobile 尚未实现。
- 多目标配置生成仍是逻辑/显式 CLI 能力，新文本协议接线不表示 Agent 配置生成（Codex/Claude）、设置页导入导出、模型上下文窗口选择或 MCP stdio 管理 UI 已全面接线。MCP stdio 执行仅限 Node 侧的后续接线，浏览器保持 streamable_http。

- Agent CLI 入口：`node vendor/canvas-agent/dist/index.js providers apply/check <config.json>`；仅在显式运行时写入指定的 Codex 配置目录。

## 代码位置

- 前端：`src/domain/providerProtocol.ts`、`providerPresets.ts`、`src/integrations/providerModelDiscovery.ts`、`src/features/creation/textGeneration.ts`、`textProtocolEvent.ts`、`providerRegistry.ts`、`providerSubmission.ts`；既有配置模块为 `src/features/providers/providerTargetRenderers.ts`、`providerConfigIO.ts`、`src/features/models/modelCatalogWindow.ts`、`src/features/mcp/mcpConfig.ts`
- Agent：`vendor/canvas-agent/src/agent/codex-provider-config.ts`、`provider-cli.ts`、`src/index.ts`
- 桌面 Rust：`task_host.rs`、`task_host_text.rs`、`task_host_provider.rs`、`task_host_protocol_stream.rs`、`cli_runtime.rs` 与 `main.rs` IPC；沿用现有 TaskHost 和网络安全边界。
- 服务端：未新增云代理或第二任务队列；既有纯函数配置模块仍供显式 CLI 消费。
- 数据/存储：Profile / ProviderConnection 保存可选 protocol/authMode，Project / Task 捕获 providerProtocol/providerAuthMode 并经快照/项目包往返；旧字段缺省仍是 Chat/API Key，不补写旧数据。密钥仅在系统凭据库或请求内存，沿用既有 credentialRef 和保存事务；配置渲染器本身不写存储，Agent apply/check 仍只显式写指定目录。

## 测试与证据

- 2.1.24本地验证（TASK-223，本任务DONE/PASS；功能主状态保持）：显式CLI协议/认证、TOML词法/受管键保守保护、配置失败恢复副本、损坏env拒绝及有界模型JSON检查通过；受控CLI/HTTP夹具不表示真实账号或付费供应商验收；最终产品58b5c07f与完整验证、官方/便携回执见[本轮验证](../changes/2026-10-14-action-usability-223/verification.md)。

- 2.1.23本地按钮修复：`tests/unit/geminiBridge.test.ts`、`tests/unit/agentDesktopSupportInstaller.test.ts`；结果及Web/Desktop边界见[2.1.23历史验证](../changes/2026-10-14-action-usability-222/verification.md)。

- 单测：`tests/unit/providerTargetRenderers.test.ts`、`tests/unit/providerConfigIO.test.ts`、`tests/unit/modelCatalogWindow.test.ts`、`tests/unit/mcpConfig.test.ts`
- 新协议单测：`tests/unit/providerProtocol.test.ts`、`providerProtocolHttp.test.ts`、`providerProtocolSnapshot.test.ts`、`modelCatalogProtocol.test.ts`；本地 HTTP/流夹具不代表真实云供应商验收。
- 浏览器回归：`provider-cli-settings`、`settings-navigation`；配置生成旧批次没有 UI，本轮接入 UI 结果另记。
- Agent 单测：`vendor/canvas-agent/src/agent/codex-provider-config.test.ts`；当前完整 Agent 回归通过，另有 provider-cli.test.ts 的参数/目录/取消边界覆盖。
- Rust 协议、模型发现、快照/项目包和自有 CLI 进程夹具位于对应原生模块；本轮实际 Tauri 和最终构建结果见任务 verification，不借用旧批次证据。
- 变更与验证证据：`docs/changes/2026-09-24-provider-connectivity/{verification,remaining}.md`

## 当前能力

- Gemini CLI本轮2.1.23对非零退出部分JSON及超时返回错误与结果未确认提示，不生成假成功或自动重试。

- 既有逻辑子能力（带单测，不代表外部 CLI 会话或多端全链路已验收）：
  - 同一 ProviderConnection 渲染 Codex `config.toml` provider 块、Claude `settings.json`、OpenAI 兼容 env 三份目标配置，输出经 zod 校验且不含密钥明文。
  - 便携配置 v1 导出/导入/按 id 合并、cc-switch 风格 seed（name/baseUrl/model）导入适配。
  - `model[1M]/[200K]/[512k]/[1000000]` 后缀解析与剥离，生成 cc-switch 兼容 `model_catalog_json`。
  - MCP stdio 服务器持久化契约与命令白名单校验。
- Agent 侧 Codex Responses 配置合并、catalog 落盘与相对指针、apply/check，以及 Claude settings.json/apply-claude 已接入集成树。这些外部 CLI 配置生成的 App UI/HTTP 尚未全面接线，未在真实 Codex/Claude 会话中验收，故保持 PARTIAL。
- 2026-09-26 复审修复：Codex 仅输出当前支持的 Responses 协议并把模型选择置于根级；Bash 环境导出不执行 URL 中的命令替换；stdio 配置解析拒绝凭据键/值；中文 seed 可生成不同 ID；catalog profile ID 不允许目录穿越。独立补审与最终 head 托管检查仍须完成。

## 差距与后端化

- “已实现但未验证/未接线”的点：渲染结果与真实 Codex/Claude 对拍；MCP stdio 客户端在 canvas-agent 接线；配置导入导出 UI；连接级 MCP 挂载。
- 变成 REAL 还缺什么：接线任务（Agent 配置生成、设置页、Gateway/Agent 消费）+ 真实运行证据 + DONE/PASS 账本任务。
- 外部依赖与阻断条件：Codex/Claude 版本字段兼容性需实跑确认；App 设置 UI、HTTP 配置入口与目标 CLI 消费仍需完成，不依赖旧 Gateway 分支才可合并本地配置模块。

## 变更记录

- 2026-09-27：TASK-PROV-003 从旧堆叠分支承接到已合入 #16 的主线；修正配置契约并复验中，状态保持 PARTIAL。

- 2026-09-24：创建卡片，状态 PARTIAL（TASK-PROV-002）。

- 2026-09-30：集成版本当前验证与剩余边界见 [落地验证](../changes/2026-09-29-project-landing/verification.md)。

## 2026-10-14 源码候选与验收边界

公共目录列出 OpenAI、Responses、Gemini、Anthropic、Azure OpenAI、New API、LM Studio、Ollama 与豆包。通用文本链路已显式接入 openai-chat、openai-responses、anthropic、azure-openai、ollama；New API / LM Studio 使用 Chat 兼容协议，Gemini 前往独立 Google 配置。协议和认证参与模型目录、健康状态与提交身份核对，更改连接后旧任务不能改投；旧账号、快照字段缺省与凭据身份保留。

认证为 api-key / none；免密仅允许 localhost、127.0.0.1、::1 的 Chat/Ollama，远程免密和其他协议免密由 TS / Native 双边拒绝。Azure 仅接 v1 `/openai/v1` 和用户部署名称，模型列表不是部署发现。Responses、Anthropic、Azure、Ollama 及免密本地 Chat 本轮仅接文本，不能据品牌虚构图片/视频能力；旧有密钥 Chat 图片链保持原契约。

“获取模型/测试连接”只执行有界 GET，Native 复用 pinned/no_proxy/no-redirect 客户端，Web 不携带网站 cookies、拒绝重定向；成功目录不是生成可用证明。文本流需有完整终态，截断、拒绝、工具输出、坏格式和取消不能归档成成功；中断保留草稿/未知受理语义且不自动重复请求。新协议尚未返回的消耗继续“未报告”。

Windows Desktop CLI 管理已接实际检测、用户主动安装/登录、取消自有操作及 Gemini 桥启停；终端退出和进程健康不推导账号验证，模型连通测试另有明确入口与额度说明。原 apply/check 不因新页面而声称全面接线。最终源码门禁、实际构建和产物身份见[2.1.22协议/CLI验证](../changes/2026-10-14-protocol-cli-completion/verification.md)；真实安装/账号登录/付费供应商调用及 Native Mobile 仍未验收，状态保持 PARTIAL。

2.1.22本机交付完成：五协议真实Native与四取消/超时socket关闭、已保存凭据/迟到目录/旧检测错误隔离均有回执；真实供应商/真人CLI会话与其他配置/MCP接线保持PARTIAL，按本轮verification回读，不能将fixture当云端验收。

### Cherry source 历史范围（仅原 SHA）

2026-10-13 7da 主线候选：正式 production Tauri Native6、真实 Ollama13、严格隔离NSIS生命周期已通过相关链路；不同源码/产物和 Hosted/用户验收边界见[最终记录](../changes/2026-10-13-cherry-red-scope/mainline-final-status.md)。功能总体仍PARTIAL，不据此关闭其他开放任务或真实云/图片/视频能力。

2026-10-14 最新验收：三个文本协议与显式loopback免密已接入，真实Ollama Native13与三平台Native6已PASS；LM Studio/收费云API尚未实联，网站入口不复用消费者账号订阅或cookies。 完整身份与许可见[最终记录](../changes/2026-10-13-cherry-red-scope/mainline-final-status.md)。保留功能整体PARTIAL及其他开放任务。

最终技术锚点0d61：三协议及本地免密接入、真实Ollama13和三平台Native7通过；未调用收费API/未实联LM Studio，网站入口不复用账号订阅。 本期技术步骤完成，用户最终产品/发布范围待验收；功能总体及其他任务状态不批量升级，详见[最终记录](../changes/2026-10-13-cherry-red-scope/mainline-final-status.md)。
