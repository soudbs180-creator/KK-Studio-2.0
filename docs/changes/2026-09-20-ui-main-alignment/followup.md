# Follow-up: narrow sidebar dismissal and test I/O budget

原 PR #3/#5 已合并；本补充从 main@a1d8629 建立独立任务分支。

## 复现与修复

1920宽打开账号菜单 → 改为390宽 → 聚焦侧栏toggle并按Enter展开 → 点击创建项目文件夹。修复前账号菜单仍然存在。Sidebar的窄屏关闭hook晚注册后占据共享dismissible栈顶，拦截菜单外部关闭。现仅在没有账号/排序菜单时启用侧栏关闭hook，先关闭顶层菜单，再让外部点击收起侧栏；按钮功能和焦点处理保留。

补充真实序列回归；同时将重绘任务完成的timeout正确放入expect.poll选项，改为Promise.all同时监听请求和批准点击，避免等待promise未及时处理。

## 验证

完整verify的lint/typecheck/150 Node/UI119/0/format/build通过。首次浏览器回归时误并行运行client build重写dist，导致一次page.goto HTTP错误；停止写dist后重跑完整浏览器套件191/191通过，0失败、0重试。重新构建Tauri release通过。

开发1421、production preview1423、隔离Tauri release均通过composer生命周期与窄屏账号回归，报告见docs/evidence/2026-09-20-ui-main-alignment/followup/；窄屏为Playwright device metrics 390×844，未冒充物理窗口尺寸。入口仍为src/main.tsx→App.tsx→Sidebar。bundle=index-Bnq7D2jx.js，CSS未改。

原2.35MB大图重绘用例在正常环境及6倍CPU限速重复3次通过。20倍CPU限速下仍可超过15秒I/O等待，属于未关闭的PERF-001压力边界；不能写成20倍压力测试通过。保留真实原图和完整原图字节断言，没有用更小fixture或放宽业务条件掩盖失败。

本补充没有新增设计稿：UI-004仍缺Landing等独立现行Figma节点。TASK-GOV-002的PR #4保持由其独立任务处理。

独立只读审查：/root/main_integration_audit 核对本补充三文件diff，未发现高风险回归；确认第一次外部点击先关闭菜单、下一次才收起侧栏的分层行为，以及expect.poll选项位置正确。此结论不是GitHub人工approval。
