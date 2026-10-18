# Review：安装器来源修复的精确提交审查

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；状态：NOT_VERIFIED。
- base0f92/treebed0；修复head/reviewer/独立上下文：TODO。本包为当前进行中交付，不是新head批准。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。

## 已有独立诊断

`independent-windows-41-receipt-failure-review.md`及receipt对41失败给出release-blocking结论：首个dirty guard失败已证、具体dirty路径UNKNOWN；父目录缺失为Hosted未到达的条件缺陷（WINREL41-PARENT-01/P1），本机原writer后已实复现mkdir ENOENT；native npm失败后继续依赖步骤的级联已证（WINREL41-EXIT-01/P2）。该独审针对原失败，不构成当前未提交修复精确head批准。

当前实现已有writer具体status且保留拒绝、parent-only mkdir/npm fail-fast、显式PRhead/source-event一致的完整候选NSIS/receipt和candidate命名，tag push仍fresh重建。真实Win临时Git回归旧7/1→新8/0、三端42两版本检查PASS；六阶段本地clean及旧缺parent复现保留。Hosted候选和41实际dirty仍未闭环，不声称云端dirty已修。lint/typecheck当前运行中、结果PENDING。

## 精确head待审范围

| 门禁                                               | 当前结果                                  | 审查要求                                                                                    |
| -------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| dirty原因与诊断                                    | 云端首因UNKNOWN；本地回归8/0              | 真实临时Git modified/untracked错误有路径，未写artifact/未还原源码；新精确head及云端路径待验 |
| parent创建与exclusive child                        | NOT_VERIFIED                              | 只建必要父目录；已有最终child失败，不覆盖旧receipt；干净checkout回归                        |
| native失败立即停止                                 | NOT_VERIFIED                              | npm非零退出后不执行verify/hash/upload；首因与级联分列                                       |
| PR候选真实完整安装器门                             | NOT_VERIFIED                              | 实际checkout/tree及PR logical head分列，完整NSIS+receipt，不把候选当正式Release             |
| lint/typecheck/相关回归/fullverify/Hosted/Delivery | 定向8/0；lint/typecheck PENDING；其余待验 | 未提交差异回归不代填精确head/全量/Hosted门禁                                                |
| 正常PR/main/新统一版本与不可变tag                  | NOT_VERIFIED                              | 统一42已确定；最终source和发布待验，41tag不移动、失败和cold不删除                           |
| 实际安装、资料/配置及生产验收                      | NOT_VERIFIED                              | 原完整任务AC保持，不能仅构建通过即DONE                                                      |

新源码/测试/workflow/head或base变更后复核相应范围。最终审查以当前PR实际HEAD及外部独立回执为准，不要求文档反复提交回填自身未来SHA。用户已有发布和资料保留授权，当前准备不扩大为删除数据、修改凭据或部署权限。

结论：实现已落工作差异、定向8/0及版本检查通过；新精确head独审/完整验证/Hosted仍待验，整体NOT_VERIFIED，不称云端dirty已解释或已修复。
