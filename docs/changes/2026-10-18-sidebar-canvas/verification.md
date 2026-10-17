# Verification：侧栏持久化与宽图连线

TASK-SIDEBAR-CANVAS-20261018：IN_PROGRESS/NOT_VERIFIED；base ab2ceef0；[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。

开工保全：工程外D:/KK-Studio-recovery-20260921/sidebar-canvas-20261018-69e77b85-6d69-4f51-8602-a6c3236eb6c2，7树110dirty/index/diff/status、all-ref bundle与当前raw3主备/身份，逐字节核验PASS/refsStable=true；receipt SHA a1fd93418891649925211e938ef86ba0b98a7b9b683d9ca4c6d6c0e233287f93。原v2/v3和所有旧失败保持。

基线typecheck exit0，projectLifecycle/snapshotCodec/V3/projectPackage 42/42 PASS；lint日志.tmp/task-sidebar-canvas-20261018/baseline-lint.log。实际原Native仍2.1.38/PID79688，最终产品版本与新验收尚待收据。

只读根因：侧栏sort/pins为useState；宽图主体DOM逻辑高96.5，但共享anchor仍按旧padding/min222计算，上轮端口虽可命中却向下偏13.1775/14.6417/15.6875 CSSpx，SVG/当前Native真实反例待本轮。不能沿用上轮6状态命中PASS声明连线正确。

阶段一：domain/codec/lifecycle/Native/包已落地，113 TS PASS/0skip，Rust creation_storage 22与project_package 15 PASS；收据.tmp/task-sidebar-canvas-20261018/domain-implementation-receipt.json（ac01afc241a9d41a5efe70c9f7f5a861b780d842d834c356b5ab7619a4c18cab）。旧Web production置顶重载RED run8c973c81；新增排序/冲突RED run16c34309；后两轮测试harness失败均保留（phone390隐藏桌面入口、checked菜单名称含✓、空文件夹共享class选择器）；修正为真实tablet820入口/精准role，第三轮32/32 PASS/0retry，run日志sidebar-browser-green-3.log。没有以修改产品掩盖这些测试错误。

阶段二：真实SVG↔DOM宽图6/6 RED，run656d7208-6802-4230-bea4-152ebe0ed1ed，21% incoming.endY/outgoing.startY偏13.177490234375 CSSpx；23.333/25%也偏移，端口命中仍通过。共享高度改为2+378/ratio；四比例×3档缩放×折叠展开24/24 production1423真实拖线PASS/0retry，wide-browser-green.log，实际CSS/SVG/DOM/截图保留。

原Native38 PID79688于身份/CreationDate核对后CloseMainWindow正常退出，正常关闭前后raw已另存；full runtime-userdata-6c1629a7-5ca8-42a7-ab2a-9b20e35fa878共2763文件349615784B，copy receipt fb082a18a389d5fd451f4e43643de857f15f505a8c71cad89600e66a84866490；独立重新枚举并重hash全部源/副本2763个，0mismatch，独立收据fb56b07ddccd64982c6c63a12c70dc9d4e6428faa7bc4ffb9ba8d11d64b27bdf。

全量验证、新Native与独审待完成，原父任务/功能成熟度暂不提高。

冻结前适用Rust全量cargo fmt --check / cargo test exit0：228 PASS/1既存ignore +41集成PASS；既存warnings保留。新Native/全量npm verify和独审仍待验证。
