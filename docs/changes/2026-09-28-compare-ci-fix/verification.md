# Verification：对比命中区子像素修复

- Task ID：TASK-COMPARE-002
- 记录状态：本地 FINAL；托管 CI 待回读
- 执行时间：2026-09-28（Asia/Shanghai）
- base：`origin/main@7bc7c67`
- branch / cwd：`fix/TASK-COMPARE-002-touch-target` / `D:/kk-studio/.worktrees/compare-ci-fix`

## 失败复现

- 合并后 [Hosted run 36369533105](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/36369533105) 的 `verify` 失败：Node 459/459，浏览器 301/302；唯一失败为 `tests/browser/image-compare.spec.ts:192` 的 390px 弹窗按钮高度断言，两次测得 `43.99999237060547`，阈值 44。Rust 与 Desktop CI 步骤因前序失败未运行。该失败发生在 `main@7bc7c67`，不是 PR #21 候选 head 的成功结果。
- 新 worktree `npm ci --no-audit --no-fund` 退出码 0；Node 24.21.0。

## 修复后检查

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| `node node_modules/@playwright/test/cli.js test tests/browser/image-compare.spec.ts` | PASS，2/2 | production preview 的 390px 命中区、CDP 触摸及两图交互；退出码 0 |
| `npm run verify` | PASS，退出码 0 | 459/459 Node、302/302 Edge 浏览器；治理 72/0、功能 33/0、Markdown 86/0、类型、UI、格式、build |
| `npm run client:check` / `npm run client:build` | PASS，退出码 0 | Tauri release exe 与 MSI/NSIS 重建；构建有 5 条现有未使用函数警告 |
| `node tests/desktop/image-compare.mjs` | PASS，退出码 0 | 独立 `--data-dir` 和 WebView2 profile，真实 release GUI；无 page errors |
| 当前 PR `verify`/`delivery` | 待运行 | 当前 head |
| 合并后主线 push CI | 待运行 | 当前 main |

首次尝试 `npm run test:ui -- --grep "narrow canvas keeps the comparison"` 因 PowerShell 参数传递得到 `No tests found`（退出码 1）；随后以具体文件路径运行 2/2 通过，未改变用例或放宽断言。

## Web 与 Desktop 运行态

- Web：`npm run verify` 使用 production preview `http://127.0.0.1:1423/`；`src/main.tsx → App.tsx → Canvas.tsx → ImageCompareControls / ImageCompareDialog`。实际 bundle `index-BbnuwBUI.js`、`index-ClRZ_rbO.css`。390px 新版[浏览器截图](evidence/compare-390.png)已目视核对；原测试仍逐个测量按钮高度不少于 44px，确认对话框位于屏幕内并以 CDP 拖动滑块。无真实 Provider。
- Desktop：`src-tauri/target/release/kk-studio.exe --data-dir <隔离绝对目录>`，独立 WebView2 profile，URL `http://tauri.localhost/`、production、`src/main.tsx`，加载同一个 `index-BbnuwBUI.js` 和 `index-ClRZ_rbO.css`。exe SHA-256 为 `cec00d2ea936d6b93ca7d9c40edcefad028b45cf9e77bbfcec21c0377f3bb2db`；[GUI 截图](evidence/compare-desktop.png)和[运行元数据](evidence/desktop-acceptance.json)已核对。真实安装 MSI/NSIS、物理触屏、真实 Provider 与用户最终视觉确认未发生。

## 未验收

物理手机、真实 Provider 和用户最终视觉确认；与本次 CSS 修复无关的任务继续按账本状态。
