# Spec：画布会话分栏与固定侧栏交互修复

- Task ID：TASK-UI-CANVAS-001
- 状态：IMPLEMENTED
- 日期：2026-09-28
- Intent / 账本：`intent.md` / `docs/governance/task-ledger.json`
- 当前规范与实现基线：Design System 1.2/1.3 的响应式实现；现有 `Sidebar`、`CanvasHud`、`ConversationPanel` 和 `useCanvasViewport`。
- Source of truth：用户浏览器评论和现有代码；历史 Figma 页面 `0nU0A7pq6eyjwfwm1TtWkO` node `407:29265` 作为组件来源。本轮 Figma 读取因连接需重新认证而 NOT VERIFIED。

## 用户行为与入口

- 主流程和相邻流程：在 workspace 通过“打开对话”显示右侧会话；侧栏通过“展开侧边栏/收起侧边栏”切换；画布顶部导航、任务列表和底部工具继续操作。
- 页面/route/组件或 API/命令入口：`src/App.tsx` → `Sidebar`、`Canvas` → `CanvasHud`/`CanvasNavigation`/`CanvasToolbar`、`ConversationPanel`；样式最终由 `App.tsx` 的响应式 CSS 导入覆盖。
- loading、success、error、cancel、offline、timeout：本修复不改变会话消息或生成任务状态，只改变可见区域和命中区域。
- 重试、幂等、stale async、unknown 受理与重启恢复（按需）：不适用；无异步状态契约变化。
- 键盘/焦点/Escape、长文案、响应式（UI 适用）：保留现有 Escape/焦点逻辑；960–1200px 使用分栏，<960px 仍使用覆盖式会话；HUD 和工具按钮固定命中高度。

## 架构、数据与权限

- 模块职责和依赖方向：`App` 只决定当前布局是否让会话覆盖画布；CSS 决定 rail/inset；`useCanvasViewport` 继续读取实际 canvas 尺寸；`Sidebar` 不再渲染宽度拖拽柄。
- schema/API/事件/文件格式与兼容策略：无 schema/API 变化；现有 `chat-mobile` class 和 `covered` prop 继续兼容。
- 数据归属、原件保留、校验和、并发/原子性：无数据写入。
- 凭据与日志边界、最小权限、外部传输与费用：不涉及。
- 相关 ADR：无；布局修复未改变跨模块数据契约。

## 平台能力

| 能力         | Desktop                                     | Web                                          | Mobile                        | 降级/禁用理由                         |
| ------------ | ------------------------------------------- | -------------------------------------------- | ----------------------------- | ------------------------------------- |
| 平板会话分栏 | 可复用同一 WebView CSS，未在 Tauri 本轮重跑 | 已用 Vite preview/Playwright 验证 960–1200px | 浏览器窄屏只作为响应式参考    | 原生设备软键盘和 Tauri release 未验证 |
| 固定侧栏开关 | 代码共享                                    | 已验证                                       | 手机继续使用固定顶栏/账户入口 | 不新增原生侧栏行为                    |

说明：这是 Prototype/Web UI 布局修复，不代表真实服务接入或移动原生验收。

## 生命周期与恢复

- 初始化/安装：无变化。
- 正常使用、取消/离线：无变化；会话和画布使用原有状态。
- 升级和旧 schema：无变化。
- 损坏/写失败/进程重启：无变化。
- 备份、还原、回滚：回滚响应式 CSS、`App` prop 和 sidebar render 即可恢复；无数据迁移。
- 导出/卸载/退役及用户数据保留：无变化。
- 各项不适用的原因：本任务只处理布局和交互命中。

## 验收映射

| Intent AC | 预期状态/结果                                                         | 检查/运行环境                                | 证据要求                              |
| --------- | --------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------- |
| AC-1      | 展开 304px、收起 72px、无拖拽柄                                       | Playwright Edge，1067×912，Vite preview 1423 | `sidebar.spec.ts`、DOM computed style |
| AC-2      | conversation 400px，canvas 右边界贴齐 rail，navigation/toolbar 在左侧 | Playwright Edge，1071×698，Vite preview 1423 | `composer-fidelity.spec.ts`、截图     |
| AC-3      | 顶部与侧栏 toggle 44px 等高，底部工具右边界留 8px                     | 同上                                         | geometry assertions、截图             |
| AC-4      | 834px 覆盖布局继续隐藏 HUD/toolbar 并保持 canvas inert                | Playwright Edge，834px                       | `responsive-layout.spec.ts`           |

## 风险和决策

- 可自主解决的技术决定及依据：将分栏断点设为 960px；这是在现有 768–1200 平板区间内为 400px rail 留出可用画布宽度的最小稳定宽度。
- 待用户决定的产品语义（无则写无）：无。
- 规范冲突、外部依赖与阻断范围：历史响应式规格曾在 1200px 以下隐藏画布控件，与本轮用户评论冲突；按最新评论和可观察行为调整，手机覆盖状态保留。Figma MCP reauth 阻断只影响新的设计源读取，不阻断本地实现。
- 与 intent 的差异及授权依据：无；未改服务能力或数据模型。
- 明确未承诺的能力：全量 canvas demo 内容、真实 Provider、原生移动硬件和 Tauri release 本轮未承诺。
