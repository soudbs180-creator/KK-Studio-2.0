# AI handoff

## 2026-09-21 TASK-MAIN-CLOSE-002 当前恢复点

- 从 `origin/main=3c4d012846e53095bd4f11343a1cd2ef61aa3bbd` 回读后，当前候选是 `bb96dadc08c12a2177481d2ae1e4dda605cc77d4`，位于 `codex/TASK-MAIN-CLOSE-002`；不要把候选直接推入或快进稳定 main。
- 当前候选本地完整 verify 为 172 Node、197 browser、UI121/0、0 failure/flaky；Rust 61/61、fmt、client check 通过。真实运行日志为 `.tmp/verify-batched-final-2.log`，三模式 runtime 报告仍明确产品运行代码源为 8369185。
- PR #8：<https://github.com/soudbs180-creator/KK-Studio-2.0/pull/8>。delivery 已成功，hosted verify 因 GitHub 付款/额度限制没有启动；恢复 Actions 后先重跑并回读 checks，再按 expected head 合并，最后 fetch 验证本地和云端 main。
- `docs/evidence/browser-results.json` 是历史运行产物，不绑定当前候选；不要用它替代当前 `.tmp/verify-batched-final-2.log` 或重新生成的 hosted 证据。

## 2026-09-21 TASK-GOV-002 合入后恢复点

- 先从 `origin/main@92c1ef17c42030ef6976e039efe4775c4bdc0939` 开始；PR #4 已合入，规则候选 head 为 `19215945573ca97dd4427f36ac8e074a1378f9fb`，合并前基线为 `c3ff0871b3db674e0ab073f1445879d84fee3507`。不要从已删除的治理分支继续开发。
- PR #4 的 delivery、完整 repository verification、Rust fmt/test、client check 和 Tauri no-bundle build 均成功。规则账本当前为 32 tasks/0 violations；远端服务器 rulesets/protection 因 API403 仍 BLOCKED。
- 规则范围不覆盖产品实现、产品测试、既有证据或其他任务提交。若后续修改产品，必须新建独立任务、worktree、change package 和验证记录。
- 当前只清理本次治理分支和工作树；其他任务工作树只读保留，先修正其账本映射再决定是否清理。

## 以下为此前交付快照（保留历史，不覆盖上面当次核对）

更新：2026-09-20。先读 PROJECT_STATE.md、SPEC_BASELINE.md、task-ledger.json，再核对 git/worktree/进程；不要凭旧测试总数或默认快捷方式继续。

## 2026-09-21 当前恢复点

- 整合 worktree 为 TASK-MAIN-CLOSE-002；候选已完成 151/197、Rust61/61 和三模式实际 runtime。先核对当前分支、origin/main 与 PR4（TASK-GOV-002）是否已合并，再继续，不得把候选直接推 main。
- 当前证据目录为 docs/evidence/2026-09-21-main-close-002；实际 preview/Desktop bundle 为 index-C6RT8Uju.js。第一次占用1423的错误 bundle 已明确排除。
- UI-004、PERF-001边界已写入 ledger；PR 前需 delivery:check、merge最新origin/main、重跑受影响检查，并保留根目录其他任务改动。

## 当前恢复点

- 唯一仓库与当前稳定main运行目录是 `D:/kk-studio-next`，跟踪 `origin/main`；先fetch并核对HEAD/tree/dirty。旧TASK-INTEGRATION-001已归档为历史分支，不再是当前main入口。
- 原checkout的409项dirty/untracked内容和原index已校验归档到 `.tmp/root-before-main-20260920/`；不得把归档当新候选全量上传。根目录已迁移到main，PR #3/#5已合并；精确最新提交以Git回读为准。
- T4 已 DONE：统一 submitImageCommand，画布/结果编辑/上传重绘走 executeTask；sourceItemId 同步 browser/native/package；结果边只发布一次，取消与恢复准确映射来源。连接 configured/verified 分开，保存配置或 models 探测不验证图片生成。
- 本轮UI验证：150 Node、191 browser（0失败/重试）、UI119/0；Rust60、fmt/check、Tauri release通过。补充bundle `index-Be6XJzPc.js`；3模式菜单专项和34状态主矩阵见UI alignment verification/followup。字节转换优化后大图重绘20倍CPU连续3次通过；大规模素材库与同步大快照瓶颈仍由PERF-001跟踪。
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
- 新源码必须重新build/release并分别验证Web/Desktop。现行Figma可取得面板已经核对；Landing等独立稿件缺失，UI-004不宣称全页面完成。
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


## 2026-09-20 UI 主线整合

TASK-UI-MAIN-001 从 origin/main@8aca3ab 出发，三方整合27项原目录交互修复并保留主线T3b/T4/T5；现行 Figma 的设置、搜索、资产展开/收纳及任务入口偏差已修正。34种页面状态已用实际导航捕获；原目录尚未切换前不能把候选描述成原目录最新版。准确命令、运行矩阵和同步状态见 [verification](../changes/2026-09-20-ui-main-alignment/verification.md)。UI-004 保持 PARTIAL：当前唯一Figma页面中没有Landing410:59708及部分独立页面稿。治理候选TASK-GOV-002保持独立，未夹带合入。

## 2026-09-20 UI 主线整合收口

- PR #3 已 squash 合并到 `https://github.com/soudbs180-creator/KK-Studio-2.0`；本地 `D:/kk-studio-next` 的 `main` 与远端 `main` 同为 `fb57529c719924330ec0154f5374df8f5d508e00`。
- 原根目录 409 项已校验备份并归档，旧 `master`、旧本地 `main` 未删除；不要从归档目录直接开发或上传。
- 当前已验证的是现行 Figma 可取得基准和三种运行模式；Landing 等缺失设计来源仍保持 PARTIAL。


## 窄屏关闭优先级补充

TASK-UI-DISMISS-002 修复账号菜单跨窄屏断点、键盘展开后外部点击不关闭；同状态三环境专项与191项浏览器回归通过。详见 docs/changes/2026-09-20-ui-main-alignment/followup.md。稳定main提交以Git回读为准，上述旧SHA是阶段记录。UI-004设计来源缺口与PERF-001压力边界继续保留。
