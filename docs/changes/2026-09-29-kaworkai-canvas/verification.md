# Verification：Kaworkai 无限画布研究与本地增强

- 任务：`TASK-CANVAS-KAWORKAI-001`
- 状态：PARTIAL
- 日期：2026-09-29（Asia/Shanghai）
- 工作区：`D:/kk-studio/KK-Studio-2.0`，保留开始时已有 dirty checkout；未提交、未推送。

## 参考页只读证据

- 页面：`https://www.kaworkai.com/pages/infinite-canvas.html?board=proj-3d526516-3f6`
- 已通过浏览器 DOM/截图确认空画布、节点菜单入口、右键菜单、底部 dock、整理菜单、缩放菜单和对话侧栏。
- 浏览器桥接后续重连失败，因此没有继续点击远程入口；改用公开脚本只读快照核对历史上限（80 条/24 MB）、dock 默认值与自适应网格、图层搜索侧栏、整理策略和端口校验。
- 没有触发生成、上传、分享、购买或远程 board 写入；页面显示的 50 个充值点数未消耗。
- 静态快照保存在工程外 `D:/kk-studio/.tmp/kaworkai-inspect/`，不属于交付源码。

## 本地验证

| 检查           | 命令/范围                                                                                                                                           | 结果                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 领域单测       | `node --test tests/unit/canvasHistory.test.ts tests/unit/canvasPreferences.test.ts tests/unit/canvasGraph.test.ts tests/unit/projectCanvas.test.ts` | 11/11 通过                                                    |
| TypeScript     | `node_modules/.bin/tsc.cmd --noEmit`                                                                                                                | 通过                                                          |
| 生产构建       | `node_modules/.bin/vite.cmd build`                                                                                                                  | 通过；保留既有 Zod 注释和 bundle 大小提示                     |
| 新增浏览器验收 | `node node_modules/@playwright/test/cli.js test tests/browser/canvas-history-layers.spec.ts --reporter=line`                                        | 2/2 通过；覆盖右键/键盘历史、吸附 localStorage、图层搜索/定位 |
| 原有右键菜单   | `node node_modules/@playwright/test/cli.js test tests/browser/context-menu.spec.ts --retries=0 --reporter=line`                                     | 1/1 通过                                                      |
| 治理与格式     | `check-governance`、`check-features`、`check-markdown`、`check-ui-standards`、定向 Prettier                                                         | 74/0、32/0、89/0、170/0，格式通过                             |

## 未验证项与既有阻断

- 合并运行 `canvas-navigation.spec.ts`、`canvas-pointer.spec.ts`、`interaction-state.spec.ts` 时，依赖默认 `image/video` 节点的旧用例在“新建空白项目” fixture 中找不到节点；同时并行 Playwright preview 进程曾提前退出导致部分重试出现 `ERR_CONNECTION_REFUSED`。这不是本轮新增组件的失败证据，需在后续 fixture/项目初始化任务中单独修复后再跑全量画布回归。
- `interaction-state.spec.ts` 的工具栏菜单尺寸用例还依赖旧的 `.toolbar-toggle` 选择器，而当前 dirty checkout 的工具栏已经改为 `.toolbar-current-tool`；该差异属于已有 UI 治理改动，本轮没有覆盖或回退。
- Desktop 原生窗口、真实 Provider、参考站点远程生成/云端 board 和分组折叠没有执行。

## 交付映射

- 快照历史：`src/domain/canvasHistory.ts`、`src/components/canvas/useCanvasHistory.ts`
- 偏好与吸附：`src/domain/canvasPreferences.ts`、`src/components/canvas/useCanvasPreferences.ts`、`src/components/canvas/useCanvasPointer.ts`
- 右键入口：`src/components/canvas/CanvasContextMenu.tsx`、`src/components/canvas/CanvasOverlays.tsx`
- 图层面板：`src/components/canvas/CanvasLayersPanel.tsx`、`src/styles/canvas-layers.css`
- 研究结论：`research.md`
