# Intent：全页面新UI收敛与主线集成

- Task ID：TASK-UI-FULL-20261015；日期：2026-10-15；状态：REVIEW / NOT_VERIFIED（本地2.1.28验收PASS，最终SHA/Hosted/PR/main待验）。
- 用户授权：继续检查所有页面与所有已实现卡片，重点模型选择、Agent输入框、圆角、同排对齐、旧项目重开；发现问题直接修复，浏览器验证后提交并合入主线。
- 用户追加纠正：卡片必须按真实载荷区分空态与内容态；空card只保留upload，不显示内容toolbar，有内容card才出现对应toolbar。所有类型还必须检查运行/失败/恢复状态与功能真实链、页面分类和动作互斥，尺寸GREEN不能代替该验收。
- 原UI基线：6bc2e3da387e0117e24fd49419d9a0d6e4b6a9d4 / 2.1.26；历史产品241f3050已本地承接main694并完成2.1.27 verify-3/Native56/review。当前提交基线2d4be5fca4c2167d4bc0d500634645624f311505上有最小设置草稿竞态修复与Desktop/Web2.1.28候选，build/settings42定向及完整verify-6、Native5 56项/新版TaskHost11项本地PASS，最终提交SHA review/Hosted/main待验；Mobile2.1.1规划不变。worktree D:/kk-studio/.worktrees/branch-consolidation-20261011；root负责实现/运行与提交，当前docs owner仅收敛已知事实；分支fix/TASK-UI-FULL-20261015。
- 远端事实：2026-10-15实际fetch及API确认origin/main=694a00607f6f63de1b8c43d0ebb117adf5d34f67；与候选共同祖先1f6cbd37，历史squash造成两侧差量，禁止按文件整份选ours/theirs。主线与候选必须逐项保全后再集成。
- 设计沿用当前新UI与[唯一索引](../../UI_INDEX.md)，不用历史页面覆盖新规则。先复证，再最小修复，不增加依赖或新主题。
- 非范围：付费Provider/秘密配置、真实资料迁移、Mobile实现、发布签名/安装器、旧分支清理；保留primary并发dirty/index与原件，合成恢复数据只用于隔离验收。
- 主线保全与Delivery：相对main新增15份历史包、75个五件套文件均存在；由本任务明确承接来源和当前组合验证，保留原任务branch/status和历史结论，不修改门禁或历史例外集。
- 关联：[规格](spec.md)、[计划](plan.md)、[验证](verification.md)、[审查](review.md)、[覆盖矩阵](coverage.md)。


Hosted承接更正：ready [PR59](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/59) 的精确f090独立aggregate review PASS，但quality verify在测试前因默认扫描仓库外快照FAIL；main694未合并。当前仅修复治理脚本可移植性及其测试，显式外部范围仍fail-closed，产品/Rust/Native字节不变；完整verify-4及新SHA Hosted待验，保持REVIEW/NOT_VERIFIED。


最新修复本地状态：snapshot可移植性完整verify-5无KK_CONTAINER_ROOT exit0（Node1301/14skip、Agent199/2skip、Browser747、development四步），显式外部容器4/0亦PASS。产品/Rust/Native字节与版本2.1.27不变；最终修复提交HEAD、独立exact-SHA review与新Hosted/main仍待验，整体REVIEW/NOT_VERIFIED。


后续Hosted更正：c498独立exact aggregate review PASS，snapshot已Hosted3/0；但Windows发布夹具short-path触发既有canonical/no-link guard，quality38643592443 Node8FAIL、Browser/Rust未运行。仅修owned fixture realpath，不改安全脚本或回滚断言；修复/短TEMP完整Node与静态检查及新Hosted待验，REVIEW/NOT_VERIFIED、main694/PR59未合并。


最新短TEMP本地结论：short-temp run2本地PASS：Node1315=1301PASS/14既有platform skip/0fail，lint/typecheck/format全部exit0；这不是完整verify-6。真实8.3 fixture RED11项3PASS/8FAIL复现Hosted，GREEN11/11PASS/0skip，junction/unowned-stage/identity-swap/rollback守卫均实际执行；只改agentPackage测试fixture根await realpath（4+/1-），产品安全脚本零变更。 产品/config/Rust与2.1.27版本未变，Browser747/Native56/Rust163仅沿用原未变产品范围；新提交head/独立exact-SHA复审/新Hosted及PR59/main仍待验，REVIEW/NOT_VERIFIED。


最新Hosted边界：54a2独立aggregate review PASS、Delivery706/0，但quality38645328109 Node1301PASS/1FAIL/13skip，gateway首次ready超时、POST/Provider/恢复/Browser/Rust均未运行，当次child alive/crash UNKNOWN。仅测试启动握手修复（84+/14-），延迟RED/GREEN及实际8.3 TEMP Node1304PASS/14skip和静态PASS；未改产品，非完整verify-6。新HEAD/独立review/Hosted/main仍待验，旧push38645320833待回读，整体REVIEW/NOT_VERIFIED。

## 当前续修阶段（2.1.28候选）

54 push38645320833 Repository verify exit0含Browser746 PASS/1 sidebar flaky，后续Native旧配置按钮FAIL；2d push38647654947 settings草稿case初试/retry FAIL。冻结旧产品真实select连续B→A RED2为3/3 FAIL，最小ProviderModelCatalog字段同步useLayoutEffect修复后settings七case×六次42 PASS/0retry；dirty/账号/save校验保持。原race-red-1因运行中测试源修改，仅单case诊断。sidebar原缺trace根因UNKNOWN；本地五个cold contexts含CPU4x均未复现，不能宣称修复。TaskHost fixture11PASS/0error/secretcleanup true仅真实旧release2.1.27，不代填新2.1.28。当前完整verify/fresh Native/最终SHA独立review与新Hosted/PR/main仍待验；详细收据按[verification](verification.md)最新阶段回读。

最终本地阶段：Desktop/Web2.1.28 verify-6 exit0、Browser747首试/0实际retry、Node1304/14skip、Agent199/2skip、UI242/0及development四步；fresh官方Native5 56项/0error/10图和新版TaskHost11项/0error/secretcleanup true通过，verify后input/EXE同字节。Native2/3/4前置夹具失败及2d PR quality38647660224 settings flaky+旧Native菜单FAIL保留；sidebar原根因UNKNOWN。当前任务目标仍含最终head独立review、新Hosted/普通PR59合并和main/post-main，继续REVIEW/整体NOT_VERIFIED，不改变其他功能成熟度或Mobile规划。[最终验证](verification.md)。
