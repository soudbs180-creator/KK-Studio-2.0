# AI handoff

## 2026-10-08 桌面单排标题栏候选

TASK-UI-013 已将桌面应用名、菜单与原生窗口控制合并为一排40px。完整 verify（723root/172Agent/411browser，原skip8/2、零失败/零flaky）、client:check、fresh Tauri 单排/真实拖动/最大化还原/最小化关闭及 Web 三档 development 验证通过；初始化错误不再影响设置入口，既有3项回归未放宽。Desktop2.1.7，Web2.1.7/Mobile规划2.1.1保持；FEAT-023仍部分实现。分支 `fix/TASK-UI-013-single-row-titlebar`，base main@1af0357b；原main未修改，独立只读审查与提交收据另绑，未合并/安装器/正式发布。[验证](../changes/2026-10-08-single-row-titlebar/verification.md) / [审查](../changes/2026-10-08-single-row-titlebar/review.md)。

## 2026-10-08 模型能力声明：Hosted日志复核后的增量修正

TASK-MODEL-001 本地AC1–5 DONE。草稿无变化通知覆盖与显示字段依赖问题已修正：32定向无retry、完整verify723/731root(8原skip)、172/174Agent(2原skip)、408/408browser零flaky、UI198/0、clientcheck/fresh Tauri隔离运行PASS。2026-10-08 16:31 独立只读审查base5dd6e6dd..head71ddb625 PASS，MC-002/MC-003关闭，MC-001保持关闭；独立87/87、389源码hash和产物匹配，新指纹2ebaab3d。最终文档HEAD需补审，PR#36当前新SHA Hosted待取得；首轮2797687c的405pass+1flaky留档，唯一因果仍UNKNOWN。未合并发布，原主checkout未写入；FEAT-003仍PARTIAL，真实Provider/蒙版/扩图/Mobile及既有开发插件边界不变。下面早先PASS条目保留为当时SHA的历史记录。

## 2026-10-08 TASK-MODEL-001 恢复入口

任务worktree `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-MODEL-001-capabilities`，分支codex/TASK-MODEL-001-capabilities，最新base5dd6e6dd；构建/完整验证源码基准577ed3ee。TASK-MODEL-001 已实现精确账号/model 图片操作三态及参考图/任务数量限额，MC-001修正统一归档素材去重和重绘预校验。当前base main@5dd6e6dd的完整verify723root/172Agent/406browser通过，原skip8/2保留且0flaky，UI198/0；client:check、fresh Tauri和隔离运行通过。候选源码Desktop2.1.6/Web2.1.7，Mobile规划2.1.1；本地AC1–5完成，独立6da9920e技术补审PASS、MC-001关闭；最终文档head补审和PR/Hosted交付收据另绑，不代表已合并/发布。FEAT-003保持PARTIAL，真实Provider和蒙版/扩图执行另验；TASK-PLUGIN-DEV-001开发插件既有错误仍TODO。 先读[计划](../changes/2026-10-08-model-capabilities/plan.md)、[验证](../changes/2026-10-08-model-capabilities/verification.md)、[review](../changes/2026-10-08-model-capabilities/review.md)和账本；最后证据在evidence/latest-main5dd，不能用首轮0d或过渡5b产物代替。初次公开push审核拒绝与用户后续持续授权已记录，检查/审查通过后创建draft PR；实际合并/发布另计。

## 2026-10-08 阶段工作台主线融合

用户已授权“合并主线”。原候选ca6bc52在推送前遇到主线PR #34/5b0eb6a前移；本轮在既有TASK-ORCH-002分支融合为唯一Plan入口、TaskWorkbenchStages和共享编排器，保留主线的暂停/重规划/回执/MCP改进。候选Desktop2.1.5/Web2.1.6/Mobile规划2.1.1；97tasks/34features不新增重复登记，FEAT-030仍PARTIAL。组合本地AC完成：49/49、完整verify708root/172Agent/400browser零retry（原skip8/2）、Rust97及fresh Tauri审批/重启/真实CAS/恢复草稿通过；精确SHA独立补审和Hosted门禁另验；实际集成以本轮PR merged及merge SHA为准。下方首轮未推送/main不变等描述保留为历史，不代替当前进度。

先核对origin/main、当前分支/HEAD，读[融合计划](../changes/2026-10-08-stage-workbench/integration-plan.md)和本轮verification/review；不要再引入StagePlanPanel或第二个stages标签。最终集成独立收据在D:/kk-studio/output/minimax-rea-20261008/evidence/stage-workbench-review-integration.md，必须回读精确SHA和真实结论。未获清理授权，保留分支/worktree。

## 2026-10-08 阶段计划工作台恢复点

保留独立 `codex/TASK-ORCH-002-stage-workbench`，先核对status/HEAD，读[计划](../changes/2026-10-08-stage-workbench/plan.md)、[比较](../changes/2026-10-08-stage-workbench/comparison.md)、[验证](../changes/2026-10-08-stage-workbench/verification.md)、[审查](../changes/2026-10-08-stage-workbench/review.md)。TASK-ORCH-002本轮本地AC DONE；源码41dd865独立PASS，3项finding关闭；完整verify638root/172Agent/389browser零retry，production Tauri拒绝/重提/返工/重启/真实CAS冲突/恢复草稿通过。最终文档SHA补审收据在 D:/kk-studio/output/minimax-rea-20261008/evidence/stage-workbench-review-final.md，必须回读真实结论。仅更新原feature/task，无新队列/存储；FEAT-030仍PARTIAL。Native临时证据在.tmp且已复制本轮evidence，不能被browser清理。下一步ORCH-003需taskId/attempt绑定和unknown映射，先明确图片/文本与媒体依赖范围；Comfy归T6，健康/恢复归T5；计划批准不替代供应商提交授权。main@21d121d未改，未推送/合并/发布。

## 2026-10-08 未完成任务继续执行恢复点

当前实现工作树为 `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`，分支 `codex/TASK-AUDIT-20261003`。本轮最终业务代码提交为 `dc055566457f8413c8ac7f9cc17778a9958bd5d8`，包含阶段计划工作台、成本未知语义、画布交付边界、不确定重试与重启恢复对账、归档证据保护和恢复错误文案清理。独立复核返修后，原生回执同时核对任务 ID/幂等键，重复、缺失、越界、声明冲突与非法类型均隔离为 unknown，不导入异常结果、不普通重试、不自动重复提交；保留有效归档、合法子集和真正缺失 `outputs` 的旧 `assetIds` 格式。恢复时先读[本轮计划](../changes/2026-10-03-incomplete-tasks/plan.md)、[验证](../changes/2026-10-03-incomplete-tasks/verification.md)、[复核记录](../changes/2026-10-03-incomplete-tasks/review.md)和 `docs/governance/task-ledger.json`，再检查当前 HEAD、工作树与最新 bundle。

