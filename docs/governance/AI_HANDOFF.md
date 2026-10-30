# AI Handoff（最短恢复入口）

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-10-29
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

本文是跨会话 AI 的最短恢复入口（30 秒内读完）。任务状态只读 [`task-ledger.json`](task-ledger.json)；当前项目事实只读 [`PROJECT_STATE.md`](PROJECT_STATE.md)。

最新2026-10-29：P4源码R1 367→0、R3 10→0、R4=0；P5契约1.4、权限/验包/RPC与Web实验T1已接线，但新包执行生产门默认关闭。根2363/Mobile373/Agent204通过，原skip保留；独审/原生/完整verify/main未验，P5授权Figma、T0/T2/T3及更多逃逸面仍开放。当前复用refactor/TASK-MOD-P3-feature-cycles，main与Figma树受保护；四份原文其他任务仍开放。

2026-10-28 P3a–e 源码候选：契约包1.3.0、Desktop/Web2.1.49、Mobile2.1.43。完整图R4由16降0，R1由405降367，其余规则无新增；212个迁移函数体AST一致、六份UI JSX结构一致，纯核心/infra/runtime无间接feature依赖。根2354通过/20跳过/0失败，Mobile373与Agent204通过（Agent另2跳过），根/契约/Mobile类型通过；Edge双构建各3/3通过，任务/资产/HTTP/DOM同态且4张PNG SHA完全一致。核心浏览器原9失败保留：8项在父P2错误和位置逐项一致，另1项为P2已有窄屏HUD失败。P2 flag仍默认关闭；独审、Tauri/真实Provider、完整verify和main整合未完成，五阶段分别PARTIAL。P3f、P4–8及STD/ORG等四文档其余任务继续开放。

最新P2候选：feat/TASK-MOD-P2-capability-registry-inpaint在fe99上实现薄注册器与默认关闭image.inpaint接线；包1.2、Desktop/Web48、Mobile43。根2350/Mobile373通过，双构建任务/资产/HTTP/DOM一致，各image-edit14 pass/1原窄屏fail；严格PNG有录音按钮边缘1灰阶像素变化，同路径也复现，仍未通过零差异。P2保持PARTIAL，原生/真实Provider/独审/main未验；见[P2验证](../changes/2026-10-28-inpaint-capability/verification.md)。P1-G、严格依赖声明和四文档其余任务仍开放。下文旧状态保留各时间点含义。

P1最新候选：用户已明确启动，当前feat/TASK-MOD-P1-capability-contract在5240e7b3上增加契约包1.1.0、业务schema和3个Port，未改src/上层逻辑。13契约、根2338及Mobile373项通过；独立项目配置/无宿主全局运行通过，严格依赖声明仍有Zod URL错误（TASK-MOD-P1-TYPES）。P1-G治理、P2运行接线、其他Port与主线/独审尚未完成。旧段落“P1未实施”为此前时间点，不覆盖本追加；入口见[P1验证](../changes/2026-10-28-capability-contract/verification.md)。

模块化整顿先读[四份原文总清单](../changes/2026-10-28-modularity-p0/four-document-coverage.md)和TASK-MOD-FOUR-DOC-COVERAGE。原始审计/复核草案由执行规范修正，补篇还含STD现代化与ORG-0–7；最近五项只是优先批次。用户禁止子代理，主代理直接执行，不把自审称为独审。

P0、安全补丁和格式有各自候选与限定独审，均未合流；17个测试文件修复后定向29项通过，完整verify仍有浏览器失败。P1只做前置、ORG只备份校验未迁出、P2未实施，其余P/STD/ORG不得漏报。main与origin/main仍113/7分叉，主checkout21个dirty文件受保护。实现/审查/合流证据必须逐项记录。

最新任务树候选：b8acad1c后修复折叠侧栏的HUD宽度归零，源码Desktop/Web2.1.47、Mobile2.1.43；保存6项含三宽度同宽reload通过，30项邻接27 pass/3 fail，原HUD取消裁切另挂开放任务。ORG-2守卫与ORG-5首包62日志已形成候选，不再是“仅副本”，均未主线整合。优先处理TASK-MOD-GATE-ADJACENT和TASK-UI-HUD-CANCEL-CLIP，完整verify未过，P1/P2仍未实施。

## 1. 当前基线与门禁（2026-10-26）

- **唯一主仓**：`D:/kk-studio/KK-Studio-2.0`（主线分支 `main`，三端版本 `2.1.45` / `2.1.45` / `2.1.42`）。
- **快速开发门禁（Fast Loop）**：`npm run typecheck && npm run lint && npm test`。
- **合流交付门禁（Ship Gate）**：`npm run verify`。
- **架构契约**：`src/domain/` 零外部依赖；`src/features/<feature>/index.ts` 全部 23 个特性已具备标准公开入口。

