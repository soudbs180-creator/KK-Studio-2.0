# KK Studio Design System

2026-09-30 更新。最高设计基线是 [UI_INDEX](UI_INDEX.md) 指定的 Figma 四页。
旧 [1.3 文档](archive/ui-history/DESIGN-SYSTEM-2026-09-22.md) 保留历史，
其 44px 控件、11px 文字和旧圆角不覆盖现行闭合尺寸轴。

## 颜色与主题

语义颜色由 [`tokens.css`](../src/styles/tokens.css) 声明；
[`global.css`](../src/styles/global.css) 和 [`ui-tokens.css`](../src/styles/ui-tokens.css)
提供旧名称映射。页面不得建立第二套调色板。
Dark / Light 通过根节点 `data-theme` 切换，强调色通过 `data-accent` 切换；
偏好仍使用原有存储身份。颜色不得成为成功、错误或禁用的唯一反馈。

## 基础组件

- Primary / Secondary / Tertiary / Danger 复用相同语义尺寸和状态 token。
- 图标使用 [`UiIcon`](../src/components/UiIcon.tsx) 或 Figma 导出的 SVG，图形与命中区分开。
- 输入区复用 [`ComposerTextarea`](../src/components/ComposerTextarea.tsx)，保留 IME、增长高度、语音和附件行为。
- 弹层使用真实 Escape、外部点击与回焦路径；手机设置分类位于底部横向 rail。
- 生成入口复用 [`uiGovernance`](../src/domain/uiGovernance.ts) 的状态谓词；未配置、离线和输入无效时有可读原因及恢复入口。
- 首页模型菜单保存批量数量与数据模式；上传按钮直接选择文件，插件与伙伴从设置访问。

尺寸源见 [DESIGN_TOKENS](DESIGN_TOKENS.md)，交互见 [UI_RULES](UI_RULES.md)，
页面模板见 [UI_ARCHETYPES](UI_ARCHETYPES.md)。
运行验证见 [UI_SPEC](UI_SPEC.md) 与本轮 [落地记录](changes/2026-09-29-project-landing/plan.md)。

## 验收边界

构建通过不代表视觉一致。Web production preview 和 Tauri release 分别验证实际 bundle、
页面入口、computed style、同状态截图和真实操作。历史截图不用于证明当前版本。
真实账号、积分、云服务和第三方模型能力仍按功能卡记录，未联调不能标为 REAL。
