# AI handoff

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-10-18
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

本文是最短恢复入口，不是任务状态或产品能力的第二事实源。任务状态只读 [`task-ledger.json`](task-ledger.json)；当前项目事实只读 [`PROJECT_STATE.md`](PROJECT_STATE.md)；历史验证只按带日期的 change package、commit、运行模式和 receipt 回读。

## 当前恢复入口：Gateway本地增量流（2026-10-18）

TASK-GATEWAY-STREAM-20261018 IN_PROGRESS/NOT_VERIFIED，branch fix/TASK-GATEWAY-STREAM-20261018/base00e79cf0，复用原审计树。先读[规格](../changes/2026-10-18-gateway-stream/spec.md)、[计划](../changes/2026-10-18-gateway-stream/plan.md)和[验证](../changes/2026-10-18-gateway-stream/verification.md)。154项90DONE/64开放，9树18分支/预算5/4；无真实Provider/额度调用，父Gateway保持PARTIAL。root独占文档/版本/Git/端口/Native，实施者只写窄源/测试，无文件删移。

## 上轮恢复入口：冷启动严格比较已闭环（2026-10-18）

TASK-COLDSTART-LOCAL-20261018有界本地DONE/PASS，产品8735ad13/完整验收源d5a24d60，branch fix/TASK-COLDSTART-LOCAL-20261018/base fe103d2b，同一审计树。先读[当前验证](../changes/2026-10-18-coldstart-local/verification.md)最后一节和PROJECT_STATE。Desktop/Web2.1.40完整verify/源码双轴/官方EXE41523db8通过；真正默认库无CDP两周期11份完整JSON与raw严格相等、全部时间/revision2698保持，9项目11chat22消息，独立724e2a1f通过。只读UI两启闭可编辑标志/完整canonical资料另独审651c2e7c，不声称新回复或全网络禁用。

153项90DONE/63开放，9树17分支/approved5/4，冷任务关闭时6开放route零失配；37功能成熟度不变。9树原141dirty及refs/index已保全，主仓96另存且并发旧63比较FAIL如实保持，完整资料2849份原副本独立匹配；不回退2696或覆写新资料。旧真实FAIL/拒收/EXE保留。接续Gateway本地增量流专项，Native Canvas当前40实际专项待独立审查后据实登记；最终文档HEAD/Delivery/归档/日常入口按精确收据裁决。root独占文档/Git/端口/Native；不删除/移动、回收、真实生成、push/merge或发布，coord不作本候选权威。

## 上轮恢复入口：侧栏持久化与宽图桌面（2026-10-18）

TASK-SIDEBAR-CANVAS-20261018有界本地DONE/PASS / fix/TASK-SIDEBAR-CANVAS-20261018；base ab2ceef0、产品source50412d4e / Desktop-Web2.1.39。先读[验证](../changes/2026-10-18-sidebar-canvas/verification.md)、[审查](../changes/2026-10-18-sidebar-canvas/review.md)和PROJECT_STATE。精确完整854首试/0flaky、fresh新EXE四启闭/侧栏/宽图6状态/包往返、原库两周期9项目/11聊天/22消息与身份/草稿/选择保全通过，429竞态和V3夹具缺口已修复复验。原793的852/1flaky、f3b拒收及全部失败不重写；最终文档精确HEAD/Delivery/私有归档/两个lnk单实例还原按外部收据，不以旧SHA批准新HEAD。

152项89DONE/63开放，7树14分支/approved root5/4拒绝新建；37功能成熟度不提升。3无效route已unallocated且历史保留，main原63字节/index与69dirty和其他并行树保护。全部用户资料和旧v2/v3/失败/产物保全，最新完整2807文件副本独立hash匹配。不重放v2迁移、不删除/移动、覆盖、push/merge或真实生成；Gateway上游增量/真实回复、Mobile/Hosted/签名发布及用户整体验收仍开放。coord不作本候选事实源；日常lnk引用本树不可清理。

## 上轮恢复入口：本地剩余任务安全边界（2026-10-18）

TASK-LOCAL-GUARDS-20261018有界本地DONE/PASS / fix/TASK-LOCAL-GUARDS-20261018，复用原审计物理树，base e11b87a5；source92643d67、Desktop/Web2.1.38已完整本地verify、双轴独审及官方Native验收。先读[验证](../changes/2026-10-18-local-guards/verification.md)和权威PROJECT_STATE；最终文档SHA/Delivery/日常正常启动以工程外精确收据为准。9项目11chat/当前21条消息及v3/同身份保护，未发送新消息，不重跑旧v2默认迁移脚本。

