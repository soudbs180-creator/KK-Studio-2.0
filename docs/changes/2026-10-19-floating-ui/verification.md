# Verification：圆润控件与悬浮导航

- Task ID：TASK-UI-FLOATING-20261019
- 状态：REVIEW / NOT_VERIFIED（本机完整门禁通过；提交SHA独审、Hosted及用户接受分别记录）
- Base：4610c3339db436147006171aec08aad4cfdfb679
- Branch：fix/TASK-UI-FLOATING-20261019
- Worktree：D:/kk-studio/.worktrees/TASK-UI-FLOATING-20261019
- 工程外证据：D:/kk-studio/output/ui-floating-20261019

## 当前追加：存储提示可关闭（89da7190之后）

用户截图中的大提示没有关闭入口，已补组件内收起/展开按钮；不修改useCreationStorage、storage或snapshotCodec。`storage-notice-red.log` 在390短屏及1920因缺少关闭按钮RED；`storage-notice-green.log` 的17项相关浏览器检查在workers1/retries0全部PASS，覆盖read_error/read_only/write_error/conflict、关闭保持焦点、紧凑入口命中、草稿实际下载、只读输入保持禁用、无额外读写、原始快照不变与刷新重新展开。

当前1421实际已有读取失败的页面，经UI点击关闭后大提示已收起，保留157.25×45.33紧凑“读取保护 · 查看详情”入口，中心命中正确；未点击重读/保存/下载，也未读取或清空真实用户快照。实际失败原因仍UNKNOWN，不能把本次UI修复说成原数据恢复。新状态/消息/恢复草稿变化重新展开，收起状态不持久化。

最终追加证据保存在 `storage-notice/final/`，旧89da7190收据保持历史含义。首轮追加完整verify exit0但code-health提示主组件复杂度28；将原说明/操作块移到同文件无状态Fragment组件后，条件、DOM、回调与顺序均不变，重新冻结并完整验证：

- `final/verify.log` 完整 `npm run verify` exit0：根1952通过/20skip、Agent204通过/2skip、产品Edge845通过/0失败/0retry/flaky/skip、DESIGN41单元+8浏览器、lint/typecheck、UI/格式/生产build和development四插件步骤全部通过；code-health 0 blocking、footguns 0 findings。既有25条孤立token及历史版本advisory仍保留。
- 产品浏览器run `5e4d2cf3-f60c-4f40-8760-604ba427e12b`，845测试/845次尝试；1423生产preview。1245个源码/测试/配置输入与 `final/frozen-inputs.json` 全等。运行时sourceHead为89da7190加本次冻结增量，不冒称干净新HEAD；实际提交绑定在工程外最终回执。
- 官方Desktop launcher重建35.38秒，Native实际production `http://tauri.localhost/`、2.1.43、`index-wMdLqvIz.js` / `index-C0PuBcHH.css`，EXE SHA256 `95ef9417a8c470581ac42c1398dbb72602c57d13456bab45742ffb549c61fce0`，receipt输入 `846cd10ca7a12cea6d01c2d2651a4d592eefd184db4a2edffb5a0b034c0097e8`，errors/brokenImages为空。1280×900是真实Native；390宽是CDP共享CSS仿真（Native minWidth1280），不替代实体设备。Native使用隔离资料，未注入真实读取故障；故障关闭路径由浏览器/IPC合成场景及已有1421故障页面验证。
- 已按PID74580、完整EXE路径及隔离data-dir核对后停止自有Native，未停止用户安装客户端。最终短屏收起图为工程外 `screenshots/storage-notice-collapsed-final-390.png`。

最终SHA独审、Delivery、PR80当前HEAD的Hosted及用户视觉接受另记工程外回执；保持草稿PR，不合并发布。真实读取失败原因仍UNKNOWN，本次只修提示关闭体验。

## 先前UI候选89da7190（历史保留）

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
