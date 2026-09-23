# Design System 1.1 契约

1. 颜色与基础组件权威改为 `docs/DESIGN-SYSTEM.md`，源为用户的 Ardot/PDF，勘误有逐页记录。旧 Figma 页面继续提供布局/资产证据，不能覆盖新版颜色和通用组件规则。
2. 保留 8 个品牌底色。每个预设定义底色、hover、soft、soft 前景、底色前景、双主题文本与焦点色；普通文字与实际底色对比至少 4.5:1；必要边界/焦点至少 3:1。禁用控件及装饰线不套用普通文字/必要边界阈值。禁止全局 brightness 改写验证过的颜色。
3. 暗/亮背景、卡片、输入框、悬停、弱中性背景、选中背景语义独立；旧命名用 alias 兼容。状态文字与状态填充前景分开，错误/成功不能随用户强调色变化。
4. 5 个通用字阶为 11/14、12/16、14/20、16/22、24/30；根字号 13 是历史页面基准。间距 4/8/12/16/24/40；圆角 control10/menu12/panel20/card28/pill999。按钮32、输入32、选择32/40；菜单使用12、模态面板使用20，开关用pill。已有具名页面专项尺寸保留来源。
5. 复用 `.ui-button`、`.primary-button`、`SettingsControls`、`Modal`、`UiIcon` 和现有行为；补齐语义样式。IconButton 有真实图标和名称；可交互 capsule 有 pressed/selected 状态，信息 badge 无按钮语义。保留 Escape/回焦/IME/取消与原生控件行为。
6. 设置页提供带文字标签的 8 个强调色选项，走现有设置持久化与事件通道。旧 v1 设置缺少 accent 时补 default，保留原 theme/floatingLayout/removeWatermark；无存储权限仍沿用原反馈行为。不改变存储 key 或版本。
7. 对当前候选执行类型/静态检查、单测、UI 校验、新鲜 production preview、双主题及8色、键盘/回焦/重载/窄屏回归。Web 证据不代替 Tauri 或在线 Ardot 写入证据。

实现位置：`global.css` 管主题及强调色，`ui-tokens.css` 管兼容别名、尺寸与共享控件；设置 schema 和 GeneralSettings 消费8色 ID。自动对比度测试读取实际 CSS，浏览器检查最终 computed style，避免另建不被页面使用的颜色表。
