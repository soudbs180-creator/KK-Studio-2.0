# Plan：Codex 卡片使用连线参考图

- Task ID：TASK-CODEX-REF-20261015；日期：2026-10-15；状态：**PARTIAL（功能/live PASS）**。
- Owner：root；独立branch/worktree：`fix/TASK-CODEX-REF-20261015` / `D:/kk-studio/.worktrees/TASK-CODEX-REF-20261015`。
- Base：`cbda65e4389fc807769a8faf7654892415992589`，另承接HOME未验收64路径快照；不把快照视为已验收主线。
- root已限定整合至活动`branch-consolidation-20261011`的HOME候选，保留原作者更新、原件、存储身份、primary/index和其他实例。
- [Intent](intent.md)、[spec](spec.md)、[verification](verification.md)、[review](review.md)。

## 最小实施与证明

| 步骤            | 实际结果                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| App收集参考原件 | 复用canvasImageAttachments，Codex图片卡片不再提前拒绝；文本卡片图片引用仍明确拒绝并保留草稿                                                        |
| Agent附件与竞态 | generateFromCanvas转发附件/signal；sendMessage在真正提交前复查项目/来源图，保留source metadata与结果边，无API fallback                             |
| 回归            | 基线39、最新定向45、store新增8项RED→GREEN；fresh dirty reviewer自跑5文件50项；Agent browser13及前轮邻域39分别通过                                  |
| 实际桌面        | 产品参考原件→真实内置imagegen→PNG归档/唯一result边；重载、正常关闭后重建/重启、原桌面快捷方式重开均通过，hash不变、重启turn0                       |
| 当前产物        | Desktop/Web2.1.33、Mobile2.1.1；保留其他作者composer.css后官方重建34.96秒，最终EXE6353aba3.../inputee1e43be...，reason=current；实际bundlevihgOeA0 |
| 文档同步        | 两树仅本任务段/记录、FEAT-002 task link与生成视图；原140任务/其他36功能raw record保持，保全回执见verification                                      |

## 未闭环交付与恢复

完整Node1327PASS/14skip、Agent199PASS/2skip及适用静态检查通过；完整browser784为771PASS/13FAIL、0flaky/skip。任务前源码差分逐项重现13项同断言，确认PRE-EXISTING FAILURE，但mandatory fullverify仍FAIL、development未运行；整体交付与ledger保持PARTIAL。跟进上游失败并补最终SHA正式review/Hosted/PR；不commit/push，不宣称main集成、发布或全项目REAL。

失败日志、初始环境缺vendor dist/格式化失败与修正后结果均由verification指向原证据；不改断言或削弱门禁。图片/原件与原资料保存，现有快捷方式未重写，原root日常重开成功；自有隔离实例正常关闭，无关实例未触碰。无进一步产品/版本改动计划，若后续源码变化须按新身份复验。
