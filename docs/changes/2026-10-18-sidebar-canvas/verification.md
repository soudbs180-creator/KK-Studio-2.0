# Verification：侧栏持久化与宽图连线

TASK-SIDEBAR-CANVAS-20261018：有界本地DONE/PASS；base ab2ceef0 / 产品source50412d4e；[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。

## 当前冻结验证与桌面收口

产品source `50412d4e51e07a488bd9ad0e1cee03dd48f58998`，Desktop/Web **2.1.39**，Mobile2.1.1规划不变。项目和文件夹置顶、manual/recent/priority排序复用CreationSnapshot/CAS持久化；宽图共享几何已修复。完整验证发现的429保存竞态也已修复，连接冷却/隔离先于失败终态与保存，身份、取消及租约条件保留。

精确504完整 `npm run verify` exit0：Node1960PASS/14既存skip、Agent204PASS/2既存skip；浏览器854项全部首试PASS，0flaky/0unexpected/0skip，Design41单元+8浏览器、development4步骤PASS；lint/type/UI/format/build通过。结构化报告browser5557ed75-8fdb-4406-b992-89fbb57ca575 SHA859e03e9cbd08e2944c7a95803548a2cf5fc19b0f693775cd7bce8a2be960bec；Design f410c745、dev9e8120da；原日志full-verify-50412d4e.log和structured-audit.json保留。Rust源自793以来逐字节未变，冻结前cargo fmt/test的228PASS/1既存hardware ignore+41集成仍按该相同源码绑定，不冒称重新执行硬件测试。

官方当前EXE SHA `e9caebca3b2203bfe4731dfcc6afb3ab7b0b179c6bdcd7ef886521a263a6d42c`，input `54171d71b0eaa87708361abee6c5d5a2564eea84f7ae319adcfca5811ffbff40`；build收据 `native-build-101c2a7c-5014-46ae-a20c-dc6c4bb2ad17.json`，白名单4282个Agent文件源/随包全部逐项匹配，无Agent包轮转或共享依赖安装。实际Native加载 `/assets/index-BKPyThUX.js` SHA `79ae21a2747855fa002bb3bba8bf16d5745051b06b36aae43666681cdad7e462`，CSS index-DfNLqnic.css/SHA c705166358c5aced1c6efe6abe3d85dfc2182ff4a04de6cb5c48455b4506987b均与dist字节一致。

fresh Native `run-ba582e2c-7b53-44f6-9648-730d8e348fde/report.json` SHA `38e1cb05283ee558c2a5a6d8d8963fac981f9d30903c5e8088eb5e4c4498a5a7`：38项检查PASS、四次正常启闭；项目/组置顶、取消置顶与三排序操作及priority重启保持、真实新建/改名/合成项目原生确认软删恢复、项目库同ID、新root项目包完整往返通过。实际client1280×720/DPI1.5，宽图1200×300三缩放×双编辑状态6/6真实SVG/DOM端点、剪线中点、拖线持久化、端口/生成按钮命中和间距通过；root查看了新产物同状态截图。未点击生成。

原默认库 `native-sidebar-canvas-default/64692857-be6c-4da9-bd13-22d7d97b1dcf` SHA `c14a76ef8c1dc7865ff60e48e1fab2eb6683bc4598cfaa0920962a6762dc9b36`：两次真实正常启闭PASS，9项目/11聊天/22消息及canonical草稿/选择/图关系、repository身份、不可变迁移候选/完成记录和memory保持，编辑器enabled/readOnly=false、0pageErrors，验收后0Native。最近旧实例关闭前后已为22消息，不能回退到旧793报告的21条；harness不发新消息、不改原库草稿或选择；CDP附着前网络不可观测，应用内部Native IPC未instrument，不声称零内部调用，也不代填真实Provider验收。

资料保全：原7树110dirty/index/diff/all-ref/raw3、最初完整profile2763份及独立0差异证据仍保留。另2797份副本独立核验PASS（7edc8591）；发现旧39默认实例再次启动后，按PID44924/CreationDate/EXE精确核对并保存启闭前后原数据，CloseMainWindow正常关闭，receipt1b991b3d，来源未知，不推断为用户或其他AI。最新完整profile2807文件/350182148B源副本同区间PASS，receipt d2ef496414ff22861d0d74665a55db0e1b377483eb62d6c709fc5b2b90b7f184；独立只审保存副本2807份逐一hash/size/清单闭合PASS，receipt92c61ff9713177b6d8dbf1e95033d2a9899bcca187356c7b1c5f008bdc3a2e64。它不等于当前live永久不变；BrowserMetrics快照后过期的原失败未删除或改写。

152任务89DONE/48PARTIAL/11TODO/3BLOCKED/1IN_PROGRESS，开放63。本子任务与侧栏/宽图父任务仅有界本地技术完成，37功能成熟度/runtimeEvidence不提升。7登记树/14本地分支、approved root5/4，新增失败关闭、现树可复用；3条失效旧路由unallocated且历史完整。main原63项字节/HEAD/index及现69dirty、其他并行树保留，WEB-RELEASE并发变化不归本任务，不声称全局refs冻结。

产品源码独立Spec及Standards补审通过，STD-ADR-001与STD-FIXTURE-004已关闭；旧英文提交命名P3保留不重写历史。最终文档精确HEAD补审、Delivery、私有全证据/源refs/当前产物归档和两个真实日常lnk同PID无CDP还原，以工程外最终收据裁决；无相应收据时仍不能认定最终交付。没有文件删除/移动、工作树回收、真实生成提交、额度reset、push/merge或发布。真实回复/上游增量、Hosted/签名/安装器/Mobile及用户整体验收仍开放。

## 原审查问题的最终源码关闭

首次793完整浏览器为852用例/853attempts、851常规PASS+1flaky，曾被root错误汇总为“851首试零flaky”。独立SPEC-FINAL-001/P2、STD-EVIDENCE-003/P1撤回签收，原报告、失败及f3b审核均保持。3e修复真实429保存竞态，实际IndexedDB持锁反例RED2/2后定向14PASS；精确3e全量854首试PASS/0flaky。Standards随后指出新增普通编辑用例默认v2种子不符合TESTING107；504已显式version3并从model公开serialize入口构造，严格断言未变，定向14和精确504完整854均首试PASS。中间35a误从snapshotCodec导入导致模块加载失败（未执行测试），日志provider-health-canonical-green.log保留，未写成产品回归。

源码Spec3e收据182dd81f，3e→504补审08d3372a；Standards3e保留P2收据ea100b26，504确认关闭STD-FIXTURE-004收据402f6fe5。原f3b两个CHANGES REQUIRED不改名为新HEAD批准。取消、连接身份、任务lease与成功后健康确认条件保留；通用跨tab read-map-set竞争未被本轮证明，不扩写保证。后续精确最终文档HEAD、Delivery和日常还原按独立外部收据核对。

## 原始阶段记录（历史原文，不批准当前候选）

以下均按各阶段原时点解释；其中“待验”“当前”或旧计数不覆盖上方精确504的新证据。

TASK-SIDEBAR-CANVAS-20261018：有界本地DONE/PASS；base ab2ceef0 / 产品source793ddaf3；[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。

开工保全：工程外D:/KK-Studio-recovery-20260921/sidebar-canvas-20261018-69e77b85-6d69-4f51-8602-a6c3236eb6c2，7树110dirty/index/diff/status、all-ref bundle与当前raw3主备/身份，逐字节核验PASS/refsStable=true；receipt SHA a1fd93418891649925211e938ef86ba0b98a7b9b683d9ca4c6d6c0e233287f93。原v2/v3和所有旧失败保持。

基线typecheck exit0，projectLifecycle/snapshotCodec/V3/projectPackage 42/42 PASS；lint日志.tmp/task-sidebar-canvas-20261018/baseline-lint.log。实际原Native仍2.1.38/PID79688，最终产品版本与新验收尚待收据。

只读根因：侧栏sort/pins为useState；宽图主体DOM逻辑高96.5，但共享anchor仍按旧padding/min222计算，上轮端口虽可命中却向下偏13.1775/14.6417/15.6875 CSSpx，SVG/当前Native真实反例待本轮。不能沿用上轮6状态命中PASS声明连线正确。

阶段一：domain/codec/lifecycle/Native/包已落地，113 TS PASS/0skip，Rust creation_storage 22与project_package 15 PASS；收据.tmp/task-sidebar-canvas-20261018/domain-implementation-receipt.json（ac01afc241a9d41a5efe70c9f7f5a861b780d842d834c356b5ab7619a4c18cab）。旧Web production置顶重载RED run8c973c81；新增排序/冲突RED run16c34309；后两轮测试harness失败均保留（phone390隐藏桌面入口、checked菜单名称含✓、空文件夹共享class选择器）；修正为真实tablet820入口/精准role，第三轮32/32 PASS/0retry，run日志sidebar-browser-green-3.log。没有以修改产品掩盖这些测试错误。

阶段二：真实SVG↔DOM宽图6/6 RED，run656d7208-6802-4230-bea4-152ebe0ed1ed，21% incoming.endY/outgoing.startY偏13.177490234375 CSSpx；23.333/25%也偏移，端口命中仍通过。共享高度改为2+378/ratio；四比例×3档缩放×折叠展开24/24 production1423真实拖线PASS/0retry，wide-browser-green.log，实际CSS/SVG/DOM/截图保留。

原Native38 PID79688于身份/CreationDate核对后CloseMainWindow正常退出，正常关闭前后raw已另存；full runtime-userdata-6c1629a7-5ca8-42a7-ab2a-9b20e35fa878共2763文件349615784B，copy receipt fb082a18a389d5fd451f4e43643de857f15f505a8c71cad89600e66a84866490；独立重新枚举并重hash全部源/副本2763个，0mismatch，独立收据fb56b07ddccd64982c6c63a12c70dc9d4e6428faa7bc4ffb9ba8d11d64b27bdf。

该句为中间阶段状态；以下以精确冻结源码和新Native验收收口。

冻结前适用Rust全量cargo fmt --check / cargo test exit0：228 PASS/1既存ignore +41集成PASS；既存warnings保留。新Native/全量npm verify和独审仍待验证。

## 首次793候选验证与桌面收口（历史）

产品source793ddaf355e38591cf0da3d66d115b636d68b967，Desktop/Web2.1.39，Mobile2.1.1规划不变。完整npm run verify exit0：Node1960PASS/14既存skip、Agent204PASS/2skip、首次浏览器852项：851常规通过+1flaky，Design41单元+8浏览器、development4步骤PASS；lint/type/UI/format/build通过。Rust fmt/test exit0，228PASS/1既存hardware ignore+41集成PASS；全部警告保留，非零skip不能推导硬件验收。

官方client:build使用实体目标目录、既有Agent白名单4282文件逐项核验，无npm ci或Agent包previous轮转。EXE SHA2164e413d8a7b159073a2f719c87dac1c044978041de659f9e63d9091ef98b06，input5253685267c32f762158b292d1d50b9ba7fcae66bbad7c3be6a3d35d9e533516，native-build-3311cfbd-5774-43a6-9b7f-9b34b3c76d72.json为current。本地current不代表Hosted、签名或安装器发布。实际loaded index-DowrIPTW.js SHA97ca191da29f9acb909d19c288d95364f45d3ea81382ee8e3c0f531218cf690f、CSS index-DfNLqnic.css SHA c705166358c5aced1c6efe6abe3d85dfc2182ff4a04de6cb5c48455b4506987b与dist逐字节一致。

原用户库默认启动/正常关闭两周期PASS，report test-results/native-sidebar-canvas-default/ff05beb6-fc32-4828-93e2-ec4c44ceb594/native-sidebar-canvas-default-results.json，SHA b1cf4891b8c0d659f0d2b17900230bb12b34af6cb19b9d5e70a3af8135f4b8cf。9项目/11聊天/21消息及canonical草稿/选择、repository身份/不可变迁移资料、共享memory保持，输入框非只读，0pageErrors。harness不发送/改草稿/改选择，首个CDP附着前自动连接网络不可观测，不据此冒称上游无流量。

fresh Native最终运行run-5df963e0-e205-4609-a395-40d47ba7e726/report.json，SHA e93291b868565aaa97c614f9f84d34bf450609860f1a27edfc70c080778510cb，PASS；4次真实官方启动/正常关闭，实际client1280×720/DPI1.5，非viewport模拟。UI新项目创建/改名/pin/真实原生确认softtrash/恢复及项目库同ID、组创建/delete/restore、三排序与最终priority重启/取消pin再重启均通过；全部canonical聊天草稿和边关系保持。真实Native项目包导出/预检/新root完整恢复，偏好/项目ID/原件hash往返、源库字节不变且已有目标再次导入拒绝。宽图1200×300三缩放双编辑状态6/6真实SVG↔DOM/拖线/持久化/命中PASS；root实际查看Native截图。路由http://tauri.localhost/（production release），App→Sidebar→SidebarProjectGroups/生命周期与App→Canvas→CanvasNodeFrame/NodeActions/CanvasConnections→canvasGraph；实际scripts/stylesheets与DOM指标、同状态截图保留在run目录。Web production为1423；development1421随完整verify的插件四步取证，二者独占串行。

前3次Native harness FAIL全部保留：v1错误假设invoke可包装且拦截ipc.localhost、v2真实不可写属性拒绝guard、v3确认控件不是UIA Button。原生控制校准实证为ControlType.Pane/AutomationId CommandButton_1000、真实HWND class Button、Win32 controlId0；按精确PID+CreationDate+隔离root+项目ID/name+完整消息和唯一控件正常BM_CLICK，真实返回“确认”，不替换IPC或放宽Native安全。v1 modal由root精确归属后正常取消/close；后续原生确认/校准仅合成项目，原失败不改写为PASS。最后runner-v4/PS-v5无IPC mock，Native存取/包均真实；auth:none loopback:9、fresh CODEX_HOME、无queued/running和API env剥离，未点击生成或发起vault/生成命令。应用内部Native IPC未instrument，首附着前网络不可观测；不声称内部零凭据/零生成IPC，也不代替真实Provider验收。

## 分支、工作树与任务事实

只读审计receipt9b3f97317c82070239f7f16c71a4bedb7b18c0464afea1258d2ffdc6099a154a：7登记树/14本地分支，approved root5/4；实际CLI拒绝新增、允许当前树复用，未提高预算、不回收任何目录或分支。3条旧无效route（DS-001、AGENT-004/005）当前unallocated/NOT_VERIFIED，完整旧路由和功能结果进verificationHistory，原PARTIAL不伪造完成。WEB-RELEASE ref在审计期间并发前移0cb2fc09，非本轮修改，不将全局refs伪称冻结。外层coord仅读主仓旧账本且git来源claim刷新可能丢失，未运行生成器或接管并行文件。

本候选152任务89DONE/48PARTIAL/11TODO/3BLOCKED/1IN_PROGRESS，开放63；本子任务、原侧栏和宽图两父任务仅本地技术验收DONE。37功能成熟度/runtimeEvidence不提升；统一仓库/真实回复、上游增量、Mobile、Hosted/签名/发布及用户整体产品验收仍各自开放。main原63项字节/HEAD/index独立保持，现69dirty及6并发新增路径另存primary-concurrent-382a77c8-d84d-43e7-8ba4-5ccd909da846，receipt2d598420ef8fee29f01c9c0e0fdcfc2ad9bc244b1380d4931a87359e7ee6b482；其他树/旧v2/v3/失败/38产物保留。

Spec源码独审0 findings PASS，Standards源码P2 ADR缺口已在ADR020追加本轮契约，P3原提交命名偏差保留不改写SHA，后续中文真实模块scope。最终文档精确HEAD补审、Delivery、全refs/产物/证据私有归档及最后两个真实日常lnk同PID无CDP还原，均按工程外最终收据裁决；没有这些收据不得认定最终交付。不push/merge，不发布，不做文件清理/迁移，不提交真实生成或消费额度reset。

## 最终审查撤回与补修过程（历史，现已复验）

f3b1e41的最终事实审核CHANGES REQUIRED：SPEC-FINAL-001/P2及STD-EVIDENCE-003/P1指出full-verify-793ddaf3.log4525–4543与browser run8412d3c6-08ae-4db3-80d5-c06960ccc2a8/stats真实为852用例/853attempts、851常规PASS+1flaky，非“851首试零flaky”。原报告SHA12a9c32b2b8ffcf740512004d7c3b95be82055175bc27fb9332d9849e8b26cb7，错误汇总不沿用，未改写原日志或失败。最终Spec收据1d7c4a8a...、Standards c7191b82...均保留，Delivery结构0违规不代替审核签收。

首次失败provider-scheduling.spec.ts123的429冷却expected cooldown/actual active，retry1通过；已确认不是纯测试时机：App.executeTask的异常路径1847publish(failed)→1856等待项目flush→1870才markProviderConnectionFailure，部分输出路径1724publish→1743flush→1756mark，保存失败还可能跳过健康标记。当前lease可挡同任务重试，但默认并发2允许其他项目在等待保存时继续占第二槽。将先以真实IndexedDB保存阻塞保留确定性RED，再把已知失败的冷却/隔离标记前移到发布终态和保存之前；身份/取消/持有lease保护、健康成功后标记语义保持。新源码、完整复验、官方新构建与精确最终补审尚未完成，不能以旧39EXE/Native批准新修复。

### 429保存竞态的确定性修复

旧793产物在真实creation IndexedDB readwrite事务持有时，两新增用例稳定RED2/2：run12208c2e-ea2c-4af7-bf3c-443df013d2f6，完整失败与部分结果后429的cooldown均读到active，非mock/延长timeout。App两条failure标记原条件整体前移到publish与awaitflush之前，healthy仍在成功保存后、租约/身份/取消保护不变。定向63 unit通过。原始严格429断言未改；定向provider-scheduling14/14 PASS/0retry，日志provider-health-browser-green-2.log。首轮新增case后半因首页回默认Codex、未重新选择合成API的harness失配保留（13PASS/1FAIL），补明确模型选择后14全绿，不把此误作产品错误。

没有新增产品抽象或存储；跨标签页通用read-map-set竞争未在本轮证明，不扩大为全跨tab保证。新的完整verify/当前源官方EXE/Native验收、最终文档与审核仍待后续精确收据。补修前2164e413 EXE及完整dist已逐字节保全prebuild39-reviewfix-8605aa73-d17d-461d-a766-d3048ae3a15f/receipt SHA0ba943bc4adc6596ad42a5275e71cbeaf8cea1eb5263badf94516f2e885b7206；默认Roaming/WebView再次保存2797文件350163965B，round源/副本hashPASS，receipt52c15fd9。后续独立源重查遇到一份BrowserMetrics.pma已不在当前源，错误原样保留；这是快照之后的源变化，归档副本仍保留，不伪称后续独立源全量0差异。初始2763文件的完整独立0mismatch仍为其原时点事实。
