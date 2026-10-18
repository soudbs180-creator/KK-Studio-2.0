# Verification：安装器干净构建与统一发布

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19，Asia/Shanghai。
- 状态：IN_PROGRESS / 整体NOT_VERIFIED；本包已落库为current，尚未代表修复精确head通过。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-provenance`；base0f92/treebed0；修复精确head、最终main/tree/tag：TODO。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。

## 已确认与未确认

| 检查                                                  | 实际结果                                       | 证据与范围                                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 正式41 Windows run39142083878                         | FAIL / release-blocking；artifact0             | `hosted-windows-39142083878-audit.json`、`-artifacts.json`、`-failure-excerpt.txt`；source0f92/treebed0/tagv2.1.41                               |
| Agent/非可选Codex guard、NSIS bundle                  | Agent4282文件及guard成功、NSIS完成             | Hosted raw；不代表有效receipt、可下载包、实际installed或真实Codex连接/turn通过                                                                   |
| 第一个receipt失败                                     | line196 clean-source guard发现git status非空   | 包含tracked和非忽略untracked；具体路径/根因UNKNOWN，原日志未输出status                                                                           |
| 缺releases父目录                                      | Hosted尚未到达；本机原writer已复现mkdir ENOENT | 干净Git tree无父目录，workflow未创建，writer child mkdir recursive:false；installer-missing-parent-local-0f92.log；独审WINREL41-PARENT-01/P1     |
| native npm fail-fast                                  | 原workflow继续后续验证/hash，发生级联ENOENT    | 独审WINREL41-EXIT-01/P2；这些ENOENT不是第一个dirty错误                                                                                           |
| 本地before/npm ci/Agent/no-bundle/fullNSIS/freshCargo | 六阶段exit0/gitclean                           | `installer-dirty-before-0f92.txt`、`-after-npm-ci-0f92.txt`、`-after-agent-0f92.txt`、`-after-client-0f92.txt`及stat；未复现dirty                |
| 本地完整NSIS / fresh Cargo隔离                        | 两阶段exit0/gitclean；Hosted dirty仍未复现     | installer-dirty-after-nsis-0f92.txt及stat、installer-dirty-after-fresh-cargo-0f92.txt及diff均0字节；fresh default cargo check日志保留            |
| 当前未提交实现                                        | 已落工作差异；尚非精确head批准                 | writer保留dirty拒绝并报具体status；workflow父目录创建/native npm fail-fast，显式PRhead/source-event一致及candidate命名，tag push仍fresh重建      |
| Windows临时Git dirty路径回归                          | 旧RED7PASS/1FAIL→新GREEN8PASS/0FAIL            | installer-dirty-path-red.log / installer-dirty-path-green.log；modified+untracked具体路径、未写artifact、未还原源码均断言；不证明41云端dirty根因 |
| 三端42及版本检查                                      | Desktop/Web/Mobile2.1.42；两check PASS         | root既有helper已生成；version:check/version:consistency通过；历史migration2.1.36及CHANGELOG37落后42告警保留                                      |
| lint/typecheck                                        | 两项exit0 / PASS                               | installer-42-precommit-lint.log / installer-42-precommit-typecheck.log；未提交差异预检，非精确head门禁                                           |
| Node完整单测与格式                                    | 1950PASS/20SKIP/0FAIL；format PASS             | installer-42-precommit-unit.log / installer-42-precommit-format.log；Node1970 tests、2 suites；未提交差异预检                                    |
| 新精确head独审/fullverify/Hosted/Delivery             | NOT_RUN / NOT_VERIFIED                         | 尚未commit，候选完整Windows CI及实际dirty路径待验；本地8/0不代填                                                                                 |
| 正常PR/main/42新tag/正式包                            | NOT_RUN / NOT_VERIFIED                         | 版本已统一42，但实际新source/tag/发布待验，41tag不可移动                                                                                         |
| installed/原资料与配置保护/生产Web-Mobile             | NOT_VERIFIED；无正式Release/installed/prod41   | 所有cold保留，不拿副本或候选bundle代替日常升级                                                                                                   |

Hosted完整raw SHA256：`9ae0f791b31f3c927f61556640ef39a039f6728aae2ffb20460571702c96c7f8`。独立只读诊断为 `independent-windows-41-receipt-failure-review.md` / `-receipt.json`；其报告hash `1d3f39ca9edd5a457c994361e0d39a4f30c8dd713ca5d81be8f1b6092e107f17`。这不是新修复精确head审查。

main0f92之前五quality job+guards全绿，但浏览器836首试PASS+1FLAKY/838attempts；CodeBuddy信号独立结论NON_BLOCKING_DIAGNOSTIC_LIMITATION、rootCauseUNKNOWN、未修复/未因果解释，原strictCleanTagReady=false收据保持。它与本次正式安装器release-blocking失败分列，不相互抵销。

## 后续实值占位

本次未提交文档差异已执行：governance:write/check为154条任务、0违规；新五件包Prettier check exit0，账本沿用原排版而不重排其他对象；markdown:check为129个active文件、0链接违规；所辖文档git diff --check exit0。账本除本Task外153条完整JSON对象与改前基线deepEqual，原文本亦保留。以上仅证明当前文档差异和派生一致，不代替修复精确head独审、产品测试或Hosted/Delivery正式门禁。

最终修复head/base/tree、完整verify计数、Windows PR候选完整bundle/receipt、Hosted URLs、独立review、正常merge/main、新tag/工件hash仍TODO。当前定向8/0、版本42、lint/typecheck、Node1950/20及格式检查只属于未提交工作差异预检；首次失败原件不改写。

当前cold仍以已封存1792332721753/b54d adapter为最近已核对入口，3952文件、9项目/11聊天/22消息/2归档记录/7资产；执行真实安装前按现有严格precheck重新确认源未变。若源又变，先诊断并封存新cold，不覆盖旧备份或忽略漂移。此处不宣称新冷备或新installed验收发生。

结论：完整统一发布任务继续IN_PROGRESS/NOT_VERIFIED；修法精确head、dirty具体路径和42正式交付仍待实际证据。
