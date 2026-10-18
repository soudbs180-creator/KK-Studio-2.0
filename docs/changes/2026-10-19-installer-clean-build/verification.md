# Verification：安装器干净构建与统一发布

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19，Asia/Shanghai。
- 状态：IN_PROGRESS / 整体NOT_VERIFIED；本包已落库为current，尚未代表修复精确head通过。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-provenance`；base0f92/treebed0；已提交候选6772722c/tree dbf488；当前行尾delta新head、最终main/tree/tag：TODO。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。

## 已确认与未确认

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
| 当前行尾delta新head/第9测试/Hosted                    | NOT_VERIFIED                                         | 三path属性/候选paths/第9fixture已落，EOL回归8/1→9/0、lint/typecheck exit0；新head未知，Hosted quality由sole watcher观察                          |
| 正常PR/main/42新tag/正式包                            | NOT_RUN / NOT_VERIFIED                               | 版本已统一42，但实际新source/tag/发布待验，41tag不可移动                                                                                         |
| installed/原资料与配置保护/生产Web-Mobile             | NOT_VERIFIED；无正式Release/installed/prod41         | 所有cold保留，不拿副本或候选bundle代替日常升级                                                                                                   |

Hosted完整raw SHA256：`9ae0f791b31f3c927f61556640ef39a039f6728aae2ffb20460571702c96c7f8`。独立只读诊断为 `independent-windows-41-receipt-failure-review.md` / `-receipt.json`；其报告hash `1d3f39ca9edd5a457c994361e0d39a4f30c8dd713ca5d81be8f1b6092e107f17`。这不是新修复精确head审查。

main0f92之前五quality job+guards全绿，但浏览器836首试PASS+1FLAKY/838attempts；CodeBuddy信号独立结论NON_BLOCKING_DIAGNOSTIC_LIMITATION、rootCauseUNKNOWN、未修复/未因果解释，原strictCleanTagReady=false收据保持。它与本次正式安装器release-blocking失败分列，不相互抵销。

## 677实际候选失败与确定性行尾机制

PR77候选677的Windows run39145549689已真实FAIL/artifact0：npm ci后clean，完整NSIS成功，build后和receipt拒绝均报三条M：src-tauri/Cargo.toml、src-tauri/gen/schemas/desktop-schema.json、src-tauri/gen/schemas/windows-schema.json。git diff --stat无条目，仅LF→CRLF警告；raw SHA9423eb50651cda83f852b5e5027626f1a5799fe21c89a8af29a0d9a5d8de4a12。此为候选实际现场，不是模拟；Hosted quality仍由唯一watcher观察，不代填终局。

临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。

6772722c/tree dbf488 的精确本地npm run verify已exit0且当时工作树clean：Node1950PASS/20SKIP、Agent204/2SKIP、Browser837/837首试且0retry/flaky、Design41+8、development四阶段PASS；receipt installer-42-6772722c-local-verification.json/log SHA9155cfe1cb010f97117c4da049e48cbbe733ba6242ddd05cfd1161ed355b6c39。独立source审查对base0f92→677的26文件有界PASS，153非本任务ledger对象保持；该审查不代替Hosted完整构建，其当时未验事项按原回执保留，不改写为通过。

当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。新HEAD未知；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。新精确head完整验证/独审/Hosted尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

## 后续实值占位

本次未提交文档差异已执行：governance:write/check为154条任务、0违规；新五件包Prettier check exit0，账本沿用原排版而不重排其他对象；markdown:check为129个active文件、0链接违规；所辖文档git diff --check exit0。账本除本Task外153条完整JSON对象与改前基线deepEqual，原文本亦保留。以上仅证明当前文档差异和派生一致，不代替修复精确head独审、产品测试或Hosted/Delivery正式门禁。

最终修复head/base/tree、完整verify计数、Windows PR候选完整bundle/receipt、Hosted URLs、独立review、正常merge/main、新tag/工件hash仍TODO。677精确本地fullverify和source有界审查按各自收据有效；其Windows候选真实FAIL及本轮新行尾delta待验分列，首次失败原件不改写。

当前cold仍以已封存1792332721753/b54d adapter为最近已核对入口，3952文件、9项目/11聊天/22消息/2归档记录/7资产；执行真实安装前按现有严格precheck重新确认源未变。若源又变，先诊断并封存新cold，不覆盖旧备份或忽略漂移。此处不宣称新冷备或新installed验收发生。

结论：完整统一发布任务继续IN_PROGRESS/NOT_VERIFIED；677三dirty路径已在Hosted实际取得，行尾机制已在真实临时Git复现；新修法head/候选完整链和42正式交付仍待验，41具体dirty仍UNKNOWN。
