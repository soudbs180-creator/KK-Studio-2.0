# 创作画布（FEAT-001）

- 状态：REAL
- 领域：canvas
- 最近更新：2026-10-08
- 关联任务：T2、UI-004、TASK-UI-006、TASK-CANVAS-KAWORKAI-001、TASK-UI-011

## 用户可见入口

- 工作区主界面：节点编辑、连线、框选、右键菜单、工具栏、小地图、缩放/平移。
- 添加节点菜单（AddNodeMenu）：图片 / 视频 / 音频 / 文本节点；视频剪辑与 ComfyUI 工作流编辑器为禁用项并显示原因。
- Desktop 与 Web 共用同一前端画布；画布数据随项目快照持久化。

## 代码位置

- 前端：`src/components/Canvas.tsx`、`src/components/canvas/`（节点层、连线、控件、指针与视图 hooks）、`src/components/nodes/`
- 领域模型：`src/domain/canvasGraph.ts`、`src/domain/canvasItems.ts`、`src/domain/projectCanvas.ts`
- 持久化：画布随 `src/features/creation/snapshotCodec.ts` 编入项目快照
- 桌面 Rust：无直接画布命令（节点结果素材经 FEAT-014/015 的原生存储）

## 测试与证据

- 浏览器：`tests/browser/canvas-actions/layout/navigation/pointer.spec.ts`、`connection-drag`、`context-menu`、`canvas-history-layers.spec.ts`、`interaction-regressions`、`ui-motion`
- 单测：`tests/unit/canvasGraph.test.ts`、`projectCanvas.test.ts`、`canvasHistory.test.ts`、`canvasPreferences.test.ts`
- 证据：`docs/changes/2026-09-20-ui-main-alignment/`、`docs/evidence/2026-09-21-main-close-002/`、`docs/changes/2026-09-29-kaworkai-canvas/`

## 当前能力

- 节点增删改、结果边/参考边、框选多选、小地图、右键操作、会话内快照撤销/重做与本地持久化均为真实能力。
- 右键画布菜单会按历史状态动态启用撤销/重做，并提供网格吸附和轻量图层管理入口；吸附偏好写入浏览器本地存储，图层面板支持搜索、类型标识、选中和定位。
- 图片节点接真实生成链（FEAT-002/003）。

## 差距与后端化

- 视频剪辑编辑器、ComfyUI 工作流编辑器在菜单中禁用（分别依赖 FEAT-006、FEAT-004）。
- 部分 Figma Frame 仍缺现行基线（UI-004）。

## 变更记录

- 2026-09-21：随功能体系建立创建卡片，状态 REAL。

- 2026-09-22：TASK-UI-006修复折叠、HUD背景与弹层生命周期；关联 `tests/browser/ui-interactions.spec.ts`、`ui-interaction-matrix.spec.ts`，验收见 `docs/changes/2026-09-22-ui-interactions/verification.md`。不升级外部服务或分组持久化能力状态。

- 2026-09-29：TASK-CANVAS-KAWORKAI-001 完成参考画布只读审计，并把快照历史、键盘/右键撤销重做、可持久化网格吸附和无分组图层定位并入本地画布；竞品 AI 工具、积分、云端 board 和分组折叠仍未接入。

- 2026-10-08：TASK-UI-011 将参考/结果图片动作统一到选中卡片上方，单击选择/双击预览；画布缩放、顶部手势/重选及历史语义实测，重绘与现有精确模型/原件/审批门禁共用。最新main78组合7d27265完整423浏览器、97Rust与fresh Native UI13/TaskHost11/同EXE模型能力通过，独立补审与产品当前HostedPASS；最终文档推广门禁另绑，见[本轮验收](../changes/2026-10-08-image-selection-actions/verification.md)。未实现的裁剪/高清/多视角没有伪装成可用动作。
