# Verification：桌面单排标题栏

## 当前组合验收（PR40）

本轮用户授权合并已完成检查的分支。PR38 最终 a550f31 经独立审查与当前 Hosted 全 SUCCESS，普通 squash 合入 main@2cb73d237927afd68ea492394a76f1beac468369，完整 landing tree 等于候选。PR38 合并后 main37797150560 verify/deploy-linux SUCCESS，delivery 按 main push 条件 skipped；实际收据已归档。 root 在登记 task tree 单一写入，保留两侧历史记录并按最新主线只递增 Desktop：Desktop2.1.10 / Web2.1.10 / Mobile规划2.1.1。

精确产品 head 86e712f2c6b94e24267e3468ee667c8e91feb2d3；真实组件 7 条乱序/旧错误/卸载/异步清理回归先在旧 8d 全 FAIL，最小修复后全 PASS。初始化、resize、按钮使用共享最新序号，操作开始即失效旧读；生命周期与操作锁阻止卸载后读/写或重复操作。SDK 清理函数实际 Promise 和同步异常均被捕获，固定不含错误载荷的内部诊断保留失败事实。旧独立审查没有覆盖这些故障条件，以当前独立复验 CLOSED 001/002 为准。

完整 npm run verify PASS：root733/741（原skip8）、Agent172/174（原skip2）、431/431browser、431attempts、12实际workers、0flaky/0实际retry/0skip。lint/typecheck/UI/format/build/版本/功能/治理/链接通过；Rustfmt、97/97 Rust、clientcheck、fresh带Agent no-bundle release通过。既有5项Rust dead-code与Vite大chunk提示保留，不关闭门禁。

真实 Windows titlebar：decorations=false，1920×40，名称/菜单/控制中心线y20，控制组120×40；OS拖动80/60，菜单/Escape回焦、按钮及双击最大化/还原、最小化/恢复、关闭进程退出0通过。UI13（389源码hash）、TaskHost11（9源码hash/5启动）、模型能力和首屏回归全部PASS，errors=[]，UI/临时凭据cleanup=true。全部同EXE SHA256 2e69e746de0efbb18c1923ceeeafebf600006e93bb98b7acb37f38ea38b11a5f，JS index-CZNs9Itz.js / CSS index-DB0YxkTv.css。4份生成schema JSON与committed相同，未丢弃语义更改。

运行链 index.html → src/main.tsx → App → TopBar → WindowControls；route /，Desktop http://tauri.localhost/，production / src/main.tsx。App完整主线文本仅增最后desktop-titlebar.css import，保留image-selection.css在前；其他 Launch/UI011/T5语句全部等同主线。原生首页无隐藏Canvas/Conversation，按需设置/焦点/Escape正常。HomeReady387ms仅为当前隔离profile/CDP观测，不与历史性能同比。TaskHost runtimeVersion/hostElevated实际均not-recorded，不推断High IL。

Web production preview实际命令 node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort；development实际命令 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort。两态390/1099/1920真实DOM/PNG零溢出、零pageerror，Web无桌面控制，入口833749bytes。开发态style href=null时另记录data-vite-dev-id，标题栏40/48/40px是既有Web响应规则，Desktop始终40px。未复用其他任务服务或改strictPort。

独立 continuation_review 对精确base/head补审PASS，001/002 CLOSED，无新验收阻断。103项上游账本逐项完整保留，只本task由REVIEW变DONE，当前104项DONE61/TODO13/PARTIAL26/BLOCKED4；34项feature保留，FEAT023仍PARTIAL，只增加本task/code/test/evidence关联。未改变权限范围、存储身份、真实用户数据或付费Provider。

[完整浏览器报告](evidence/main-integration-86e712f/browser-results-86e712f.json)、[零retry摘要](evidence/main-integration-86e712f/browser-summary-86e712f.json)、[同产物身份](evidence/main-integration-86e712f/native-identity-86e712f.json)、[原生标题栏](evidence/main-integration-86e712f/native-titlebar/receipt.json)、[上方操作栏](evidence/main-integration-86e712f/native-ui/receipt.json)、[TaskHost](evidence/main-integration-86e712f/native-taskhost/receipt.json)、[独立报告](evidence/main-integration-86e712f/review-86e712f.md)。14份原始日志以lossless base64/SHA/字节数保留，RED归属旧source，未改绑为新source；PNG/JSON保留原字节和来源清单。

本地scope完成；随后只补文档。最终doc head独立补审/当前 Hosted verify+delivery、普通squash、完整landing tree和合并后main CI必须实际回读[PR40](https://github.com/soudbs180-creator/KK-Studio-2.0/pull/40)，本提交不预填。UI012/蒙版仍在其他在途执行者维护，未经当前组合验收不抢合；被快捷方式引用的Launch树/旧分支/用户程序保留。macOS/Linux、真实Provider/GPU、Mobile、签名安装/干净系统、最终用户/Figma及正式发布仍沿用开放任务。

## 以下为旧版本历史证据

- Task ID：TASK-UI-013；以下 FINAL 结果仅为旧版本历史，不能代替上述当前组合验收；2026-10-08，Asia/Shanghai。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Review](review.md)。
- Base：1af0357b088df79dc51e9b309ef310a500722cf8；独立工作树与分支见 plan。
- 本地 AC-1/2/3 PASS。独立 review 与最终提交身份见 [review](review.md)；合并、安装器和正式发布没有执行。
- 本地证据保存在本工作树 `.tmp/titlebar/` 的独立 run 目录；旧证据不覆盖。
- runtime import：`index.html → src/main.tsx → App.tsx → TopBar.tsx → WindowControls.tsx`；route `/`，TopBar 属于所有页面共用外壳。
- 启动链：Vite development 1421 / production preview 1423 / Tauri production `http://tauri.localhost/` 分别取证。Mobile 原生产物不适用。

