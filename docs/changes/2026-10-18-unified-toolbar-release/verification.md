# Verification：本地与正式交付分别取证

- Task ID：TASK-CANVAS-RELEASE-20261018；IN_PROGRESS / NOT_VERIFIED；[Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。
- 外部证据：D:/kk-studio/output/unified-release-20261018。
- 历史工具栏 RED：a583f0b0-df32-4c52-a5a7-eefd195ed060，中心误差 332px；修复来源候选 0c2fe49b，10 文件 SHA 清单已保留。
- 成熟迁移数据/聊天 383 PASS，Agent 204 PASS/2 SKIP，Rust 228 PASS/1既有 ignored；真实用户快照只读解码/序列化/重载，9 项目 ID、消息内容散列和归档收据保留，原件 hash 不变。均为先前候选工作树证据，恢复后需重新运行适用检查。
- 首次 verify 的 Node 1947 PASS/20 SKIP/2 FAIL；两项测试依赖固定 sleep 的假设，经 50ms 定时器合并对照旧版2 FAIL/修复2 PASS，修复单文件16 PASS。全量复验因外部删除依赖中断，不能计作通过。
- Mobile 先前 typecheck/lint/371 tests PASS；原安装器 v2.1.39 的四轮安装及3911文件零差异仅为历史依据，不代表本次2.1.41工件。
- 当前恢复树完整 verify、浏览器/Native、当前 head 独审、Hosted、PR 合并、tag 工件与生产部署：待实际结果补外部收据及 PR。未产生真实付费生成调用。

## 恢复树首次全量检查与审查修正

恢复树 lint/typecheck、Node 1949 PASS/20 SKIP、Agent 检查通过；UI 824 PASS、2 FAIL（顶栏仍期待旧“浏览器版”文案，已按用户平台区分要求改为“网页版”），另1插件恢复用例重试后通过，原失败保留。独立审查指出成熟来源携带的三处既有回归断言删除没有本任务依据，现恢复 responsive-layout / settings-navigation / taskhost-lifecycle 原始覆盖，不降低门禁；当前修正后需重跑并按新head审查。

修正后 targeted browser 29/29 PASS（workers=1、retries=0），含恢复的四个手机菜单边界/触控/hit-test用例、设置保存/关闭后操作、顶栏文案和插件恢复。Node完整1969项：1949 PASS/20 SKIP；Agent206项：204 PASS/2 SKIP。后续整条verify和正式发布结果保存在外部收据/PR，避免文档自引用循环。

## 当前源码完整本地验证与 Hosted 夹具修正

be6196ce 的完整 verify exit0：浏览器831/831（无flaky）、Design8/8、Development插件链通过，Mobile371及隔离Metro缓存重建的组合Web9/9通过。实际Tauri第四/五轮有界PASS：fresh41、4282项Agent资源散列及启停健康、9项目/11完整聊天/22消息/1归档记录与活动身份/草稿/配置、6原件Native读回均通过；工具栏中心误差0.3301 CSS px、画布clip且无横向滚动，正常关闭自有进程，原冷备不变。空隔离CODEX_HOME的真实账号连接未验，截图中的Codex app-server错误保留，不将资源健康称为账号对话全链通过。

Hosted PR39121744645 / push39121741571 的应用、Rust和release构建通过，最后Native TaskHost因seedHomeBatch的旧空库fixture仍写v2而失败；新Native正确拒绝未迁移的旧格式。只修当前writer夹具：missing时显式version3并经现有serializeCreationSnapshot写入，不改产品校验器或删除任何断言。修后真实本机client:taskhost:test 11/11 PASS，5次Native启动含崩溃/重启和凭据清理，errors为空；新提交仍须当前head独审和Hosted。原失败日志与本机收据分别保留于外部unified-release-20261018目录。

## 整合当前 main 后的验证与取消下载测试计时修正

b060ed04 正常整合主线 PR72 后，本地完整 verify exit0（浏览器837/837、Design41个Node及8个浏览器、Node1949/20既有SKIP、Agent204/2既有SKIP、Development通过），Mobile433及组合Mobile Web40/40通过。新实际Native41有界PASS，4282文件Agent资源与9项目隔离副本保留、中心误差0.3301 CSS px，TaskHost11/11通过；独立源码与Native收据审查有界PASS。后续组合Web构建改写本机dist，不拿该dist打正式桌面包。

Hosted PR39125274728完整仓库验证通过，但Rust取消下载测试在download_tests.rs:301的1秒外层deadline失败；同head push39125272020的Rust通过。该计时从transfer开始，包含文件准备、client构造、连接和server调度，取消信号直到server读到request才发出；不能据此判定取消响应超过1秒，云端具体慢阶段未有分段证据。修正仅测试：完整request握手与有界10秒fixture准备独立，收到request后发取消，仍必须1秒内返回cancelled，server保持不发响应头并正常abort清理。fixture有意延迟连接1500ms，旧测试稳定FAIL/new握手PASS；临时移除生产header取消分支时新测试仍FAIL。生产代码逐字恢复，无timeout或重试放宽。本地完整Rust269 PASS/1既有ignored、fmt和Markdown检查通过；新head独审与Hosted尚待实际收据，失败原件保留。正式合并/tag/安装包/部署尚待门禁。

## main87c 的 flaky 与可编辑草稿跨聊天帧

4968最终PR quality39127605992五job和guards成功，独立完整日志核对837浏览器首试通过/零flaky、Node1950/19SKIP、Agent204/2SKIP、Design41+8、Rust269/1ignored、Native11。PR73正常合入main87c9cfbe，tree与已审及Hosted实测合并tree一致。main quality39130558124五job成功，但浏览器实数为836 PASS+1 FLAKY；sending-chat用例首次得到Original A request与新编辑文字拼接，重试通过，不把CI绿冒充零失败。

该次拼接的完整选择区交错未直接重现；4倍CPU下20次原用例虽通过，20份逐帧记录均发现所选A可编辑框仍是B草稿或反向错配。独立复核确认ConversationPanel被动effect回填晚于绘制，属于已证P2。新增真实tab点击的逐帧归属断言，旧source两例1FAIL（A框显示B草稿两帧），layout阶段同步最小修复后两变体连续5轮10/10、workers1/retries0通过，原请求/回执/消息归属/草稿和附件持久化断言全部保留，不加A回填等待或放宽结果。新提交完整verify、精确head独审、Hosted和最终main门禁仍待实际收据；尚未创建tag、正式包或部署，没有新Provider费用。
