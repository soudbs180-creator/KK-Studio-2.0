# Verification：首页恢复

- Task ID：TASK-CODEX-HOME-20261015；状态：NOT VERIFIED；[Plan](plan.md)。
- 基线main3a992597 / 安全堆叠f9c6aa71，产品仍2.1.33。前置安全源码9aa完整verify及47文件独审通过，PR62当前Hosted中，不代填HOME结果。
- 领取时本任务尚未运行RED、修复、当前版本完整验证或客户端验收。全部新产物将写入独立run及工程外清单；旧失败与九项目保留。
- 领取时governance正确拦截同树两个active任务（GDI仍REVIEW）；现将已推送冻结PR62的GDI停在PARTIAL/等待Hosted，root串行领取HOME为唯一active写入。没有新建worktree或唤醒原会话，安全PR源码不再修改。

## 当前dirty运行证据

- Node连接新增6项首轮5个有效RED/1个显式新会话保护PASS。第一版newThread计数用了错误URL，修正为真实threads/new后重新RED；不把夹具错误当产品失败。共享flight/同凭据幂等后6/6 GREEN。
- 本机HTTP邻域首次sandbox 39PASS/6FAIL并fetch failed；同源码正常Windows权限45/45 PASS，未改断言。新增重复完成通知RED 2次原图读取；独审HOME-EPOCH-01提示后补实际RED：旧连接usage阻塞，新thread-new就绪后释放旧usage，错误读取thread-new/old-project-image。按epoch/image共享导入与尾部epoch检查后46/46 PASS。
- 两个浏览器真实RED（不重试）分别得到旧prompt A仍持久化、实际turn.messageMetadata undefined。修复只清本次pending草稿所有权并限HOME图片来源；手动编辑B/替换附件仅发一次B，发送中C保留，homeDraft/项目历史附件不变，重载不复活A；普通图片聊天无生成来源标签。
- 来源首轮GREEN失败为夹具仅发terminal但服务hello仍busy，补真实ready/busy=false；随后发现双完成通知重复取图，未删除1次原图断言，已实际单测RED并修复。全文件8项最新首试通过（14.7s/0retry），包括1原图/1结果/1来源边/重载无重复。
- 全文件首轮数量1/4失败及单项不变源码PASS都保留。静态线索为初始emptySnapshot=1、读取中输入导致整个新homeDraft覆盖seed4；工程外控制IndexedDB读取的探针实际证明seed4→读取期编辑→持久count1，文字保留。探针首轮cwd错与未等落盘失败保留，最终观察PASS仅证明问题存在，不是修复。原随机失败具体时序未记录，因果推断单列；正式回归补等待真实读取提示消失，并仍断言4张。新问题挂TASK-HOME-LOAD-DRAFT-20261015，不伪称已解决。
- 日志均在工程外统一证据根，home-connection-red-valid.log / home-connection-image-epoch-green.log / home-retry-red.log / home-retry-coalesced-neighborhood.log / home-loading-observation-durable.log。运行sourceHead为f9c基线上dirty，不能声称最终冻结SHA通过；源码冻结后须完整verify。
- Desktop/Web源码2.1.33→2.1.34由version:bump产生，Mobile2.1.1不变；尚未新Tauri构建/真实客户端验收。PR62仍待Hosted，不提前合并或更换daily。

## fc76冻结完整运行与实际main承接

