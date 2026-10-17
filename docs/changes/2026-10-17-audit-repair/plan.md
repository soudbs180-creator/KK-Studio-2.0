# Plan：审计修复与当前事实收敛

- Task ID：TASK-AUDIT-REPAIR-20261017；状态 COMPLETED（有界本地A–D）；2026-10-17。
- Owner / branch / worktree：root / `fix/TASK-AUDIT-REPAIR-20261017` / `D:/kk-studio/.worktrees/TASK-AUDIT-REPAIR-20261017`。
- [Intent](intent.md) / [Spec](spec.md) / [Verification](verification.md) / [Review](review.md)。
- 来源快照 `221560a322107092f66c142c7b911439087019f8`；local main `8c36a6b138205613ae1a7c27950b86792da8de1a`；origin/main `d95e4c446d3b4ae5419ce0f58c68057ebabc286a`。原主仓/index/无关任务不写入。

## 开工与状态

已读取 AGENTS、AI_RULES、docs/README、治理/任务 schema、BRANCH-POLICY、LAUNCHER、ADR-022 和审计报告。A 保全 core 通过后才建立上述隔离快照。旧 EXE/收据不匹配、日常入口失效及旧组合全量失败均是预存问题；不继承旧 PASS 为本候选结果。

| 阶段 | 当前状态 | 操作与验证 |
| --- | --- | --- |
| A 保全 | core PASS，原失败保留 | 核对 517368 版本、6 bundles、2 个 dirty 恢复与 source/index 不变；外部新增和变更单列 |
| B 安全修复 | 469完整verify与源码独审PASS | Node1832/14既有SKIP、Agent199/2既有SKIP、产品Edge823首试、DESIGN41+8、development四步；Rust213/1硬件ignored+integration41绑定不变源；旧失败与FSR01–06修复证据保留 |
| C 入口与运行 | 469官方build/隔离六检查/默认两lnk启闭PASS | d356默认资料菜单遮挡真实P2经最小层级与桌面/短手机click回归修复，新source完整verify/独审/重建/Native日常复验通过；默认9项目仍READ_ONLY，原始快照保持 |
| D 治理同步 | 本地收口 | 149任务仅新增本审计DONE（85DONE/64开放），原148对象与37功能等级/旧证据不变；现有视图/清单生成器更新，规则/链接/版本/Delivery预检，提交后精确HEAD审查与正式Delivery另绑 |

## 文件归属与串行

- 产品实现者只改分配的源码/测试；本治理实现者只写 ledger、PROJECT_STATE、AI_HANDOFF、TASK_STATUS、PROGRESS、BRANCH-POLICY、LAUNCHER、README、CHANGELOG、本包、统一接入补件和四功能卡/registry。
- root 独占版本、完整验证/Native及最终提交；本次最终D由root明确unlock授予既有task/容器文档、workspace inventory与两个生成视图lease，结果按真实C回传补记，完成即释放。生成视图仅运行现有命令，不手改。
- 安装和构建前核对物理所有权；共享 vendor 目标只读。1421/1423 与 Native 串行协调，不停其他任务进程。文档实测补记也遵守文件 lease。

## 验证与交付顺序

1. 记录来源/备份及原始失败，保存未验收 source snapshot。
2. 定向 RED/GREEN 与邻域回归；版本脚本按实际平台递增，验证版本一致性。
3. root 生成两份视图；schema、governance、features、snapshot、Markdown、索引、格式和 Delivery 逐项记录。
4. 在独占实体目录完成完整 verify、Rust/Native 与官方启动器重建；原件/身份、冷重开、实际 EXE/receipt/source 一致后才补 C 结果。
5. 冻结真实 base/head 后独立审查，新增变更需补审。Hosted/PR/合并/发布/真实 Provider/用户验收没有实际结果时保持 NOT_VERIFIED，不将技术准备冒充已交付。

## 风险与恢复

保全根是 `D:/KK-Studio-recovery-20260921/audit-repair-20261017-1f00ccc3-1207-4cd3-90e1-bd0192d64d21`，入口 `final-preservation-receipt.json`。只读检查与恢复演练不扩大删除/移动授权；54 份 runtime previous 目录不在本计划中直接删除。真实资料不作为破坏性测试输入。
