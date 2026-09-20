# Verification

状态：`PASS（源修复、main 合并与桌面生产构建）`。验证基线为 `86c40d0`，最终整合提交为 `main@14dbe11`，没有复用旧 bundle 作为通过证据。

修复前在干净的 `TASK-GOV-001-verify` worktree（提交 `987c908`，只补入本回归测试）复现了 3 项失败：满载首页仍创建任务、审批等待期间连接变为隔离后仍发 HTTP、对话固定连接被隔离后仍提交。原始日志见 [baseline-red.txt](../../evidence/provider-submission-2026-09-18/baseline-red.txt)。

修复后 `npm run verify` 全部通过：

- lint 与治理检查：通过，26 tasks，0 violations。
- typecheck：通过。
- 单元测试：118 passed，0 failed。
- UI standards：116 files，0 violations。
- format check：通过。
- 生产浏览器：151 passed，0 failed。
- 主线生产 bundle：`dist/assets/index-CBwa_Zj7.js`；Tauri release 已从同一主线重新构建。

新增的 provider scheduling browser tests 12 项、submission gate unit tests 3 个顶层测试均包含在上述结果中。此次证据覆盖浏览器同一 JS 运行实例的预检、审批后复核、逐批复核、凭据变更、固定连接、lease identity 和状态迁移；跨进程 TaskHost/分布式租约、真实付费供应商、远端 CI 与 Figma 视觉验收仍不在本任务范围。

主线 Vite development 固定 `1421` 的运行态见 [dev-main-acceptance.json](../../evidence/provider-submission-2026-09-18/dev-main-acceptance.json)：development、`src/main.tsx`、`/src/main.tsx`，设置入口可打开且页面错误 0。主线 Tauri 实机验收见 [native-main-acceptance.json](../../evidence/provider-submission-2026-09-18/native-main-acceptance.json)：`tauri.localhost` production、`src/main.tsx`、`index-CBwa_Zj7.js`，mock Provider 请求 1 次并完成任务，随后清除系统凭据，页面错误 0。
