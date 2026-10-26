# Spec：Figma 设计真值与本地派生规范

- Task ID：TASK-FIGMA-FIRST-20261021；日期：2026-10-21。
- [Intent](intent.md) / [plan](plan.md) / [verification](verification.md) / [review](review.md)。
- 当前设计来源：[Figma / 01 · 设计规范](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3/KK-Studio?node-id=91-2)，2026-10-21 在线读取；入口与七章映射只在 [UI_INDEX](../../UI_INDEX.md) 维护。

## 验收

1. 根 AGENTS.md 要求先在 Figma 完成设计并回读，再修改本地 UI；已有目标设计时记录无需修改的依据，纯非 UI 改动不触发设计编辑。
2. 本地仍须读规范；设计来源由 Figma 决定，文档按其章节/术语/取值派生。旧 CSS、旧文档或交换格式不覆盖新设计。
3. 登记规范和页面节点、版本或读取时间、主题/视口/状态。来源失效或设计缺失暂停依赖它的 UI 写入；不从代码倒推后补设计。
4. 按实际读取更新字体、字阶、图标/描边、圆角、间距、层级、响应式目标；记录未迁移的 CSS 与生成 YAML，保持生成器契约，不把结构检查当作 Figma 同步或视觉验收。
5. 保留安全、数据、无障碍、状态真实性及 Desktop/Web 运行门禁；规则回归场景覆盖设计先行、来源缺失和文档漂移。

## 非范围与兼容

不修改业务状态机、存储 schema、Provider、CSS、页面组件或外部设计。旧实现快照与历史证据保留当时含义；本次文档更新不证明运行时或全部业务页面已经迁移。无需新增 ADR、依赖、功能卡或产品版本。
