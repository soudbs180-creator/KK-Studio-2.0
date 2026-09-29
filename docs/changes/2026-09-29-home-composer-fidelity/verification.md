# Verification：首页/对话输入区与剩余页面反馈收口

- Task ID：TASK-UI-HOME-002
- 记录状态：FINAL（结论 PARTIAL）
- 执行时间与时区：2026-09-29，Asia/Shanghai
- Intent / Spec / Plan / AC：本目录 `intent.md`、`spec.md`、`plan.md`，AC-1–AC-5
- cwd / branch：`D:/kk-studio/KK-Studio-2.0` / `main`
- dirty 状态：工作区原有大量 UI、文档和测试改动；本轮未 reset/clean，相关增量见 `git status` 与 `plan.md`
- 工具：Node 24、npm 11.19.0、Playwright Edge、Windows；未运行 Tauri/native

## 实际命令和结果

| 命令/检查 | 结果 | 证据与限制 |
| --- | --- | --- |
| `npm run typecheck` | PASS | TypeScript 静态检查退出码 0 |
| `npm run build` | PASS | Vite production build 退出码 0；保留 zod 注释和大 chunk warning |
| `node node_modules/typescript/bin/tsc --noEmit --pretty false` | PASS | 当前源码类型检查退出码 0 |
| `node node_modules/vite/bin/vite.js build` | PASS | 当前源码生产构建退出码 0；保留 zod 注释和大 chunk warning |
| `.tmp` DOM/geometry smoke（首页、对话、设置、workspace、移动导航） | PASS | 首页空态 652×170/299×170、文本区 400×64/271×64、对话 426×170、设置底栏、收起侧栏与 244×50 工具条核验 |
| `tests/browser/input-contract.spec.ts` | PASS（9 passed） | 输入增长、Figma 空态高度、菜单焦点和附件移除；对话输入保持 64px 空态区 |
| `tests/browser/composer-menu-audit.spec.ts`、`frame-accuracy.spec.ts`、`settings-scroll.spec.ts`、`sidebar.spec.ts`、`ui-interaction-matrix.spec.ts` | PASS（7 + 3 + 3 + 9 + 1） | composer 菜单、Figma shell 锚点、设置底部滑块、侧栏开关和菜单焦点 |
| 本轮 sidebar/frame 定向回归（preview 1423） | PASS（4 tests） | 1920px 保持 70px↔291px shell；1067px 展开后侧栏 291px、工作区 `margin-left:291px`，图标资源分别为 `sidebar-expand.svg` / `sidebar-collapse.svg` |
| `tests/browser/canvas-layout.spec.ts`、图片编辑器专项 | PARTIAL | 当前空白 canvas fixture 没有 `image-preview`/连接卡片，等待 fixture 时超时；不归因于本轮布局改动 |
| `git diff --check` | PASS | 无 patch 空白错误 |

## UI 运行态和截图证据

- 1421 开发服务：已有 `npm run dev` 进程，页面为 `http://127.0.0.1:1421/?refresh=20260929-1`。
- 证据预览：用 Vite preview 1423 生成真实 React/CSS DOM 截图后已退出临时进程。
- 截图：`evidence/home-390.png`、`evidence/home-1099.png`、`evidence/home-1920.png`。
- 侧栏同状态截图：`evidence/sidebar-collapsed-1099.png`、`evidence/sidebar-expanded-1099.png`；展开态工作区从 x=72 移到 x=291，图标左侧小框填充。
- 390px：快捷“提示词库”按钮为 0；首页输入框 299×170，模型、Skill、语音、权限、发送可见；顶栏左侧为用户入口，右侧为搜索/设置/项目。
- 834/1920px：首页输入框均为 652×170，文本区 400×64，底部动作行 625×24；不再显示首页伙伴、插件或批量/隐私行。
- 对话：输入框 426×170，保留模型、Skill、插件及右侧语音/模式/发送；空白新项目不伪造 Figma 截图中的历史消息。
- 设置/工作区：移动设置分类位于底部 84px 横向滑块；桌面/平板侧栏默认 70px 收起，展开为 291px 并推动工作区，画布工具条保持 244×50。

## Figma 与工程边界

- Figma 已重新授权并成功读取文件 `0nU0A7pq6eyjwfwm1TtWkO`：`483:753`（手机端首页输入框）、`407:29265`（对话侧栏输入框）、`404:28667`（展开工作区）与 `410:67357`（收起工作区）。本轮只读，未写入 Figma。
- 首页触屏动作按 `483:753` 对齐；对话侧栏继续保留 `407:29265` 的模型、Skill、插件及右侧动作；侧栏宽度与图标状态对照 `404:28667`/`410:67357`。
- `src/main.tsx` → `src/App.tsx` → `StartPage`/`StartComposer` 为首页链路；`ConversationPanel`/`ConversationComposer` 为对话链路；`SettingsPanel`、`useSidebarLayout`、`CanvasToolbar` 分别承载设置/侧栏/画布核验。
- 未验证：Tauri release、真实移动硬件/软键盘、live Provider/ComfyUI、完整 canvas fixture 和用户最终视觉验收。

## 结论

- 实现：完成已授权 Figma 节点覆盖的首页、对话、设置、侧栏、画布和移动顶栏收口；首页提示词库快捷入口已移除，菜单入口保留。
- 验证：PARTIAL；当前 typecheck/build、输入/菜单/设置/侧栏专项和关键 DOM/几何 smoke 通过；canvas 图片 fixture 仍缺少 `image-preview`/连接卡片，保留为后续 fixture 核查项。
- 产品能力：Web UI Prototype/本地布局行为；不改变真实服务能力状态。
- 发布/合并：未提交、未推送、未创建 PR。
