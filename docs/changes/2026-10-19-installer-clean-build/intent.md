# Intent：统一发布的干净安装器与插件恢复显示修复

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19，Asia/Shanghai；Owner：root-release。
- 状态：IN_PROGRESS / 整体NOT_VERIFIED；交付包角色：current，本次同Task当前交付入口。
- branch：`fix/TASK-CANVAS-RELEASE-20261019-installer-provenance`；base：`0f92cc9ec62a446d60befead61663cf1d910a37b`；base tree：`bed0e6af7106793866f5cc85084f411f52927a4c`；当前已提交候选：c3410fe68f057054a510cd1b506ead80bb5db629/tree0557a6295f0cb5ec05e5018691fd6af9d3187919；本次cleanup新HEAD及最终main：待提交与精确门禁。
- [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。
- 延续同一账本任务；原工具栏、数据兼容与草稿同步包保留历史证据，不重写失败。

## 用户原意与完整目标

继承用户已有完整授权：修复画布内图片工具栏居中、允许被画布边界或面板遮挡且不左右滚动；正常提交并合入main；提供一个内置Windows Agent的setup，同时更新kkai.plus和独立手机网页版，端别及版本清楚，保留原项目、原件、消息、草稿、归档收据、配置和凭据引用。本包修复正式安装器构建链及发布前发现的插件恢复显示阻断，不能把整体任务缩减为“构建脚本通过”或“仅插件回归通过”。

正式41轻量tag `v2.1.41` 已固定0f92，不可移动、删除或重打。其Windows run39142083878失败、artifact为0，没有正式Release、实际installed或生产41通过。若实际修法修改source，须正常PR、精确head独审/Hosted及合入后的main门禁，再以新版本重建；本轮已确定统一顺延2.1.42，已由root调用既有版本helper生成，两版本检查PASS；最终新source/实际工件仍待冻结与门禁，不提前称已发布。

## 当前插件恢复显示阻断

当前已提交c3410fe68f057054a510cd1b506ead80bb5db629/tree0557a6295f0cb5ec05e5018691fd6af9d3187919（parent e7/base0f92）：精确本机fullverify exit0，Node1972=1952PASS/20SKIP、Agent204/2、Browser838首试0retry/flaky、Design41+8/development4；Delivery34/0及有界source独审PASS，PLUGREG-READY-01仅源码阻断已关闭，不等于整轮发布PASS。Hosted PR39151700611在Node阶段1FAIL：自有invalid-help/node.exe清理unlink EBUSY，锁持有者UNKNOWN，失败链未运行后续Agent/browser/Rust，不拿本机结果代填。c341 Windows candidate39151700654已SUCCESS且raw/receipt审计PASS（4284文件），仅候选并非formal，不能解除PR Node失败；push自然终局由唯一watcher补证。42未tag，最终main/tag/正式包/installed/production未完成；旧e7三flakes/strictfalse、41tag及正式失败和所有cold保留。

本次最小测试delta仅tests/unit/agentPackage.test.ts末尾自有sandbox的fs.rm增加maxRetries:5/retryDelay:100及中性Windows executable locks注释（7行），生产packager及全部guard/业务断言不变。独审串行await未发现漏wait证据。受控本机映像锁实测为EPERM，非原CI EBUSY同一持有者证明：默认清理失败、释放后有界重试成功、持锁耗尽仍拒绝；先前预期EBUSY的自检失败日志保留。agentPackage11/11、全Node1972=1952PASS/20SKIP/0FAIL、局部Prettier/ESLint均PASS，仅dirty delta预检；新head/完整门禁仍待。

历史独立finding PLUGREG-READY-01/P2曾阻断merge/release，现已由c341有界source独审关闭源码范围；整轮发布仍未通过。e7 PR原失败现场有四fallback，原failure trace缺网络终局，当次完整因果UNKNOWN；只读源码及independent-plugin-activation-notification-e7.json确定registry Map注册/卸载无通知、PluginNode/AddNodeMenu未订阅，迟到activation后已有node/menu不自动重绘的可达缺陷。该纯内存次序证据不复现历史浏览器/网络。e7原spec1920 repeat20/retries0/trace on本机20/20 PASS（plugin-recovery-e7cdf151-repeat20-run.log）保留，但不抵销Hosted首试失败、不称已修复。

最终受控旧e7 RED已发生：plugin-registry-render-settled-red.log。第二轮activation script gate在discovery完成后阻塞；确认4fallback、已打开菜单、项目已保存，并过2rAF稳定前提后release。真实模块wrapper保留原Content/setup-cleanup，仅加4个activation marker；无postrelease点击UI，原helper在iframe的5s断言失败，browser adb5246e-90c0-4934-9b57-dfc6145aae6e的trace/context保留。前两版old PASS仅因稳定前提不足，均未作为RED，原日志保留。

最小3处产品改动已落：共享registry subscribe+revision，register/unregister实际变化才notify，PluginNode/AddNodeMenu用useSyncExternalStore订阅并保留pluginStore.enabled筛选；未改storage/schema/CSS，不用setError(null)假通知。plugin-registry-render-green.log exit0、1PASS；相同iframe/content断言和原durable equal成立。API+loader/startup关联单测29/29及typecheck PASS，属当时未提交预检；后续c341精确fullverify/source独审结果以上方为准，不能代填本次cleanup新head或正式release。

伴随夹具仅复用provider-scheduling的activeJobs=0完成边界及为两个ui-feature-parity pending旧变体加脱敏网络诊断，原断言/连接逻辑和try/finally清理保持。5场景×5repeat，共25次，2workers/retries0/trace on已终局exit0、25/25首试PASS、0retry/flaky（release-recovery-three-signals-repeat5.log）；仅未提交差异预检，不代填新精确head；原CI flush时序及初连Failedfetch根因仍UNKNOWN。PR77已转draft，42未tag、版本维持42。

## 677候选与行尾修复历史

PR77候选677的Windows run39145549689已真实FAIL/artifact0：npm ci后clean，完整NSIS成功，build后和receipt拒绝均报三条M：src-tauri/Cargo.toml、src-tauri/gen/schemas/desktop-schema.json、src-tauri/gen/schemas/windows-schema.json。git diff --stat无条目，仅LF→CRLF警告；raw SHA9423eb50651cda83f852b5e5027626f1a5799fe21c89a8af29a0d9a5d8de4a12。此为677候选实际现场，不是模拟；e7后续Hosted终局按本文件当前段记录，不改写677历史。

临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。

当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。该行尾delta随后冻结为e7（当前插件阻断见上）；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。e7实际门禁结果见上，质量首试失败保留；插件修复新精确head门禁尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

## 事实、未知和范围

- FACT：Agent4282文件打包及非可选Codex CLI guard成功，NSIS构建完成；receipt writer在line196因git status非空先失败，后续验证/校验文件出现级联ENOENT。
- FACT：独审确认干净checkout没有`releases`父目录，而writer保留`recursive:false`的新子目录创建；这是尚未到达的后续条件缺陷，不能当作本次首因。
- UNKNOWN：41正式CI究竟哪些tracked/untracked路径变脏；未保留具体status，不能归因schemas、Cargo.lock、Agent patch或行尾。
- 原0f92本地npm ci、Agent打包、no-bundle、完整NSIS、fresh CARGO_TARGET_DIR隔离default cargo check及初始基线六阶段均exit0/gitclean；未复现Hosted dirty，41 CI具体路径仍UNKNOWN。原writer在本机缺父目录时已实际复现mkdir ENOENT，与更早的Hosted dirty guard首因分列。
- 包含范围已落工作差异：dirty具体路径诊断、父目录创建、native npm失败立即停止及PR候选完整NSIS/receipt门；显式PRhead/source-event一致与candidate命名，tag push仍fresh重建。真实Win临时Git回归旧7/1→新8/0，未写artifact/未还原源码断言保留；677本地完整verify及独立source审查已PASS，677 Windows候选FAIL保留；e7 Windows候选PASS及质量首试失败分列，插件修复新head门禁待验。
- 保持原数据身份、secret、存储schema、origin、应用identifier和所有cold备份；不安装、清理用户数据、扩大部署权限或发真实生成turn。

## 验收条件

| AC   | 可观察结果                                                                                                            | 证据                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| AC-1 | 干净checkout能完成NSIS、不可变receipt及严格四项正式工件；source/tree/文件hash一致                                     | 精确提交Windows候选构建、receipt verifier及新正式tag工件                          |
| AC-2 | 构建若使source变脏，报告具体路径/status并拒绝receipt；失败不继续后续依赖步骤                                          | dirty拒绝回归、fail-fast反例；首因UNKNOWN可保留，不靠忽略或恢复输入造clean        |
| AC-3 | PR阶段暴露安装器构建链缺陷，正式tag只绑定已审main；41保持原失败历史                                                   | PR候选完整构建门、正常merge和新版本/tag来源收据                                   |
| AC-4 | 完整用户目标仍完成：插件迟到激活自动恢复显示、居中/遮挡/无横滚、单setup内置Agent、三端同版及明确端别、原资料/配置保留 | 确定性插件RED/GREEN、实际安装/重开、原件指纹、Native/Web/Mobile生产页面和下载回读 |

当前AC均NOT_VERIFIED。局部构建成功、候选artifact或Agent guard不代替实际用户安装、Codex连接/turn或生产发布验收。
