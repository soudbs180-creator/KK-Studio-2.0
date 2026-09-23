# 当前项目状态

## 2026-09-23 KK Studio 2.1.0 源码上传候选（REL-2.1.0）

当前版本元数据已统一为 2.1.0；源码候选已在 `chore/TASK-CONSOLIDATE-200` 上提交，安全补审后准备推送。`VERSION`、`CHANGELOG.md`、package/npm lock、Tauri/Cargo、应用显示、插件运行时和 MCP 客户端共同记录 2.1.0；原有 `%APPDATA%/kk-studio`、存储 key、应用 identifier、历史 2.0.0 证据和恢复归档不变。安装包、签名、Hosted CI、PR/main 合并和不可变正式 tag 未在本地源码上传中虚构完成。

独立预检发现远程 HTTP 插件执行风险，加载器已改为仅接收 HTTPS、拒绝降级响应并停用旧版明文缓存；本地回归通过，最终 SHA 的补审待完成。Desktop 插件因严格 CSP 阻止 `blob:` 模块而尚未验收，开放任务 PLUGIN-DESKTOP-001；本次源码上传不宣称桌面插件已可用。

本轮真实提交、远端分支和检查结果以 `docs/changes/2026-09-23-release-2-1-0/{verification,release,review}.md` 以及 Git 回读为准。

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

- 唯一工程仍为 D:/kk-studio/KK-Studio-2.0，分支 chore/TASK-CONSOLIDATE-200，HEAD cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 + 未提交工作区。遵从用户要求，未 commit/push。
- TASK-RULES-003 DONE/PASS：精确卡片状态、真正开放任务、REAL非空代码/测试/入口与DONE/PASS任务、分平台运行证据、仓库内路径与异常字段门禁已修复；README/TASK_LEDGER是生成视图，功能卡可维护。现有28功能、48任务，门禁0违规。
- BACKEND-TEXT-NODE / FEAT-008 PARTIAL：Web SSE与原生TaskHost已实现；输入4,000字、输出32 KiB，完整终止才成功，未知受理不能普通重试。修复长文案保存、用户编辑被恢复覆盖、来源删除后迟到提交、原生并发占用重载泄漏及错误事件假成功。
- 完整npm verify：227 Node、210 Playwright/Edge、0失败/0flaky；lint/typecheck/format/ui129/0/build通过。Rust74/74、fmt/check、Tauri no-bundle build通过。development1421、preview1423、Tauri release各有证据，Desktop加载index-C7-jQxHk.js。独立dirty-diff预检PASS，不能当正式PR审批。
- 勘误：FEAT-003/005/009/026缺相应证据或旧能力描述不实，保持PARTIAL；旧“FEAT-003 REAL”和“多轮chat已接入前端”不能继续沿用。已登记BACKEND-CONVERSATION；视频/音频仍为演示。
- 剩余：真实付费Provider、完整T5进程退出/恢复及原生health回写、ComfyUI/MCP/平台服务、Hosted CI/正式PR/发布未以fixture代替。证据与审查见[本轮verification](../changes/2026-09-21-text-and-rule-audit/verification.md)及[review](../changes/2026-09-21-text-and-rule-audit/review.md)。

## 2026-09-21 文件夹定版与功能体系（历史快照，状态以2026-09-22勘误为准）

- 唯一工程为 `D:/kk-studio/KK-Studio-2.0`（基线版本 2.0.0）；`kk-studio-next`、旧 archive/backup、.tmp/.worktrees/dist 已收敛删除，工程外恢复归档 `D:/KK-Studio-recovery-20260921` 只读保留。当前分支 `chore/TASK-CONSOLIDATE-200`（HEAD `cf344dd` + 未提交改动），**用户要求不 commit/push**。
- 功能真实程度的权威入口是 `docs/features/features.registry.json` 与 28 张功能卡，看板 `docs/features/README.md` 由 `npm run features:write` 生成；演示后端化顺序见 `docs/features/BACKEND-ROADMAP.md`（四波）。任务权威仍是 `docs/governance/task-ledger.json`（46 任务），看板由 `npm run governance:write` 生成。两个门禁均已并入 `npm run lint`/`verify`。
- FEAT-003 图片参数已从 PROTOTYPE 升为 REAL：比例/清晰度真实透传到 Web 与 Desktop（Rust）请求；FEATURE-SYSTEM、BACKEND-IMAGE-PARAMS、UI-SKILL-POPOVER-001 三条任务 DONE/PASS，证据 `docs/changes/2026-09-21-feature-system/verification.md`。
- 当前验证：features 28/0、governance 46/0、typecheck、lint、format、ui:check（129 文件）、build 通过；Node 单测 212/212、Playwright/Edge 200/200、Rust `--bin kk-studio` 65/65。真实付费 Provider、ComfyUI、Tauri 实机 HTTP、平台服务仍按功能卡与账本保持外部验收边界。
- 新 AI 接手顺序：AGENTS.md → AI_RULES.md → 本文件 → `docs/features/README.md`（功能现状）→ task-ledger.json（任务现状）→ git status。

## 2026-09-21 TASK-MAIN-CLOSE-002 当前候选

- 当前整合候选为 `bb96dadc08c12a2177481d2ae1e4dda605cc77d4`，其基线是已回读的 `origin/main=3c4d012846e53095bd4f11343a1cd2ef61aa3bbd`（PR #7 governance closeout）。候选尚未合入稳定 main。
- 当前候选本地完整 verify 由 2026-09-21 09:30:14（Asia/Shanghai）后的日志记录为 172 Node、197 browser、UI121/0、0 failure/flaky；Rust 61/61、fmt、client check 通过。三模式 runtime 产品代码证据仍绑定 8369185，后续仅有测试、治理和文档变更。
- PR #8 的 delivery 曾成功，但 hosted verify 因 GitHub 账号付款失败或 spending limit 未启动；TASK-MAIN-CLOSE-002 保持 IN_PROGRESS。UI-004、PERF-001、T5、Astra 迁移和远端服务器保护仍按账本保持 PARTIAL/BLOCKED。

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
