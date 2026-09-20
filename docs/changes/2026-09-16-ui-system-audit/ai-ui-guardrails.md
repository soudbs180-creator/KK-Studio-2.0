# AI UI Guardrails

这些规则用于约束后续 AI 生成、修改和审阅 UI 的行为。它们是工程护栏，不替代当前 Figma 对具体节点的视觉定义。

## 生成前

1. 先说明新 UI 所属 IA 层级、页面、对象和主要任务；如果不能说清楚，就不生成新的导航或工具栏入口。
2. 先搜索现有 primitive、semantic token、Figma 导出资源和相邻页面，再决定复用、扩展还是新增。
3. 新组件必须声明尺寸、内容增长、响应式、状态、可访问名称和 Prototype/offline 边界。
4. 如果是 Figma 对齐，使用当前 node 的 design context 和同状态浏览器证据；失效 node 不得用缓存截图代替。

## 生成中

1. 禁止新增未登记的颜色、字号、圆角和间距字面量；有 Figma 小数值时必须在 CSS 注释中写节点 ID 和保留原因。
2. 禁止为动态文本新增固定宽度。必须选择 Hug、Fill、Min、Max、Wrap、Scroll 或 Truncate，并在代码中体现。
3. Button、IconButton、Capsule、Badge 的语义分离：状态或筛选不能伪装成提交按钮，badge 不能成为长文本容器。
4. 图标只使用 `UiIcon` 或项目 Figma 导出资源；保持 14/16/20/26 slot，使用 `aria-label` 或可见文本补足语义。
5. 每个交互控件根据适用性覆盖 default、hover、active、selected、disabled、focus、loading、success、error、cancel、offline；没有真实行为时必须显示禁用原因。
6. 所有新 flex 子项默认考虑 `min-width:0`；动作区不被动态文字挤压；交互控件不能通过祖先 `overflow:hidden` 被裁掉。
7. 新页面不复制一套颜色或按钮样式；必须消费现有 semantic tokens 和 primitive contract。
8. 不伪造账号、积分、任务、生成、保存、连接成功或服务器持久化。没有服务时保留 `Prototype`/本地演示/未上传等说明。

## 生成后

1. 运行 390、768、1440、1920 的同状态截图；至少检查默认、打开菜单、选中、禁用、错误或离线中的适用状态。
2. 采集 DOM、`getBoundingClientRect()`、`getComputedStyle()`、可访问名称和键盘路径；截图不能单独作为几何证据。
3. 对 dynamic text 做压力样例：长 provider、长模型名、中文状态、错误文本、空态和批量数量。
4. 检查主操作是否仍直接可见，低频操作是否进入 More/context/settings，移动端是否有明确替代路径。
5. Web 与 Tauri release 分别确认 route、entry、mode、加载的 dist/release 产物；源码改变后不得用旧产物宣称完成。
6. 更新 `ui:check`、相关测试和 `docs/PROGRESS.md` 的实际证据；如果只有静态检查通过，报告必须明确写成“静态底线通过”。

## 建议补充到 `ui:check` 的规则

- canonical type、spacing、radius 的新值检测，允许带 Figma node 注释的例外；
- fixed width/height 及 `overflow:hidden` 对交互子项的检测；
- Button/Capsule/Badge 的组件和 class 语义检查；
- direct icon imports 的多行/别名形式检查；
- `aria-label`、`aria-expanded`、`aria-pressed`、focus-visible 与 disabled reason 检查；
- source-to-Figma mapping 和当前 evidence manifest 检查；
- 同状态 Playwright geometry snapshot，而不是只检查构建是否成功。

