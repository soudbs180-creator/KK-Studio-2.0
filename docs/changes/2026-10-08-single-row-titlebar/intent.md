# Intent：桌面单排标题栏

- Task ID：TASK-UI-013；状态 READY；日期 2026-10-08。
- 授权：用户指出「这个应该在一排的，现在被分层了两排需要重新调整一下」，并提供 KK Studio 与 MiniMax Design 截图。
- 目标：桌面应用名、现有菜单、窗口控制共用一排；窗口操作仍可用。
- 范围：TopBar、桌面窗口控制、Tauri 配置及必要回归。保留 Web 导航、用户数据和现有菜单行为。
- FACT：main@1af0357b 的 Tauri 开启 decorations，TopBar 单独显示 40px 菜单栏。
- 技术决策：复用 TopBar 与既有语义 tokens，关闭原生重复标题栏；此局部修复不需 ADR。
- 关联：[spec](spec.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)、[账本](../../governance/task-ledger.json)。

| AC   | 可观察结果                                     | 验证                                    |
| ---- | ---------------------------------------------- | --------------------------------------- |
| AC-1 | 桌面顶部只有一排，名称、菜单和控制垂直居中     | 新构建 Tauri 的 decorations 与 DOM/截图 |
| AC-2 | 菜单、拖动、双击最大化、最小化、还原、关闭正常 | 隔离数据目录的真实窗口回归              |
| AC-3 | Web 三档导航保持现有行为                       | 390/1099/1920 浏览器回归与完整 verify   |

没有待用户决定的产品歧义。源码候选、合并和正式发布分别记录；当前请求未要求发布或合并。
