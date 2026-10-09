# Plan：修复侧栏项目拖拽

- Task ID：TASK-UI-015；状态：IN PROGRESS；[intent](intent.md)、[spec](spec.md)。
- Owner：root；分支：fix/TASK-UI-015-project-drag；worktree：D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-UI-015-project-drag。
- Base：8090475958f1a0bdd1b4b36ada7f2aba1e4e6264；原 checkout 的无关未跟踪文件保持原样。默认 fetch 因本机失效代理失败；命令级 `git -c http.proxy= -c https.proxy= fetch origin` 成功，origin/main 与 base 相同，无全局代理变更。
- Native worktree 工具因聊天容器不是 Git 仓库失败，采用已忽略的仓库 .worktrees 路径登记 Git worktree。Node 24.21.0/npm；初始依赖 junction 复用引起 Vite 开发字体 403，随后按原 lockfile 在任务树安装本地依赖，不扩大 Vite 文件系统权限。
- 基线：typecheck/lint PASS；初次 npm test 有两项 Agent dist 未准备失败（802 pass/2 fail/8 skip），先按既有 agent:build 生成运行依赖再复验，不修改断言。
- 依赖图：失败复现 → 最小修复 → Web/Native/完整验证 → 独立审查。单一实现者串行改产品文件。

## Task 1：恢复现有拖放契约

- [x] 在 tests/browser/sidebar-project-groups.spec.ts 补空组标题及文件夹内容投放测试，保存两项 RED。新增隔离 native 脚本和 Win32 鼠标助手；CDP dragTo 会绕过旧桌面故障，改用真实系统鼠标验证，保存旧包缺少 dragover/drop 的 RED。
- [x] src-tauri/tauri.conf.json 主窗口设置 dragDropEnabled=false；SidebarProjectHeader 新增 onDropProject(id:string) 并接收已有项目 MIME；SidebarProjectGroups 透传 dropToSection；SidebarFolderGroup 将投放事件提升到文件夹容器，保留标题高亮与 stopPropagation；sidebar.css 沿用同一拖放反馈 tokens。
- [x] 相关定向/完整浏览器测试 GREEN；重建 production dist 与隔离 Tauri release，执行 native 脚本；运行 client:check，保留任何既有失败原件。`npm run verify` 的本机最终出口仍受其他任务固定端口占用影响，CI verify正在运行。
- [x] 更新 Desktop/Web 版本、功能卡/账本/PROGRESS/PROJECT_STATE/HANDOFF；候选已提交并建草稿PR，独立上下文已审查源代码与原生证据；补充标准1423证据文档后需对新head短补审。

## 边界与恢复

- 不变更主线、不覆盖用户数据/快捷方式或其他任务进程，不自动发布/合并。
- 共享前端改动影响 desktop,web；沿用 npm run version:bump -- --platform desktop,web。
- 回滚只需撤销本任务产品/配置提交，数据格式未改。复验筛选、折叠、菜单、图片上传与取消/外部拖放，不增加新依赖。

## 验证中的技术更正

- 原 section 空白测试实际投在空文件夹内容内；新契约要求该位置收纳为子项。改用两个文件夹之间的真实 section 间隙，并增加 elementFromPoint 命中断言，保留自动建文件夹的原验收。
- native 捕获监听使用 capture，保留文件夹 stopPropagation；系统鼠标处理 DPI/前台窗口，并在 DOM 已确认 mouse-up 后恢复光标。WebView2 未稳定发送 dragend，不用它代替真实 dragover/drop 与项目移动断言。
- 首轮全套误设备用 1473 触发项目固定 1423 的地址/CORS 门禁；第二轮标准 1423 浏览器完成，但 development 因本任务残留 1421 进程退出。两次失败日志保留，关闭自有进程后复验；字体 403 按依赖准备根因恢复，严格 console 断言保持有效。
