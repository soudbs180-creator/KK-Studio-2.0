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
