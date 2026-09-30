# 独立只读审查：项目落地集成

- Reviewer：新的 Codex 独立上下文（API 未提供可验证的精确模型标识）；时间 2026-09-30，Asia/Shanghai。
- BASE：1e95a13d3490a39b35ce39e9df0ab55a09dc13f7
- HEAD：d7ee51c4ba2387731af1a1bad364b977be31e01f
- 仓库：D:/kk-studio/KK-Studio-2.0；开始时 HEAD 匹配且 git status --short 为空。审查期间实施者通知将另行补 delivery 文档；本报告只约束上述已提交 SHA，不批准后续 dirty 文档或新 head。
- 未修改仓库文件、index、HEAD 或分支，未启动项目服务，未开启子代理。仅在隔离 Chromium 的 about:blank 内存页面加载真实 hooks 做下述复现。

## 规则版本（SHA-256，读取时的工作树字节）

- AGENTS.md：683c7d1d25e727212de3290d2f469ffa50b4270861bd1b5e6e3fe23d8903ae87
- AI_RULES.md：be1d3febf73e0c03ddbfaF3e16372a46c07f99c6e53079eddd03340303d0d8fe
- docs/engineering/REVIEW.md：469968b635ad30fa3059a70c42f88885bda6fa80b63f1da17fb20364433e5f05
- docs/changes/2026-09-29-project-landing/plan.md：ee0b97ee4db6abb02710f92ffcc3dc6ef956f6d1c1808750c0e1e2678caf9c45

已读取 intent/spec/plan/verification/audit/remaining、完整集成计划、REVIEW/PROMPTING/SDLC/BRANCH-POLICY、PROJECT_STATE、UI_INDEX，以及 executing-plans/requesting-code-review 和 code-reviewer 模板。无嵌套 AGENTS.md。

## 已确认的优点和范围

- 原生快照持久化成功后才更新 expectedRevision；确认操作统一 await 现代 Tauri API，项目删除在确认后重新检查任务与保存状态。
- 记忆的 --data-dir 分支隔离到指定根，启动阶段不迁移共享记忆；读取时持锁校验后迁移，重置先备份，CAS 拒绝并发覆盖。
- Canvas 仍按项目 ID/loadEpoch remount，保留 image compare 的有效节点筛选/关闭；设置重构继续承接 ProjectPackageActions 与 CompanionSettings，偏好导出契约没有扩大到项目/凭据。
- 抽查 CodeBuddy 路径 realpath/本机绝对路径、无 shell、受限参数、环境白名单、超时/AbortSignal；Provider 配置 CLI 的无密钥形态、catalog 路径校验与保守合并。
- 抽查 fixture 维护 diff：创建空项目、禁用无模型提交及设置 CTA、批量菜单路径、文案与固定侧栏契约有 spec/plan 依据；未发现这批抽查中为了变绿删除有效失败断言。没有声称穷尽所有测试 diff。
- 查看 desktop/home-390.png 与运行 JSON；读取 verify.log 的 371 passed、Rust 97 passed、native-save-confirm-green.log 的32 passed，以及 compare/plugin 的独立 runtime JSON。这些是实施者生成的已有证据，本 reviewer 没有重跑整套 Web/Agent/Rust/原生验收。
- 独立读取本机产物 hash，JS 0d5a955de81af52a32d2884b4b07a02b1212cb7f30944789ec4807d966d36c55、CSS 315e74abc31a372ae27ca3733606d8f68cca91fa856847486430b2b1ebb5e557、exe a233cbd9ac568bcab27b42e4d282e7e83681de0eea575f2fb7c367cadfb58072，与 evidence/build-identity.json 及原生 runtime 一致。它证明记录中的产物字节一致，不替代 hosted exact-head CI。

## Findings

### LANDING-R1 — P2 — 删除带连线节点后撤销陷入无效循环

- Pass：行为/回归；merge-blocker：是（本轮明确交付的 Canvas 撤销验收未满足）；release-blocker：同一能力发布前须修复。
- 位置：D:/kk-studio/KK-Studio-2.0/src/components/canvas/useCanvasHistory.ts:94；关联 D:/kk-studio/KK-Studio-2.0/src/components/canvas/useCanvasConnections.ts:167。
- 实际复现：隔离 Chromium production React 页面导入真实 useCanvasHistory 和 useCanvasConnections，初始图片 A/B 与 result edge A→B；用 useCanvasNodeActions.removeNode 相同批量更新删除 B（setItems filter + setPositions 移除）。等待 effects 后调用 undo，连续三次仍为 items=[A]、edges=[]、canUndo=true、canRedo=false。
- 根因：删除 render 的 items/positions 已更新，连接清理在 effect 中才 setEdges。history effect 先记录“B已删、旧连线还在”的过渡快照，再记录无边快照。undo 恢复过渡快照后，useCanvasConnections 又清除悬空边；history 把清除当成新操作 commit，清空 redo 并重复加入同一过渡项。用户不能恢复该节点或更早编辑。
- 建议：历史只提交规范化且完整的一次用户操作，避免收录节点和边协调过程；增加真实 hooks/浏览器测试覆盖删除相连节点、一次 undo 恢复节点及边、redo 再删除，以及重复操作后的历史可用性。
- Owner：TASK-PROJECT-001 / TASK-CANVAS-KAWORKAI-001 实施者。状态 OPEN。复验：尚未修复；本报告有隔离运行复现。