- 源码fc76e40424872e3c43fa8ef3b2444c2512832394完整Windows npm run verify exit0：Node1356/1342PASS/14既有skip/0FAIL，Agent201/199PASS/2既有skip/0FAIL，Edge785唯一测试/785次执行/全首试/0flaky/skip/errors；development5步骤PASS/errors=[]。sourceHead均fc76，未重标。
- 浏览器报告cb60d062-2e80-40ac-92f1-85c66b15fdf6，SHA2566cd5b707f3ac203a9d9235c5ff82b068f33924be96a89b7b30f1d4a2b4d83e07；906旧文件/备份1812hash与1333最终产物/备份2666hash均独立核对一致。外部完整日志home-fc76e404-verify.log及before/after-manifest.json保留。
- 同状态截图与DOM：1920×1080、http://127.0.0.1:1423/、production、entry src/main.tsx，实际加载index-lkY5wj3H.js。链路src/main.tsx→App workspace→ConversationPanel→AgentComposer；结果由agentConnection/agentImages→App bridge归档Canvas。截图证明新输入保留及来源结果边；新模块homeAgentRecovery只承载请求/草稿所有权，不新增视觉规则。
- 独审PASS_SOURCE_SCOPE与PASS_LOCAL_VERIFY_SCOPE均绑定fc76，22文件，无未关闭源码P1/P2；HOME-EPOCH-01与HOME-TEST-01关闭。不是Native/真实Provider/用户验收PASS。
- 前置PR62完整PR/push Hosted成功、最终独审及远端门禁通过后，正常expected-head squash为main492abad4；fetch后git diff f9c→492 exit0，main tree414e7947d13886ee4ee9c52b0cdb95fd3802a583。旧HOME临时分支保留，仅挑fc76为c180c366，git diff fc76→c180 exit0。没有重放旧安全提交或force/rebase。
- 依赖切换事故发生在上述fullverify结束之后；另见[事故恢复](../2026-10-15-dependency-repair/verification.md)。本轮记录如实保留，不能把恢复后的环境称已重跑全部测试。新原生构建与代理模式验证继续，日常EXE/九项目未用于夹具。

## f10实际Native与HOME-NATIVE-01（保留FAIL）

- f10c59ff官方Agent构建底层成功，版本2.1.34，EXE f58fbad15e69088e43ca39323a442e766d705f94d3f9e1d787800019f6568761，input 2720af2c3a6384fb3bc01c9f332298e7d22d1ed0d1497d3d54bf9e74a94f7514。外层因3个stat-only文件返回失败；raw/normalized均与HEAD相同，备份后只刷新当前index，源码无漂移。Rust167/fmt通过。旧EXE/receipt/运行资源及dist保留在工程外home-native-f10c59ff-preserved。
- 编译代理VITE_KK_AGENT_PROXY=1、独立outDir和回环重写fixture 1/1首试PASS；生产bundle index-BYiRhwBQ.js，实际HOME与effect只一次config/prepare/turn；报告SHA32900690a4202356eba3f0b3019bdfb84bf641530bddd3146ac55fd901abb943。不是VPS或真实Provider验收。
- 原Native脚本及仅增加失败DOM捕获的diagnostic clone均FAIL：首次空HOME启动、项目自动连接/保存thread、页面reload正常；正常关闭后reopen的原connected断言失败。两次原件home-native-startup-f10c59ff与home-native-diagnostic-f10c59ff保留，未削弱断言/点击项目掩盖问题。隔离资料，synthetic credential清理true，未替换daily或调用模型turn。
- diagnostic卡片实际错误“Agent 未返回可验证的启动状态。”；runtime available=true/running=false/healthy=false/pid=null。该错误在当前Rust只可能由32条非READY行耗尽触发；具体32条内容UNKNOWN，不记录token或账号日志。源码证据：冷恢复延后READY，Codex stderr经Winston普通Console回流stdout，私有握手被诊断占用。两位独审一致定位HOME-NATIVE-01/P1。
- 真实desktop-entry临时packaged-layout夹具先RED：恢复3轮诊断后stdout98行而非1；日志home-stdio-red.log。最小修复在导入前保存原stdout writer仅发READY，普通stdout委托stderr；Native已stderr=null，所有Rust身份/大小/行数/超时限制保留。补长行9000B、伪READY、READY后诊断和真实entry鉴权/owner断开覆盖，home-stdio-green.log 3/3PASS。此为dirty定向结果，新冻结fullverify/重建Native仍待，原FAIL不改写。

