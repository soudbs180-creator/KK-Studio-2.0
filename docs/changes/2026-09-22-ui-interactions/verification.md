# TASK-UI-006 验证记录

状态：DONE / PASS。本批12处UI交互问题已修复并回写原工程，完整验证通过；未commit/push。在线设计源与真实外部服务的既有开放事项保持独立。

## 来源与范围

- 原工程：D:/kk-studio/KK-Studio-2.0；chore/TASK-CONSOLIDATE-200；base/head cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4 + 多任务未提交候选。
- 隔离：C:/Users/Administrator/.codex/worktrees/ui-interactions/KK-Studio-2.0，fix/TASK-UI-006-interactions；基线快照1016文件。只回传review清单与本任务文档，不提交、不推送、不终止其他任务进程。
- 设计：Design System 1.1语义tokens/shared components；旧Figma Workspace404:28667/收纳410:67357提供几何。新增状态行布局、最小缩放和窄屏换行属于用户授权的工程补充。
- 运行链：src/main.tsx → App.tsx workspace分支 → Canvas → CanvasHud/TaskPanel/TaskDetail；Sidebar → SidebarProjectGroup/Entry；Modal与useDismissible为共享生命周期。
- Web：npm run build；Playwright固定http://127.0.0.1:1423/，Vite production preview。DOM、截图与报告位于本目录evidence。Desktop使用npm run client:build -- --no-bundle和node scripts/audit/check-ui-interactions-desktop.mjs，在独立data/profile启动新release并核对实际JS/CSS字节。

## 复现与实现

12处问题与根因见audit.md，包含左上角状态重叠、小缩放背景、分组名称保留、临时文件夹折叠、添加菜单重复点击/触发器Escape、Modal拖出误关、TopBar回焦、任务列表回焦/详情层级、侧栏断点菜单残留及390聊天按钮裁切。创建目录/改名为既有会话Prototype界面，不声明项目分组后端或持久归档完成。

## 验证证据

- 首轮6个问题分别RED→GREEN；41项交互专项通过，无重试。
- 全量327 Node通过，browser首次258通过/3失败；两处旧DOM选择器随保留状态容器更新但原几何阈值不变，账号菜单回归修正。19项对应回归无重试通过。
- 四宽度390/768/1280/1920，双主题与8强调色，最低20% dots/grid、长名称合成布局压力、真实聊天开关/焦点、外点/重复点击/Escape/嵌套弹层均在最终矩阵复验。
- 新测试不改变已有Provider/CLI/云服务能力。长名称DOM文本是明确的布局fixture；不当作真实生成结果。Tauri验证使用独立目录，用户数据不参与。

## 剩余边界

在线Ardot变量/组件写入与回读、缺失页面Frame及用户视觉验收仍开放。真实CLI/Provider/GPU/MCP、TaskHost完整恢复、ComfyUI/TTS/平台服务接线与安装发布不由本批UI证据代替。UI005的已完成新功能接线继续保留。

## 最终原工程验收

| 检查 | 结果 |
| --- | --- |
| npm run verify | 327 Node、261 Playwright/Edge；0失败、0flaky、0skipped；与候选树完整结果一致 |
| lint / typecheck / format:check / ui:check / build | PASS；UI144文件/0违规，52任务/29功能/0违规 |
| 独立源码预检 | 23文件manifest f9d3745736a7c100fcbc68e479980ffd6e98194b6e8fe604392b3460491b6174；R1关闭，PASS；dirty-diff预检不冒认为正式提交审批 |
| npm run client:build -- --no-bundle | PASS；新Tauri release，保留既有Rust未使用函数警告 |
| node scripts/audit/check-ui-interactions-desktop.mjs | PASS；16主题/强调色组合、实际tauri.localhost production资源与dist字节校验、任务/添加/工具/缩放/小地图开关及回焦、任务子层Escape、折叠名称、Modal拖出、聊天开关 |

最终日志在evidence/logs，完整浏览器报告evidence/web-full-results.json，最终截图evidence/web-accepted与evidence/desktop。RED与中间阶段保留，不替代最终结果。Native仅启动并关闭本任务拥有的进程，data-dir与WebView2 profile均为临时隔离目录；未接管用户窗口、真实Agent或开发服务。

现有start-kk-studio.bat仍由freshness launcher核对源文件后启动target/release/kk-studio.exe。测试改动的旧docs/evidence、历史text截图和Tauri schemas已恢复到本次运行前字节；本批证据在独立change目录。代码和实际资源指纹见source-manifest.json及evidence/desktop/runtime.json。