当前151任务86DONE/65开放，7树13分支、approved root5/4拒绝新增；复用现有合法树。原63项主仓字节/index及并行69dirty保留。5历史branch→main路由已改未分配，旧值在verificationHistory；不能在main接着写。下一轮可先做侧栏pin/sort持久化、Gateway真实上游增量流、宽图连线/同状态Native验收。父任务保持PARTIAL；容器coord看板不读取此候选且git来源claim刷新有丢失风险，未接管该并行工具。root仍独占最终文档/Git/端口/Native；禁止删除/移动文件、清理日常lnk引用树、覆盖并发工作、push/merge/发布。

## 上一阶段：旧聊天迁移与编辑恢复（2026-10-17）

先读[计划](../changes/2026-10-17-chat-migration/plan.md)、[验证](../changes/2026-10-17-chat-migration/verification.md)和权威Project State。TASK-CHAT-MIGRATION-20261017 PARTIAL/NOT_VERIFIED，branch `fix/TASK-CHAT-MIGRATION-20261017`，实体树仍为原审计worktree；完整verify/Native source89b8291b。Desktop/Web 2.1.37（Mobile 2.1.1规划），冻结源码89b8291b；默认原9项目已迁移snapshot3、11个独立聊天上下文，repositoryId和原始资料保持；编辑、旧历史持久化及正常关闭重开证据见本轮验证。真实新回复仍未验收：Codex共享周额度100%、ordinaryUsageAllowed=false，发送前拒绝，/turn提交0；预计北京时间2026-10-23 04:08:15重置。未消耗reset、未购买额度或绕过保护。 继续时先读当前v3与immutable迁移manifest，不覆盖原库、不重放UNKNOWN、不再执行旧v2默认迁移脚本；额度解除后一次真实文本回复仍待验。原main69dirty/index、5worktrees/8分支及旧审计ref保护，仍禁止删除/移动，日常lnk引用本任务树。详细精确收据见本轮验证；无Hosted/发布成功声明。

## 前一阶段：审计修复本地收口（2026-10-17，历史）

先读[实际验证](../changes/2026-10-17-audit-repair/verification.md)和[独立审查](../changes/2026-10-17-audit-repair/review.md)。TASK-AUDIT-REPAIR-20261017仅本地A–D DONE/PASS；source `4699458de1c3437309b7cdc3f019454104c81fce` / tree `a1905e2aa6e11a24b4c62d829dc82a8f0d566972`，任务树`D:/kk-studio/.worktrees/TASK-AUDIT-REPAIR-20261017` / branch `fix/TASK-AUDIT-REPAIR-20261017`，Desktop/Web2.1.36、Mobile2.1.1规划。原main8c/63dirty/index与远端d95保持。

469完整verify exit0（Node1832/14既有skip、Agent199/2既有skip、产品Edge823首试、DESIGN41+8、development四步），精确源码独审PASS；Native不变源Rust213/1ignore+integration41通过。官方EXE b6299445/input a53dee81、隔离六检查和两个真实日常lnk正常关闭/重开均PASS，正常默认实例PID50136、无CDP。**默认旧聊天资料仍READ_ONLY，9项目raw/identity/shared memory保持；完整迁移/protocol7未完成，不能为了恢复编辑而解除保护。** 旧75/8026/d356 daily及helper失败、原件备份均保留。

149任务/85DONE/64开放；仅本审计新增DONE，原148对象与37功能成熟度/runtimeEvidence不变，26失效分配历史保留。4worktrees/26条目均不可据分类删除；用户仍禁止删除/移动原文件，E/F未执行。后续先按原任务接续完整多聊天/迁移、统一接入/12AI/持久垃圾箱、真实服务与用户验收；不要批量结案或把本机PASS当Hosted/main/发布。最终文档HEAD独审/正式Delivery由root提交后对应收据裁决；本轮没有push/merge/远端设置变更或付费生成。日常链接引用本任务树，不能清理该树。

## 以下为2026-10-16及之前的历史交接

原文保留其当时SHA、授权和失败；其中“当前/最新/实施中”均不再是本会话的活动写入分配，恢复必须先以上方当前入口和权威账本核对。

## 统一整理后的正式执行入口（TASK-GOV-006）

## 当前授权：统一修复与重构（2026-10-15）

先读 [统一实施计划](../changes/2026-10-15-kk-unified/plan.md)、[批准规格](../changes/2026-10-15-kk-unified/spec.md) 和 [验证](../changes/2026-10-15-kk-unified/verification.md)。用户已授权实施，不重复请求形式批准。当前 task branch codex/TASK-KK-UNIFIED-20261015；起点 d95e4c44 / 2.1.34，单个项目实现者串行集成共享 App/存储。日常235e7f79和其他候选保持原状。旧段落按其时点理解，不覆盖本次授权和当前实际验证。

