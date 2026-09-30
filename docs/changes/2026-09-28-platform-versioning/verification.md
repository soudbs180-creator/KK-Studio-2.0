# Verification：三端独立版本

- Task ID：TASK-VERSION-001
- 状态：实现、独立复审、PR 与主线门禁 PASS；Mobile/本机服务/真实登录仍为开放范围
- Base：`origin/main@065bcbf`；受审 head `9d55857`，已 squash 合入 `main@799efc5`。

## 基线

Node 24.21.0；基线在版本改动前为 `npm ci --no-audit --no-fund`、`npm run lint`、`npm run typecheck` 退出码 0，`npm test` 459/459 通过；当前分支再验证已纳入新增测试。版本改动前源码统一显示 2.1.0。

## 本轮结果

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| `node --test tests/unit/platformVersions.test.ts` | 4/4 PASS | patch 9→10、三端独立 bump、跨文件一致性和非法输入先拒绝 |
| `npm run version:check` / `npm run lint` | PASS | 三端 `2.1.1`，桌面 Cargo/Tauri、Web package/lock/根 `VERSION` 一致；治理 74/0、功能 34/0、Markdown 89/0 |
| `npm run verify`（合并迁移准备后的最终树） | PASS，退出码 0 | 482 项 Node：474 通过、8 项 Windows 跳过 Linux 文件系统用例；303/303 Edge 浏览器；UI/format/typecheck/build |
| `node node_modules/@playwright/test/cli.js test tests/browser/platform-version.spec.ts` | 1/1 PASS | Web production preview 的账号弹窗与更新页均显示 Web `2.1.1`，仍标注更新服务未接入 |
| `npm run client:check` / `npm run client:build` | PASS | Tauri release 可执行文件与 MSI/NSIS 构建为 `2.1.1`；未安装/发布 |
| `node tests/desktop/platform-version.mjs` | PASS | 隔离数据根与 WebView2 profile 的真实 Tauri release GUI，账号弹窗和更新页显示 Desktop `2.1.1`，无页面异常；[运行身份与 exe SHA-256](desktop-runtime.json) |

当前 `desktop=web=mobile=2.1.1` 只是版本起点；Mobile 没有运行产物，`config/platform-versions.json` 仅为规划元数据。PR #24 的 delivery、deploy-linux、verify 与独立复审均通过，squash 合入 `main@799efc5`；合并后 main 的 verify 与 deploy-linux 也通过，合并树与受审树一致。用户选择的 Web 本机伴随服务、真实登录、既有 IndexedDB 数据迁移和正式发布均未实现，不属于上述通过结论。
