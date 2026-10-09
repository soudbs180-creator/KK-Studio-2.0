# Spec：修复侧栏项目拖拽

- Task ID：TASK-UI-015；状态：READY；[intent](intent.md)、[plan](plan.md)。
- 基线：80904759，遵循 [UI_INDEX](../../UI_INDEX.md) 与 [UI_RULES](../../UI_RULES.md)。入口：main.tsx → App.tsx → Sidebar.tsx → SidebarProjectGroups → Header/Sections → FolderGroup/Entry。
- 项目标题作为始终存在的投放目标，使用已有 application/x-kk-project-id 数据；投放调用 dropToSection，按真实项目名称创建文件夹并展开。已有文件夹内投放调用 dropProject，阻止冒泡导致额外文件夹。
- 只接收侧栏项目 MIME；文件、外部文本不成为项目。编辑中的项目不拖动；拖拽取消不修改数据。名称、ID、缩略图取现有快照，不由拖拽字符串重建项目。
- Desktop 关闭 Tauri 的原生拖放接管，让 Windows WebView2 提供现有 HTML5 DnD；Web 使用同一侧栏目标。Mobile 仍是规划元数据，不声称原生触屏能力。
- 保留折叠、筛选、改名、置顶、菜单及现有图片上传。文件夹仍为会话态 Prototype，刷新/重启不新增持久化承诺；无 schema/API/权限或 ADR 变化。
- 验收：浏览器分别覆盖空组标题、文件夹标题、文件夹内容、取消/无关拖放；fresh Tauri release 使用隔离数据根与实际鼠标拖拽取 DOM/截图证据。两端源码版本按共享前端修复递增。