最新恢复点：8e17九文件UI回归修复已精确独审，相关87/87首试，侧栏五锚点误差0、原Figma断言未改；Node1508PASS/14skip及静态/build通过。原55a0完整verify Browser804/811、7失败、exit1仍保留，未新跑完整verify或Native。ADR022/023已接受并独审，多聊天实现者正独占App/快照/聊天/Agent共享核心，本地安装实现者只写独立适配器，root保留main/Cargo、全局tokens、版本及任务文档；Cargo/dist/1423/Native逐项协调，提交仍一律逐文件lease。此前项目Edge27、12AI适配器73、加载草稿/格式/硬件/DESIGN/设置/Native基础及模型A独审仅各自范围有效；模型B/C、完整多聊天/安装、媒体、全局UI、共仓库、账号与同步仍开放。55a0实际Native单实例/重开/清理通过、前台focus仍失败，整轮PARTIAL。root node_modules为本任务实体依赖，vendor链接目标只读、不能安装；外部56cb1381及保全目录保留、完整恢复未验。用户本会话独占写入、其他任务只读，不重复主仓清理/切换。详细失败、实际模块和验收边界见统一verification，不能用基础子范围代替完整方案。

当前任务先读[HOME验证](../changes/2026-10-15-home-recovery-integration/verification.md)及[依赖事故](../changes/2026-10-15-dependency-repair/verification.md)。当前HOME fix/TASK-CODEX-HOME-20261015-main：冻结源码a85完整verify/785首试、官方新EXE/Native38及Rust167通过，精确本机结果独审通过，正式PR/Hosted/main继续。main仍492/2.1.33，候选2.1.34；尚未切daily/碰九项目。原失败和依赖事故未知影响保留，额外加载期草稿问题TASK-HOME-LOAD-DRAFT-20261015待下一串行任务。

历史首轮限制（已落实独立输出/完整备份）：af8精确HEAD完整verify已新跑PASS；但测试默认目录清理移除了旧开发态原件，不能再声称其旧路径可读。先读[事件](../changes/2026-10-15-unified-execution/incident.md)，下一执行先落实TASK-VERIFY-EVIDENCE-20261015保护，再承接GDI。

历史首轮接管记录：先读[本轮首轮验证](../changes/2026-10-15-unified-execution/verification.md)和[新增历史续读](../changes/2026-10-15-unified-execution/history-readback.md)。原始交接包保持原hash；旧段落是整理会话时点。12可读目标续至末尾、6接口仍受限；GDI候选真实Windows参数与100页保护已新验。PR61尚待当前Hosted，不关闭日常窗口、不动九项目；下一步正常合治理PR/main复验后，从实际main只承接af8。总目标仍IN_PROGRESS。

整理会话当时要求（历史）：本轮仅安全交接与整理，确认后另建正式执行会话，不在整理会话实现产品或再向旧会话派功能。先读[唯一接管提示词](../changes/2026-10-15-unified-handoff/takeover-context.md)、[原始授权](../changes/2026-10-15-unified-handoff/source-instructions.md)、[会话状态及覆盖缺口](../changes/2026-10-15-unified-handoff/session-inventory.md)、[归并/合入顺序](../changes/2026-10-15-unified-handoff/resume-order.md)与[验证](../changes/2026-10-15-unified-handoff/verification.md)。当前事实以PROJECT_STATE为准；192来源机器矩阵只维护在原task-ledger的TASK-GOV-006.handoffMatrix，Markdown仅派生。下面HOME/REF入口保留历史时点，不代表当前尚未合并或最新用户偏好。

PR58后续来源按用户补充记在原TASK-GOV-006.sourceUpdates：reported head06f5fde9而旧正文26f过期；到依赖时重新读远端/独有提交及GDI重叠，不继承旧验收或断言MCP CORS已修复。当前GDI顺序不变。

## Codex 卡片参考图恢复入口（TASK-CODEX-REF-20261015）

先读[本轮验证](../changes/2026-10-15-codex-card-reference/verification.md)与[审查](../changes/2026-10-15-codex-card-reference/review.md)。功能/live PASS，交付PARTIAL：Desktop/Web2.1.33；参考原件42452f4d...经一次真实Codex内置imagegen生成PNG6531e6ac...并归档，1result/1result边/1reference边，外部图片请求0；重载、正常关闭/重建/重启、原桌面快捷方式重开PASS，原件hash不变且重启turn0。最终EXE6353aba3.../inputee1e43be...、reason=current、bundlevihgOeA0。Node1327PASS/14skip、Agent199PASS/2skip、定向45/dirty预检50及browser13/邻域39分别PASS；完整browser784为771PASS13FAIL/0flaky/skip，13项已由任务前源码逐项同断言重现为PRE-EXISTING FAILURE，但fullverify仍FAIL、development未运行。最终SHA正式review/Hosted/PR未完成。 源码来自独立TASK-CODEX-REF工作树并受保护整合入活动HOME候选；保留其他作者更新。最终官方重建34.96秒，现有桌面快捷方式未重写且已启动原资料root/无--data-dir。自有隔离实例正常关闭，无关PID37780未触碰。后续修复有效全量门禁并补最终SHA正式review/Hosted/PR；不提交/推送，不把整体写为DONE/REAL，下方HOME与历史恢复原文保留。

