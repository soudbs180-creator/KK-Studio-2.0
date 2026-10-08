# 桌面单排标题栏 Implementation Plan

> **For agentic workers:** 使用 superpowers:executing-plans 在当前上下文实施，完成后由独立只读上下文审查。

**Goal:** 修复 Desktop 原生标题栏与菜单栏叠成两排。

**Architecture:** TopBar 继续承载菜单，仅在 Tauri 中启用拖动区域与 WindowControls；配置关闭重复原生装饰。CSS 在 App 的统一末端 import 中加载，沿用语义 token。

**Tech Stack:** React 18 / TypeScript / Tauri 2 / Playwright / Node 24。

**Spec:** [spec.md](spec.md)。Task TASK-UI-013，owner root，branch `fix/TASK-UI-013-single-row-titlebar`，worktree `.worktrees/TASK-UI-013-single-row-titlebar`，base 1af0357b088df79dc51e9b309ef310a500722cf8。

## Global Constraints

40px TopBar；Desktop minWidth 1280；图标 16px；只有 main 的四项窗口权限；Web 导航不改变；不更新依赖、不触碰真实用户数据。只递增 Desktop patch，因为新增行为全部以 isTauri 为界。

## Review Focus

菜单点击不能拖动窗口；双击/按钮最大化同步；最小化和关闭实际生效；resize 监听异步清理；Web 三断点不出现桌面控制。

## Task 1：统一标题栏

文件：`src/components/TopBar.tsx`、新 `src/components/WindowControls.tsx`、`src/components/UiIcon.tsx`、`src/styles/desktop-titlebar.css`、`src/App.tsx`、Tauri config/capability；测试 `tests/desktop/titlebar.mjs` 与 `tests/browser/titlebar.spec.ts`。

- [x] 安装本工作树独立 lockfile 依赖，记录 lint/typecheck/菜单基线。
- [x] 编写真窗口失败回归，先对旧 release 运行并留存 decorations=true 的失败。
- [x] 复用 TopBar，加入四项原生操作与状态同步；关闭重复装饰。
- [x] 定向测试通过，构建真实 Tauri；留存单排截图及窗口操作证据。
- [x] 执行完整 verify、client:check，核对源码→Web/Desktop 产物链。
- [ ] 更新版本、账本、PROGRESS/PROJECT_STATE/HANDOFF，提交明确文件并完成独立审查。

任务串行执行，无独立子功能；独立 reviewer 只读。原 main 与其他 worktree 不写入。native worktree 工具因调用上下文为非 Git 容器返回 Not a git repository，故回退本仓库 ignored `.worktrees`。首次 fetch 因失效本机代理失败；单次 `git -c http.proxy= fetch origin` 成功，不修改用户 Git 代理设置。

恢复：revert 本任务提交，重新构建；不迁移或删除数据。当前请求没有合并/正式发布授权。实际日志与结果见 [verification](verification.md)，审查见 [review](review.md)。
