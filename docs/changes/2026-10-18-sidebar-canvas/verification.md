# Verification：侧栏持久化与宽图连线

TASK-SIDEBAR-CANVAS-20261018：有界本地DONE/PASS；base ab2ceef0 / 产品source793ddaf3；[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。

开工保全：工程外D:/KK-Studio-recovery-20260921/sidebar-canvas-20261018-69e77b85-6d69-4f51-8602-a6c3236eb6c2，7树110dirty/index/diff/status、all-ref bundle与当前raw3主备/身份，逐字节核验PASS/refsStable=true；receipt SHA a1fd93418891649925211e938ef86ba0b98a7b9b683d9ca4c6d6c0e233287f93。原v2/v3和所有旧失败保持。

基线typecheck exit0，projectLifecycle/snapshotCodec/V3/projectPackage 42/42 PASS；lint日志.tmp/task-sidebar-canvas-20261018/baseline-lint.log。实际原Native仍2.1.38/PID79688，最终产品版本与新验收尚待收据。

只读根因：侧栏sort/pins为useState；宽图主体DOM逻辑高96.5，但共享anchor仍按旧padding/min222计算，上轮端口虽可命中却向下偏13.1775/14.6417/15.6875 CSSpx，SVG/当前Native真实反例待本轮。不能沿用上轮6状态命中PASS声明连线正确。

阶段一：domain/codec/lifecycle/Native/包已落地，113 TS PASS/0skip，Rust creation_storage 22与project_package 15 PASS；收据.tmp/task-sidebar-canvas-20261018/domain-implementation-receipt.json（ac01afc241a9d41a5efe70c9f7f5a861b780d842d834c356b5ab7619a4c18cab）。旧Web production置顶重载RED run8c973c81；新增排序/冲突RED run16c34309；后两轮测试harness失败均保留（phone390隐藏桌面入口、checked菜单名称含✓、空文件夹共享class选择器）；修正为真实tablet820入口/精准role，第三轮32/32 PASS/0retry，run日志sidebar-browser-green-3.log。没有以修改产品掩盖这些测试错误。

阶段二：真实SVG↔DOM宽图6/6 RED，run656d7208-6802-4230-bea4-152ebe0ed1ed，21% incoming.endY/outgoing.startY偏13.177490234375 CSSpx；23.333/25%也偏移，端口命中仍通过。共享高度改为2+378/ratio；四比例×3档缩放×折叠展开24/24 production1423真实拖线PASS/0retry，wide-browser-green.log，实际CSS/SVG/DOM/截图保留。

原Native38 PID79688于身份/CreationDate核对后CloseMainWindow正常退出，正常关闭前后raw已另存；full runtime-userdata-6c1629a7-5ca8-42a7-ab2a-9b20e35fa878共2763文件349615784B，copy receipt fb082a18a389d5fd451f4e43643de857f15f505a8c71cad89600e66a84866490；独立重新枚举并重hash全部源/副本2763个，0mismatch，独立收据fb56b07ddccd64982c6c63a12c70dc9d4e6428faa7bc4ffb9ba8d11d64b27bdf。

该句为中间阶段状态；以下以精确冻结源码和新Native验收收口。

冻结前适用Rust全量cargo fmt --check / cargo test exit0：228 PASS/1既存ignore +41集成PASS；既存warnings保留。新Native/全量npm verify和独审仍待验证。

## 当前冻结验证与桌面收口

产品source793ddaf355e38591cf0da3d66d115b636d68b967，Desktop/Web2.1.39，Mobile2.1.1规划不变。完整npm run verify exit0：Node1960PASS/14既存skip、Agent204PASS/2skip、production Edge851/851首试零flaky，Design41单元+8浏览器、development4步骤PASS；lint/type/UI/format/build通过。Rust fmt/test exit0，228PASS/1既存hardware ignore+41集成PASS；全部警告保留，非零skip不能推导硬件验收。

官方client:build使用实体目标目录、既有Agent白名单4282文件逐项核验，无npm ci或Agent包previous轮转。EXE SHA2164e413d8a7b159073a2f719c87dac1c044978041de659f9e63d9091ef98b06，input5253685267c32f762158b292d1d50b9ba7fcae66bbad7c3be6a3d35d9e533516，native-build-3311cfbd-5774-43a6-9b7f-9b34b3c76d72.json为current。本地current不代表Hosted、签名或安装器发布。实际loaded index-DowrIPTW.js SHA97ca191da29f9acb909d19c288d95364f45d3ea81382ee8e3c0f531218cf690f、CSS index-DfNLqnic.css SHA c705166358c5aced1c6efe6abe3d85dfc2182ff4a04de6cb5c48455b4506987b与dist逐字节一致。

原用户库默认启动/正常关闭两周期PASS，report test-results/native-sidebar-canvas-default/ff05beb6-fc32-4828-93e2-ec4c44ceb594/native-sidebar-canvas-default-results.json，SHA b1cf4891b8c0d659f0d2b17900230bb12b34af6cb19b9d5e70a3af8135f4b8cf。9项目/11聊天/21消息及canonical草稿/选择、repository身份/不可变迁移资料、共享memory保持，输入框非只读，0pageErrors。harness不发送/改草稿/改选择，首个CDP附着前自动连接网络不可观测，不据此冒称上游无流量。

fresh Native最终运行run-5df963e0-e205-4609-a395-40d47ba7e726/report.json，SHA e93291b868565aaa97c614f9f84d34bf450609860f1a27edfc70c080778510cb，PASS；4次真实官方启动/正常关闭，实际client1280×720/DPI1.5，非viewport模拟。UI新项目创建/改名/pin/真实原生确认softtrash/恢复及项目库同ID、组创建/delete/restore、三排序与最终priority重启/取消pin再重启均通过；全部canonical聊天草稿和边关系保持。真实Native项目包导出/预检/新root完整恢复，偏好/项目ID/原件hash往返、源库字节不变且已有目标再次导入拒绝。宽图1200×300三缩放双编辑状态6/6真实SVG↔DOM/拖线/持久化/命中PASS；root实际查看Native截图。路由http://tauri.localhost/（production release），App→Sidebar→SidebarProjectGroups/生命周期与App→Canvas→CanvasNodeFrame/NodeActions/CanvasConnections→canvasGraph；实际scripts/stylesheets与DOM指标、同状态截图保留在run目录。Web production为1423；development1421随完整verify的插件四步取证，二者独占串行。

前3次Native harness FAIL全部保留：v1错误假设invoke可包装且拦截ipc.localhost、v2真实不可写属性拒绝guard、v3确认控件不是UIA Button。原生控制校准实证为ControlType.Pane/AutomationId CommandButton_1000、真实HWND class Button、Win32 controlId0；按精确PID+CreationDate+隔离root+项目ID/name+完整消息和唯一控件正常BM_CLICK，真实返回“确认”，不替换IPC或放宽Native安全。v1 modal由root精确归属后正常取消/close；后续原生确认/校准仅合成项目，原失败不改写为PASS。最后runner-v4/PS-v5无IPC mock，Native存取/包均真实；auth:none loopback:9、fresh CODEX_HOME、无queued/running和API env剥离，未点击生成或发起vault/生成命令。应用内部Native IPC未instrument，首附着前网络不可观测；不声称内部零凭据/零生成IPC，也不代替真实Provider验收。

## 分支、工作树与任务事实

只读审计receipt9b3f97317c82070239f7f16c71a4bedb7b18c0464afea1258d2ffdc6099a154a：7登记树/14本地分支，approved root5/4；实际CLI拒绝新增、允许当前树复用，未提高预算、不回收任何目录或分支。3条旧无效route（DS-001、AGENT-004/005）当前unallocated/NOT_VERIFIED，完整旧路由和功能结果进verificationHistory，原PARTIAL不伪造完成。WEB-RELEASE ref在审计期间并发前移0cb2fc09，非本轮修改，不将全局refs伪称冻结。外层coord仅读主仓旧账本且git来源claim刷新可能丢失，未运行生成器或接管并行文件。

本候选152任务89DONE/48PARTIAL/11TODO/3BLOCKED/1IN_PROGRESS，开放63；本子任务、原侧栏和宽图两父任务仅本地技术验收DONE。37功能成熟度/runtimeEvidence不提升；统一仓库/真实回复、上游增量、Mobile、Hosted/签名/发布及用户整体产品验收仍各自开放。main原63项字节/HEAD/index独立保持，现69dirty及6并发新增路径另存primary-concurrent-382a77c8-d84d-43e7-8ba4-5ccd909da846，receipt2d598420ef8fee29f01c9c0e0fdcfc2ad9bc244b1380d4931a87359e7ee6b482；其他树/旧v2/v3/失败/38产物保留。

Spec源码独审0 findings PASS，Standards源码P2 ADR缺口已在ADR020追加本轮契约，P3原提交命名偏差保留不改写SHA，后续中文真实模块scope。最终文档精确HEAD补审、Delivery、全refs/产物/证据私有归档及最后两个真实日常lnk同PID无CDP还原，均按工程外最终收据裁决；没有这些收据不得认定最终交付。不push/merge，不发布，不做文件清理/迁移，不提交真实生成或消费额度reset。
