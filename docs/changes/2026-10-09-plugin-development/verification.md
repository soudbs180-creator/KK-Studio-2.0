# Verification：开发插件修复

- Task：TASK-PLUGIN-DEV-001；准备base 1d6f640ac6f3a1e7af32c38d85596527704dc54a。
- PRE-EXISTING FAILURE：当前主线账本及Mask原始strict development证据记录public插件import失败。当前任务尚未运行新开发复现，不把历史PASS/FAIL改绑此分支。
- npm ci正在本任务独立worktree执行。源码修复、开发/生产/native回归、full verify、独立review、Hosted/merge/main尚未完成。
- 外部原始证据：D:/kk-studio/.verification/TASK-PLUGIN-DEV-001-20261009；实际来源/结果随后追加。

## 当前准备结果（未最终验收）

独立npm ci通过；12旧loader测试通过。fresh固定1421以main1d的未改loader实际复现4模块500、Vite遮罩阻挡设置，原PNG/JSON/日志保留。URL修复后4模块200、4节点已渲染，后续driver对reload默认首页的旧假设失败；按实际项目库重新打开保存项目，未放宽启停/数据断言。该次真实DOM又暴露HTML静态children key警告，错误没有过滤。SDK静态/动态校验测试先2RED/1GREEN，修复后15/15（12旧+3新）PASS；SDK类型检查和四插件重建PASS。初次SSR探针错误地期待SSR提供DOM缺key警告，原probe及失败保留，未用于产品成功结论。下一次开发尝试1421被其他进程占用，实际未开始，仍FAIL；未换端口、复用或杀其他进程。最新开发/native/full verify/独立review仍未完成。

## 2026-10-09 最新main组合的第二次真实失败

当前head 3c8b962（已合main8c，版本工作区2.1.12）实际development四插件200/可创建/零console error/无遮罩，关闭设置后按实际项目库打开唯一保存项目，HTML插件定位失败。原始receipt/PNG/日志development-green-main-8c921a5-working保持FAIL；未删除新恢复断言或把此运行改为PASS。已登记TASK-PLUGIN-RECOVERY-001 P1，源码缺字段与恢复回归随后修复。

## 2026-10-09 最小修复预验收（working tree，尚未最终提交）

- plugin-recovery-red.txt：6项新snapshot回归实际4 FAIL/2 PASS，原因分别为负载遗漏、浅层不存在以及坏payload/非JSON静默接受；保留原长内容失败日志。
- plugin-recovery-green.txt：修复现有字段clone和codec JSON schema后，新6+旧4共10/10 PASS，长内容/JSON扩展完整、非共享引用、坏字段/尺寸/非JSON及嵌套secret拒绝、原输入不变、普通旧节点兼容。
- development-recovery-working：当前3c8+working修复实际四模块200/4节点恢复/启停持久化/unsafe0/零console/无遮罩 PASS。
- development-markdown-offline-red：扩到实际4节点内容编辑并阻断esm.sh后，Markdown标题为空，net::ERR_FAILED及真实dynamic import pageerror，receipt仍FAIL；已登记新P1，未过滤错误。
- marked-version.json/marked-install.txt/plugins-offline-build.txt：实际registry14.1.4/integrity回读、workspace精确锁依赖安装、四插件重新构建 PASS。
- development-offline-content-working：再次固定1421并阻断CDN，四插件创建/编辑/正确预览、刷新恢复完整内容、启停持久化、unsafe0、4模块200、零console/遮罩实际PASS。
- 以上是已发生的局部预验收；完整verify、fresh桌面原生重启/坏数据原件保护、最新已提交SHA独立review、Hosted/普通合并/main还须继续。

## Native driver 平台语义修正

精确dc3 source审查独立复现PLUGIN-REVIEW-001：Windows/Node24 own child kill 的 exit code=null / signal=SIGTERM / signalCode=SIGTERM，原stop仅以exitCode会错判已退出。root独立owned-child-exit-probe.json同态复现；未启动真实native验收前修正等待真实exit事件并记录code/signal，以exitCode或signalCode判断退出，保留10秒有界失败。未放宽任何内容/原件/重启断言；runtime实现未变，fresh build实际从dc3来源完成。新的driver提交和实际原生验收随后记录。

## 首次真实native与关闭链路修正

836 driver实际native-recovery-83639e7 FAIL：四插件编辑/正确正文/原生保存通过、零错误；父进程SIGTERM已退出，但旧WebView CDP短暂未关闭，立即重启被正确拒绝“port occupied”。该raw/PNG/JSON保持FAIL。运行停止后9359实际自动释放，未停止其他owner。改为正常验收点击真实“关闭窗口”并等待原生exitCode0、旧CDP消失后再启动；信号退出仅用于自身失败清理，10秒有界失败不放宽。独立审查保存建议落实：变异前wx归档pristine主件/backup和corrupt输入原始字节，失败也可复核还原。产品源码与fresh EXE未变。

## 原生备份fixture生命周期修正

19fb真实native-recovery-graceful仍FAIL：四插件编辑/原生保存/真实关闭exit0/重开恢复内容已经通过且零错误；backup读取ENOENT。实际独立目录只有第一次完整保存，Rust契约首次写入没有上一版可备份；并非产品丢失backup。新增真实SVG编辑并等待耐久提交、恢复正文并等待第二次耐久提交，确保先存在实际上一版backup再进行坏数据断言，不手造成功backup。旧FAIL保持原始含义；fresh EXE/runtime不变。


## 新关闭数据丢失 RED（未关闭）

- native-recovery-request-trace @0260ece：四轮真实 exit0，但 console/requestfailed 实际 URL 为 http://ipc.localhost/write_creation_snapshot，closing=true；严格结果 FAIL，没有过滤错误。
- native-immediate-close-red @0260ece + 未提交回归探针，fresh EXE SHA256 eaa83aa100bf421503cf35d9c6ee51a871119019a67820e33624e5757d41a236：最后 SVG 编辑后立即关闭，磁盘正文缺失 `<!-- 关闭前的最后修改必须完整保存 -->`，同时 IPC connection refused，实际 FAIL。原件在工程外 TASK-PLUGIN-DEV-001-20261009/native-immediate-close-red/desktop-runtime.json；不把旧已保存关闭测试当成此路径通过。
- 登记 TASK-DESKTOP-FLUSH-001 P1 / PLUGIN-REVIEW-002 merge-blocker；最终验收仍未完成。


- 关闭守卫单元先缺实现 RED，随后 7 个关闭契约 + 6 恢复 + 3 JSX = 16/16 PASS；typecheck/lint、109任务治理零违例。当前是工作区预验收；完整verify、fresh EXE及立即关闭/真实IO失败留窗仍待新提交执行。


- verify-e3a6660.txt 实际 FAIL：原 3 个保存队列 VM 回归拒绝新增 @tauri-apps/api/core import，尚未执行原队列断言；保留原 fail，未删断言。更新 harness 显式平台边界并调用真实 nativeClose，实现不替换；原 3 + 3 新实际 hook + 7 helper 共13/13 PASS。新增覆盖最新revision/真实hookIO失败错误脱敏及重试/异步监听晚到清理。Rust fmt/test102 PASS；capabilities.json 新 allow-destroy 为真实生成变化，必须保留；desktop/windows schema 已逐字符排除换行编码确认无语义变化。完整verify随后重跑。