账本当前为 97 项；TASK-ORCH-002 已在本地范围 DONE，TASK-CANVAS-001/TASK-TASKSTATE-001 保持 PARTIAL，新增 P1 `TASK-TASKSTATE-002` 等待真实供应商报价回执。继续工作不得把本地 fixture、构建通过或历史证据当作真实 Provider、Mobile、VPS、第三方 MCP 或用户视觉验收。

平台元数据为 `d9f8eab`：Desktop 2.1.4 / Web 2.1.5 / Mobile 规划 2.1.1。收尾源码基准`ef580db`已经按本树lock独立npm ci，API/Dialog/CLI为2.11.1/2.7.3/2.11.4；原共享链接保存在本树`.tmp/dependency-links-before-closeout-20261008/`，主线依赖未动。完整verify及浏览器388/388无flaky通过，当前生产JS为`index-DWwNRuIh.js`；新带Agent的Tauri release、平台版本/项目重启/确认与隔离记忆保护通过，独立收据在外层`.verification/TASK-AUDIT-20261003-closeout/`。这不证明真实TaskHost生成与Provider；继续运行先核对当前HEAD、lock、bundle/EXE和本任务实际PR的当前检查，不能从旧审查或本机构建推断已推广或发布。

后续代码优先级仍按ORCH-003及其MEDIA-001依赖、报价回执、MCP-AUTO推进；代码建设可先于真实凭据，不能把TODO一概当作外部BLOCKED。

## 2026-10-03 项目建设目标恢复入口

先读[项目建设目标](PROJECT_GOALS.md)、[`PROJECT_STATE.md`](PROJECT_STATE.md)、[`TASK_LEDGER.md`](TASK_LEDGER.md)和[本轮变更计划](../changes/2026-10-03-project-goals-baseline/plan.md)。目标门禁为 `node scripts/check-project-goals.mjs`，并已接入 `lint`/`verify`；继续按创作、Agent、能力配置、恢复四条主路径检查 loading/success/error/cancel/offline/unknown 和重启/并发边界。当前任务账本的外部 Provider/GPU、ComfyUI、VPS、Mobile、第三方 MCP 与用户视觉验收仍保持原状态，不要用本地 fixture 或构建通过升级它们。

同轮已修复 `McpSettings.tsx` 的 301 行组件边界问题，表单和服务器列表已拆分并通过当前 head 独立复核；继续改动时先读[组件变更](../changes/2026-10-03-ui-component-boundary/verification.md)，并重新执行 UI、类型和 MCP 设置回归。

## 2026-10-01 Codex 生图回传恢复点

先核对PR #33真实merged状态、最新origin/main和最终文档head审查/CI；本机TASK-AGENT-008 AC-1–3 DONE不能替代推广收据。[计划](../changes/2026-10-01-agent-image-transport/plan.md)/[验证](../changes/2026-10-01-agent-image-transport/verification.md)保留main@709e51d基线、实现3c63f1e独立PASS与P3文档修正。native result去二进制和提交前幂等均RED→GREEN，2 MiB保护保留；run5真实生图/续聊/重连/重启hash一致且节点/标记唯一，verify632root/172Agent/377browser和Rust97 PASS。run3/run4失败历史及run5脚本设置错误不覆盖。重启先开项目并按入口启动服务，本次未改自动启动。豆包区域限制登录和CLI自动回画布仍未完成，不并行使用其profile。57/16→809/768，附加752恒定。

## 2026-09-30 安装器恢复入口

先fetch并核对实际origin/main、TASK-DESKTOP-INSTALLER-001的PR与交付收据，不从旧基线猜测合并状态。本机AC1–4已DONE，独立技术/运行证据审查至2cf5249 PASS、完整verify631root/169Agent/377browser无flaky、Rust97/clientcheck通过；最后文档精确head/托管门禁单独绑定。计划/证据在[本轮计划](../changes/2026-09-30-desktop-installer/plan.md)和[验证](../changes/2026-09-30-desktop-installer/verification.md)。安装器343681213bytes/hash7103126d…d635，receipt0fba927/build61b0c85；原生报告必须放独立.tmp目录并保存本轮evidence，不能被browser清理。保留已有portable与数据，不卸载用户应用；T7/FEAT-026的干净系统/真实断网/低版本回滚/签名/真实服务仍开放。后续本地顺序仍按上轮remaining中的阶段编排UI、侧栏持久化等推进。

## 2026-09-30 恢复入口

先 fetch 并核对 origin/main 与集成 PR 的真实 merged 状态、head/merge/tree；不要从旧 dirty main 或旧 worktree 直接启动。读 [本轮验证](../changes/2026-09-29-project-landing/verification.md)、[审计](../changes/2026-09-29-project-landing/audit.md)、[剩余项](../changes/2026-09-29-project-landing/remaining.md) 与机器账本。版本源是 config/platform-versions.json。

复现使用当前 production preview 1423 或 fresh Tauri release；1421 被其它进程占用时不自动切换 development 端口。浏览器测试输出到 test-results，当前证据复制到本轮 evidence，禁止覆盖历史截图。Native audit 使用 --data-dir 与独立 WebView profile，完整记忆文件不写日志。

若修改 head，重新独立审查、托管 verify/delivery、构建实际 bundle/客户端并绑定产物 hash。真实凭据/付费生成、安装器/签名、Mobile/VPS 与用户最终视觉验收仍需各自完成。

## 以下为历史恢复记录

## 2026-09-28 TASK-UI-CANVAS-001 当前恢复入口

当前根工作区 `D:/kk-studio/KK-Studio-2.0` 仍为 dirty `main`，未提交。画布会话布局修复已完成：平板 960–1200px 使用右侧 400px rail，侧栏固定宽度只由 toggle 切换；目标回归与 build/typecheck 通过。恢复时先读 [verification](../changes/2026-09-28-canvas-chat-layout/verification.md)、账本和 `git status`；不要把 `connector-video1` 空白 fixture 超时、Figma reauth 或 Tauri/native 未运行误报为本轮布局失败。若继续改 CSS/DOM，重跑 AC-1–AC-4 并重新生成 `dist`/截图。

## 2026-09-29 项目落地恢复点

候选分支 `codex/TASK-PROJECT-001-landing-integration` 已从原 dirty 工作区保存快照，并正在合并 `origin/main@1e95a13`。继续时先核对冲突文件、真实 Vite bundle 和 UI 回归；不要把旧截图或 fixture 失败改写为成功。

