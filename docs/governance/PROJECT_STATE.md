# 当前项目状态

更新：2026-09-20。task-ledger.json 是任务状态源；完整产品尚未达到 Definition of Done。

## 当前主线

- T4 已 squash 合入本地 main，T5 durable intent、原生 TaskHost 与 Desktop IPC 适配已合入；当前稳定集成主线位于 `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`，当前提交与 tree 以最终 Git 回读为准。
- 最新 release bundle 为 `index-BmJ91wly.js`；可执行文件为该 worktree 的 `src-tauri/target/release/kk-studio.exe`，SHA-256 为 `9FB3563D3A170BC14F69409FFE34D45CC776B41EBC0C548A1B923DE6D006B6BF`。本机默认旧快捷方式仍可能指向原 checkout。
- 原 `D:/kk-studio-next` 保留既有 dirty 状态及原索引，未 reset/clean/覆盖；它不是首次同步来源。远端 PR、CI 和 main 保护状态单独记录在本次审计。
- T5 已将持久 intent、稳定幂等身份、unknown 受理保护、原生 journal、凭据库读取、IPC 轮询、取消竞态和逐 slot 输出提交接入 Tauri 主进程；其本地验证和限制见 `docs/changes/2026-09-19-taskhost-durable-intent/verification.md`。隔离 Tauri/WebView 提交、取消、重启恢复证据尚未完成，T5 状态为 PARTIAL。

## 已完成范围

T0、工程治理、Provider 提交门禁/回归、T1 读取和写入保护、T2 画布持久化、T3a 原生素材、T3b Desktop 项目包、T4 统一图片命令均 DONE。

T4 将首页、对话、画布、结果继续编辑和上传重绘接入相同 BYOK 图片命令；归档原件、来源节点、审批、取消、失败和结果连线共用一条链路。连接已配置与已验证分离，模型/地址/凭据变化撤销旧验证。当前协议为 OpenAI-compatible；比例和清晰度仅保存草稿，实际请求使用供应商默认值。

## 当前验证

当前集成主线 `npm run verify`：150 unit、169 Edge browser、UI119/0、lint/typecheck/format/build PASS；Rust58/58、fmt/check、Tauri client check/release PASS。当前 bundle 与 executable hash 记录在本文件上方；T5 原生 IPC 运行态证据仍待补充。

每个环境都完成首页→对话→画布结果编辑：3 个任务、3 条来源连线、编辑请求带归档原件；Desktop 全新 profile 恢复任务与图完全一致，原件 SHA-256 一致。HTTP fixtures 只证明产品链，真实付费 Provider 仍由 EXT-PROVIDER 单独验收。主线验收期间发现既有会话动画测试跨进程漏采首帧，已改为观测实际 CSS 动画的固定时间点，保留位移和布局断言。

Figma 认证本轮已可用，404:28667 只返回 Frame 边界元数据，尚无完整子层上下文；新增状态为工程补充，未声称全页面视觉一致。

## 按依赖排列的剩余任务

1. **T5（PARTIAL，下一收口）**：在隔离 Tauri/WebView 与可控 Provider 下验证原生 TaskHost 的提交、取消、进程重启、逐 slot 恢复和 unknown 人工核对边界；代码已随 Desktop 打包并接入产品主链。
2. **T6（PARTIAL）**：ComfyUI 现有扫描/adapter 接入实际任务链，覆盖模板、任务、归档、取消与恢复；EXT-COMFY/EXT-PROVIDER 的真实外部验收缺本轮可用服务和授权凭据。
3. **T7/T8（TODO）**：安装包生命周期、恢复/回滚验收，以及 Shared Core 与平台职责收口。
4. **UI-001…004、PERF-001（TODO）**：共享组件/tokens、逐页同状态验收、剩余动态文案和 Prototype 边界，缩略图/分页/内存 IO。T4 局部修复不等于整体 UI 或性能任务关闭。
5. **T9、T10-PREP（TODO）**：Web 容量/离线/项目包适配和部署备份回滚产物；T10/T11 仍依赖 VPS/DNS/切换外部条件。
6. **T12（TODO）**：Desktop/Core/Web 稳定后推进 Mobile。

29 项账本统计：11 DONE、2 PARTIAL、11 TODO、5 BLOCKED、0 IN_PROGRESS。外部条件只阻塞对应验收，不能阻断 T5 等本地可实施项。

## 2026-09-20 Astra 计划与同步准备

- TASK-ASTRA-001 在独立 docs 分支校正迁移计划并审计规则；原 checkout 和 main 不直接编辑。工作树由 Codex 原生工具登记，准确路径见 task-ledger.json。
- 用户指定 https://github.com/soudbs180-creator/KK-Studio-2.0 为 2.0 远端。远端初始 main 是既有旧树，与本地 2.0 无共同基线；旧 soudbs180-creator/kk-studio 仍不作为目标。首次同步采用从云端 main 派生的替换分支和 PR，不直接推送 main；阶段 0 文档分支保留为历史审计，最终首发以 TASK-KK2-MAIN-SYNC 为准。
- 计划与规则审计见 docs/changes/2026-09-20-gpt-6-astra/；Astra 尚未实现，T5/T6 等原任务状态保持。


## 2026-09-20 KK Studio 2.0 main 同步候选

- 本地稳定 main 已在隔离 worktree 完成候选整理；原 checkout 仍保持 dirty/index 原样。
- PR #1 已将 chore/TASK-KK2-MAIN-SYNC squash 合并到目标云端 main；合并后最终审计命令确认远端 main tree 与本地 main 相同。
- 首发树只包含本地 2.0 当前已跟踪目录；云端旧 monorepo 当前目录已删除，旧历史仍可追溯。
- PR 记录：https://github.com/soudbs180-creator/KK-Studio-2.0/pull/1。合并后已回读 main SHA/tree SHA。


## 2026-09-20 UI 主线整合

TASK-UI-MAIN-001 从 origin/main@8aca3ab 出发，三方整合27项原目录交互修复并保留主线T3b/T4/T5；现行 Figma 的设置、搜索、资产展开/收纳及任务入口偏差已修正。34种页面状态已用实际导航捕获；原目录尚未切换前不能把候选描述成原目录最新版。准确命令、运行矩阵和同步状态见 [verification](../changes/2026-09-20-ui-main-alignment/verification.md)。UI-004 保持 PARTIAL：当前唯一Figma页面中没有Landing410:59708及部分独立页面稿。治理候选TASK-GOV-002保持独立，未夹带合入。

## 2026-09-20 UI 主线整合收口

- 当前唯一根目录：`D:/kk-studio-next`，分支 `main`，HEAD 与 `origin/main` 同为 `fb57529c719924330ec0154f5374df8f5d508e00`。
- PR #3 已 squash 合并；双 CI 的完整 verify、Rust、Tauri client check/build 均通过。
- 原 dirty checkout 的 409 项、原 index 和额外根目录快捷方式已保存在 `.tmp/root-before-main-20260920/`，不进入远端；`master` 与旧本地 main 作为历史引用保留。
- UI-004 仍是 PARTIAL：Landing 与若干独立页面没有当前 Figma 基准，不能宣称所有页面已完成逐页 Figma 验收。
