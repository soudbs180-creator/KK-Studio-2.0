# Plan：定位构建污染并接续统一发布

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；Owner：root-release；状态：IN_PROGRESS / NOT_VERIFIED。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-provenance`；base0f92/treebed0；677候选已提交；当前行尾delta新head待提交。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。

1. 封存41正式失败、raw/hash、artifact0、原strictCleanTagReady=false及三个浏览器信号边界。41tag不动；用户数据和所有cold保持原件。
2. root串行捕获npm ci、Agent打包、Tauri no-bundle、完整NSIS前后status（含untracked）和tracked name-status/stat。原0f92六阶段已全部exit0/gitclean：初始基线、npm ci、Agent打包、no-bundle、完整NSIS和fresh CARGO_TARGET_DIR下default cargo check；未复现Hosted dirty。保留全部日志、原有缓存和隔离target，不删除或恢复构建输入。
3. 677 writer已增加具体status/path错误，保留clean guard；workflow已落父目录创建和native npm fail-fast。Windows临时Git回归旧RED7/1→新GREEN8/0，保留未写artifact/未还原源码断言；不将这些改动当成41具体dirty首因已解。
4. 677 workflow已落PR候选完整NSIS/receipt门，显式PR head checkout及source/event head相等校验，候选artifact独立命名，正式tag push仍fresh重建。677候选39145549689实际FAIL/artifact0，诊断已报告三条M；receipt失败即止、无artifact保留。只基于实际路径和临时Git机制证据做三path LF最小修法，不猜ignore或恢复输入。
5. root已用既有helper统一三端2.1.42，两版本检查PASS；migration2.1.36及CHANGELOG37历史告警保留。同Task账本与恢复入口已同步，本新包为current、草稿同步旧包historical；不覆盖其他任务或用户数据。
6. 6772722c/tree dbf488 的精确本地npm run verify已exit0且当时工作树clean：Node1950PASS/20SKIP、Agent204/2SKIP、Browser837/837首试且0retry/flaky、Design41+8、development四阶段PASS；receipt installer-42-6772722c-local-verification.json/log SHA9155cfe1cb010f97117c4da049e48cbbe733ba6242ddd05cfd1161ed355b6c39。独立source审查对base0f92→677的26文件有界PASS，153非本任务ledger对象保持；该审查不代替Hosted完整构建，其当时未验事项按原回执保留，不改写为通过。 当前已追加三path LF属性、候选paths及第9fixture，本地8/1→9/0、lint/typecheck exit0；新head提交后重做适用完整验证/独审/候选Hosted。旧677本地PASS不代填新head，最终正常PR/main仍待。
7. 仅在新source/版本门禁真实通过后创建一次新的不可变tag及正式Windows工件；沿现有冻结下载helper、flat4、receipt/installed verifier和日常数据保护验收，不复用或改写41失败产物。
8. 再完成单setup公开下载、实际默认资料安装/关闭重开、Agent资源与健康、工具栏几何和三端实际版本；正式Release后按既有受管流程更新Web及独立Mobile Web，保留origin资料和自有seed39，不增加运维权限。

行尾机制及当前修复边界：临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。 当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。新HEAD未知；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。新精确head完整验证/独审/Hosted尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

所有新PASS、最终source/tag/工件hash和CI URL按实际回执填入verification。rollback用正常revert/受管previous合同，禁止移动41tag、删旧失败、清配置/浏览器资料或把副本恢复到真实源。