## 2026-09-28 VPS 搬迁准备恢复点

`codex/T10-PREP-vps-migration` 的精确 head `abe1e99` 已由独立复审与 PR delivery/deploy-linux/verify 通过，并 squash 合入 `main@45fdc14`；合并后主线 deploy-linux/verify 也成功。原根 checkout dirty 不碰。旧 VPS 当前无 SSH 认证，用户浏览器控制页接口超时，HTTP 301 不证明版本/数据；需当前主机访问、离机备份和隔离恢复才能确认搬迁。用户新目标是 Web 本机伴随服务存储，现有 IndexedDB 仍是待迁移实现。

## 2026-09-28 三端版本与本机服务目标恢复点

版本任务精确 head `9d55857` 已合入 `main@799efc5`；`config/platform-versions.json` 是三端版本源，新增 `npm run version:bump -- --platform desktop,web` 与 `npm run version:check`，每项后续任务作者按实际产物自动递增。PR/主线门禁与独立复审均 PASS，合并树一致。Web 本机伴随服务、真实登录和 Mobile 包均未实现，切勿将 IndexedDB 或响应式布局冒充目标能力。原根 checkout dirty 不可覆盖；验证见[本轮记录](../changes/2026-09-28-platform-versioning/verification.md)。

## 2026-09-28 图片对比合并后主线 CI 回归

PR #21 已合入 `main@7bc7c67`，原 push run `36369533105` 因 390px 对比按钮实测 `43.999992px < 44px` 失败。[PR #22](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/22) 以 45px 最小高度修复并完成 Web/Desktop GUI、本地与 Hosted 验证及独立复审，现合入 `main@065bcbf`；合并后主线 verify 通过。旧根 checkout dirty，禁止覆盖。

## 2026-09-28 图片对比 PR #21 恢复点

