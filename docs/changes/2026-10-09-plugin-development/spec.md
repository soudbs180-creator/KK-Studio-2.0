# Spec：开发模式同源插件模块

- Task：TASK-PLUGIN-DEV-001；既有 FEAT-013 / public/plugins/index.json / pluginLoader 为来源。
- 进入同源随包分支后，浏览器模块地址解析为当前页面的绝对 URL，缓存戳保留；Node注入无 location 时保留现有测试契约。安装/远程源码分支、持久化URL/source/enabled/local和数据身份不变。
- Desktop/Web 同源 native ESM；Mobile无原生产物，不以窄屏验收替代真机。共享前端运行改变应按最新已合主线递增 Desktop/Web 补丁，Mobile规划保持。
- AC1：fresh development 127.0.0.1:1421，四插件发现/添加/渲染，无Vite遮罩或插件加载错误；实际页面mode/entry与模块响应可回读。
- AC2：MCP插件管理可停用/重新启用，reload保留停用状态，HTTP不安全远程地址在发请求前拒绝。
- AC3：production preview 和fresh Tauri release 同功能通过；CSP仍 self，不增加blob/eval；现有单元及完整verify/构建通过。
- AC4：开发回归成为CI自动门禁；未启动/端口占用、页面错误和模块HTTP失败一律实际失败，不换端口或收起遮罩换取通过。
- 保持已有失败/离线store原件保护；本次不扩大插件初始化/持久化架构，不承诺真实远程Desktop插件。
- 参考：[Vite public assets](https://vite.dev/guide/assets.html#the-public-directory)；实际行为以锁定安装版本 source 和当前运行证据为准。

## 开发运行中追加的真实缺陷

URL修复后四插件响应200并可创建，但HTML节点触发React静态children缺少key警告。SDK把jsxs静态兄弟与jsx动态列表统一为props数组，遗漏React.createElement的静态参数语义。修复只让静态兄弟以位置参数传递，动态数组继续保留键校验；jsxDEV接收编译器static标记。源码与生成插件须重建并在真实DOM继续零console error验收。
