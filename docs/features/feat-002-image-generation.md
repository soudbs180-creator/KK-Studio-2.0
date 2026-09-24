# BYOK 图片生成与持久任务宿主（FEAT-002）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-21
- 关联任务：T5、TASK-PROV-001、EXT-PROVIDER、TASK-AGENT-001、TASK-AGENT-004

## 用户可见入口

- 图片节点“生成”、开始页与对话的图片提交、任务状态/取消/重试。
- 自带供应商 Key（BYOK），OpenAI 兼容图片接口（`/images/generations`、`/images/edits`）。

## 代码位置

- 浏览器链路：`src/features/creation/imageGeneration.ts`（HTTP、分块、超时、错误分级）、`providerSubmission.ts`（navigator.locks 租约/容量/健康门禁）、`imageTaskCommand.ts`
- Desktop 链路：`src/features/creation/nativeTaskHost.ts` → Tauri `task_host_submit/get/list/cancel` → `src-tauri/src/task_host.rs`（journal、幂等、unknown fencing、逐 slot 提交）
- 恢复：`src/features/creation/taskRecovery.ts`
- 凭据：`providerCredentials.ts`（系统凭据库 service `com.kkstudio.provider`）

## 测试与证据

- 单测：`providerSubmission`、`nativeTaskHost`、`imageTaskCommand`、`providerHealth`、`taskRecovery`、`generationQueue`
- 浏览器：`provider-scheduling`、`unified-image-command`、`creation-flow`、`generation-flow`
- 证据：`docs/changes/2026-09-20-ai-sdlc/`、`docs/evidence/ai-sdlc-2026-09-20/desktop-provider-gap-audit.md`

## 当前能力

- Web：真实 BYOK 提交、连接门禁、取消、错误分类、原件归档。
- Desktop：原生 TaskHost 代码已接入（durable intent、journal、幂等身份、unknown 受理保护、逐 slot）。
- Google Interactions：API Key 通道的图片结果可归档至当前画布；此项已有浏览器 fixture 验证，真实 Google 图片与 Tauri 仍待验收，见 [TASK-AGENT-004](../changes/2026-09-23-google-interactions/verification.md)。

## 差距与后端化

- 未做隔离 Tauri/WebView 下提交、取消、进程重启与恢复的运行态证据（T5 缺口）。
- Desktop Provider gate：原生提交未复用前端 reservation/assertCurrent；native failure 的结构化 health 未回写连接状态。
- 真实付费出图、真实供应商/GPU 验收受 EXT-PROVIDER 外部凭据/额度阻断。

## 变更记录

- 2026-09-21：创建卡片，状态 PARTIAL（代码接通，运行态与付费验收未完成）。

## 默认 Agent 与模型目录更新（2026-09-22）

图片/文本任务支持显式 providerConnectionId；Agent 新节点继承当前项目选择的账号，避免同名模型误用另一账号。MCP run_generation 返回真实 taskId，受控 HTTP 端到端已覆盖；真实付费供应商逐家验收仍未完成。

代码与测试入口：`src/features/agent/agentHost.ts`、`src/features/models/modelCatalog.ts`、`tests/browser/agent.spec.ts`、`tests/browser/model-picker.spec.ts`。证据见 [本轮验证](../changes/2026-09-22-codex-default-agent/verification.md)。状态仍为 PARTIAL。
