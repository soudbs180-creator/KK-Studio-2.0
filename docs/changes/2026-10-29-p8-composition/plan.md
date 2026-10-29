# P8 Implementation Plan

> For agentic workers: superpowers:executing-plans；用户禁止子代理，本代理连续执行。

**Goal:** 保持App视图/状态语义，把现有装配责任移至src/app，准备受控合流。
**Architecture:** 复用原七组装配闭包与现有Port；仅移动并给外部依赖明确类型，CSS/lazy加载仍由App管理。
**Tech Stack:** TypeScript/React/Tauri与已安装测试工具，无新增依赖。
**Spec:** 本目录spec.md；执行规范§17。

## Global Constraints
不修改JSX/样式、存储key/数据格式，不把fixture当REAL；复用已有树，保留主仓dirty。main合流是本轮授权，push/发布与真实计费不执行。独审不能由自检冒充。

## Review Focus
effect依赖与稳定ref捕获；React StrictMode卸载/重挂；只读加载/迟到保存；同sid/多桥清理；iframe与现有功能开关保持。

## Task 1: 保全与基线
- [x] 保全主仓dirty字节、patch、索引对象清单，列出合流重叠路径。
- [x] 保存7927 AST/JSX/CSS及限定浏览器同态基线。
- [x] 为装配迁移写接口/清理回归，先见RED；旧业务回归不删断言。

## Task 2: 装配hook迁移
- [x] 新增src/app/useAppSkills.ts、useHomeModelConfig.ts、useAppAgentState.ts、useActiveProjectConversation.ts、useAppTaskCoordination.ts、useAppSettings.ts、useAppAgentBridge.ts；沿用App调用顺序。
- [x] 调整App及conversationSubmitScope测试源码入口；AST比对、类型/lint/全单元、构建与浏览器同态。
- [ ] 版本53、台账、总覆盖、状态与交付文档同步；提交源码候选。

## Task 3: 合流门
- [ ] 跑完整verify等价阶段（串行固定1423，workers1/retry0）、明确所有失败及归属。
- [ ] 当前SHA独立review/CI；缺失不能自称通过。
- [ ] 所有适用门满足后，保留dirty patch并合main，复核原文件、重跑受影响检查；否则给出具体阻断与可审阅候选，不重置/clean主仓。

执行记录：初始main c2a0228a，HEAD79275961，main落后23提交；主仓有未提交Figma审计，保全清单/重叠见工程外merge-preflight.json。P8原总表是未实施，不把上一轮2378单元作为完整verify证明。

2026-10-29实施记录：35函数/12桥语句/2effect与JSX同态；同版本固定输入、软件Edge四图/DOM一致。App2002→1546；主仓21文件保全。原Codex四失败发生在P8前后，门禁修复单列。用户禁止子代理；独审仍NOT_VERIFIED。
