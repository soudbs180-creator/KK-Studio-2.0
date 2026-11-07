# Stage 3 Implementation Plan

> 执行：superpowers:subagent-driven-development；独立子任务串行写入，整体独立审查后合流。

**Goal:** 四模态统一真实任务链，清除生产演示回退。
**Architecture:** 扩展现有 creation contracts / Provider / 原生 TaskHost。复用既有状态、归档与恢复。
**Tech Stack:** TypeScript/React、Rust/Tauri、现有 reqwest 与 MCP SDK；不新增通用框架。
**Spec:** [spec.md](spec.md)

## 约束与审查焦点

- 保留存储身份及历史任务兼容；无密钥、凭据或原始响应入日志。
- 不丢参考/参数；取消后不迟到写入；受理不明不重发；媒体 MIME 与原件归档正确；恢复不重复计费。

## 执行顺序

- [ ] 1. 原生媒体宿主：`src-tauri/src/task_host.rs` 及独立 media 模块。先新增失败测试，再实现媒体校验、异步回执/轮询/取消、原件归档与恢复；保留旧图片/文本行为。运行相关 cargo 测试。
- [ ] 2. 共享提交与执行：`packages/creation-contracts/creation.ts`、creation/providerSubmission/imageTaskCommand/useImageCommandSubmission/nativeTaskExecution/nativeTaskHost、domain 规范化。先覆盖多模态参数/参考/路由/恢复，再扩展统一入口；Web 复用适配器，无法支持的请求发送前拒绝。
- [ ] 3. 节点与入口：runtime canvas command、CreationComposer/PromptCreationNode/GenerationAction、App/首页/对话的分发。移除 production `useLocalGeneration` 调用；使用真实模型目录和设置引导；补浏览器缺配置及真实协议 fixture 回归。
- [ ] 4. 文档与功能卡：同步 FEAT-006/007/025/031、registry、ledger、PROGRESS 和精炼治理入口；版本按已有脚本递增 Desktop/Web。
- [ ] 5. 验证与交付：typecheck、lint、全量 unit、ui:check、build、定向/完整浏览器及适用 Desktop 检查，独立审查当前提交；全绿即合入本地 main、回收阶段 3 分支，然后阶段 4。

基线及各步结果记入 [verification](verification.md)。阶段 4 复用现有 `vendor/canvas-agent` MCP SDK，补工具白名单/鉴权/审计及“计划→人工确认→执行→回读报告”，在阶段 3 合流后单独计划和分支。
