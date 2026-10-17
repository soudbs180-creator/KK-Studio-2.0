# 对话与创作消息面板（FEAT-009）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-10-17
- 关联任务：T4、BACKEND-CONVERSATION、TASK-AGENT-001、TASK-AGENT-002、TASK-AGENT-003、TASK-AGENT-004、TASK-AGENT-005、TASK-AGENT-007、TASK-AGENT-008、TASK-CHAT-MIGRATION-20261017

## 2026-10-17旧聊天恢复（本地验证通过，任务仍PARTIAL）

关联TASK-CHAT-MIGRATION-20261017；Desktop/Web 2.1.37（Mobile 2.1.1规划），冻结源码89b8291b；默认原9项目已迁移snapshot3、11个独立聊天上下文，repositoryId和原始资料保持；编辑、旧历史持久化及正常关闭重开证据见本轮验证。真实新回复仍未验收：Codex共享周额度100%、ordinaryUsageAllowed=false，发送前拒绝，/turn提交0；预计北京时间2026-10-23 04:08:15重置。未消耗reset、未购买额度或绕过保护。 见[当前验证](../changes/2026-10-17-chat-migration/verification.md)。

## 2026-10-17安全修复边界（历史2.1.36）

关联本地安全修复任务：TASK-AUDIT-REPAIR-20261017（有界A–D DONE；完整功能缺口继续由本卡原开放任务承接）；[规格](../changes/2026-10-17-audit-repair/spec.md) / [实际验证](../changes/2026-10-17-audit-repair/verification.md)。协议6未具备完整chat scope隔离，新增普通聊天、临时聊天及不支持的多聊天/v3写入须门控并说明原因；保留v2 legacy单聊天。草稿/thread/正文、历史/journal/记忆隔离未全部验收前，不宣称多聊天或临时隐私可用；外部模型授权空数组应拒绝，不混同主Agent自身推理模型。 候选Desktop/Web2.1.36最终source4699458d完整verify、精确源码独审、官方重建、隔离Native与两日常入口正常关闭重开通过；旧d356真实菜单遮挡失败及所有原失败保留。默认旧聊天资料仍READ_ONLY，9项目raw/identity/shared memory保持；不宣称可编辑、完整迁移/protocol7、真实Provider或完整多聊天/垃圾箱/12AI恢复已完成。本卡成熟度与既有runtimeEvidence保持原范围，详细证据见本轮验证；Hosted/发布/用户验收另列。

## 用户可见入口

- 2026-10-01 短提示词审计：普通输入与模型固定规则分开保存；短句 57 字符对应实际请求 809 字符，无重复历史拼接。显式 Skill 会把 instructions 加入输入，开启记忆才附相关片段；本次不改变这些选择。Codex 生图传输修复与生产验收见 [TASK-AGENT-008](../changes/2026-10-01-agent-image-transport/verification.md)，状态仍为 PARTIAL。

- 工作区右侧 ConversationPanel：项目创作消息、模型选择、图片附件和语音输入。

## 代码位置

- src/components/ConversationPanel.tsx、ConversationMessages.tsx、ConversationModelPicker.tsx。
- src/features/agent 的 agentConnection/agentEventStream/agentHost/agentImages 接 Codex 官方执行器，src/App.tsx 复用项目和图片/文本任务。
- src-tauri/src/main.rs 的旧 chat_completion/stream 命令仍存在，但不是当前前端多轮聊天实现证据。

## 测试与证据

- tests/browser/creation-flow.spec.ts、tests/browser/unified-image-command.spec.ts。
- T4 的统一图片入口验证；[本轮勘误](../changes/2026-09-21-text-and-rule-audit/verification.md)。

## 当前能力

