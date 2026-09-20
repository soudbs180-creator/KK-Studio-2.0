# 前端规范、画布操作与示范结果实施计划

> 使用 superpowers:executing-plans 串行实施，保留全部未提交工作；每项落盘实际证据再继续。

**Goal:** 稳定可复用的前端视觉和交互规则，以四类真实示范资源验证画布完整操作。
**Architecture:** 沿用 React 组件及当前会话状态；从 Canvas 提取连接层、节点操作层、示范结果组件，使用共用令牌、图标映射和菜单。跨边界示范清单以 Zod 校验。
**Tech Stack:** React 18 / TypeScript strict / Vite / npm / Node 24 / Playwright Edge。
**Spec:** ../specs/2026-09-07-frontend-standards-design.md。

## 1. 可复用标准与素材

- [x] 盘点现有色彩、图标与动效，读取对应设计缓存；制定 docs/UI-STANDARDS.md 并链接到 AGENTS/UI-ALIGNMENT（2026-09-07 Doubao 交付，来源与实施边界见文档）。
- [x] 统一本批新增界面的语义令牌和 UiIcon；保留 Figma 导出资源，仅补充缺失 Iconsax 线性资源，保存来源和许可。
- [x] 准备真实图片、短视频、音频、文案示范文件及清单；标明各自产生方式，验证本地可播放。

## 2. 跟随加号与可删除连接

Files: core/canvasGraph.ts、components/canvas/CanvasConnections.tsx、NodeActions.tsx、useCanvasControls.ts、Canvas.tsx、styles/canvas-actions.css。
- [x] 先添加节点坐标、连接删除/撤销、菜单焦点的行为测试，记录基线失败。
- [x] 保留初始连接几何，改用带 id 的连接集合；删除和撤销只修改连接，节点移除同步去除悬空连接。
- [x] 右侧加号以节点坐标定位，共享类型菜单新增相邻下游节点，支持拖动、键盘移动、缩放跟随和窄屏触达。
- [x] 定向验证、截图/录像、自审、PROGRESS 记录实际结果。

## 3. 多模态示范结果

Files: core/demoMedia.ts、components/nodes/DemoResultNode.tsx、DemoMediaPreview.tsx、components/canvas/DemoLibrary.tsx、Canvas.tsx、CanvasToolbar.tsx、core/canvasItems.ts、styles/demo-results.css。
- [x] 添加四类示范、编辑/下载、媒体加载错误/恢复、预览关闭回焦和取消的测试，记录失败；复制入口保留权限失败回退，系统跨应用粘贴尚未单独验收。
- [x] 显式加载示范并保留当前卡片；结果媒体真实可播放，文案可编辑；显示示范来源，清晰区分 API 未连接。
- [x] 统一结果卡片操作并接入搜索/收藏/小地图，删除节点清理连接，不删除用户磁盘文件。
- [x] 四视口、快速切换、键盘、reduced-motion 检查，结果写入 PROGRESS。

## 4. 收口

- [x] 本批新增字体、颜色、图标语义一致性检查，遗留用法保留具体基线；所有新控件无空事件。
- [x] Node 24 执行一次最终 npm run verify，真实 Edge 截图与动效录像，记录剩余差异和外部阻塞。
- [x] 更新自动化提示包含新授权范围，保留当前任务和频率，不重复创建任务。
