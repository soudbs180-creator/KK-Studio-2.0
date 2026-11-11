# Spec：Figma 先行修复

- Task ID：TASK-FIGMA-CONTROLS-20261025。
- 2026-10-25 在线读取并修改[当前 Figma](https://www.figma.com/design/ZiadpErDoFweCjG3uHjkM3/KK-Studio?node-id=1199-21677)，session `f3598ce6-fa23-4651-b11a-c75c697faad8`。
- 源：01 `546:187` / `596:144026` / `1514:90406`；03 操作按钮 `551:6356`、图标按钮 `551:7196`、标签 `551:10290`、输入框 `551:7313`。
- 普通按下态绑定 on-surface；反色标签绑定 on-button-primary。反色默认文字与其 fill 均100%不透明；禁用使用 surface-container/text-tertiary，不叠加整组透明度。
- 中性默认与禁用控件保留 outline-variant 1px弱边界。保留当前 control/selected 背景，不采用旧报告建议覆盖现行色阶。
- Compact 32px：12px字/16px行高；Standard 40px：16px字/24px行高。保留既有24px辅助控件档位，不全局改写所有布局尺寸。
- 图标标注 `597:67225`、`597:67243` 改为16和20px。01页扫描未复现旧报告的七处短行高；03页当前21处命中由小地图源标签及12条账户说明修复，分别使用12/16与14/20字阶，回读0命中。本地小地图已有12px字阶，未扩大修改账户功能。
- 本地修改限共享样式/令牌、设计预览与对应验证；不修改存储或Agent失败以制造全绿。
