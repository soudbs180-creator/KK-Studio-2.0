# Spec：画布图片对比

- Task ID：TASK-COMPARE-001
- 状态：READY
- 日期：2026-09-27
- Intent：`intent.md`；功能：FEAT-036。
- 基线：`origin/main@a89792a`、`docs/DESIGN-SYSTEM.md`、现有 `Modal.tsx`、画布图片/结果节点。

## 交互

1. 已归档上传图或有可读来源的图片结果显示“加入对比”。选择后出现画布上方的非缩放选择条，列出已选标题与数量；再次点击或在选择条点击移除可撤销，清空不删图片。达到 4 张时其余按钮禁用并显示原因。
2. 2–4 张时“打开对比”可用。默认并排，列顺序与加入顺序一致；每列显示标题、来源（本地图片/示范素材/已生成）及模型（有值时）。共用 100%–300% 缩放，滚动位置按比例同步；图片按完整比例显示，不强制裁切。
3. 恰好 2 张时可切换滑块视图；初始分界 50%，左右方向键每次 1%，Shift+左右每次 10%，可用指针/触屏拖动。滑块视图内两图按同一容器 `object-fit: contain` 对齐。
4. 对比层沿用 `Modal` 的 Escape、背景关闭和回焦行为。打开期间画布快捷键不接管焦点。关闭后选择清单保留，用户可继续换图。
5. 图片加载失败显示“图片无法加载”与重新加载操作，不显示旧图。节点被删除或来源丢失时从选择清单移除；不足两张则退出对比视图。离线时本地已缓存图片仍可比较，外部来源若不可加载按失败态处理。

## 数据和边界

- `src/features/compare/imageCompare.ts` 从现有 `CanvasCollectionItem` 派生只读的比较项，管理 4 张上限与失效剔除。仅 image kind 且非 pending/error 并有 `result.src` 或 `preview` 的节点可入选。
- `ImageCompareProvider` 持有临时选择/打开状态，挂在当前 Canvas 下；不改项目 schema、素材原件、资产归档或生成队列。
- 对比面板消费语义 tokens、复用 `Modal` 与 `.ui-button`。没有现行对比 Frame，布局为工程补充；不声称复刻竞品具体操作。
- 纯本地 UI，无凭据、外传、账单和新依赖；无跨模块数据契约，ADR 不适用。

## 平台与验收

| 能力 | Web | Desktop | Mobile |
| --- | --- | --- | --- |
| 选择和本地对比 | 共享前端，浏览器实测 | 同一前端，需 Tauri 运行复验 | 390px 浏览器布局，不等于原生 Mobile |

验证按 `intent.md` AC-1–5；项目门禁运行 typecheck、test、lint、ui:check、format:check、build、相关 browser 用例。Web 与 Desktop 证据分开记录。原件读取/失败不落盘，不需要迁移或回滚数据；关闭/重启只清空临时对比选择。
