# Verification：安装器干净构建、插件恢复与统一发布

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19，Asia/Shanghai。
- 状态：IN_PROGRESS / 整体NOT_VERIFIED；本包已落库为current，尚未代表修复精确head通过。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-provenance`；base0f92/treebed0；当前已提交候选c3410fe6/tree0557a629；cleanup新head、最终main/tree/tag：TODO。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。

## 当前c341与Hosted清理失败

当前已提交c3410fe68f057054a510cd1b506ead80bb5db629/tree0557a6295f0cb5ec05e5018691fd6af9d3187919（parent e7/base0f92）：精确本机fullverify exit0，Node1972=1952PASS/20SKIP、Agent204/2、Browser838首试0retry/flaky、Design41+8/development4；Delivery34/0及有界source独审PASS，PLUGREG-READY-01仅源码阻断已关闭，不等于整轮发布PASS。Hosted PR39151700611在Node阶段1FAIL：自有invalid-help/node.exe清理unlink EBUSY，锁持有者UNKNOWN，失败链未运行后续Agent/browser/Rust，不拿本机结果代填。c341 Windows candidate39151700654已SUCCESS且raw/receipt审计PASS（4284文件），仅候选并非formal，不能解除PR Node失败；push自然终局由唯一watcher补证。42未tag，最终main/tag/正式包/installed/production未完成；旧e7三flakes/strictfalse、41tag及正式失败和所有cold保留。

本次最小测试delta仅tests/unit/agentPackage.test.ts末尾自有sandbox的fs.rm增加maxRetries:5/retryDelay:100及中性Windows executable locks注释（7行），生产packager及全部guard/业务断言不变。独审串行await未发现漏wait证据。受控本机映像锁实测为EPERM，非原CI EBUSY同一持有者证明：默认清理失败、释放后有界重试成功、持锁耗尽仍拒绝；先前预期EBUSY的自检失败日志保留。agentPackage11/11、全Node1972=1952PASS/20SKIP/0FAIL、局部Prettier/ESLint均PASS，仅dirty delta预检；新head/完整门禁仍待。

| 检查                                             | 实际结果                                   | 证据与边界                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| e7精确本地完整verify及source审查                 | PASS，仅e7范围                             | installer-42-e7cdf151-local-verification.json、independent-source-e7cdf151-review.md/receipt；不代填Hosted或后续新head      |
| e7 Windows candidate39147266232                  | SUCCESS/rawclean，4284文件receipt验证通过  | hosted-e7cdf151-windows-audit.json及independent-e7cdf151-candidate-gate-addendum；非正式tag产物                             |
| e7 Hosted PR/push首试                            | PR1flaky、push2flaky；原strict clean=false | hosted-e7cdf151-final-receipt.json及PR/push raw/audit；job成功不等于首试全过                                                |
| PLUGREG-READY-01/P2                              | CLOSED_SOURCE_AT_C341（仅源码）            | c341独审已关闭源码；原CI网络终局/初连因果仍UNKNOWN，整轮NOT_VERIFIED                                                        |
| e7本机原spec1920重复                             | repeat20/retries0/trace on，20/20 PASS     | plugin-recovery-e7cdf151-repeat20-run.log；仅本机观察，不抵销CI或称修复                                                     |
| delayed bundled import因果回归、共享通知修复     | 旧RED失败→GREEN exit0/1PASS，仅本地差异    | plugin-registry-render-settled-red.log / plugin-registry-render-green.log；前两版old PASS不算RED，原content/durable断言保持 |
| 新head及42正式main/tag/工件/installed/production | TODO / NOT_VERIFIED                        | 保持42未tag，e7候选及旧41资料不得代填                                                                                       |

历史独立finding PLUGREG-READY-01/P2曾阻断merge/release，现已由c341有界source独审关闭源码范围；整轮发布仍未通过。e7 PR原失败现场有四fallback，原failure trace缺网络终局，当次完整因果UNKNOWN；只读源码及independent-plugin-activation-notification-e7.json确定registry Map注册/卸载无通知、PluginNode/AddNodeMenu未订阅，迟到activation后已有node/menu不自动重绘的可达缺陷。该纯内存次序证据不复现历史浏览器/网络。e7原spec1920 repeat20/retries0/trace on本机20/20 PASS（plugin-recovery-e7cdf151-repeat20-run.log）保留，但不抵销Hosted首试失败、不称已修复。

最终受控旧e7 RED已发生：plugin-registry-render-settled-red.log。第二轮activation script gate在discovery完成后阻塞；确认4fallback、已打开菜单、项目已保存，并过2rAF稳定前提后release。真实模块wrapper保留原Content/setup-cleanup，仅加4个activation marker；无postrelease点击UI，原helper在iframe的5s断言失败，browser adb5246e-90c0-4934-9b57-dfc6145aae6e的trace/context保留。前两版old PASS仅因稳定前提不足，均未作为RED，原日志保留。

最小3处产品改动已落：共享registry subscribe+revision，register/unregister实际变化才notify，PluginNode/AddNodeMenu用useSyncExternalStore订阅并保留pluginStore.enabled筛选；未改storage/schema/CSS，不用setError(null)假通知。plugin-registry-render-green.log exit0、1PASS；相同iframe/content断言和原durable equal成立。API+loader/startup关联单测29/29及typecheck PASS，属当时未提交预检；后续c341精确fullverify/source独审结果以上方为准，不能代填本次cleanup新head或正式release。

伴随夹具仅复用provider-scheduling的activeJobs=0完成边界及为两个ui-feature-parity pending旧变体加脱敏网络诊断，原断言/连接逻辑和try/finally清理保持。5场景×5repeat，共25次，2workers/retries0/trace on已终局exit0、25/25首试PASS、0retry/flaky（release-recovery-three-signals-repeat5.log）；仅未提交差异预检，不代填新精确head；原CI flush时序及初连Failedfetch根因仍UNKNOWN。PR77已转draft，42未tag、版本维持42。

## 本地夹具边界与尚未完成验证

- API+loader/startup关联单测29/29、typecheck PASS；不代替新精确head完整验证。
- provider-scheduling的429和5xx两个case在failed可见后先等原activeJobs=0完成边界，再保留cooldown/deadline/degraded/403/requests全部原断言，不加sleep/timeouts。源码链failed publish→await flush→health mark→finally release支持这一完成边界；未完整观测原CI flush时序，不称已证云端根因。
- ui-feature-parity两个pending旧变体仅附自身origin/method/path/status/requestfailed及server.requests，不采token/query/body；原断言、连接逻辑与try/finally清理保持。原初连Failedfetch rootCauseUNKNOWN，诊断不是修复。
- 5场景×5repeat，共25次，2workers/retries0/trace on已终局exit0、25/25首试PASS、0retry/flaky（release-recovery-three-signals-repeat5.log）；仅未提交差异预检，不代填新精确head。受控迟到恢复、429 deadline/403、5xx degraded重试、oldinterrupt、oldturn五场景全部通过。随后完整verify、新head独审/Hosted重做；PR77 draft，正式main/tag/工件/installed/production42仍未验。

## c341清理失败的证据边界

- 精确本机回执installer-42-c3410fe6-local-verification.json：raw SHA66f4686abe224b659282f818d4870fc6eef4b879286ee0266b0031f027282657；source独审independent-source-c3410fe6-review-receipt.json SHA1eeaa5471fc603ed41b1c419b091c9120fd161098eb2efa96345f3df0ad33eb7，仅关闭PLUGREG源码范围。
- Hosted PR Node1972为1952PASS/1FAIL/19SKIP，失败在agentPackage.test.ts:411案例末尾自有invalid-help/node.exe的unlink EBUSY；hosted-c3410fe6-pr-node-failure-excerpt.txt保留。具体锁持有者UNKNOWN，不归因为漏await、AV或CI环境。后续Agent/browser/Rust未运行，不借本机PASS代填。
- agent-package-cleanup-lock-check-final.log实测EPERM，证明本机受控映像锁下默认失败、释放后bounded成功和持锁耗尽仍拒绝；不证明原CI EBUSY同一持有者。先前自检错误预期EBUSY的FAIL原件保留。
- agent-package-cleanup-final.log为11/11；agent-package-cleanup-all-unit.log为Node1972/1952PASS/20SKIP/0FAIL；局部Prettier/ESLint PASS。仅未提交cleanup delta预检；新head、全lint/typecheck、独审、Hosted仍待。Windows candidate39151700654的raw/receipt审计已由watcher封存PASS（4284文件），候选不是formal；push终局仍由watcher后补。

## 安装器阶段历史与已确认事实

| 检查                                                  | 实际结果                                             | 证据与范围                                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 正式41 Windows run39142083878                         | FAIL / release-blocking；artifact0                   | `hosted-windows-39142083878-audit.json`、`-artifacts.json`、`-failure-excerpt.txt`；source0f92/treebed0/tagv2.1.41                               |
| Agent/非可选Codex guard、NSIS bundle                  | Agent4282文件及guard成功、NSIS完成                   | Hosted raw；不代表有效receipt、可下载包、实际installed或真实Codex连接/turn通过                                                                   |
| 41第一个receipt失败                                   | line196 clean-source guard发现git status非空         | 包含tracked和非忽略untracked；具体路径/根因UNKNOWN，原日志未输出status                                                                           |
| 缺releases父目录                                      | Hosted尚未到达；本机原writer已复现mkdir ENOENT       | 干净Git tree无父目录，workflow未创建，writer child mkdir recursive:false；installer-missing-parent-local-0f92.log；独审WINREL41-PARENT-01/P1     |
| native npm fail-fast                                  | 原workflow继续后续验证/hash，发生级联ENOENT          | 独审WINREL41-EXIT-01/P2；这些ENOENT不是第一个dirty错误                                                                                           |
| 本地before/npm ci/Agent/no-bundle/fullNSIS/freshCargo | 六阶段exit0/gitclean                                 | `installer-dirty-before-0f92.txt`、`-after-npm-ci-0f92.txt`、`-after-agent-0f92.txt`、`-after-client-0f92.txt`及stat；未复现dirty                |
| 本地完整NSIS / fresh Cargo隔离                        | 两阶段exit0/gitclean；Hosted dirty仍未复现           | installer-dirty-after-nsis-0f92.txt及stat、installer-dirty-after-fresh-cargo-0f92.txt及diff均0字节；fresh default cargo check日志保留            |
| 677候选实现                                           | 已提交677；source有界审查PASS，Windows候选FAIL       | writer保留dirty拒绝并报具体status；workflow父目录创建/native npm fail-fast，显式PRhead/source-event一致及candidate命名，tag push仍fresh重建      |
| Windows临时Git dirty路径回归                          | 旧RED7PASS/1FAIL→新GREEN8PASS/0FAIL                  | installer-dirty-path-red.log / installer-dirty-path-green.log；modified+untracked具体路径、未写artifact、未还原源码均断言；不证明41云端dirty根因 |
| 三端42及版本检查                                      | Desktop/Web/Mobile2.1.42；两check PASS               | root既有helper已生成；version:check/version:consistency通过；历史migration2.1.36及CHANGELOG37落后42告警保留                                      |
| lint/typecheck                                        | 两项exit0 / PASS                                     | installer-42-precommit-lint.log / installer-42-precommit-typecheck.log；未提交差异预检，非精确head门禁                                           |
| Node完整单测与格式                                    | 1950PASS/20SKIP/0FAIL；format PASS                   | installer-42-precommit-unit.log / installer-42-precommit-format.log；Node1970 tests、2 suites；未提交差异预检                                    |
| 677精确本地fullverify                                 | exit0 / PASS；当时工作树clean                        | Node1950/20、Agent204/2、Browser837首试0flaky、Design41+8、development4；installer-42-6772722c-local-verification.json；非Hosted成功             |
| 677独立source审查                                     | 有界PASS，26文件、153其它ledger对象保持              | independent-source-6772722c-review.md / receipt；先于完整构建结果，不批准当前新行尾delta                                                         |
| 677 Windows candidate39145549689                      | FAIL/artifact0；NSIS成功但receipt拒绝3M              | 三实际路径及raw SHA见下；npm ci clean，build后变脏，diffstat空/LF→CRLF警告                                                                       |
| 三blob临时Git行尾复现                                 | RED：相同blob LF重写仍3M；GREEN：三path显式LF后clean | tauri-eol-repro-1792342259509/receipt.json；确定性机制，不是Hosted实际内容diff                                                                   |
| e7行尾修复/第9测试/Windows候选                        | 本地9/0及Windows候选PASS；质量首试非clean            | 当前e7实际终局见上；插件修复新head与正式交付待验                                                                                                 |
| 正常PR/main/42新tag/正式包                            | NOT_RUN / NOT_VERIFIED                               | 版本已统一42，但实际新source/tag/发布待验，41tag不可移动                                                                                         |
| installed/原资料与配置保护/生产Web-Mobile             | NOT_VERIFIED；无正式Release/installed/prod41         | 所有cold保留，不拿副本或候选bundle代替日常升级                                                                                                   |

Hosted完整raw SHA256：`9ae0f791b31f3c927f61556640ef39a039f6728aae2ffb20460571702c96c7f8`。独立只读诊断为 `independent-windows-41-receipt-failure-review.md` / `-receipt.json`；其报告hash `1d3f39ca9edd5a457c994361e0d39a4f30c8dd713ca5d81be8f1b6092e107f17`。这不是新修复精确head审查。

main0f92之前五quality job+guards全绿，但浏览器836首试PASS+1FLAKY/838attempts；CodeBuddy信号独立结论NON_BLOCKING_DIAGNOSTIC_LIMITATION、rootCauseUNKNOWN、未修复/未因果解释，原strictCleanTagReady=false收据保持。它与本次正式安装器release-blocking失败分列，不相互抵销。

## 677实际候选失败与确定性行尾机制

PR77候选677的Windows run39145549689已真实FAIL/artifact0：npm ci后clean，完整NSIS成功，build后和receipt拒绝均报三条M：src-tauri/Cargo.toml、src-tauri/gen/schemas/desktop-schema.json、src-tauri/gen/schemas/windows-schema.json。git diff --stat无条目，仅LF→CRLF警告；raw SHA9423eb50651cda83f852b5e5027626f1a5799fe21c89a8af29a0d9a5d8de4a12。此为677候选实际现场，不是模拟；e7后续Hosted终局按本文件当前段记录，不改写677历史。

临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。

6772722c/tree dbf488 的精确本地npm run verify已exit0且当时工作树clean：Node1950PASS/20SKIP、Agent204/2SKIP、Browser837/837首试且0retry/flaky、Design41+8、development四阶段PASS；receipt installer-42-6772722c-local-verification.json/log SHA9155cfe1cb010f97117c4da049e48cbbe733ba6242ddd05cfd1161ed355b6c39。独立source审查对base0f92→677的26文件有界PASS，153非本任务ledger对象保持；该审查不代替Hosted完整构建，其当时未验事项按原回执保留，不改写为通过。

当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。该行尾delta随后冻结为e7（当前插件阻断见上）；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。e7实际门禁结果见上，质量首试失败保留；插件修复新精确head门禁尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

## 后续实值占位

本包初落库文档阶段曾执行（历史时点）：governance:write/check为154条任务、0违规；新五件包Prettier check exit0，账本沿用原排版而不重排其他对象；markdown:check为129个active文件、0链接违规；所辖文档git diff --check exit0。账本除本Task外153条完整JSON对象与改前基线deepEqual，原文本亦保留。以上仅证明当时文档差异和派生一致，不代替当前修复精确head独审、产品测试或Hosted/Delivery正式门禁。

插件修复最终head/base/tree、完整verify计数、适用Windows候选、Hosted URLs、独立review、正常merge/main、新tag/工件hash仍TODO。677/e7各自精确本地与审查收据按其范围有效；677 Windows失败、e7 Windows候选PASS及e7质量首试flaky分列，首次失败原件不改写。

当前cold仍以已封存1792332721753/b54d adapter为最近已核对入口，3952文件、9项目/11聊天/22消息/2归档记录/7资产；执行真实安装前按现有严格precheck重新确认源未变。若源又变，先诊断并封存新cold，不覆盖旧备份或忽略漂移。此处不宣称新冷备或新installed验收发生。

结论：完整统一发布任务继续IN_PROGRESS/NOT_VERIFIED；e7 Windows候选已PASS，但PLUGREG源码范围已由c341独审关闭，但c341 Hosted Node清理失败，cleanup新head及完整门禁待验。41具体dirty仍UNKNOWN、原strict clean=false及全部失败保留，42未tag。
