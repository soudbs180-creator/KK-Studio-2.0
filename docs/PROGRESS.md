# 当前进度

## 2026-09-24 编排计划重复工作项 ID 边界

PR #14 的 `67ff18fb` 独立复审确认旧计划覆写与项目包漏同步两项 P1 已关闭，但发现重复工作项 ID 可让单项更新误改已成功项。候选已在 TS 与 Rust 项目包中拒绝计划内重复 ID；失败先行和 409 Node / 81 Rust / 300 浏览器本地回归见[验证记录](changes/2026-09-23-agent-orchestration/verification.md)。新 head 独立复审与 Hosted CI 仍待完成；当前 PR 不可合并。

## 2026-09-24 Agent 编排独立审查阻断修复

独立审查在 PR #14 旧 head 发现：公开写入口可用旧计划覆盖已审批进度；Desktop 项目包拒绝 normalize 后新增的 `stagePlans` 字段，Web/Rust 包还遗漏计划工作项唯一引用的素材。当前候选已加入预期 revision 工作项更新、删除公开覆写入口、同步项目包 schema 与素材收集；407 Node、80 Rust 与 300 浏览器测试及类型/Lint/构建/治理通过。修复后新 head 的 Hosted CI、独立复审和 Desktop GUI 尚未验收，PR #14 仍不可合并；详细证据见 [验证记录](changes/2026-09-23-agent-orchestration/verification.md)。

## 2026-09-24 Agent 阶段审批边界

`TASK-ORCH-001` 候选新增失败先行测试，确认 Agent 的计划状态工具原可直接批准计划/结果并解除阻断。工具现只允许从执行中发起审批或阻断；宿主审批与重试入口保留决策权。当前代码重跑 405 Node、300 浏览器回归及类型/Lint/格式/构建/治理门禁均通过；最终独立复审、Desktop 与真实 Provider 未验收，候选继续保持 PARTIAL。

## 2026-09-24 编排计划持久化边界修正

独立预检在 `TASK-ORCH-001` 候选发现两项问题：同 id 计划重放会清空已完成阶段与素材引用；不完整的 `plan_patch_stage` 输入会先报成功、重载时再丢失。现已改为同定义重放保留进度、不同定义拒绝覆盖，并在写入前校验输入与存储 schema。定向测试先失败后通过，完整本地检查与未完成的独立复审状态见 `docs/changes/2026-09-23-agent-orchestration/verification.md`、`review.md`。领域能力仍为 PARTIAL，不代表 UI、真实 Provider 或发布验收。

## 2026-09-23 编排候选重试边界补充

竞品规划复核发现 `TASK-ORCH-001` 候选中的新任务态辅助函数与现有恢复门禁冲突：原函数对 `unknown`/已提交任务禁止普通重试，新函数却允许并选入 `unknown` 输出。现已复用原有 `taskRecovery.canRetryTask`，失败子项仅选确定失败的输出；先失败后通过的定向测试 12/12、全量 Node 单测 399/399、TypeScript 检查通过。候选仍为 PARTIAL，UI/真实 Provider 与 Desktop 运行验收未因此完成；细节见 `docs/changes/2026-09-23-agent-orchestration/verification.md` 的补充勘误。

## 2026-09-23 波次A 竞品对齐：Agent 编排与画布交付契约（分支已推送）

- 按《KK-Studio-竞品对齐-项目规划》波次 A 落地领域层：对标竞品 MiniMax Design media-agent 的 Stage 状态机、canvas 交付契约与统一任务态。
- 新增 `src/domain/stagePlan.ts`（doing/plan_review/blocked/result_review/done 五态 + CAS 乐观锁 + 非法迁移拦截 + 审批门推导 + 失败项 requeue + normalize 白名单 + zod）、`src/features/creation/taskState.ts`（9 态统一任务态契约/可重试/失败输出子集/成本估算）、`src/features/agent/orchestrator.ts`（编排器物化/审批决策/阻断/失败重试 + plan 工具面四工具，MCP 注册归 BACKEND-MCP-AUTO）。
- 修改 `src/features/creation/model.ts`（CreationProject.stagePlans 可选字段，兼容旧快照）、`src/features/agent/agentCanvas.ts`（交付契约：无 node_id/未注册资产即拦截 + 当轮产物收集/摘要）、`src/features/agent/agentHost.ts`（可选注入 orchestrator）。
- 验证：`npm run verify` 全绿——lint（eslint 0 + governance 66 任务 0 违规 + features 31 功能 0 违规 + markdown 83 文件 0 违规）、typecheck、399 Node 单测（新增 40 项）、ui:check（159 文件 0 违规）、format:check、300 浏览器测试；delivery:check 待本文件更新后复核。
- 治理：功能卡 feat-030/031（PARTIAL）、registry +2、账本 +5（TASK-ORCH-001 IN_PROGRESS 唯一活动任务，TASK-ORCH-002/003 TODO，TASK-CANVAS-001/TASK-TASKSTATE-001 PARTIAL）、交付包五件套 `docs/changes/2026-09-23-agent-orchestration/`。
- 分支 `feat/TASK-ORCH-001-agent-orchestration-closure` @ `D:/kk-studio/.worktrees/TASK-ORCH-001` 已推送 origin（commit 1863ea8，base origin/main @ 9f04bfc）。能力按 PARTIAL 标注，不冒充 REAL。
- 后续：TaskWorkbench 阶段计划视图与审批交互（TASK-ORCH-002）、编排器驱动真实生成（TASK-ORCH-003）、plan 工具 MCP 注册（BACKEND-MCP-AUTO）、媒体真实链路（BACKEND-MEDIA-001）。

## 2026-09-23 2.1.0 源码并线与远端规则回读

