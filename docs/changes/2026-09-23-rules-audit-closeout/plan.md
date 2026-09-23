# Plan：规则审计并线后的状态收口

- Task ID：TASK-RULES-004
- 状态：IN PROGRESS
- 日期：2026-09-23
- Owner / branch / worktree：root / `docs/TASK-RULES-004-closeout` / `D:/kk-studio/.worktrees/TASK-RULES-004-closeout`
- Base：`origin/main@9f04bfced49224e9cd523844a8e3c995119c7955`
- 相关 PR：[源码 #9](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/9)、[原堆叠 #10](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/10)、[规则承接 #11](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/11)。

1. 回读 #11 的 merged/head/merge SHA、#10 closed/unmerged、PR 与 push 的 hosted 检查、`main` tree 和根工作树快进；确认无并行 main 前移。
2. 只修改现行 PROJECT_STATE、AI_HANDOFF、PROGRESS 与 TASK-RULES-004 账本记录，生成 TASK_LEDGER；旧交付包和产品代码保持原样。新建本后缀五文件交付包。
3. 在隔离工作树安装锁定依赖，运行治理、Markdown、完整 verify 和精确 base/head/branch 的 delivery；仅恢复测试重写的旧生成证据。
4. 对实际提交做独立 AI 复审、推送并经 PR/CI 合入 main；回读 merge SHA/tree，干净本地 main 只快进。

主线前移或出现冲突时停止旧候选合并，先核对新增提交和受影响文档。正式 tag、安装包、旧分支清理和产品发布不由这份状态收口自动执行。
