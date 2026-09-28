# Plan：对比命中区子像素修复

- Task ID：TASK-COMPARE-002
- 状态：IN PROGRESS
- Owner / branch / worktree：root / `fix/TASK-COMPARE-002-touch-target` / `D:/kk-studio/.worktrees/compare-ci-fix`
- Base：`origin/main@7bc7c67`
- 原 checkout：`D:/kk-studio/KK-Studio-2.0` 含独立未提交改动，保持原样。

## 实施顺序

1. 以 Hosted 主线 run `36369533105` 的失败测试为复现证据；保留原 `>=44` 断言。
2. 只修改 `src/styles/canvas-compare.css` 的四类窄屏对比控件最小高度为 45px。
3. 运行定向浏览器、完整 `verify`、Desktop release GUI；记录生成证据与当前源码身份。
4. 更新账本、功能卡与状态入口，完成独立上下文审查、PR 检查、合并及最新主线复验。

## 风险与恢复

新增 1px 高度可能影响窄屏拥挤布局；浏览器同时检查对话框位于视口内及触摸滑块可拖动。回滚仅针对本 CSS 规则，保留 PR #21 的功能实现。没有外部数据和服务写入。
