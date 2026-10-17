# BYOK 图片生成与持久任务宿主（FEAT-002）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-10-17
- 关联任务：T5、TASK-PROV-001、TASK-PROV-005、TASK-PROV-006、EXT-PROVIDER、TASK-AGENT-001、TASK-AGENT-004、TASK-AGENT-008、TASK-CODEX-REF-20261015

## 2026-10-17安全修复边界（preflight通过，完整待验）

关联开放任务：TASK-AUDIT-REPAIR-20261017；[规格](../changes/2026-10-17-audit-repair/spec.md) / [实际验证](../changes/2026-10-17-audit-repair/verification.md)。同端点不同账号必须沿固定providerConnectionId核对endpoint/credentialRef，缺ID只能接受唯一完整绑定；12AI执行缺宿主持久CAS receipt port时须禁用。内存受理Map不证明跨文档或重启恢复，完整12AI接入仍由原统一任务开放。 候选Desktop/Web2.1.36已取得unit/lint、4项浏览器及Rust bin的安全preflight；尚未冻结最终head，完整verify、C启动与最终审查未完成，不用旧SHA或定向预检代填；本卡成熟度与既有runtimeEvidence保持原范围。

## 用户可见入口

- 图片节点“生成”、开始页与对话的图片提交、任务状态/取消/重试。
- 自带供应商 Key（BYOK），OpenAI 兼容图片接口（`/images/generations`、`/images/edits`）。

这里的 BYOK 指现有 Desktop/Web 本地或会话内直连 seam；它不等同于 `TASK-PROV-BYOK-001` 所跟踪的跨端产品化 onboarding、服务端代理或账号复用。

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

- Codex 内置生图：KK 新账号真实生成 PNG；本轮修复事件超限和并发归档标记，生产 Tauri 自动归档/续聊/重连/重启原件一致、节点/标记唯一，见 [TASK-AGENT-008](../changes/2026-10-01-agent-image-transport/verification.md)。本卡保持 PARTIAL，不扩大为所有 Provider 验收。

- Web：真实 BYOK 提交、连接门禁、取消、错误分类、原件归档。
- Desktop：原生 TaskHost 已在隔离 production release/WebView 下实测提交、三处取消、重载/进程异常重启、逐 slot 与原件 hash 恢复、unknown 禁普通重试；十组原生 fixture 与完整回归通过，见 [T5 新验证](../changes/2026-10-08-taskhost-native-lifecycle/verification.md)。fixture 不代表真实付费服务验收。
- Google Interactions：API Key 通道的图片结果可归档至当前画布；此项已有浏览器 fixture 验证，真实 Google 图片与 Tauri 仍待验收，见 [TASK-AGENT-004](../changes/2026-09-23-google-interactions/verification.md)。

## 差距与后端化

- 新保存的浏览器供应商非秘密配置在立即异常终止时可能尚未落盘；正常退出恢复通过，原生任务、原件与系统凭据保留。原生 durable 配置恢复归 TASK-PROV-005。
- Desktop image Provider gate：原生提交的连接/容量复查与结构化 health 回写仍未统一，归 TASK-PROV-006；文本容量已在原生 jobs 实测。
- 真实付费出图、真实供应商/GPU 验收受 EXT-PROVIDER 外部凭据/额度阻断。

## 变更记录

- 2026-09-21：创建卡片，状态 PARTIAL（代码接通，运行态与付费验收未完成）。

## 默认 Agent 与模型目录更新（2026-09-22）

图片/文本任务支持显式 providerConnectionId；Agent 新节点继承当前项目选择的账号，避免同名模型误用另一账号。MCP run_generation 返回真实 taskId，受控 HTTP 端到端已覆盖；真实付费供应商逐家验收仍未完成。

代码与测试入口：`src/features/agent/agentHost.ts`、`src/features/models/modelCatalog.ts`、`tests/browser/agent.spec.ts`、`tests/browser/model-picker.spec.ts`。证据见 [本轮验证](../changes/2026-09-22-codex-default-agent/verification.md)。状态仍为 PARTIAL。

## 2026-10-15 首页与来源修复（REVIEW，整体待验）

TASK-CODEX-HOME-20261015：新首页默认Codex/ChatGPT图片能力，首页、聊天、画布沿各自显式Codex/API来源执行；旧API和无selection项目保持legacy路由，局部隐私/草稿/附件及原件保全。输入同排与菜单锚点同步修复。当前进入REVIEW：784浏览器首过及Native单QA包往返/冷开图文通过，但完整npm verify因另一任务占用1421而development未执行/exit1；当前SHA独审与Hosted完整门禁、合并和本机更新待验。见[本轮规格](../changes/2026-10-15-codex-home/spec.md)与[验证](../changes/2026-10-15-codex-home/verification.md)；本卡功能状态保持，不用前置真实账号证据代填新入口或所有外部Provider。

## 2026-10-15 Codex 卡片连线参考图（功能通过，交付 PARTIAL）

TASK-CODEX-REF-20261015：Desktop/Web2.1.33已真实通过卡片参考图→Codex内置imagegen→PNG原件归档/唯一result边，以及重载、正常重启和原桌面快捷方式重开；参考42452f4d.../结果6531e6ac...不变、1实际turn/0外部图片请求。定向与dirty预检通过；完整browser771PASS/13FAIL已逐项证明13项PRE-EXISTING FAILURE，fullverify仍FAIL、development及最终SHA正式review/Hosted/PR未完成，交付PARTIAL。本卡继续PARTIAL，其他Provider/任务状态不变；见[规格](../changes/2026-10-15-codex-card-reference/spec.md)与[验证](../changes/2026-10-15-codex-card-reference/verification.md)。

- 2026-10-15：TASK-KK-UNIFIED-20261015 已获用户实施授权，新增范围见 [统一规格](../changes/2026-10-15-kk-unified/spec.md)。本卡既有证据仍限原版本；新范围实现/真实验收尚未完成，不能沿用旧 PASS 关闭。
