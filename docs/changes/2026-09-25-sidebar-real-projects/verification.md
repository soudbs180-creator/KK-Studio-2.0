# 真实项目侧栏整合验证

- 任务：`TASK-PROJECT-SIDEBAR-001`（真实项目接入已验证，持久文件夹仍为 PARTIAL）。
- 分支与基线：`feat/TASK-UI-009-ui010-integration`，基于 UI-010 候选 `98c567f026bc17b43f0dd50ad59f5c6bf0a5dfbe`；旧 UI-009 工作树、根工程及 1423 UI-010 预览保持原样。
- 环境：Windows、Node 24.21.0、Playwright Edge、Vite production preview `http://127.0.0.1:1424/`、隔离数据的 Tauri release。

## 结果

| 检查 | 结果 | 证据与边界 |
| --- | --- | --- |
| `npm run verify`，`KK_TEST_PORT=1424` | PASS | 370 Node、337 Edge browser；lint、治理/功能/Markdown、类型、格式、构建、UI 规则 170 文件/0 违规；[完整日志](evidence/verify-final.log) |
| 真实项目浏览器路径 | PASS | 空库无假行；ID 打开、改名、删除与项目库和刷新一致；搜索来自同一快照；任务状态不明时删除禁用；文件夹拖放、撤销、置顶与刷新边界，见 `tests/browser/sidebar-real-projects.spec.ts` |
| 响应式可视核对 | PASS | [采集脚本](evidence/capture.mjs)、[指标](evidence/metrics.json)；390/768/1440/1920 视口的 `documentWidth` 与视口相等，侧栏与文件夹可见；[窄屏](evidence/03-real-projects-390.png)、[桌面](evidence/02-real-projects-1440.png) |
| Web production 资源 | PASS | [web-runtime.json](evidence/web-runtime.json)：入口 `src/main.tsx`、`production`，JS/CSS 与 `dist` SHA-256 相同，页面错误 0 |
| `npm run client:build:agent -- --no-bundle` | PASS | fresh Tauri release，[构建日志](evidence/build-desktop.log)；构建产生 5 条已有 Rust dead-code warning，无编译错误 |
| `node docs/changes/2026-09-25-sidebar-real-projects/evidence/check-desktop.mjs` | PASS | 独立 `--data-dir` 与 WebView profile；原生空库→新建→改名→刷新→同项目打开→创建会话文件夹；[运行记录](evidence/desktop-runtime.json)、[截图](evidence/desktop-native-real-sidebar.png)。原生 JS/CSS 与当前 `dist` SHA-256 相同，页面错误 0 |

Web 与原生实际载入相同的 JS `d9ffe653831195282ed09e251ba31f65f6cbab81f7f5fed3db4ce7ec1b206183`、CSS `812361afa9943d356df744c94a0ae977cf20e12170de9dfbc34722d250c0e1ab`。原生程序 SHA-256 为 `116ab639efee19ae2393188df73cd03de9611026ce366587f883264c3667d236`，仅代表此隔离工作树的构建，不是用户当前安装版。

## 失败及修复记录

- 首轮定向用例发现文件夹改名按 Escape 误保存，修复输入事件后通过。旧侧栏测试原先直接依赖静态演示项目，改用显式创建的真实项目 fixture；测试意图保持。
- 首轮完整回归暴露测试 Agent fixture 仅允许 1423 Origin，随后改为跟随 `KK_TEST_PORT`；另有文件夹菜单从“置顶项目”改为“置顶文件夹”的旧断言随语义更新。
- 对话宽度回归曾在高负载时观察到按 End 后实际面板比更新后的 `aria-valuemax` 少 11px。修复侧栏调整期间的最大宽度同步；该用例 30 次并行重复通过，最终完整验证 0 fail/0 flaky。
- 浏览器完整验证会重写 62 个历史证据文件；检查后只把这些自动生成的旧文件恢复到本分支基线，新目录证据保留。

## 尚未完成

- 文件夹、置顶与成员顺序目前只在当前页面会话，刷新后项目回到未分组。要持久化需定义 Web/原生快照与项目包迁移，不得把当前 Prototype 当作永久资产管理。
- UI-010 的未裁决 Ardot token 与产品视觉验收仍保留。此 PR 依赖 UI-010；未合入主线或正式安装包。
- WorkBuddy、豆包真实接管、共享记忆、跨平台账号/额度与自动模型调度属于独立 Agent 链路，未由侧栏和 UI 测试证明。
