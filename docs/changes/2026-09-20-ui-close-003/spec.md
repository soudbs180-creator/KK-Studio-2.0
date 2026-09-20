# UI-004 收口审计规格

本次只处理有当前 Figma 证据的视觉偏差，并记录仍然缺少设计来源的页面。目标文件为 `0nU0A7pq6eyjwfwm1TtWkO`，当前唯一可读 page 为 `0:1`。

## 可读设计来源

| 页面 | 当前节点 | 直接证据 | 工程状态 |
| --- | --- | --- | --- |
| Workspace | `404:28667` | `get_design_context` 返回 1920×1080 frame 的 sparse metadata，需按子层读取 | 运行态已核对，未把 sparse metadata 当完整设计代码 |
| Workspace 收纳 | `410:67357` | 1920×1080 frame 与网格子节点可读 | 运行态已核对 |
| Settings | `399:27506` | 337px 侧栏、337×700、主内容 x=364/y=38、40px 行、13px gap | 运行态已核对 |
| Search / Favorites | `388:938` | 900×696、80px 圆角、58px 搜索栏、49px tabs | 运行态已核对 |
| Assets | `392:938`、`398:26864` | 900×696 与收纳变体，导出图标和布局可读 | 运行态已核对 |
| Shortcuts | `394:938` | 672×480、`#1f1f1f` 背景、`#3c3c3c` 外框、18px 圆角 | 本次修复并加回归 |
| Help | `395:938` | 560 外框、30.667px 内边距、499px 文本列、22px 行间距 | 运行态已核对 |
| Tasks | `396:938` | 196×240、8px 圆角、任务卡和 tabs 几何 | 运行态已核对 |

## 缺失设计来源

- `410:59708`（Landing）在当前文件中被 Figma 明确返回 `INVALID_ARGUMENT`，当前 page 没有同名或可确认替代 Frame；不能用旧 `1:2` 或工程实现反推为现行 Landing 稿。
- 项目库、Skill、ComfyUI 页面和 Settings 其它分类没有独立的当前 Frame。它们可做功能与运行态检查，但没有逐页 Figma 视觉验收依据。
- 因此 UI-004 仍为 `PARTIAL`，本文件不把工程补充页面标记为 Figma 完成。

## 可执行修改

节点 `394:938` 的 Figma 代码明确要求外框边框为 `#3c3c3c`，而现有 `shortcuts.css` 使用 `--bg-card-soft`（`#333333`）。本次将外框改为共享 `--border-default`，保留顶部内部 divider 的 `#333333`。这是不依赖缺失设计稿的最小修复。
