# Plan：定位构建污染并接续统一发布

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；Owner：root-release；状态：IN_PROGRESS / NOT_VERIFIED。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-provenance`；base0f92/treebed0；精确修复head待提交。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。

1. 封存41正式失败、raw/hash、artifact0、原strictCleanTagReady=false及三个浏览器信号边界。41tag不动；用户数据和所有cold保持原件。
2. root串行捕获npm ci、Agent打包、Tauri no-bundle、完整NSIS前后status（含untracked）和tracked name-status/stat。六阶段已全部exit0/gitclean：初始基线、npm ci、Agent打包、no-bundle、完整NSIS和fresh CARGO_TARGET_DIR下default cargo check；未复现Hosted dirty。保留全部日志、原有缓存和隔离target，不删除或恢复构建输入。
3. 未提交writer已增加具体status/path错误，保留clean guard；workflow已落父目录创建和native npm fail-fast。Windows临时Git回归旧RED7/1→新GREEN8/0，保留未写artifact/未还原源码断言；不将这些改动当成41具体dirty首因已解。
4. 未提交workflow已落PR候选完整NSIS/receipt门，显式PR head checkout及source/event head相等校验，候选artifact独立命名，正式tag push仍fresh重建。实际候选CI、失败即止及新receipt仍待Hosted验；以其具体dirty路径证据再最小修源，不猜ignore或恢复输入。
5. root已用既有helper统一三端2.1.42，两版本检查PASS；migration2.1.36及CHANGELOG37历史告警保留。同Task账本与恢复入口已同步，本新包为current、草稿同步旧包historical；不覆盖其他任务或用户数据。
6. 实现者运行适用本地检查、精确head完整verify和Windows候选完整安装器检查；独立上下文审实际base/head/source，再经当前HEAD Hosted/Delivery与正常PR合并。合入后验证实际main，不能借41或旧4d计数代填。
7. 仅在新source/版本门禁真实通过后创建一次新的不可变tag及正式Windows工件；沿现有冻结下载helper、flat4、receipt/installed verifier和日常数据保护验收，不复用或改写41失败产物。
8. 再完成单setup公开下载、实际默认资料安装/关闭重开、Agent资源与健康、工具栏几何和三端实际版本；正式Release后按既有受管流程更新Web及独立Mobile Web，保留origin资料和自有seed39，不增加运维权限。

所有新PASS、最终source/tag/工件hash和CI URL按实际回执填入verification。rollback用正常revert/受管previous合同，禁止移动41tag、删旧失败、清配置/浏览器资料或把副本恢复到真实源。