验收后并发漂移边界（2026-10-15T06:48:06Z）：其他任务随后修改无关Rust项目包/vendor/runtime/build输入及dist；native/closeout-source-drift.json最新reason=unverified，当前input627e5b40...，受测inputee1e43be...。此前真实验收/日常重开及EXE6353aba3.../本任务App23a0625a...、agentConnection52a1d8db...仍有效且字节未变，日常PID57824继续运行受测2.1.33；不能宣称最新整个checkout已验收。不继续重建、关闭或覆盖其他作者工作，整体PARTIAL。

## 本轮恢复入口

先读[本轮intent](../changes/2026-10-15-codex-home/intent.md)、[spec](../changes/2026-10-15-codex-home/spec.md)、[计划](../changes/2026-10-15-codex-home/plan.md)与[验证](../changes/2026-10-15-codex-home/verification.md)。TASK-CODEX-HOME-20261015进入REVIEW/整体NOT_VERIFIED，候选Desktop/Web2.1.33。full5前置Node1327/14skip、Agent199/2skip与静态/build通过，784浏览器单结果首过/retry0，845源码/测试冻结逐项相同；但development因另一任务占用1421而steps=[]、完整npm verify exit1，未杀进程/复用server。新EXE8f633...实际export/preflight/import及新root冷开1370×1148图文/Codex缺省恢复通过；Rust167/包30、旧EXE TaskHost隔离重跑11PASS均限各自范围，首轮失败保留。精确提交独审及Hosted必须真实跑完整verify/Delivery，之后才考虑普通合并、main与实际本机更新。

canonical仍按7项目/rev2057与before-state95df5c81...保护，4602source不变。candidate1真实生成后用户在独立窗口删图/编辑，恢复边界另见verification：用户最新授权两次窗口编辑分别恢复两个新ID副本，all-input已核对2项目/各2cards/1共享asset，canonical未写且不覆盖原7。整项目包导出因旧媒体未归档拒绝，保留失败；独立副本计划已编码校验但尚未写canonical，不能提前称恢复成功。candidate2已有字段保持，仅一旧empty项目新增空reviewComments/stagePlans，不声称整对象byteexact。另有人类TASK-CODEX-REF写回卡片参考图/版本33，root准备明确来源纳入最终组合review/fullgate；不碰其docs/ledger或代填DONE。跨聊天发消息授权未收到且未发送消息。后续真实门禁后先REVIEW，产品合并及本机更新实际完成后纯文档closeout，premerge不DONE。