从 `D:/kk-studio/.worktrees/canvas-compare` 继续，先核对 `origin/main`、任务分支实际 head、草稿 [PR #21](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/21) 与当前 Hosted 检查。源码 `f8d5165` 独立只读复审 PASS，Web `verify` 302/302 浏览器、Tauri release GUI 与本地 delivery 通过；本次文档补录的新 head 需再审/再查 Hosted。FEAT-036 / TASK-COMPARE-001 保持 PARTIAL / REVIEW，用户产品验收、主线集成及发布未完成。证据见[验证](../changes/2026-09-27-canvas-image-compare/verification.md)和[审查](../changes/2026-09-27-canvas-image-compare/review.md)。根 checkout 的未提交 UI 改动不要混入。

## 2026-09-27 图片对比候选恢复点

从 `D:/kk-studio/.worktrees/canvas-compare` 的 `codex/TASK-COMPARE-001-canvas-compare` 恢复；基线 `origin/main@a89792a`，先核对最新远端/main、当前分支 SHA、dirty 状态与任务账本。FEAT-036 的 Web 全量 `verify`（302 浏览器）、Tauri build 和隔离 release GUI 已通过，截图与运行身份见[本轮验证](../changes/2026-09-27-canvas-image-compare/verification.md)。独立最终审查、Hosted PR 检查和用户产品验收未完成；不把候选当成主线或发布版本。根 checkout 的未提交 UI 改动不得混入本任务。

## 2026-09-27 UI #19 主线同步恢复点

- 远端 `main@a89792ad` 包含 PR #14/#15/#16；本任务 worktree `D:/kk-studio/.worktrees/TASK-UI-010-ui-regression` 正在将 #19 合入该主线，根目录 dirty UI 不参与。六处治理文档冲突已按任务/功能 ID 合并，72 个任务、32 个功能，检查零违规。
- 两处浏览器偶发失败已定位为侧栏过渡期间断言与图片请求未到 Provider 前取消，定向用例各重复 16 次无重试通过。完整 `verify`、delivery、最终 head 独立审查及 Hosted 检查须在提交后回读，不用旧 `3db7b69` 的结果代替。
- 未接线的 `tokens.css/json` 仍与运行 UI 的 291px 侧栏、40px 顶栏冲突；PR #20 堆叠在 #19 上且有独立未提交修正。真实媒体、第三方配置消费及正式 Desktop 发布仍为开放工作。

## 2026-09-25 侧栏真实项目整合恢复入口

- 当前候选 `D:/kk-studio/.worktrees/TASK-UI-009-integration` / `feat/TASK-UI-009-ui010-integration` 基于 UI-010 已提交的 `98c567f`；根工程、旧 UI-009 dirty 工作树与 1423 UI-010 preview 不要覆盖。
- 候选侧栏和搜索使用真实 `CreationSnapshot` 项目；文件夹、拖放、置顶仍是会话 Prototype。完整 verify 370 Node/337 Edge browser、四档响应式与 fresh Tauri 真实项目恢复均通过；独立复核和 PR 待完成。1424 是本候选 production preview，1423 仍是 UI-010。以 [新验证记录](../changes/2026-09-25-sidebar-real-projects/verification.md) 和 Git 当前状态为准，不继承历史“307 浏览器通过”的结论。

## 2026-09-24 当前 UI 候选恢复入口（TASK-UI-010）

- 根工程 `D:/kk-studio/KK-Studio-2.0` 有并行未提交改动；本任务只在 `D:/kk-studio/.worktrees/TASK-UI-010-ui-regression` 的 `fix/TASK-UI-010-ui-regression` 分支写入。接手先核对这两个工作区的 HEAD/status，勿将 1421 根开发页或旧桌面 EXE 当作候选结果。
- 本轮变更与 Web/原生运行证据在 [change package](../changes/2026-09-24-ui-regression/verification.md)，42 态页面核对在 [architecture audit](../changes/2026-09-24-ui-regression/architecture-audit.md)。Web preview 固定 1423；隔离 `--data-dir` 的新 Tauri release 为 `src-tauri/target/release/kk-studio.exe`，原生加载的 JS/CSS 与当前 dist 哈希一致。复核修复后完整 `npm run verify` 已通过 370 Node、319 browser；[草稿 PR #19](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/19) 的独立 reviewer 对 `3db7b69` 复审确认五项 P2 关闭、没有新增 P0/P1/P2，代码审查 PASS。候选 `tokens.css` 未接线，291/40 外壳与 200/56 导出冲突未裁决，在线 Ardot 未回读。侧栏演示项目行须跟进 `TASK-PROJECT-SIDEBAR-001`。
- 能力边界：WorkBuddy、豆包、真实外部账号、共享记忆及自动模型调配保持现有开放任务；这轮只收敛可见 UI 与运行态，不更改功能真实程度。

## 2026-09-27 Provider #16 独立补审 PASS 恢复点

PR #16 源码 `1f81322` 独立只读补审 PASS，之前 P1/P2/P3 均关闭；本地完整 `verify` 和 delivery 通过。补录审查的文档提交仍需精确 head Hosted 检查；PR 未合并，真实第三方配置消费仍待接线验收。根目录 UI 未提交改动继续保持隔离。

## 2026-09-27 Provider #16 复审整改恢复点

独立 reviewer 对 `39369c9` 给出 CHANGES REQUIRED（中文 id 渲染静默失败 P1、同名不同地址 seed 撞 id P2、功能卡状态 P3）。任务 worktree 已用失败先行测试修复，完整本地 `verify` 为 456 Node、300 浏览器及治理/功能/Markdown 零违规；修复后新 head 的独立补审、Hosted 检查、真实 Codex/Claude 消费仍待完成。恢复时先回读 PR #16 当前 SHA、工作树与 `main`，不要拿旧 head CI 代替。

## 2026-09-27 Provider Connectivity 恢复点

远端 `main@2683d852` 已合入 PR #14/#15，主线 Hosted 工作流 36245503714 成功。PR #16 的任务 worktree 在主线合并后通过完整本地 `verify`（454 Node、300 浏览器、治理 70/0、功能 32/0、Markdown 85/0），Provider 功能编号调整为 FEAT-032，FEAT-030 留给编排。旧 head 独立审查的 4 P1、2 P2 已有失败先行修复；新 head 独立复审、PR/push Hosted 检查和真实 Codex/Claude 消费仍待完成。根工作区 75 项未提交 UI 改动不要混入本分支。

## 2026-09-26 MCP 限额审查恢复点

PR #15 已吸收 `main@f626438`，本地完整验证通过；独立只读审查对业务源码 `3ab2578` 为 PASS WITH FOLLOW-UPS，两个基线 P2 已登记为 `TASK-MCP-REGISTRY-001/002`。恢复时先回读 PR #15 最终 head、Hosted `verify`/`delivery`、工作树及主线 SHA；不能把独立代码审查等同于真实第三方 MCP 或 Desktop release 验收。根工作区的 UI 改动仍保留。

## 2026-09-26 当前恢复入口：PR #14 已并线，PR #15 待新 head 验收

远端 main@f626438 已包含 PR #14 领域层；根工作区的未提交 UI 工作仍需保护。fix/TASK-MINIMAX-001-mcp-registry-limit 已合入新 main 并解决文档冲突；恢复时回读该分支的提交、CI、独立审查与工作树，不把尚在审查的 MCP 修复算作主线。

## 2026-09-26 TASK-ORCH-001 技术门禁恢复点

PR #14 源码 `9ddfcb5` 独立只读复审 PASS，[Hosted run 36218263291](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/36218263291) `verify`/`delivery` 成功；本地 422 Node、82 Rust、300 浏览器通过。恢复时核对补录文档后的准确 head、CI 与 dirty 状态，再看用户产品验收；未经验收不合并。PR #15 四处文档冲突在 #14 后顺序整合。详见[验证](../changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-26 TASK-ORCH-001 返工重审候选

独立 reviewer 对 PR #14 `abb2bb8` 给出 CHANGES REQUIRED：返工提示词变更沿用旧计划批准（P1）、原计划同 ID 重放失败（P2）。任务 worktree 已分离原 prompt / 可选 `reworkPrompt` 并在有效提示词变更时重开计划审批，Web/Rust 包测试已覆盖；本地 422 Node、82 Rust、300 浏览器及静态/构建通过。恢复时核对新 head、Hosted CI、独立复审及 dirty 状态；PR #14 未验收不可合并，PR #15 四处治理文档冲突待顺序整合。详见[验证](../changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-26 TASK-ORCH-001 结果返工候选

独立 reviewer 对 PR #14 `5fff9de` 确认旧五项问题关闭，但提出结果审批拒绝后成功工作项不可重做的 P1，结论 CHANGES REQUIRED。任务 worktree 已补宿主返工和跨阶段下游失效，当前本地 422 Node、82 Rust、300 浏览器及静态/构建通过；恢复时先核对交付、新 head、Hosted CI、独立复审和 dirty 状态。PR #14 未验收不可合并，PR #15 的四处文档冲突须顺序整合。详见[验证](../changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-26 TASK-ORCH-001 审批与依赖修复候选

独立 reviewer 对 PR #14 `36a3419` 给出四项 P1（计划审批、未运行完成、ABA、依赖）及一项 P2（跨项目计划），结论 CHANGES REQUIRED。任务 worktree 已补校验及失败先行回归，本地 420 Node、82 Rust、300 浏览器与静态/构建通过。恢复时核对新 head、Hosted CI、独立复审及 dirty 状态；PR #14 未验收前不可合并，PR #15 四处文档冲突须顺序整合。详见[验证](../changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-26 TASK-ORCH-001 身份唯一性候选

PR #14 旧 head `c7abc45` Hosted CI 已通过，独立复审任务因执行额度耗尽未完成。之后在任务 worktree 复现并修复重复阶段索引/计划 ID 的跨端边界；本地 412 Node、82 Rust、300 浏览器及静态/构建通过。恢复时核对新的 branch head、Hosted CI、独立复审与 dirty 状态；PR #14 未验收前不能合并，#15 四处文档冲突须后续顺序整合。详见[验证](../changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-24 TASK-ORCH-001 重复 ID 修复候选

PR #14 `67ff18fb` 独立复审已关闭原两项 P1，新发现重复工作项 ID 会使 `updateWorkItem` 误改已成功项。任务 worktree 已添加计划级 TS/Rust 唯一性校验及失败先行测试；当前 409 Node、81 Rust、300 浏览器与类型/Lint/构建通过。恢复时先核对 dirty/new head，再核对 Hosted CI、独立复审；未完成前不可合并。PR #15 的四处文档冲突待顺序整合，详见[验证](../changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-24 TASK-ORCH-001 独立补审修复候选

独立 reviewer 对 PR #14 旧 head `ae4bf7a9` 给出两项 P1：公开旧计划覆写，以及 Desktop/Web 项目包计划字段与素材引用漏同步。任务 worktree 已修复并跑 407 Node、80 Rust、300 浏览器与静态构建检查。下一步核对新 head 的 Hosted CI、独立复审和 PR #15 文档冲突，未完成前不可合并。详见 [验证记录](../changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-24 TASK-ORCH-001 候选

`D:/kk-studio/.worktrees/TASK-ORCH-001` 的编排修复已在本地重跑 405 Node 与 300 Web 浏览器测试；最终独立复审仍 NOT VERIFIED，不可据此合并或宣称 Desktop/Provider 验收。恢复时核对任务分支实际 head、`origin/main`、dirty 状态及 [验证记录](../changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-24 MCP 配置上限候选

`D:/kk-studio/.worktrees/TASK-MINIMAX-001-mcp-registry-limit` 在 `origin/main@76339c9f` 上处理第 51 个 MCP 服务器配置的数据丢失缺陷；恢复时核对实际 head、dirty 状态及 [本轮验证](../changes/2026-09-24-mcp-registry-limit/verification.md)。`TASK-MCP-PROTO-001` 是另一个未开始的协议协商任务。编排候选在另一 worktree，两个分支的治理文档有重叠，禁止未解决冲突直接合并。

## 2026-09-23 Google 接入候选（TASK-AGENT-004/005，PARTIAL）

当前候选分支 `feat/TASK-AGENT-004-google-closeout` 位于隔离 worktree `C:/Users/Administrator/.codex/worktrees/google-closeout/KK-Studio-2.0`，叠加 004 API Key Interactions 对话/生图与 005 Gemini CLI 账号文字对话。真实账号、桌面运行与最终独立审查未验收。继续时先读 [004 验证](../changes/2026-09-23-google-interactions/verification.md)、[005 验证](../changes/2026-09-23-google-cli-login/verification.md)和 [ADR-007](../architecture/adr/ADR-007-gemini-cli-bridge.md)，核对当前 Git/PR 与最新校验结果；不得把旧 fixture 结果称为真实 Google 出图。

## 2026-09-24 当前恢复入口：CodeBuddy 受控委派

- 当前工作树 `D:/kk-studio/.worktrees/TASK-AGENT-007-codebuddy-cli`，分支 `feat/TASK-AGENT-007-codebuddy-cli`，基于尚未合入的 `feat/TASK-MEMORY-001-local-memory`。先回读 Git 状态、[本轮验证](../changes/2026-09-24-codebuddy-delegation/verification.md)、[后续顺序](../changes/2026-09-24-codebuddy-delegation/remaining.md)，再看下方记忆历史。
- Codex 仍主控；CodeBuddy CLI 只处理不超过 3000 字的独立短文本。设置路径/连通测试、真实 MCP、随包 MCP 与最终新 Desktop 内真实 Codex 工具调用和可见回复均已验收，脱敏事件见 `docs/changes/2026-09-24-codebuddy-delegation/evidence/desktop-codebuddy-runtime.json`。首次桌面尝试 120 秒超时，最终新包约 145 秒完成；前置推理延迟和自动路由仍待做。WorkBuddy OAuth、豆包、千问和素材站不是本任务已完成项。

## 2026-09-24 当前恢复入口：本地记忆复核

- 当前分支 `feat/TASK-MEMORY-001-local-memory` 位于 `D:/kk-studio/.worktrees/TASK-MEMORY-001`；代码 SHA `8c31846` 已推送并获独立只读复核（无新确定性代码阻断），本段文档随后补记。main 保持 `76339c9`。先检查 `git status` 和本节，再看下方历史快照。
- FEAT-020 与 TASK-MEMORY-001/002 均未达到真实跨应用验收；账本改为 PARTIAL / NOT_VERIFIED。当前自动采集/注入只在 KK Studio 的 Codex 对话中实现，豆包和 WorkBuddy 原生客户端尚未接入。Web FSA 真实授权、Desktop 打包运行态、真实模型引用仍待验证。
- 本轮修补与证据见 `docs/superpowers/plans/2026-09-24-memory-closure.md`、`docs/changes/2026-09-24-local-memory/verification.md` 的勘误。当前 `npm run verify` 为 415 Node、309 browser，Rust 91/91。Desktop 与 Web 写锁不能互斥，Web 授权共享目录已改只读；手动提炼绑定本次 `clientMessageId`，Desktop 重置写入失败时保留 live 文件。真实 FSA 授权仍待验收。完整记忆文件仅存本机，选中的相关片段会随当前请求发送给模型推理。

## 2026-09-24 历史恢复入口：本地长期记忆（TASK-MEMORY-001 + 002，旧候选）

- 唯一工程为 `D:/kk-studio/KK-Studio-2.0`；本任务在独立 worktree `D:\kk-studio\.worktrees\TASK-MEMORY-001`（分支 `feat/TASK-MEMORY-001-local-memory`，base `origin/main@76339c9`，已 push，未开 PR）。**主 checkout 在 main@76339c9，禁止回写/触碰**。接手先看 `git status`、worktree 列表、task-ledger.json、features.registry.json 与本文件顶部，不从下方历史段落推断"当前"。
- 功能：FEAT-020 长期记忆由 PROTOTYPE→PARTIAL（真实用户级本地记忆，**本机共享版**）。记忆模块 `src/features/memory/`、设置页 `MemorySettingsSection.tsx`、对话接入 `agentConnection.ts`（assistant 采集 + user 采集 + 发送前 `[长期记忆]` 注入，执行器零修改）、Tauri `memory_read/memory_write/memory_reset_identity`（共享路径 `~/.kk-memory/memory.json` + 旧文件种子迁移）。
- 共享语义（TASK-MEMORY-002，用户拍板覆盖 001 隔离语义）：本机默认共享（无身份键），Codex/豆包/WorkBuddy 读写同一共享文件；Web 优先 File System Access 授权目录、未授权降级 IndexedDB 并明示；换账号/换人时用户手动清空或重置；**Agent 契约 `docs/MEMORY-CONTRACT.md`（豆包侧=Doubao Work 环境中的 Agent 按契约读取/写入）**。
- 隐私硬边界（用户约束，务必保持）：记忆仅本地（共享文件/降级 IndexedDB）；**绝不进 WebDAV 同步（FEAT-019）、localStorage（仅 `kk.memory.settings` 布尔）、日志、导出包**；真实账号 id 绑定依赖 FEAT-017（边界已如实标注）。
- 验证现状：Node 单测 404/404（记忆 34 例）、typecheck、lint（eslint/governance 63·0/features 29·0/markdown 82·0）、ui:check 160·0、format、Rust cargo test 84/84（含共享路径/种子迁移）全过；Playwright 303+1 已知 flaky 无失败；change pack `docs/changes/2026-09-24-local-memory/{intent,spec,plan,verification,review}.md`；账本 TASK-MEMORY-001/002 均 DONE/PASS。
- 待办（若继续）：worktree 内已改未提交（共享版追加提交）；commit 后（分支已 push）在 GitHub 开 PR（PR body 需含 spec/验收/风险/base-head SHA）；真实 Codex 会话记忆引用、Web FSA 授权流、Desktop 打包运行态为外部人工验收项。
- 记忆模块 ESM 约束（改动时注意）：单测直接跑 TS，内部 import 必须带 `.ts` 扩展名，纯类型必须 `type` 修饰；`cargo check` 前需先 `npm run build` 生成 dist。

## 2026-09-23 当前恢复入口：2.1.0 主线与规则审计

- 唯一工程为 `D:/kk-studio/KK-Studio-2.0`；先 fetch 并核对实际 HEAD、`git status`、worktree、账本和本文件，不从下方历史段落推断“当前”。2.1.0 源码先由 [PR #9](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/9) 合入 `b45c5bc7`，规则与 Markdown 审计再由 [PR #11](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/11) 合入 `origin/main@9f04bfced49224e9cd523844a8e3c995119c7955`；本地根 `main` 已快进至同一 SHA。
- PR #9 的当前候选 `verify`/`delivery` 已通过，合并后的 main 工作流 [35836597858](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/35836597858) 最终 success（push 的 delivery 按条件 skipped，verify 成功）。三套远端 ruleset 已 active，main 有效规则含 PR/必需检查/禁删除和非快进；用户确认仓库公开。正式 tag、安装包、签名及用户发布验收未完成。
- 旧 [PR #8](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/8) 已被 #9 吸收并关闭；旧堆叠 [PR #10](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/10) 的四个任务提交由 #11 从新 main 完整承接，#11 已合并，#10 已关联关闭。合并树、独立审查、当前 head 的 hosted PR/push 检查及合并后 [main 工作流](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/35841965161) 均已核对成功；不要批量清理旧分支，逐项核对 PR/head 和 dirty worktree。
- 最新任务状态以 [task-ledger.json](task-ledger.json) 为准；能力状态以 [功能登记](../features/features.registry.json) 为准。下方各日期段落是当时的验证快照，不覆盖此入口。

## 2026-09-23 Agent 图片与画布控制（TASK-AGENT-003，DONE/PASS，未提交）

已复用 infinite-canvas Agent 附件/localImage 与画布工具协议，接入 KK 本地原件、显式画布引用和真实控件。最多6张/单张8 MiB，导入失败阻止提交，Agent/API草稿按项目隔离；MCP支持单/多/空选择和视口移动缩放及恢复。保留 UI008 的 Design System 1.3 共享输入框。本轮未发送Agent草稿只在页面会话中保留，不承诺刷新恢复。

原工程完整verify 363 Node/299 browser全过，UI159/0、57任务/29功能0违规；26文件独立dirty预检PASS，R1–R3关闭。新Tauri release的实际JS/CSS与dist一致，真实Codex识别两张原件且发送哈希一致，随包MCP与视口重开恢复通过。58个范围内文件回写时2,277个非本轮文件保持原样；最终生成证据恢复/保留情况见本轮evidence/preservation.json。未commit/push。

旧Agent源码快照522输入重新比对，494未变、28为此前UI008或本轮有记录的差异；其中66个原生/Agent后端/打包输入零漂移。旧EXE和测试数字保留历史含义，新资源以本轮验证为准。TASK-AGENT-002、FEAT-009/012仍PARTIAL；参考图编辑、站内工具、TTS/视频、其他产品适配、通用MCP、付费Provider与正式发布继续按清单办理。当前清单与证据：docs/changes/2026-09-23-agent-attachments/remaining.md、verification.md。

## 2026-09-23 创作输入框规则与实现（TASK-UI-008，DONE/PASS，未提交）

Design System更新为1.3，先补输入结构、字体、图标与命中区、单一焦点和三档分行契约。首页/API/Agent共用ComposerTextarea与composer.css；文字自增长、附件/型号参数进入流布局，宽首页一排、手机首页和触屏对话按功能两排。修复首页发现区重叠、菜单遮住第二排按钮、短桌面发送不可达和菜单滚动回顶。

原工程完整verify为356 Node/295 browser，UI159/0、56任务/29功能0违规；独立R1–R3和断点补审PASS。带现有已校验Agent资源的新Tauri，实际JS/CSS与Web/dist一致，32组首页/对话主题检查及原生交互通过。受审任务增量已回传，测试生成旧证据恢复，无关文件与并发任务保留。验证与三档截图：docs/changes/2026-09-23-input-contract/verification.md。

真实手机/平板软键盘、用户视觉确认、在线Ardot写回以及真实Provider/其他Agent/云服务继续保留各自验收边界；本批不改变服务能力状态。原工程为当前运行来源，未commit/push。

## 2026-09-23 三档响应式与图标对齐（TASK-UI-007，DONE/PASS，未提交）

Design System更新为1.2，先纠正旧手机常驻轨道、平板窄条对话和桌面整页缩小规则。手机全宽/底部导航、平板72px轨道/400px对话、桌面291/70px轨道/470px对话已落实；图标居中、明确分行、设置与新增页面统一适配。修复短高侧栏重叠、隐藏焦点、跨断点嵌套菜单和短屏发送裁切，保留草稿与原有世界坐标。

已保留并发TASK-AGENT-002回传，只同步UI增量。最新原工程356 Node/286 browser全通过，UI157/0、55任务/29功能0违规；独立R1–R3补审PASS。带Agent资源的新Tauri实际JS/CSS匹配dist，16组合与原生交互通过。相关命令、首次失败、缓存重建和遗留配置测试污染修复均如实记录在docs/changes/2026-09-22-responsive-ui/verification.md。

手机/平板目前是浏览器适配证据，缺少移动Figma Frame、真实设备软键盘和用户视觉确认；在线Ardot回读、真实Provider/其他Agent/TaskHost/ComfyUI等继续按各自清单验收。原工程为最新运行来源，UI隔离worktree保留起始候选用于diff追溯。

## 2026-09-22 Desktop Agent 托管与旧记录复核（TASK-AGENT-002，PARTIAL）

Windows Agent 托管子项完成：设置支持随包启动/连接、健康状态、停止和退出回收；Node/Agent/Codex 不依赖全局 PATH 或开发源码。使用随机 loopback 端口、内存 Token、同数据目录单实例锁和 Windows Job Object。停止前原子关闭接单，正常停止等待旧进程退出；外部 Agent 不受影响。

当前候选验证：356 Node、270 browser、78 Rust，Agent126通过/2个POSIX权限测试在Windows跳过，lint/typecheck/format/UI/build通过。真实Tauri的8项检查与空会话7项检查通过，含真实Codex回复、随包MCP读画布、同线程重启/二次启动恢复、正常/强退回收12个自有进程。干净目录npm ci、356单测和production build通过。独立增量预检PASS，无未关闭P1/P2；不是正式PR审批。2026-09-23已回传原工程，并保留后续TASK-UI-007并发改动；组合版本复核356 Node/286 browser通过，最新原工程EXE重新完成真实8项与空会话7项Agent检查。522个源码输入复测前后无变化，2,062个已登记非本轮文件按并行更新后的复测前字节保留；详见本轮evidence/integration.json。

旧完成声明已按当前源码与产物核对：旧Agent源码清单与本轮起始树380/380相符；旧DS/UI截图和旧EXE只作为历史记录，新前端由当前Web回归与Tauri资源哈希重绑。无环境Token落盘、vendor源码被忽略导致干净交付缺失的问题已修复。未commit/push。

TASK-AGENT-002整体保持PARTIAL：Proxy托管、Google/Antigravity/豆包/WorkBuddy适配、后台网页并发、非兼容API逐家验收、音视频、Agent附件/参考编辑和通用第三方MCP仍在清单。真实付费Provider、完整TaskHost恢复与正式发布未由本轮替代。当前清单与验证：docs/changes/2026-09-22-agent-desktop/remaining.md、verification.md。

## 2026-09-22 默认 Codex 与统一模型入口（TASK-AGENT-001，PARTIAL）

KK 对话已通过本机官方 Codex app-server 使用现有 ChatGPT 登录：真实回复、画布 MCP、刷新恢复、账号模型和额度、内置生图归档均有 Web 运行证据。新增 dev:agent 启动器、分级/全部模型菜单、按 API 连接身份刷新模型与声明尺寸；主 Agent 可复用本项目图片/文本任务。代码保留 KK 自有 UI 与 vendor 隔离，未提交/推送。

完整验证、独立审查和使用方法见 docs/changes/2026-09-22-codex-default-agent/。首轮回归失败及修复一并记录；不用历史测试数字代替当前结果。Tauri 一键启停、Google/豆包/WorkBuddy 登录适配器、后台网页登录并发与非兼容协议列入 TASK-AGENT-002；真实付费 API 逐厂商和 Desktop 同态验收仍未完成。不要把可见菜单描述为这些适配器已可用。

补充验收：连续两轮真实 Codex 共享线程且刷新无重复；模型末尾分辨率/质量作为参数映射精确型号 ID；顶部支持厂商/模型/尺寸/比例与有限拼写建议。原工程完整 verify 为 351 Node、266 browser 全通过，UI153/0、29功能/54任务0违规；独立重连竞态复核 PASS。原工程已回传并重跑真实连续对话/额度，开发入口1421正在运行，未验收Tauri本轮发布。

## 2026-09-22 折叠、弹层与画布显示（TASK-UI-006，DONE/PASS，未提交）

已修复12处有复现证据的UI缺陷：项目/生成/保存状态纳入HUD统一布局；20%点阵与网格保持可见；项目分组折叠保留会话状态，隐藏菜单正确清理；添加菜单、顶部菜单、任务列表与详情遵守重复点击/Escape/回焦；Modal拖出不误关；390px打开对话入口不再裁切。

原工程完整verify通过327 Node/261 browser，0失败/0flaky/0skipped；UI144/0，lint/typecheck/format/build通过。独立23文件预检PASS；fresh Tauri release的实际JS/CSS与dist逐字节相符，16组合与原生开关/折叠/嵌套/拖出验证通过。只回传受审增量，保留其余dirty状态；测试生成的旧证据与schemas恢复到运行前字节。

完整证据见 `docs/changes/2026-09-22-ui-interactions/verification.md`。在线Ardot、缺失页面Frame、用户视觉验收以及真实Provider/CLI/GPU/MCP、TaskHost恢复、ComfyUI/TTS/平台服务与正式发布继续保持各自任务状态。本批不升级这些能力。

## 2026-09-22 新增功能 UI 接线（TASK-UI-005，DONE/PASS，未提交）

本轮按用户要求优先检查 UI 与真实功能的对应关系，核对 29 项功能。已补图片/本地 Agent 双通道、首次会话准备与 warning/错误/审批状态、画布插件管理入口、提示词库浏览与应用、文本方式实际改写输入，以及音频演示和 Web/Desktop 平台说明。

独立审查发现的真实 SSE/hello、warning、迟到审批、重连操作锁与并发会话准备问题已修正。会话准备采用独立受版本校验的接口，旧服务明确返回不支持；agent:build 安装受版本控制的局部集成，避免改动既有 threads/new 语义。最终独立复核PASS；原工程完整verify327 Node/241 browser、UI142/0通过。新Tauri实际资源校验、16组合与两次启动验证通过。TASK-UI-005已关闭；用户追加的折叠/弹窗/重叠/点阵缩放交互由下一任务继续。

UI 范围及证据见 `docs/changes/2026-09-22-ui-feature-parity/verification.md`；剩余事项继续由 `docs/changes/2026-09-22-design-system/remaining.md` 与账本管理。真实 CLI/Provider、TTS/ComfyUI/WebDAV 完整产品链、在线 Ardot 和用户视觉验收未被本批替代。

## 2026-09-22 Design System逐页迁移（TASK-DS-002，DONE/PASS，未提交）

项目库、Skills、ComfyUI目录、Skill编辑器和设置分区已按1.1共享规范迁移，补浅色侧栏SVG辨识、长分类换行与清晰选中边界。保留既有Landing/Workspace几何和业务边界。独立预检发现的两项P2已修复并复核PASS；菜单End回归改为核对并发加载后的实际末项，不再假设SVG固定最后。

原工程完整verify为309 Node/229 browser，0失败/0flaky；UI137/0、lint/typecheck/format/build通过。原工程新Tauri release实际JS/CSS字节校验、16种主题/强调色与两次启动复验通过，偏好和本地Skill记录保留。只回传本任务增量，未commit/push。

TASK-DS-001/UI-001/UI-004保持PARTIAL，在线Ardot、缺失Frame与用户视觉验收继续保留；T5任务恢复/health、T6执行、真实服务与发布未被本次UI证据关闭。详见 `docs/changes/2026-09-22-design-system-pages/verification.md` 与 `docs/changes/2026-09-22-design-system/remaining.md`。下一优先项为T5完整进程恢复与health回写。

## 2026-09-22 Design System校正（TASK-DS-001，未提交）

已按用户7页PDF完成Design System审计与v1.1校正，现行颜色/基础组件规范统一为 `docs/DESIGN-SYSTEM.md`；保留旧页面几何。公共控件、状态配对和双主题8色偏好已接入现有v1存储。完整verify307 Node/219 browser通过，独立dirty-diff预检PASS；随后修复设置插件破图并定向复验。已仅回传本任务增量到当前工程，保留并发Agent/插件业务；回传后309 Node、13项相关浏览器、lint/typecheck/format/UI/build全部通过。

TASK-DS-001、UI-001、UI-004保持PARTIAL：在线Ardot未写入，新样式Tauri运行与全页面视觉验收仍待完成。详细命令、文件指纹和当前工程回传结果见 `docs/changes/2026-09-22-design-system/verification.md`，剩余事项见同目录 `remaining.md`。未commit/push。

## 2026-09-22 文本任务与规则审计（当前，未提交）

本轮外部 worktree feature-guards/backend-text-native 仅保留早期候选，最终修复已在唯一工程汇总。不得直接用早期候选覆盖当前目录；相关只读审查已结束。继续按下面当前状态和 source-manifest.json 核对。

- 唯一工程仍为 D:/kk-studio/KK-Studio-2.0，分支 chore/TASK-CONSOLIDATE-200，HEAD cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 + 未提交工作区。遵从用户要求，未 commit/push。
- TASK-RULES-003 DONE/PASS：精确卡片状态、真正开放任务、REAL非空代码/测试/入口与DONE/PASS任务、分平台运行证据、仓库内路径与异常字段门禁已修复；README/TASK_LEDGER是生成视图，功能卡可维护。现有28功能、48任务，门禁0违规。
- BACKEND-TEXT-NODE / FEAT-008 PARTIAL：Web SSE与原生TaskHost已实现；输入4,000字、输出32 KiB，完整终止才成功，未知受理不能普通重试。修复长文案保存、用户编辑被恢复覆盖、来源删除后迟到提交、原生并发占用重载泄漏及错误事件假成功。
- 完整npm verify：227 Node、210 Playwright/Edge、0失败/0flaky；lint/typecheck/format/ui129/0/build通过。Rust74/74、fmt/check、Tauri no-bundle build通过。development1421、preview1423、Tauri release各有证据，Desktop加载index-C7-jQxHk.js。独立dirty-diff预检PASS，不能当正式PR审批。
- 勘误：FEAT-003/005/009/026缺相应证据或旧能力描述不实，保持PARTIAL；旧“FEAT-003 REAL”和“多轮chat已接入前端”不能继续沿用。已登记BACKEND-CONVERSATION；视频/音频仍为演示。
- 剩余：真实付费Provider、完整T5进程退出/恢复及原生health回写、ComfyUI/MCP/平台服务、Hosted CI/正式PR/发布未以fixture代替。证据与审查见[本轮verification](../changes/2026-09-21-text-and-rule-audit/verification.md)及[review](../changes/2026-09-21-text-and-rule-audit/review.md)。

## 2026-09-21 2.0.0 定版 + 功能体系恢复点（历史）

- 唯一工程 `D:/kk-studio/KK-Studio-2.0`，分支 `chore/TASK-CONSOLIDATE-200`，HEAD `cf344dd` 加一批**未提交**改动（用户明令不 commit/push）。接手先 `git status` 看未提交清单，不要 reset/clean。
- 先读 AGENTS.md → AI_RULES.md → PROJECT_STATE.md → `docs/features/README.md`（28 功能状态看板）→ `docs/governance/TASK_LEDGER.md`（45 任务）。功能卡 `docs/features/feat-*.md` 是每个功能的定位入口；新增功能流程：复制 `_feature-template.md` 建卡 → 在 `features.registry.json` 登记 → 在 task-ledger.json 建任务 → 实现 → `npm run features:write` + `npm run governance:write` 刷新看板。
- 本轮完成 FEATURE-SYSTEM（功能卡/登记册/门禁/四波后端化路线）与 BACKEND-IMAGE-PARAMS（FEAT-003 图片比例/清晰度真实透传，PROTOTYPE→REAL 样板）；下一波按 `docs/features/BACKEND-ROADMAP.md` Wave 1：文本节点接 chat_completion → ComfyUI T6 → MCP 自动调用 → 视频/音频 provider 抽象 → 连接器。
- 门禁：`npm run features:check`、`npm run governance:check` 已并入 `npm run lint` 和 `verify`；看板文件（features/README.md、TASK_LEDGER.md）禁止手改。Rust 测试命令是 `cargo test --manifest-path src-tauri/Cargo.toml --bin kk-studio`（该 crate 无 lib target）。
- 最新验证（2026-09-21）：Node 212/212、Playwright/Edge 200/200、Rust 65/65、typecheck/lint/format/ui:check（129 文件 0 违规）/build 全过；账本 46 任务、功能 28 项门禁 0 违规；证据 `docs/changes/2026-09-21-feature-system/verification.md`。真实付费 Provider、ComfyUI、Tauri 实机 HTTP 仍属外部验收。

## 2026-09-21 TASK-MAIN-CLOSE-002 当前恢复点

- 从 `origin/main=3c4d012846e53095bd4f11343a1cd2ef61aa3bbd` 回读后，当前候选是 `bb96dadc08c12a2177481d2ae1e4dda605cc77d4`，位于 `codex/TASK-MAIN-CLOSE-002`；不要把候选直接推入或快进稳定 main。
- 生产代码候选 `bb96dadc08c12a2177481d2ae1e4dda605cc77d4` 的本地完整 verify 为 172 Node、197 browser、UI121/0、0 failure/flaky；Rust 61/61、fmt、client check 通过。固定证据为 `docs/evidence/2026-09-21-main-close-002/verify-run.json`，三模式 runtime 报告仍明确产品运行代码源为 8369185。
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

## 2026-10-03 早期审计交接点（历史快照）

- 接手入口：先读 `AGENTS.md`、`AI_RULES.md`、本段、`docs/governance/TASK_LEDGER.md`，再核对 `git -C D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003 status`。本轮分支为 `codex/TASK-AUDIT-20261003`，不要把工作树直接快进稳定 main。
- 早期快照中的任务台账为 94 项：DONE 53、PARTIAL 27、TODO 10、BLOCKED 4；当前台账以本文件顶部和 `docs/governance/task-ledger.json` 为准。
- 已生成的早期证据包：`docs/changes/2026-10-03-task-audit/{intent,spec,plan,verification,review}.md`；不要用历史 verify 数字替代当前 `docs/changes/2026-10-03-incomplete-tasks/verification.md` 的收据。
- 下一步按优先级处理：P0 数据保留/冲突回归；P1 真实 MCP 端点和编排器真实执行；P2 T5 TaskHost 原生恢复、T6 ComfyUI、T7 安装恢复及其余平台/发布外部验收。真实凭据、GPU、VPS 或 Mobile 缺失时，保持台账状态并记录阻塞原因。
