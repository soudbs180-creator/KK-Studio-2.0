# 本地演示素材管线（FEAT-025）

- 状态：PROTOTYPE
- 领域：system
- 最近更新：2026-09-21
- 关联任务：UI-003、BACKEND-MEDIA-001、BACKEND-TEXT-NODE

## 用户可见入口

- 视频/音频节点的“生成”动作当前走演示流程，界面明确标注“本地演示 · 固定测试素材，提示词与参数不改变素材；不消耗积分，不上传”。

## 代码位置

- seam：`src/components/nodes/useLocalGeneration.ts`（统一演示状态机）、`src/domain/localGeneration.ts`、`src/domain/demoMedia.ts`
- 展示：`src/components/nodes/DemoResultNode.tsx`、`DemoMediaPreview.tsx`、`DemoRunButton.tsx`
- 素材：`public/fixtures/demo`、`src/domain/fixtures/demo-manifest.json`

## 测试与证据

- `tests/browser/demo-results.spec.ts`

## 当前能力

- 在无后端时提供可点击、可取消、状态完整的演示流程，且与真实结果严格区分标注。

## 差距与后端化

- 这是统一替换 seam：每接通一个真实模态（FEAT-006/007/008），就把该模态从 seam 切换到真实任务链，停用对应演示提交入口；历史项目仍引用的素材须保留，不能破坏旧项目。
- 不允许演示结果与真实结果混作同一状态验收（SPEC_BASELINE 硬规则）。

## 变更记录

- 2026-09-21：创建卡片，作为后端化改造的统一定位点。

- 2026-09-22：文本节点已切换到 FEAT-008 的真实任务链；历史 demo 资源保留只为兼容旧项目。