## a85冻结全量、官方Windows重建与冷重开（本机PASS）

- sourceHead固定a85ace9009cf5120476adbf46db8b3c318099590，tree在整轮保持clean。物理本地依赖，完整npm run verify exit0：Node1357/1343PASS/14既有skip，Agent201/199PASS/2既有skip，production Edge785唯一用例/785次首试/0FAIL/flaky/skip，development4steps/PASS/errors=[]。物理目录不进入linked-dependency-parent-remains-denied条件，原断言未删；旧fc第五步仍保留原证据。
- 统一外部证据根D:/kk-studio/.verification/2026-10-15-unified-execution-0908；home-a85ace90-verify.log SHA25686e5250797c4e8c6c5276daf55bad49f2773a6cbf1f31f2030c07c5014c593d7。browser run7ca1e450-1e6c-47bb-b22c-f353426af722报告SHA7645cf5ec9f31e097e812d068636b57e2e64b5b3994969a07a4f4ccbeb5e5afc，sourceHead与worker同run。development d76c9d15-0c1f-4d81-a7ef-6be494ca6645。
- 旧1336原件/备份2672hash保留；最终1763原件/备份3526hash通过，共6198/6198 hash及长度由独立evidence_review回读一致。新增427文件（browser425/development2），407PNG签名正确；after-manifest SHA66ff8146887b4ee165344afdf577868985767d8e885987a8cdbe734d2d4bd01e。
- 官方ensureDesktopRelease→npm run client:build:agent -- --no-bundle exit0，source a85/clean，2.1.34 EXE f8cbfd5db0bf6abd1a47fa45cd68e776974b91094b300067f177eb724ac1887f，input f94837afea15540d69a15a0c06c4ba9d51b1df6c45b04957a0b8ac79b40f7570，receipt reason=current；旧f10未覆盖丢失，4433文件原包已独立核hash保存。cargo fmt --check及cargo test --no-default-features --locked本轮167PASS/0fail。
- 原tests/desktop/agent-startup-recovery.mjs实际exit0，38checks全部true、3次launch、errors=[]；home-native-startup-a85ace90/receipt.json SHAbcf228243303f00f00670dded7f3e69c0e6db927a0109d5b21bb3ff928855957。官方start-kk-studio.bat --background --data-dir隔离启动；独立profile/CODEX_HOME且剥离API凭据，3轮实际加载assets字节与dist一致，URL http://tauri.localhost/、production、index-lkY5wj3H.js，route/import沿main→App→SettingsPanel Agent卡片/desktop bridge。实际正常关闭重开恢复原thread、显式disconnect跨reload/reopen暂停、manual reconnect/stop/restart和未知归属拒绝都通过；reopen-connected.png/DOM显示已连接，原断言未改。
- 观测CDP attach后model turns=0，CDP前请求仍NOT VERIFIED且未被此结果代填；唯一synthetic credential清理true，owned实例正常关闭。证据25文件另有home-native-a85ace90-manifest.json。不是日常profile/真实Provider/用户视觉或正式安装包验收。原f10两次Native FAIL不重标。
- 源码差量独审PASS_SOURCE_DELTA_SCOPE绑定f10→a85（11文件），无新增P1/P2，所有Rust守卫保留；HOME-DOC-PRIMARY关闭。实际Native获PASS_LOCAL_NATIVE_STARTUP_RECOVERY_SCOPE，原脚本hash与失败时相同，HOME-NATIVE-01关闭；正常HOME PR/Hosted/main与剩余数据/外部验收继续。

- 正式PR前重新fetch/API核对main仍492；前置main新质量/guards/health全部success，GDI按独立合后范围DONE。输出保护仍缺取消/reporter失败实测，明确PARTIAL并交给独立外部探针，不阻碍已受独占目录/6198hash验证的本轮HOME证据。
