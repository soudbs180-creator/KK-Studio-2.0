# Verification：Agent/Provider 首页入口修正

- Worktree：`D:/kk-studio/.worktrees/TASK-AGENT-010-provider-entry`
- Base：`bfa227c843056e9db943013b367dd7b67565466e`
- 端口：浏览器预览 `1424`（`1423` 已由其他任务占用）

## 已执行

- `node --test tests/unit/startModelPickerState.test.ts`：3/3 通过。
- `node node_modules/typescript/bin/tsc --noEmit`：通过。
- `node scripts/check-ui-standards.mjs`：215 个文件、0 项违规。
- `node node_modules/typescript/bin/tsc -b`：通过。
- `node node_modules/vite/bin/vite.js build`：通过。
- `node --test tests/unit/*.test.ts tests/deploy/*.test.mjs`：930 tests，920 通过、2 失败、8 跳过；失败是既有 `desktopAgentRuntime.test.ts` 环境启动/凭据夹具问题，与本次首页改动无关。
- `node scripts/check-markdown.mjs`：114 个文件、0 项违规。
- `node scripts/check-features.mjs`、`node scripts/check-governance.mjs`、`node scripts/platform-versions.mjs check`：均通过。
- Prettier changed-file check：通过。
- Edge 预览交互：模型弹层显示供应商/Agent 边界文案；点击“打开 Agent 面板”后聊天面板出现。
- 截图证据：`test-results/agent-provider-entry/model-menu.png`（当前预览首页，Agent 未连接状态）。

## 限制

- 未在本分支重新构建 Tauri EXE；当前桌面包构建在主工作树完成，分支改动尚未合入主线。
- 未声称真实 Codex 账号生图或真实 Provider 请求完成；本次只修正入口说明和导航。
