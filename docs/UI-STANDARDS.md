# UI 标准（已合并，停止更新）

> ## ⚠ 本文不再承载现行规则
>
> 2026-09 规范整合中，本文的**现行条款已全部并入** [`UI_RULES.md`](./UI_RULES.md)，
> 数值并入 [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md)，颜色并入 [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)。
> **请勿再更新本文**——更新会漏改，因为现行规则只读上面的文件。
>
> 原文快照（只读，仅供溯源）：[`archive/ui-history/UI-STANDARDS-2026-09.md`](./archive/ui-history/UI-STANDARDS-2026-09.md)
> 整合记录与冲突裁决：[`UI_INDEX.md`](./UI_INDEX.md) §1.2 / §2.1

---

## 现行条款去向

| 原章节 | 现行位置 |
|---|---|
| §0 状态标注约定（原稿 vs 工程补充） | [`UI_RULES.md`](./UI_RULES.md) §1.1 + [`UI_SPEC.md`](./UI_SPEC.md) §4 |
| §1 颜色与基础组件 | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) §颜色与主题 |
| §2 图标（Figma 导出 / UiIcon） | [`UI_RULES.md`](./UI_RULES.md) §8 |
| §3 尺寸、字体、布局 | 数值 → [`DESIGN_TOKENS.md`](./DESIGN_TOKENS.md)；规则 → [`UI_RULES.md`](./UI_RULES.md) §2 |
| §4 动效 | [`UI_RULES.md`](./UI_RULES.md) §2.4 |
| §5 交互标准 | [`UI_RULES.md`](./UI_RULES.md) §1.4 |
| §6 示范素材清单 | 源文件 `public/fixtures/demo/manifest.json`；行为见 [`UI_RULES.md`](./UI_RULES.md) §1.4 |
| §7 检查清单 | [`UI_RULES.md`](./UI_RULES.md) §9.3 |
| §8 可执行门禁 | [`UI_RULES.md`](./UI_RULES.md) §9.1（`npm run ui:check` 已纳入 `npm run verify`） |
| §9 画布控件布局 | [`UI_RULES.md`](./UI_RULES.md) §1.5 |
| §13 尺寸层级与复用契约 | [`UI_RULES.md`](./UI_RULES.md) §1.6 / §2 / §5 |
| §10 指针手势与复用契约 | [`UI_RULES.md`](./UI_RULES.md) §1.6 |
| §11 侧栏尺寸与响应式契约 | [`UI_RULES.md`](./UI_RULES.md) §1.7 |
| §12 连接拖出与共享添加菜单 | [`UI_RULES.md`](./UI_RULES.md) §1.5 / §1.6 |
| 已被取代的旧规则（61px 手机常驻轨道、801–1200 挤压对话、所有控件固定单行、桌面 letterbox 整页缩放） | **已废止**，见 [`UI_INDEX.md`](./UI_INDEX.md) §2.1 |

---

## 引用本文历史章节的地方

`docs/changes/**`、`docs/reference/**`、`docs/superpowers/**` 中的历史引用指向本文文件或其 § 号，
**指向依然有效**（本文仍在，只是不再承载现行规则）。要引用当时的测量值，请跳到归档快照。