## 2. 当前优先推进主线（无需重复请示，按全权宪章自主推进）

1. **Wave 1 — 接通与暴露**：参照 [优化路线图](../changes/2026-10-26-kk-optimization-roadmap/roadmap.md) 与 [竞品学习方针](../engineering/COMPETITIVE-LEARNING-POLICY.md)，优先推进 `OPT-101/102`（本地 ComfyUI 出图链 Tauri invoke 桥接通）与 `OPT-003/103`（MCP 服务端最小集暴露画布工具）。
2. **Wave 2 — 画布底座解耦**：推进 `OPT-201` 抽取 `CanvasAdapter` 接口，逐步解耦 `src/components/canvas/` 自研渲染层。
3. **Figma 设计先行**：涉及 UI 变更时，遵循 [`AGENTS.md`](../../AGENTS.md) 与 [`UI_INDEX.md`](../UI_INDEX.md) 先核验 Figma 真值再同步本地令牌与组件。

## 3. 历史交接归档

2026-10-25 及更早的阶段交接记录已归档至 [`docs/archive/AI_HANDOFF_HISTORY_202610.md`](../archive/AI_HANDOFF_HISTORY_202610.md)。

P3继续入口：[ADR-029](../architecture/adr/ADR-029-feature-cycle-decoupling.md)及五个阶段verification；当前branch refactor/TASK-MOD-P3-feature-cycles，main与Figma工作树保持原状。

2026-10-29最新候选：P4源码收敛完成：367条唯一深层依赖边降0，285条属于指定五切片、其余82条亦清零；381条导入/再导出语句按顺序改写。R3由10降0，R4保持0，其余基线不新增。25个迁移纯函数AST一致，五份既有UI结构一致，最终CSS与P3完全同字节。根最终2363通过/0失败/20跳过（P4单独阶段2355通过），Mobile373与Agent204通过。限定浏览器、体积及退出码见最终回执；独审/原生/完整verify/main尚未完成，保持PARTIAL。 P5部分完成：契约包1.4.0新增清单/JSON Schema/RPC与PermissionPort；包目录、版本/平台、逐文件SHA、权限交集、身份、消息上限/超时/重放/撤销和更新失败保护已接线。真实Edge实验T1与安装器→React→当前Context链通过；生产新包执行门默认关闭，legacy保持宿主兼容。Desktop IPC、WebRTC/其他逃逸面、独立安全审查、授权Figma/UI、T0/T2/T3与其他贡献未完成，不能称为生产插件沙箱。 当前Desktop/Web2.1.50、Mobile2.1.43；主仓与Figma树未修改，当前复用P3任务分支。

最终限制更新：任务/资产/HTTP/DOM同态，CSS字节相同；严格PNG有1像素/1灰阶差异仍未通过。P5生产门默认关闭，Web实验不能替代原生、跨浏览器与独审。

2026-10-29 P6/P7任务树候选：Desktop/Web2.1.51、契约1.5.0、Mobile2.1.43。独立扩图/修复/分层Manifest+ComfyUI工作流经原队列保存、执行、归档和重载；独立禁用与1.1实际执行/回退1.0通过。P7规范化原有PromptHash/ParentId/Origins，保留同字节不同父/Provider及导入来源，TS/Rust同规则。根2372 pass/20 skip、Mobile373、Agent204 pass/2 skip、Rust资产18、生产Edge17项通过；运行限制/源码构建hash见[共享验证](../changes/2026-10-29-p6-image-host/verification.md)。三项能力和P7均PARTIAL，真实GPU/API、Desktop原生/GUI、独审、完整verify/main未完成，无生产UI新增。P2/P5生产门状态不变；原9个核心浏览器失败/1像素差异未归零，四原文其余任务不因本次推进自动完成。

2026-10-29 P6.1候选：Desktop/Web2.1.52（Mobile43/契约1.5.0不变）；本机ComfyUI扫描、隐藏托管与双态工作流卡片已接，归属WS/history经AssetPort归档并落图连线。修正代理502、Windows Python别名子进程泄漏及画布边未持久化；隔离Native夹具双client/原件SHA/结果边/重开/停止通过，原生编辑器为键盘提交，鼠标未验收。真实GPU/完整编辑器、卡片参数面板、Figma04/05、独审、完整verify/main仍未完成，PARTIAL；用户要求停止桌面控制，后续浏览器与命令行。P6.2–4及P7原候选不回退，四原文其余项不自动关闭；见[本轮验证](../changes/2026-10-29-p6-1-comfy-canvas/verification.md)。

