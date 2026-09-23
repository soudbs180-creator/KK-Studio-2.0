# Plan：现行规则与 Markdown 一致性审计

- Task ID：TASK-RULES-004
- 状态：IMPLEMENTED，本地验证通过，待复审与 PR 收口
- 日期：2026-09-23
- Owner / branch / worktree：root / `docs/TASK-RULES-004-md-audit` / `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-RULES-004-md-audit`
- Base：2.1.0 候选 `da811283e55ce699e4c5425d92ad31ffba7513e3`；上游 [PR #9](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/9)，稳定 main `3c4d012846e53095bd4f11343a1cd2ef61aa3bbd`。

## 开工证据与隔离

先核对 Git 状态、19 个 worktree、现行 AGENTS/AI_RULES、工程与治理入口、账本、CI 配置及 Git push 策略。原候选工作树干净，另有多处并行 dirty worktree；本任务从候选精确 SHA 建隔离工作树，不修改其他目录。新工作树 `npm ci` 后，基线 lint、治理/功能门禁及相关单测通过。

## 实施顺序

1. 对照设计系统、账本和 GitHub 当前状态，修正 README、FRONTEND-SPEC、KNOWN_ISSUES、PROJECT_STATE、AI_HANDOFF、PROGRESS 等现行入口中的旧陈述；历史验证只补上下文，不改原数字和截图。
2. 在 BRANCH-POLICY 补依赖 PR 的堆叠分支规则，并说明远端删分支仍被本地钩子拒绝；修正 AGENTS 交付包五文件和 DEVELOPMENT 中遗留任务专用措辞。
3. 加入现行 Markdown 相对文件链接检查与缺失链接回归，接入 lint；记录检查不覆盖的语义和历史范围。
4. 更新账本、生成视图、完整验证、独立上下文审查，按当前基线执行 delivery check；通过后推送任务分支并创建堆叠 PR。PR #9 若以 squash 合并，按分支规则从新 main 创建承接分支并只移入本任务提交。

## 风险与恢复

不重写 `docs/archive`、旧 change package 或历史证据；不清理任何本地/远端分支。链接检查限制在现行文档，避免旧快照的丢失附件误阻断当前开发。若脚本误报，保留原链接并修正规则解析、复测。GitHub hosted 检查若因付款/spending limit 无法运行，记录为外部门禁未满足，不绕过、不开 main 直推。

## 计划变更

首轮独立复审在提交 `6d550a6` 发现平衡括号/嵌套标签的漏报误报和围栏关闭误判。先新增失败回归，再修复解析与围栏边界；原任务 AC-3 不变。修复提交后重跑适用检查、delivery 与独立补审。
