# 本次分支核对

日期：2026-09-20。依据：本次 `git fetch origin`、远端 refs、GitHub PR API 与 check-runs API 回读。范围是治理任务的整合准备；未发布产品、未删除引用、未声称所有本地候选都已验收。

| 远端分支                            | 回读 head                                | 处置                                                            |
| ----------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| main                                | 8aca3abdd6386b6d6cee7fd9836e27e5aec38eab | 新任务唯一基线；当前 verify 失败，见 run 35492697622            |
| chore/TASK-KK2-MAIN-SYNC            | 96fc440b4c0021ef37450c2acf4796dbc6c3ae45 | PR #1 已 squash 合入 a9db71b；当前 ref 等于原 PR head，保留历史 |
| chore/TASK-KK2-MAIN-CLOSE           | 08b5e53eb47b4ddfd6162862079d0e4947c3d330 | PR #2 已 squash 合入 8aca3ab；当前 ref 等于原 PR head，保留历史 |
| docs/TASK-ASTRA-001-remote-manifest | 9edb5281b5d9d8a77586136ef570973fc28c67fd | 首次同步前的历史清单；没有对应合并 PR，不自动删除/强行合入      |

旧本地 main@39f6a6e 与 origin/main 无共同祖先，根 master@609f524 保留大量并发未提交改动。本次从 origin/main 创建 `codex/TASK-GOV-002-ai-sdlc`，不合并未知候选，也不覆盖根工作区。后续产品发布仍须按账本核对本期所有任务和未合并候选，不能把本次治理 PR 当作全产品收敛完成。

本次安装的 common pre-push hook 覆盖本仓库 19 个登记 worktree；新 clone 仍必须单独安装。GitHub Actions 现有 verify check 的 app.id 回读为 15368，预备 ruleset 的 verify/delivery 检查绑定此集成，防止其他来源的同名状态被误认。私有仓库 protection/rulesets API 返回 403；配置尚未在服务器生效，详细原始结果见 `remote-audit.json`。

PR 记录：[同步 PR #1](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/1)、[审计 PR #2](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/2)。这些历史成功的 PR 不替代当前候选验证。
