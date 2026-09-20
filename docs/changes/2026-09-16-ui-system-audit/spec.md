# UI 系统规格（目标态）

- ID：`2026-09-16-ui-system-audit`
- Source of truth：当前 Figma frame + `global.css`/`ui-tokens.css` semantic tokens + 同状态浏览器 DOM/截图。
- 入口与状态：`index.html → src/main.tsx → src/App.tsx`；Landing、Workspace、Assets、Tasks、Settings、Account 及 390/1440 视口。
- 数据契约与权限：Prototype/offline/未接入状态必须明确；不得把固定 fixture 当作真实账号、积分、任务或生成结果。
- 验收标准：组件、布局、视觉层级、状态和动态文本在同状态证据中可复核。
- 错误、取消、离线：按控件适用性覆盖并保留明确的失败、取消、离线和禁用原因。

## 问题定义

当前界面已有稳定的深色视觉语言和若干 token，但控件契约、响应式布局和信息架构分散在页面 CSS 与原生标签中。目标是让后续 UI 修改能够复用同一套语义、几何、状态和可访问性规则，并且可以用同状态 Figma 与浏览器证据验收。

## 目标行为

1. 所有新增交互控件来自明确的 primitive 或已登记的 Figma-specific variant。
2. 相同语义在 Landing、Workspace、Assets、Settings、Tasks、Account 中保持相同的颜色、字体层级、圆角、命中区和状态反馈。
3. 动态名称、模型、provider、状态和本地化文案不会撑破布局；在窄屏有 Wrap、Scroll、Truncate 或 More 的明确路径。
4. 主要创建/发送动作、当前模型和任务状态在对应层级直接可见；低频操作进入 More、context menu 或 Settings。
5. Prototype、offline、未接入、未上传和不可验证状态在首屏或操作附近可见，不把固定 fixture 表现为真实服务结果。
6. Web development、Web preview 和 Tauri release 的加载来源与视觉结果可以分别追踪。

## 规范边界

### Foundations

- 颜色消费 `global.css` 与 `ui-tokens.css` 的 semantic tokens。
- 新组件默认使用 type `11/14`、`12/16`、`14/20`、`16/22`；显示级标题使用 `24/30`，必须在页面层登记。
- 新组件默认使用 spacing `4/8/12/16/24/40`。
- 新组件默认使用 radius control10、menu12、panel20、card28、pill999。
- icon slot 使用 14/16/20/26；外层命中区使用 32/40/44。

### Component API expectations

- `Button`: `variant`, `size`, `loading`, `disabled`, `aria-*`；主按钮只能有一个视觉主层级。
- `IconButton`: 必须有 accessible name；图标不单独承担可发现性。
- `Capsule`: filter/selection/status/metadata，不能替代提交按钮。
- `Badge`: 非交互的 count/status/metadata。
- `Input`/`Select`: 支持 focus、error、disabled、loading、offline；动态文案有 min/max/ellipsis。
- `Card`/`Panel`/`Modal`: 使用统一 surface、padding、滚动和关闭回焦契约。
- `Toolbar`: 高频动作直接可见，低频动作分组；窄屏不得裁切可交互控件。

### Evidence expectations

每个实现单元必须记录：当前 Figma node、运行 URL/端口、mode、route/import chain、视口、状态、截图、DOM rect、computed style、交互路径和已知限制。仅静态检查、单元测试或构建成功不构成视觉完成。

## 非目标

- 本规格不要求立即重画当前 Figma shell、品牌颜色或现有 Prototype 页面。
- 本规格不引入真实 provider、账号、积分、任务持久化、服务器保存或生成后端。
- 本规格不要求一次性删除所有旧 CSS；迁移按 primitive ownership 和页面优先级分阶段执行。
