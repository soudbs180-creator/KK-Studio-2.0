# KK Design System · 1.3

2026-09-22 校正版。**后续新增 UI 与现有 UI 的微调统一遵循本文件。**设计来源为用户的 [Ardot Design System](https://ardot.tencent.com/file/728457371665311?from=workbuddy&node_id=0%3A1) 及同名7页PDF；本次可读取快照的 SHA-256 为 `4e2030d9fc9db536a9ea3d4729d51f137b6b9ad07d9b9d159d14066e5b0a4e6a`。原文件保留，校正依据见 [逐页审计](changes/2026-09-22-design-system/audit.md)。在线 Ardot 同步须单独回读验证。

颜色、字体层级和基础组件以本文件为准；具体页面布局、品牌资产与专项尺寸继续使用已确认的 Figma 节点。旧 UI Markdown 中与本文件冲突的调色/通用控件规则已失效，历史运行证据保留当时含义。文档定义应有行为，源码和当前运行证据证明实现情况，不能反过来用“代码已有”证明设计正确。

## 颜色与主题

`src/styles/global.css` 是颜色唯一声明入口；`ui-tokens.css` 保留组件兼容别名与几何层级。页面消费语义 token，不能新增本地调色板。Dark 默认，Light 通过根节点 `data-theme` 切换。

| Token | Dark | Light | 使用边界 |
| --- | --- | --- | --- |
| `--bg-app` | #0A0A0A | #EDEDED | 应用底层 |
| `--bg-surface` | #161616 | #FFFFFF | 面板、侧栏、菜单 |
| `--bg-card` | #1A1A1A | #EEEEEE | 卡片，与surface独立 |
| `--bg-input` | #1F1F1F | #E9E9E9 | 输入/选择框 |
| `--bg-elevated` | #202020 | #ECECEC | 中性hover |
| `--bg-soft` | #333333 | #EAEAEA | 中性弱底、关闭轨道 |
| `--neutral-selected` | #2A2A2A | #E0E0E0 | 中性选择/导航 |
| `--border-default` | #3C3C3C | #C4C4C4 | 分组轮廓，不承担唯一识别 |
| `--border-subtle` | #292929 | #DEDEDE | 装饰分隔 |
| `--border-control` | #858585 | #777777 | 输入等必要边界，工程补充 |
| `--text-primary` | #DBDBDB | #252525 | 主文字 |
| `--text-secondary` | #AAAAAA | #595959 | 次文字，已校正对比度 |
| `--text-tertiary` | #9E9E9E | #636363 | 占位/辅助文字，仍须可读 |
| `--text-danger` | #F48181 | #AA263B | 危险文字，与品牌无关 |
| `--text-success` | #79CDA8 | #216947 | 成功文字 |
| `--text-warning` | #E6B96A | #805209 | 警告文字 |
| `--text-accent` | 随预设 | 随预设 | 链接、文字和强调图标 |
| `--focus-ring` | 随预设 | 随预设 | 2px outline，offset3px |

兼容关系：`bg-card-hover → bg-elevated`，`bg-card-soft → bg-soft`，`ui-neutral-selected → neutral-selected`，`ui-focus → focus-ring`，`ui-danger/success/warning → text-danger/success/warning`，`ui-selected → text-accent`，`text-strong → text-primary`。这些是同一语义的别名，不是额外颜色方案。带 `ui-account` / `ui-node-menu` 的旧颜色也消费共同主题。

普通文字（含输入占位、hover）与实际底色至少 **4.5:1**；必要控件边界和状态/焦点至少 **3:1**。装饰线和禁用控件不机械套用这些阈值。不要用全局 brightness、父级opacity或未经核对的透明混色破坏已验证配色。数值按未四舍五入的比值判断。[WCAG文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[非文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。这组颜色检查不等于整站WCAG认证。

## 8种强调色

设置 › 通用 › 强调色。通过现有 v1 设置保存；旧数据缺字段补 default，不重置其他偏好。`data-accent` 切换根节点变量，错误/成功/警告保持独立。

| 预设 | `bg-accent` | hover | `text-on-accent` | soft | Dark文字/焦点 | Light文字/焦点 |
| --- | --- | --- | --- | --- | --- | --- |
| 默认蓝紫 default | #635BFF | #5B52ED | #FFFFFF | #B3ADFF | #B2ADFF / #AAA3FF | #594ACC |
| 蓝 blue | #2F80ED | #4993F2 | #0A0A0A | #A8CBFF | #A8CBFF | #1458A5 |
| 绿 green | #21A673 | #39B987 | #0A0A0A | #79CDA8 | #79CDA8 | #166443 |
| 黄 yellow | #E6B96A | #F0C780 | #0A0A0A | #F5D9A9 | #E6B96A | #78510A |
| 粉 pink | #E86FA4 | #EF86B4 | #0A0A0A | #F5A3C3 | #F5A3C3 | #A12659 |
| 橙 orange | #EE8B3A | #F5A05B | #0A0A0A | #FFC08C | #FFC08C | #94420C |
| 紫 purple | #8B5CF6 | #A17BF9 | #0A0A0A | #C5A7FF | #C5A7FF | #6534B0 |
| 白 white | #FFFFFF | #E6E6E6 | #0A0A0A | #DBDBDB | #DBDBDB | #252525 |

所有 soft 填充使用 `--text-on-accent-soft: #0A0A0A`。**on-accent 表示配对前景，不等于白色。**不能把text-accent直接当填充后继续使用主文字。品牌底色8个值保留原设计；默认hover加深及其余hover/soft/主题文字前景是可访问性工程补充。

状态填充另外配对：Danger `#B4233C` / hover `#941F34` 配白字；Success Dark `#79CDA8` 配深字，Light `#216947` 配白字；Warning Dark `#E6B96A` 配深字，Light `#805209` 配白字。使用 `bg-{status}` + `text-on-{status}`，不得搭配随品牌切换的on-accent。轻危险操作使用danger文字与danger-soft；删除等最终确认可用独立danger-filled。

## 字体、间距与圆角

通用字阶为 **5级**，字体 Inter 400/500/600/700，中文回退 Microsoft YaHei / PingFang SC。根字号13px是既有页面基准，单独说明，不计入5级。小于11px或小数尺寸仅保留已有、具名页面证据，不扩散到新组件。

| 层级 | 字号/行高 | 字重 | 用途 |
| --- | --- | --- | --- |
| caption | 11/14 | 400 | 辅助、时间 |
| body | 12/16 | 400；按钮500 | 正文、列表、按钮 |
| label | 14/20 | 500 | 分组、强调 |
| title | 16/22 | 600 | 面板、卡片标题 |
| display | 24/30 | 600 | 空态、展示标题 |

间距6档：4/8/12/16/24/40px，对应 `--ui-space-1…6`。按钮内距6/10px和图文gap6px是原控件专项值，不声称所有数值都必须为4倍数。

圆角5档：control10、menu12、panel20、card28、pill999。输入/普通按钮用control；菜单/Popover用menu；Modal内容面板用panel；卡片用card；开关/胶囊/徽标用pill。不能把所有弹窗套成菜单12，也不能因为卡片使用28而修改所有画布节点几何。

## 基础组件用法

| 组件 | 入口/样式 | 契约 |
| --- | --- | --- |
| Button | `.ui-button`；主按钮 `.primary-button` 或 `.ui-button.is-primary` | h32、r10、12/16、500；default/hover/active/pressed/disabled/focus共享语义；真正提交才用主按钮 |
| Danger | `.ui-button.is-danger` / `.is-danger-filled` | 文字危险与填充危险分开；不受强调色影响 |
| Input | 原生input/textarea + `.ui-input`；设置 `.settings-field input`；带图标搜索 `.catalog-page-search` | 单行h32、r10、bg-input、必要边界；可访问label；placeholder不代替label；min-width0；业务多行保留 |
| Select | 原生select；设置 `.settings-select` | compact32/standard40、r10；文字可读、键盘可选；原生弹出菜单由系统控制，不声称还原为自定义r12菜单 |
| Badge | `.ui-badge`；`.is-accent` / `.is-success` | 纯信息无点击角色；r999；状态配对前景；不能只靠颜色表达成功/错误 |
| Capsule | `.ui-capsule` | h28/32、r999；可切换时用button+aria-pressed；不把过滤器当主提交；长文本有完整可访问名称 |
| Switch | `SettingsToggle` | 40×24轨道、18圆形滑块、r999；role=switch + aria-checked；disabled与原因；保留Space切换与状态持久化；本尺寸为24px目标工程补充 |
| Card | `.ui-card`或已有领域卡片消费tokens | bg-card、r28、space5；border-subtle + ui-shadow；不再混用bg-surface说明 |
| IconButton | 原生button + `.ui-icon-button` / 现有具名槽位 | 32/40/44命中区域；图标14/16/20；真实图标 + aria-label；tooltip/title不替代名称；来源资产由UiIcon/Figma资源复用 |
| Modal | `Modal.tsx` / `useDismissible.ts` | 原生dialog、header/body/footer、面板r20、可见关闭图标；Esc只关闭顶层并回焦；外部点击沿用可取消契约，不能丢失进行中操作 |
| Toolbar | `CanvasToolbar` + `ToolbarIcon` | 外高50，内部专项31/40；狭窄窗口可操作且不遮挡；保持真实行为和来源几何 |

复用现有真实组件与行为，禁止因样式统一另造一套业务状态。未接服务保持 Prototype 或禁用原因；loading/error/cancel/offline、IME、Escape、焦点恢复、草稿和迟到响应防护继续遵循 [运行规范](UI_SPEC.md) 及 [交互规范](FRONTEND-SPEC.md)。[WAI-ARIA组件模式](https://www.w3.org/WAI/ARIA/apg/patterns/)用于语义和键盘检查。

## 三档尺寸、图标与换行（1.2，2026-09-22）

颜色/主题仍为1.1校正值。以下替代旧文档将桌面专项尺寸直接用于所有窄屏的规则。手机和平板为工程适配，Figma桌面资产与几何继续复用；不得声称存在未读取的移动端Frame。

| 档位 | 视口宽度 | 壳层 | 屏幕控件 |
| --- | --- | --- | --- |
| 手机 | <768px，至少支持360px | 56px顶栏、64px底部导航，安全区另计；项目抽屉；全宽内容/对话 | 主要目标44px；正文14/20、辅助12/16；图形16/20、图标槽24/26 |
| 平板 | 768–1200px | 默认72px紧凑侧栏；展开覆盖抽屉；对话400px覆盖层 | 主要目标40px；正文14/20；不压缩面板低于可读宽度 |
| 电脑 | >1200px | 291/70px侧栏、470px对话，沿用已确认桌面Frame | 通用32px；专项尺寸继续保留来源 |

- `100dvh`与安全区只作用于屏幕壳层；画布世界坐标、内容缩放和已有节点大小不随断点一起缩小。手机横屏/短屏内容区滚动，不能让固定页头或底栏覆盖输入。高度≤600px时收紧面板留白、输入保留两行、收起次要页脚，44px发送按钮应直接可见；平板短屏导航在独立区域滚动，不能进入搜索/设置/账号的命中区域。
- 图标分三层：实际SVG图形、固定居中槽位、点击区域。槽位`flex-shrink:0`，图形`display:block; object-fit:contain`；图标按钮居中，带文字按钮用固定图标列与`min-width:0`文字列。不能用`space-between`把同一按钮的图标推向最左、文字甩向另一边。
- 短控件标签不拆行；长名称单行省略并保留完整可访问名称/title，正文自然换行并允许长URL断开。禁止把标题压成每行一个字。模型、参数、发送按功能组明确分行，而非任意换行后拉伸。
- 手机HUD第一行放任务、项目状态、对话入口，第二行放缩放与导航；标签可以隐藏但可访问名称保留。全屏对话打开时画布控件隐藏且不接受焦点，关闭恢复；平板不再挤占到小于完整工具条宽度。
- 三档共用业务、草稿和语义tokens；断点转换保留桌面折叠偏好和编辑内容。临时抽屉在关闭、页面导航或跨档切换时收起；菜单/弹窗保持重复点击、Escape顶层关闭、回焦，可见输入不能因尺寸转换被抢走焦点。
- 页面级响应式覆写由App在公共/领域样式后统一加载，避免组件提前import造成顺序失效。必须检查真实中心位置、换行、可点击区域和同态截图；仅无横向滚动不算视觉验收。

规则依据与三档验证见[响应式任务](changes/2026-09-22-responsive-ui/spec.md)。旧文档中61px手机常驻侧栏、窄屏扣减聊天宽度、工具条永远单行的要求被本节取代。

## 创作输入框（1.3，2026-09-23）

普通单行 Input 的32/40/44px、r10规则与创作容器分开。首页、API对话和Agent对话统一使用 `.composer-surface` / `ComposerTextarea`，由 `composer.css` 拥有几何，禁止在页面或响应式文件再次拼接输入框内部尺寸。画布节点保留世界坐标编辑器契约。

创作容器为 bg-input、1px border-control、r20、12px内距、8px分组间距。内部 textarea 透明且无第二层边框；文本聚焦时容器使用2px focus-ring/offset3px，工具按钮分别保留自己的键盘焦点，不能同时绘制两个输入焦点框。

| 项目 | 电脑 >1200 | 平板/手机 ≤1200 |
| --- | --- | --- |
| 输入文字 | 14/20 | 16/24 |
| 起始/最大文本高度 | 3行60px / 8行160px | 3行72px / 8行192px |
| 操作命中区 | 32px | 44px |
| 实际图形 | 主操作20px、辅助16px、展开箭头10×6 | 同电脑，不能撑满命中区 |

高度≤600px时文本起始2行、最多4行；内容增长只撑开实际区域，到上限后内部滚动。输入、附件、型号参数、操作栏、首页生成选项依次进入正常流布局，无附件不占空白；附件可换行，长型号说明可断行。不能使用56px固定间隙、绝对定位附件或固定容器高度承载动态内容。

宽首页与电脑对话的工具保持一排；触屏对话和窄首页固定两排：第一排模型/Skill/插件，第二排附件/语音靠左，权限/发送靠右。批量/隐私独立成组。模型名称弹性伸缩且保留完整title，短标签不拆字。多行、附件、型号参数、菜单/IME/失败草稿与短屏必须有实际点击和同态截图验收。旧Figma静态输入框的10px文本、22px控件及固定间隙由本节补充替代，来源与依据见[输入契约](changes/2026-09-23-input-contract/spec.md)。

弹层必须避开整条输入操作栏；首页还应避开批量/隐私选择行。按真实可用上下空间选择方向、限高并内部滚动，滚动/尺寸/内容变化后重算；禁止将菜单平移到触发按钮上。高度≤600px的电脑与触屏对话均须支持面板纵向滚动，附件和参数不能把发送或关闭按钮裁切为不可达。

## 后续开发与验收

固定链路：**用户Design System + 页面来源 → 语义Tokens → 共享组件 → 实际页面 → 浏览器验证**。新增颜色只能进入语义拥有者；新页面必须在两种主题和8色下检查相关状态。`tests/unit/designSystem.test.ts`直接读取实际CSS，验证配色/兼容；`tests/browser/design-system.spec.ts`核对真实页面最终计算样式、保存和键盘回归；原有 `ui:check` 阻止页面新字面量和未定义tokens。

公共样式对齐不表示每个历史页面均完成逐像素验收。PDF无法证明交互、变量绑定或组件实例；在线设计源写入、Tauri运行及未覆盖页面分别留证。当前范围与状态见 [本次验证](changes/2026-09-22-design-system/verification.md)。

2026-09-22逐页迁移：项目库、Skills、ComfyUI目录、Skill编辑器与设置分区继续消费以上契约；侧栏单色SVG在浅色主题将旧浅色前景映射为深色，保留原文件与命中区域。页面与真实Tauri证据见 [逐页迁移验证](changes/2026-09-22-design-system-pages/verification.md)。两色复合图标、Logo和页面来源几何不能被无差别全局滤镜处理。

桌面补充：移除整页1920×1080 letterbox缩放；字体、图标和点击区域保持CSS像素尺寸，通过弹性内容宽度响应实际窗口。1920参考几何仍验收，较窄电脑窗口不能以同比缩小作为适配。
