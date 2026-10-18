# Review：安装器来源与插件恢复显示的精确提交审查

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；状态：NOT_VERIFIED。
- base0f92/treebed0；677/e7 source有界审查已有独立receipt；新增PLUGREG-READY-01/P2阻断开放，插件修复新head/reviewer结论：TODO。本包为当前进行中交付，不是新head或merge/release批准。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。

## 当前正式独立阻断

当前已审候选e7cdf151b5ca8a3e31744a23e7d4788a049449d4/tree098f72f43a4a3201ad494908b9371b562ee1d5c5：本地完整verify及有界source独审PASS，Windows candidate39147266232 SUCCESS/rawclean、4284文件receipt验证通过；这些仅适用于e7候选，不是最终新head或正式tag产物。e7 Hosted PR保留1flaky、push保留2flaky，原strict clean=false，不能以job绿或本机重复通过抹去。PLUGREG-READY-01/P2已有受控旧RED→本地GREEN，但精确新head审查/门禁仍待，继续阻止merge/release；最终main/tree未定。版本维持2.1.42，42尚未tag；41tag、原失败和全部cold保持。

独立finding PLUGREG-READY-01/P2为merge/release blocker。e7 PR原失败现场有四fallback，原failure trace缺网络终局，当次完整因果UNKNOWN；只读源码及independent-plugin-activation-notification-e7.json确定registry Map注册/卸载无通知、PluginNode/AddNodeMenu未订阅，迟到activation后已有node/menu不自动重绘的可达缺陷。该纯内存次序证据不复现历史浏览器/网络。e7原spec1920 repeat20/retries0/trace on本机20/20 PASS（plugin-recovery-e7cdf151-repeat20-run.log）保留，但不抵销Hosted首试失败、不称已修复。

最终受控旧e7 RED已发生：plugin-registry-render-settled-red.log。第二轮activation script gate在discovery完成后阻塞；确认4fallback、已打开菜单、项目已保存，并过2rAF稳定前提后release。真实模块wrapper保留原Content/setup-cleanup，仅加4个activation marker；无postrelease点击UI，原helper在iframe的5s断言失败，browser adb5246e-90c0-4934-9b57-dfc6145aae6e的trace/context保留。前两版old PASS仅因稳定前提不足，均未作为RED，原日志保留。

最小3处产品改动已落：共享registry subscribe+revision，register/unregister实际变化才notify，PluginNode/AddNodeMenu用useSyncExternalStore订阅并保留pluginStore.enabled筛选；未改storage/schema/CSS，不用setError(null)假通知。plugin-registry-render-green.log exit0、1PASS；相同iframe/content断言和原durable equal成立。API+loader/startup关联单测29/29及typecheck PASS，仅为当前本地差异证据；精确新head独审/完整verify/Hosted仍待，PLUGREG-READY-01尚未据此批准merge/release。

伴随夹具仅复用provider-scheduling的activeJobs=0完成边界及为两个ui-feature-parity pending旧变体加脱敏网络诊断，原断言/连接逻辑和try/finally清理保持。5场景×5repeat，共25次，2workers/retries0/trace on已终局exit0、25/25首试PASS、0retry/flaky（release-recovery-three-signals-repeat5.log）；仅未提交差异预检，不代填新精确head；原CI flush时序及初连Failedfetch根因仍UNKNOWN。PR77已转draft，42未tag、版本维持42。

## 已有独立诊断（安装器阶段历史）

`independent-windows-41-receipt-failure-review.md`及receipt对41失败给出release-blocking结论：首个dirty guard失败已证、具体dirty路径UNKNOWN；父目录缺失为Hosted未到达的条件缺陷（WINREL41-PARENT-01/P1），本机原writer后已实复现mkdir ENOENT；native npm失败后继续依赖步骤的级联已证（WINREL41-EXIT-01/P2）。该独审针对原失败，不构成当前未提交修复精确head批准。

