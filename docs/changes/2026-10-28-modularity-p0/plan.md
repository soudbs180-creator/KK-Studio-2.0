# TASK-MOD-P0 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved specification inline. Steps use checkbox syntax for tracking.

**Goal:** 防止新增模块边界违规，建立只减不增的可验证基线。

**Architecture:** dependency-cruiser负责TS解析和依赖解析；规则配置描述边界，轻量检查器比较稳定的依赖集合并检查feature有向环。保留所有现行门禁，经既有governance入口集成。

**Tech Stack:** Node24、ESM、dependency-cruiser 18.7.0（MIT）、现有node:test。

**Spec:** [本卡规格](spec.md)，现行规范落到[MODULARITY](../../architecture/MODULARITY.md)。

## Global Constraints

- P0不修改任何产品源文件、UI、用户数据或功能注册表schema。
- 复用既有任务、资产、Provider、插件；不新增产品运行时。
- 所有单测在tests/unit平铺；原始证据在容器output专用目录。
- 主checkout与Figma工作树不写入；基线只允许降低。

## Review Focus

- 类型导入、别名、动态加载或未解析内部路径不能绕过边界（任务1）。
- 三节点环、同一SCC中新边与同数量替换违规不能绕过数量检查（任务1）。
- 改候选baseline不得把新增违规一起放行；初建不能混产品修改（任务2）。
- index入口和合理schema/逻辑配对必须可用，宿主加载器不能误判为插件（任务1）。
- 新门禁必须进入lint/verify，原有domain/server-only保护保持生效（任务2）。

## Task 1：架构检查与故障注入

**Files:** 创建config/architecture-rules.cjs、scripts/governance/check-architecture.mjs、tests/unit/architectureRules.test.ts；修改package.json/package-lock.json仅添加开发依赖。

**Interfaces:** `collectArchitecture(root)`返回按R1–R8分类的稳定依赖集合；`compareArchitecture(current, baseline, previousBaseline)`返回issues/reductions；`checkArchitecture(root, {baseRef})`执行实际文件/Git检查并返回结果。

- [x] 编写真实临时夹具与集合棘轮测试，运行并记录RED。
- [x] 实现规则配置、依赖扫描、feature环边比较、同名新增检查，运行定向测试GREEN。
- [x] 检查未解析内部路径、type-only/query/re-export/动态字面量/require、别名和后缀，补test-like与重命名绕过回归。

## Task 2：治理接入与规则落位

**Files:** 创建config/architecture-baseline.json、docs/architecture/MODULARITY.md、ADR-026/027；修改scripts/check-governance.mjs、编码规范链接、文档/ADR索引、ledger生成视图、Project State/Handoff/PROGRESS。

- [x] 初建基线从本卡base扫描，核对与外部统计的差异；检查baseline扩容和bootstrap源码变化。
- [x] 新检查器直接接入既有governance调用链，保留import-boundaries。
- [x] 整理旧文件/证据迁移候选引用清单，只出清单不删不迁。
- [x] 落位现行规范和技术ADR，更新账本与索引。

## Task 3：验证与交付

- [x] 已执行typecheck/lint/test、治理、索引、Markdown、本卡格式与构建；完整verify因18项已证明继承的源码格式问题失败，未满足合流门禁。
- [ ] 独立上下文审核实际diff；修复阻断项并补回归证据。
- [ ] 核对产品零改动、原主checkout保护清单和当前base/head，形成可审阅提交。
- [ ] 仅在真实合流条件满足时整合/回收；远端分叉和主checkout dirty不得绕过。
