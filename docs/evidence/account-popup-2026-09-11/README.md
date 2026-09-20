# 个人信息弹窗对齐证据

来源：实时 Figma 文件 `0nU0A7pq6eyjwfwm1TtWkO` 的节点 `312:2436`，通过 `get_design_context` 读取。原稿为 260×230，深色背景 `#1f1f1f`、1px `#3c3c3c` 边框和 10px 圆角；内容顺序为账号信息、账号操作、积分/订阅、主题、版本更新。

实现：`src/main.tsx → src/App.tsx → Sidebar → AccountPopup`。样式由 `App.tsx` 在工作台和侧栏样式之后加载，以保证弹窗专用几何覆盖旧规则。账号、积分和更新仍是本地 Prototype；主题与更新入口可真实打开已有设置页，切换账号和退出登录保持禁用并说明原因。

浏览器验证：

- Development：`http://127.0.0.1:1421/`，点击“个人信息”后弹窗可见，截图已在本轮实时浏览器观察中复核。
- Production preview：`http://127.0.0.1:1423/`，从新构建 `dist` 加载，页面错误日志为空。
- CSS 设计尺寸：弹窗 `260×230`，身份区 `143×26`，账号操作区 `236×30`，积分卡 `236×57`，主题/版本行各 `236×22`。
- `tests/browser/sidebar.spec.ts`：7/7 通过；`tsc --noEmit`、Vite production build 和 UI 标准检查通过。
