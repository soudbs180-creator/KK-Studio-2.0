# 默认 Codex 主 Agent Implementation Plan

> 执行方式：本会话使用 executing-plans 自主实施；项目 AGENTS/SDLC 授权免逐阶段形式审批。独立上下文完成最终审查；不提交、不推送。

**Goal:** 从 KK 输入框使用已登录 Codex，并通过 KK 自有任务系统完成生成与画布操作。

**Architecture:** vendor/canvas-agent 保留服务协议；src/features/agent 负责适配、认证传输和领域桥。界面、项目、Provider、持久任务仍由 KK 管理。

**Tech Stack:** React 18 / TypeScript / Node 24 / Vite / Playwright。

**Spec:** ./spec.md

## Global Constraints

- 保留 KK UI、vendor 隔离、其他 dirty 改动与用户数据身份。
- 不 commit/push；源码回传须基于复制前 SHA-256 确认无并发覆盖。
- Token 不写 localStorage/URL/日志；生成 API 密钥不传给 Agent。

## Review Focus

- 流断开时仍在执行，是否错误地恢复为可发送。
- 重连/迟到事件/切换项目是否污染另一会话。
- 同批新增节点后生成是否引用真实节点和参考素材。
- 工具重复交付和未知受理是否重复收费。
- 模型选择是否意外替换项目生成模型或扩大权限。

## Task 1：真实协议和会话

- [x] 在 agentConnection/agentEvents/agentApi 测试中复现命名 SSE hello、新会话、流结束、重复 final、401 与取消竞态。
- [x] 新增 agentEventStream.ts：使用 fetch + AbortController 解析 event/data 帧，Token 走头；连接按 spec 顺序完成。
- [x] 实现线程恢复/历史与模型接口；断线和失败不假成功；项目级线程身份只保存非敏感 ID。
- [x] 执行 node --test tests/unit/agent*.test.ts，记录 RED→GREEN。

## Task 2：KK 领域与任务桥

- [x] agentHost 测试覆盖纯更新/连线、同批新增后生成、重复 requestId、缺配置、视频拒绝与任务状态。
- [x] 提取 agentHost.ts，直接调用现有提交入口并回传 taskId；App 仅负责提供当前项目和持久化回调。
- [x] 生成参数从节点/项目读取，参考素材继续使用 canvasImageAttachments，状态结果不含凭据。
- [x] 执行 Agent 与 imageTaskCommand 回归。

## Task 3：默认入口与真实验收

- [x] KK 对话主入口提供默认 Codex / 直接生成明确切换；Agent 断线不退回生成；模型与权限控件接到实际 Agent 状态。
- [x] 设置中心说明官方登录与本地连接，提供真实重连/新会话行为；本机启动入口和使用文档同步。
- [x] Playwright 验证真实命名事件、UI 切换、失败与取消；真实 Codex 单轮及 MCP 画布操作独立留证。
- [x] 完整 npm verify、features:check；更新卡片、账本、PROGRESS、PROJECT_STATE、verification/review。
- [x] 最终独立审查，修复阻断项；校验原工程基线后只回传本任务变更并执行必要回归。

## Task 4：用户追加的统一模型入口

- [x] 读取真实 Codex 账号额度，刷新与耗尽判断；不暴露账号令牌。
- [x] 模型目录按连接身份缓存，刷新与手动参数声明，显式绑定选择的 API 连接。
- [x] 共享分级/全部菜单、页内置顶、关闭保留页面、返回；卡片按模型能力显示尺寸。
- [x] 核实 Codex 内置生图事件与文件，复用 KK 归档并从输入框真实验证。
- [x] 新增身份路由、未知能力与菜单交互回归；完整门禁和独立审查。

本轮复刻范围和 Web 第一阶段按上述计划完成；源工程回传、最终门禁以 verification.md 的最终结果为准。桌面与其他软件后续范围见 remaining.md，未纳入已完成项。
