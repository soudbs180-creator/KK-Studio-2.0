# AI handoff

## 2026-09-20 TASK-GOV-002 当前覆盖说明

- 今后新任务从 fetch 后的 origin/main 派生，本次基线 8aca3ab；任务分支 codex/TASK-GOV-002-ai-sdlc。旧本地 main@39f6a6e 与远端无共同祖先，下面首次同步/tree相等记录是历史范围，不能直接 pull 合并旧本地main。
- 本次共享规则、Git防线、CI变更包和存储契约修正已完成本地候选验证，状态以task-ledger为准；不会把全部产品完成。候选 `311e6fa8574780fcd7c33753b1748dd958275072` 等待 PR，完整说明见 docs/changes/2026-09-20-ai-sdlc/。
- 当前托管回读 main protected=false，private仓库protection/rulesets API403，EXT-GIT仍BLOCKED；自动分支清理为false。
- 最新main CI run35492697622失败已保留原始证据；候选 `311e6fa8574780fcd7c33753b1748dd958275072` 已在固定 1423 production preview 完成 browser169/169，等待 PR CI，不把候选结果回写成旧 main 结果。
- 先读AGENTS/AI_RULES与engineering规则。npm ci后安装npm run git:guards；本地hook不是远端保护。最终用户汇报简洁中文。

## 以下为此前交付快照（保留历史，不覆盖上面当次核对）

更新：2026-09-20。先读 PROJECT_STATE.md、SPEC_BASELINE.md、task-ledger.json，再核对 git/worktree/进程；不要凭旧测试总数或默认快捷方式继续。

## 当前恢复点

- 唯一仓库 D:/kk-studio-next；集成主线在 D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001，当前提交与 tree 以最终 Git 回读为准。T5 原生 TaskHost 已编译进 Tauri 主进程并接入 Desktop UI；release bundle 为 `index-BmJ91wly.js`，Tauri release 已从该主线重新构建。
- 原 checkout 的 dirty 状态与索引未改动；不把它作为首次同步来源，不可误接旧 monorepo。PR、CI 和 main protection 以目标仓库回读为准。
- T4 已 DONE：统一 submitImageCommand，画布/结果编辑/上传重绘走 executeTask；sourceItemId 同步 browser/native/package；结果边只发布一次，取消与恢复准确映射来源。连接 configured/verified 分开，保存配置或 models 探测不验证图片生成。
- 当前集成主线 `npm run verify` 为 150 unit/169 browser/UI119/0；Rust58/58、fmt/check、client:check 和 client:build 通过。最新 bundle 与 executable hash 见 PROJECT_STATE.md 与本次 T5 verification 记录。
- 图片比例/清晰度当前只持久化草稿，HTTP按供应商默认值；视频/音频/文本仍为明确本地demo。真实付费Provider、ComfyUI以及 T5 原生宿主的运行态证据不能被本地 fixtures 单独算作完成。
- T5 当前为 PARTIAL：已将 durable intent/submitted/unknown/terminal、原生 journal、系统凭据库读取、Desktop IPC、取消竞态和逐 slot 输出提交接入 Tauri；浏览器回归验证 unknown 不普通重试、队列意图保留原身份。剩余是隔离 Tauri/WebView 下用可控 Provider 验证提交、取消、进程重启和逐 slot 恢复；真实付费 Provider、GPU、ComfyUI 和 VPS 仍不在本地验收范围。

## 下一优先项 T5 收口

1. 在隔离 Tauri/WebView 与可控 Provider fixture 下验证 `task_host_submit`、IPC 轮询、取消、进程重启、unknown fencing 和逐 slot 输出恢复；保留真实 Provider 不可确认时的人工核对边界。
2. 保持 stable job/idempotency identity、提交前持久写入、submitted/unknown/terminal 状态和逐 slot journal；同步 API 无查询能力时必须人工核对，不盲目自动重发。
3. 阅读 src/features/generation-server/{repository,worker,provider,http}.ts 与 GENERATION-PLATFORM.md，决定独立 Node SQLite 服务是否继续作为 Gateway/Provider 后端；不能把 managed credit/account 要求直接强加给 local BYOK。
4. Desktop 已随包提供原生宿主，不得依赖用户系统安装 Node 或 VPS；UI 关闭和取消要区分“本地停止等待”与“供应商确认停止”。桌面密钥仍只从系统凭据库读取，原件保持 Native Asset Repository。
5. T5 运行态证据收口后推进 T6 最小 ComfyUI，再推进 T7 安装/恢复/回滚。完整外部门禁与可并行任务见 ledger。

## 环境与验证

- PowerShell；Node24路径 D:/tools/node-v24.20.0-win-x64；Cargo当前进程可设 CARGO_HTTP_PROXY=''。不修改全局工具链/代理。
- npm run verify 会更新历史 tracked evidence；检查结束只还原这些自动产物，新dated evidence单独保留。1421/1423严格固定端口，启动前查进程。
- 新源码必须重新build/release；Web与Desktop分别验收。Figma当前认证可用但目标仅返回稀疏Frame上下文，需继续获取子层才能宣称逐页视觉一致。
- 会话动画测试已改为观测真实 CSSAnimation 的固定时间点，避免跨进程点击后漏采首帧；位移、最终位置和toolbar几何断言均保留。
- 按 task branch/worktree 开发；主线禁止直接开发。更新ledger、Progress、Project State/Handoff，不能仅更改聊天中的状态。

## 2026-09-20 Astra 计划与同步准备

- TASK-ASTRA-001 在独立 docs 分支校正迁移计划并审计规则；原 checkout 和 main 不直接编辑。工作树由 Codex 原生工具登记，准确路径见 task-ledger.json。
- 用户指定 https://github.com/soudbs180-creator/KK-Studio-2.0 为 2.0 远端。远端初始 main 是既有旧树，与本地 2.0 无共同基线；旧 soudbs180-creator/kk-studio 仍不作为目标。首次同步采用从云端 main 派生的替换分支和 PR；阶段 0 文档分支仅作历史审计。
- 计划与规则审计见 docs/changes/2026-09-20-gpt-6-astra/；Astra 尚未实现，T5/T6 等原任务状态保持。

## 2026-09-20 KK Studio 2.0 main 同步候选

- 本地稳定 main 已在隔离 worktree 完成候选整理；原 checkout 仍保持 dirty/index 原样。
- PR #1 已将 chore/TASK-KK2-MAIN-SYNC squash 合并到目标云端 main；合并后最终审计命令确认远端 main tree 与本地 main 相同。
- 首发树只包含本地 2.0 当前已跟踪目录；云端旧 monorepo 当前目录已删除，旧历史仍可追溯。
- PR 记录：https://github.com/soudbs180-creator/KK-Studio-2.0/pull/1。合并后已回读 main SHA/tree SHA。