### LANDING-R2 — P2 — 连续拖动消耗整段历史，不能一次撤销且会丢失起点

- Pass：行为/回归；merge-blocker：是（本轮拖动/撤销恢复契约）；release-blocker：同一能力发布前须修复。
- 位置：D:/kk-studio/KK-Studio-2.0/src/components/canvas/useCanvasHistory.ts:94；关联 D:/kk-studio/KK-Studio-2.0/src/components/canvas/useCanvasPointer.ts:198。
- 实际复现：同一隔离页面通过 setPositions 逐帧提交 x=1…85（初始 x=0），每次给 React 提交机会，模拟一次 pointermove 连续更新。一次 undo 得到 x=84；重复 undo 耗尽80项后停在 x=5，canUndo=false，起点 x=0 已不可恢复。
- 根因：history 对每次 positions/viewport 变化立即 commit，未接入 pointerdown/up/cancel 的事务边界。普通一次拖动会产生许多历史项，长拖动覆盖更早编辑；取消手势也会写入中间状态。
- 建议：拖动/平移开始保存起点，过程中只更新可见状态，完成时提交一个历史项，取消不提交；键盘动作和显式编辑仍保留合适粒度。测试应使用多步鼠标移动，并覆盖 Escape 取消、80次以上采样与已有历史不被单次手势冲掉。
- Owner：TASK-PROJECT-001 / TASK-CANVAS-KAWORKAI-001 实施者。状态 OPEN。复验：尚未修复；本报告有隔离运行复现。

## 复现方法与原始输出

使用本仓库现有 esbuild 和 Playwright Chromium；esbuild stdin bundle，write:false，React production，page.setContent + addScriptTag；未写测试源码或启动 HTTP 服务。测试组件以 useState 管理 items/positions/viewport，同时调用实际 useCanvasConnections/useCanvasHistory，暴露动作到 window.review。删除批量操作与实际 removeNode 的两个 setter 一致。退出码0（探测打印观察值，没有宣称通过修复断言）。

```
drag first undo { items: [ 'a', 'b' ], x: 84, edges: [ 'ab' ], undo: true, redo: true }
drag exhausted undo { items: [ 'a', 'b' ], x: 5, edges: [ 'ab' ], undo: false, redo: true }
deleted connected node { items: [ 'a' ], x: 0, edges: [], undo: true, redo: false }
delete undo 1 { items: [ 'a' ], x: 0, edges: [], undo: true, redo: false }
delete undo 2 { items: [ 'a' ], x: 0, edges: [], undo: true, redo: false }
delete undo 3 { items: [ 'a' ], x: 0, edges: [], undo: true, redo: false }
```

现有 tests/browser/canvas-history-layers.spec.ts 只覆盖新增节点 undo/redo 与吸附设置/图层入口；未覆盖上述连接删除与手势事务。单元测试覆盖 bounded snapshots 的算法，不能证明 hook 把用户操作正确分组。

## Declined to judge（逐项）

- 真实付费 Provider/Google/CLI 登录、ComfyUI/GPU 外部服务：未提供本轮真实凭据/设备验收，不把 fixture 当真实调用；文档保留 PARTIAL/BLOCKED。
- Codex/Claude 目标 CLI 实际消费配置以及设置 UI 尚未接线：既有开放 TASK-PROV-003/004 范围，未把 roadmap 改成当前必须完成功能。
- 豆包/WorkBuddy 原生跨应用记忆：尚无真实适配联调，当前文案不宣称已经共享。
- 安装器/签名/干净系统安装卸载、Mobile 原生、VPS/域名/生产迁移：本轮明确非目标，不能以 responsive Web 或 no-bundle exe 代替。
- sidebar 文件夹/置顶/顺序的跨重启持久化与 ORCH 执行 UI：已明确为会话态/后续任务，未作为本次功能缺陷。
- 用户最终美观偏好和 live Figma 像素级一致：审查读取现行落盘规范与截图，未获取实时 Figma 或替用户验收。
- 被保留旧 WorkBuddy Gateway 与其它 dirty worktree 的全部未承接实现：audit 明确保留，review 未穷尽22个worktree的dirty源码；不声称所有历史工作已被集成或可删除。
- hosted CI、平台规则及人类最终结果确认：本轮未读取托管平台状态，不给出平台审批或发布批准。

## 结论

CHANGES REQUIRED。未发现已证实的 P0/P1；有两个实际复现的 P2 Canvas 验收阻断项。不能将现有371项浏览器通过当成这两条交互已通过。修复后需 RED→GREEN 回归并验证受影响整合树；后续 SHA 必须按仓库规则重新绑定审查。本结论既不是合并，也不是发布或用户最终产品验收。

范围限制：本次是578文件集成 diff 的风险导向分阶段抽查，深入检查上文列出的实际调用链与证据，没有逐行审阅所有历史文档/图片/全部测试或重跑全部平台。实施者另行发现的 delivery 文档结构问题未在本审查独立复现，需由其本地/托管 gate 的真实结果关闭，不与本报告的两个代码 finding 混为已验证结论。