2026-10-29 P8源码候选：Desktop/Web53，Mobile43/契约1.5不变；七组装配迁入src/app，App2002→1546，35函数/主JSX/28 CSS入口及产物内容hash不变。固定输入软件Edge四组DOM/PNG同态；硬件渲染差异与真实GPU/最终Native不据此关闭。主仓21文件与索引清单/patch已保全，4路径重叠；P8前后均复现Codex四失败，完整verify、当前独审与main/远端整合仍开放。详见[验证](../changes/2026-10-29-p8-composition/verification.md)；其他P/STD/ORG不自动完成。

2026-10-29门禁修复候选Desktop/Web54：TASK-MOD-CHAT-PROJECTION让实际聊天选择回调使用原projectChatView，立即刷新所选聊天草稿/执行方式/消息，其他聊天不变。49会话/根2379通过，原切换聊天两项恢复；首页预连接Agent的会话归属拒绝仍需修复，完整verify/独审/main继续开放。见[验证](../changes/2026-10-29-p8-composition/verification.md)。

### 2026-10-29 P8合流候选补充

P8七组hook迁出0b675ec7；会话选择派生投影修复f10147b9。Desktop/Web55空聊天fresh初始化仍在门禁核验，保护既有线程/忙碌/审批；夹具新建线程改独立ID，不能用重复ID掩盖跨项目保护。主仓21份未提交文件保全，main尚未合流。完整门禁、独立上下文review、当前Native和真实GPU均不得提前标完成。见[验证](../changes/2026-10-29-p8-composition/verification.md)。

2026-10-29补充：HOME-SESSION收窄许可7280dc3a已独立84项复验关闭IR-P8-01。COMFY-RECOVERY（Desktop/Web56）候选修复IR-P6-01/02，根2391/20skip及类型/增量lint、Rust1/Canvas浏览器通过，等待提交SHA补审。完整901首跑中断不得称通过；默认origin/main治理和113/7分叉仍需解决。主仓21文件再次逐SHA确认未变，四重叠路径三方预演均有冲突，未写main。

2026-10-29交付门续修：78beb7a9获授权只读独审限定代码PASS，后续SHA须补审；PR81仍draft，main未合。完整浏览器停在447/901（339通过/108失败，无退出码），不得称全绿。根显式声明契约semver依赖/类型，隔离干净安装及两端类型通过；补契约源码桌面构建指纹和协议类型命名。产品版本仍Desktop/Web56、Mobile43；默认baseline/Hosted及全套浏览器继续修复，真实GPU/最终Native未验。主仓Figma审计保全及四文档其他开放任务不关闭。见[验证](../changes/2026-10-29-p8-composition/verification.md)。

2026-10-29聊天交付修复候选：Desktop/Web2.1.57，Mobile43。文本成功结果按原聊天归属回写；断开连接时只读恢复本地聊天历史，保留切换后草稿、其他聊天和已删除请求。75项定向RED→GREEN；当前SHA完整检查/补审另记，PR81仍draft/main未合，339/108的部分浏览器结果不冒充完整901。见[验证](../changes/2026-10-29-p8-composition/verification.md)。

2026-10-29续修：cc8e5f7c聊天交付获正式独审PASS，根2405通过/20跳过、原浏览器3/3、design9/9、开发插件与官方57桌面构建通过；未运行GUI/GPU。新58候选修目录通知覆盖未保存能力草稿，原浏览器RED→GREEN；同一保存按钮locator更新，原持久断言保留。独立目录解析/取消/归属缺陷及测速文案/JSON规格冲突仍开放；默认origin/main verify3项、远端冲突和901全套继续阻断合流。主仓21份审计原件未改。见[验证](../changes/2026-10-29-p8-composition/verification.md)。

58最终UI门补充：412行边界失败已按真实职责提取ModelDisplayFields、父组件387行，AST及UI门通过，类型/增量lint/根2405通过。当前最终源码、review、浏览器、桌面哈希及主仓保护以工程外final-receipt-58.json为准；未合main，目录安全与默认基线继续开放。

2026-10-30交付推进：新备份主仓21份Figma审计原件，未stash/覆盖，main仍c2a0228a；远端68冲突及默认CI基线3失败继续阻断squash/回收。ORG6在任务树迁1200份E2，60清单/新目录恢复/66关键图保留/30活跃文件保留，净减159410793B（62.8149%），历史断链86→86、布局基线578→88；根2405通过/20跳过及类型/增量lint通过。真实Comfy改先用已有H3视频模型，隔离运行依赖准备中；图片仍未验。当前SHA审查/完整门/main仍开放，其他四文档任务不关闭。见[验证](../changes/2026-10-30-main-physical-org6/verification.md)。
