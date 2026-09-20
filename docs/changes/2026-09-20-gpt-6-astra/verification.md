# Verification

- ID：GPT6-ASTRA-20260920 / TASK-KK2-MAIN-SYNC
- 状态：Astra 迁移计划与首次 main 同步已按受控 PR 流程完成；Astra 应用功能本身尚未实施。

## 已完成的审计与修正

- 读取当前 AGENTS、PROGRESS、数据/生成架构、文档模板、模型/凭据、快照校验与测试配置。
- 依据官方 OpenAI 文档形成 GPT-6 Astra 迁移计划；未读取或使用 provider key，也未执行付费请求。
- 清理重复的 `docs/migrations/kk-studio-2.0/` 目录，将同步入口统一为 `docs/changes/2026-09-20-gpt-6-astra/`。
- 修正历史 UI 审计中指向不存在证据目录的链接；这些历史截图不再作为当前交付证据。
- 修正 `tests/browser/task-intent.spec.ts` 的宽匹配 locator，改为 `.creation-storage-notice[role="alert"]`，避免 storage alert 与 status 文本重复命中。
- `README.md` 的安装示例与仓库规则统一为 `npm ci`。

## 当前独立验证

- `node scripts/check-governance.mjs --write`：待本轮 ledger 更新后执行；必须 0 violations。
- `npm run build`：PASS；Vite 产物生成成功，仅保留已有警告。
- `node ... playwright test tests/browser/task-intent.spec.ts --workers=1 --retries=0`：PASS，5/5。
- `npm run client:check`：PASS；保留 3 个既有 dead_code warnings。
- 先前完整 `npm run verify`：168 passed，1 flaky；该 flaky 已由上述严格 locator 修正，未重新宣称完整 verify 已重跑。
- `git diff --check`：提交前执行。

## GitHub 目标核对

- 目标：<https://github.com/soudbs180-creator/KK-Studio-2.0>。authenticated REST 确认仓库为 private、默认分支 `main`、当前凭据具备 admin/maintain/push/triage/pull 权限。
- 当前远端 `main` 是旧 monorepo 初始树；候选分支从它派生，完整 tree 改为本地已验证 2.0 tree。
- `main` API 返回 `protected=false`、required checks 为空；rulesets/protection API 返回 403（当前 GitHub 计划不支持），因此 EXT-GIT 保持 BLOCKED。
- PR #1：<https://github.com/soudbs180-creator/KK-Studio-2.0/pull/1>，已通过 squash 合并；合并提交为 `a9db71b342a53f0bb1929f95180396648c09afef`。
- 候选 SHA `96fc440b4c0021ef37450c2acf4796dbc6c3ae45` 的 quality workflow 已成功：完整 `npm run verify`、Rust fmt/test、`client:check`、Tauri 无 bundle 构建和 evidence upload 均 PASS。

## 首发候选验收

- 合并后回读：远端 `main` commit 为 `a9db71b342a53f0bb1929f95180396648c09afef`；远端 tree 与本地稳定 main tree 均为 `a3cad24d11ded18f98495c5cddb7f953cb9630b1`，tree equality：PASS。
- 候选 diff 预计替换旧远端当前文件树；旧 `apps/`、`packages/`、`services/` 等路径不应出现在候选 tree。
- secret/path/构建产物扫描：候选提交不得包含 `.env`、`node_modules/`、`dist/`、`target/`、`test-results/`、`.tmp/`、数据库、安装包、私钥或 API key。
- 合并前必须满足：候选 SHA 对应的 quality workflow 成功、PR base/head 正确、工作树干净。
- 合并后必须满足：远端 `main` 的 commit/tree 与本地稳定 `main` 的 tree 相等；本次账本收口若改变 tree，使用后续小 PR 重新收敛。

## 官方来源

- [GPT-6 Astra 模型](https://developers.openai.com/api/docs/models/gpt-6-astra)
- [GPT-6 Astra 迁移指南](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart)
- [迁移到 Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses)
- [Responses create](https://developers.openai.com/api/reference/resources/responses/methods/create)
