# Review：全页面新UI收敛与主线集成

- Task ID：TASK-UI-FULL-20261015；当前状态 REVIEW / NOT_VERIFIED（本地2.1.28验收PASS，最终SHA/Hosted/PR/main待验）；2026-10-15。
- 固定main base `694a00607f6f63de1b8c43d0ebb117adf5d34f67`；本地承接head `1653966f652390d93d490f90c0b7e9a9423f4026` 的正式source及integration审查均为CHANGES_REQUIRED，发现text纯prompt误算正文、audio坏src假可用、rightpan三项P2；不是批准回执。
- 已验收的历史source `241f3050124ad7773ced0b47a55629373177205e` 已最小修复上述三项及首页16:9，修正screen按钮旧40px断言和L/G空image夹具；14条定向真实Browser GREEN见[verification](verification.md)。当前官方隔离Native56checks PASS；root已回读精确source241与integration241正式review均PASS、三P2 CLOSED，165的CHANGES_REQUIRED保留。完整verify-3（747/747 Browser、development及全部本地步骤）已PASS，最终文档/test-only补丁head复审仍待完成，不把静态review当独立动态/Native/Hosted审查。
- 本地main承接实际104冲突、25自动差量已逐项审计，21外移历史blob精确保全；两个新增renderer冲突补审main尺寸/标题/preview不变量后保留checkpoint。15份来源包由当前任务承接，原任务branch/status与能力状态保持；Delivery704 paths/0 violations只证结构。
- 任务分支合入main基线不等于远端main落地；实际origin/main仍694。PR59已建立；f090首次Hosted部分通过但verify失败，main/post-main尚未进行，最新纠正见下。最终review须绑定真实base/head、独立上下文与真实diff，核对新增用户空/内容/运行/失败状态矩阵及原失败记录。
- 关联：[Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Verification](verification.md)、[Coverage](coverage.md)。

## checkpoint前的预检记录（历史范围）


- Task ID：TASK-UI-FULL-20261015；状态 NOT_VERIFIED；2026-10-15。
- 当前正式base为待真实merge后确认的main，已知origin/main694a006；源码HEAD6bc2e3da加dirty实现。最终已提交head尚未形成，三专项只读诊断和本轮dirty预检不作为精确SHA批准。
- 主线文档/功能ID/能力状态与80项source冲突已逐路径审计；补回main独有历史文字，不用整份ours/theirs或改例外跳过Delivery。当前任务承接15份来源包，原任务分支、开放状态及原验证SHA保留。
- 当前证据：79条定向browser GREEN；全部设置三宽3条PASS；菜单中间失败及Google持久化测试误设/RED JSON覆盖勘误均见[verification](verification.md)。普通菜单最终2条GREEN已通过，完整组合门禁仍待完成。
- 不增加依赖、第二套主题或状态；保留Provider/凭据/存储身份、原件、取消/禁用原因和历史能力状态。主线merge后重验恢复、幂等和受影响UI。
- 最终review须绑定base/head、reviewer独立上下文和真实diff，核对本包/覆盖矩阵/原失败证据；完整verify/native/exact SHA review/hosted/普通merge与post-main尚未通过，本任务不得提前DONE/PASS。
- 关联：[Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Verification](verification.md)、[Coverage](coverage.md)。

- 用户追加空card仅upload/内容card才toolbar及功能分类一致性验收后，旧79及checkpoint50 GREEN不再覆盖完整当前验收；root重新修复/回归前保持CHANGES REQUIRED（新增验收）与最终review NOT_VERIFIED。

- 新状态RED为媒体6/6、retry4/4；model5失败中只有草稿1/Escape2是有效产品RED。重试源已按共享owner修复全部caller、34unit与owned lint/format通过，新caller运行GREEN/整体验证待root统一执行。全typecheck首轮在另一owner hasContent在途错误处exit1，不提前记PASS。


## f090最终文档/test-only审查与Hosted失败后的边界

精确 `f09051ecbd2cfb92f7be834eb5a216c049dfcafc` 独立aggregate review PASS，ready [PR59](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/59)已存在；Gitguards push/PR、governance/delivery/deploy-linux PASS。[quality38641803780](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38641803780) verify在snapshot检查、产品测试之前失败，根因是默认父目录扫描要求未入库的外部快照。main694仍未合并。该review不批准后续scripts/tests修复；定向23 PASS并非完整verify-4或新Hosted PASS。可移植性修复保留仓库内所有快照/生命周期规则、显式外部空/缺失/损坏fail-closed。产品/Rust/Native源与字节未变，完整无外部env的verify-4、新SHA独立复审与Hosted仍PENDING，整体NOT_VERIFIED。


可移植性修复复核：完整verify-5无外部env exit0、Browser747、Node1301/14skip、Agent199/2skip与development四步PASS；显式容器4/0及Native当前字节身份PASS。独立dirty source预检实际CLI24PASS、offline AI-evals PASS仅属有限离线检查，不是多模型或最终提交SHA批准。f090原Hosted失败保留；当前修复HEAD待root提交后独立exact-SHA补审/新Hosted，任务继续REVIEW/NOT_VERIFIED，PR59/main未合并。


## c498独立审查与后续Hosted边界

交付head `c49852fbc17020ebda96266938d64cc50e45eef8` 在Hosted前独立exact aggregate review PASS；但[quality38643592443](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/38643592443)实际FAIL：snapshot3/0已通过，Node1315总计1294 PASS/8 FAIL/13 skip（Windows额外symlink case可用），Browser/Rust尚未运行。8失败来自agentPackage Windows发布夹具的 `C:\Users\RUNNER~1...` 非canonical临时根，被既有canonical/no-link guard拒绝；不是产品UI验收失败，也不表示Hosted通过。原verify-5本地PASS保留原范围。

