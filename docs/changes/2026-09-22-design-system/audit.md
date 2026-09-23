# Design System 逐页审计

输入：用户的 Ardot `728457371665311 / 0:1` 和本地 `Design System 设计系统.pdf`，7页，2,484,253 bytes。SHA-256 `4e2030d9fc9db536a9ea3d4729d51f137b6b9ad07d9b9d159d14066e5b0a4e6a`。2026-09-22逐页渲染检查；PDF文字为向量轮廓，不能把空文本提取结果当成无内容。页序实际为封面、组件、颜色、字体、间距、强调色、组件源预览。

结论：可沿用设计语言，但 **v1.0不能原样作为已验证标准**。下列勘误定义v1.1，工程补充不冒认原Ardot已存在。

| ID | 证据 | 问题及影响 | 校正 |
| --- | --- | --- | --- |
| DS-01 P2 | P6 8色Aa示例 | Blue/Green/Pink/Orange/Purple白字仅3.866/3.103/2.900/2.503/4.234，普通字号未到4.5；说明只给White深字例外，但Yellow图示本身也用深字 | 保留8个品牌底色；除默认蓝紫外均用#0A0A0A前景；命名on-accent不再等于反白 |
| DS-02 P2 | P6 default hover #756FFF | 白字对比3.836；全局CSS hover还加brightness，进一步改变配对 | 默认hover改#5B52ED；删除全局brightness；每个预设独立hover及双主题文字/焦点 |
| DS-03 P2 | P2/P7 PRO badge、P2 Active/Selected、Delete | 白字在#79CDA8约1.890，在#B3ADFF约2.031，在#EF6D6D约2.967 | 状态填充和前景独立；soft用深字；危险填充用#B4233C+白字；实际审批/用户消息等填充消费点一起修正 |
| DS-04 P2 | P3 text-tertiary；P2 Input | Dark#707070在#1F1F1F输入底仅3.328；Light#909090在#E9E9E9仅2.630。辅助文字/placeholder仍需可读 | 暗tertiary#9E9E9E、亮#636363；secondary同时校正，覆盖bg-soft及neutral-selected；正常状态文字采用4.5阈值 |
| DS-05 P2 | P2 Card文字与注释，P3独立bg-card说明，P7源预览 | 卡片一处写bg-card另一处写bg-surface；不是可以同时满足的单一实例定义 | 卡片bg-card，面板surface；保留两个独立语义 |
| DS-06 P2 | P2 Button/Input/Select，实际global/settings.css | “样式1:1来自代码”不成立：primary原代码中性底/r8/padding10，Input h38/r7，Select h20/r6 | 统一主按钮h32/r10+强调色、字段h32/r10/bg-input、选择compact32；保留具名页面专项尺寸 |
| DS-07 P2 | P5 Control用途包括Switch；P2Switch pill；P5弹窗统一menu | 开关圆角与规则冲突；菜单与模态面板混同 | switch用pill；menu12、modal panel20；补24px开关目标与可访问边界 |
| DS-08 P2 | P6 “设置页更换后全局生效”；实际settings schema/GeneralSettings/App | 代码没有accent字段/选择/全局应用，8色仅是设计承诺 | 添加8选项、沿用事件/保存、v1兼容；真实运行验证单独记录 |
| DS-09 P3 | P1/P3/P4 | 封面15色系与正文18角色、封面7字阶与正文5级不一致；“全4倍数间距”不覆盖既有按钮6/10专项值 | 正文5级为准；按语义表列出角色与别名，不用固定色值数量宣传；专项值明确记录 |
| DS-10 UNKNOWN | P2 IconButton、Toolbar、Modal close图示 | PDF例子缺可识别图标。无法凭PDF判断在线源缺图标，还是导出缺失；也无法证明“全为组件实例” | 校正版示例和规范补真实图标/aria-label；在线图层/变量/实例回读仍未验证 |

颜色算法采用sRGB相对亮度，未四舍五入前判断4.5/3门槛。普通文字、placeholder和hover适用4.5；禁用、装饰不误判。来源：[WCAG文字](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[必要非文字图形](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。全产品合规仍需完整可访问性审计。

保留：8个品牌底色；Dark主要中性背景；Inter与中文回退；正文5级字阶；6档间距；5档圆角；已有页面布局/图标资产/业务行为。新增：配对前景、可读hover与主题文字、独立状态填充、control边界、真实偏好通道、自动颜色与浏览器检查。

## 实现复核追加

- DS-R1：资产底部的历史按钮CSS覆盖共享前景和尺寸，导致8色切换后的hover失配。移除旧覆盖，创建/导入分别消费共享primary/ui-button；原创建/导入/busy回调保持。
- DS-R2：设置通用按钮hover/active覆盖插件危险操作；排除danger并移除插件局部调色规则。危险含义不随强调色变化。
- DS-R3：实际浏览器截图中插件导航显示破图，原因是`settings-nav-plugins.svg`不存在。改为复用UiIcon的plug图标；浏览器检查现有导航img均成功加载。此项是产品源的已证实缺陷，不将PDF图标导出不确定性混为同一结论。
