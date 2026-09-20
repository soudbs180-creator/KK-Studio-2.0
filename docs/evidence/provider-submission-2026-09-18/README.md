# TASK-PROV-001 验证证据

验证目录：`D:\kk-studio-next\.worktrees\TASK-PROV-001`。

## 修复前基线

在干净的 GOV 验证 worktree（提交 `987c908`，仅补入本回归测试文件）运行：

```text
node node_modules/@playwright/test/cli.js test tests/browser/provider-scheduling.spec.ts --grep "首页capacity|审批等待期间quarantined|对话固定连接quarantined" --workers=1 --timeout=7000 --retries=0
```

结果为 3 failed：首页满载仍继续提交、审批后连接被隔离仍继续提交、对话固定连接被隔离后仍显示“任务已提交”。完整原始输出保存在同目录 `baseline-red.txt`。

## 修复后完整验证

在本任务 worktree 的最新源码和生产构建上运行：

```text
npm run verify
```

结果：

- `npm run lint`：通过；治理检查 26 tasks，0 violations。
- `npm run typecheck`：通过。
- `npm test`：118 passed，0 failed。
- `npm run ui:check`：116 files，0 violations。
- `npm run format:check`：通过。
- `npm run test:ui`：151 passed，0 failed。
- 主线生产 bundle：`dist/assets/index-CBwa_Zj7.js`（`main@14dbe11` 重新构建）。

新增回归测试 `tests/browser/provider-scheduling.spec.ts` 共 12 项全部通过，覆盖首页预检、审批后重检、固定连接、429 `Retry-After`、403 隔离、5xx 显式重试和新建空项目首发。新增单元测试 `tests/unit/providerSubmission.test.ts` 的 3 个顶层测试全部通过。

主线 Tauri release 运行于 `http://tauri.localhost/`，runtime 为 production、entry 为 `src/main.tsx`，实际加载 `index-CBwa_Zj7.js`。隔离数据目录下通过 UI 写入唯一 fixture 凭据，mock Provider 完成 1 次真实前端提交并归档结果，随后点击“清除密钥”；页面错误为 0，证据见 `native-main-acceptance.json`。

主线 Vite development 运行于 `http://127.0.0.1:1421/`，runtime 标记为 development、entry 为 `src/main.tsx`，实际脚本为 `/src/main.tsx`；设置入口可打开，页面错误为 0，证据见 `dev-main-acceptance.json`。生产浏览器验证使用固定 `1423`，对应 `npm run verify` 的 151 项结果。

## 证据边界

这是本地浏览器/单元测试和本地生产构建证据；不代表远端 CI、付费供应商、Figma 视觉验收或跨进程 TaskHost 租约已经接入。桌面 release 仍需在本地 `main` 合并后的最终构建上单独复验。
