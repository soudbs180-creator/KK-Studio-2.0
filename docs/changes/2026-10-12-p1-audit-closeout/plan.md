# 计划：P1 审计收口

### 步骤 1：冻结当前身份

- 记录 `HEAD`、`origin/main`、工作树状态和实时台账/功能计数。

### 步骤 2：修复本地门禁

- 仅格式化 `scripts/governance/branch-audit.mjs`，不改变逻辑。

### 步骤 3：回读发布与合并证据

- 只读回读 PR #53 和 `1f6cbd37` check-runs，保存 exact-SHA 证据。
- 把 delivery skipped、独立 review 缺失、原始 artifact 缺失保留为未关闭项。

### 步骤 4：更新权威记录

- 更新 `PROJECT_STATE.md` CURRENT_FACTS。
- 更新 P1 台账的 verification、nextAction、updated、lastVerified 和证据路径。
- 运行 `governance:write` 生成视图，再执行静态门禁。

### 步骤 5：验证与独立复核

- 运行 Prettier、branch audit、governance、features、markdown、doc commands、typecheck、unit/deploy、cargo check。
- 记录未运行的 Hosted、Tauri、Provider、第二环境和用户验收边界。
