# 本地安全边界修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Root owns integration and all runtime/ports.

**Goal:** 修复不依赖额度的已复现本地边界问题，并用当前证据核对剩余任务和工作树规则。

**Architecture:** 复用现有工作树策略、CredentialStore 与测试证据分配器；不新建状态源、依赖、目录层级或产品功能。

**Tech Stack:** Node 24、TypeScript、Playwright、PowerShell、Tauri。

**Spec:** [spec.md](spec.md)。

## Global Constraints

不删除或移动文件；不写其他实体树；不打印秘密；不争用其他任务的1421/1423/Native；旧聊天原始归档和当前v3身份保持。base e11b87a5，fetch后origin/main f730f1dc，仅记录来源，不自动整合其他任务。

## Review Focus

Git查询失败、路径外逃和缺失登记必须拒绝；复用不被预算误阻断；凭据失败和迟到读取不污染有效状态；取消/报告故障保留旧证据；任务状态不以本地测试冒充Hosted/真实Provider完成。

- [x] 保全7个登记树的105项dirty、index/diff/status和all-ref bundle；独立逐副本哈希检查。工程外receipt见验证记录。
- [x] 策略实施者仅修改 `scripts/governance/worktree-policy.mjs` 与 `tests/unit/worktreeLifecycle.test.ts`，先保存真实RED，再最小修复与GREEN。
- [x] 凭据实施者仅修改 `src/features/ai-gateway/credentials.ts` 与 `tests/unit/aiGatewayCredentials.test.ts`，核对全部调用者、失败写与轮换，保存RED/GREEN。
- [x] 证据实施者仅修改 `tests/unit/testEvidence.test.ts`，补真实取消/报告故障、子环境隔离，不启动浏览器或Provider。
- [x] root核对三组diff、版本和文档，运行完整verify与适用Native验证；当前主库先保全再正常关闭重开，不发新消息。
- [x] 固定提交独立复审、Delivery、当前分支/工作树实测和最终保全，按实际结果同步账本。

- 补充：固定25ff独审发现ENV-001，按混合大小写真实RED修复为92643d67并重跑全verify/双轴补审；旧阻断保留。规则祖先和5失效路由同步；宽图仅局部复证，不提高父任务/功能成熟度。最终文档HEAD/Delivery及日常启动按提交后工程外收据核对。
