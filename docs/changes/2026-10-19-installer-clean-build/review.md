# Review：安装器来源修复的精确提交审查

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；状态：NOT_VERIFIED。
- base0f92/treebed0；677 source审查已有独立receipt；当前行尾delta新head/reviewer结论：TODO。本包为当前进行中交付，不是新head批准。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。

## 已有独立诊断

`independent-windows-41-receipt-failure-review.md`及receipt对41失败给出release-blocking结论：首个dirty guard失败已证、具体dirty路径UNKNOWN；父目录缺失为Hosted未到达的条件缺陷（WINREL41-PARENT-01/P1），本机原writer后已实复现mkdir ENOENT；native npm失败后继续依赖步骤的级联已证（WINREL41-EXIT-01/P2）。该独审针对原失败，不构成当前未提交修复精确head批准。

677已提交实现已有writer具体status且保留拒绝、parent-only mkdir/npm fail-fast、显式PRhead/source-event一致的完整候选NSIS/receipt和candidate命名，tag push仍fresh重建。真实Win临时Git回归旧7/1→新8/0、三端42两版本检查PASS；六阶段本地clean及旧缺parent复现保留。677候选已真实FAIL/artifact0并报3M，41实际dirty仍UNKNOWN；不能把677行尾机制证据倒填41。677本地fullverify已PASS，当前行尾delta验证待验。

## 已审677与当前行尾delta边界

6772722c/tree dbf488 的精确本地npm run verify已exit0且当时工作树clean：Node1950PASS/20SKIP、Agent204/2SKIP、Browser837/837首试且0retry/flaky、Design41+8、development四阶段PASS；receipt installer-42-6772722c-local-verification.json/log SHA9155cfe1cb010f97117c4da049e48cbbe733ba6242ddd05cfd1161ed355b6c39。独立source审查对base0f92→677的26文件有界PASS，153非本任务ledger对象保持；该审查不代替Hosted完整构建，其当时未验事项按原回执保留，不改写为通过。

PR77候选677的Windows run39145549689已真实FAIL/artifact0：npm ci后clean，完整NSIS成功，build后和receipt拒绝均报三条M：src-tauri/Cargo.toml、src-tauri/gen/schemas/desktop-schema.json、src-tauri/gen/schemas/windows-schema.json。git diff --stat无条目，仅LF→CRLF警告；raw SHA9423eb50651cda83f852b5e5027626f1a5799fe21c89a8af29a0d9a5d8de4a12。此为候选实际现场，不是模拟；Hosted quality仍由唯一watcher观察，不代填终局。

临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。

当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。新HEAD未知；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。新精确head完整验证/独审/Hosted尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

## 当前新head待审范围

| 门禁                                               | 当前结果                                              | 审查要求                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| dirty原因与诊断                                    | 41首因UNKNOWN；677实际3M及临时Git机制已取得，修复待验 | 真实临时Git modified/untracked错误有路径，未写artifact/未还原源码；新精确head及云端路径待验 |
| parent创建与exclusive child                        | NOT_VERIFIED                                          | 只建必要父目录；已有最终child失败，不覆盖旧receipt；干净checkout回归                        |
| native失败立即停止                                 | NOT_VERIFIED                                          | npm非零退出后不执行verify/hash/upload；首因与级联分列                                       |
| PR候选真实完整安装器门                             | NOT_VERIFIED                                          | 677 checkout/tree及PRhead匹配，NSIS成功但receipt dirty拒绝、artifact0；新head完整链待验     |
| lint/typecheck/相关回归/fullverify/Hosted/Delivery | 677本地fullverify PASS；当前行尾delta及Hosted未验     | 未提交差异回归不代填精确head/全量/Hosted门禁                                                |
| 正常PR/main/新统一版本与不可变tag                  | NOT_VERIFIED                                          | 统一42已确定；最终source和发布待验，41tag不移动、失败和cold不删除                           |
| 实际安装、资料/配置及生产验收                      | NOT_VERIFIED                                          | 原完整任务AC保持，不能仅构建通过即DONE                                                      |

新源码/测试/workflow/head或base变更后复核相应范围。最终审查以当前PR实际HEAD及外部独立回执为准，不要求文档反复提交回填自身未来SHA。用户已有发布和资料保留授权，当前准备不扩大为删除数据、修改凭据或部署权限。

结论：677 source审查有界PASS及本地fullverify PASS均保留；其Windows候选随后实际FAIL，新三path LF/第9fixture delta需新精确head审查与Hosted验证。整体NOT_VERIFIED，41具体dirty UNKNOWN、不回填；42未tag不再bump。
