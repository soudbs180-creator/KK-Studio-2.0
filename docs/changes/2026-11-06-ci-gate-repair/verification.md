# 主线同步门禁修复验证

GitHub 运行 `42225937415` 与 `42225937453` 的失败点：

- `verify` 停在 `tests/unit/worktreeLifecycle.test.ts`。脱离分支时当前分支名为空，断言要求它非空。
- `delivery` 报告 74 项违规。两套变更包缺文档，其余新增包没有绑到审查分支的任务。
- `installer` 在写回执前发现 `vendor/canvas-agent/src/canvas/atomic-schema.ts` 被构建改写。

本地修复后的复验结果写在提交说明和后续 GitHub 检查里。本文件记录失败原因和修复范围，不把尚未重跑的远端检查写成通过。
