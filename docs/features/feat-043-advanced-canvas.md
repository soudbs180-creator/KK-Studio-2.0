# 进阶画布操作（FEAT-043）

- 状态：PARTIAL
- 领域：canvas
- 最近更新：2026-11-05
- 关联任务：TASK-E2E-WIRING-20261104

## 用户可见入口

画布工具菜单导入架构蓝图，导航控制网格/小地图，Agent 以34项严格原子操作编辑同一画布。分组、尺寸、锁、历史及项目保存共用现有状态；导入拒绝冲突身份和越界边，PNG 使用真实存档图片渲染并归档，JSON 支持便携图结构回导。数字引用在输入框与画布槽位间随真实素材身份联动。

## 代码位置

领域：`src/domain/canvasOperations.ts`；适配：`src/features/canvas/index.ts`；UI：`src/components/canvas/useCanvasOperationRuntime.ts`。Dagre 使用 MIT，Floorplan 参考使用 MIT；不复制 AGPL 代码。

## 测试与证据

`tests/unit/canvasOperations.test.ts`、`tests/unit/promptMentions.test.ts`、`tests/browser/advanced-canvas-wiring.spec.ts`。当前生产 Web 验证见[验证记录](../changes/2026-11-04-e2e-wiring/verification.md)。

## 当前能力

严格操作与真实画布状态/持久化/Agent回执均已接线，Floorplan 已经生产浏览器导入和重载验证。

## 差距与后端化

当前 Desktop、完整 Figma 同状态视觉验收及最终合流尚待完成；不把模块单测标为 REAL。JSON 导出是便携图结构，完整项目备份仍使用原项目包。