PR59已合main cbda、旧UI任务及实际2.1.31激活收束；旧verification与失败保留于历史，见[前置闭环](../changes/2026-10-15-codex-home/verification.md#前置闭环task-ui-full-20261015历史范围)。下面段落是此前阶段事实，不再表示当前main尚未合并。

### 此前2.1.31恢复入口（历史）

先读[最新2.1.31验证](../changes/2026-10-15-ui-full/verification.md#2131-当前本地验收)与[计划](../changes/2026-10-15-ui-full/plan.md)。当前eb5基线加scope恢复layout同步/单回归/版本31，verify9 761首试/0retry、fresh Native10 105项/13图与TaskHost current6无注入11项分别PASS，自有进程退出及端口释放已实查。旧eb5 push759+1flaky严格NON_PASS与旧PR760首过不互相代填；原失败、因果与HTTP guard范围集中最新验证。Native4默认profile自动连接paused、原值NOT_RECORDED，不猜恢复，可模型接入重新连接。最终head、独立base694→head审查、新Hosted/Delivery、普通PR59合并及main/post-main待验，main694未合并；REVIEW/整体NOT_VERIFIED，原138任务、其他功能、primary文件/index、历史与Mobile规划保持。

### 此前2.1.30恢复入口（历史；最新状态以上方为准）

先读[最新2.1.30验证](../changes/2026-10-15-ui-full/verification.md#2130-当前本地验收)与[计划](../changes/2026-10-15-ui-full/plan.md)。当前d50基线加侧栏12行CSS/4新case/版本30，verify8 760首试/0retry、Native9 87项/13图与TaskHost current5无注入11项PASS，资源current、自有进程退出及端口释放已实查。Native4默认profile自动连接被暂停，原值NOT_RECORDED，不猜恢复；可在模型接入重新连接。旧Hosted、单位夹具及HTTP guard范围见验证。最终head、独立base694→head审查、新Hosted/Delivery、普通PR59合并与main/post-main待验，main694未合并；REVIEW/整体NOT_VERIFIED，原138任务/primary文件/index及Mobile规划保持。

### 此前2.1.29恢复入口（历史；偏好例外以上方勘误为准）

先读[最新2.1.29验证与勘误](../changes/2026-10-15-ui-full/verification.md#2129-当前本地验收)和[计划](../changes/2026-10-15-ui-full/plan.md)。当前94e基线加CLI卡片/版本29/TaskHost夹具差量，本地verify7 756首试/0retry、Native7 78项/12图与TaskHost current4无注入11项PASS，input/EXE同字节current。历史同式guard安全证明撤回、当前正向IPC证据与actual3 UNKNOWN见验证。最终head尚未形成，下一步独立base694→head审查、新Hosted/Delivery、普通PR59合并与main/post-main；main694未合并，REVIEW/整体NOT_VERIFIED。原138任务/primary/index/Mobile2.1.1规划不变。

### 此前2.1.28恢复入口（历史，安全结论按上方勘误）

先读[verification最新2.1.28本地收据](../changes/2026-10-15-ui-full/verification.md)和[计划](../changes/2026-10-15-ui-full/plan.md)。当前2d4be5fca4c2167d4bc0d500634645624f311505+最小设置字段同步修复/版本2.1.28/测试/docs尚未形成最终head，本地完整verify-6 PASS（Node1304/14skip、Agent199/2skip、Browser747首试/0实际retry、UI242/0与development四步），fresh官方Native5 56/0/10图及新版TaskHost11/0/secretcleanup true，verify后input/EXE同Native5完整哈希且current。Native2/3/4前置夹具失败、54/2d Hosted失败与mixed诊断边界全保留，sidebar原缺trace根因UNKNOWN。main fetch仍694 / PR59未合并；下一步最终head独立source/integration审查、新Hosted完整门禁、普通合并及main/post-main。任务REVIEW / 本地PASS / 整体NOT_VERIFIED，Mobile2.1.1规划与其他功能状态不变。

### 此前2.1.28完整验证前冻结入口（历史保留）

先读[当前验证](../changes/2026-10-15-ui-full/verification.md)文末2.1.28阶段及[当前计划](../changes/2026-10-15-ui-full/plan.md)。提交基线2d4be5fca4c2167d4bc0d500634645624f311505上最小ProviderModelCatalog字段同步竞态修复与Desktop/Web2.1.28候选未最终提交；build与settings42定向PASS，2.1.28完整verify/fresh Native/资源身份及最终SHA独立审查待验。旧release2.1.27 TaskHost夹具11 PASS、0error、凭据清理true仅原版本范围。54 push38645320833 Repository verify exit0含746 PASS/1 sidebar flaky，后续Native旧菜单FAIL；2d push38647654947设置case初试/retry FAIL。冻结旧产品RED2三项全FAIL后最小layout同步修复；mixed race-red-1仅单case诊断，sidebar原缺trace根因UNKNOWN。main694 / PR59未合并，任务REVIEW/整体NOT_VERIFIED，Mobile2.1.1规划；等待root的新全量与Native收据，再终稿/提交/精确审查/Hosted/普通合并，不沿用旧版本PASS。

### 此前2.1.27托管与修复阶段（历史保留）

最新54a2 aggregate PASS/Delivery706/0后quality38645328109 Node1301PASS/1FAIL/13skip，仅gateway首次ready超时；无child日志，alive/crash UNKNOWN，未POST/Provider/恢复/Browser/Rust，时长variance不证明slow CI。单测试启动握手84+/14-保留20s/恢复断言，preload7s RED→延迟4GREEN/focused21PASS，真实8.3 Node1304PASS/14skip与lint/typecheck/format PASS。非完整verify-6，产品不变、Browser747/Native56/Rust163沿用；新head独立复审/Hosted/PR59/main及旧54 push38645320833结果待验，REVIEW/NOT_VERIFIED、main694。

最新阻断：c498独立exact aggregate review PASS，quality38643592443 snapshot3/0后Node1294PASS/8FAIL/13skip，Windows agentPackage发布fixture的非canonical short TEMP被既有no-link guard拒绝，Browser/Rust未运行。source agent只修测试realpath；安全脚本/回滚断言保持。fixture await realpath仅4+/1-，真实8.3 RED3PASS/8FAIL→GREEN11/11；首轮短TEMP Node1299PASS/2FAIL/14skip与canary1的失败是自建目录过深的git路径前置条件，原件保留。较浅actual8.3根下canary7PASS/3Linux skip、run2 Node1301PASS/14skip与lint/typecheck/format全部PASS。非完整verify-6；产品/config/Rust及安全脚本不变，Browser747/Native56/Rust163沿用原范围。最终修复head exact review/新Hosted待验，PR59未合并/main694，REVIEW/NOT_VERIFIED。

TASK-UI-FULL-20261015 REVIEW / 整体NOT_VERIFIED（本地验收PASS），先读[验证](../changes/2026-10-15-ui-full/verification.md)、[覆盖矩阵](../changes/2026-10-15-ui-full/coverage.md)与[计划](../changes/2026-10-15-ui-full/plan.md)。工作树 D:/kk-studio/.worktrees/branch-consolidation-20261011，branch fix/TASK-UI-FULL-20261015，当前source `241f3050124ad7773ced0b47a55629373177205e`，Desktop/Web2.1.27、Mobile2.1.1规划。main694已本地承接为1653966f，104实际冲突/25自动差量逐项审计、21历史blob保全；远端origin/main仍694，尚未PR落地主线。15包/原任务branch/status与primary254条dirty/index、109登记worktree保持。

165完整verify在Browser740PASS/5FAIL处退出，Node1295PASS/14skip、Agent199PASS/2skip、UI242/0与Rust163等通过不代填完整PASS；正式source/integration review三P2均CHANGES_REQUIRED。241修复text纯prompt、坏audio及rightpan，连同首页16:9/旧fixture修正后14条定向GREEN，source241/integration241精确复审PASS关闭三P2；官方隔离Native56checks/0errors与资源字节身份、owned正常关闭均PASS，完整verify-3已PASS：Node1295/14skip、Agent199/2skip、Browser747/747首试、UI242/0及development；f090最终doc/test-only独立aggregate review已PASS，ready PR59已建立。原79/50、首次五失败、有效RED/误设夹具勘误均保留；收据在D:/kk-studio/.analysis/ui-full-20261015。verify-2音频selector双匹配夹具失败与修正后实际播放2PASS保留；首次Hosted quality38641803780 verify在snapshot检查、产品测试前FAIL，外部父目录依赖由root只修scripts/tests；Gitguards push/PR与governance/delivery/deploy-linux PASS。有效RED2FAIL/3PASS、定向24PASS与verify-4 lint失败/继承JSON NOT-RUN均保存；完整verify-5无外部env exit0（snapshot3/0、Node1301/14skip、Agent199/2skip、Browser747、development四步），显式外部4/0 PASS。Native仍current/input与EXE不变；CLI24/offline AI-evals为有限dirty预检，最终修复head待root提交后exact-SHA复审/新Hosted/main待验；产品/Rust/Native源字节未变。main694未合并，不沿用旧2.1.26产物或165 review批准后续head。

### 此前2.1.26基线（保留历史）

TASK-UI-DETAILS-20261015 本地DONE/PASS。先读[验证](../changes/2026-10-15-ui-details/verification.md)和[审查](../changes/2026-10-15-ui-details/review.md)。当前Desktop/Web2.1.26工作区 D:/kk-studio/.worktrees/branch-consolidation-20261011 / fix/TASK-UI-DETAILS-20261015；base18e143f，产品ab878ffd。用户五处细节已统一：紧凑设置、首页/Agent职责、控件形状与尾组、空/非空上传、扩展轴线。完整verify退出0：Node1278/14skip、Agent199/2skip、browser635首试、UI239/0及development PASS；精确源码独立审查与新官方Desktop38项Native PASS，EXE0f65d382/input864b0376，production JS/CSS和当前dist同字节。现有快捷方式同路径，下次打开是新版；两个owned实例均正常关闭，未接管日常资料。所有失败记录在D:/kk-studio/.analysis/ui-details-20261015，primary旧dirty/index保留。Mobile2.1.1规划、真实Provider/Hosted/签名及用户视觉接受继续分别开放。

### 此前2.1.25基线（保留历史）

TASK-SETTINGS-LATEST-20261015 本地DONE/PASS。先读[验证](../changes/2026-10-15-settings-latest-ui/verification.md)和[审查](../changes/2026-10-15-settings-latest-ui/review.md)。最新UI基线c1fae190，当前2.1.25工作区 D:/kk-studio/.worktrees/branch-consolidation-20261011 / fix/TASK-SETTINGS-LATEST-20261015；源2a4e66d1，完整verify784039e7，独立源/测试054cd53f。Desktop快捷方式已指向此工作区，正式新建EXEc9c3b4e/input2a09db54；最新1280/240/192绿色和手机分级导航有Web/Tauri当前证据。原primary51fcc+428a旧基线保留源码/index恢复，不据此启动最新版；旧截图、旧2.1.24包和历史PASS不代填新差异。

本次629浏览器首试、Node1278/Agent199及原skip14/2、UI242/0、development5步，Native20+11+1+5均PASS且owned凭据/fixture清理。全部失败与旧Native浏览器route纠正保留，工程外证据 D:/kk-studio/.analysis/settings-ui-latest-20261015。Mobile2.1.1、真实账号/付费Provider、Hosted/签名及用户视觉验收继续按原开放任务分开验收。

### 此前2.1.24交付基线（保留历史）

TASK-223-ACTIONS-20261014：Desktop/Web2.1.24产品58b5c07f34718769e10b76c89d510615bea2fefc，本地授权范围DONE/PASS。先读[验证](../changes/2026-10-14-action-usability-223/verification.md)及[独立审查](../changes/2026-10-14-action-usability-223/review.md)，按最终收据回读实际官方/便携Native与CLI、输入哈希、最终纯文档和output；不复用64fc失败或旧0e的过期产物身份。保留primary dirty/index、原资料与全部历史失败；手机布局/主题/独立背景沿用确认版本，Native Mobile2.1.1、真人账号/付费Provider/Hosted/签名及人工验收仍分别开放。

### 此前2.1.23交付基线（保留历史）

TASK-222-ACTIONS-20261014：Desktop/Web2.1.23本地授权修复已完成，产品HEAD为b4fa7b0e，最终纯文档提交与产物由工程外current-release收据绑定。恢复时先读[验证](../changes/2026-10-14-action-usability-222/verification.md)和最终独立补审，不复用旧2.1.22或中断回执。保留原资料与已确认手机布局；Native Mobile2.1.1、真人CLI/付费Provider、Hosted、签名安装与实体手机等验收仍分别开放。

### 此前2.1.22交付基线（保留历史）

TASK-PROTOCOL-CLI-20261014：Desktop/Web2.1.22产品da6141e6完整verify通过：551浏览器首试、Node1214pass/14既有skip、Agent172pass/2既有skip、UI241/0、development5步骤PASS；Rust163与原生源一致性确认，独立源码审查PASS。官方Agent构建、真实Tauri22项和同字节便携目录23项通过，5协议文本均保存/重载/GET检测/NativeTaskHost一次POST/结果恢复，无重复；4取消/超时场景实际socket关闭且目录字节保持。手机为响应式WebView/Web，非Native Mobile。新依赖0，入口gzip增加3247B<16384；4278生产白名单519462029B，其中8个缺失的当前平台Codex必要文件407521436B已恢复，不把旧残包当同功能体积基线。原资料身份、primary dirty/index和历史失败保留。最终ZIP/源码/Web/恢复与哈希由工程外current-release收据绑定；Hosted、真人CLI安装/登录、付费Provider、签名安装器、日常资料和人工视觉验收继续各自开放。按[验证](../changes/2026-10-14-protocol-cli-completion/verification.md)与工程外当前哈希收据恢复，不能把旧回执覆盖到新源码。

### 此前2.1.21基线（保留历史）

TASK-UI-CONSOLIDATE-20261014保留2.1.17冻结与2.1.18中间候选；最新主目录2.1.20一致源f2b0466的凭据恢复、Agent展示和画布同步已逐项承接。当前Desktop/Web2.1.21产品7a463742完整verify通过（545browser首试、开发5步骤）、真实Tauri9项检查及0e/7a独立源码复审通过，账本133项。CLI随包桥和绝对路径命令已实测字节身份，仍使用用户已有Node/npm环境。按[验证](../changes/2026-10-14-ui-consolidation/verification.md)回读工程外最终分享包/源码/恢复增量收据，后续从此版本继续[开放计划](../changes/2026-10-14-ui-consolidation/plan.md)。原资料、历史失败与在途源保留；Native Mobile、未接协议、Hosted、安装器和用户资料/视觉验收分别开放。

## 2026-10-13 历史恢复快照

- canonical repository：`D:/kk-studio/KK-Studio-2.0`
- branch：`codex/ui-redesign-20261011`
- HEAD：`51fccfc7879cf90f7caaf3ae8e10af4d97a2aa2c`（dirty 集成；原暂存区保留）
- local `origin/main`：`694a00607f6f63de1b8c43d0ebb117adf5d34f67`；本轮只回读本地 ref，未 fetch
- worktrees：103 个登记项；当前 git inventory，未删除或移动其他 worktree
- task ledger：126 records; 75 DONE, 32 PARTIAL, 11 TODO, 4 BLOCKED, 4 REVIEW; 51 open records.
- 当前分支为 dirty 开发集成，不是已发布的 `origin/main` 树。TASK-AGENT-RECOVERY-20261013 已取得完整本地、canonical Tauri 和系统凭据证据；Hosted、真实 Provider、签名、安装与用户视觉验收保持各自边界。

## 权威顺序

1. 用户当前意图与已确认范围。
2. `AGENTS.md`、`AI_RULES.md` 和专项规范。
3. `docs/governance/task-ledger.json`：任务状态、负责人、依赖和证据唯一来源。
4. `docs/governance/PROJECT_STATE.md`：当前事实。
5. 本文件：恢复顺序和短入口。
6. `docs/changes/<date>-<task>/`、`docs/evidence/`：历史或范围化证据，不覆盖当前状态。

同一任务或文档更新时沿用稳定的 `taskId`/`docId`，更新 `updated`/`updatedAt`；不通过复制一个新日期文件制造第二条 current。旧入口写 `status: superseded`、`supersededBy: <新入口>`，历史证据保留原 commit 和含义。

## 本轮治理边界

- B1+B2 已在本分支提交并保留原验证记录。
- `R+B3-1+B3-2` 当前改动：文档生命周期门禁、任务快照刷新、本入口瘦身。
- B3-3、B4-1、B4-2、B4-3 未授权，禁止在恢复过程中删除、移动、取消跟踪、合并或清理 worktree/二进制/临时目录。
- 当前变更记录见 [`docs/changes/2026-10-12-governance-currentness/`](../changes/2026-10-12-governance-currentness/)；P1 前序记录见 [`docs/changes/2026-10-12-p1-audit-closeout/`](../changes/2026-10-12-p1-audit-closeout/)。

## 恢复顺序

1. 运行 `git status --short --branch`、`git rev-parse HEAD`、`git rev-parse origin/main` 和 `git worktree list --porcelain`。
2. 读取本文件、`PROJECT_STATE.md`、`task-ledger.json`、相关 change package 的 `intent/spec/plan/verification/review`。
3. 检查 task ID、文档 ID、`updated`/`updatedAt`、`status`、`supersededBy` 和 exact SHA；旧日期只能作为历史线索。
4. 只在当前用户授权范围内继续；发现源冲突时记录 `CONFLICT`，缺证据时记录 `UNKNOWN` 或 `NOT VERIFIED`。
5. 完成修改后重新生成 `TASK_LEDGER.md`，运行适用的治理、文档、格式和测试门禁，并把命令、退出码和当前 SHA 写入 verification。

## 历史恢复锚点

本文件被瘦身前的完整历史内容仍可从 Git 祖先提交 `7f29db98a00a9f0662c9a0dd8909337a988a4baa` 的同一路径读取；不改写或伪造历史验证。后续历史材料以 dated change package 为准。

## 2026-10-13 分类修复恢复入口

TASK-UI-CLASSIFY-20261013：[验证记录](../changes/2026-10-13-capability-ui/verification.md)。canonical 已集成本轮分类与交互修复；基线 51fccfc7，任务隔离分支 fix/TASK-UI-CLASSIFY-20261013-capability。用户补充的模型弹层批量/数据项已移除，相关 40 项定向回归通过。最终 Web development 7 项、preview 7 项、Desktop 2.1.14 14 项实际验收通过，原生 Agent 可用/启动/健康/停止通过；全量浏览器 492/495，余下 3 个既有 UI 失败列在 verification，独立补审通过，任务保持 REVIEW/PARTIAL。预存 WindowControls、mic 与两份测试哈希及空暂存区均保留，未推送或正式发布。

## 2026-10-13 自动恢复交付入口

TASK-AGENT-RECOVERY-20261013：[验证](../changes/2026-10-13-agent-recovery/verification.md) / [独立审查](../changes/2026-10-13-agent-recovery/review.md)。生产源6f8ff257、完整门禁59c013ce，canonical HEAD51fccfc dirty保持原index。官方2.1.16重建及Agent38/38、凭据6/6正常重开通过，桌面快捷方式已重新生成。打开自动恢复原线程，主动断开保持暂停；API秘密在Windows凭据库、输入不回填。本任务 DONE/PASS，最终交付文档独立补审通过；未合并/推送/发布，未知线程仍拒绝接管。

## 日常 APP 实际验收补充（进行中）

用户授权正常关闭/重开默认数据APP并直接修复。2.1.16实际83652→87180恢复同项目/thread，API metadata未变；主动断开后87180正常exit0→75784仍暂停。原当前API ref在关闭前就是missing，不将配置active冒充实钥保留。聊天横幅危险色/按钮未同步已RED，共享2.1.17修复和最终复验在执行中；原2.1.16证据保留。

## HOME Native中间失败记录（历史时点：2026-10-15 f10）

当前HOME main承接分支f10后修复中。实际重开两次FAIL对应HOME-NATIVE-01：恢复诊断占用私有stdout握手预算，已真实stdio RED/GREEN；保留Rust限制和原connected断言，新冻结全量/官方重建/实际重开与独审仍待。工程外证据home-native-diagnostic-f10c59ff及home-stdio-*.log，daily/用户资料未用作夹具。不要把旧fc完整verify或f10构建当新源码通过。

当前补修：独立最终审核发现首次全量852项含1flaky（851常规通过），并定位429健康标记晚于保存/终态的真实竞态；本子任务重新IN_PROGRESS，父侧栏/宽图仅旧source793范围已验。新修复/新EXE与完整验证待完成，最终交付暂不放行；原错误汇总/审核/失败完整保留，见本轮verification。
