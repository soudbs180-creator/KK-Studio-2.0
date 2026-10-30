# 创作画布（FEAT-001）

- 状态：REAL
- 领域：canvas
- 最近更新：2026-10-24
- 关联任务：T2、UI-004、TASK-UI-006、TASK-CANVAS-KAWORKAI-001、TASK-UI-011、TASK-222-ACTIONS-20261014、TASK-223-ACTIONS-20261014、TASK-CANVAS-PERF-20261024

## 用户可见入口

- 工作区主界面：节点编辑、连线、框选、右键菜单、工具栏、小地图、缩放/平移。
- 添加节点菜单（AddNodeMenu）：图片 / 视频 / 音频 / 文本节点；视频剪辑与 ComfyUI 工作流编辑器为禁用项并显示原因。
- Desktop 与 Web 共用同一前端画布；画布数据随项目快照持久化。

## 代码位置

- 前端：`src/components/Canvas.tsx`、`src/components/canvas/`（节点层、连线、控件、指针与视图 hooks）、`src/components/nodes/`
- 领域模型：`src/domain/canvasGraph.ts`、`src/domain/canvasItems.ts`、`src/domain/projectCanvas.ts`
- 持久化：画布随 `src/features/creation/snapshotCodec.ts` 编入项目快照
- 桌面 Rust：无直接画布命令（节点结果素材经 FEAT-014/015 的原生存储）

## 2026-10-18 当前有界本地验证

Desktop/Web2.1.39/source50412d4e：项目/文件夹置顶和manual/recent/priority排序复用同CreationSnapshot/CAS，未就绪或冲突真实禁用。精确完整浏览器854首试PASS/0flaky，包含侧栏及四比例几何回归；fresh当前EXE四次正常启闭验证pin/unpin/priority、真实项目/组操作和新root项目包往返，宽图6状态SVG/DOM/实际拖线/按钮命中通过。原库两周期9项目/11聊天/22消息及身份/草稿/选择保持。验证同时发现并修复429保存前健康标记竞态；原852/1flaky与所有失败保留。[本轮验证](../changes/2026-10-18-sidebar-canvas/verification.md)区分源码、产物、原资料和最终文档收据；本任务只作本地技术关闭，不提升功能成熟度/runtimeEvidence，真实Provider/Hosted/发布和用户整体接受另验。

## 测试与证据

- 2.1.24本地验证（TASK-223，本任务DONE/PASS；功能主状态保持）：背景样式/颜色、短屏菜单、L/G弹层边界及取消/删除/撤销已按现有链路验证；隐藏loading等待卡在成功/取消后Redo恢复终态，手机确认布局与原坐标保留；最终产品58b5c07f与完整验证、官方/便携回执见[本轮验证](../changes/2026-10-14-action-usability-223/verification.md)。

- 2.1.23本地按钮修复：`tests/browser/canvas-node-actions.spec.ts`、`tests/browser/canvas-selected-zoom-menu.spec.ts`；结果及Web/Desktop边界见[2.1.23历史验证](../changes/2026-10-14-action-usability-222/verification.md)。

- 浏览器：`tests/browser/canvas-actions/layout/navigation/pointer.spec.ts`、`connection-drag`、`context-menu`、`canvas-history-layers.spec.ts`、`interaction-regressions`、`ui-motion`
- 单测：`tests/unit/canvasGraph.test.ts`、`projectCanvas.test.ts`、`canvasHistory.test.ts`、`canvasPreferences.test.ts`
- 证据：`docs/changes/2026-09-20-ui-main-alignment/`、`docs/evidence/2026-09-21-main-close-002/`、`docs/changes/2026-09-29-kaworkai-canvas/`

## 当前能力

- 2026-10-24 轻量性能批次正在验证：跳过普通手势预览的历史扫描、缓存持久化参照指纹、仅协调图输入变化的项目，并消除保存前重复规范化。预览journal和原有撤销/恢复契约保持；连线局部计算、最终浏览器与独审见[当前验证](../changes/2026-10-24-canvas-performance/verification.md)。不以计数收益代称任意规模帧率或原生安装已验。

- 本轮2.1.23已验证补齐草稿顶部删除、屏幕尺寸上传、320px HUD避让与撤销偏好恢复；不删除归档原件。

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

## 2026-10-15 首页与来源修复（REVIEW，整体待验）

TASK-CODEX-HOME-20261015：新首页默认Codex/ChatGPT图片能力，首页、聊天、画布沿各自显式Codex/API来源执行；旧API和无selection项目保持legacy路由，局部隐私/草稿/附件及原件保全。输入同排与菜单锚点同步修复。当前进入REVIEW：784浏览器首过及Native单QA包往返/冷开图文通过，但完整npm verify因另一任务占用1421而development未执行/exit1；当前SHA独审与Hosted完整门禁、合并和本机更新待验。见[本轮规格](../changes/2026-10-15-codex-home/spec.md)与[验证](../changes/2026-10-15-codex-home/verification.md)；本卡功能状态保持，不用前置真实账号证据代填新入口或所有外部Provider。
