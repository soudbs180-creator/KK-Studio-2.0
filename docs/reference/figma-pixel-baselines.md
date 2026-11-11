# Figma 参考基线（L4 像素门禁）

本文说明 `design/preview/baselines/` 中 **Figma 原稿截图** 与状态描述的登记约定，用于 L4 像素一致性比对。

## 目录约定

```
baselines/
  <scope>.json          状态清单（路由、主题、视口、容差、参考图名）
  <reference>.png       Figma 原稿截图（由 Figma 导出，不是本地渲染结果）
```

## 状态清单字段

| 字段                | 含义                                         |
| ------------------- | -------------------------------------------- |
| `name`              | 状态标识，对应报告中的条目                   |
| `route`             | 本地预览路由                                 |
| `theme`             | `dark` / `light`                             |
| `viewport`          | `{ width, height }`，须与 Figma 导出尺寸一致 |
| `reference`         | 参考图文件名（相对基线目录）                 |
| `maxDiffPixelRatio` | 允许的差异像素占比上限，默认 `0.01`          |
| `channelTolerance`  | 单通道色差容差，默认 `8`                     |

## 关键约束

1. **参考图必须来自 Figma 导出**，不能用本地渲染结果冒充，否则门禁自我循环、失去意义。
2. **视口尺寸必须与导出尺寸一致**；尺寸不同直接判失败，不做缩放。
3. 未登记参考图的状态会被 **跳过而非通过**，避免"没有基线 = 全部合格"的假象。
4. L4 严格逐点相等不可达成：字体 hinting、抗锯齿、阴影模糊存在渲染管线差异。门禁约束的是**有界差异**，不是字节相等。

## 与标定数据的区别

历史 Figma 原稿（应用界面截图）保存在
[`docs/reference/figma-pixel-calibration/`](figma-pixel-calibration/README.md)，
用于标定容差区间，**不是**门禁基线——它们与设计预览页不是同一画面。

## 使用

```bash
npm run test:design        # 含令牌与组件证据
npm run test:pixel         # 仅像素门禁
npm run figma:audit:diff   # 含 L1–L4 的完整差异审计报告
```
