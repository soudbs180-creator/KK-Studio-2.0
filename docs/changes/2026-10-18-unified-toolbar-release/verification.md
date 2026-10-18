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
