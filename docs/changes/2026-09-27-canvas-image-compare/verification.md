# Verification：画布图片对比

- Task ID：TASK-COMPARE-001
- 记录状态：候选本地 Web/Desktop 通过；独立审查、Hosted CI、用户产品验收待完成
- 日期：2026-09-27（Asia/Shanghai）
- cwd / branch：`D:/kk-studio/.worktrees/canvas-compare` / `codex/TASK-COMPARE-001-canvas-compare`
- base：`origin/main@a89792a`

## 基线

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| `npm ci`，Node 24.21.0 | PASS | 独立 worktree；postinstall Agent/插件构建通过 |
| `npm run typecheck` | PASS | 代码修改前 |
| `npm run lint` | PASS | 治理 70/0、功能 32/0、Markdown 85/0；代码修改前 |
| `npm run ui:check` | PASS | 159 文件、0 违规；代码修改前 |
| `npm test` | PASS | 456/456；代码修改前 |

## 候选门禁

| 检查 | 结果 | 证据与边界 |
| --- | --- | --- |
| `npm run verify` | PASS，退出码 0 | ESLint、治理 71/0、功能 33/0、Markdown 86/0、TypeScript、Node 单测、UI 标准、Prettier、生产构建、Edge 浏览器 302/302；本 worktree 的未提交候选，尚非最终提交 SHA |
| `npm run client:check` | PASS，退出码 0 | Tauri/Rust dev profile；5 条既有未使用函数警告 |
| `npm run client:build` | PASS，退出码 0 | 重新构建 `dist`、release exe，并生成 MSI/NSIS；产物未发布 |
| `node tests/desktop/image-compare.mjs` | PASS，退出码 0 | 在隔离 `--data-dir` 和独立 `WEBVIEW2_USER_DATA_FOLDER` 中运行真实 release GUI；运行前 IPC 断言实际数据根目录 |

新单测先失败后通过；浏览器用例也先复现并修正了 1440/1220px 对话侧栏遮挡、对比层右键/双击触发画布菜单、滑块 0% 时错误重试不可点击。失败记录来自修复过程，最终候选用例保持这些断言。

## Web 运行态

- 启动：`npm run verify` 的 `test:ui` 使用 `vite preview --host 127.0.0.1 --port 1423 --strictPort`；浏览器 URL `http://127.0.0.1:1423/`，`data-runtime-mode=production`、`data-runtime-entry=src/main.tsx`。
- 路径：项目库 → 新建项目 → Workspace；`src/main.tsx` → `App.tsx` → `Canvas.tsx` → `CanvasNodeLayer` / 图片节点，以及 `ImageCompareControls` → `ImageCompareDialog`。仅一个 production CSS bundle，浏览器断言对比层最终背景色 `rgb(22, 22, 22)`。
- 实际加载的构建：`dist/assets/index-D7BhC6vf.js`、`dist/assets/index-BpENrrtk.css`。测试使用归档的本地 fixture，覆盖选择/移除、数量门禁、并排标签/来源、放大及同步滚动、滑块 1%/10% 键盘步长与指针、错误/重试（含 300% 滚动后与滑块 0%）、Escape 回焦、删除后剔除。未调用真实 Provider。
- [1440px 并排截图](evidence/compare-1440.png)；1220px 测试断言选择条未被右侧对话框盖住并能重新打开；[390px 滑块截图](evidence/compare-390.png)。390px 为浏览器窄屏，不等于原生 Mobile。

## Desktop 运行态

- `src-tauri/target/release/kk-studio.exe --data-dir <隔离绝对目录>`；独立 WebView2 profile，经 CDP 操作 `http://tauri.localhost/`。IPC `get_storage_root` 与隔离目录完全一致；未使用默认用户数据目录。结束后本轮进程已退出。
- `data-runtime-mode=production`、`data-runtime-entry=src/main.tsx`；实际 WebView2 加载 `index-D7BhC6vf.js` 和 `index-BpENrrtk.css`，与 Web preview 同一 production 前端。打开项目、上传两张本地图片、加入对比、并排、滑块方向键和 Escape 均实际通过，page errors 为空。
- [桌面对比截图](evidence/compare-desktop.png)和[运行元数据、exe SHA-256](evidence/desktop-acceptance.json)；脚本 `tests/desktop/image-compare.mjs` 可重复验证。未安装 MSI/NSIS，未做真实 Provider、原生触屏或用户视觉验收。

## 交付边界

本记录是当前 task worktree 候选证据。最终提交 SHA 的独立 review、PR Hosted `verify`/`delivery`、用户产品验收和主线集成另记于 `review.md`；不得把本地通过当作这些门禁通过。
