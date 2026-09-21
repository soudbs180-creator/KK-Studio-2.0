# 当前项目状态

## 2026-09-21 TASK-GOV-002 合入后状态

- 远端 `origin/main` 已回读为 `92c1ef17c42030ef6976e039efe4775c4bdc0939`（squash merge PR #4）；合并前最新基线为 `c3ff0871b3db674e0ab073f1445879d84fee3507`，规则分支 head 为 `19215945573ca97dd4427f36ac8e074a1378f9fb`。PR：[规则治理 PR #4](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/4)。
- PR #4 的 delivery、repository verification、Rust fmt/test、client check 和 Tauri no-bundle build 全部成功；PR delivery 运行：[35520494220](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/35520494220)。
- 本次写入范围仍是共享 AI 规则、SDLC/分支流程、Git/CI/delivery 门禁、模板和规则场景；产品实现、产品测试、既有证据及其他任务提交只随最新主线回读，不作为本任务改动。
- 远端仓库当前仍未启用 branch protection/rulesets（private 仓库接口返回 403），所以服务器强制保护仍为 EXT-GIT BLOCKED；本地 pre-push 只是补充防线。不能把本地 hook 描述成 GitHub 服务器保护。
- 原规则分支和工作树只作为已合入历史保留证据，完成回读后清理；其他任务的分支、dirty worktree 和既有证据不在本次清理范围。

## 以下为此前交付快照（保留历史，不覆盖上面当次核对）

更新：2026-09-20。task-ledger.json 是任务状态源；完整产品尚未达到 Definition of Done。

## 2026-09-21 子任务汇总验收候选

- TASK-MAIN-CLOSE-002 候选已完成 151 Node、197 browser、UI121/0、Rust61/61、Tauri client build；开发1421、预览1423和隔离 Desktop runtime 均加载当前候选并通过菜单、素材分页、原件 SHA、焦点与窄屏关闭专项。候选仍在 PR 前，不能写成稳定 main。
- UI-004 继续 PARTIAL：Landing 410:59708 无效，项目库/Skill/ComfyUI/部分设置没有独立当前 Frame。PERF-001 继续 PARTIAL：永久缩略图、大快照、单件大图瞬时内存和不可抢占 IO 仍待后续验收。

## 当前主线

- 稳定主线运行目录是 `D:/kk-studio-next` 的 `main`，跟踪目标仓库 `origin/main`。精确提交与tree用Git回读；旧 `.worktrees/TASK-INTEGRATION-001` 已改为 `codex/archive-local-main-20260920` 历史分支，不再作为当前main运行目录。
- UI补充验证 bundle 为 `index-Be6XJzPc.js`，验证包含dev1421、preview1423和隔离Tauri release。根目录启动入口 `start-kk-studio.bat` 会检查源码新鲜度；每次main推进后重新构建并验证实际加载包。旧bundle/hash是历史证据，不能用于判断当前运行版本。
- 原根目录100个tracked修改、309个untracked文件与原index已按SHA-256校验归档到 `.tmp/root-before-main-20260920/`；额外快捷方式独立归档。代码主线与归档分开，临时数据、凭据、dist/target/node_modules不上传。
- T5 已将持久 intent、稳定幂等身份、unknown 受理保护、原生 journal、凭据库读取、IPC 轮询、取消竞态和逐 slot 输出提交接入 Tauri 主进程；其本地验证和限制见 `docs/changes/2026-09-19-taskhost-durable-intent/verification.md`。隔离 Tauri/WebView 提交、取消、重启恢复证据尚未完成，T5 状态为 PARTIAL。

## 已完成范围

T0、工程治理、Provider 提交门禁/回归、T1 读取和写入保护、T2 画布持久化、T3a 原生素材、T3b Desktop 项目包、T4 统一图片命令均 DONE。

T4 将首页、对话、画布、结果继续编辑和上传重绘接入相同 BYOK 图片命令；归档原件、来源节点、审批、取消、失败和结果连线共用一条链路。连接已配置与已验证分离，模型/地址/凭据变化撤销旧验证。当前协议为 OpenAI-compatible；比例和清晰度仅保存草稿，实际请求使用供应商默认值。

## 当前验证

UI主线及补充验证：150 Node、191 Edge browser、UI119/0、lint/typecheck/format/build通过；Rust60/60、Tauri check/release通过。当前补充细节、压力边界与三模式证据见 `docs/changes/2026-09-20-ui-main-alignment/followup.md`。T5原生IPC业务运行态验收仍独立保留。

每个环境都完成首页→对话→画布结果编辑：3 个任务、3 条来源连线、编辑请求带归档原件；Desktop 全新 profile 恢复任务与图完全一致，原件 SHA-256 一致。HTTP fixtures 只证明产品链，真实付费 Provider 仍由 EXT-PROVIDER 单独验收。主线验收期间发现既有会话动画测试跨进程漏采首帧，已改为观测实际 CSS 动画的固定时间点，保留位移和布局断言。

Figma现行可取得面板的设计上下文、DOM和同状态截图已核对。Landing410:59708不存在，项目库/Skill/ComfyUI及部分设置缺独立现行Frame，因此UI-004仍为PARTIAL；工程补充状态不能当作Figma定义。

## 按依赖排列的剩余任务

1. **T5（PARTIAL，下一收口）**：在隔离 Tauri/WebView 与可控 Provider 下验证原生 TaskHost 的提交、取消、进程重启、逐 slot 恢复和 unknown 人工核对边界；代码已随 Desktop 打包并接入产品主链。
2. **T6（PARTIAL）**：ComfyUI 现有扫描/adapter 接入实际任务链，覆盖模板、任务、归档、取消与恢复；EXT-COMFY/EXT-PROVIDER 的真实外部验收缺本轮可用服务和授权凭据。
3. **T7/T8（TODO）**：安装包生命周期、恢复/回滚验收，以及 Shared Core 与平台职责收口。
4. **UI-001/003/004、PERF-001**：具体状态以ledger为准。菜单交互UI-002及主线整合已关闭；缺失Figma来源、剩余Prototype边界、缩略图/分页/内存IO仍独立验收。
5. **T9、T10-PREP（TODO）**：Web 容量/离线/项目包适配和部署备份回滚产物；T10/T11 仍依赖 VPS/DNS/切换外部条件。
6. **T12（TODO）**：Desktop/Core/Web 稳定后推进 Mobile。

31项账本统计：15 DONE、4 PARTIAL、5 BLOCKED、7 TODO。外部条件只阻塞对应验收，不能阻断本地可实施项。

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


## 窄屏关闭优先级补充

TASK-UI-DISMISS-002 修复账号菜单跨窄屏断点、键盘展开后外部点击不关闭；同状态三环境专项与191项浏览器回归通过。详见 docs/changes/2026-09-20-ui-main-alignment/followup.md。稳定main提交以Git回读为准，上述旧SHA是阶段记录。UI-004设计来源缺口与PERF-001压力边界继续保留。
