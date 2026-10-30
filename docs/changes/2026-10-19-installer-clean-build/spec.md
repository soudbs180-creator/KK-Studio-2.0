# Spec：干净安装器来源与插件恢复显示

- Task ID：TASK-CANVAS-RELEASE-20261018；日期：2026-10-19；状态：IN_PROGRESS / NOT_VERIFIED。
- [Intent](intent.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。
- 实现基线：source0f92/treebed0；正式失败run39142083878。本包覆盖安装器构建及插件恢复显示阻断，不替代既有工具栏、数据保护、草稿同帧和三端发布契约。

## 插件恢复显示契约与历史复现

历史独立finding **PLUGREG-READY-01/P2**已由c341有界source独审关闭源码范围；当前Hosted清理门禁仍失败。e7 PR的插件恢复失败现场有四个fallback；原failure trace缺少网络终局，不能把该次失败全部归因于某一请求或宣称是已证环境问题。只读源码及纯内存次序证据确定：registry Map注册/卸载不通知，PluginNode/AddNodeMenu未订阅registry；迟到activation后已存在node/menu可能不重绘。证据为工程外independent-plugin-activation-notification-e7.json；它不复现历史网络或浏览器因果。

1. 恢复项目先出现fallback时，随后真实随包模块activation完成，已有插件node与已打开菜单必须自动重绘，不依赖点击UI、重新打开菜单、额外编辑或延长等待。
2. 最小共享接口为registry subscribe/revision，register/unregister实际定义变化时emit；PluginNode与AddNodeMenu使用useSyncExternalStore订阅。保留pluginStore.enabled筛选、禁用规则、离线与远程代码保护。
3. 不以setError(null)或其它无关store写入作假通知，不用点击UI触发刷新，不放宽iframe/content/durable断言或等待预算。
4. 确定性回归延迟真实bundled import：先恢复项目并确认fallback，再释放模块并确认import/activation已完成，全程不点击UI；原iframe、完整内容与durable恢复断言应自动通过。最终受控旧RED与最小修复GREEN已实际成立，细节见下；前两版old PASS不算RED，新head门禁仍待。
5. 既有e7原spec在1920、repeat20/retries0/trace on的20/20 PASS仅为本机观察（plugin-recovery-e7cdf151-repeat20-run.log），不能抵销Hosted失败或称此问题已修复。

当前已提交c3410fe68f057054a510cd1b506ead80bb5db629/tree0557a6295f0cb5ec05e5018691fd6af9d3187919（parent e7/base0f92）：精确本机fullverify exit0，Node1972=1952PASS/20SKIP、Agent204/2、Browser838首试0retry/flaky、Design41+8/development4；Delivery34/0及有界source独审PASS，PLUGREG-READY-01仅源码阻断已关闭，不等于整轮发布PASS。Hosted PR39151700611在Node阶段1FAIL：自有invalid-help/node.exe清理unlink EBUSY，锁持有者UNKNOWN，失败链未运行后续Agent/browser/Rust，不拿本机结果代填。c341 Windows candidate39151700654已SUCCESS且raw/receipt审计PASS（4284文件），仅候选并非formal，不能解除PR Node失败；push自然终局由唯一watcher补证。42未tag，最终main/tag/正式包/installed/production未完成；旧e7三flakes/strictfalse、41tag及正式失败和所有cold保留。

本次最小测试delta仅tests/unit/agentPackage.test.ts末尾自有sandbox的fs.rm增加maxRetries:5/retryDelay:100及中性Windows executable locks注释（7行），生产packager及全部guard/业务断言不变。独审串行await未发现漏wait证据。受控本机映像锁实测为EPERM，非原CI EBUSY同一持有者证明：默认清理失败、释放后有界重试成功、持锁耗尽仍拒绝；先前预期EBUSY的自检失败日志保留。agentPackage11/11、全Node1972=1952PASS/20SKIP/0FAIL、局部Prettier/ESLint均PASS，仅dirty delta预检；新head/完整门禁仍待。

最终受控旧e7 RED已发生：plugin-registry-render-settled-red.log。第二轮activation script gate在discovery完成后阻塞；确认4fallback、已打开菜单、项目已保存，并过2rAF稳定前提后release。真实模块wrapper保留原Content/setup-cleanup，仅加4个activation marker；无postrelease点击UI，原helper在iframe的5s断言失败，browser adb5246e-90c0-4934-9b57-dfc6145aae6e的trace/context保留。前两版old PASS仅因稳定前提不足，均未作为RED，原日志保留。

最小3处产品改动已落：共享registry subscribe+revision，register/unregister实际变化才notify，PluginNode/AddNodeMenu用useSyncExternalStore订阅并保留pluginStore.enabled筛选；未改storage/schema/CSS，不用setError(null)假通知。plugin-registry-render-green.log exit0、1PASS；相同iframe/content断言和原durable equal成立。API+loader/startup关联单测29/29及typecheck PASS，属当时未提交预检；后续c341精确fullverify/source独审结果以上方为准，不能代填本次cleanup新head或正式release。

## 调度完成边界与失败诊断夹具

- provider-scheduling仅在429和5xx两个case的failed状态可见后，复用原activeJobs=0断言作为完成边界，再核原cooldown/deadline/degraded/403/requests断言；不加sleep、不加长timeout。App源码顺序为failed publish→await flush→health mark→finally release，支持完成边界的必要性；不据此声称原CI的flush完整时序已观测。
- ui-feature-parity两个pending旧变体只记录自身origin/method/path/status/requestfailed与server.requests，不记录token/query/body；try/finally仍清理，原断言和连接逻辑不变。原初连Failedfetch rootCause仍UNKNOWN。
- 伴随夹具仅复用provider-scheduling的activeJobs=0完成边界及为两个ui-feature-parity pending旧变体加脱敏网络诊断，原断言/连接逻辑和try/finally清理保持。5场景×5repeat，共25次，2workers/retries0/trace on已终局exit0、25/25首试PASS、0retry/flaky（release-recovery-three-signals-repeat5.log）；仅未提交差异预检，不代填新精确head；原CI flush时序及初连Failedfetch根因仍UNKNOWN。PR77已转draft，42未tag、版本维持42。

## 安装器构建与来源

复用`npm run client:installer`、`client:installer:receipt`、`client:installer:verify`及既有installed verifier。正式receipt必须绑定实际已提交source/tree、三端版本、NSIS修正后的安装EXE身份、Agent manifest和全部运行文件；候选PR构建单列logical head、实际checkout/merge SHA及完整tree，不冒充正式tag产物。

1. 保留writer的clean-source guard，包括非忽略untracked路径；失败应有具体路径/status诊断，不输出文件内容、凭据或用户数据。
2. 不恢复构建后的tracked文件、扩大ignore、屏蔽git status或放宽来源检查来制造clean。任何实际生成输入漂移先解释和修正其来源，再审查。
3. workflow显式创建`releases`父目录；最终`releases/installer-<actual commit>`仍由writer以exclusive新子目录创建，已有child必须失败，不覆盖旧receipt或产物。
4. 每个native npm调用后立即检查exit并throw；receipt失败时不得继续verify/Get-FileHash或上传。PowerShell ErrorActionPreference不能独自替代native exit检查。
5. PR候选Windows门在相关安装器/构建链变更时跑真实完整NSIS与receipt验证，复用现有命令并保存实际source/tree。677已提交workflow已落显式PR head checkout、source/event head相等核对及candidate命名；正式tag push仍fresh重建。677 Hosted候选FAIL/artifact0与实际3M路径见下；行尾修复后的e7 Windows候选已PASS，插件修复后新精确head仍须按适用门禁验证。

677实现已保留writer的dirty拒绝并在错误中输出实际status；workflow仅创建父目录并对native npm失败立即throw。真实Windows临时Git库回归在旧writer得7PASS/1FAIL（原错误不含modified/untracked路径），新writer得8PASS/0FAIL，并断言未写artifact、未还原被改源码；它证明本地诊断合同，不解释41云端究竟哪个路径变脏。

## Windows行尾契约与证据边界

PR77候选677的Windows run39145549689已真实FAIL/artifact0：npm ci后clean，完整NSIS成功，build后和receipt拒绝均报三条M：src-tauri/Cargo.toml、src-tauri/gen/schemas/desktop-schema.json、src-tauri/gen/schemas/windows-schema.json。git diff --stat无条目，仅LF→CRLF警告；raw SHA9423eb50651cda83f852b5e5027626f1a5799fe21c89a8af29a0d9a5d8de4a12。此为677候选实际现场，不是模拟；e7后续Hosted终局按上方当前段记录，不改写677历史。

临时Git确定性复现取677真实三blob，core.autocrlf=true：初始CRLF checkout clean，重写完全相同LF blob后出现相同3M，diffstat空，运行diff后仍3M；仅显式三path text eol=lf时LF checkout及同blob重写均clean。收据为工程外tauri-eol-repro-1792342259509/receipt.json。此为真实临时Git的行尾机制RED/GREEN，不是Hosted文件内容逐字节diff；Hosted实际重写字节未留，41具体dirty仍UNKNOWN，不能倒填。

当前已落三path .gitattributes text eol=lf，候选workflow paths增加.gitattributes，并补第9个Windows临时Git fixture；clean-source guard及其它完整性断言保持，不ignore或恢复构建后source。该行尾delta随后冻结为e7（当前阻断见上）；本地EOL回归旧RED8/1→新GREEN9/0（installer-eol-path-red.log / installer-eol-path-green-final.log），真实autocrlf checkout后同blob LF重写clean，另断言Cargo.toml实质修改仍拒绝/无artifact/未还原；lint/typecheck均exit0。e7本地完整验证、独审及Windows候选结果见上，质量首试失败保留；插件修复后新精确head门禁尚待；42从未tag，本轮维持2.1.42不再bump，41tag固定且所有cold和失败保留。

## 数据、版本与发布

- 不改变用户数据根、系统凭据service、存储key/schema或浏览器origin，不向备份写入、不从sandbox覆盖真实资料；所有旧cold和原失败保留。
- `v2.1.41`固定0f92，失败run不可改写为成功。三端已由root运行既有版本helper统一为2.1.42，version:check与version:consistency均PASS；最终source及发布仍待验。既有migration2.1.36和CHANGELOG37落后42警告保留，不在本包冒充新缺陷或已修正。
- 工件取得后仍须官方digest、严格flat4、可信expected source/tree和installed逐文件校验；候选工件不能改名当正式Release。
- Desktop/Web/Mobile Web三端最终显示统一实际版本与端别；手机Web独立本机资料不等于跨设备自动同步。正式Release、安装/原资料保护、线上回读各自验收。

## 验收映射

| Intent AC | 检查                                                                               | 当前状态                                                                               |
| --------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| AC-1      | 新精确head干净checkout全bundle+receipt；缺父目录、已有child与hash/source/tree反例  | 677候选FAIL保留；e7 Windows候选PASS；插件修复新head及正式工件待验                      |
| AC-2      | 构建阶段status路径证据；dirty拒绝及native失败不执行后续步骤                        | 677诊断8/0及实际3M失败保留；e7行尾9/0/Windows候选PASS；41具体dirty仍UNKNOWN            |
| AC-3      | 候选完整安装器Hosted/独审、正常PR/main及新版本来源                                 | c341 Windows候选PASS；PLUGREG源码已关闭，PR Node清理失败；正常merge/main及正式发布待验 |
| AC-4      | 插件迟到激活自动恢复、真实日常installed/Agent及原配置保留、工具栏几何、组合Web回读 | NOT_VERIFIED                                                                           |

本地clean阶段不排除Hosted独有漂移；缺父目录和级联失败是独立的已证问题，不能据它们补造dirty根因。
