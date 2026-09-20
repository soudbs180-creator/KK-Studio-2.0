# Verification

- ID：GPT6-ASTRA-20260920
- 状态：计划已完成；迁移尚未实施，产品能力未验证。
- 初稿源码基线：`codex/desktop-data-stability` / `609f5243e434494216a5e070b2bb2a4c4b7137dd` 加已有工作区改动。

## 本次已完成

- 读取当前 AGENTS、PROGRESS、数据/生成架构、文档模板、模型/凭据/图片生成/聊天命令/快照校验/测试配置。
- 搜索并打开官方 GPT-6 Astra 模型与迁移页面；Markdown 指南的浏览工具不支持 content-type 后，通过只读 HTTP 获取原页面正文；使用当前官方内容，未使用模型版本推断。
- 两个独立只读审查覆盖模型集成和验证/持久化风险。
- 确认当前活跃前端无 Responses 调用、Rust 旧聊天命令无前端调用者；当前消息不能安全存储 assistant 角色。
- 新增本目录 intent/spec/plan/verification，未更改应用源码、配置、依赖、凭据或既有进度条目。
- 文档验证：四份 Markdown 的 Prettier check 通过；无尾随空白、合并冲突标记或未填占位词。核对了计划中的现有关键文件路径，新 transport/测试路径明确标为待创建。
- 独立计划复核的三项意见已纳入：v3 普通备份转换及中断次序、第一交付文字/图像外发审批、整库 schema 升级与逐项目助手启用的区别。另补充超过 10,000 字符的历史保护，以及既有 system 状态消息不得升级为模型指令。

## 未执行与未来证据

- 本次没有运行 API 请求，没有读取/使用用户密钥，没有执行真实付费测试。
- 初稿阶段没有运行 npm verify、应用构建、Rust 检查或启动浏览器/Tauri；以下“本轮独立 worktree 验证”是后续补做的单独证据，不把历史 PROGRESS 数字冒充本轮结果。
- Figma 与同状态浏览器证据：本次不适用；实施 UI 后按 plan Task 4/6 采集。
- 未来必须记录：真实 model/endpoint、权限、参数、成功/失败/取消、多轮、参考图、快照升级/回滚、敏感字段保护、usage/成本及运行入口。
- 第一交付和图片工具第二交付分别判定；任何未通过真实服务验收的路径继续显示 Prototype 或具体不可用原因。

## 官方来源（2026-09-20 查阅）

- [GPT-6 Astra 模型](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [GPT-6 Astra 迁移指南](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart)
- [迁移到 Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses)
- [Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create)

## GitHub 同步前复核

- 当前源基线为本地 main@80544af；已记录的最后 TaskHost 实现为 d894779，两者之间只含文档变化。当前任务 docs/TASK-ASTRA-001-migration-plan 从该 main 隔离，原 checkout 和 main 均不在本任务中修改。
- 已纠正 Desktop/Web 图片路由、T3b/T4 完成状态、T5 剩余验收、项目包 v3 schema 和 unknown/slot 迁移回归。
- 完整规则与远端身份检查见 branch-rules-audit.md；本轮新增验证结果单独记录，初稿未运行应用检查的历史陈述不代表本轮结果。

## 本轮独立 worktree 验证

工作树：Codex 原生登记的 <isolated-worktree>，分支 docs/TASK-ASTRA-001-migration-plan，基于 main@80544af10ce3bd39988395ed12934d9940150e17。测试生成的 tracked evidence 与 Rust schema 已按白名单恢复；原 checkout 指纹保持不变。

- npm ci：PASS，178 packages，0 vulnerabilities。
- node scripts/check-governance.mjs --write：PASS，27 tasks，0 violations。
- npm run verify：PASS（lint/governance/typecheck/format/build/Edge/Unit/UI）；浏览器首轮为 168 passed、1 flaky，flaky test tests/browser/task-intent.spec.ts:224 重试后通过。失败是既有严格 locator 同时匹配 storage alert 与 status 文本，未修改源码或测试。
- npm run client:check：PASS；Rust fmt/check/test 通过，保留 3 个既有 dead_code warnings。
- git diff --check、计划文档 Prettier check：PASS。
- 本轮没有 API 请求、provider key、付费请求、运行数据或 UI 源码变更。
