# Verification：本地剩余项与规则核对

- Task：TASK-LOCAL-GUARDS-20261018；有界本地DONE/PASS。原65项开放任务及37功能成熟度不批量关闭或提高。
- [Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。
- 物理树：`D:/kk-studio/.worktrees/TASK-AUDIT-REPAIR-20261017`；branch `fix/TASK-LOCAL-GUARDS-20261018`。base `e11b87a579a92f89d7d60f9c2f1be15bfb033065`；冻结产品source **92643d6729caa667a89779cdba7b37eee614f938**，tree `f0509c5220408714c857df666ef86e75f24759a7`。
- Desktop/Web **2.1.38**，Mobile **2.1.1**规划。最终文档commit不改变已验证产品输入；精确补审、Delivery及最后日常启动按工程外提交后收据裁决，不能视作Hosted/合并/发布。

## 保全与数据边界

工程外本轮根：`D:/KK-Studio-recovery-20260921/remaining-local-20261018-c7960435-8faa-4397-8009-1dbafcdeece3`。

| 时点 | 实际范围与结果 | 收据SHA256 |
| --- | --- | --- |
| 写代码前 | 7树105项dirty源文件/删除标记/链接元数据、精确index/diff/status、all-ref Git bundle、raw3主备/身份检查点；副本逐字节核验、refsStable=true | 5b4c7b828e2a16adaa9e7598da9c4757a55a67eab7f18504e37f28310c35b49e |
| 构建前正常关闭后 | runtime-userdata-f0f7d0e0-6b0a-4cb8-920c-706e4c12cb22；2721文件349055264B，完整Roaming/WebView，独立重新枚举哈希0 mismatch | backup 1d0695496d80abe1e2a4b39aaebc4469031cbf4037b61fcbdb18b4e14137a117；independent 2238e2faccbe63d0a4b55942b726f1d884820c8f9c8709eea1f9d5ce8ba2a6f8 |
| Native两次关闭后 | runtime-userdata-4c463e0a-1ec7-471e-89fc-bd74d01f8ab6；2755文件349604007B/125目录，独立2755个源/副本全重哈希0 mismatch | backup a38fc935d5153fe91dbcd5ff29f383769ae550027fd621583e9ca2af04c91031；independent ee5d4b15ba0d78132e4d8b464f62b7dd8e31ba8693b05e64803704dc2afd2ae0 |
| 原主仓最终再验 | 当前69文件1501601B另存；原63项全字节、main HEAD、精确index和staged0保持，6个并发路径不回退/并入 | 2a85afb359dc22f8b89d8a5f4ad0add383e74148a12409cd865760007b7a08cf |
| 旧产物/容器文档 | 37 EXE/receipt及两个runtime manifest另存，完整原37运行时已有上轮归档；容器README/结构/RULES/coord原件先复制核验 | prebuild 1882ae77de58da2defac7843dd40f07e168dec804b4e8cac65fa44473038c932；container e756a7e6819c3b7908d82dd95e0e308ebeacea4d627d3b739485f7edc53417b8 |

所有上轮v2原主备、repository身份、v3不可变候选、5份旧rollout和旧失败均保留。本轮不重复迁移、不覆盖回滚原库、不删除/移动文件。当前启动前为9项目/11聊天/**21条**canonical消息，先前18条是旧时点，不能拿旧数量回退后来内容。用户资料/原始错误日志仅本地私有，未提交/上传；共享memory文件当前不存在，按optional null前后严格保持。

## 最小修复与真实RED/GREEN

1. **工作树检查**：Git枚举失败、空分支、缺失登记、显式越界目标失败关闭；CLI接入现有`--path=`约定；超预算现有分支复用。8项首次5个预期FAIL，修复8/8 PASS。收据`.tmp/task-remaining-20261018/worktree-policy-45534a0f86b34e16b9b855eeb9f4b0e8/summary.json`。无提高预算或清理。
2. **凭据缓存**：primary持久成功后发布缓存，失败保留旧有效值；generation隔离迟到读、撤销和双层删除结算；逆序写以实际持久完成顺序发布。首次14项6个预期FAIL，五文件邻域59/59 PASS。收据`.tmp/task-remaining-20261018/credentials-receipt.json`。Layered/Protected构造点当前仅在测试，不冒称真实DPAPI/Provider已接好。
3. **测试证据**：真实runner取消为exit130/interrupted，JSON reporter同名目录故障exit1且测试本身passed；成功/失败/取消/报告错误/污染场景均保持旧receipt、PNG和report哈希。最初10/10局部PASS并不掩盖后续独审反例。
4. **独审ENV-001**：25ffcf1e只delete大写环境键，Windows小写变量可覆盖合成旧报告，Standards判CHANGES REQUIRED。保留反例后按实际keys.toUpperCase匹配原4名，新增混合大小写真实runner：RED runner退出0但旧报告被覆盖、外层保护断言exit1；GREEN全文件11/11、旧3文件SHA保持。收据`.tmp/task-remaining-20261018/env-case-receipt.json` SHA **83381205185daaf1248e6130393424f09370e24e2144d5e92e208ba734a20c69**；926独立复验关闭。

取消只验证runner SIGINT事件处理，未证明操作系统Ctrl+C投递。旧环境比较harness错误、TEMP模块边界失败和首次policy检查reason字符串拼写错误均保留并标harness失败，不伪称产品RED。旧环境错误含元数据，仅本地私有留存。

## 当前冻结源码完整验证

源码926前后tracked CLEAN，`npm run verify` **exit0**，日志`.tmp/task-remaining-20261018/full-verify-source-92643d67.log`：

| 检查 | 结果 |
| --- | --- |
| lint/typecheck、version、governance/features、Markdown/index/snapshot/commands、UI/format/build | PASS；151任务/37功能，零违规 |
| Node | 1956 total，1942 PASS、14既有SKIP、0FAIL |
| Agent | 206 total，204 PASS、2既有SKIP、0FAIL |
| 产品Edge preview | 826首试PASS，0fail/retry/flaky/skip |
| Design | 41单元+8浏览器PASS |
| Development plugins | 发现四插件、编辑渲染、禁用重载恢复、拦截危险remote四步PASS |
| Rust | cargo fmt check PASS；cargo test no-default-features 226PASS/1既有hardware ignore +41 integration PASS |

Rust绑定25ffcf1e的Native输入；926仅改证据测试一文件，Rust输入未变。25ff首轮完整verify也exit0，但ENV-001独审阻断后已在926重新完整验证，不能引用旧PASS绕过。

产品浏览器报告：`test-results/browser/a67d7f7f-a344-4949-ad28-b5e8c35d48e0/browser-results.json`，SHA **b6ac9a9649e41ba47f8f6cc63e69e280ca1ac486259ccf28b9cfb8c59d766287**。开发态run `e1e60121-099a-42bc-b90b-5ba084481a2c`。

既有code-health/Windows-footgun advisory未禁用或美化；version warning为旧迁移fixture的2.1.36历史版本常量、CHANGELOG最近正式release2.1.0与候选版本漂移，本轮记入Unreleased而未伪造正式release。Native构建保留6个既有unused告警及大chunk提示。

## 官方Native与真实默认库

只在物理owned依赖/构建输出上运行当前官方`client:build -- --config src-tauri/tauri.agent.conf.json --no-bundle`，使用现有release身份工具；无npm ci、共享junction写入或Agent目录轮换。source/packaged Agent manifest **4282文件**逐项哈希一致。

- 构建收据：工程外`native-build-f1b903b0-6915-4c02-9966-8decbc1f07b1.json`，reason=current/version2.1.38。
- EXE SHA **1be85bce71ad6afff91c418e4a673abefb74cd1579b059b89ce0380870c4b521**；input SHA **b400b48363c84b0157bde7cf80044d581317e699180f94b9d386443985c998a0**。
- Tauri release `http://tauri.localhost/`实际bundle **/assets/index-DQjSs-w5.js**，SHA **23e19332b59ca74477f383c29abd23758980597db5cdd918e6125fbd1decac2e**，与当前dist字节相同。
- `native-current-readonly.mjs`经独立静态审查后运行，私有CDP端口/实际WebView父链证明归属后才允许正常WM_CLOSE。两次正常开启/关闭，app/sidebar/main各1，无存储alert，visible textarea disabled=false/readOnly=false，0pageerror。21条消息、完整草稿/选择/canonical字段、身份、plan/complete/candidate/memory前后保持，只容许原已证明的retry审计时间戳与revision正常变化。
- 实测收据：`test-results/native-local-guards/a44f8415-aed2-4f36-9eb3-af6e40d80c5d/native-local-guards-results.json`，SHA **2d041bf10e3b3e67134c7d6311bb170960e76e4ec1fbd555b3c1a4f563782add**；含两张私有实际UI截图及最终保全断言PASS，测试结束0Native。
- 本脚本没有send/turn/写快照IPC/编辑/选择/新迁移，接管后HTTP仅允许静态资源；启动auto-connect在CDP接管前，不能据此证明全局零网络。真实新回复本轮未重试、不消耗reset/购买额度。
- 最后通过两个真实日常lnk启动并保留一正常无CDP实例，须按最终文档HEAD提交后的工程外daily收据核对，测试中0Native不是最终日常状态。

## 剩余任务与分支规则

- 当前候选账本**151=86DONE+50PARTIAL+11TODO+3BLOCKED+1IN_PROGRESS，开放65**。本地安全任务完成不关闭Gateway/Evidence/GOV/Chat等原父任务；原统一任务仍IN_PROGRESS，37功能成熟度及runtimeEvidence不提升。
- **侧栏pin/sort**当前仅useState，持久化未完成；应复用现有CreationSnapshot/CAS，补重载/Native和包往返，不另造localStorage源。
- **真实上游流**尚未完成：Ark先response.json，generation-server再单帧SSE；本地可继续做ReadableStream/首token/取消/错误/首chunk禁重试，真实Provider/DPAPI另验。
- **宽图**旧FAIL不直接代表现版：source926当前production1200×300结果，精确21%/23.333333%/25%×折叠展开6状态，端口/生成按钮elementFromPoint命中、enabled、10px间距均PASS，3/3首试；未点击生成。收据`.tmp/task-remaining-20261018/canvas-precise-result-65f7b1aa-96b3-4f67-ab6f-69752f9f1d59.json` SHA21a5a8cb27f8e62ad836846785071105aa32c81486097778f0f189a92a567a13。连线曲线/锚点与同状态Native未验，因此原TODO/FAIL改PARTIAL，历史原文保留；首轮probe server.cwd错误及826acee7报告保留，不算产品FAIL。
- **工作树**7登记tree/13本地分支，approved root计5/4；四组真实CLI：现有branch REUSE/exit0、新任务 ACTIVE_WORKTREE_BUDGET_EXCEEDED/exit1、显式越界exit1、非Git容器查询exit1。收据`.tmp/task-remaining-20261018/policy-actual-7acc9a97-8849-436a-86aa-941761aa27f6.json` SHA6c96eaed8d64f30a51fd68f89cf8c29a8f5a77a75c62f878682b1ba400febd52。生成物该收据new-budget采样17936769601B，数字随并行构建变化。未新建树、提高预算或清理。
- **祖先事实**main/master共同祖先1f6cbd37091326a899fa600baba53bf6efd9cf16；main/origin main共同祖先d95e4c446d3b4ae5419ce0f58c68057ebabc286a。main...master56/122，main...origin/main49/2；BRANCH-POLICY原“无共同祖先”已纠正，不能据新祖先事实自动merge/rebase。完整采样`.tmp/task-remaining-20261018/branch-ancestry-7333829e-fdb4-44a7-b51c-300dfdf77aac.json` SHAe45ec893f32a95b9ec7ec2172e4fd2327f229b8ec678fdfb49889b8aac895d16。
- **5失效路由**BACKEND-IMAGE-PARAMS、BACKEND-TEXT-NODE、AI-GATEWAY、GOV-003/004的旧branch不存在，实际路径为main；旧完整验证/状态/路由移verificationHistory，当前unallocated，禁止引导AI在main续写。BACKEND-STEER无本候选ledger映射、Web树branch与其旧ledger差异及POC并行修改只读登记，不冒充全局一致或修改别树。
- **并行边界**main69dirty、Image POC35dirty、Web receipt6 untracked为盘点时采样；其他树来源/路径及两次采样见`.tmp/task-remaining-20261018/remaining-checklist-e1b05d4f-7bba-4b59-8e63-427524f5c664.json` SHA581079065d590a867545a546acc7ca44fce1e8e9b4295c47ff128c11292d4067。不同实体树共享相对路径是后续集成风险，不是同目录抢写的证据。
- **容器新coord工具**是未版本化并行资料，当前脚本硬读主仓ledger且git来源记录不复用旧claim，BOARD不能代表本候选；原件保全、未运行刷新覆盖他人claim。容器L0/RULES与候选AGENTS入口仍有来源差异，需维护者在独立版本化任务核对，不把未合入规则当远端生效。用户禁止删移优先于任何回收建议。

未执行Hosted/PR/main整合、真实Provider/DPAPI/Comfy/GPU、账号/VPS/Mobile、签名安装/发布或用户最终验收。原额度问题、12AI持久恢复/成本/记忆/垃圾箱继续按原任务开放；本轮正常可编辑不等于新回复成功。
