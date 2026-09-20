# Spec

- ID：TASK-UI-MAIN-001
- Source of truth：当前 origin/main + AGENTS.md + UI-ALIGNMENT/UI-STANDARDS/UI_SPEC；当前 Figma 设计上下文与生产页面 DOM。
- 入口：App.tsx 的 active=landing/projects/skills/comfyui/workspace；modal=settings/search/favorites/assets/shortcuts/tasks/help；URL 都是 `/`，不是虚构 URL 路由。
- 导入链：main.tsx → App.tsx → StartPage/LibraryPage/Canvas/ConversationPanel；Modal → SettingsPanel/CatalogPanel/AssetPanel/ShortcutsPanel/TaskWorkbench/InfoPanel。global.css/ui-tokens.css 定义主题，App.tsx 管理页面 CSS，实际 sheet 链见 runtime JSON。

| 页面 | 现行节点 | 框架验收 |
| --- | --- | --- |
| Workspace / 收纳 | 404:28667 / 410:67357 | 1920×1080，侧栏291/70，内容x291/70、y45；工作台子控件沿用已有已测量契约 |
| 会话 | 407:29265 | 470×998；composer426×170；菜单不改变控件坐标 |
| 设置通用 | 399:27506 | 920×700；内容相对起点364,38；侧栏263宽、53行距；系统托盘→防止休眠→自启动 |
| 搜索/收藏 | 388:938 / 398:25274 | 900×696、80圆角、58高搜索栏 |
| 资产展开 | 392:938 / 398:26864 | 900×696 |
| 资产收拢 | 398:27304 / 398:27079 | 305×696；搜索与筛选不重叠 |
| 账号弹层 | 312:2436 | 260×230；真实本地 Prototype 状态 |
| 快捷键 | 394:938 | 全局672×480；其他分类沿用既有可用性契约 |
| 帮助 | 395:938 | 560宽，12px/21.6px正文；说明与当前数据能力一致 |
| 任务弹层 | 396:938 | 196×240；页签和工作台入口不重叠 |

验收区分：尺寸、间距和语义 tokens 来自现行稿；真实草稿、示例资产、无账号与禁用系统集成不会伪造成 Figma 示例的真实服务。新增来源筛选、任务工作台入口和 Prototype 说明为工程补充。资产收拢为来源筛选增加第二行，保留设计前三项的排列。OS 字体栅格差异不作像素完全一致声明。

交互必须覆盖四种 composer 菜单互斥、重复点击、外部 pointerdown capture、Escape/IME/焦点恢复、跨弹层切换、窄屏按钮命中、设置分类滚动、资产筛选与新建主体、任务入口、模型错误脱敏。静态 checks 不替代真实运行态。
