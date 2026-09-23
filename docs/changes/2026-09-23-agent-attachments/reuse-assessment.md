# Infinite Canvas 对 KK 未完成清单的复用评估

保存说明：以下为实施前的静态评估快照。“本次只做源码对照”等措辞仅指该评估阶段；随后第一批附件与画布控制的实际实现、当前状态和运行证据见本目录 verification.md 与 remaining.md。

核验时间：2026-09-23。用户范围：检查当前未完成功能能否借助该开源项目实现；本次只做源码对照与实施建议，不变更产品代码或功能状态。

## 结论

可以，而且应优先继续复用。很多未完成项已有上游协议实现或本地移植模块，剩余工作是接入 KK 的任务、素材、权限和界面。此前清单只记录“未完成/未验收”，没有同时标明这些可复用来源，容易让人误以为必须从零开发。

“直接复用”的准确含义是复用服务代码、数据契约和成熟交互流程；把文件复制到 KK 并不等于产品能力已经完成。KK 已有的存储身份、原生任务宿主、凭据库和 Design System 继续作为接入边界。

## 当前来源与已有移植

- 通过 git ls-remote 和独立浅克隆核对上游 main：`e6d0911e9d509d00150eaab02f9ca05be94ffc46`，VERSION 为 `v0.19.0`，最后提交时间 2026-09-21。与 KK vendor/README.md 记录的参考提交相同；本次发现的能力不依赖升级到另一上游版本。
- KK HEAD：`cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4` 加现有未提交候选。本地文件才是当前 KK 的比较对象，不能只比较已提交 HEAD。
- 已移植：canvas-agent、canvas-proxy、画布插件 SDK 与 HTML/Markdown/SVG/便利贴、提示词来源/缓存/搜索、TTS 请求构造、WebDAV 传输层。Agent、插件和提示词库已有 KK UI 接线；TTS、WebDAV 尚缺完整产品链。
- 旧移植边界在 [vendor/README.md](D:/kk-studio/KK-Studio-2.0/vendor/README.md:21) 明确排除了上游生成 API 前端层、file/image-storage 与整套 UI。这解释了为什么上游 web/src/services 的视频/模型协议代码尚未进入 KK。
- 上游是 React 19 / Zustand / Ant Design / 浏览器存储；KK 是 React 18 / 自有状态契约 / Tauri 2。复用纯逻辑和适配器，不以整个前端替换现有工程。
- [MIT LICENSE](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/LICENSE)允许复用；保留对应版权与许可文本。README 另请求二次开发保留作者信息及前端标识，实施时保持清晰来源归属。

## 未完成项逐项对照

“复用程度”和“工作量”为基于源码依赖关系的工程判断，不是已经运行验收或承诺工期。

