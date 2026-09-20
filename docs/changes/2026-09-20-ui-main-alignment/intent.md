# Intent

- ID：TASK-UI-MAIN-001
- 状态：Approved；用户要求继续全页面视觉对齐、整合分支并保持本地/云端 main 一致。
- 用户问题：模型菜单展开挤动其他按钮、点击外部不关闭、目录中的修复未进入稳定主线，多个页面仍使用旧几何。
- 目标：从 origin/main 的当前功能出发，选择性整合已审查交互修复；逐一验证全部可到达页面，校正当前可读取 Figma 的差异；通过 PR 同步主线。
- 来源：Figma 0nU0A7pq6eyjwfwm1TtWkO，page 0:1，详见 spec.md。
- 边界：不引入未接通账号、云端持久化或虚假生成；不重做产品设计，不将整个 dirty checkout 覆盖主线；GPT-6 Astra 仍为计划阶段。
- 缺失设计：Landing 410:59708 在当前唯一 page 0:1 中不存在；全文件 pages 清单已复核。项目库、Skill、ComfyUI 页面和设置其他分类缺少现行独立 Frame。保留现有布局并验证交互，不编造 Figma 一致结论。