677已提交实现已有writer具体status且保留拒绝、parent-only mkdir/npm fail-fast、显式PRhead/source-event一致的完整候选NSIS/receipt和candidate命名，tag push仍fresh重建。真实Win临时Git回归旧7/1→新8/0、三端42两版本检查PASS；六阶段本地clean及旧缺parent复现保留。677候选已真实FAIL/artifact0并报3M，41实际dirty仍UNKNOWN；不能把677行尾机制证据倒填41。677本地fullverify已PASS，该行尾delta随后冻结e7；当前插件修复验证待验。

## 已审677与e7安装器阶段边界

6772722c/tree dbf488 的精确本地npm run verify已exit0且当时工作树clean：Node1950PASS/20SKIP、Agent204/2SKIP、Browser837/837首试且0retry/flaky、Design41+8、development四阶段PASS；receipt installer-42-6772722c-local-verification.json/log SHA9155cfe1cb010f97117c4da049e48cbbe733ba6242ddd05cfd1161ed355b6c39。独立source审查对base0f92→677的26文件有界PASS，153非本任务ledger对象保持；该审查不代替Hosted完整构建，其当时未验事项按原回执保留，不改写为通过。

PR77候选677的Windows run39145549689已真实FAIL/artifact0：npm ci后clean，完整NSIS成功，build后和receipt拒绝均报三条M：src-tauri/Cargo.toml、src-tauri/gen/schemas/desktop-schema.json、src-tauri/gen/schemas/windows-schema.json。git diff --stat无条目，仅LF→CRLF警告；raw SHA9423eb50651cda83f852b5e5027626f1a5799fe21c89a8af29a0d9a5d8de4a12。此为677候选实际现场，不是模拟；e7后续Hosted终局按本文件当前段记录，不改写677历史。

临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。

当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。该行尾delta随后冻结为e7（当前插件阻断见上）；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。e7实际门禁结果见上，质量首试失败保留；插件修复新精确head门禁尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

## 当前新head待审范围

| 门禁                                               | 当前结果                                                       | 审查要求                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| PLUGREG-READY-01/P2                                | OPEN，merge/release blocker                                    | 受控旧RED→本地GREEN，原durable/真实Content保持；29单测/typecheck PASS；新head独审/全量/Hosted未验 |
| dirty原因与诊断                                    | 41首因UNKNOWN；677实际3M/临时Git机制保留；e7候选PASS           | 真实临时Git modified/untracked错误有路径，未写artifact/未还原源码；新精确head及云端路径待验       |
| parent创建与exclusive child                        | NOT_VERIFIED                                                   | 只建必要父目录；已有最终child失败，不覆盖旧receipt；干净checkout回归                              |
| native失败立即停止                                 | NOT_VERIFIED                                                   | npm非零退出后不执行verify/hash/upload；首因与级联分列                                             |
| PR候选真实完整安装器门                             | NOT_VERIFIED                                                   | 677 receipt dirty拒绝/artifact0；e7完整候选PASS；插件修复新head按适用门禁复验                     |
| lint/typecheck/相关回归/fullverify/Hosted/Delivery | e7本地fullverify/source有界PASS；Hosted首试非clean，新head待验 | 未提交差异回归不代填精确head/全量/Hosted门禁                                                      |
| 正常PR/main/新统一版本与不可变tag                  | NOT_VERIFIED                                                   | 统一42已确定；最终source和发布待验，41tag不移动、失败和cold不删除                                 |
| 实际安装、资料/配置及生产验收                      | NOT_VERIFIED                                                   | 原完整任务AC保持，不能仅构建通过即DONE                                                            |

新源码/测试/workflow/head或base变更后复核相应范围。最终审查以当前PR实际HEAD及外部独立回执为准，不要求文档反复提交回填自身未来SHA。用户已有发布和资料保留授权，当前准备不扩大为删除数据、修改凭据或部署权限。

结论：677/e7原有有界审查和本地PASS保留；e7 Windows候选PASS不代替质量首试或最终新head。PLUGREG-READY-01/P2为当前merge/release blocker，确定性旧RED→本地GREEN已成立，修复新head独审/全量/Hosted仍待验；整体NOT_VERIFIED，41具体dirty UNKNOWN，42未tag不再bump。