- [PR #9](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/9) 的 head `da811283` 在 hosted `verify`/`delivery` 通过后 squash 合入 `main@b45c5bc7`；旧 PR #8 的提交是 #9 候选的祖先，内容被吸收，PR #8 已关闭而未重复合并。[PR #11](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/11) 再将规则与 Markdown 审计 squash 合入 `main@9f04bfce`；两次合并的文件树均与各自受审候选相同，本地根 `main` 已快进至后者。
- 用户确认仓库公开；三套远端 ruleset 已 active，`main` 有效规则含 PR、必需检查、禁删除和非快进。#9、#11 合并后的 `main` 工作流均最终 success（#11：[35841965161](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/35841965161)）。正式 2.1.0 tag、安装包、签名和用户发布验收未完成，Desktop 插件问题仍在 PLUGIN-DESKTOP-001。
- TASK-RULES-004 从 #9 合并后的 main 仅承接原堆叠 PR #10 的四个任务提交，文件树与旧 head 一致。完整本地 verify 为 370 Node、300 browser 全通过，最终 `dfed074` 的独立 AI 复审和 hosted PR/push 检查均 PASS；#11 已合并，#10 已关联关闭而未重复合并。旧分支及其它 dirty worktree 保留；具体分支分类见[承接验证](changes/2026-09-23-rules-audit-main/verification.md)。

## 2026-09-23 规则与 Markdown 审计（原堆叠 PR 阶段快照）

在 2.1.0 候选 `da811283e55ce699e4c5425d92ad31ffba7513e3` 上核对了共同规则入口、账本、PR/CI、本地 Git 防线、现行 Markdown 链接与历史证据边界。现行文档中的设计来源、已知问题、版本交接、分支清理和交付文件数已按当前事实整理；现行 Markdown 相对文件链接加入本地 lint 检查。结构检查不能证明模型读懂规则，PR #9 的 hosted 检查仍因账号付款或 spending limit 在步骤前失败；main、tag、安装包及远端强制保护没有因此完成。具体差异、验证与独立复审见 `docs/changes/2026-09-23-rules-audit/`。

## 2026-09-23 KK Studio 2.1.0 源码分支已上传（REL-2.1.0，本地验证完成）

统一 package/npm lock、Tauri/Cargo、应用显示、插件运行时和 MCP 客户端版本为 2.1.0，新增 `VERSION` 与 `CHANGELOG.md`，并将当前已授权的功能与文档候选绑定到同一 Git 任务分支。用户数据存储 key、应用 identifier、历史 2.0.0 证据和恢复归档保持不变。安装包、代码签名、真实 Provider/ComfyUI、Hosted CI、PR 合并和正式 main tag 仍需单独门禁，不以本地源码上传代替。

独立预检发现远程 HTTP 插件可被替换并在应用权限下运行；已在加载器阻止明文/凭据/片段 URL、所有远程自动重定向（含 HTTPS→HTTP→HTTPS 中间跳转），以及旧版明文缓存重启执行，并向用户提示信任边界。独立补审在受审源码 `15f1f27` 范围内未发现未关闭 P0/P1。另确认 Desktop CSP 阻止当前插件 `blob:` 模块，登记 PLUGIN-DESKTOP-001；Web 插件验证不代表桌面可用。

验证与远端 SHA 见 `docs/changes/2026-09-23-release-2-1-0/verification.md` 和 `release.md`。

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
- 剩余：真实付费Provider、完整T5进程退出/恢复及原生health回写、ComfyUI/MCP/平台服务、Hosted CI/正式PR/发布未以fixture代替。证据与审查见[本轮verification](changes/2026-09-21-text-and-rule-audit/verification.md)及[review](changes/2026-09-21-text-and-rule-audit/review.md)。

## 2026-09-21 功能登记体系建立与图片参数后端化样板（IMPLEMENTED，未提交）

- 任务 FEATURE-SYSTEM：新增 `docs/features/` 功能体系——28 张功能卡（`feat-001~028`，固定五段结构）、机器可读权威 `features.registry.json`、脚本生成看板 `README.md`、卡片模板 `_feature-template.md`、演示后端化四波路线 `BACKEND-ROADMAP.md`；功能状态 REAL/PARTIAL/PROTOTYPE/PLANNED 与任务状态正交。门禁 `npm run features:check`（卡片章节、代码/测试路径、账本任务、非 REAL 挂开放任务、磁盘卡片登记、看板一致性）已并入 `lint`/`verify`。AGENTS.md、AI_RULES.md、SPEC_BASELINE.md 同步新功能流程与状态口径；账本新增 8 个任务（共 46）。
- 附带修复 UI-SKILL-POPOVER-001：内置 Skill 合入后首页弹层在 ≤620px 遮挡创作提示词且一条浏览器断言仍按旧空态；已改为窄屏弹层在底栏下方展开并更新断言。
- 任务 BACKEND-IMAGE-PARAMS（FEAT-003 PROTOTYPE→REAL 样板）：图片比例/清晰度经唯一纯函数 `src/domain/imageParameters.ts` 映射为真实像素尺寸，Web（`generateImages` JSON/multipart）与 Desktop（Tauri IPC → Rust `task_host.rs` JSON/multipart）两条请求链路均条件透传 `size`，自适应不传；Rust 增加尺寸形状校验；视频参数明确标注尚未接入。
- 验证：`features:check` 28 功能 0 违规、`governance:check` 46 任务 0 违规、typecheck、lint（eslint+两门禁）、format、ui:check（129 文件 0 违规）、build 通过；Node 单测 212/212（新增图片参数 7、功能登记册 4）、Playwright/Edge 浏览器回归 200/200、Rust `--bin kk-studio` 65/65（含新增尺寸校验测试）。真实付费出图与 Tauri 实机 HTTP 仍属外部验收（EXT-PROVIDER/T5）。证据见 `docs/changes/2026-09-21-feature-system/`。全程未 commit/push。

## 2026-09-21 MiniMax Design 深度交互审计与本地能力复刻（PARTIAL）

- 只读操作了本机 MiniMax Design `current` 安装，覆盖项目库、开始创作、Skills、连接器、ComfyUI、设置、文件/窗口/帮助菜单及关键弹窗；未点击会员生成、未下载 40GB 工作流、未登录、未上传日志、未安装第三方连接器。
- 候选分支 `codex/feat/minimax-deep-replica-root` 增加本地 Skill registry/UI：搜索、分类、导入 JSON/裸 `SKILL.md`、创建/编辑、启用/禁用、卸载、应用到创作草稿；应用壳首次打开即准备内置 Skill，补充 2MiB 文件上限、4,000 字指令上限、损坏持久化告警、Escape 与焦点恢复。MiniMax 的 zip 导入契约已审计，记录为下一步有界实现。
- 增加连接器目录原型和 Blender 等目录项；详情、关闭、Escape、跳转 MCP 设置可操作，安装按钮保持 disabled 并写明 Prototype/未接入；MCP Streamable HTTP 增加分页、响应体上限、连接失败清理、组件卸载清理和损坏配置保护。
- Web 开发运行时固定 `http://127.0.0.1:1421/` 完成同状态 DOM/交互证据；Tauri release、真实云端 provider、付费生成和真实第三方连接器仍未验证，任务账本为 `TASK-MINIMAX-001=PARTIAL`。详见 `docs/changes/2026-09-21-minimax-deep-audit/`。

## 2026-09-21 安全审计风险收口（IMPLEMENTED / 1421 外部进程占用）

- `TASK-AUDIT-SEC-001-CLOSEOUT` 在 `fix/TASK-AUDIT-SEC-001-boundaries` 完成三项剩余修复：Web Locks 长生命周期连接租约与崩溃元数据重建；Gateway 初始额度 provisioning 记录、额度漂移 fail closed 和并发策略更新；TaskHost 结果 URL 同源、HTTPS/loopback、DNS/IP pinning、取消窗口和 IPv6 边界。
- 验证：178/178 Node 单测、TypeScript、lint、format、UI119/0、Rust63/63、fmt/check、production build、production preview 191/191 和隔离 Tauri WebView2 均通过；closeout 五份变更记录见 `docs/changes/2026-09-21-security-audit-closeout/`。
- 固定 development 端口 1421 被另一工作树的 Vite 进程占用，未终止并未把该进程结果归给本分支；除此之外的最终 head 证据已记录。
## 2026-09-21 安全边界与异常任务状态审计（PARTIAL）

- `TASK-AUDIT-SEC-001` 在独立 worktree `fix/TASK-AUDIT-SEC-001-boundaries` 完成一轮证据驱动审计。已修复：Provider 请求发出后取消/暂停的 unknown fencing、远程明文 HTTP API Key 外泄、Gateway 重启旧配置/ACL 静默保留、token collision 权限覆盖、TaskHost 无长度响应全量缓冲，以及 journal delete-first 丢失窗口。
- 验证：155/155 Node、TypeScript、lint、format、production build、Rust 61/61 与 fmt 通过。证据见 [security audit](changes/2026-09-21-security-audit/verification.md)。
- 仍为 PARTIAL：Web 跨窗口 localStorage 租约竞态/崩溃孤儿槽、Gateway `initialCredits` 配置陈旧，以及 TaskHost Provider 结果 URL 的 origin allowlist/DNS pinning 尚未收口；不能把本轮修复描述为完整提交并发或 SSRF 防护。

## 2026-09-21 未完成子任务汇总验收（整合候选）

- TASK-MAIN-CLOSE-002 已在独立 worktree 汇入 Figma 收口、素材元数据分页/按需预览与动画回归稳定性修复。当前候选 `bb96dadc08c12a2177481d2ae1e4dda605cc77d4` 的本地完整 `npm run verify` 为 172 Node、197 browser、UI121/0、0 failure/flaky；Rust 61/61、fmt、Tauri client build 通过。
- dev1421、preview1423、Tauri release 均用当前候选重新启动并通过同状态交互检查：四个工作台菜单切换不改变按钮矩形，Escape/外部点击关闭并恢复焦点，窄屏账号弹层关闭优先级通过。素材专项 7/7 验证 40 项元数据页、320px WebP、41 项 fixture 详情 SHA 和错误/重试边界。
- 证据：`docs/changes/2026-09-20-main-close-002/`、`docs/evidence/2026-09-21-main-close-002/`。当前候选尚未合并；TASK-MAIN-CLOSE-002 等待最新 main 合并、PR/CI 和主线回读。
- UI-004 保持 PARTIAL（Landing/部分页面缺少当前 Figma Frame）；PERF-001 保持 PARTIAL（永久缩略图、大快照和单件大图 IO/峰值未完成）。Astra 仍为迁移计划，不在本轮实施。

## 2026-09-20 Astra 迁移计划与分支规则复核

- TASK-ASTRA-001 从已验收的稳定 main 建立独立 task worktree，校正旧 checkout 初稿，复用已完成的 T3b/T4 与已集成的 T5，补齐项目包和 unknown 状态迁移验收。尚未实施 Astra 功能。
- 已检查 AGENTS、CONTRIBUTING、governance、SDLC/评审、ADR、PR 模板和 CI；不直接写 main，不推送历史任务分支，不合并原 dirty 工作区。
- 用户指定 https://github.com/soudbs180-creator/KK-Studio-2.0 为 2.0 远端；该仓库与本地历史不相干，阶段 0 文档分支 `docs/TASK-ASTRA-001-remote-manifest`（回读 `9edb528`）保留为历史审计；首次 2.0 树已通过 PR #1 合并。


## 2026-09-19 T5 原生 TaskHost 集成与未知受理保护（本地集成完成，运行态待收口）

- 创建任务会先将 `intent` 写入 Web IndexedDB 或 Desktop 快照，再进入供应商请求；提交前写入失败时不会发出 Provider 请求。请求开始后保留稳定的任务/幂等身份，重启恢复会区分尚未提交的 `interrupted` 与受理状态不明的 `unknown`。
- `unknown` 和已提交任务不进入普通重试；网络中断、刷新和浏览器关闭回归覆盖“不会盲目重复提交”，队列意图重试保留原任务身份。Rust 快照校验、Web 单元和浏览器回归已同步扩展。
- 集成 main 已合入 `87516e4`、`84cae7c`、`d894779`：Tauri 主进程内置持久 TaskHost，journal 写入 `tasks/native-host`，使用系统凭据库读取密钥，提交携带稳定 idempotency key；应用重启会把未决提交标为 `unknown`，不会自动重发；每个输出 slot 在素材归档后立即写回 journal。Desktop UI 按“持久 intent → 原生 IPC 提交 → IPC 轮询 → 原生素材归档”执行，不回退浏览器 Provider。
- 本地验证：`npm run verify`（150 unit、169 browser、UI119/0、lint/typecheck/format/build）以及 Rust 58/58、fmt/check、`npm run client:check`、`npm run client:build -- --no-bundle` 通过；T5 浏览器专项 5/5 通过。最新 bundle 为 `index-BmJ91wly.js`，Desktop release 已由该主线重新生成。
- T5 仍为 **PARTIAL**：尚未在隔离 Tauri/WebView 运行态用可控 Provider 完成提交、取消、进程重启和逐 slot 恢复的 IPC 证据，真实付费 Provider/GPU/ComfyUI 仍属外部验收；`deploy/` 只提供静态 Web Prototype 的可审阅 dry-run/原子切换脚本，不代表 VPS 已部署。

## 2026-09-18 T4 统一图片命令与连接验证

- 首页、对话、画布、结果继续编辑和上传重绘均调用同一 BYOK 图片任务命令；参考图读取归档原件，缺失时拒绝，任务和结果连线准确绑定来源节点。修复取消审批/中断恢复错卡、异步结果连线同步、结果输入框覆盖参考栏和长模型溢出。
- 已配置与已验证生成分离；保存或 models 探测不冒充图片成功，模型/地址/凭据变化撤销旧验证并保留冷却/隔离。
- 源码20e1c64通过146 unit、164 browser、UI119/0、Rust51及fmt/check/release。1421、1423和Tauri均验证三入口；全新WebView恢复3任务/3结果边/原件hash一致。bundle为index-DONtT_Pj.js；证据见docs/evidence/unified-image-command-2026-09-18。
- T4本地产品链关闭，真实付费Provider仍属EXT-PROVIDER。下一优先级T5持久TaskHost，随后T6 ComfyUI与T7 release；完整产品尚未全部完成。

## 2026-09-18 T3b 原生项目包最终验收

- 已接通 Desktop 设置→储存的导出、预检、独立目录恢复和打开副本入口；原生端完成严格 manifest/ZIP/schema/checksum/引用校验、隔离 staging、写后校验和新目标发布。Web 入口显示禁用原因。
- 新增跨语言 checksum、非法包、七个写入阶段故障注入和 UI 异步/取消回归；修复原生 JSON 字段排序导致画布打开即误保存的问题。已在源码 379b302 完成 129 unit、156 browser、UI 117/0、50 Rust、fmt/check 和 release build；全新 WebView 的完整快照/原件恢复通过，T3b Desktop Windows 单元关闭。


## 2026-09-18 T3a 原生素材及引用最终验收

- T3a 已在本地 `main@c855881` 关闭：Native Asset Repository、项目快照引用水合、原件 SHA-256 校验和读取保护均通过最终验收。隔离 Tauri release 使用独立数据根目录与三个全新 WebView profile，删除 profile 后仍可通过 IPC 恢复同一素材和快照；篡改 blob 会冻结读取并保留原件，快照文件 SHA-256 不变。
- 最终验证为 typecheck、118/118 Node、UI 116/0、format、build、9/9 定向浏览器、Rust 36/36 与 Node 24 PATH 下 release build 全部通过。运行链路为 `http://tauri.localhost/` / `src/main.tsx` / `index-CBwa_Zj7.js`；证据在 `docs/evidence/native-assets-2026-09-18/`。
- T3b `.kkproject` 导出/导入与恢复仍按最高优先级下一项推进；本条不宣称持久 TaskHost、真实 Provider、ComfyUI、Web 发布或 Mobile 已完成。

## 2026-09-18 T3b 项目包 Phase 1（历史阶段，当前结论见顶部）

- 已完成共享项目包契约的第一阶段：`projectPackage.ts` 提供确定性 JSON、manifest checksum、引用闭包、MIME/大小/完整 SHA-256 校验、secret/path traversal/重复与未引用条目拒绝；6 项专项单测、全量 124 项单测通过，源快照在拒绝路径保持不变。
- T3b 仍为 PARTIAL：共享 preflight、fail-closed native adapter 和有界 ZIP transport primitive 已完成；Tauri 隔离 staging/回读/原子发布、manifest-to-ZIP IPC、项目包 UI、真实 WebView 恢复和写入失败矩阵尚未完成。

## 2026-09-18 Provider 提交门禁（TASK-PROV-001）

- 已在独立 worktree 修复首页、对话、审批和重试路径的 Provider 提交边界：提交前同步占用连接槽位，审批后及每个实际 HTTP 分块前复核固定连接、状态、能力、容量和凭据；冷却遵守完整 `Retry-After`，401/403 隔离，5xx/网络故障不会自动换账户；无连接时仍打开供应商设置并保留草稿。
- 修复前在干净验证 worktree 复现了 3 项绕过回归；修复后 `npm run verify` 通过：117 个 Node 单元、151 个生产浏览器、UI 116/0、lint/typecheck/format/build 全部通过。证据在 `docs/changes/2026-09-17-provider-submission-gates/` 和 `docs/evidence/provider-submission-2026-09-18/`。
- 源修复已合入本地 `main@14dbe11`，主线 `npm ci`/`npm run verify`、Rust fmt/test/check、Tauri release 和隔离数据目录桌面 Provider 提交验收均通过；主线 bundle 为 `index-CBwa_Zj7.js`。远端为空，不能声称 PR、CI 或 main 保护已验收；跨进程 TaskHost 与真实 Provider 仍按账本保持未完成边界。

## 2026-09-17 工程治理与可执行门禁

- 在同一仓库的独立 TASK-GOV-001 worktree 落地治理结构；原 checkout 的 178 项既有改动及索引保持原状。29d0d9b 是限定范围的候选源码快照，尚未晋升稳定主线。
- AGENTS 保存稳定规则；治理目录复用现有规范和变更记录。task-ledger.json 是统一任务状态来源，TASK_LEDGER.md 自动生成，25 项任务覆盖历史遗留、依赖与外部条件。
- 新增 ESLint、npm-only、账本和导入边界门禁、Windows CI 与 PR 模板；修复 34 项 lint 基线错误，外部 Provider JSON 使用 unknown 与形状校验。修复底层调度在 cooldown 截止时仍无法重试的问题。
- 源提交987c908从干净worktree执行 npm ci/verify 通过：115/115 Node、139/139 Edge、UI116/0、typecheck、format、build 和 lint；Rust36/36、cargo fmt、client:check、release build通过。1421开发及隔离Tauri设置/主题刷新/Escape检查通过。详细证据见 docs/changes/2026-09-17-governance-baseline/verification.md。
- App fallback/pinned 入口绕过调度已登记 TASK-PROV-001；原生最终验收、真实外部服务、远端 PR/CI/保护和完整项目整合仍有未完成项，不以治理通过替代产品验收。

## 2026-09-16 Desktop 数据稳定性 T1/T2 与原生素材下一步

- T1/T2已落地：读取失败冻结自动保存，重新读取与未保存草稿下载独立；Desktop临时文件sync、有效备份保护、原件留存、revision CAS和跨进程锁；Web IDB事务CAS及每标签草稿。画布坐标、连线、视口、参数保存到canvas v1；新增节点UUID避免重开重复。
- 独立复核修正同项目重新读取后搜索/收藏仍用旧列表、改名可能覆盖远端新增的问题；原生canvas校验与前端对齐，缺位置/重复边/自连/越界缩放不再阻止有效备份恢复。人为构造的同revision异内容草稿进入冲突保护。
- 最新完整`npm run verify`：96/96 Node、138/138 Edge、typecheck、UI116/0、format、build通过；Rust20/20。重建release入口`index-DLNmKaeA.js`，隔离native目录与WebView profile的4次真实启动/正常关闭已验证A/B项目恢复、参数、UUID、备份恢复、双损坏原件hash不变及修复原件后重新读取。
- 详细记录：`docs/changes/2026-09-16-desktop-data-stability/verification.md`；原生证据`docs/evidence/desktop-data-stability-2026-09-16/native-acceptance.json`。范围不含突然断电、尚未提交编辑被强杀、持久TaskHost或真实Provider/ComfyUI验收。
- 当前继续T3a原生素材与项目引用：已确定设计`docs/changes/2026-09-16-native-assets/`。Desktop原件落文件仓库，Web保留IDB；不自动搬移旧IDB或历史目录。T3b完整项目包和其余MUR任务仍未完成，VPS/域名/Vercel没有变更。

## 2026-09-16 Launch Readiness Audit（审计完成，产品尚未达到 MUR）

- 按最新产品方向固定 Desktop First / Local First：Web 为明确移除 ComfyUI / Desktop Only 能力的浏览器本地版本，正式部署目标为自有 VPS；旧 Vercel 只作有限退役/回滚过渡；Mobile 保留旧移动交互经验并在 Desktop、Shared Core、Web/VPS 完成后适配。
- 完整审计与 19 项输出、Capability Map、平台 ownership、Launch Blockers、MUR、可执行依赖计划与验证边界位于 `docs/changes/2026-09-16-launch-readiness-audit/`。当前本地 HEAD 为 `609f524` 加大量未提交实现；GitHub main 固定参考 `931e205` 为旧 monorepo，VPS 部署 package 为 1.4.5；不能混作同一发布版本。
- 新增证据确认：项目不持久化节点位置/连线/视口，开发1421和production preview1423中刷新后坐标丢失；重新添加节点重复 `added-image-1`；IPC读失败故障注入后“重试保存”发出空项目快照；大data URL被normalize静默截断。真实用户项目未用于破坏性复现。**这些是本轮发现，尚未修复。**
- 主创作路径为 `App.executeTask → generateImages` 的 OpenAI-compatible 图片请求；画布卡片仍走 demo；独立 SQLite Worker/Gateway 与 ComfyUI命令/适配器尚未形成产品主流程。测试通过不等于真实Provider或ComfyUI验收。
- 本轮 `npm run verify` 通过（91/91 Node、130/130 Edge、typecheck、UI115/0、format、build），`client:check` 和 Rust6/6通过；release WebView2确认 `tauri.localhost` / production / `index-D11srnae.js`。Desktop只做启动入口取证，未宣称完成原生重启/任务恢复验收。
- VPS通过SSH完成只读审计：Debian13.1、1vCPU、约1GB内存、24GB盘，旧kk-api/PostgreSQL/Nginx在运行；外部22/80/443/3001/4174/5432可达。TLS sslip域名有效，旧payment上游502；未修改服务、数据库、防火墙、网站或DNS。提供的API Key/Hash未使用、未写文档或源码。
- 下一可验收单元：先保护读失败原件，补全项目图持久化与稳定ID，再接原生素材/项目包、统一Provider和本地持久TaskHost。后续任务及验收见本阶段 `plan.md`。

## 2026-09-16 Provenance 字段收口

- Asset Library 的详情面板现在直接展示 AI 生成标签、C2PA 和 SynthID 三项状态；状态来自已归档素材的 Provider provenance，供应商未回传时显示“未知 · 未回传”，不会把 Prototype 推断成真实检测结果。生成归档、IndexedDB 水合和本地重复导入都保留这两个可选信号字段。
- 重新启动固定 `1421` Vite 开发进程后，`tests/browser/task-workbench.spec.ts` 定向回归 `6/6` 通过；此前复用旧 Vite 进程导致的旧模块响应已清理，当前运行时与源码一致。随后重建 `1423` production 与 Tauri release，二者均加载最新 `index-D11srnae.js`，入口和尺寸基线保持不变。
- 新增同状态取证：`dev-final-asset-provenance.png`、`preview-final-asset-provenance.png`、`tauri-final-asset-provenance.png` 及 `final-browser-runtime.json` / `tauri-final-runtime.json` 中的 `assetProvenance` 文本和几何；截图滚动到 C2PA/SynthID 字段，Tauri 仍为 WebView2 `devicePixelRatio=1.5`。

## 2026-09-15 工作流整合验收收口

- Reference Slots、Batch Matrix、Task Workbench、Asset Library、Agent Cards、Comments to Tasks、Approval Gates 和 Provenance 已落到现有 React/TypeScript 画布与项目快照链路。槽位保留主体、风格、材质、构图、Mask；批量输出按单项等待/生成中/成功/失败/取消维护 `assetId`、模型、连接和 Prompt Hash；暂停、恢复、取消、离线和单项重试不丢已归档结果，也不会重复提交忙碌输出。
- 任务工作台的 Queue、Prompt、Generate、Review、Export 使用真实本地任务状态。远程传输和高成本批量在提交前人工审批；覆盖原图和外部分享入口保持禁用并解释原因。平台额度、真实账单、C2PA/SynthID 回传、公网分享和 Provider 保留策略仍是 Prototype/未接入。
- Asset Library 归档使用内容寻址 SHA-256；相同字节重导入只保留一个 `assetId`，并合并来源记录，不会用本地导入覆盖先前的 AI 生成来源。评论和区域标记写入项目 `reviewComments`，评论转任务后进入 Review Tasks 队列并保留分配/完成状态。
- 最新证据位于 `docs/evidence/workflow-matrix-2026-09-15/`：开发 `1421`、生产预览 `1423` 和 Tauri release 均记录 route、入口脚本、运行模式、DOM/几何、computed style、状态截图与真实点击；Tauri WebView2 记录 `devicePixelRatio=1.5`、`tauri.localhost/assets/index-D11srnae.js`、五个槽位及 196×240 任务面板。
- 本轮最终验证：`npm run typecheck`、`npm run ui:check`（115 文件 / 0 违规）、`npm run format:check`、`node --test tests/unit/*.test.ts`（91/91）、`npm run build`、`npm run client:check`、`npm run client:build -- --no-bundle` 和 production 浏览器回归（130/130）通过；新增工作流定向浏览器回归（1421，6/6）及 Tauri release WebView2 CDP 点击取证通过。Gateway provider 适配器同步补齐并通过对应单测。

## 2026-09-15 Reference Slots、Batch Matrix 与任务工作台（中间记录；最终验收见上方）

- 继续沿 Page 0:1 最新节点实现五类 Reference Slots（主体、风格、材质、构图、Mask）。槽位仍复用现有节点文件选择器和 Reference edge；上传卡保持 `referenceOnly` 无提示词编辑器，生成结果保持可继续编辑。槽位信息保存在画布自己的节点数据中，画布和连接只引用本地节点/assetId。
- `CreationTask` 增加有界的 per-output 状态、assetId、模型、Provider、Prompt Hash、预计成本和实际成本字段。执行时每项可处于等待、生成中、成功、失败或取消；成功归档使用 SHA-256 内容寻址，失败或取消项可在 Batch Matrix 单项重试，任务整体仍支持剩余项重试、暂停、恢复和取消。
- 新增 `TaskWorkbench`（Queue / Prompt / Generate / Review / Export）：Queue 显示任务状态和模型连接，Generate 展示多输出矩阵和单项重试，Review 展示 Planner、Prompt Compiler、Reference Analyst、Generation Worker、Asset Tagger、Reviewer、Compositor / Exporter Agent Cards 及人工审批 Gate，Export 展示评论转任务、区域标记和 Provenance。实际供应商账单、C2PA/SynthID 信号、公网分享和外部导出仍显示未接入或 Prototype，不伪造成功。
- Asset Library 详情补齐 AI 生成标签、Provider、Model、Prompt Hash、assetId、SHA-256、父版本、来源和生成时间；搜索覆盖这些非敏感元数据，来源筛选支持 AI 生成、本地导入、设计示例和本地集合。内容寻址归档保持重复素材共享同一 assetId。
- Figma 读取证据：实时 Page 0:1 元数据、`410:67353` 卡片展示和 `396:938` Runtime / Tasks；任务默认面板保留 196×240、8px 圆角、14px 内边距基线，创作输入区继续消费 590×237 设计尺寸。浏览器截图与 DOM/几何证据在 `docs/evidence/workflow-matrix-2026-09-15/`，开发页使用 `http://127.0.0.1:1421/`，生产预览使用 `http://127.0.0.1:1423/`。
- 本段为中间实现记录；最终 91/91 单元、130/130 production 浏览器和 Tauri WebView2 release 证据见上方“工作流整合验收收口”。

## 2026-09-15 Provider Worker、额度账本与 Gateway 边界

- 本阶段已完成独立 Node 24 Gateway 与持久化 Worker：真实 SQLite schema 在 `src/features/generation-server/schema.sql`，HTTP `/v1/jobs`、用户鉴权资产路由和管理员控制面均位于同一服务；启动命令 `npm run gateway -- <config.json>`。
- 删除本任务中新增但没有产品调用方的旧 IndexedDB Worker/内存额度/Gateway 客户端原型，避免两套不一致的结算与恢复实现。保留既有 UI、Provider Adapter 契约和所有无关未提交改动。当前 UI CreationTask 仍保持 Prototype 边界，不冒称正式平台账户已接入。
- SQLite 已验证 1/4/20/100 输出、规范化幂等、重启与未知提交复核、取消围栏、相同图片按槽位计数、单项重试不重复收费、隐私/权限/额度/熔断检查。Webhook 已验证签名时间窗、投递/事件去重、乱序、取消晚到和提前到达事件持久化。
- 已受理任务未知用量保留预留进入人工复核；不能因断网直接退款和重发。PNG 归档将校验 MIME、流大小、块 CRC 和完整解压数据；客户端只能获得 assetId 与自己的鉴权路由。
- 已完成真实 HTTP Adapter/Gateway/Worker 故障矩阵及全量验证：90/90 Node 单测、UI 标准 115/0、格式检查、130/130 Playwright、Vite build、cargo check 和 Tauri release 均通过。详细命令和范围见本阶段 verification.md；实际公网 Gateway、Vault、对象存储和付费账单仍由部署环境提供。

## 2026-09-15 多连接批量生成、隐私模式与素材归档基础

- 在保留现有创建流程和 Prototype 边界的前提下，增加 `ProviderConnection`、`CapabilityManifest`、连接状态与本地元数据注册表；模型供应商设置现在可以登记多个非敏感连接并点击切换。连接分为正式托管 API、用户 BYOK、本地 ComfyUI 和供应商明确支持的本地 OAuth；消费订阅登录和非官方代理会话不会进入公共调度池，凭据仍只通过既有系统密钥库读取。调度选择会跳过没有本地密钥的元数据连接，避免把请求发到不可用账户。
- 创建草稿新增 1/4/8/16/32 张批量数量选择；任务快照增加 `requestedOutputs`、`idempotencyKey`、`batchId`、`privacyMode` 和 `providerConnectionId`，旧快照缺失字段时安全回退，不把秘密写入项目快照。`local_only`、`byok_local`、`platform_backed` 的传输边界在创建入口显式呈现；平台模式和未配置 ComfyUI 工作流仍显示 Prototype/禁用原因。
- 新增统一 Provider Adapter 契约和 Gemini、OpenAI-compatible、Local ComfyUI 的适配器骨架；OpenAI-compatible 图片请求把批量数量按官方接口限制拆分为幂等分块（`dall-e-3` 每块 1，其他图片模型最多 10），可接收多个结果。每个结果都会立即下载/写入独立 IndexedDB 素材归档并转换为内容寻址预览，使用 SHA-256 前缀生成稳定本地 asset ID，并保留供应商、模型和生成时间的来源元数据，不直接把供应商临时链接写入画布。供应商返回不足或单项归档失败时任务显示部分完成和已归档数量，重试只提交剩余数量。
- 新增有界并发队列、Prompt Compiler、Agent 角色/事件/审批契约，覆盖连接健康/冷却、Retry-After 退避、批量部分成功判定和结果顺序保持；后续可由 Tauri Worker 接管持久化轮询、Webhook、额度账本和正式平台额度池。
- 验证：Node 24 下 `npm run typecheck`、34 项单元测试、`npm run ui:check`（103/0）、`npm run format:check`、`npm run build`、`npm run client:check` 均通过；批量、连接设置和既有创作流程定向回归通过，全量生产 Playwright 124/124 通过；最新源码修正后的 `npm run client:build -- --no-bundle` 已完成并刷新 `src-tauri/target/release/kk-studio.exe`。当前 CUA 浏览器桥接仍返回 `nodeRepl.fetch request failed`，因此本条只报告 Playwright 实际运行证据，未将 CUA 截图标为已验证。

## 2026-09-14 模型名称单行与语音输入开关

- 首页和工作台输入栏共用 `VoiceInputButton` 与 `useSpeechInput`：点击麦克风会请求浏览器语音识别权限，开始/停止实际的 Web Speech `SpeechRecognition` 会话；最终或临时识别结果写回当前提示词，切换项目、离开工作台、手动编辑或卸载时中止会话，迟到事件不会写入其他项目。权限拒绝、网络错误、无语音、启动失败和不支持的运行环境分别给出明确状态，不保存音频、不冒认离线识别。
- 语音状态复用 Figma `21:104319` / `410:74765` 的“声音开/声音关”资源，使用 `aria-pressed` 和 `data-voice-state` 表示状态；模型名称在首页按钮中保持单行并在最多 260px 内省略，工作台继续保留 Figma 58×22 模型槽位并避免换行。
- 同状态生产预览证据位于 `docs/evidence/voice-model-2026-09-14/landing-off.png`、`workspace-off.png` 和 `dom.json`；页面为 `http://127.0.0.1:1423/` production，入口标记为 `src/main.tsx`，route 分别为 landing/workspace。
- 验证：`verify-kk-studio.cmd`（Node 24 PATH 引导的完整闭环）通过；23 个单元、UI 标准 99/0、格式检查、生产构建和完整生产预览 Edge 回归 122/122 均通过。`npm run client:build -- --no-bundle` 重建 release，并通过 WebView2 CDP 确认 `http://tauri.localhost/`、`runtimeMode=production`、`runtimeEntry=src/main.tsx`、Web Speech API 可用且首页状态正确。`.prettierrc.json` 使用 `endOfLine: auto` 解决 Windows CRLF 与 Prettier LF 的误报。本次目标文件格式检查通过。

## 2026-09-13 创作流程竞态、权限与入口职责补齐

- 所有浏览器快照入口现在经过同一套 `normalizeCreationSnapshot`：IndexedDB、Tauri 和同步副本都会校验版本、项目引用、节点、消息、任务状态与草稿默认值，旧快照缺少 `approvalMode` 时安全回退，不会因浅层类型断言在首次渲染崩溃。
- 初始化持久化在存储水合完成前不再写入空快照，避免损坏或较新的持久化副本被初始 React 状态覆盖；早期用户编辑会在水合后按项目 ID 合并再保存。
- 首页与工作台共用附件读取 hook：PNG/JPG/WebP/GIF、单张 8MB、最多 4 张，读取中的槽位会立即占用；切换项目或卸载页面会中止 FileReader，迟到回调不能写入另一个项目，读取未完成时发送会明确等待。
- 发送在异步读取凭据后按项目 ID重新取得最新项目，只更新仍处于当前工作台的画布；任务仍固定提交时的供应商路由、模型和附件。权限模式在首页与工作台均支持“自动/询问”，询问模式在真实提交前显示确认和取消，取消会保留输入。
- 输入栏 Skill 与插件先显示当前项目的局部空态，只有用户明确选择“浏览 Skill 目录”或“管理插件连接”才离开当前创作；避免把本次选择、全局目录和连接管理混用。供应商路由凭据 ID 使用统一的 URL 规范化和双哈希，路径大小写保持有效区分。
- 增加图片模型能力判断（拒绝常见聊天、视频、音频和嵌入模型，保留显式图片模型），并补充快照兼容、凭据 URL 身份和询问/取消/入口空态浏览器回归。
- 保存队列失败时首页和工作台都显示真实的“重试保存”操作，重试使用当前内存快照，不会把失败误报为已保存。
- 本轮验证：`npm test` 23/23、`npm run typecheck`、`npm run ui:check` 98/0、生产 `npm run build`、创作流程浏览器回归 8/8（含运行中取消）。

## 2026-09-13 工作台草稿、凭据和中断任务恢复

- 工作台未发送的文字和参考附件现在属于项目的 `composerDraft`，切换项目、收起对话、刷新后仍可继续；附件变化会立即写入 IndexedDB 队列，浏览器同步恢复副本上限从 512KB 调整为 4MB，并在可用额度内覆盖常见大图。
- 任务创建时固定供应商 Base URL 和名称，重试使用原提交的 provider 路由；历史快照中没有 provider 绑定的任务不会盲目请求当前全局服务，而会显示需要重新提交。刷新发现 queued/running 任务时标记为“上次任务未完成”，由用户明确重试，避免自动重复计费或生成。
- Tauri 模型设置已接入既有 Windows Credential Manager 命令：桌面使用 `com.kkstudio.provider` 保存/读取/清除密钥，浏览器仍只保留当前会话内存；供应商元数据和项目快照不含 API Key。连接测试和创建前置校验都会从对应 Base URL 的凭据读取密钥。
- 工作台加号现在直接添加当前项目的参考图片，遵守首页相同的类型、8MB 和 4 张限制；原有 Skill、插件、模型入口和 Figma 输入框几何保持不变。附件读取、消息展示、供应商字段和连接状态已拆分组件，`ui:check` 回到 96 个文件、0 项违规。
- 验证：`npm run typecheck`、`npm test`（20/20）、`npm run ui:check`（96/0）、`cargo fmt --manifest-path src-tauri/Cargo.toml --check`、Rust 6/6、创作与运行态 7/7 定向浏览器回归和完整 Chrome 111/111 回归通过。旧测试中把未配置时的发送当作本地追加消息的两处断言已改为验证打开供应商设置并保留草稿。

## 2026-09-13 创作流程持久化与项目边界加固

- 首页草稿现在由 `CreationSnapshot.homeDraft` 持有，跨首页/项目库/设置弹窗切换仍保留；附件读取未完成时禁止提交，文件类型限制为 PNG/JPG/WebP/GIF、单文件 8MB、最多 4 张，并支持逐项删除。未配置 API Key 时不会创建必然失败的项目，而是打开模型供应商设置，提示“配置后回到首页再次提交”。
- 浏览器使用 IndexedDB 保存完整项目快照，保留小型同步恢复副本；桌面通过 Tauri `read_creation_snapshot` / `write_creation_snapshot` 写入 `%APPDATA%\\kk-studio\\projects\\creation-v2.json`，临时文件提交并拒绝递归出现的 API Key、访问令牌字段。保存失败会在首页或工作台显示错误状态，不静默宣称已保存。
- 每次任务保存提交时的附件快照和 attempt 编号；重试会建立新的任务记录，取消/切换项目后迟到的响应会被任务控制器身份检查丢弃，不会写入当前查看的项目。工作台消息删除会真正修改所属项目；收藏和喜欢按项目保存。provider 结果使用“已生成”标记，示范素材继续标为“示范素材”。项目库“新建项目”创建独立空项目并进入工作台，保留可编辑的基础图片/视频节点，不再打开一个共享固定画布。
- 证据与验证：`npm run typecheck`、`npm test`（20/20）、`npm run ui:check`（92 文件、0 违规）、`cargo test --manifest-path src-tauri/Cargo.toml --no-default-features`（6/6）、`cargo fmt --check`、生产 `npm run build`、定向创作回归（4/4）、目录/画布回归（14/14）、前端/运行态/生成回归（18/18）和完整 Chrome 152 回归（110/110）通过。`npm run client:build -- --no-bundle` 已重建 release，并通过 WebView2 CDP 只读确认 `http://tauri.localhost/`、`runtimeMode=production`、`runtimeEntry=src/main.tsx`、首页可见；尚未获得 CUA 桥接桌面交互截图，因此桌面视觉运行态仍不标为 Verified。

## 2026-09-13 首页到工作台功能闭环

- 保留现有 Figma-first UI shell，新增 `src/features/creation` 项目、任务、消息和附件数据边界。首页提交不再只切换路由，而是创建独立本地项目，保留提示词、模型和参考图片；项目快照持久化到浏览器非敏感存储。
- 首页加号读取图片并显示可删除缩略图；模型按钮选择本次创作模型，供应商设置仍负责全局连接；灵感分类真实筛选，模板将标题和描述完整写入提示词。
- 工作台对话发送为当前项目创建新任务；任务覆盖排队、运行、成功、失败、离线、取消，失败/离线/取消可重试，运行中可取消。配置 OpenAI 兼容图片 API 后调用 `images/generations` 或带参考图的 `images/edits`，仅在服务返回真实图片时创建 provider 结果节点。
- 项目库读取快照中的独立项目并重新打开对应工作台；画布为新增结果分配独立位置。API Key 仅在当前页面内存中保存，不进入 localStorage、项目快照或日志。
- 验证：`npm run typecheck`、`npm test`（20/20）、`npm run build`、`npm run ui:check`（91 文件、0 违规）、Chrome 152 全量浏览器回归（110/110）和目标文件格式检查通过；provider 响应回填用兼容接口响应格式做了端到端回归。`npm run client:check` 与 `npm run tauri build -- --no-bundle` 通过并重建 release；当前 CUA 桥接无法采集桌面交互，因此桌面运行态不标为 Verified。记录见 `docs/changes/2026-09-13-creation-flow/`。

## 2026-09-12 Tauri release 刷新与实际桌面回归

- 复核发现源码修正已经在 `http://127.0.0.1:1421/` 生效，但 `src-tauri/target/release/kk-studio.exe` 仍是 03:57 的旧包；源码最后修改时间为 18:21，启动器因此需要重新构建。执行 `node scripts/windows/desktop-release.mjs`，实际运行 `npm run tauri build --no-bundle`，并生成 18:39 的 release 包和 `dist/assets/index-Cu_Xvqx5.js` / `index-B5AfNVTm.css`。
- 在真实 Tauri WebView2（`http://tauri.localhost/`，1920×1080，production，`src/main.tsx → App.tsx`）重新验证 Landing、模型设置、MCP 设置和 Workspace。桌面截图与 DOM 证据保存在 `docs/evidence/ui-audit-2026-09-12/tauri-release-landing.png`、`tauri-release-model.png`、`tauri-release-plugin.png`、`tauri-release-workspace.png` 和 `tauri-release-ui.json`。
- 实际桌面结果：Landing 内框为 `(291,45,1619,1025)`；模型按钮打开设置弹窗并定位“模型供应商”；插件按钮打开同一设置弹窗并定位“MCP”；工作台从项目库进入后保持 `(291,45,1619,1025)`。四个状态页面错误为空，生产运行标记为 `runtimeMode=production`，不再继续加载旧 release UI。

## 2026-09-12 页面与弹窗入口审查修正

- 本地分支 `codex/figma-new-pages` 已在 `master`，两者均为 `8185992`，无待合并提交；本轮保留工作区原有未跟踪文件，不做清理或覆盖。
- 真实开发页 `http://127.0.0.1:1421/` 审查发现工作台对话面板进场动画完成前会暂时位于视口外；等待 220ms 工程补充动效后，DOM 回到 Figma 基准 `(1430,61,470,998)`，生产预览 `http://127.0.0.1:1423/` 回归同样通过，未修改既有面板动效。
- 修复首页 Skill 选项卡误直接跳转目录页的问题：选项卡现在只切换 Landing 内的 Skill 内容，“浏览 Skill ›”才进入 Skill 目录页面；设置、资产、搜索、喜欢收藏、帮助教程、快捷按键和任务列表继续分别保持弹窗/面板职责。
- 修复开始创作页“插件”按钮误复用 Skill 路由的问题：现在与工作台同名入口一致，打开设置弹窗并定位到 MCP 分类，不再把用户带到 Skill 页面。
- 对齐“模型”入口：开始创作页和工作台输入栏都打开设置弹窗的“模型供应商”分类，Skill 仍进入 Skill 页面，插件进入 MCP 分类。
- 修复 Skill 与 ComfyUI 目录页的 Prototype 状态说明覆盖副标题的问题；状态行现在位于副标题下方，当前开发页 DOM 实测间距为 10px。
- 新增 `tests/browser/catalog-pages.spec.ts` 入口职责与状态行布局回归；当前证据保存在 `docs/evidence/ui-audit-2026-09-12/landing-skill-fixed.png`、`skill-page-fixed.png`、`model-settings-fixed.png`、`plugin-settings-fixed.png`、`workspace-settled.png` 与 `browser-results.json`。
- 验证：`npm run typecheck`、`npm run ui:check`（88 文件、0 违规）、目标文件 Prettier 检查、Vite build、目录页定向回归 7/7、全量 Playwright 106/106 通过；构建保留 Zod 依赖注释位置的既有 Rollup warning。

## 2026-09-12 审查与合并前修正

- 复现并修正新增节点同事件连线绕过参考图能力限制的问题：目标卡片出现后重新校验待发布边，视频不能绕过图片参考限制，上传参考卡不能作为目标；结果边继续按生成流程保留。
- Tauri `get_config` 不再把内存中的 API Key 通过 IPC 返回；配置落盘失败时也不再先更新内存状态。SSE 字节流保留不完整 UTF-8 字节，避免中文被 `from_utf8_lossy` 替换。
- 会话列表、保存和删除遇到损坏的 JSON 现在会返回错误并保留原文件，不再用空数组回退后覆盖用户会话；新增 Rust 回归测试覆盖该保护。
- 桌面启动不再自动复制旧配置/会话；旧文件只保留为待用户明确触发的迁移来源，避免未完成 schema/checksum/确认流程的隐式导入。更新页改为明确的 Prototype/未接入状态，不伪造已下载或可重启安装。

## 2026-09-11 展开会话时地图导航保持可用

- 按用户纠偏移除桌面会话展开时隐藏导航的规则；导航在 `(1138,72,281,31.109)`，会话面板在 `(1430,61,470,998)`，边界间距为 11px。关闭会话后导航恢复到 `(1562,72,281,31.109)`；小地图弹层同样止于 x=1419，按钮中心命中 `小地图`，不进入面板区域。
- 同状态开发页截图与命中记录为 `docs/evidence/frame-accuracy-2026-09-11/after-dev-expanded-map-open.png`、`open-chat-navigation.json`；最终生产预览已重采集四种展开/收纳组合及 1600/1440/390 视口，页面无错误、图标全部加载。`comparison.html` 的 17 个控件锚点最大误差为展开 0.01525px、收纳 0.015625px。
- 最终生产定向回归 11/11、TypeScript、UI 标准检查（86 个文件、0 项违规）通过；桌面包于 20:16:02 重建并通过实际 Tauri WebView 展开/收起/小地图点击验证，日志为 `tauri-nav-fix-final6.log`、`tauri-navigation.json`。同仓库的“优化节点连接与模块尺寸”任务之后继续写入 `CanvasNodeLayer.tsx`，因此最终 `release-identity.json` 为 stale；已验证桌面快照包含本次导航修复，后续节点变化不在该快照验收范围。完整验证仍受现存图片预览/连线测试与全局格式问题影响，不报告全局通过；详情见本次 verification。

## 2026-09-11 Runtime / Tasks 按 Figma 396:938 对齐

- 重新读取实时 Figma `0nU0A7pq6eyjwfwm1TtWkO` 的 `396:938`（Runtime / Tasks）及子节点：面板 `196×240`，标题 `(14,11,169,10)`，筛选 `(14,30,170,14)`，任务卡区域 `(14,53,170,52)`；默认态展示历史任务卡和“正在生成中”卡。
- `TaskPanel` 现在按原稿渲染两张本地 Prototype 卡片，四个筛选可切换全部/执行中/未完成/失败；历史卡保留“点击查看”覆盖层，点击后打开本地任务详情，关闭与外部点击/Escape 行为继续有效。未接入真实 provider task 服务，不冒认生成或服务器结果。
- 新增 Figma 原始占位图 `public/design/figma/task-placeholder-complete.png`、`task-placeholder-running.png`，并补齐 `data-node-id` 锚点、任务语义令牌和 14px 筛选命中区，避免复用旧空态的 30px 布局。
- 同状态证据保存在 `docs/evidence/runtime-tasks-2026-09-11/`：开发页 `http://127.0.0.1:1421/` 与生产预览 `http://127.0.0.1:1423/` 均已截图并采集 DOM；生产页从 `src/main.tsx → App.tsx → Canvas → CanvasHud → TaskPanel` 渲染，三个任务筛选状态和资源加载无页面错误。
- 验证：任务面板定向 Playwright 1/1、配置入口回归 2/2、20/20 单元测试、生产构建和本轮目标文件格式检查通过；同一生产构建的全量 Playwright 为 94/101，Runtime / Tasks 用例通过，7 个既有画布连线/生成错误/旧图片尺寸断言失败。全局 `ui:check` 仍有既有 `Canvas.tsx` 333 行边界问题，完整格式检查有 9 个既有文件未格式化；本轮曾成功生成并启动包含任务面板的 release；随后源码继续被并发画布改动写入，最终重建在 `DemoResultNode.tsx` 类型错误处停止，freshness 不能标为最新。

## 2026-09-11 会话入口状态、覆盖层与右侧进场动效

- 重新读取实时 Figma `0nU0A7pq6eyjwfwm1TtWkO` 的 Workspace `404:28667`、收纳态 `410:67357` 和右侧按钮组件 `143:28077`：关闭态使用无实心右半面的 `右关闭` 图标，展开态使用带实心右半面的 `右打开` 图标。入口命中框按原稿保持 `18×18`，可见描边资产按 Figma 导出的负内边距居中为 `21.5×21.5`。
- 会话容器改为工作台内绝对定位的覆盖层，避免打开面板参与 flex 布局；会话展开时地图导航保持可用并左移到面板左侧 `(1138,72,281,31.109)`，地图触发器为 `x=1344.625`，与面板保留 11px 间距，关闭后恢复右上角 `(1562,72,281,31.109)`。底部工具栏固定在 `(719,998,294,50)`，工作台不产生横向滚动。
- 增加一次性的右向左会话进场：面板从页面右侧外缘滑到 Figma `(1430,61,470,998)`，保留 reduced-motion 关闭动画。Figma 当前 motion context 未返回会话关键帧，因此这段时序记录为工程补充，不冒充原稿动效。
- 同状态证据在 `docs/evidence/session-panel-2026-09-11/`：关闭/打开截图、DOM 几何与逐帧 x 采样。开发页 `http://127.0.0.1:1421/` 的路由链为 `src/main.tsx → App.tsx → Canvas → CanvasHud/CanvasNavigation/ConversationPanel`。
- 验证：TypeScript、UI 标准检查（86 个文件、0 项违规）和生产构建通过；展开会话、收纳切换、地图弹层相关的 `frame-accuracy`、`composer-fidelity`、`canvas-layout` 定向用例 11/11 通过。当前单元测试为 19/20（`canvasGraph` 既有锚点期望不匹配），四文件生产回归为 24/25（唯一失败是 `frontend.spec.ts` 的旧图片预览 x=470 期望收到 x=468），全量历史证据为 95/101，失败均不涉及本次导航修复。同状态 Chrome DOM/截图与小地图命中证据已保存。`node_modules/.bin/tauri build --no-bundle` 构建与实际 Tauri 导航验证通过；随后并发节点写入导致最新 worktree freshness 变为 stale，详见顶部导航修复记录。

## 2026-09-11 个人信息弹窗按 Figma 312:2436 对齐

- 重新读取实时 Figma 节点 `312:2436`，将 `AccountPopup` 调整为 `260×230`：账号信息、`116×30` 账号操作、`236×57` 积分/订阅卡、主题行和版本更新行按原稿顺序与坐标重排；补齐余额积分条、积分图标、普通用户徽标、双箭头和原稿图标资源。
- 账号身份使用原稿示例文案 `YYYKK / UID：308311652306456581`，弹层仍标注本地 `Prototype`；积分、切换/退出账号和更新状态不冒认真实服务，主题与更新入口保留实际跳转。
- `AccountPopup` 样式改由 `App.tsx` 在 `workspace.css` 与 `sidebar.css` 之后统一加载，避免旧工作台规则覆盖；新增账户弹窗颜色令牌及 Figma 导出的 `public/design/figma/account-chevron.svg`。
- 实际验证：开发页 `http://127.0.0.1:1421/` 与生产预览 `http://127.0.0.1:1423/` 均从 `src/main.tsx → App.tsx → Sidebar → AccountPopup` 渲染；生产预览同状态 DOM CSS 尺寸为弹窗 `260×230`、身份 `143×26`、操作区 `236×30`、积分卡 `236×57`、主题/更新行各 `236×22`。侧栏浏览器回归 `tests/browser/sidebar.spec.ts` 7/7 通过。
- 本轮未改动账号后端或持久化；全局 UI 标准检查仍有既有 `workspace.css` 任务卡颜色字面量告警，与本弹窗文件无关。

## 2026-09-11 logo 资源修正

- 按实时 Figma `0nU0A7pq6eyjwfwm1TtWkO` 重新导出完整裁切父节点：侧栏/通用 26px、首页 `399:27833` 63.1406px、账号 `21:119316` 30px、模型 `19:96869` 20px、积分 `21:104347` 11px、会话 `407:29275` 12px。
- 新增 `src/components/BrandLogo.tsx` 作为唯一品牌图形入口；`Sidebar`、`StartPage`、`ConversationPanel`、`AccountPopup`、`CreationComposer` 和 `GenerationAction` 均改用对应变体。移除首页、账号和小图标对 26×34.45 内部图层的 CSS 越界裁切；保留 Figma 自带 mask/clipPath 与边框。
- `public/design/figma/logo.svg`、`sidebar-logo.svg` 已同步为完整 26px 导出；新增 `logo-hero.svg`、`logo-account.svg`、`logo-model.svg`、`logo-credit.svg`、`logo-message.svg`。桌面图标从完整 Figma SVG 重新生成，修复底部圆角越界。
- 修改前/后浏览器 DOM 与截图、Figma 来源、Tauri 窗口截图保存在 `docs/evidence/logo-correction-2026-09-11/`；当前 Web `http://127.0.0.1:1421/` 为 development，生产预览 `1423`，桌面为 Tauri release。`src/main.tsx → App.tsx → StartPage/Sidebar/Canvas/ConversationPanel` 路由链已核对。
- 验证：`npm run verify` 通过（20 unit、96 browser、UI 标准 0 违规、格式通过）；`npm run tauri build -- --no-bundle` 通过；release freshness 为 current。仅本次 logo 范围标记 Verified。

## 2026-09-11 Workspace Frame 精确核对

- 按实时 Figma `0nU0A7pq6eyjwfwm1TtWkO` 的 Workspace `404:28667` 与收纳 `410:67357` 重读 shell、Sidebar、项目行和收纳动效；当前坐标以这两帧覆盖旧 `1:2` HUD 位置。
- 修正 1920×1080 固定设计面：展开内框 `(291,45,1619,1025)`、收纳内框 `(70,45,1840,1025)`、任务按钮 `(321,72,93,30)` / `(100,72,93,30)`、底栏两态均 `(719,998,294,50)`、对话 `(1430,61,470,998)`、收纳搜索/设置/账号 `(22,942,26,26)` / `(22,982,26,26)` / `(22,1022,26,26)`。背景圆角外侧改为不露黑的实体 shell，网格保持源坐标相位。
- 收纳与展开保留独立状态：面板打开时导航和小地图仍可点击，面板关闭后导航回到右上角，展开按钮拥有 32px 透明命中区；草稿保留；焦点已移动到画布卡片时不会被延迟回焦抢走。侧栏 300ms 过渡逐帧保持任务距内框左边 30px、底栏不横移，项目行在过渡中保持 263/231/263×29，不发生多行重排。
- 项目操作槽改用实时导出 20×21 容器；移除标题旁多余外链图标，未分组标题补齐前往/创建入口。项目组管理支持右键与 Shift+F10，菜单支持初始焦点、方向键、Home/End、Escape；多创作页因尚未接入而禁用并说明 Prototype。
- 新增同状态对比页、DOM/截图/录像和动效采样：`docs/evidence/frame-accuracy-2026-09-11/comparison.html`、`after-preview-dom.json`、`desktop-expanded.png`、`desktop-collapsed.png`、`collapse-interaction.webm`、`motion-samples.json`。对比页生产 DOM 锚点最大误差展开 0、收纳 0.015625px；该结论只覆盖列出的外框/控件，不代表全文件像素相等。桌面截图取自紧邻的前一份构建，最终构建后的项目菜单/过渡细节已由当前 100 项生产浏览器回归覆盖。
- 验证：最终 `npm run verify` 通过（20 unit、100 browser、UI 标准 0 违规、格式、生产构建均通过）；`npm run tauri build -- --no-bundle` 通过，release freshness `current`。Development `127.0.0.1:1421`、production preview `127.0.0.1:1423` 分开截图并报告无页面错误、图标全部加载。实际应用的初始卡片、Prototype 账号、空对话与 Figma 示例内容保持边界，不伪造服务结果。

## 2026-09-10 最新 Figma 与实际运行链路诊断

- 实际 Web 为本仓库 Vite development `http://127.0.0.1:1421/`，入口 `src/main.tsx -> App.tsx`；`/` 内通过 active 状态切换 StartPage、Canvas/ConversationPanel 和 LibraryPage，弹窗使用 CatalogPanel 等已有组件。
- 已在浏览器复现 CSS import 去重导致 conversation-panel.css 提前加载，workspace.css 覆盖 Panel 背景为 36% 透明。页面级样式改由 App.tsx 单点加载。
- 最新 Figma MCP 已读三帧及 Sidebar、Landing、Panel 子节点；修正桌面收纳 70px、Panel 426x170 输入框/22px 控件、Landing 完整加号及分隔线，保留窄屏工程补充与业务状态。
- 历史启动脚本在 EXE 存在时跳过源码新鲜度检查；现有启动器已接入 desktop-release.mjs。2026-09-09 21:53 的 release EXE 仍需重新构建，Web build 不等于 Desktop 更新。
- 验收状态：进行中。before DOM/三状态截图与本次实时 Figma 截图保存在 `docs/evidence/ui-runtime-2026-09-10/`。后续 typecheck/build/UI 回归和 after 证据必须独立记录；不得引用下方历史 93/93 作为本次结果。

更新时间：2026-09-09

## 2026-09-09 Figma 三状态实现补充

- 已按 Figma `1:2`、`338:9081`、`338:17211` 重新读取主画板、空白画布/菜单态与收起侧栏态的关键子节点。
- 修复 `开始创作` 从项目库进入错误打开为说明弹窗的路由问题；`landing` 现在会切换回开始创作页。
- 主画板 1920×1080 同状态几何已对齐：任务按钮约 `(310,67,93,30)`、展开对话区 `(1429,56,472,1003)`、底栏 `(719,998,294,50)`、导航约从 `x=1138` 开始；收起态保留 61px 轨道并补齐原稿 `x=69` 内框间隙。
- 对话外框在画布内框中使用 11px 上下内距，标题栏基线与 Figma `1:8090` 的 y=56 对齐；已重新构建并启动 `src-tauri/target/release/kk-studio.exe`，避免快捷方式继续使用旧构建。
- 新增 172:367 右键画布菜单：280×213、上传/粘贴等未接入项明确禁用，添加节点复用现有添加菜单；右键拖动画布、Escape、失焦和边界定位均有处理。
- 验证：TypeScript、Vite build、相关文件 Prettier 通过；15 个单元测试通过；画布布局/前端回归 16/17 通过。剩余一项是 1024px 视口中 HUD 右上导航与窄屏对话入口的自动碰撞断言，需要下一轮同状态截图复核。

## 2026-09-11 节点连接、参考图上限与多结果生成

- 读取最新 Figma `0nU0A7pq6eyjwfwm1TtWkO` 的 `410:67353` 与 `458:966`：图片正文按 `400×400` 落地，视频正文 `370×208`，创建卡片 `436×458`，底部输入区 `590×237`；`aspect-[441/441]` 被确认是比例值而非模块宽度。
- 加号拖动现在显示连接预览线；拖到其它卡片的可见正文时通过指针位置命中目标并高亮，释放直接连接；空白释放继续打开带父节点的新增菜单。新增节点与连接在同一 React 事件内也会保留，不再因 items 尚未重渲染而丢边。
- 连接模型区分 `reference` 与 `result`：媒体模块按当前本地模型能力限制参考图数量，超限连接显示可关闭提示；上传图转为 `referenceOnly` 卡片，选中不挂载底部输入框。生成图片作为参考时保留该结果自己的模型、提示词和完整 composer，输入状态跟随节点；参考图缩略图支持直接移除连接。
- 生成数量为 4 时先建立 4 张 `pending` 结果卡片并连接到父模块，等待 180ms 的可取消本地演示窗口后再填充结果；取消、错误和离线会将占位卡片标成可恢复状态。提示词和模型随父模块复制到每张结果。
- 同状态证据：`docs/evidence/node-linking-pending.png`、`node-linking-ready.png`、`node-linking-direct-target.png`；变更 intent/spec/plan/verification 位于 `docs/changes/2026-09-11-node-linking/`。
- 验证：开发 `127.0.0.1:1421` 与生产预览 `127.0.0.1:1423` 的浏览器脚本均确认 `pending=4`、`ready=4`、目标高亮直连、空白菜单、上传卡片无 composer、参考图 `4/4` 上限提示；20/20 单元测试、101/101 浏览器回归、UI 标准检查（88 文件、0 违规）、格式检查和 Vite build 通过。当前仍为本地 Prototype，模型上限表待真实 provider 元数据替换。

## 当前目标

只打造新的 Figma-first 工作台，唯一工程为 `D:\kk-studio-next`。旧根目录 `D:\kk-studio` 已清理；历史工程和用户数据仍保存在带日期的归档目录，等待未来显式迁移。

## 已完成

- 统一 `src/core` → `src/domain`，provider 适配器归入 `src/integrations`。
- 统一资源目录：`public/design/figma`、`public/fixtures/demo`、`design/figma-plugin`。
- 新增 `src/runtime/storage-contract.ts`，集中浏览器 key、桌面目录和凭据 service 常量。
- 新增 Tauri `storage_paths.rs`，建立 `%APPDATA%\\kk-studio` 专属数据树，并保留旧配置作为待用户明确触发的迁移来源。
- 清理根目录临时审计脚本、dist、test-results 和旧资源目录。
- 建立架构、数据分级、开发、评审、SDLC 文档与本次整合的 intent/spec/plan/verification。
- 单元测试迁移至 `tests/unit`，浏览器测试保留在 `tests/browser`。
- 工具菜单与帮助菜单按 Figma `338:776` / `338:851` 对齐为 90×50 / 103×50，并补上同尺寸断言回归。
- 项目库教程、Skill/工作流禁用态和卡片选择反馈已补齐，所有入口都有真实状态或明确 Prototype 原因。
- 恢复 Windows 一键启动入口：根目录 `start-kk-studio.bat`、`scripts/windows/desktop-release.mjs` 和桌面“启动 KK Studio.lnk”均已指向 `D:\kk-studio-next`，图标使用 `src-tauri/icons/icon.ico`。

## 仍是 Prototype

- 前端尚未接通 Tauri IPC；项目、资产、收藏、真实账号、积分、记忆和生成服务仍未持久化或连接后端。
- ComfyUI 适配命令存在桌面端基础，但模型扫描、队列和真实 provider 调用尚未由 UI 驱动。
- Figma 同状态截图对比需要在资源路径迁移后重新跑完整浏览器证据。

## 下一步

1. 按 `docs/changes/2026-09-09-workbench-consolidation/verification.md` 运行全部检查。
2. 为 project repository、memory schema 和 Tauri IPC 建立 feature slice，再接入真实存储。
3. 每个 UI 修复都补同状态 DOM/截图和失败路径测试。

## 最近验证

- `npm run typecheck`：通过。
- `npm run test`：15/15 通过。
- `npm run ui:check`：74 个文件、0 项违规。
- `npm run format:check`：通过。
- `npm run build`：通过。
- `cargo test --manifest-path src-tauri/Cargo.toml storage_paths -- --nocapture`：6/6 通过。
- Playwright 浏览器回归：93/93 通过，覆盖 1920、1440、768、390 视口。

历史过程见 `docs/archive/`，不覆盖当前状态。

## 2026-09-10 UI runtime diagnosis: verified delivery, partial visual acceptance

Confirmed and repaired stylesheet import deduplication/cascade issues; preserved existing pages and interactions. Latest 404:28667 / 410:67357 / 410:59708 contexts were read through Figma MCP. Current Web process PID16112 serves D:/kk-studio-next on1421; its actual browser screenshots and measured panel/sidebar/composer geometry show source changes. Full browser suite96/96 without retries, unit20/20, typecheck/build/ui:check/format:check passed. Tauri release rebuilt2026-09-10 23:10:01 and freshness reports current.

Not complete: original reported window provenance, native Tauri visual check, full same-content Figma and all auxiliary frame/state comparisons. Collapsed search retained by explicit user request. See docs/changes/2026-09-10-ui-runtime-diagnosis/verification.md and docs/evidence/ui-runtime-2026-09-10/live-browser.json. These current results supersede earlier pending validation notes, not the remaining visual acceptance boundaries.


## 2026-09-20 KK Studio 2.0 main 同步候选

- 本地稳定 main 已在隔离 worktree 完成候选整理；原 checkout 仍保持 dirty/index 原样。
- PR #1 已将 chore/TASK-KK2-MAIN-SYNC squash 合并到目标云端 main；合并后回读确认远端 main tree 与本地稳定 main 相同。
- 首发树只包含当前本地 2.0 已跟踪目录；云端旧 monorepo 当前目录已删除，旧历史仍可追溯。
- PR 记录：https://github.com/soudbs180-creator/KK-Studio-2.0/pull/1。合并后已回读 main SHA/tree SHA。


## 2026-09-20 UI 主线整合

TASK-UI-MAIN-001 从 origin/main@8aca3ab 出发，三方整合27项原目录交互修复并保留主线T3b/T4/T5；现行 Figma 的设置、搜索、资产展开/收纳及任务入口偏差已修正。34种页面状态已用实际导航捕获；原目录尚未切换前不能把候选描述成原目录最新版。准确命令、运行矩阵和同步状态见 [verification](changes/2026-09-20-ui-main-alignment/verification.md)。UI-004 保持 PARTIAL：当前唯一Figma页面中没有Landing410:59708及部分独立页面稿。治理候选TASK-GOV-002保持独立，未夹带合入。

## 2026-09-20 UI 主线整合收口

TASK-UI-MAIN-001 已完成并同步到目标仓库：PR #3（https://github.com/soudbs180-creator/KK-Studio-2.0/pull/3）通过双 CI 后 squash 合并，远端与本地 `main` 均回读为 `fb57529c719924330ec0154f5374df8f5d508e00`。本地根目录已从 `master` 切换到跟踪 `origin/main`，原 `master`、旧本地 `main` 和原工作文件均保留在归档位置；原目录 409 项已逐项 SHA-256 核对，未上传未审阅内容。现行 Figma 可取得的页面已完成同状态 DOM/截图验收；缺失 Landing 等独立 Figma 稿件仍由 UI-004 标为 PARTIAL。


## 窄屏关闭优先级补充

TASK-UI-DISMISS-002 修复账号菜单跨窄屏断点、键盘展开后外部点击不关闭；同状态三环境专项与191项浏览器回归通过。详见 docs/changes/2026-09-20-ui-main-alignment/followup.md。稳定main提交以Git回读为准，上述旧SHA是阶段记录。UI-004设计来源缺口与PERF-001压力边界继续保留。

- 补充云端大图重绘失败调查：优化归档/请求的逐字节转换，route提前捕获请求、点击后开始I/O预算。unknown用例的瞬时审批检查已改为等待异步审批；最终完整verify通过（浏览器191项、0失败/重试），unknown/音频定向10次通过，大图20倍CPU连续3次通过；新bundle index-Be6XJzPc.js已在dev/preview/隔离Desktop核对。PERF-001大规模素材库工作保持未完成。
## 2026-09-20 AI自主开发、分支和规则一致性（TASK-GOV-002）

- 最新治理规则已合入本候选；TASK-GOV-002 仍由独立 owner 维护，远端保护 API403 继续记录为 BLOCKED，不由本任务代替其 PR/审批。

## 2026-09-21 Governance closeout synchronization

- `origin/main` now includes the governance closeout at `3c4d012`; TASK-GOV-002 remains PARTIAL because hosted branch protection is still blocked by the GitHub billing/API403 boundary. Its closeout package and current ledger entry were retained when preparing this candidate.
- This candidate keeps the UI/asset work scoped to TASK-MAIN-CLOSE-002; it does not re-own the governance worktree or claim remote rules are active.
