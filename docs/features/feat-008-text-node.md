# 文本创作节点（FEAT-008）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-22
- 关联任务：TASK-UI-005、BACKEND-TEXT-NODE

## 用户可见入口

- 项目内添加节点 › 文本，填写文案提示词并生成；没有文本连接时按钮禁用并提示配置。
- 复用设置的文本模型；图片/视频模型不能当文本连接，已有项目不自动切换账号。

## 代码位置

- UI：src/components/nodes/PromptCreationNode.tsx、src/features/creation/CanvasImageCommand.tsx。
- 同一任务链：src/App.tsx、src/features/creation/imageTaskCommand.ts、providerSubmission.ts、textTaskResult.ts。
- Web SSE：src/features/creation/textGeneration.ts。
- Desktop：src/features/creation/nativeTaskHost.ts、useNativeTextRecovery.ts、src-tauri/src/task_host.rs、task_host_text.rs；复用原生 journal/系统凭据库。

## 测试与证据

- tests/unit/textGeneration.test.ts、tests/unit/nativeTaskHost.test.ts。
- tests/browser/text-generation.spec.ts。
- [本轮验证](../changes/2026-09-21-text-and-rule-audit/verification.md)。

## 当前能力

- Web 已从固定演示切换到 OpenAI 兼容 chat/completions 流式请求，结果进项目文本节点与 result 连线；提交前保存 intent，中文分块、完整终止、错误/离线/取消与未知受理有门禁。
- 原生 TaskHost 已在隔离 release/WebView2 实测：流式中重载只读取原任务、并发上限1、取消后 unknown、随后新任务可执行、离线零请求。原生 jobs 管理并发占用，避免 WebView 重载泄漏浏览器 lease。
- 提示词上限4,000字（与快照一致），输出上限32 KiB UTF-8，单输出、不接图片引用，不进入媒体 asset store。结果编辑只修改文案正文，恢复不覆盖用户修改。
- 请求只有本次提示词；这是文本节点单次生成，对话面板多轮上下文属于 BACKEND-CONVERSATION。

## 差距与后端化

- 已有 Web development、production preview、Desktop release 的本机 HTTP fixture 证据；真实付费 Provider、完整 T5 进程退出/恢复与原生 health 回写仍保留后续验收，整体保持 PARTIAL。
- 自定义未知模型标识需明确能力；当前沿用常见 GPT/Claude/Qwen/DeepSeek/Gemini 等本地模型能力判定，不把 models 列表读取当生成验证。

## 变更记录

- 2026-09-21：固定演示，PROTOTYPE。
- 2026-09-22：接通文本任务与 Web SSE，完善恢复和取消，PARTIAL；旧“对话后端已被前端复用”前提更正。

## TASK-UI-005 更新

文案模式写入可见提示词，切换只替换既有模式指令并保留正文；超限不截断。自由写作可保留用户内容。 见 [核对与验证](../changes/2026-09-22-ui-feature-parity/verification.md)。