| KK 项目 | 已核实的上游实现 | KK 当前缺口 | 建议与复用程度 |
| --- | --- | --- | --- |
| Agent 图片附件、画布图片引用 | local-agent-panel 将附件和画布引用去重，做数量/体积检查；HTTP turn 接收附件；Codex 写临时图片并用 localImage 输入，结束清理 | KK AgentTurnInput 已含附件类型，vendor 后端也有实现；agentConnection.ts:735 仍固定 attachments: [] | **高复用，优先 1**。接 KK 附件/素材读取、项目隔离、失败保留、大小限制和消息展示。内置生图参考编辑需另做真实图片请求验收，不能仅凭附件成功就宣布编辑成功 |
| Agent 选择节点、移动视口 | canvas-agent-ops.ts 已修改 selectedNodeIds/viewport；工具协议已定义 | KK agentCanvas.ts:342/346 显式拒绝两项操作 | **高复用，优先 1**。复用契约/算法，桥接 KK 选择状态与视口，验证世界坐标、焦点和项目切换 |
| Agent 项目/素材/提示词等站内工具 | agent-site-tools.ts 有项目列表、生成状态、工作台图/视频生成配置、提示词搜索、素材列表/添加，共9个站内工具名 | KK handleTool 当前只接 canvas_apply_ops；其他转发工具明确报未接入 | **高复用，优先 1/2**。复用工具名称、schema和流程，执行改接 KK 仓库；需区分只读工具与写入/生成审批 |
| TTS 音频生成 | audio.ts 有 /audio/speech、音色/格式/速度/说明、AbortSignal、错误与结果归档调用，画布页有真实调用链 | KK requestAudioGeneration 已移植且有单测，生产调用点尚未接入；节点仍走演示 | **高复用，中等接入量，优先 2**。补 Provider/任务/节点/素材归档；NativeTaskHostRequest 当前仅 image/text，桌面音频需扩展契约。仅覆盖该 TTS 路径，不能泛称所有音乐模型已支持 |
| 视频生成与参考图/首尾帧 | video.ts 有 OpenAI 兼容 /videos 和 Gemini predictLongRunning，任务创建、轮询、结果读取、首尾帧及图/视频/音频参考；画布保存原生任务ID并可恢复查询 | KK 视频仍为演示，没有真实 video provider；任务/归档的完整视频链未实现 | **高复用，中等到较大接入量，优先 3**。移植协议适配与状态解析，复用 KK 队列、unknown状态和原生下载。上游脚本视频结果只存内存Map，且客户端取消不证明远端任务取消，恢复逻辑需补齐 |
| Gemini 原生 API 与非兼容 API | image.ts 有 Gemini 文本/生图/编辑/列模型；video.ts 有 Gemini视频；model-plugin.ts 提供文本/图/音/视频脚本模板、HTTP和轮询助手 | KK 当前主路径是 OpenAI 兼容协议，未移植这一层完整能力 | **中高复用，优先 3/4**。先做固定、可测试的 Gemini/视频适配器，再设计受控自定义协议。上游类型只内建 openai/gemini，不能据此声称覆盖所有市场接口 |
| 新模型自动参数 | 上游按渠道列模型，模型包含 capability 和可选 script；可自定义模型调用 | 列表接口主要返回模型名，没有统一完整参数schema；KK已有能力声明与参数限制 | **部分复用**。复用模型发现、模板与映射，不把“拉到新名称”当作自动知道全部尺寸/时长/质量参数 |
| Proxy 一键托管 | canvas-proxy 已有 HTTP/SSE 透传、CORS、请求/响应头处理 | 服务已经 vendor；尚未像 Agent 一样由 Tauri 管理 | **高复用，独立优先项**。复用转发核心和 KK 已完成的进程所有权/生命周期基础，补认证、来源和目标限制，再做托管；不原样暴露当前任意URL转发 |
| Google AI Studio / Antigravity / 豆包 / WorkBuddy 登录复用 | 找到 Gemini API，以及 Codex/Claude CLI实现；在 web/src、canvas-agent/src、canvas-proxy、plugins 未找到所列产品的专用登录适配器 | 当前仍缺实际产品的授权/调用/恢复契约 | **现有仓库不能直接填平**。Gemini API Key路径与Google产品网页登录分别处理；可以借用Adapter结构，仍需针对目标产品补实现 |
| 后台网页、多窗口并发、验证码/登录失效恢复 | Canvas Agent有客户端会话、busy/activeClient和Codex串行队列 | 未发现浏览器会话池或外部网页自动化调度；多画布会话不等于多软件/网页执行 | **仅借鉴会话结构**。需独立实现相关执行器、取消和未知结果恢复 |
| 通用第三方 MCP / 控制所有桌面 App | 上游提供画布MCP Server和特定站内工具；Claude CLI入口亦存在 | 通用MCP客户端/授权编排、任意桌面软件控制没有相应完整实现 | **部分参考**。KK已有自己的MCP客户端，扩展时复用KK现有握手与权限链；上游画布工具不等于任意软件控制 |
| 真实付费 Provider 逐家验收 | 有协议代码和模板，可降低实现成本 | 无法替代目标厂商的Key、权限、真实结果与取消/恢复验收 | **不能靠复制完成验收**。可先完成本地协议fixture和错误/恢复测试，真实调用单独记录 |

## 顺带可复用的工程总清单项目

