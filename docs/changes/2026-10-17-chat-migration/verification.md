# Verification：旧聊天迁移与恢复

- Task ID：TASK-CHAT-MIGRATION-20261017；PARTIAL / NOT_VERIFIED（本地迁移与编辑恢复通过；真实新回复受账号额度阻塞）。
- [Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。
- 用户资料已保全并独立逐文件核验；原始主快照SHA `998e0101cfd0d13ed660771f04a6668a618a0c6ae9ccf198088ab17e9e616931`，原backup SHA `9f5995365be5fd40e8353e449a1e94ed9ed7577496ffc93cf00b9b57667c5f5f`，身份SHA `8db3d8823cb8c4ecfc92458d0ea41ffaa5ba8acf491dd0ffb9f7edd63c2482c0`。
- 完整2491文件259972032B保全receipt SHA `d01f4fe869c98abafeed22c2579ac556b581fe07f0925f0a1502f23819e5c81e`；独立2491文件0 mismatch receipt SHA `071cc099e2d14594d3f4bc8d896a9dbb49e40bc1c3d1bb47e35f9ddd98e4f834`；路径见[计划](plan.md)。
- 候选Desktop/Web2.1.37，Mobile规划2.1.1，官方版本递增与version:check通过。Native副本及默认资料迁移、编辑聊天实际验收、完整冻结verify、最终独审和Delivery未完成，不沿用前次审计PASS。
- 三项限定独审问题SMR01/02/03均先保留真实RED：raw3含独立root正文被投影覆盖、空库坏journal提前发布marker、未知version 4.0/string/-1/null被当坏文件覆盖。修复后TS存储160/160、Node服务69/69、Rust226/226+integration41/41（1既有硬件ignore）通过；全量Rust日志`.tmp/chat-migration-20261017/cargo-full-after-review.log`。Node四入站拒绝模糊raw3并保留主备原字节。限定dirty复审receipt SHA `4158f94f7518e302dc06d17f2b0f57aca66356ab49649be93617f7102c750906`，并非最终HEAD批准。
- 首轮verify在新增server-only模块未登记时失败；已登记精确文件并保留浏览器禁止导入测试。第二轮npmtest遇旧作用域fixture错误，两项等待进入发送的测试永久不达，root核对父子PID/命令行后仅终止这两个测试子进程，日志保留；该轮1877项报告1846PASS/17FAIL/14既有SKIP，未执行后续Agent/UI阶段。正在修正被新契约替代的fixture及检查真实回归，不能报告全量通过。
- 外部真实服务、费用、Hosted、发布和用户产品验收分别记录；当前无新增成功证据。

## 第一冻结候选e2482a21（未验收）

本地提交e2482a21（103文件）保存实现与阶段文档，未推送/合并。第三轮verify的lint/typecheck、Node1886=1872PASS/14既有SKIP、Agent204=202PASS/2既有SKIP、UI/format和生产build均通过；进入824项Edge后发现共享helper先建立v3/marker2再回写v2弱副本，正确触发只读屏障，导致批量编辑断言失败。新聊天case在compact还缺显式展开面板。root核对精确runner PID48172/parent59732后仅中止该测试进程树，原日志`.tmp/chat-migration-20261017/full-verify-source-3.log`及run06795ffa全部失败/重试/截图保留；这是INTERRUPTED/FAIL，不是完整browser通过，DESIGN/development未运行。不关闭保护或清空IDB绕过，正在按canonical3修正共享夹具后重新验证。

e248正式双轴独审另确认三P1，见[审查](review.md)，分别为远端瘦历史覆盖本地媒体元数据、同chat运行中重连epoch无法审批中断、直接发送迟到清理跨chat草稿。修复和新head复核未完成，默认资料未迁移。

真实备份的纯TS迁移预览另保留在工程外`pure-preview-59b625d2-2394-493e-8e6e-585a274b8d00`：9项目、2原chat与5旧root线程逐项保留，形成11个独立上下文；原输入对象不变，JSON持久化decode/serialize一致、再次迁移幂等，候选SHA4b75f17a61f948591dfe1ac41bc991944f9896066e31e39ef43c33774997359b。首个探针错误地把459个仅内存undefined新增属性算作wire差异，原失败log保留；独立结构对账确认0原字段删除/0值改变，以实际JSON wire比较后通过。此为纯生产TS处理备份字节，尚不代表Native或默认资料迁移通过。

补充保全：只按快照中5个精确旧thread ID读取对应session文件名与只读SQLite索引，未扫描其他会话正文、未写SQLite；5个原rollout/4051009B全部复制重哈希保全，工程外`legacy-codex-originals-34cefb37-9629-42d7-bf47-f40cfa67de0f` receipt SHA bb0127cba8a5d5d92350e18b2d604cef0483c47c53bca8f16fbd1b3ac79f1d8e。首轮Windows扩展路径前缀校验导致索引预检FAIL（5原文件已复制），归一化同一合法绝对路径后fresh目录重新验证PASS；原失败和文件全部保留。

官方Agent生产运行时已在fresh production npm安装和fresh candidate完成打包，未调用会旋转目录的publish；旧EXE/receipt与两份原runtime共8564文件先复制重哈希到工程外`native-before-build-e2d40ef7-4120-4ff4-9d2c-e381f16d482d`，当前candidate4282文件逐一校验并原位复制（无删除/移动）。此包绑定e248，后续runtime修复会使其过期，必须重打包和正式Native重建。尚未构建或启动新Native，旧默认原主/备/身份三SHA仍保持，原主仓63dirty/index完整性a7d7f99d收据PASS（SHA5afa914de193fec6070983f0d05c3a5bc5a7aa6a551b5b6e13a4264bb30b2efe）。

## 第二冻结候选22352acc（源码复审通过，运行未验收）

独立Spec复审87/87及Session34/34通过，收据`spec-recheck-398c430a-94c3-480c-89e5-e6073fe099eb.json` SHA4a3032831f855af59f4c682966bf1b409f9eaa8cc7d8216f66065b2df4713c3d；Standards独立69/69及原反例复验通过，收据`standards-recheck-f0da9812-ec29-4294-a640-2b76ae3231cd.json` SHAeac3b34eb2fa922fb88c631e6afc974fb9ef0cb7d85df9cfdad879204d60a913。三P1在该提交源码轴均关闭，不代替运行验收。

首次定向生产Edge共77项，67PASS/10FAIL；完整失败和重试保留在run981b8967及`.tmp/chat-migration-20261017/browser-focused-source-1.log`。两项direct夹具缺必要连接身份并误用JSON而非SSE；部分旧断言仍读已退役project-root草稿，或要求同chat三套隐藏草稿，与ADR-022单canonical draft相冲突。修订以不同真实chat验证旧上下文隔离，保留同chat切主Agent输入，以及跨chat附件、origin和保存断言，不恢复双权威或移除格式保护。

另确认真实首页连接回归：无项目时synthetic workspace被误送至canonical历史保存，导致设置连接报“聊天已切换”。真实生产AgentHost的RED后，仅在无实际聊天scope时跳过该保存；真实项目保存错误仍失败关闭。相关77/77单位回归通过。更新夹具并重建后，direct+设置10项中9PASS/1FAIL（run840b6343，日志`browser-direct-settings-2.log`）；另一chat编辑与原任务来源保持，但原A未变草稿清理仍待诊断。新候选未冻结，完整verify及Native尚未重跑；默认资料仍未迁移。

随后原A清理失败定位为排队增加`text=prompt`镜像导致严格签名误判，保留RED并补缺失/undefined别名与实际不同text的边界；新增邻域回归通过。HOME已受理时新输入保留但pending来源残留也已有真实浏览器RED，修复绑定原chat只退役已受理来源，切chat后不改另一chat。3文件阶段浏览器run30751594为34PASS/2FAIL，重试间测试文件有明确变更，只作诊断记录，不作为冻结验收。最终新候选以统一冻结后的运行结果为准。

新2.1.37完整`cargo test --no-default-features`为226PASS/1既有硬件ignored及integration41PASS（`.tmp/chat-migration-20261017/cargo-final-2-1-37.log`）。5份旧rollout的原件/保全副本再次由独立脚本逐对重哈希，0 mismatch；工程外收据`legacy-rollouts-independent-check-e40d16dc-bba1-4d22-9cfc-47af5d4756b8.json` SHA620959e3a9f210579f21059698ce576110bacfb2f4da834ab3c9c535b71dc64e。

统一重建后的47项定向Edge为45PASS/2FAIL（run132d335e，`browser-focused-repair-3.log`）：Direct迟到回执两case、设置、卡片路由及旧线程迁移/离线重开均通过。剩余2项在保存中立即读取弱镜像，改为等待实际pending退役与原chat选择落盘、按冻结原chat ID比较完整草稿后，`browser-codex-persisted-4.log`为8/8首试通过。未增timeout、未放宽原字段断言。该阶段结果只绑定对应工作树文件，下一冻结提交须完整verify及新独审。

## 第三候选751c7d1a：CHANGES REQUIRED，证据保留

clean提交751c7d1aaafcf1c18d13bf0c29e97777a6542978完整verify的lint/typecheck、Node1930=1916PASS/14既有SKIP、Agent206=204PASS/2既有SKIP通过；在UI门禁发现ConversationPanel306行超过300停止，未运行后续browser/DESIGN/development。日志`full-verify-751c7d1a.log`。通过复用现有blocked/agentBusy条件去重降至299行，UI0违规，未放宽规则或新拆组件。

两轴独审又复现首次HOME成功回执无条件清新草稿：STD-CHAT-03 / SPEC-CHAT-02，P1。Standards收据`standards-final-1a2a7254-062d-4efc-8cd8-8efa2bb8e48b.json` SHA25b1df766a118bb34da09fd005e99a12e5f915e68b9ddff17f9c48f6eb97c6e3；Spec收据`spec-final-5b80940a-a368-482c-bfe8-03739676ff75.json` SHAd6009edd4f77ad43e2ad66b539232d29e50672df4d42b81516ac99414351a3b6。旧三P1仍按22352关闭，新问题不被单位总数掩盖。首次HOME路径现复用已冻结原project/chat/draft的clearSentPendingDraft；新增真实函数完整await链RED/GREEN，覆盖晚新稿/新附件/model、切B保留所有字段和选择、失败保留；邻域100/100。该修复仍须新head独审及完整运行验收。

21:52主目录保护检查发现status/dirty摘要漂移（原失败`primary-integrity-8dcd2450-bdee-4a22-afc7-0dc95c21f894.json`保留），只读对账确认HEAD/index/staged0及原63项逐字节均保持，额外6项为AGENTS、ADR索引/ADR024、release checklist及MCP/记忆功能文档。未推断作者、未回退或并入本任务。当前69文件/1501601B及index/原始diff/status另存工程外`primary-concurrent-53e82ec2-f434-4036-91f1-6af094a4a9cf`，稳定复核PASS，收据SHA6c1f73f1df2ec4827743730d0d250444eb4cc94116f8276baa5288e16754265a。不得继续声称当前主目录总共只有63dirty或status完全相同。

首次HOME修复后重新生成生产dist，增强首次延迟受理/真实UI新稿/保留原参考图/保存刷新用例，codex-home8/8首试PASS（`first-home-browser-green.log`）。准备冻结下一提交，仍须全verify及双轴新收据后才可进行Native/默认资料验收。

## 第四候选d92e1761：源码复审PASS，完整运行未通过

clean d92e1761ab283fd00b712a86ce1358bbab780e61 / tree3b1dd058，Standards新收据`standards-final-recheck-aeea2aa5-856b-4b6d-8907-39edfaad1602.json` SHA5c4b6c709d16c9e9b6cf82d0c6c52e55f4391cf6e2c4132460f50d6c65d990dd，Spec新收据`spec-final-c76dc66b-2080-426c-a929-878f59be49dd.json` SHA305547f191a820fda129e8ed500654d909c1a9aae36b056f4fb76d0f32f89ce3；首次HOME两ID均独立关闭，原751反例RED/d92GREEN保留，源代码审查PASS不替代运行。

完整verify的lint/type、Node1934=1920PASS/14既有SKIP、Agent206=204PASS/2既有SKIP、UI/format/生产build通过。826项产品Edge中发现多组旧fixture在已建v3/format2后写回v2被保护拒绝、raw3误读project-root草稿、聊天选型误当画布卡选型、同chat三hidden草稿断言。持续同类legacy卡种子超时后，root核对runner53552→parent58880→本exec shell42928命令行，仅终止该测试树；run4ac775ff、完整日志`full-verify-d92e1761.log`和`interrupted-d92-browser-owner.json`保留，记INTERRUPTED/FAIL，后续DESIGN/development未执行。未解除保护、延长timeout或隐藏失败。

真实新增入口问题另以AST RED确认：App.handleNewBlankProject未明确selection，创建direct而非ADR默认Codex。仅给该入口传现有default/空model/text selection，保留项目画布型号、kind=image及其他API创建语义；新增2单位/邻域68PASS。其余按真实canonical chat/确定origin/serialize3与实际UI模型入口修fixture；垃圾箱新增完整多chat/线程/未知消息字段保全断言，SSR v2兼容测试、布局/卡片/状态断言不弱化。15文件邻域定向Edge158项中157PASS/1FAIL（run4716f97f），剩余API首次用例补明确从默认Codex切direct后，provider-scheduling12/12首试PASS。下一冻结提交再执行完整verify与独审。

Agent生产包在d92重新从专属fresh production安装完成，4282文件逐一核验原位复制，旧EXE/receipt/两个runtime共8566文件先保全至`native-before-build-77f4180d-4db2-4f7c-bd4d-dfec24a630ce`；无发布目录旋转。后续只改App/测试、vendor Agent源未变，此包需与最终Native收据共同绑定。Native新EXE尚未构建。

体积预算用同Node24.20.0/zlib默认参数，从固定469原源在fresh隔离fixture重建出相同入口`index-BlBp6PG3.js`（SHA0d47ae2c/701677B/gzip230670B）；d92入口`index-CEpPnlcV.js`（SHA2f49b21d/722752B/gzip237396B），增长6726B，小于16384B预算。首次Windows tar解码历史中文截图路径失败，残留和日志保留，改为只提取实际构建输入的ZIP且路径包含性校验后成功，不影响原仓。收据`.tmp/bundle-baseline-165d2589-31a5-4c93-8baf-19a1b7a9de3d/bundle-budget.json`；最终App改变后另测最终入口，不把该数字冒充新包。

## 第五候选c8406ea0：完整verify退出0，两个flaky继续诊断

clean c8406ea07eb01e71156cd96db356c740031835b1完整`npm run verify`退出0，日志`full-verify-c8406ea0.log`：Node1936=1922PASS/14既有SKIP、Agent206=204PASS/2既有SKIP、lint/type/UI/format/build通过，产品Edge826中824首试通过、2项重试通过；DESIGN41单位与8浏览器、development四步骤通过。产品run84c228c1完整保留，不能称零flaky。

首个flaky为旧首页8张在输入后意外变为可提交，正在核对加载完成与旧render草稿回调；第二个为侧栏Escape取消前读取保护。独立源码对账确认后者seedProjects仍用返回version2的emptySnapshot，在首屏已完成v3/marker2迁移后写入高revision local2，正确触发禁止降级屏障；修fixture为明确canonical3并serialize，不改产品保护、超时或有效取消断言。下一冻结候选重新验收。

当前c840双轴源码收据：Standards `standards-final-recheck-bdc3ef20-c0ef-4fef-b6ad-b126a779c266.json` SHA c130cff2ee148499f007b81e91ff929a50ee4f1175997560d0170e2f0b420d57；Spec `spec-final-944c2ddd-a694-42f2-adfb-ad86fb305779.json` SHA 79317cac761d06e722e51870e7eb92b7515bd0fde094d02df1c30362e2d77dba。仅绑定该源码，不自动批准后续修改。

22:21另存primary69文件与index/diff，原63项逐字节、HEAD及index仍一致；fresh工程外primary-concurrent-0392a06e-53cc-49ad-bd08-c9e0e3bdabe7收据PASS，SHA0097607881977021a4b241630dbfb4c34ccc1b79d2d11e1f70c4362c8f8ce3dd。默认资料仍未迁移。

首页加载交接确认有真实产品竞态：StartComposer传明确patch，但App.updateHomeDraft忽略patch，旧render整份默认草稿可覆盖刚加载的数量、隐私、参考图和模型连接。真实App函数RED为1!==8（home-loaded-draft-red-3e636f6f-5ecd-400e-9b8d-824eb7b3d83e.log），仅在存在patch时基于最新ref合并；无patch的显式整份替换保持。两新增回归及邻域148/148、root实际函数46/46通过。旧首试无trace，不虚称重播了该次准确时序。

生产重建后两份相关浏览器文件关闭重试并各重复3次，60/60首试PASS（two-flaky-repairs-repeat3.log）。侧栏种子明确canonical3、保留所有原断言；迁移防降级屏障未改。下一clean HEAD再跑完整verify，Native/default仍在门禁后执行。

## 第六候选09fcd947：完整verify退出0，一处同类fixture继续修复

09fcd9470647916d8cf15e12c2ff99f2bb883f3a完整verify退出0（full-verify-09fcd947.log）：Node1938=1924PASS/14既有SKIP、Agent204PASS/2既有SKIP、产品Edge825首试+1flaky，DESIGN41+8及development四步骤PASS。原两条flaky首试通过；新阶段结果审批失败run34243b06的UI明确提示迁移状态不一致，openPlans仍在page.goto后写高revision v2。完整扫描剩余emptySnapshot调用者，修正stage/task/ui-page三处普通种子为canonical3/serialize；有意的v2迁移、Native旧契约mock、companion和纯SSR兼容场景保留，不解除生产读取保护。三文件重复3次、关闭重试84/84首试PASS（remaining-canonical-fixtures-repeat3.log）。产品源码不再变化，下一clean候选再执行完整门禁。


## 最终冻结89b8291b：完整本地验证通过，真实新回复受额度阻塞

当前事实以本节为准；此前“默认未迁移”“新包未构建”等均按各阶段历史理解。固定source `89b8291bf0395b9e78797a3d67652ae5458e5b30` / tree `9d2c7edb`，base `bbc8a766740ec94d30171020cf208a6aeb3c87d4`，branch `fix/TASK-CHAT-MIGRATION-20261017`。最终文档提交只同步治理与证据，产品/配置/测试输入与该冻结候选相同；完整verify和Native验收明确绑定89b，不伪称在后续文档HEAD重复运行。

Desktop/Web 2.1.37（Mobile 2.1.1规划），冻结源码89b8291b；默认原9项目已迁移snapshot3、11个独立聊天上下文，repositoryId和原始资料保持；编辑、旧历史持久化及正常关闭重开证据见本轮验证。真实新回复仍未验收：Codex共享周额度100%、ordinaryUsageAllowed=false，发送前拒绝，/turn提交0；预计北京时间2026-10-23 04:08:15重置。未消耗reset、未购买额度或绕过保护。

### 验证与独立审查

- 完整 `npm run verify` exit0，`full-verify-89b8291b.log`：Node1938=1924PASS/14既有SKIP；Agent206=204PASS/2既有SKIP；产品Edge826首试PASS、0fail/flaky/skip；DESIGN41单位+8浏览器、development四步骤以及lint/type/UI/format/build通过。产品run `c3fc7a10-6efb-4c1e-9880-a5834cfbf296`；外部收据 `full-verify-89b8291b-8ac00bba-ba31-423e-9f9a-ca6d839ef9ab.json` SHA `fc0ed475f83ac63710744249f923b3e3e139ac9a5bd5fc56b42fc26cecd13d73`。此前flaky和失败均保留，无增timeout/retry或放宽格式保护。
- 同一Rust源2.1.37：226PASS/1既有硬件ignore，integration41PASS；`cargo-final-2-1-37.log`。独立Standards source PASS（overall含文档follow-up）、Spec source PASS/无代码blocker，最终复核修正TESTING Desktop数为26=20mjs+6ps1。收据SHA分别 `ff8eb2edd6e9872c26f161683cc95fa2935cdb5626307e16b74e1d2b57b35802`、`973783d409a3fa3c9a4210ef7bd61049e1f1b5abe28386307eb9e77ecbd680c2`；合并来源收据SHA `99f97420589cf5ba08508a02a10eaa41935c4e6943cbe4b3181448b6fe9f4a4a`。源码批准不冒充聊天回复或Hosted批准。
- 官方Windows EXE SHA `aa135d3b92af5874e5f381d9ada3c2ed233da30aedfd8b57fcd38d3fbf677373`，输入SHA `8eef2caad381067af58698ed1100043731834d747ea7e7dc93d614fc25c98d5b`。真实WebView加载 `/assets/index-C-A_JAA6.js` SHA `e72d744f4f2b4b17cc02b2be7635392cc02edc8d0b41204bc91d4349f0a889a6`，与dist逐字节相同；Agent生产白名单4282文件逐一校验。入口gzip237433B，相对固定469基线增长6763B，小于16384B预算；预算收据SHA `8a4d0ecb0b71e32adbf6e3f863a1a5d7c46dad695ad932994ee90892e5d88b11`。
- Native原库副本最终130检查PASS，run `5448557e-ed62-4510-a78b-6edee6a0dde7`，receipt SHA `36d2f4080ec1488fd631939557a178630b64a511a2c1d2644db05881dba74ba4`：9项目/11chat/3任务/18卡、两普通chat编辑切换/关闭重开，11素材文件15661180B全部字节相同。最初retry-parent更新时间、未关闭设置浮层和运行期独占lease EBUSY的三次harness失败原件均保留；只对基线证明的retry parent时间允许本轮有限更新，空lease在正常关闭后校验，未削弱业务字段/锁。

### 实际默认资料迁移、失败诊断与恢复

迁移前即时全量保全 `runtime-userdata-a3b1481c-519f-48e4-afdf-4e0a33dabff5`：2491文件259972032B/122目录；保全receipt SHA `b2d6507a7d0717741101f76e65cbd76d350a8a002f6dcfaef8145914f1cf7f2b`，独立枚举/重哈希收据SHA `bf89b2bc15565e7bb058dccced37af6d29073d6132425565f259d04d32723904`。最初v2主备/身份原字节、5个原rollout和旧EXE/runtime均保留；恢复路径仍在上方工程外根，无原文件删除或移动。

默认迁移run `8de3d500-efdb-412c-b759-1514f77ca79d` 的v3主备、同repositoryId format2/minWriter2、归档/plan/complete及图结构对账通过，但正常文本验收FAIL，完整receipt SHA `c42cf3860f377024487978fc68321c90621c5b8cbb7598d0b198316cb71b3176` 保留。该harness只等待turn/回复，未记录发送前UI错误，180秒超时；后续受控诊断才明确当前quota阻断，不将后验结论当作首次UI实测。没有证据证明首次请求已送达或React崩溃。所选旧线程原rollout本来只有settings记录、0条正文；5个原线程中4个原本为空，1个确有历史，不能将空线程误认作解析丢失。

原权限scalar从迁移前完整WebView副本读取为null（原key不存在），未向原profile回写读取脚本；safe reconcile run `73af38f2-74b2-4074-984f-1d97cfe97bfc` 通过Native expectedRevision CAS仅恢复本轮owned草稿/活动选择及精确权限scalar，所有原/当前消息和其他字段保留，不做整库回滚。后续controlled诊断run `2940e5fa-fed1-4e11-8c5f-6539f5e91d2b` 禁止一切上游turn，明确捕获“Codex额度已用完，请等待重置”，/turn0、DOM app/sidebar/main各1、pageerror0，恢复/正常关闭PASS。两条未提交的本轮探针回显作为证据保留，不当作上游成功；没有自动重放UNKNOWN任务。

独立账户只读查询 `quota-readonly-20261017-151927Z.json` SHA `0750355af7355aaa7db5959ebae04b382e581ecf2e996a9701a6c9ea9d2f02e1` 确认codex primary100%/10080分钟、reset1792699695、ordinaryUsageAllowed=false。发送链 `agentConnection.ts` 先保存user echo，再刷新quota并拒绝，现有2测试和独立6断言通过。没有修改正确额度逻辑、使用reset或支付购买。

历史验收前新增完整v3安全点 `runtime-userdata-3ffd3832-86cd-44e2-ae40-13ad132206d6`：2586文件353697693B/124目录；receipt SHA `b27582160f07eba42703aa6fac3a0e9f6f0c7f81132e3669889f782907f43c18`，独立2586重哈希0 mismatch收据SHA `7d734d934f35e77cf8811fcf4903eac7d7bce4a88d68b0505e7fb0042a5c6585`。最终真实旧历史/草稿/重开验收报告 `test-results/native-default-history-acceptance/5e3517e7-790d-4610-933e-22b3c80cb1ba/native-default-history-acceptance-results.json`，SHA `2f0e8c316e11d142b2ad392405f7ef52701a5f252f20c38c4a257fe5b6901c5a`，完整原返回及原草稿在私有证据留存，不进入仓库正文；所有turn/approval/generation禁止。具体逐项检查以该真实报告为准。

历史验收首轮877ce5e9在草稿编辑和正常重开已PASS后，恢复CAS与尚未完成的自动保存冲突，正确拒绝；finally重复EXCL文件名又产生EEXIST，未恢复测试草稿。FAIL收据SHA `15b9296c7a79f0522f568184c59f6945bdbbf5f74ff4d0b5aefc12d5e6c3aa23` 及原草稿/owned测试草稿/首次CAS输入完整保留。限定恢复run `4acca2f2-2305-40b4-9c13-754c69627903` SHA `198ef7887cd279dd3525cd9d29deddc916d8d84ad0db4b44d99e9c918bb6d296` 通过；仅依据这些精确摘要、等待3次磁盘稳定后用fresh revision CAS恢复测试草稿/选择/权限，所有消息保留。脚本改为每次唯一证据名、证据I/O后重读并重新证明owned字段；仅显式conflict允许至多一次重新核验，不绕过Native保护。

最终5e3517e7：5条原线程均真实request-mode resume并保存稳定3次；1条非空返回16条canonical记录（UI7条非tool和9条执行记录），4条原本为空的远端仍为0，已有两条未提交本轮探针不被远端空历史覆盖。全部5chat在正常关闭重开后离线逐条DOM文本、角色、执行行和完整canonical消息字段一致；草稿普通编辑/关重开/精确恢复通过，原完整草稿/活动选择/权限恢复，3次正常关闭、pageerror0、turn0、剩余Native0。服务返回为其完整turn预算内历史，不将16条解释为原rollout所有事件；原完整rollout始终在不可变归档。

最终主目录补保全 `primary-concurrent-e5b337b4-0f38-4902-94c3-1aad0e0de5f2` SHA `5a35d5efa45fe87554c3c3e47faebb6b641edc2de716928a78e29fdc6005dd69`：69文件1501601B、原63项字节/HEAD/index保持、staged0，6项并发文档路径未回退或并入。原状态漂移失败仍保留。

最终正常关闭后的默认资料另完整保全至 `runtime-userdata-fa666250-21b5-442d-adcd-36fdf4a9c7d1`：2707文件353875715B/124目录；保全收据SHA `037a3f8803d50fb36e8ade9cd1e458297df69e4526e30201a117d7408685ba35`，独立重新枚举并重哈希2707/0 mismatch收据SHA `e3c31d61c02532774ac8f0ca12093c570351890eec2eeb5679f514740dc55c76`。当前可写资料与最初v2原件均有独立安全点。最终文档lint退出0，既有code-health/Windows-footguns advisory保留；没有关闭检查或提升能力状态。

### 剩余边界

本任务保持PARTIAL/NOT_VERIFIED：本地保全、迁移、编辑、历史持久化和运行恢复完成；正常新回复仍需账号解除额度后一次明确受理及回复实测。当前150任务85DONE、49PARTIAL、12TODO、3BLOCKED、1IN_PROGRESS，65开放；未批量关闭旧统一/Provider/12AI/垃圾箱/账号/VPS/Web/Mobile/签名任务，也未提升37功能成熟度或冒填runtimeEvidence。后续从现有v3继续，绝不将旧v2覆盖默认库。无push/merge/远端规则修改或发布；Delivery和最终文档精确HEAD复审以提交后外部收据为准。
