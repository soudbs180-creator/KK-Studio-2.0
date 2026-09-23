# infinite-canvas 搬运验收增量

2026-09-22：原逐文件审计固定上游 e6d0911e9d509d00150eaab02f9ca05be94ffc46，完整报告与源码比较在 `D:/kk-studio/output/infinite-canvas-audit-20260922/audit-report.md`。本表结合原审计和当前 Agent 修复/并发 UI 接线，区分已重新验收与尚未关闭的缺口；整体仍为 PARTIAL。

| 功能 | 开源侧模块/入口 | 本项目落地位置 | 复刻完整度(完整/部分/未搬) | 框架接入(是/否/部分) | 可运行验证结果 | 差距与原因说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 1. canvas-proxy | canvas-proxy/index.js | vendor/canvas-proxy、proxy 脚本、ConnectionSettings | 完整 | 部分 | 原审计真实 CLI POST/SSE 成功；当前根回归包含 proxy 测试 | Tauri 托管及统一代理路由未完成。 |
| 2. canvas-agent | server/http/mcp、agent/codex/claude、skills/store | vendor/canvas-agent、agent 脚本、src/features/agent | 完整（服务模块） | 部分 | 原工程构建成功、125测试通过/2跳过；当前真实 Codex 多轮/SSE/额度/生图与 MCP 通过 | Claude 产品入口/真实调用未验；上游 Skills 后端不等于 KK Skill 商店已接线；通用线程列表/归档 UI 未完成。 |
| 3. 插件系统与四个内置插件 | plugins/canvas SDK、html/markdown/sticky-note/svg | vendor/canvas-plugins、public/plugins | 完整（指定四插件与SDK）；完整生态部分 | 部分 | 当前发现、菜单创建和渲染浏览器回归通过 | 官方目录、全部 SDK 行为/离线依赖和持久卸载仍未完整验收；四插件 Content/样式源自上游，严格只搬后端约束尚未完全满足。 |
| 4. prompts / WebDAV / audioGeneration | prompt-source、webdav-sync、audio-generation/audio | src/features/prompts、sync、creation/audioGeneration | 部分 | 部分 | 提示词库已有浏览/搜索/应用 UI 回归；WebDAV和音频基础服务单测通过 | WebDAV 没有完整项目同步链；音频 UI 为明确演示，真实 TTS/资产任务未接；原三个服务布局未全量整改为 vendor 薄适配。 |
| 5. Agent 对话和设置 | canvas-agent API/事件、上游 Agent store | agentApi/Events/Connection/Host、ConversationPanel、AgentConnectionSettings | 部分 | 是（首批Codex） | KK 真实两轮同线程、刷新无重复、审批/停止/项目隔离、模型与额度、内置生图归档已验 | 附件、其他账号软件、Desktop 同态运行与进程管理待办。 |
| 6. 插件渲染层 | plugin-loader/runtime/registry、node context | src/features/plugins、PluginNode、AddNodeMenu、PluginManagerSettings | 部分 | 是（基础链） | 当前根浏览器包含插件菜单/创建/管理入口回归 | ctx.ai/Panel 等完整宿主契约仍有缺口；原双击/持久卸载问题没有以本轮 Agent 证据关闭。 |
| 7. 画布桥接 | canvas-agent ops/schema、plugin context | canvasItems/Graph、agentCanvas/agentHost、App | 部分 | 部分 | 普通节点增改连线持久化及真实 MCP 文本节点通过；生成回传真实任务身份 | vendor MCP 插件类型校验、插件重开恢复等原审计缺口未完整关闭；未实现工具现在明确拒绝，不假报 applied。 |
| 8. Tauri 一键启停 | CLI 的宿主进程管理需求 | src-tauri 尚无完整生命周期；scripts/agent/dev.mjs 仅开发启动 | 未搬（待办适配） | 否（Tauri） | 开发启动已实际运行；本轮 Tauri release 未验 | TASK-AGENT-002：打包/启动/健康/停止/退出回收与登录提示。 |
| 9. 登记和文档 | README/许可/模块目录 | features.registry、功能卡、port 与本变更文档、vendor README | 部分 | 部分 | 当前29功能/54任务门禁通过；本变更有 spec/plan/verification/review | 原 port 文档历史过述以原审计及本增量勘误；vendor/public Git 忽略与许可分发仍不能当作完整可交付验收。 |

**未复刻/未接入清单：** 用户指定不搬：上游 file/image-storage、生成 API 前端层与整套前端。待办：Tauri/其他登录软件/后台浏览器、视频音频执行器、WebDAV 产品同步、Claude/SkillStore/完整插件宿主。遗漏：插件节点持久恢复与 SDK 契约、vendor 源码/许可交付、严格代码隔离；补在 creation snapshot/model、features/plugins、vendor 构建/来源清单和服务薄适配层。Agent 具名 SSE、真实握手、Token 边界、普通画布更新/任务回执这些原遗漏已在本轮修复并重新验证。

**框架符合性结论：** 本轮 Agent/模型菜单沿用 KK 自有组件，领域逻辑落到 features，未搬上游管理界面。但原四插件 Content 和三个服务实现仍有上游直接移植；WebDAV/音频产品接线不完整。vendor 被根 lint/typecheck/format 排除，但根 proxy 测试仍引用 vendor。整体只能判部分符合，不能用本轮可用 Codex 证明全部硬约束已满足。

**门禁结果汇总：** 原工程 `npm run verify` 通过：351 Node、266浏览器、153组件0违规、lint/typecheck/format/build通过、29功能/54任务0违规；Agent独立125通过/2 Windows权限跳过。实际Codex多轮、额度、此前画布MCP与内置生图有各自证据。原审计和中间回归的失败保留在 verification.md，不被最终通过记录抹除。门禁通过不等于全部搬运能力通过。