- **WebDAV 同步**：上游 webdav-sync.ts 提供传输，app-sync.ts 提供多数据域manifest、缺失素材上传下载、ID/更新时间合并和删除标记。KK已经移植传输层；下一步可借用编排思路，但需适配KK快照schema、原生素材和冲突策略。它不要求先建设KK账号服务器，也不自动实现KK账号/计费平台。
- **Claude Code**：存在CLI执行和流式事件适配，但上游TODO仍写着升级Claude Agent SDK与工具队列；不能把这条路径当作已达到KK Codex路径的生命周期、恢复和权限验收水平。
- **插件扩展**：现有四插件已复用；上游还包含panorama全景查看插件，可作为独立增强候选。它从CDN加载three.js，离线打包和供应来源需要单独适配；不影响当前主清单优先级。
- **ComfyUI、账号/积分、长期记忆、原生安装发布**：本次实现目录检索未发现可以直接替换KK对应工作流的完整实现。上游TODO也保留本地记忆等后续事项。

## 不应原样搬入的具体实现

这些是已读源码中的差异，不是泛化风险提示：

1. `use-config-store.ts:207` 使用 persist 保存 config/webdav；其中包含 apiKey/密码字段。KK必须继续使用系统凭据库/请求内存。
2. `model-plugin.ts:118` 使用 new Function，并把 apiKey、HTTP/request等对象传给脚本。可复用调用模板和返回值契约，但执行环境、目标限制和权限需要先设计，不能当作安全隔离脚本沙箱。
3. `video.ts:247` 为 Gemini 结果URL追加 key；KK禁止凭据进入URL/日志。应通过受控下载和目标协议适配解决授权，再进入统一素材库。
4. `canvas-proxy/index.js` 允许任意CORS和嵌入URL转发，并记录目标URL；托管前必须结合上述凭据边界、认证和目标约束。
5. 上游 `file-storage` / `image-storage` / Zustand stores直接操作浏览器存储；KK现有原生资产、快照、稳定ID及任务journal不可被整套替换。

## 推荐实施顺序

1. **Agent附件、图片引用、选中/视口操作**：已有后端和工具契约，先补KK桥接。验收包括真实看图、失败后附件保留、切项目不串消息、重连恢复；参考编辑另验收。
2. **TTS真实任务 + 站内只读工具**：接已有TTS请求模块和KK任务/素材；先连项目、提示词、素材与任务状态查询，再补受控写入工具。
3. **视频适配器 + Gemini原生协议**：抽取上游HTTP/状态解析，分别验收Web与Desktop提交、轮询、取消、重启恢复、结果归档；无凭据时完成受控服务fixture，不升级为真实生成已验收。
4. **Proxy托管 / WebDAV完整同步**：可作为独立工作流推进；在复用进程生命周期、传输代码的同时明确认证和同步冲突行为。
5. **自定义API脚本扩展、其他软件适配**：固定协议跑通后再扩展；后者不能依赖仓库中不存在的实现。

现有KK UI和Design System可继续使用，主要变化落在功能服务和执行链，不需要重新换一套界面或全局升级React。

## 源码定位

以下链接固定到本次核验的40位上游提交：

- [Agent图片附件与画布引用发送](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/components/agent/local-agent-panel.tsx#L654-L703)
- [Codex附件临时文件与清理](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/canvas-agent/src/agent/codex.ts#L190-L216)
- [站内工具](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/lib/agent/agent-site-tools.ts#L19-L77)
- [画布操作](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/lib/canvas/canvas-agent-ops.ts#L38-L85)
- [音频服务](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/services/api/audio.ts#L23-L86)
- [视频任务](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/services/api/video.ts#L46-L90)
- [视频恢复查询接线](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/pages/canvas/project.tsx#L307-L368)
- [图像/Gemini/模型列表](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/services/api/image.ts#L726-L917)
- [自定义协议脚本](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/services/api/model-plugin.ts#L110-L160)
- [Proxy](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/canvas-proxy/index.js)
- [WebDAV同步编排](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/web/src/services/app-sync.ts#L84-L161)
- [上游待办](https://github.com/basketikun/infinite-canvas/blob/e6d0911e9d509d00150eaab02f9ca05be94ffc46/docs/content/docs/progress/todo.zh-CN.mdx)

## 验证范围

已执行：核对远端HEAD、独立浅克隆、读取实际源码/调用点/类型/上游TODO、与KK当前源码和功能卡逐项对照。上游克隆无修改。源文件清单和SHA-256见同目录source-evidence.json。

本次没有运行上游应用、安装其依赖或发起真实模型/付费请求；没有改KK产品代码、账本、功能完成状态、依赖或用户数据。上述可复用程度属于静态工程评估；集成后仍需对应运行验收。
