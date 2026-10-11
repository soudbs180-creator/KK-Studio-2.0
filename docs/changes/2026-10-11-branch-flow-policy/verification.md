# Verification

## 已执行

- 仅修改治理规则和本变更包；未修改 `src/`、`src-tauri/`、`tests/`、配置、依赖或静态资源。
- `master` 与当前 `main` 的基线已核对：`master=609f5243`、`main=a431923e`，`master...main=23/171`，因此基线迁移被明确列为前置阻塞项。
- 待在目标 `master` 完成迁移后运行 `npm run governance:check`、`npm run markdown:check`、`npm run format:check`；本分支当前只承载规则草案，不能替代迁移后的主线验证。

## 边界

本变更不宣称已完成基线迁移、产品测试、Hosted CI、发布或用户验收。
