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

## P1 新任务 TASK-PLUGIN-RECOVERY-001

真实重启四插件项目后HTML插件节点不存在；normalizeCanvasItem遗漏已有CanvasCollectionItem.plugin字段。共享codec须保留完整type/version/width/height/JSON metadata（含长内容及未知JSON扩展），不改version2/存储身份/权限，不把无效字段归为空卡片。读取前验证负载、正有限尺寸、JSON metadata；嵌套秘密仍由既有rejectSecrets拒绝；原输入不变。相关加载、编辑和重启恢复是本PR统一“随包插件可用”的验收目标，新增任务与原DEV任务均需实际关闭。

## P1 新任务 TASK-PLUGIN-MARKDOWN-001

阻断esm.sh的真实DOM四插件编辑验收FAIL：Markdown标题为空并有模块加载pageerror，不能作为四插件可用。原隐式marked@14依赖改为workspace声明的精确marked14.1.4并按npm integrity锁定随包，不升级解析器主版本，不增加运行时外部权限。技术范围更正：早期“不新增依赖”指不引入替代方案；这里显式声明已有外部解析器。保持现有同步解析/缓存和React单例，CDN请求必须为零；development/production/native各自验收正文及恢复。以[官方parse契约](https://marked.js.org/using_advanced#the-parse-function)和实际锁定14.1.4类型为依据。

新增tests/support/pluginFlow.mjs共享四插件真实编辑/预览内容断言；坏snapshot测试必须检查失败后主件和backup原件。既有SVG CSP启停回归保留，新native recovery使用独立数据/profile并真实停止、重开同一fresh EXE。


## P1 TASK-DESKTOP-FLUSH-001 / PLUGIN-REVIEW-002

真实立即关闭 RED 丢失最后 SVG comment；trace 定位 closing=true 的 write_creation_snapshot IPC 请求。原生所有 CloseRequested 必须同步阻止默认关闭，等待现有耐久写队列及最新 revision 成功后才关闭；重复事件不得提前关闭。保存失败或读保护下有未保存草稿时保留窗口和原件，提供现有错误/草稿下载及重读入口。Web beforeunload 原契约保持，Native 不再在 destroy 后发起异步保存。使用已锁定 Tauri SDK 的 onCloseRequested/destroy（SDK 本身也以 destroy 完成此事件）；仅 main 窗口补相应 allow-destroy，与既有 allow-close 同范围，未增加文件、网络或系统权限。数据 schema、存储身份、CSP 不变。原坏数据 fixture 应真实验证阻止关闭，然后仅清理本次自有测试进程，不能要求带未保存草稿正常退出。
