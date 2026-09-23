# Plan：规则审计主线承接

- Task ID：TASK-RULES-004
- 状态：IN PROGRESS
- 日期：2026-09-23
- Owner / branch / worktree：root / `docs/TASK-RULES-004-main` / `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-RULES-004-main`
- Base：`origin/main@b45c5bc7a180c641dbcc3d127d1106f05174df12`
- 依赖：[原 PR #10](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/10) 堆叠于已合并的 [PR #9](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/9)。

## 实施

1. 从最新 main 建独立工作树，挑选原 PR #10 的四个任务提交，比较原/新 tree，检查所有并行 worktree 状态，不修改其它工作树。
2. 回读 PR #8/#9、合并后 main、Actions 和三套 ruleset；对现行文档与账本追加当前事实，保留旧计费失败和测试记录。新交付包使用明确后缀。
3. 生成账本视图，执行 Markdown、治理、delivery 与完整 verify；检查历史产物是否被测试重写并仅恢复本次生成文件。
4. 对已提交的新 base/head 进行独立上下文复审；修复阻断项后重新验证。
5. 推送新任务分支、创建指向 main 的 PR，等待当前 SHA 的 hosted `verify`/`delivery`，按实际规则合并。回读 main commit/tree，再关联关闭旧堆叠 PR #10。

## 边界

不重写原 PR #10 分支，不覆盖其它 dirty 工作树，不清理远端历史分支。产品源码和依赖版本由原 PR #9/本任务原提交界定，本次仅增补状态文档。正式发布、tag 和安装包不从 PR 合并自动推断完成。
