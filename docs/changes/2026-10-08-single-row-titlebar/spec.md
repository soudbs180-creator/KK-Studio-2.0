# Spec：桌面单排标题栏

- Task ID：TASK-UI-013；状态 READY；[Intent](intent.md)。
- 来源：[UI_INDEX](../../UI_INDEX.md)、[UI_RULES](../../UI_RULES.md)、[tokens.css](../../../src/styles/tokens.css)；当前用户截图明确要求一排。
- 实现基线：main@1af0357b；官方 [Tauri 窗口自定义](https://v2.tauri.app/learn/window-customization/)。

Desktop 复用 TopBar，高度消费 `--kk-topbar-height`（40px）；左侧名称、文件/编辑/窗口/帮助菜单，中间可拖动空白，右侧最小化、最大化/还原、关闭。名称和空白标记 drag region，菜单及控制不得成为拖动区域。双击 drag region 由 Tauri 原生处理，最大化状态变化后按钮名称/图标同步。窗口操作失败给出可读状态，不伪造成功。控件使用语义 tokens 与共享 UiIcon，保留焦点环。

Web 不显示桌面窗口控制，继续保留平台标签和既有响应式导航；Mobile 无独立产物，本次不改变规划版本。Desktop 最小窗口宽度仍为 1280，Web 在 390/1099/1920 验证。

仅给 main 窗口增加关闭、最小化、切换最大化和拖动四项权限，均用于替代原生标题栏同等功能；不增加外部 origin、文件权限、费用或传输。没有 schema/存储变更。升级和回滚只涉及源码/可执行文件，数据身份不变。离线窗口操作可用；异步事件订阅清理，失败保留菜单与重试入口。

合并预检补充：初始化、resize 和按钮操作共用最新请求序号；窗口操作开始即使旧查询失效，迟到成功或失败不得覆盖当前状态。卸载后不再读窗口或写 React 状态；监听清理同时捕获同步异常和实际 SDK Promise 拒绝，以不含错误载荷的内部诊断记录失败。同一窗口操作进行时禁止重复提交。

验收与 [Intent](intent.md) 的 AC-1/2/3 一一对应，证据写入 [verification](verification.md)。Figma 通用尺寸/颜色沿用，窗口控制布局是当前用户反馈要求的工程补充。

本轮当前基线为 main@2cb73d237927afd68ea492394a76f1beac468369，产品 86e712f2c6b94e24267e3468ee667c8e91feb2d3；Desktop2.1.10/Web2.1.10/Mobile规划2.1.1，本文原1af为首次实现的历史基线。