## 实际结果

| 检查                               | 结果                                                                                           | 本工作树日志/证据                                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 独立 npm ci；基线 typecheck/ESLint | PASS，未借用其他工作树依赖                                                                     | `.tmp/titlebar/dependency-install.log`、`baseline-typecheck.log`、`baseline-eslint.log`                                                                            |
| 旧 release 真窗口 RED              | FAIL，`is_decorated=true`，按预期暴露两排                                                      | `.tmp/titlebar/red-desktop.log`；旧 EXE 的时间是 2026-10-01，不能代表当前 main 的其他功能                                                                          |
| 首轮 verify                        | FAIL，新增账本结果值不符合枚举                                                                 | `.tmp/titlebar/verify.log`；修正为 `NOT_VERIFIED`，保留首次日志                                                                                                    |
| 第二轮 verify                      | FAIL，3 项 desktop-agent 用例暴露桥接初始化异常导致设置入口消失                                | `.tmp/titlebar/verify-second.log`；失败 browser 结果另存 `.tmp/titlebar/verify-second-browser/`                                                                    |
| 初始化修正后定向浏览器             | PASS，8/8，零 retry                                                                            | `.tmp/titlebar/targeted-browser.log`；没有修改或放宽原测试                                                                                                         |
| 完整 npm run verify                | PASS：723/731 root（原 skip 8），172/174 Agent（原 skip 2），411/411 browser；零失败、零 flaky | `.tmp/titlebar/verify-third.log`；lint、typecheck、UI、format、production build 均通过                                                                             |
| npm run client:check               | PASS                                                                                           | `.tmp/titlebar/client-check.log`                                                                                                                                   |
| Tauri release 构建                 | PASS；本树生成新 EXE                                                                           | `.tmp/titlebar/desktop-build-second.log`；测试 override 仅将 beforeBuildCommand 设为 `node --version`，复用刚由完整 verify 构建的 fresh dist，避免并行改写前端产物 |
| 首次本地测试 override              | FAIL，Windows shell 对带引号的 node -e 分词失败                                                | `.tmp/titlebar/desktop-build.log`；只修正临时测试命令，正式构建脚本不改                                                                                            |
| 真窗口回归                         | PASS；再次加入真实 data root 断言后复跑 PASS                                                   | `.tmp/titlebar/green-desktop.log`、`green-desktop-second.log`；[原生收据](evidence/native-receipt.json)                                                            |
| Vite development 三断点            | PASS，390/1099/1920，无溢出、无 pageerror                                                      | `.tmp/titlebar/development.log`；[开发态收据](evidence/development-receipt.json)                                                                                   |

## 运行态与验收

- Desktop：运行本树 `src-tauri/target/release/kk-studio.exe --data-dir <独立测试目录>`，独立 WebView profile / CDP 9363；真实 `get_storage_root` 与指定目录相同。没有使用真实用户项目或凭据。
- route `/`；`data-runtime-mode=production`、`data-runtime-entry=src/main.tsx`；JS `index-DNpbFtYK.js`，CSS `index-CsTE5i3I.css`。EXE SHA256 `1b153f93ca49de59b56a635923576d69117a963befca9d28d5ee11ada458c6e8`；[源码/产物指纹](evidence/source-hashes.json)。
- AC-1：原生 decorations=false，TopBar 1920×40；品牌/菜单/控制中心线均 y=20，右侧控制 120×40。截图：[单排标题栏](evidence/titlebar.png)。
- AC-2：文件菜单能打开、Escape 关闭回焦；实际 OS 鼠标拖动从 `(0,0)` 移至 `(80,60)`；按钮与 drag region 双击最大化/还原通过，resize 后标签同步；最小化 native 状态=true，恢复后=false，关闭后进程退出码 0；`is_resizable=true`。失败初始化保留设置入口由既有 3 项 desktop-agent 断言覆盖。
- AC-3：production preview `http://127.0.0.1:1423/` 411 项通过，其中新增 390/1099/1920 三项导航回归；development 实际启动 `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort`，入口 `/src/main.tsx`，三档 DOM/CSS 顺序在开发态收据。
- `App.tsx` 在所有页面 CSS 末端加载 desktop-titlebar.css；computed height=40px、颜色/文字/图标消费语义 token。当前用户截图决定合排；窗口控制属于工程补充，未声称重新验收 Figma 所有页面。
- Desktop 2.1.6→2.1.7，Web 2.1.7 保持、Mobile 规划 2.1.1 保持；全部新增行为由 isTauri / desktop-titlebar 限定。
- 当前原生证据是 Windows core release 的标题栏，未打包 Agent resources 或安装器；macOS/Linux 原生与正式发布不在本地验收结论内。既有 Rust dead-code、Vite chunk 和 npm install-scripts 提示保留，不通过关闭门禁消除它们。
