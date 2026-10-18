# Plan：构建来源与插件恢复显示阻断修复

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；Owner：root-release；状态：IN_PROGRESS / NOT_VERIFIED。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-provenance`；base0f92/treebed0；当前已提交候选c3410fe6/tree0557a629；cleanup新head待提交，最终main/tree待门禁。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。

## 当前执行顺序：关闭自有sandbox清理门禁

当前已提交c3410fe68f057054a510cd1b506ead80bb5db629/tree0557a6295f0cb5ec05e5018691fd6af9d3187919（parent e7/base0f92）：精确本机fullverify exit0，Node1972=1952PASS/20SKIP、Agent204/2、Browser838首试0retry/flaky、Design41+8/development4；Delivery34/0及有界source独审PASS，PLUGREG-READY-01仅源码阻断已关闭，不等于整轮发布PASS。Hosted PR39151700611在Node阶段1FAIL：自有invalid-help/node.exe清理unlink EBUSY，锁持有者UNKNOWN，失败链未运行后续Agent/browser/Rust，不拿本机结果代填。c341 Windows candidate39151700654已SUCCESS且raw/receipt审计PASS（4284文件），仅候选并非formal，不能解除PR Node失败；push自然终局由唯一watcher补证。42未tag，最终main/tag/正式包/installed/production未完成；旧e7三flakes/strictfalse、41tag及正式失败和所有cold保留。

本次最小测试delta仅tests/unit/agentPackage.test.ts末尾自有sandbox的fs.rm增加maxRetries:5/retryDelay:100及中性Windows executable locks注释（7行），生产packager及全部guard/业务断言不变。独审串行await未发现漏wait证据。受控本机映像锁实测为EPERM，非原CI EBUSY同一持有者证明：默认清理失败、释放后有界重试成功、持锁耗尽仍拒绝；先前预期EBUSY的自检失败日志保留。agentPackage11/11、全Node1972=1952PASS/20SKIP/0FAIL、局部Prettier/ESLint均PASS，仅dirty delta预检；新head/完整门禁仍待。

1. root已落最小末尾fs.rm清理重试，保留全部guard/assertions和生产packager；11/11及全Node/局部格式lint仅dirty预检。接着提交本次cleanup新head，重做精确head Delivery/独审及所需完整验证/Hosted，不能用c341结果替代。
2. 保存e7 PR四fallback、PR1flaky/push2flaky及原strict clean=false；原failure trace缺网络终局，当次完整因果保持UNKNOWN。e7本机1920 repeat20/retries0/trace on的20/20只按本机重复证据保留，不视为修复。
3. 已完成最终稳定受控旧RED：第二轮activation gate、4fallback/打开菜单/已保存/2rAF后release，保留真实Content/setup-cleanup，仅加marker4，不在release后点击UI；原iframe5s断言失败。前两版old PASS不算RED，原日志及adb5246e trace/context保留。
4. 已落最小3处产品改动：共享registry subscribe+revision，register/unregister实际变化emit；PluginNode和AddNodeMenu用useSyncExternalStore订阅，保持pluginStore.enabled过滤，不改storage/schema/CSS，不用setError(null)伪通知。相同场景GREEN exit0/1PASS、原content/durable equal保持，API+loader/startup单测29/29及typecheck PASS。
5. 完成本地GREEN后，provider-scheduling两个case只等原activeJobs=0完成边界，ui-feature-parity两个pending旧变体只加脱敏诊断，原断言/try-finally清理不变；不宣称原CI flush/初连根因已证。5场景×5repeat，共25次，2workers/retries0/trace on已终局exit0、25/25首试PASS、0retry/flaky（release-recovery-three-signals-repeat5.log）；仅未提交差异预检，不代填新精确head。随后冻结新head、完整verify、独审、Hosted/Delivery；Windows候选按适用门禁判定，e7不能代填新head。
6. PR77已转draft；仅在阻断关闭及正常PR/main门禁通过后继续下列正式tag、单setup、真实默认资料安装与三端上线；维持42，不移动41tag，不重置资料/seed。

本地RED/GREEN日志：plugin-registry-render-settled-red.log / plugin-registry-render-green.log；完整证据范围见[Verification](verification.md)。

以下构建阶段步骤及其历史结果继续保留；其中“新head待验”按其原阶段理解，当前插件修复门禁以上述顺序为准。

1. 封存41正式失败、raw/hash、artifact0、原strictCleanTagReady=false及三个浏览器信号边界。41tag不动；用户数据和所有cold保持原件。
2. root串行捕获npm ci、Agent打包、Tauri no-bundle、完整NSIS前后status（含untracked）和tracked name-status/stat。原0f92六阶段已全部exit0/gitclean：初始基线、npm ci、Agent打包、no-bundle、完整NSIS和fresh CARGO_TARGET_DIR下default cargo check；未复现Hosted dirty。保留全部日志、原有缓存和隔离target，不删除或恢复构建输入。
3. 677 writer已增加具体status/path错误，保留clean guard；workflow已落父目录创建和native npm fail-fast。Windows临时Git回归旧RED7/1→新GREEN8/0，保留未写artifact/未还原源码断言；不将这些改动当成41具体dirty首因已解。
4. 677 workflow已落PR候选完整NSIS/receipt门，显式PR head checkout及source/event head相等校验，候选artifact独立命名，正式tag push仍fresh重建。677候选39145549689实际FAIL/artifact0，诊断已报告三条M；receipt失败即止、无artifact保留。只基于实际路径和临时Git机制证据做三path LF最小修法，不猜ignore或恢复输入。
5. root已用既有helper统一三端2.1.42，两版本检查PASS；migration2.1.36及CHANGELOG37历史告警保留。同Task账本与恢复入口已同步，本新包为current、草稿同步旧包historical；不覆盖其他任务或用户数据。
6. 6772722c/tree dbf488 的精确本地npm run verify已exit0且当时工作树clean：Node1950PASS/20SKIP、Agent204/2SKIP、Browser837/837首试且0retry/flaky、Design41+8、development四阶段PASS；receipt installer-42-6772722c-local-verification.json/log SHA9155cfe1cb010f97117c4da049e48cbbe733ba6242ddd05cfd1161ed355b6c39。独立source审查对base0f92→677的26文件有界PASS，153非本任务ledger对象保持；该审查不代替Hosted完整构建，其当时未验事项按原回执保留，不改写为通过。 该阶段已追加三path LF属性、候选paths及第9fixture，本地8/1→9/0；随后冻结e7及其实际门禁结果见上。旧677/e7 PASS都不代填插件修复新head，最终正常PR/main仍待。
7. 仅在新source/版本门禁真实通过后创建一次新的不可变tag及正式Windows工件；沿现有冻结下载helper、flat4、receipt/installed verifier和日常数据保护验收，不复用或改写41失败产物。
8. 再完成单setup公开下载、实际默认资料安装/关闭重开、Agent资源与健康、工具栏几何和三端实际版本；正式Release后按既有受管流程更新Web及独立Mobile Web，保留origin资料和自有seed39，不增加运维权限。

行尾机制及当前修复边界：临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。 当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。该行尾delta随后冻结为e7；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。e7实际门禁与插件阻断见上；插件修复新精确head门禁尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

所有新PASS、最终source/tag/工件hash和CI URL按实际回执填入verification。rollback用正常revert/受管previous合同，禁止移动41tag、删旧失败、清配置/浏览器资料或把副本恢复到真实源。
