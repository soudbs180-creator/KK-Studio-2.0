# AI Handoff（最短恢复入口）

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-10-28
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

本文是跨会话 AI 的最短恢复入口（30 秒内读完）。任务状态只读 [`task-ledger.json`](task-ledger.json)；当前项目事实只读 [`PROJECT_STATE.md`](PROJECT_STATE.md)。

2026-10-28 P3a–e 源码候选：契约包1.3.0、Desktop/Web2.1.49、Mobile2.1.43。完整图R4由16降0，R1由405降367，其余规则无新增；212个迁移函数体AST一致、六份UI JSX结构一致，纯核心/infra/runtime无间接feature依赖。根2354通过/20跳过/0失败，Mobile373与Agent204通过（Agent另2跳过），根/契约/Mobile类型通过；Edge双构建各3/3通过，任务/资产/HTTP/DOM同态且4张PNG SHA完全一致。核心浏览器原9失败保留：8项在父P2错误和位置逐项一致，另1项为P2已有窄屏HUD失败。P2 flag仍默认关闭；独审、Tauri/真实Provider、完整verify和main整合未完成，五阶段分别PARTIAL。P3f、P4–8及STD/ORG等四文档其余任务继续开放。

最新P2候选：feat/TASK-MOD-P2-capability-registry-inpaint在fe99上实现薄注册器与默认关闭image.inpaint接线；包1.2、Desktop/Web48、Mobile43。根2350/Mobile373通过，双构建任务/资产/HTTP/DOM一致，各image-edit14 pass/1原窄屏fail；严格PNG有录音按钮边缘1灰阶像素变化，同路径也复现，仍未通过零差异。P2保持PARTIAL，原生/真实Provider/独审/main未验；见[P2验证](../changes/2026-10-28-inpaint-capability/verification.md)。P1-G、严格依赖声明和四文档其余任务仍开放。下文旧状态保留各时间点含义。

P1最新候选：用户已明确启动，当前feat/TASK-MOD-P1-capability-contract在5240e7b3上增加契约包1.1.0、业务schema和3个Port，未改src/上层逻辑。13契约、根2338及Mobile373项通过；独立项目配置/无宿主全局运行通过，严格依赖声明仍有Zod URL错误（TASK-MOD-P1-TYPES）。P1-G治理、P2运行接线、其他Port与主线/独审尚未完成。旧段落“P1未实施”为此前时间点，不覆盖本追加；入口见[P1验证](../changes/2026-10-28-capability-contract/verification.md)。

模块化整顿先读[四份原文总清单](../changes/2026-10-28-modularity-p0/four-document-coverage.md)和TASK-MOD-FOUR-DOC-COVERAGE。原始审计/复核草案由执行规范修正，补篇还含STD现代化与ORG-0–7；最近五项只是优先批次。用户禁止子代理，主代理直接执行，不把自审称为独审。

P0、安全补丁和格式有各自候选与限定独审，均未合流；17个测试文件修复后定向29项通过，完整verify仍有浏览器失败。P1只做前置、ORG只备份校验未迁出、P2未实施，其余P/STD/ORG不得漏报。main与origin/main仍113/7分叉，主checkout21个dirty文件受保护。实现/审查/合流证据必须逐项记录。

最新任务树候选：b8acad1c后修复折叠侧栏的HUD宽度归零，源码Desktop/Web2.1.47、Mobile2.1.43；保存6项含三宽度同宽reload通过，30项邻接27 pass/3 fail，原HUD取消裁切另挂开放任务。ORG-2守卫与ORG-5首包62日志已形成候选，不再是“仅副本”，均未主线整合。优先处理TASK-MOD-GATE-ADJACENT和TASK-UI-HUD-CANCEL-CLIP，完整verify未过，P1/P2仍未实施。

## 1. 当前基线与门禁（2026-10-26）

- **唯一主仓**：`D:/kk-studio/KK-Studio-2.0`（主线分支 `main`，三端版本 `2.1.45` / `2.1.45` / `2.1.42`）。
- **快速开发门禁（Fast Loop）**：`npm run typecheck && npm run lint && npm test`。
- **合流交付门禁（Ship Gate）**：`npm run verify`。
- **架构契约**：`src/domain/` 零外部依赖；`src/features/<feature>/index.ts` 全部 23 个特性已具备标准公开入口。

## 2. 当前优先推进主线（无需重复请示，按全权宪章自主推进）

1. **Wave 1 — 接通与暴露**：参照 [优化路线图](../changes/2026-10-26-kk-optimization-roadmap/roadmap.md) 与 [竞品学习方针](../engineering/COMPETITIVE-LEARNING-POLICY.md)，优先推进 `OPT-101/102`（本地 ComfyUI 出图链 Tauri invoke 桥接通）与 `OPT-003/103`（MCP 服务端最小集暴露画布工具）。
2. **Wave 2 — 画布底座解耦**：推进 `OPT-201` 抽取 `CanvasAdapter` 接口，逐步解耦 `src/components/canvas/` 自研渲染层。
3. **Figma 设计先行**：涉及 UI 变更时，遵循 [`AGENTS.md`](../../AGENTS.md) 与 [`UI_INDEX.md`](../UI_INDEX.md) 先核验 Figma 真值再同步本地令牌与组件。

## 3. 历史交接归档

2026-10-25 及更早的阶段交接记录已归档至 [`docs/archive/AI_HANDOFF_HISTORY_202610.md`](../archive/AI_HANDOFF_HISTORY_202610.md)。

P3继续入口：[ADR-029](../architecture/adr/ADR-029-feature-cycle-decoupling.md)及五个阶段verification；当前branch refactor/TASK-MOD-P3-feature-cycles，main与Figma工作树保持原状。
