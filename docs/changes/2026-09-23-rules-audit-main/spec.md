# Spec：规则审计主线承接

- Task ID：TASK-RULES-004
- 状态：IN PROGRESS
- 日期：2026-09-23
- 来源：[intent](intent.md)、[原任务 spec](../2026-09-23-rules-audit/spec.md)、[分支规则](../../engineering/BRANCH-POLICY.md)。
- 稳定基线：`origin/main@b45c5bc7a180c641dbcc3d127d1106f05174df12`，由 PR #9 合入 2.1.0 源码。

## 承接与信息归属

原 PR #10 的四个任务提交从最新 main 逐个 cherry-pick；原分支和原验证保持历史身份，不重写共享提交。新 PR 指向 main，并在旧 PR 中链接替代结果。验收比较新分支承接后的 tree 与原 PR #10 head tree，同时审查本次新增的远端状态文档差异。

当前任务状态以 [task-ledger.json](../../governance/task-ledger.json) 为准；生成的 TASK_LEDGER 不手改。当前仓库事实由 [PROJECT_STATE](../../governance/PROJECT_STATE.md) 记录，历史 change package 只说明当时结果。本次新增交付包保留新的 base/head、检查与 review，不把原 hosted 计费失败改成当时成功。

GitHub 托管 PR 当前 head 必须通过 `verify` 与 `delivery`；独立 AI 审查不能伪装为 GitHub 第二账号批准。远端规则集须 active 且对 main 生效。当前用户授权覆盖代码上传和技术并线；正式 tag、签名、安装包和产品发布另有验收边界。

## 风险与恢复

目标 main 若前移，重新 fetch、逐项核对新提交与冲突，并重跑受影响检查；不能强推、直接推 main 或用旧 tree 相等掩盖新改动。PR squash 后回读 merge SHA/tree，干净本地 main 只快进。旧分支删除须单独核对，不能把“只保留一个主线”解释为销毁未验收工作。
