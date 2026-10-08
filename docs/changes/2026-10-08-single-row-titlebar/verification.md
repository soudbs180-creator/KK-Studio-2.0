# Verification：桌面单排标题栏

- Task ID：TASK-UI-013；当前组合 NOT VERIFIED；下列 FINAL 结果仅为旧版本历史；2026-10-08，Asia/Shanghai。
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
