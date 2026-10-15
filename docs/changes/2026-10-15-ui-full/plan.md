# 全页面新UI收敛实施计划

## 当前执行位置：2.1.30本地冻结（2026-10-15）

- [x] 复证真实300ms/物理32ms侧栏点击4FAIL→仅等rail完成4PASS，最小12行CSS与4新case，定向21首试PASS；Desktop/Web递增2.1.30。
- [x] 完整verify8的760浏览器首试/0retry、fresh Native9的87项/13图与TaskHost current5无注入11项分别PASS，自有进程退出及端口释放已实查。
- [x] 旧Hosted因果限制、Native8单位夹具失败、Native4默认profile偏好例外及保全记录集中于[最新验证](verification.md#2130-当前本地验收)。
- [ ] 形成最终head，完成精确base694→head独立source/integration审查与当前SHA Hosted/Delivery。
- [ ] 普通合并PR59，fetch核对main实际树及post-main；原任务、历史分支、primary文件/index保持。

当前REVIEW/整体NOT_VERIFIED；旧SHA绿色不能代替最终2.1.30门禁。

## 此前阶段记录（原文保留，最新状态以上方为准）

## 当前执行位置：2.1.29本地冻结（2026-10-15）

- [x] 三CLI卡片最小共享修复、三宽9有效RED→9GREEN，Desktop/Web递增2.1.29。
- [x] 完整verify7的756浏览器首试/0retry、fresh Native7的78项/12图与TaskHost current4无注入11项本地通过，资源同字节current。
- [x] 历史同式invoke赋值guard安全结论勘误、受控readiness与actual3 UNKNOWN边界及原138任务保全已集中记录于[最新验证](verification.md#2129-当前本地验收)。
- [ ] 形成最终head，完成精确base694→head独立source/integration审查与当前SHA Hosted/Delivery。
- [ ] 普通合并PR59，fetch核对main实际树及post-main；保留primary、历史分支和用户资料。

任务仍REVIEW/整体NOT_VERIFIED；旧SHA通过不能代替最终2.1.29门禁，Mobile2.1.1规划不变。

## 原需求与历史阶段记录（原文保留，最新状态以上方为准）

**Goal:** 将现有可达页面与卡片统一到当前UI，验证历史恢复并通过PR合主线。
**Architecture:** 复用tokens、共享输入框/模型菜单及卡片renderer，修既有owner；数据继续走原codec与存储身份。
**Tech Stack:** React18/TypeScript、Vite、Tauri2、Node24、真实Edge Playwright。
**Spec:** [spec.md](spec.md)。任务由root按顺序执行，三个独立只读审计并行；遵循项目SDLC与验证约束。

- [x] 核实规则、最新6bc2e3da、实际fetch主线和干净隔离树；基础build通过。
- [x] 清点实际可达页面/卡片/模型caller，建立[覆盖矩阵](coverage.md)，保存CSS/DOM与历史主线保全审计。
- [x] 依用户追加纠正逐类型建立空/有内容/运行/失败/恢复互斥矩阵，复证空态toolbar=0、有内容唯一toolbar及真实动作链；保留旧79/新checkpoint50的原范围，新状态按verify-3/Native56独立验收。
- [x] 已只读核对Skill/MCP/伙伴与模型接入分类；任务重试4条真实RED后统一全部caller可用性，34保护unit通过，HUD/详情/矩阵实际Browser断言与完整verify-3通过；分类状态按fixture范围记录，不代填外部连接。
- [x] 为确定问题增加用户行为与恢复RED；最小修复共享CSS、菜单caller、输入布局及真实恢复缺陷；单一写入者。
- [x] 已取得79条定向生产浏览器GREEN、三宽全部设置3条PASS；普通菜单最终2条GREEN及完整verify-3已通过。各轮失败/误设均保留。
- [x] 审计主线squash差量并本地承接固定main694：checkpoint0f506ae1→merge1653966f；104冲突/25自动差量逐项核验、21历史blob保全，Delivery704/0；这不是远端main落地。
- [x] Desktop/Web受影响版本递增，完整verify-3、Delivery704/0与新Desktop56项资源身份验收、source/integration241精确审查已PASS；最终文档/test-only head另补审。
- [ ] 已推送f090并建立ready PR59、精确aggregate review PASS；首次Hosted verify因外部snapshot依赖FAIL。修复后完成新SHA独立补审、全部必需托管检查与线程，通过后普通合并。
- [ ] fetch复核merge SHA/main实际树与post-merge检查，收尾账本/恢复入口；不更改primary并发文件或清理历史分支。

风险重点：Google/重绘模型能力和配置身份、长型号/variant、浮动菜单、旧项目文字/媒体恢复、squash后主线治理保全、真实运行资源新鲜度。


此前执行位置（241阶段历史记录）：source `241f3050124ad7773ced0b47a55629373177205e`。165完整verify在Browser740/745、5失败处退出，source/integration review三P2均CHANGES_REQUIRED；241修复后的14条定向GREEN已回读。当前等待完整verify-2、新Desktop/Native及241或后续最终head独立复审，之后才做Hosted/PR/main；以上未勾选的最终验收不由中间GREEN补齐。


阶段补充：241官方隔离Desktop2.1.27 Native56checks/0errors、dist资源字节与release身份、owned正常关闭均PASS，source241/integration241精确复审PASS关闭三P2。完整verify-2/最终文档head及Hosted/PR/main仍未完成，相关整体步骤保持未勾选。


最终本地阶段已完成：verify-3 exit0 / Browser747首试全PASS / development PASS；Native56、Rust163及source/integration241审查PASS。verify-2音频全局selector夹具失败和修正后的实际播放2PASS保留；当前REVIEW/整体NOT_VERIFIED。最终doc/test-only提交head尚待root形成，远端两个步骤保持未勾选。


- [x] 修复Hosted snapshot默认父目录扫描，保留仓库内必需规则和显式外部fail-closed；有效RED2FAIL/3PASS、当前定向GREEN23PASS均留存，扩CLI不变量后运行不设外部env的完整verify-4。当前PENDING，不由verify-3或23条定向通过代填。


最新本地完成：verify-5不设KK_CONTAINER_ROOT exit0（snapshot3/0、Node1301/14skip、Agent199/2skip、Browser747、development四步），显式外部snapshot4/0亦PASS。Native仍current/input与EXE未变；CLI24/offline AI-evals为有限dirty预检。仅最终修复提交HEAD的独立exact-SHA review、推送后的新Hosted/PR59普通合并与post-main仍待完成，远端两步骤不勾选。


- [x] 修复c498 Hosted Windows发布fixture非canonical临时根：仅测试用realpath，不改安全guard/回滚断言；保存Node1294PASS/8FAIL/13skip及snapshot3/0的实际Hosted范围。真实8.3 fixture11/11及较浅短TEMP完整Node1301/14skip、lint/typecheck/format已PASS；新head独立补审/Hosted待验，旧Hosted未运行Browser/Rust不补PASS。


最新本地完成：short-temp run2本地PASS：Node1315=1301PASS/14既有platform skip/0fail，lint/typecheck/format全部exit0；这不是完整verify-6。真实8.3 fixture RED11项3PASS/8FAIL复现Hosted，GREEN11/11PASS/0skip，junction/unowned-stage/identity-swap/rollback守卫均实际执行；只改agentPackage测试fixture根await realpath（4+/1-），产品安全脚本零变更。 首轮短TEMP Node1299/2fail/14skip与canary1两失败保留；较浅actual8.3根下canary7PASS/3Linux skip、完整Node1301/14skip及静态通过。原Browser747/Native56/Rust163沿用未变产品范围；最终修复提交head精确独立审查、新Hosted完整门禁、PR59/main/post-main仍未完成。


- [x] 对54a2 Hosted gateway首次ready超时实证启动夹具计时缺口：preload7s同栈RED，双冷启动GREEN4/4与focused21PASS；仅测试84+/14-，保留20s及提交/恢复断言。实际8.3完整Node1304PASS/14skip、lint/typecheck/format PASS，不称完整verify-6。
- [ ] 回读旧54 push38645320833；提交新修复head并独立exact-SHA复审、新Hosted完整门禁、PR59普通合并和post-main。Hosted当次child alive/crash仍UNKNOWN，时长variance不是slow CI根因证据。

## 当前执行位置：2.1.28设置竞态候选

- [x] 回读54 push38645320833：Repository verify exit0但Browser746 PASS/1 flaky（sidebar目标文件夹首试缺失、retry通过，原缺trace根因UNKNOWN）；Native旧“配置供应商”定位FAIL，保留原8检查收据。
- [x] 回读2d push38647654947：Browser746 PASS/1 FAIL且retry FAIL；冻结真实select连续B→A在旧产品RED2为3/3 FAIL，race-red-1混合源码仅保留单case诊断证据。
- [x] 最小修复ProviderModelCatalog字段同步useLayoutEffect，dirty/账号/保存校验保持；Desktop/Web自动递增2.1.28、build PASS；完整settings七case×六次42 PASS/0retry/flaky/skip。
- [x] Native TaskHost夹具对齐当前模型菜单/官方API表单与持久草稿四结果，真实旧release2.1.27的11项PASS、0error、秘密清理true，五进程退出且端口释放；不作为2.1.28验收。
- [x] 2.1.28完整verify-6 exit0、747 Browser首试/0实际retry、Node1304/14skip与Agent199/2skip；fresh Native5 56/0/10图、新版TaskHost11/0/凭据清理通过，verify-6后input/EXE同字节。sidebar原缺trace根因仍UNKNOWN，Native2/3/4夹具前置失败全保留。
- [ ] 形成最终产品/测试/版本/docs head，独立base694→head精确source/integration补审，新Hosted门禁通过后普通合并PR59，fetch核对main/post-main。

当前提交基线2d4be5fca4c2167d4bc0d500634645624f311505；新候选尚未提交，main694 / PR59未合并，REVIEW/整体NOT_VERIFIED。Mobile2.1.1规划及其他功能成熟度保持；旧版本本地PASS不能补齐上述未勾选门禁。

当前本地阶段完成：2.1.28完整verify-6、fresh官方Native5、TaskHost新版及资源字节身份均PASS，具体计数/原失败边界见[verification](verification.md)。文档owner独立确认747结果均首试通过、实际retry0。2d PR quality38647660224最终FAIL（settings flaky+Native旧菜单），不能代填新Hosted成功。最终产品/测试/版本/docs head尚未形成；下一步为最终SHA独立source/integration审查、新Hosted、普通合并PR59与main/post-main，相关步骤仍不勾选。main694未合并，REVIEW/整体NOT_VERIFIED，Mobile2.1.1仍规划。
