# Verification：圆润控件与悬浮导航

- Task ID：TASK-UI-FLOATING-20261019
- 状态：REVIEW / NOT_VERIFIED（本机分步验证完成；Hosted及用户接受待）
- Base：4610c3339db436147006171aec08aad4cfdfb679
- Branch：fix/TASK-UI-FLOATING-20261019
- Worktree：D:/kk-studio/.worktrees/TASK-UI-FLOATING-20261019
- 工程外证据：D:/kk-studio/output/ui-floating-20261019

已核对根/Agent/插件依赖为本任务实体目录，未复用共享可写目录。初始 typecheck/lint/build 通过。初始 unit 1950通过/20skip/2失败，均为尚未构建随包 Agent 的启动用例；随后 agent:build 成功，desktopAgentRuntime 定向3/3通过。后续完整根单元1952通过/20skip/0失败、Agent204通过/2skip/0失败。

原主仓 main1fbac26b 的 51 个浏览器失败属于上一轮另一源码基线，不混入本候选统计。

初稿失败记录完整保留：

- red-browser.log：原始四项导航/默认边框/1601技能入口 RED；随后针对性测试转绿。
- verify.log：有效 DESIGN token 源hash基线失败，四个新导航token经独立源审后只更新批准hash，原尺寸/对比度断言保留。
- build-final-ui.log：Vite编译后触发一次 Windows libuv `UV_HANDLE_CLOSING` assert；独立重复build正常，准确环境根因UNKNOWN。
- verify-2.log：初稿全局胶囊化导致30个浏览器失败、814通过。用户明确否决全局形状/高亮后，撤回全部全局规则、sidebar-settings形状变更及相应新测试，原8px/20px/焦点/点击断言未放宽。
- verify-corrected.log：841浏览器通过/2失败；失败为视频卡片喜欢按钮被画布HUD拦截。依 UI_RULES 第132行的允许遮挡/平移契约，仅复用既有 panCanvasToRevealAction 在喜欢动作前真实平移并验证 elementFromPoint；不改产品层级或强制点击，撤销、重载、收藏与标签断言完整保留。green-canvas-pan-minimal.log 在workers1/retries0下2/2通过。此helper使用中键输入，不代替手机触屏平移专项。

最终源码冻结后按顺序运行官方 Desktop launcher（隔离 native-data/native-webview）、Native UI 和完整 verify-final.log，避免构建dist与生产浏览器验证并发。早期Native检查先因辅助脚本Windows ESM绝对路径格式错误、再因9344无监听失败，均保留 native-ui-check.log/native-ui-check-2.log；native-ui-check-3.log 的通过仅对应初稿，不批准纠正后的产物。最终新收据另记，不覆盖原文件。

当前1421为本任务 `npm run dev -- --host 127.0.0.1`，Vite development，`src/main.tsx → App.tsx → StartPage/StartComposer + Sidebar/SidebarNavigation + TopBar`；实读分类tab仍0px下划线、无新增box-shadow，原分类按钮无新增高亮、模型默认边框透明，确认全局胶囊化/高亮已撤回。该已有浏览器保持读取保护，未点击重新读取/清空/迁移资料。

最终本机结果：

- `verify-final.log`：lint/typecheck、根1952通过/20skip、Agent204通过/2skip、UI/格式/生产build、产品Edge843/843（0retry/flaky/skip）、DESIGN41单元+8浏览器均通过。最后 development 步因本任务预览占1421退出，整个串行命令exit1，不能标成完整verify PASS。停止仅本任务预览后，`development-final.log` 四插件发现、编辑/渲染、禁用重载和不安全远程拒绝步骤全部PASS、exit0；不是跳过检查或改端口。所有步骤已分别通过，原聚合失败保留，Hosted当前HEAD完整verify仍待。
- 生产浏览器 run：`test-results/browser/5d2caa41-5289-4273-bc8b-429874e65d87`，URL `http://127.0.0.1:1423/`，Vite production preview，843 expected/0 unexpected/0 flaky/0 skipped，截图已归档于工程外 `screenshots/web-corrected-home-390.png`、`web-corrected-skills-1601.png`。runner在提交前执行，metadata.sourceHead为基线，不能冒称干净HEAD；1245个源码/测试/配置冻结文件hash前后一致，提交后由外部回执绑定实际新HEAD和输入hash。
- 官方 `node scripts/windows/desktop-release.mjs --data-dir D:/kk-studio/output/ui-floating-20261019/native-data` 完成重建并启动；独立profile、9344 CDP。Native实际 `http://tauri.localhost/`、production、src/main.tsx、`index-M0r1rlmW.js` / `index-zgtKVrsd.css`，EXE SHA256 `310676a34331a8888d985036436c8c0b929d4e2a5fb92867008c2dbe60983734`，receipt输入 `b1c79cfd58177c58f0527f5f66153acd1109e54bb83006ffabe6341bbc454a24`，version2.1.43，errors/brokenImages为空。见 `native-ui-runtime-corrected.json`、`native-corrected-process.json`、`native-ui-check-corrected.log`。
- Native先验证1280×900及实际版本，再用CDP390×844检查共享CSS；Tauri配置minWidth1280，因此390是视口仿真，不代替真实Native窄窗或手机设备。390底栏x16/width358/bottom832（距844底部12），四目标约84.17×54.67，SVG均可见，项目/扩展/首页实际点击通过。已按PID/路径/data-dir核对后仅停止自有隔离进程；用户安装客户端不在清理范围。
- advisory：25条既有DESIGN孤立token警告；版本警告为迁移fixture历史2.1.36与CHANGELOG旧发布头，未为此改写兼容测试或假填正式发布。code-health本任务0 blocking、footguns0 finding。

最终提交SHA独审、Delivery、远端PR/Hosted、用户视觉接受和正式交付均不由上述本机收据代填。当前保持REVIEW/NOT_VERIFIED，不清理未合入候选树。

真实付费 Provider、生产部署、安装器、实体设备和用户最终视觉验收均未执行。