- KK 对话默认 Codex：命名 SSE、真实账号模型/额度、项目会话恢复、停止和权限请求已接通；API 来源需显式选择。
- 已从 KK 输入取得真实回复、MCP 画布操作和内置生图结果。图片进入 KK 自有素材仓库；卡片来源按 thread/turn 元数据持久化。工具回执未知时阻止自动重试。
- 分级/全部模型菜单、关闭记忆页、返回、页内置顶由 ModelPickerMenu 统一提供。Google API Key 的对话/生图和 Gemini CLI 登录的文字对话已有本地接线与 fixture 浏览器回归；真实账号与 Tauri 仍待验收。豆包/WorkBuddy 仍未接通。
- 豆包/WorkBuddy未完成的独立适配器保持禁用；Google API/Gemini CLI按上一条的本地接线与外部待验边界解释。
- 设置 › 网络增加 CodeBuddy CLI 路径、保存和真实连通测试；Codex MCP 增加 `codebuddy_consult`，可受控委派有限短文本。本机已登录 CLI、随包 MCP 与新 Tauri 内 Codex 工具调用和可见回复通过；独立的 WorkBuddy 原生 OAuth、自动高效路由仍未实现，菜单中 WorkBuddy 仍禁用。见 [本轮验证](../changes/2026-09-24-codebuddy-delegation/verification.md)。
- 新增文本节点（FEAT-008）是单次文本生成，不能作为本面板多轮文本聊天验收。

- Windows 设置 › 网络：启动并连接/停止服务；缺资源或 Web 显示原因。随包执行器和实际资源哈希见 [本轮验证](../changes/2026-09-22-agent-desktop/verification.md)。

## 差距与后端化

- BACKEND-CONVERSATION：Web 已接通真实 Codex，Windows 一键生命周期、真实回复、随包MCP与同线程恢复已验收。Agent 图片附件与显式画布引用已接通；内置生图参考图片编辑、其他软件/后台网页适配器仍待完成。
- T9 收敛 Web 平台差异。缺相应证据时不得标 REAL。

## 变更记录

- 2026-09-21 的初始卡片曾错误声称 Desktop 多轮聊天已复用旧 Rust 命令。
- 2026-09-22 根据实际 import/调用链勘误为 PARTIAL，登记独立后续任务；旧验证结果不改写。
- 本轮默认 Codex 与统一模型入口见 [验证](../changes/2026-09-22-codex-default-agent/verification.md)、[使用说明](../changes/2026-09-22-codex-default-agent/usage.md)。新增 tests/browser/agent.spec.ts、model-picker.spec.ts 与 tests/unit/agent*.test.ts；保留 PARTIAL 表示平台/适配器边界。

## 本轮实施

TASK-AGENT-RECOVERY-20261013：桌面启动待项目加载后自动恢复，首页只启动服务；项目保存非敏感 `agentThreadId`，读取历史/模型失败仍保留归属。设置 › 模型接入使用单一普通连接入口，手动连接、新会话和停止服务进入高级选项；主动断开暂停自动恢复。未知会话与运行/审批仍有归属门禁。新增生命周期、归属与桌面重启回归；本轮验收进度见 [验证](../changes/2026-10-13-agent-recovery/verification.md)，不扩展其他适配器的能力声明。

TASK-AGENT-003：图片附件、显式画布引用和视口/选择桥接；验收见 [本轮记录](../changes/2026-09-23-agent-attachments/verification.md)。

TASK-AGENT-004: Google API Key 对话、生图与画布归档的本地/fixture 验证通过；真实服务和桌面待验收，见 [验证](../changes/2026-09-23-google-interactions/verification.md)。

TASK-AGENT-005: Gemini CLI 登录文字对话及续接的本地/fixture 验证通过；真实安装、登录、桌面待验收，见 [验证](../changes/2026-09-23-google-cli-login/verification.md)。
TASK-AGENT-007：CodeBuddy CLI 受控短文本委派；后续设计师全链路按 [剩余顺序](../changes/2026-09-24-codebuddy-delegation/remaining.md) 推进。

## 2026-10-15 首页与来源修复（REVIEW，整体待验）

TASK-CODEX-HOME-20261015：新首页默认Codex/ChatGPT图片能力，首页、聊天、画布沿各自显式Codex/API来源执行；旧API和无selection项目保持legacy路由，局部隐私/草稿/附件及原件保全。输入同排与菜单锚点同步修复。当前进入REVIEW：784浏览器首过及Native单QA包往返/冷开图文通过，但完整npm verify因另一任务占用1421而development未执行/exit1；当前SHA独审与Hosted完整门禁、合并和本机更新待验。见[本轮规格](../changes/2026-10-15-codex-home/spec.md)与[验证](../changes/2026-10-15-codex-home/verification.md)；本卡功能状态保持，不用前置真实账号证据代填新入口或所有外部Provider。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。