source agent仅获tests/unit/agentPackage.test.ts写入权，拟用realpath规范本次拥有的fixture根；安全脚本保持、回滚断言不放宽。该修复及证明仍PENDING；root计划在同8.3短TEMP/TMP下运行完整npm test与lint/typecheck/format（short-temp-verification），当前PENDING；产品源码/Native哈希未变，既有verify-5 Browser747保留未变产品范围，新Hosted仍执行完整verify/Rust/Native。新修复head独立补审/Hosted/PR59普通合并/main/post-main继续待验；任务REVIEW/整体NOT_VERIFIED，main仍694、PR59未合并。


fixture修复本地补证：short-temp run2本地PASS：Node1315=1301PASS/14既有platform skip/0fail，lint/typecheck/format全部exit0；这不是完整verify-6。真实8.3 fixture RED11项3PASS/8FAIL复现Hosted，GREEN11/11PASS/0skip，junction/unowned-stage/identity-swap/rollback守卫均实际执行；只改agentPackage测试fixture根await realpath（4+/1-），产品安全脚本零变更。 首轮短TEMP全Node的两个gitPushGuardPaths失败来自自建目录过深，原log和canary失败保留；较浅actual8.3根下canary7PASS/3Linux skip、完整Node/静态PASS，未改Git guard。此为dirty修复证明，最终提交head独立exact-SHA复审与新Hosted仍PENDING，main694/PR59未合并。


54a2后续审查边界：该精确head aggregate PASS/Delivery706/0后quality38645328109首次gateway ready超时（Node1301PASS/1FAIL/13skip），旧child日志缺失，alive/crash UNKNOWN；c498/54时长差仅线索，不确认为slow CI。actual child preload7s同栈RED已复现；单测试stdout own-port marker→HTTP200/health identity握手、exit/error/test abort拒绝，保留20s及提交/恢复全部断言。延迟GREEN4/4、focused21PASS，实际8.3 Node1304PASS/14skip及静态PASS；产品无变更、非完整verify-6。新修复提交head独立exact-SHA审查与新Hosted尚未完成，旧54 push38645320833仍PENDING，main694/PR59未合并。

## 2d后新产品差量的审查边界（首轮文档冻结时）

2d `2d4be5fca4c2167d4bc0d500634645624f311505` 的独立aggregate PASS / Delivery707/0收据保留，但push38647654947设置草稿case初试和retry均FAIL；54 push38645320833的Repository verify exit0含746 PASS/1 sidebar flaky，后续Native旧按钮定位FAIL。sidebar原缺trace，根因UNKNOWN；不由旧审查或重试通过覆盖。

冻结旧产品真实select连续B→A的settings-race-red-2为3/3有效RED；原race-red-1在2026-10-14T22:50:20.475Z修改测试源，仅作单case诊断，不能成为整轮单source收据。ProviderModelCatalog仅字段同步useEffect→useLayoutEffect，保留dirty/账号隔离/保存校验；2.1.28 build及七case×六次42 PASS/0retry为定向动态证据，不是独立精确SHA批准。Native fixture修正经真实release2.1.27验证11 PASS、errors=[]、凭据清理成功，尚不覆盖2.1.28。

当前最小产品/测试/版本差量未形成最终SHA；2.1.28完整verify、fresh Native/资源身份、最终base694→head独立source/integration复审、新Hosted/PR59/main/post-main待验。产品新增差量使先前“产品/config未变、沿用旧Native”结论仅适用旧阶段。任务REVIEW/整体NOT_VERIFIED；完整失败、边界和证据文件见[最新验证](verification.md)。

## 当前2.1.28本地验收与最终SHA审查边界

verify-6完整exit0：Node1304 PASS/14skip、Agent199 PASS/2skip，production Browser747/747首试PASS、0实际retry/flaky/skip，lint/typecheck/UI242/0/format/build/development四步骤通过；文档owner独立递归确认747 result records各一、全passed、retry>0为0。官方重建2.1.28 Native5真实56 PASS/0errors/10图，root已核对fresh WebView profile及目视三图；TaskHost新版11 PASS/0error/secretcleanup true，5自有app退出。verify-6后input28c2f285与EXE638b5df5同Native5完整哈希相同、reason=current；这些是当前本地动态收据，不是独立精确提交SHA批准。

Native2硬编码旧版本校验、Native3过早CDP连接、Native4误用default WebView已配置profile造成的5/0/49 checks前置失败原样保留，只有Native5是fresh完整验收；未更改产品掩盖这些前提问题。2d PR quality38647660224同样最终FAIL：Node1305/13skip、Agent199/2skip、Rust163/fmt/check/build PASS，Browser746 PASS/1 settings flaky（首fail retryPASS、同设置竞态），后续Native旧菜单8 checks后FAIL。54/sidebar原缺trace根因UNKNOWN；本地不复现不改写历史。

当前base694→2d以后的最小产品/测试/版本/docs候选已本地PASS，最终head尚未形成；仍待独立source/integration精确SHA补审、新Hosted/PR59普通合并及main/post-main。任务REVIEW / 整体NOT_VERIFIED；原source241/2d批准仅各自SHA，不以本地测试通过代替source review。详见[最终本地收据](verification.md)。
