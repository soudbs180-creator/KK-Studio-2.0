# Task ledger

Generated from `task-ledger.json` by `npm run governance:write`; do not edit this view directly.

Historical DONE applies only to the linked verification scope. The full-project objective remains open until every applicable task and integration gate is verified.

| ID | Title | Status | Dependencies | Owner |
| --- | --- | --- | --- | --- |
| T0 | 可复现候选源码与主线整合 | DONE | none | root |
| TASK-GOV-001 | 治理源、ESLint、架构门禁和 CI | DONE | T0 | root |
| TASK-PROV-001 | 冷却恢复与产品调度入口边界 | DONE | TASK-GOV-001 | root |
| T1 | 读取保护、备份和 revision 冲突 | DONE | T0 | root |
| T2 | 画布图持久化与稳定节点身份 | DONE | T0 | root |
| T3a | 原生素材及引用最终验收 | DONE | T1, T2 | root |
| T3b | 完整项目包导出导入与恢复 | DONE | T3a | root |
| T4 | 统一实际图片生成入口及健康语义 | DONE | T3b, TASK-PROV-001 | root |
| T5 | 持久本地 TaskHost 与未知受理恢复 | PARTIAL | T4 | root |
| T6 | Desktop ComfyUI最小链实现 | PARTIAL | T5 | root |
| EXT-PROVIDER | 真实 Provider/GPU 生成验收 | BLOCKED | T4 | root |
| EXT-COMFY | 真实 ComfyUI/模型验收 | BLOCKED | T6 | root |
| T7 | Desktop可用版本及安装恢复验收 | TODO | T3b, T4, T5, T6, EXT-PROVIDER, EXT-COMFY | root |
| T8 | 成熟Core职责和平台能力边界 | TODO | T7 | root |
| T9 | Web本地版及浏览器容量/离线能力 | TODO | T8 | root |
| T10-PREP | VPS发布、备份回滚与部署配置准备 | TODO | T9 | root |
| T10 | VPS staging和生产实机验收 | BLOCKED | T10-PREP | root |
| T11 | 旧Web/Vercel切换与退役 | BLOCKED | T10 | root |
| T12 | Mobile 2.0适配 | TODO | T11 | root |
| UI-001 | UI tokens和共享组件契约 | PARTIAL | TASK-GOV-001, TASK-DS-001 | root |
| UI-002 | 窄屏composer和动态文案溢出 | DONE | UI-001 | root |
| UI-003 | 示例任务/账号与真实服务边界 | PARTIAL | UI-001 | root |
| UI-004 | 逐页对齐、IA和最终视觉运行态 | PARTIAL | UI-002, UI-003, TASK-DS-001 | root |
| PERF-001 | 原生素材缩略图/分页及内存IO | PARTIAL | T3a | root |
| EXT-GIT | 远端PR与main保护规则 | DONE | TASK-GOV-001, T0 | root |
| TEST-PROV-001 | Provider真实入口浏览器回归 | DONE | TASK-GOV-001 | root |
| TASK-ASTRA-001 | Astra 迁移计划与 Git 分支规则同步 | DONE | T0, TASK-GOV-001 | root |
| TASK-KK2-MAIN-SYNC | KK Studio 2.0 本地与云端 main 树同步 | DONE | T0, TASK-GOV-001 | root |
| TASK-UI-UNMERGED-001 | dirty checkout 未合并 UI 回归候选 | DONE | TASK-GOV-001 | root |
| TASK-UI-MAIN-001 | 现行Figma页面校正与交互修复主线整合 | DONE | TASK-GOV-001, TASK-KK2-MAIN-SYNC | root |
| TASK-UI-DISMISS-002 | 窄屏侧栏关闭与大图重绘稳定性 | DONE | TASK-UI-MAIN-001 | root |
| TASK-MAIN-CLOSE-002 | 未完成子任务汇总验收与主线同步 | DONE | TASK-UI-MAIN-001 | root |
| TASK-UI-CLOSE-003 | 现行Figma页面缺口复核与交互收口 | DONE | TASK-UI-MAIN-001 | finish_figma_pages |
| TASK-PERF-ASSETS-001 | 素材列表元数据和原件按需读取 | DONE | T3a | finish_asset_performance |
| TASK-GOV-002 | 跨AI自主开发与分支质量门禁 | DONE | TASK-GOV-001, TASK-KK2-MAIN-SYNC | root |
| TASK-AUDIT-SEC-001 | 安全边界与异常任务状态审计 | REVIEW | TASK-GOV-001 | root |
| TASK-CAP-001 | 本地 Skill/MCP/ComfyUI 能力补齐 | PARTIAL | TASK-GOV-001, T6 | root |
| TASK-MINIMAX-001 | MiniMax Design 交互审计与本地技能/MCP复刻 | PARTIAL | TASK-GOV-002 | root |
| FEATURE-SYSTEM | 功能卡片体系、状态看板与后端化路线 | DONE | TASK-KK2-MAIN-SYNC | root |
| BACKEND-IMAGE-PARAMS | 图片比例与清晰度真实透传供应商 | PARTIAL | none | root |
| BACKEND-TEXT-NODE | 文本节点接入统一任务宿主 | PARTIAL | T5 | root |
| BACKEND-MEDIA-001 | 视频与音频节点真实生成链 | TODO | T5 | root |
| BACKEND-MCP-AUTO | MCP 工具自动调用编排 | TODO | TASK-CAP-001 | root |
| BACKEND-PLATFORM | 平台账号/积分/云同步/记忆/代理后端 | TODO | T10-PREP, T10 | root |
| BACKEND-ASTRA-001 | Astra 研究助手实现 | TODO | TASK-ASTRA-001 | root |
| UI-SKILL-POPOVER-001 | 窄屏首页弹层遮挡修复与 Skill 空态断言更新 | DONE | TASK-CAP-001 | root |
| TASK-RULES-003 | 修复功能状态与运行证据门禁 | DONE | none | root |
| BACKEND-CONVERSATION | 对话面板文本多轮能力与实际状态收敛 | PARTIAL | none | root |
| TASK-DS-001 | Design System校正与公共UI对齐 | PARTIAL | none | root |
| TASK-DS-002 | Design System逐页迁移与桌面验收 | DONE | TASK-DS-001 | root |
| TASK-UI-005 | 新增功能 UI 入口与能力展示对齐 | DONE | TASK-DS-002 | root |
| TASK-UI-006 | 折叠与弹层交互、画布重叠和缩放背景修复 | DONE | TASK-UI-005 | root |
| TASK-AGENT-001 | 默认 Codex 主 Agent 与 KK 生成任务接入 | PARTIAL | none | root |
| TASK-AGENT-002 | 桌面本地 Agent 托管与其他登录软件适配 | PARTIAL | TASK-AGENT-001 | root |
| TASK-UI-007 | 手机平板电脑三档尺寸与图标对齐 | DONE | TASK-UI-006, TASK-AGENT-001 | root |
| TASK-UI-008 | 重新制定创作输入框规范并统一三档实现 | DONE | TASK-UI-007, TASK-AGENT-002 | root |
| TASK-AGENT-003 | Agent 图片附件、画布引用与视口选择操作 | DONE | TASK-AGENT-001, TASK-AGENT-002 | root |
| PLUGIN-DESKTOP-001 | 修复桌面画布插件的 CSP 加载路径 | TODO | none | root |
| REL-2.1.0 | 2.1.0 本地集成与源码上传 | REVIEW | none | root |
| TASK-RULES-004 | 现行规则与 Markdown 一致性审计 | DONE | REL-2.1.0 | root |
| TASK-DOCS-HISTORY-001 | 历史 Markdown 链接与缺失日志勘误 | TODO | TASK-RULES-004 | root |
| TASK-PROV-002 | 多供应商接入与多目标配置（Provider Connectivity） | REVIEW | none | root |
| TASK-PROV-003 | Codex Provider 配置注入与 model catalog 落盘（agent 侧接线） | REVIEW | TASK-PROV-002 | root |

## T0 — 可复现候选源码与主线整合

- Goal: 可复现候选源码与主线整合
- Scope: Git, package.json, release
- Acceptance: 保留原工作区与索引; 候选快照可从干净 checkout 重建; 验证后整合主线且产物对应提交
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: Git, package.json, release
- Verification: PASS — 本地main整合 PASS：从609f524快进86c40d0并合入14dbe11；原checkout dirty/index保留；main执行npm ci/verify、Rust检查、Tauri release和隔离桌面运行。
- Evidence: [docs/changes/2026-09-17-governance-baseline/verification.md](../../docs/changes/2026-09-17-governance-baseline/verification.md), [docs/architecture/adr/ADR-002-local-main-integration.md](../../docs/architecture/adr/ADR-002-local-main-integration.md), [docs/changes/2026-09-17-provider-submission-gates/verification.md](../../docs/changes/2026-09-17-provider-submission-gates/verification.md), [docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json](../../docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json)
- Updated: 2026-09-18

## TASK-GOV-001 — 治理源、ESLint、架构门禁和 CI

- Goal: 治理源、ESLint、架构门禁和 CI
- Scope: AGENTS.md, docs/governance, scripts, tests, package.json, .github, src lint corrections
- Acceptance: 账本 schema/依赖/证据校验可执行; ESLint errors=0; 实际完整 verify 与 Rust compile; 规则不把局部通过当全项目 DONE
- Branch: `chore/TASK-GOV-001-engineering-baseline`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-GOV-001`
- Modules: AGENTS.md, docs/governance, scripts, tests, package.json, .github, src lint corrections
- Verification: PASS — 治理本地验收 PASS：干净提交 npm ci/verify，115 Node、139 Edge、UI116/0、lint/typecheck/format/build；Rust36/fmt/check/release build；1421与Tauri隔离运行检查通过。远端整合另见 EXT-GIT/T0，产品验收另见后续任务。
- Evidence: [docs/changes/2026-09-17-governance-baseline/spec.md](../../docs/changes/2026-09-17-governance-baseline/spec.md), [docs/changes/2026-09-17-governance-baseline/verification.md](../../docs/changes/2026-09-17-governance-baseline/verification.md), [docs/evidence/governance-2026-09-17/verification.json](../../docs/evidence/governance-2026-09-17/verification.json)
- Updated: 2026-09-17

## TASK-PROV-001 — 冷却恢复与产品调度入口边界

- Goal: 冷却到期恢复调度且保留隔离/并发边界
- Scope: 首页、对话、审批、重试/恢复的绑定连接校验和实际HTTP提交边界
- Acceptance: 统一时钟覆盖 deadline 前/时/后; 缺 deadline 的冷却和 quarantined/disabled/degraded 均不可选; 满载和不支持操作不可选; 首页/对话/重试在实际提交前检查绑定连接，不回退绕过隔离/冷却
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: src/domain/providerConnections.ts, src/features/creation/generationQueue.ts, tests/unit/generationQueue.test.ts, src/App.tsx, src/features/creation/providerRegistry.ts, tests/browser/provider-scheduling.spec.ts
- Verification: PASS — 源修复、本地main合并和桌面生产复验 PASS：118 unit、151 browser、UI116/0；主线14dbe11加载CBwa_Zj7 bundle并完成隔离Provider提交。
- Evidence: [docs/changes/2026-09-17-provider-submission-gates/verification.md](../../docs/changes/2026-09-17-provider-submission-gates/verification.md), [docs/evidence/provider-submission-2026-09-18/README.md](../../docs/evidence/provider-submission-2026-09-18/README.md), [docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json](../../docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json)
- Updated: 2026-09-18

## T1 — 读取保护、备份和 revision 冲突

- Goal: 读取保护、备份和 revision 冲突
- Scope: src/features/creation/storage.ts, src-tauri/src/creation_storage.rs, src/domain/projectCanvas.ts
- Acceptance: 已记录范围内Web恢复及原生正常重启不丢数据; 失败不覆盖原件
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation/storage.ts, src-tauri/src/creation_storage.rs, src/domain/projectCanvas.ts
- Verification: PASS — 2026-09-16 原生及Web验收记录，仅该记录范围；不证明断电、未提交编辑或完整产品就绪
- Evidence: [docs/changes/2026-09-16-desktop-data-stability/verification.md](../../docs/changes/2026-09-16-desktop-data-stability/verification.md)
- Updated: 2026-09-17

## T2 — 画布图持久化与稳定节点身份

- Goal: 画布图持久化与稳定节点身份
- Scope: src/features/creation/storage.ts, src-tauri/src/creation_storage.rs, src/domain/projectCanvas.ts
- Acceptance: 已记录范围内Web恢复及原生正常重启不丢数据; 失败不覆盖原件
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation/storage.ts, src-tauri/src/creation_storage.rs, src/domain/projectCanvas.ts
- Verification: PASS — 2026-09-16 原生及Web验收记录，仅该记录范围；不证明断电、未提交编辑或完整产品就绪
- Evidence: [docs/changes/2026-09-16-desktop-data-stability/verification.md](../../docs/changes/2026-09-16-desktop-data-stability/verification.md)
- Updated: 2026-09-17

## T3a — 原生素材及引用最终验收

- Goal: 原生素材及引用最终验收
- Scope: src-tauri/src/asset_storage.rs, src/features/creation/assetRepository.ts, src/features/creation/snapshotAssets.ts
- Acceptance: 原图hash一致; 新WebView恢复; 缺失原件冻结保存; 原生/浏览器证据与最终build对应
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src-tauri/src/asset_storage.rs, src/features/creation/assetRepository.ts, src/features/creation/snapshotAssets.ts
- Verification: PASS — main@c855881 的 Node 24/Web/Rust/Tauri release 验证通过；隔离数据根目录与三个全新 WebView profile 验证原生素材 SHA-256、快照引用恢复和篡改后读取保护。T3b 项目包仍未完成。
- Evidence: [docs/changes/2026-09-16-native-assets/spec.md](../../docs/changes/2026-09-16-native-assets/spec.md), [docs/changes/2026-09-16-native-assets/verification.md](../../docs/changes/2026-09-16-native-assets/verification.md), [docs/evidence/native-assets-2026-09-18/native-acceptance.json](../../docs/evidence/native-assets-2026-09-18/native-acceptance.json), [docs/evidence/native-assets-2026-09-18/build-artifacts.json](../../docs/evidence/native-assets-2026-09-18/build-artifacts.json)
- Updated: 2026-09-18

## T3b — 完整项目包导出导入与恢复

- Goal: 完整项目包导出导入与恢复
- Scope: src/features/projects, src-tauri, src/components
- Acceptance: 包包含所有项目图与原件; schema/checksum/引用预检; 隔离数据根目录恢复; 非法包/写失败不损原件
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: src/features/projects, src-tauri, src/components
- Verification: PASS — 源码 main@379b302：129 unit、156 browser、UI117/0、50 Rust、fmt/check/release 通过；全新 WebView/独立 data root 恢复 2 项目/3 节点/图/消息/任务/原件；7 个事务故障点保留源文件。Web 文件适配归 T9，Figma 新入口为工程补充。
- Evidence: [docs/changes/2026-09-18-project-package/intent.md](../../docs/changes/2026-09-18-project-package/intent.md), [docs/changes/2026-09-18-project-package/spec.md](../../docs/changes/2026-09-18-project-package/spec.md), [docs/changes/2026-09-18-project-package/plan.md](../../docs/changes/2026-09-18-project-package/plan.md), [docs/changes/2026-09-18-project-package/verification.md](../../docs/changes/2026-09-18-project-package/verification.md), [src/features/projects/projectPackage.ts](../../src/features/projects/projectPackage.ts), [src/features/projects/nativeProjectPackageAdapter.ts](../../src/features/projects/nativeProjectPackageAdapter.ts), [tests/unit/projectPackage.test.ts](../../tests/unit/projectPackage.test.ts), [src-tauri/src/project_package.rs](../../src-tauri/src/project_package.rs), [docs/evidence/project-package-2026-09-18/native-acceptance.json](../../docs/evidence/project-package-2026-09-18/native-acceptance.json), [docs/evidence/project-package-2026-09-18/web-acceptance.json](../../docs/evidence/project-package-2026-09-18/web-acceptance.json)
- Updated: 2026-09-18

## T4 — 统一实际图片生成入口及健康语义

- Goal: 统一实际图片生成入口及健康语义
- Scope: src/App.tsx, src/features/creation, src/integrations/generation, src/components/nodes
- Acceptance: 首页/对话/画布走同一command; 已配置不冒充已验证; 参考图不丢弃; 失败/取消/离线与归档完整
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: src/App.tsx, src/features/creation, src/integrations/generation, src/components/nodes
- Verification: PASS — 本地main源码2de3c68：146 unit/164 browser/UI119/0全量verify通过；Rust51/fmt/check/release通过；1421/1423/Tauri三入口与全新WebView原件恢复通过。动画测试改为真实CSS时间点采样后全量无重试通过。真实付费Provider仍属EXT-PROVIDER。
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md), [docs/changes/2026-09-18-unified-image-command/verification.md](../../docs/changes/2026-09-18-unified-image-command/verification.md), [docs/evidence/unified-image-command-2026-09-18/native-acceptance.json](../../docs/evidence/unified-image-command-2026-09-18/native-acceptance.json), [docs/evidence/unified-image-command-2026-09-18/main/native-acceptance.json](../../docs/evidence/unified-image-command-2026-09-18/main/native-acceptance.json)
- Updated: 2026-09-18

## T5 — 持久本地 TaskHost 与未知受理恢复

- Goal: 持久本地 TaskHost 与未知受理恢复
- Scope: src/features/generation-server, src-tauri, src/features/creation, deploy
- Acceptance: durable intent先于提交; 重启同一身份不重复计费; unknown不可直接普通retry; 本地宿主随包且不依赖VPS
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: src/features/generation-server, src-tauri, src/features/creation, deploy
- Verification: PARTIAL — 集成 main 已将 durable intent、稳定幂等身份、unknown 受理保护、原生 TaskHost journal、系统凭据库读取、Desktop IPC、取消竞态和逐 slot 输出提交接入 Tauri 主进程；npm verify 150/169、UI119/0，Rust 58/58，client check/release 通过。隔离 Tauri/WebView 的提交、取消、进程重启和逐 slot 恢复证据尚未完成；部署脚本仅覆盖静态 Web Prototype。
- Evidence: [docs/changes/2026-09-19-taskhost-durable-intent/verification.md](../../docs/changes/2026-09-19-taskhost-durable-intent/verification.md), [tests/browser/task-intent.spec.ts](../../tests/browser/task-intent.spec.ts), [tests/unit/nativeTaskHost.test.ts](../../tests/unit/nativeTaskHost.test.ts), [deploy/README.md](../../deploy/README.md)
- Updated: 2026-09-19

## T6 — Desktop ComfyUI最小链实现

- Goal: Desktop ComfyUI最小链实现
- Scope: src/integrations/generation/localComfyUiAdapter.ts, src-tauri, src/features/comfyui
- Acceptance: 能力探测/模板/任务/素材/恢复完整接线; 不自动下载模型; 仅取消本任务; Web禁用原生能力
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/integrations/generation/localComfyUiAdapter.ts, src-tauri, src/features/comfyui
- Verification: PARTIAL — 只读审计确认：localComfyUiAdapter.ts 具备 /prompt、/history、/view、/interrupt HTTP 原语，但 App/imageTaskCommand 尚未接入，local_only 明确拒绝；Tauri ComfyUI 命令尚无前端 invoke 桥，缺少 Desktop-only workflow/template 持久化、任务 journal、逐任务取消、结果归档与重启恢复。下一步需先接一条显式 workflow 的最小链，不下载模型；EXT-COMFY 仍等待用户选定服务、目录、workflow 和模型。
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Updated: 2026-09-17

## EXT-PROVIDER — 真实 Provider/GPU 生成验收

- Goal: 真实 Provider/GPU 生成验收
- Scope: Provider live acceptance
- Acceptance: 授权真实服务执行最小生成和编辑; 结果持久化与成本语义真实
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Provider live acceptance
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/verification.md](../../docs/changes/2026-09-16-launch-readiness-audit/verification.md)
- External condition: 缺少本轮授权可用的Provider凭据、服务与模型；本地mock不能替代
- Updated: 2026-09-17

## EXT-COMFY — 真实 ComfyUI/模型验收

- Goal: 真实 ComfyUI/模型验收
- Scope: ComfyUI live acceptance
- Acceptance: 真实workflow成功/缺模型/断连/重启与原图hash验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: ComfyUI live acceptance
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/verification.md](../../docs/changes/2026-09-16-launch-readiness-audit/verification.md)
- External condition: 尚无已确认的用户选择ComfyUI目录、运行服务、workflow与模型
- Updated: 2026-09-17

## T7 — Desktop可用版本及安装恢复验收

- Goal: Desktop可用版本及安装恢复验收
- Scope: release, tests/native
- Acceptance: 干净Windows安装完整故事; 离线/损坏恢复; 最终exe/commit/hash对应; 可回滚
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: release, tests/native
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Updated: 2026-09-17

## T8 — 成熟Core职责和平台能力边界

- Goal: 成熟Core职责和平台能力边界
- Scope: src/App.tsx, src/domain, src/runtime, src/features
- Acceptance: 按职责拆分composition root; UI通过服务与平台能力接口; Desktop回归保持
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/App.tsx, src/domain, src/runtime, src/features
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Updated: 2026-09-17

## T9 — Web本地版及浏览器容量/离线能力

- Goal: Web本地版及浏览器容量/离线能力
- Scope: src/components/Sidebar.tsx, src/components/LibraryPage.tsx, src/runtime, src/features/creation
- Acceptance: 无Comfy/原生假入口; 配额错误/持久存储/离线恢复; 项目包跨origin; 会话凭据不持久化
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/components/Sidebar.tsx, src/components/LibraryPage.tsx, src/runtime, src/features/creation
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Updated: 2026-09-17

## T10-PREP — VPS发布、备份回滚与部署配置准备

- Goal: VPS发布、备份回滚与部署配置准备
- Scope: deploy, scripts/release
- Acceptance: 独立next服务不覆盖旧站; 部署配置/health/权限/资源限制; 备份还原及回滚runbook可审阅
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: deploy, scripts/release
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Updated: 2026-09-17

## T10 — VPS staging和生产实机验收

- Goal: VPS staging和生产实机验收
- Scope: VPS, DNS, TLS
- Acceptance: 用户域名直达VPS; 外网TLS/鉴权/端口实测; 备份恢复及回滚演练
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: VPS, DNS, TLS
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/verification.md](../../docs/changes/2026-09-16-launch-readiness-audit/verification.md)
- External condition: 缺少本轮生产写入授权、正式/staging域名和DNS权限；先完成可审阅部署产物
- Updated: 2026-09-17

## T11 — 旧Web/Vercel切换与退役

- Goal: 旧Web/Vercel切换与退役
- Scope: Vercel, DNS, legacy migration
- Acceptance: 旧origin可导出备份; 新站验收后有限回滚窗口; 逐项退役不删除用户数据
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Vercel, DNS, legacy migration
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- External condition: 需外部旧部署权限、切换授权与回滚窗口
- Updated: 2026-09-17

## T12 — Mobile 2.0适配

- Goal: Mobile 2.0适配
- Scope: Mobile, Shared Core
- Acceptance: 保留移动交互; 正式目标runtime明确; 共享新契约/本地恢复; 真机验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Mobile, Shared Core
- Verification: NOT_VERIFIED — 当前MUR不含；全项目范围仍保留TODO，形态需产品决定
- Evidence: [docs/changes/2026-09-16-launch-readiness-audit/plan.md](../../docs/changes/2026-09-16-launch-readiness-audit/plan.md)
- Updated: 2026-09-17

## UI-001 — UI tokens和共享组件契约

- Goal: UI tokens和共享组件契约
- Scope: src/styles, src/components/ui, scripts/check-ui-standards.mjs
- Acceptance: 可执行token/图标/状态规范; 按语义组件迁移; Figma节点例外有证据
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/styles, src/components/ui, scripts/check-ui-standards.mjs
- Verification: PARTIAL — Design System 1.1共享控件已建立；目录/Skill字段/筛选、图标按钮、设置局部覆盖继续迁移并取得双端证据。其余历史专项页面与来源例外继续按实际组件验收，保留PARTIAL。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/plan.md](../../docs/changes/2026-09-16-ui-system-audit/plan.md), [docs/changes/2026-09-22-design-system/verification.md](../../docs/changes/2026-09-22-design-system/verification.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md)
- Updated: 2026-09-22

## UI-002 — 窄屏composer和动态文案溢出

- Goal: 窄屏composer和动态文案溢出
- Scope: src/components/StartComposer.tsx, src/styles, src/components/ConversationPanel.tsx
- Acceptance: 390/768/1440/1920主操作可达; 长模型文案不遮挡; 同状态DOM/截图; 键盘焦点与IME保持
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components/StartComposer.tsx, src/styles, src/components/ConversationPanel.tsx
- Verification: PASS — 已选择性整合原root UI候选；最终verify150 Node/190浏览器/UI119/0、Rust60与dev/preview/桌面34页面矩阵均通过。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/audit.md](../../docs/changes/2026-09-16-ui-system-audit/audit.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md)
- Updated: 2026-09-20

## UI-003 — 示例任务/账号与真实服务边界

- Goal: 示例任务/账号与真实服务边界
- Scope: src/components/canvas/TaskPanel.tsx, src/components/AccountPopup.tsx, src/components/settings
- Acceptance: 空真实任务不冒充正在生成; fixture首屏可辨识; 不可用服务说明一致; Figma/运行态验收
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components/canvas/TaskPanel.tsx, src/components/AccountPopup.tsx, src/components/settings
- Verification: PARTIAL — 交互和真实服务说明已在origin/main候选完成整合，定向浏览器回归通过；最终主线同步见TASK-UI-MAIN-001。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/audit.md](../../docs/changes/2026-09-16-ui-system-audit/audit.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md)
- Updated: 2026-09-20

## UI-004 — 逐页对齐、IA和最终视觉运行态

- Goal: 逐页对齐、IA和最终视觉运行态
- Scope: Landing, Workspace, Assets, Settings, Tasks, Account
- Acceptance: 当前Design System与已确认页面来源的同状态视觉对比; 六态及异步/键盘/离线; dev1421/preview1423/Tauri最终source分别确认
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: Landing, Workspace, Assets, Settings, Tasks, Account
- Verification: PARTIAL — 已取得当前项目库、Skills、ComfyUI目录与设置分区的Web/新版Tauri证据，包含长分类/浅色图标、16色主题矩阵、偏好Skill重启。缺失页面Frame与用户最终视觉验收仍未完成。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/plan.md](../../docs/changes/2026-09-16-ui-system-audit/plan.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md), [docs/changes/2026-09-22-design-system/verification.md](../../docs/changes/2026-09-22-design-system/verification.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md)
- Updated: 2026-09-22

## PERF-001 — 原生素材缩略图/分页及内存IO

- Goal: 原生素材缩略图/分页及内存IO
- Scope: src/features/creation/assetRepository.ts, src/features/creation/useAssetArchive.ts, src-tauri
- Acceptance: 原件与预览分离; 可见素材按需加载; 大型库有测量证据; 原图校验/来源不回归
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation/assetRepository.ts, src/features/creation/useAssetArchive.ts, src-tauri
- Verification: PARTIAL — 本轮已完成有界分页/预览和原件校验；永久缩略图、大快照和单件大图瞬时内存/不可抢占IO仍未完成。
- Evidence: [docs/architecture/DATA-STORAGE.md](../../docs/architecture/DATA-STORAGE.md), [docs/architecture/adr/ADR-003-asset-metadata-paging.md](../../docs/architecture/adr/ADR-003-asset-metadata-paging.md), [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md)
- Updated: 2026-09-21

## EXT-GIT — 远端PR与main保护规则

- Goal: 远端PR与main保护规则
- Scope: Git hosting
- Acceptance: remote明确并可访问; PR/required checks/block force/delete有效; 实际CI运行证据
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Git hosting
- Verification: PASS — 2026-09-23 用户确认仓库公开；PR #9 当前 head 的 hosted verify/delivery 均成功，已 squash 合入 main@b45c5bc7，合并树与候选树一致；合并后 main 工作流 35836597858 success。三个远端 ruleset 回读 active（23866923/23866924/23866925），main protected=true，有效规则含 PR、必需检查、禁止删除和非快进。管理员仍可修改规则。
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md), [docs/changes/2026-09-20-gpt-6-astra/verification.md](../../docs/changes/2026-09-20-gpt-6-astra/verification.md), [docs/changes/2026-09-23-rules-audit-main/verification.md](../../docs/changes/2026-09-23-rules-audit-main/verification.md)
- Updated: 2026-09-23

## TEST-PROV-001 — Provider真实入口浏览器回归

- Goal: 独立复现旧入口绕过并验证拒绝不发送HTTP
- Scope: tests/browser/provider-scheduling.spec.ts
- Acceptance: 首页拒绝保持草稿; 审批后二次检查与固定连接不回退; 429冷却到期重试及403隔离
- Branch: `main`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-INTEGRATION-001`
- Modules: tests/browser/provider-scheduling.spec.ts
- Verification: PASS — 12项浏览器回归和3项submission gate单元测试 PASS；主线verify及桌面运行证据已复验。
- Evidence: [docs/changes/2026-09-17-provider-submission-gates/verification.md](../../docs/changes/2026-09-17-provider-submission-gates/verification.md), [docs/evidence/provider-submission-2026-09-18/baseline-red.txt](../../docs/evidence/provider-submission-2026-09-18/baseline-red.txt), [docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json](../../docs/evidence/provider-submission-2026-09-18/native-main-acceptance.json)
- Updated: 2026-09-18

## TASK-ASTRA-001 — Astra 迁移计划与 Git 分支规则同步

- Goal: 以最新 main 校正 Astra 计划并向用户指定的 2.0 仓库安全同步
- Scope: 计划文档、适用规则审计、治理记录、明确范围的 Git 同步
- Acceptance: 基于已验收 main，保护原工作区与索引; 计划与 T3b/T4/T5 现状一致; 适用规则和 Git 目标身份核对; 指定新远端后仅推明确范围任务分支并交付可审阅 PR
- Branch: `codex/TASK-KK2-main-integration`
- Worktree: `C:/Users/Administrator/.codex/worktrees/task-astra-001/kk-studio-next`
- Modules: docs/changes/2026-09-20-gpt-6-astra, docs/governance, docs/PROGRESS.md
- Verification: PASS — 迁移计划、规则审计、目录清理、本地验证和目标仓库 PR 同步均完成；Astra 应用功能本身仍按计划待实施。
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/verification.md](../../docs/changes/2026-09-20-gpt-6-astra/verification.md), [docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md)
- Updated: 2026-09-20

## TASK-KK2-MAIN-SYNC — KK Studio 2.0 本地与云端 main 树同步

- Goal: 将目标仓库 main 的当前文件树替换为已验证的本地 KK Studio 2.0 main，并保持两端 tree 一致
- Scope: Git hosting、全仓库文件树、main 分支同步
- Acceptance: 本地 main 已从最新已验收提交快进整合; 目标远端 main 的替换分支只基于远端 main 创建; 替换分支 tree SHA 与本地 main 完全一致; secret/path/构建产物扫描通过且旧 v1.6.1 当前文件不再出现在候选树; PR 合并后回读远端 main SHA/tree SHA 与本地 main 一致
- Branch: `chore/TASK-KK2-MAIN-SYNC`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-KK2-MAIN-SYNC`
- Modules: Git hosting, repository tree, main
- Verification: PASS — PR #1 已 squash 合并到目标 main；远端 main 回读 commit=a9db71b，tree=a3cad24，与本地稳定 main tree 相同；候选 quality workflow 全部成功。
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md), [docs/changes/2026-09-20-gpt-6-astra/verification.md](../../docs/changes/2026-09-20-gpt-6-astra/verification.md), [docs/changes/2026-09-20-gpt-6-astra/sync-manifest.md](../../docs/changes/2026-09-20-gpt-6-astra/sync-manifest.md), [docs/changes/2026-09-20-gpt-6-astra/source-sync-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/source-sync-audit.md)
- Updated: 2026-09-20

## TASK-UI-UNMERGED-001 — dirty checkout 未合并 UI 回归候选

- Goal: 审查并在独立分支验收脏工作区中发现的 UI 交互修复
- Scope: UI interaction/regression
- Acceptance: 复核 useDismissible、Modal、TopBar、TaskPanelPopover、settings focus/switch 改动的源代码差异; 从最新稳定 main 建立独立 task branch/worktree，不复制 dirty checkout 全量内容; 运行定向浏览器回归和完整 verify，并保留同状态证据
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components/useDismissible.ts, src/components/Modal.tsx, src/components/TopBar.tsx, src/components/TaskPanelPopover.tsx, src/components/settings/SettingsControls.tsx, src/components/settings/ConnectionSettings.tsx, tests/browser
- Verification: PASS — 已选择性整合原root UI候选；最终verify150 Node/190浏览器/UI119/0、Rust60与dev/preview/桌面34页面矩阵均通过。
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/source-sync-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/source-sync-audit.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md)
- Updated: 2026-09-20

## TASK-UI-MAIN-001 — 现行Figma页面校正与交互修复主线整合

- Goal: 将审阅的交互/视觉修复和当前主线功能整合并经PR同步
- Scope: UI geometry, popover lifecycle, selective integration, main provenance
- Acceptance: 原root候选选择性三方整合，保留T3b/T4/T5; 现行Figma有节点页面同状态DOM与截图; 完整verify、Rust与三种运行模式通过; PR/CI及本地云端main同一提交回读；原工作区有可校验备份
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components, src/styles, src-tauri/src/main.rs, tests/browser, scripts/audit, docs/governance
- Verification: PASS — PR #3 已 squash 合并；双 CI 通过（npm verify、Rust fmt/60 tests、client check/build）；远端 main 与本地 main 均为 fb57529c；409项原工作逐项备份并归档，根目录工作树干净。UI-004 的独立设计来源缺口另行记录，不改变本任务已验证范围。
- Evidence: [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md), [docs/changes/2026-09-20-ui-main-alignment/review.md](../../docs/changes/2026-09-20-ui-main-alignment/review.md)
- Updated: 2026-09-20

## TASK-UI-DISMISS-002 — 窄屏侧栏关闭与大图重绘稳定性

- Goal: 修复跨断点菜单关闭及大图重绘字节转换，校正异步审批回归时序
- Scope: Sidebar dismissal stack and large-image redraw conversion/regression budget
- Acceptance: 重现跨断点+键盘展开场景; 账号关闭后侧栏保持可操作，后续外部点击仍收起侧栏; 完整浏览器回归及dev/preview/Desktop专项通过
- Branch: `codex/TASK-UI-MAIN-001-followup`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: src/components/Sidebar.tsx, tests/browser/menu-boundaries.spec.ts, tests/browser/unified-image-command.spec.ts, src/features/creation/assetRepository.ts, src/features/creation/imageGeneration.ts, tests/browser/task-intent.spec.ts
- Verification: PASS — 最终完整verify通过：150 Node、191浏览器、0失败/重试；三运行模式专项通过；2.35MB重绘20倍CPU连续3次通过，完整原图字节断言保留。中途unknown用例重试已定位并修正异步审批等待。
- Evidence: [docs/changes/2026-09-20-ui-main-alignment/followup.md](../../docs/changes/2026-09-20-ui-main-alignment/followup.md), [docs/evidence/2026-09-20-ui-main-alignment/followup/browser-summary.json](../../docs/evidence/2026-09-20-ui-main-alignment/followup/browser-summary.json)
- Updated: 2026-09-20

## TASK-MAIN-CLOSE-002 — 未完成子任务汇总验收与主线同步

- Goal: 未完成子任务汇总验收与主线同步
- Scope: review, regression stability, governance reconciliation, main parity
- Acceptance: 独立审阅页面和素材子任务; 完整验证与三模式运行证据; 经PR与CI同步本地及云端main
- Branch: `codex/TASK-MAIN-CLOSE-002`
- Worktree: `C:/Users/Administrator/.codex/worktrees/task-main-close-002/kk-studio-next`
- Modules: tests/browser, docs/governance, docs/PROGRESS.md
- Verification: PASS — 历史候选 bb96dad 的本地 verify 为 172 Node、197 browser、UI121/0，Rust61/61、fmt、client check 通过；三模式 runtime 证据源为 8369185。PR #8 最终 head dac81ec 是 PR #9 head da811283 的祖先；PR #9 当前候选 hosted verify/delivery 成功并 squash 合入 main@b45c5bc7，完整树回读一致。PR #8 因内容被吸收已关闭而未重复合并；旧分支和历史证据保留。
- Evidence: [docs/changes/2026-09-20-main-close-002/intent.md](../../docs/changes/2026-09-20-main-close-002/intent.md), [docs/changes/2026-09-20-main-close-002/spec.md](../../docs/changes/2026-09-20-main-close-002/spec.md), [docs/changes/2026-09-20-main-close-002/plan.md](../../docs/changes/2026-09-20-main-close-002/plan.md), [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md), [docs/changes/2026-09-20-main-close-002/review.md](../../docs/changes/2026-09-20-main-close-002/review.md), [docs/evidence/2026-09-21-main-close-002/verify-run.json](../../docs/evidence/2026-09-21-main-close-002/verify-run.json)
- Updated: 2026-09-23

## TASK-UI-CLOSE-003 — 现行Figma页面缺口复核与交互收口

- Goal: 现行Figma页面缺口复核与交互收口
- Scope: current Figma source, page interaction and visual evidence
- Acceptance: 重新读取现行设计来源; 可获得基准的页面同状态核对; 缺失设计来源和工程补充明确区分
- Branch: `codex/TASK-UI-CLOSE-003-figma`
- Worktree: `C:/Users/Administrator/.codex/worktrees/task-ui-close-003/kk-studio-next`
- Modules: src/components, src/styles, tests/browser
- Verification: PASS — 现行可取得Figma节点回读、快捷键边框修复、typecheck与整合三模式运行证据通过；Landing及若干缺失Frame不冒称完成。
- Evidence: [docs/changes/2026-09-20-main-close-002/intent.md](../../docs/changes/2026-09-20-main-close-002/intent.md), [docs/changes/2026-09-20-main-close-002/spec.md](../../docs/changes/2026-09-20-main-close-002/spec.md), [docs/changes/2026-09-20-main-close-002/plan.md](../../docs/changes/2026-09-20-main-close-002/plan.md), [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md), [docs/changes/2026-09-20-main-close-002/review.md](../../docs/changes/2026-09-20-main-close-002/review.md)
- Updated: 2026-09-21

## TASK-PERF-ASSETS-001 — 素材列表元数据和原件按需读取

- Goal: 素材列表元数据和原件按需读取
- Scope: asset listing, paging, previews and original preservation
- Acceptance: 素材列表不批量读取原件; 预览按需加载与分页; 大库测量和原图字节一致性验证
- Branch: `codex/TASK-PERF-ASSETS-001`
- Worktree: `C:/Users/Administrator/.codex/worktrees/task-perf-assets-001/kk-studio-next`
- Modules: src/features/creation, src/components/AssetPanel.tsx, src-tauri/src/asset_storage.rs
- Verification: PASS — 元数据分页、按需缩略图、原件SHA与错身份/损坏重试、Rust分页与临时文件边界均通过；完整性能边界另由PERF-001跟踪。
- Evidence: [docs/changes/2026-09-20-main-close-002/intent.md](../../docs/changes/2026-09-20-main-close-002/intent.md), [docs/changes/2026-09-20-main-close-002/spec.md](../../docs/changes/2026-09-20-main-close-002/spec.md), [docs/changes/2026-09-20-main-close-002/plan.md](../../docs/changes/2026-09-20-main-close-002/plan.md), [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md), [docs/changes/2026-09-20-main-close-002/review.md](../../docs/changes/2026-09-20-main-close-002/review.md), [docs/architecture/adr/ADR-003-asset-metadata-paging.md](../../docs/architecture/adr/ADR-003-asset-metadata-paging.md)
- Updated: 2026-09-21

## TASK-GOV-002 — 跨AI自主开发与分支质量门禁

- Goal: 落实共同规则、代码文档一致性、Git/CI防线和真实保护边界
- Scope: AI规则/SDLC/PR/Git防线/交付门禁/规则场景
- Acceptance: 入口统一、中文自然语言转工程任务; 真实push拒绝回归与delivery门禁通过; 规则、模板、脚本入口和账本绑定一致; 独立review和实际规则验证证据; 产品代码、产品测试、既有证据和其他人的提交保持只读
- Branch: `codex/TASK-GOV-002-closeout`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-GOV-002-CLOSEOUT`
- Modules: docs, scripts/governance, .github, .githooks, config, tests/unit/deliveryPolicy.test.ts, tests/unit/gitPushPolicy.test.ts, tests/evals
- Verification: PASS — PR #4、#7 已合入 main；当次 hosted delivery/verify、Rust fmt/test、client check、Tauri no-bundle build、治理35tasks/0、push9/9、delivery12/12、AI场景12/12、基线正反例2/2 均通过。先前 private 仓库的 ruleset API403 已由用户确认公开后解决；2026-09-23 三套 active ruleset 和 main 有效规则已回读，PR #9 当前 head 检查通过并合入 main。管理员仍可修改设置，模型实际读懂规则须另行演练；产品代码和旧证据不由本任务改写。
- Evidence: [docs/changes/2026-09-20-ai-sdlc/verification.md](../../docs/changes/2026-09-20-ai-sdlc/verification.md), [docs/changes/2026-09-21-ai-sdlc-closeout/verification.md](../../docs/changes/2026-09-21-ai-sdlc-closeout/verification.md), [docs/evidence/ai-sdlc-2026-09-20/remote-audit.json](../../docs/evidence/ai-sdlc-2026-09-20/remote-audit.json), [docs/changes/2026-09-23-rules-audit-main/verification.md](../../docs/changes/2026-09-23-rules-audit-main/verification.md)
- Updated: 2026-09-23

## TASK-AUDIT-SEC-001 — 安全边界与异常任务状态审计

- Goal: 修复已复现的凭据泄露、重复提交、Gateway配置陈旧、账户额度漂移、跨窗口租约竞态、原生响应内存和结果URL SSRF风险
- Scope: Web provider URL/state recovery, Gateway registration/authentication, native TaskHost journal/download limits
- Acceptance: Provider请求发出后取消或暂停进入unknown并禁止普通重试; 远程Provider只允许HTTPS，HTTP仅限本机回环地址; Gateway重启显式更新连接配置并撤销旧ACL，token冲突失败关闭; Gateway初始额度只在首次 provisioning 生效，额度配置漂移 fail closed，并发策略可安全更新; Web提交租约以Web Locks跨窗口串行协调，崩溃/旧元数据按live locks回收，不支持时拒绝提交; 原生Provider结果下载按同origin和DNS/IP策略收口并按流式总字节上限读取，任务journal替换不先删除原件
- Branch: `fix/TASK-AUDIT-SEC-001-boundaries`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-AUDIT-SEC-001`
- Modules: src/App.tsx, src/domain/modelProvider.ts, src/domain/providerConnections.ts, src/features/creation/taskRecovery.ts, src/features/generation-server/repository.ts, src/features/generation-server/http.ts, src/features/generation-server/main.ts, src-tauri/src/task_host.rs, tests/unit
- Verification: PASS — 最终 head 4a3c0db：178/178 Node、TypeScript、lint、format、UI119/0、Rust63/63、fmt/check、production build、production preview 191/191、Tauri no-bundle 与隔离 Tauri WebView2 均通过；固定 1421 被另一 worktree 占用，未终止且不归因于本分支。
- Evidence: [docs/changes/2026-09-21-security-audit/audit.md](../../docs/changes/2026-09-21-security-audit/audit.md), [docs/changes/2026-09-21-security-audit/verification.md](../../docs/changes/2026-09-21-security-audit/verification.md), [docs/changes/2026-09-21-security-audit-closeout/intent.md](../../docs/changes/2026-09-21-security-audit-closeout/intent.md), [docs/changes/2026-09-21-security-audit-closeout/spec.md](../../docs/changes/2026-09-21-security-audit-closeout/spec.md), [docs/changes/2026-09-21-security-audit-closeout/plan.md](../../docs/changes/2026-09-21-security-audit-closeout/plan.md), [docs/changes/2026-09-21-security-audit-closeout/verification.md](../../docs/changes/2026-09-21-security-audit-closeout/verification.md), [docs/changes/2026-09-21-security-audit-closeout/review.md](../../docs/changes/2026-09-21-security-audit-closeout/review.md)
- Updated: 2026-09-21

## TASK-CAP-001 — 本地 Skill/MCP/ComfyUI 能力补齐

- Goal: 复刻可安全落地的本地 Skill、MCP 工具发现与 ComfyUI 工作流交互，并保持未接入外部服务的边界可见
- Scope: src/features/skills, src/features/mcp, src/features/comfyui, Settings, Catalog, Composer, browser/unit tests
- Acceptance: 本地 Skill 可安全导入、安装、编辑、启停、导出并应用到 Composer 草稿; MCP Streamable HTTP 可完成握手、分页工具发现、inputSchema 展示和显式确认调用; ComfyUI 工作流可本地创建、导入、导出、删除并显示真实运行边界; 凭据、token、脚本执行、远程市场和未接入服务不被伪造为已完成
- Branch: `feat/TASK-CAP-001-integrated`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-CAP-001-INTEGRATED`
- Modules: src/features/skills, src/features/mcp, src/features/comfyui, src/components/settings, src/components/LibraryPage.tsx, src/App.tsx, tests/unit, tests/browser
- Verification: PARTIAL — 最终 npm run verify 通过：187 Node、193 production browser、UI 127/0、lint/typecheck/format/build；MCP/Catalog 定向 9/9；client:check 与 client:build -- --no-bundle 通过并生成 release exe。MiniMax 仅完成安装包静态审计，桌面控制 RPC 不可用，1421 开发态、Tauri 窗口交互和真实 ComfyUI 提交待后续验收。
- Evidence: [docs/changes/2026-09-21-local-capabilities/intent.md](../../docs/changes/2026-09-21-local-capabilities/intent.md), [docs/changes/2026-09-21-local-capabilities/spec.md](../../docs/changes/2026-09-21-local-capabilities/spec.md), [docs/changes/2026-09-21-local-capabilities/verification.md](../../docs/changes/2026-09-21-local-capabilities/verification.md)
- Updated: 2026-09-21

## TASK-MINIMAX-001 — MiniMax Design 交互审计与本地技能/MCP复刻

- Goal: 依据真实 MiniMax Design 操作证据，补齐 KK Studio 的技能库、连接器目录和 MCP 发现交互
- Scope: MiniMax Design skills/connectors/MCP/ComfyUI interaction audit; KK Studio skill registry, composer integration, connector prototype, MCP lifecycle
- Acceptance: 真实检查 MiniMax 的技能、连接器、菜单、设置和 ComfyUI 入口，并记录付费生成不执行的边界; KK Studio 技能库支持本地 Skill 的查看、导入、创建、编辑、启用/禁用、卸载和应用到草稿; 连接器目录提供真实可操作的详情、Escape/焦点恢复和明确 Prototype 安装边界; MCP Streamable HTTP 配置覆盖发现、分页、连接失败清理、卸载清理、持久化损坏提示和大小上限; Web 开发运行时完成同状态浏览器证据，未验证范围明确记录，不把本地原型描述为云端/付费能力
- Branch: `codex/feat/minimax-deep-replica-root`
- Worktree: `D:/kk-studio-next`
- Modules: src/components/SkillsPage.tsx, src/components/SkillEditor.tsx, src/components/ConnectorCatalog.tsx, src/components/settings/McpSettings.tsx, src/features/skills/skillRegistry.ts, src/features/mcp/mcpClient.ts, tests/unit, docs/changes/2026-09-21-minimax-deep-audit
- Verification: PARTIAL — MiniMax 本地应用的技能、连接器、设置/MCP、ComfyUI 和菜单流程已完成只读审计；KK Studio Web 1421 已验证 Skill/Connector/MCP 的点击、Escape、焦点恢复和 HTTPS/HTTP 校验。完整生成、付费提交、桌面 Tauri release 和真实第三方连接器安装仍未验证，保持 PARTIAL。
- Evidence: [docs/changes/2026-09-21-minimax-deep-audit/verification.md](../../docs/changes/2026-09-21-minimax-deep-audit/verification.md), [docs/evidence/minimax-deep-audit-2026-09-21/runtime.json](../../docs/evidence/minimax-deep-audit-2026-09-21/runtime.json)
- Updated: 2026-09-21

## FEATURE-SYSTEM — 功能卡片体系、状态看板与后端化路线

- Goal: 每个功能有唯一可定位的功能卡片，状态经 registry 门禁与账本打通，并给出演示功能后端化分批路线
- Scope: docs/features, scripts/features, scripts/check-features.mjs, package.json, AGENTS.md, AI_RULES.md, docs/governance
- Acceptance: docs/features 下每个功能一张卡片并在 features.registry.json 登记; features:check 校验卡片章节、路径、任务关联与看板一致性，并并入 lint/verify; 任何 AI 从 AGENTS 入口可定位功能状态、代码、测试与后端化差距; 后端化路线图按波次拆分并映射到账本任务
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: docs/features, scripts/check-features.mjs, scripts/features/registry.mjs, AGENTS.md, AI_RULES.md, docs/governance/SPEC_BASELINE.md
- Verification: PASS — 28 张功能卡片与 registry 一致；features:check 零违规并接入 lint；看板由 registry 生成；规则入口与账本任务已更新；typecheck、212 项单测与 200 项浏览器回归通过。
- Evidence: [docs/changes/2026-09-21-feature-system/verification.md](../../docs/changes/2026-09-21-feature-system/verification.md), [docs/features/README.md](../../docs/features/README.md)
- Updated: 2026-09-21

## BACKEND-IMAGE-PARAMS — 图片比例与清晰度真实透传供应商

- Goal: 图片节点比例/清晰度从仅存草稿改为 Web 与 Desktop 链路真实发送 size 参数
- Scope: src/domain/imageParameters.ts, imageGeneration.ts, nativeTaskHost.ts, model.ts, imageTaskCommand.ts, App.tsx, CreationParameters.tsx, src-tauri/src/task_host.rs
- Acceptance: 纯函数映射比例×清晰度到供应商 size，自适应=不传; 浏览器 JSON 与 multipart 请求透传 size; Desktop TaskHost 经 IPC 透传 size 到 JSON/multipart; 新增映射单测，UI 去除草稿参数误导文案
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/domain/imageParameters.ts, src/features/creation/imageGeneration.ts, src/features/creation/nativeTaskHost.ts, src/features/creation/model.ts, src/features/creation/imageTaskCommand.ts, src/App.tsx, src/components/nodes/CreationParameters.tsx, src-tauri/src/task_host.rs, tests/unit/imageParameters.test.ts
- Verification: PARTIAL — 代码透传与旧212/200/65测试记录保留；勘误：缺 Desktop 参数实机 HTTP及同状态证据，不能 DONE/REAL；供应商尺寸枚举和像素限制需按模型适配。
- Evidence: [docs/changes/2026-09-21-feature-system/verification.md](../../docs/changes/2026-09-21-feature-system/verification.md), [tests/unit/imageParameters.test.ts](../../tests/unit/imageParameters.test.ts), [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md)
- Updated: 2026-09-22

## BACKEND-TEXT-NODE — 文本节点接入统一任务宿主

- Goal: 文本节点复用统一 TaskHost 和 BYOK /chat/completions，替换本地演示
- Scope: src/components/nodes, src/features/creation, src/App.tsx, src-tauri/src/task_host.rs, src-tauri/src/task_host_text.rs
- Acceptance: 文本节点提交走真实模型，支持流式、取消、错误、离线状态; Web 与 Desktop 分别有运行态证据; 演示 seam 在文本模态移除并更新 FEAT-008 卡片为 REAL
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/components/nodes, src/features/creation, src/App.tsx, src-tauri/src/task_host.rs, src-tauri/src/task_host_text.rs
- Verification: PARTIAL — Web development/production preview与隔离Tauri release本机HTTP fixture通过流式、取消/未知受理、离线、编辑保存、重载重连和并发释放。完整verify 227/210，Rust74，独立预检PASS。实际Provider、原生进程退出/恢复与health统一仍待T5/EXT-PROVIDER验收，整体PARTIAL。
- Evidence: [docs/features/feat-008-text-node.md](../../docs/features/feat-008-text-node.md), [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md)
- Updated: 2026-09-22

## BACKEND-MEDIA-001 — 视频与音频节点真实生成链

- Goal: 视频/音频节点经统一任务宿主接入真实供应商（规划 MiniMax 等），替换固定演示素材
- Scope: 视频/音频 provider 抽象, 异步作业轮询/回调, 任务宿主, VideoNode/PromptCreationNode, 参数透传
- Acceptance: 视频/音频 provider 抽象复用队列、幂等、取消与素材归档; 时长/比例/清晰度等参数真实传递; 结果经 result 边回到节点，状态覆盖 loading/success/error/cancel; 有供应商 Key 时完成真实出片/出音频验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/components/nodes, src/features/creation, src/integrations/generation, src-tauri/src/task_host.rs
- Verification: NOT_VERIFIED — NOT VERIFIED：代码链路可先于凭据建设；真实出片/出音频验收需要供应商 Key 与额度（EXT-PROVIDER）。
- Evidence: [docs/features/feat-006-video-generation.md](../../docs/features/feat-006-video-generation.md), [docs/features/feat-007-audio-generation.md](../../docs/features/feat-007-audio-generation.md), [docs/features/feat-025-demo-media.md](../../docs/features/feat-025-demo-media.md)
- Updated: 2026-09-21

## BACKEND-MCP-AUTO — MCP 工具自动调用编排

- Goal: 在手动 MCP 客户端之上实现工具发现、选择授权、自动调用、结果回填与错误取消
- Scope: src/features/mcp, 对话/技能编排, 设置 UI
- Acceptance: 技能/对话可按授权自动调用 MCP 工具并展示过程; 覆盖授权、失败、取消、超时、离线状态; 桌面 release 用真实第三方 MCP 服务器验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/mcp, src/components/settings/McpSettings.tsx, src/features/skills
- Verification: NOT_VERIFIED — NOT VERIFIED：手动客户端真实可用，自动调用仍为 Prototype。
- Evidence: [docs/features/feat-012-mcp.md](../../docs/features/feat-012-mcp.md)
- Updated: 2026-09-21

## BACKEND-PLATFORM — 平台账号/积分/云同步/记忆/代理后端

- Goal: 建设并部署平台服务，使账号、计费额度、云端保存、长期记忆与应用内代理从 Prototype 变为真实能力
- Scope: generation-server 平台化, 身份服务, 计费集成, 云存储, 记忆服务, 代理, 部署
- Acceptance: 身份与会话、用户资料可用，平台额度与真实计费打通; 云端项目/素材同步具备冲突与隐私策略; 记忆服务可采集/检索/删除，应用内代理在 Desktop 生效; 生产 HTTPS 部署并完成端到端验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/generation-server, src/components/AccountPopup.tsx, src/components/settings/ConnectionSettings.tsx, deploy
- Verification: NOT_VERIFIED — NOT VERIFIED：依赖 VPS/域名/身份与计费等外部部署条件（T10）；Gateway 内额度逻辑已先在单测覆盖。
- Evidence: [docs/features/feat-017-account.md](../../docs/features/feat-017-account.md), [docs/features/feat-018-credits.md](../../docs/features/feat-018-credits.md), [docs/features/feat-019-cloud-sync.md](../../docs/features/feat-019-cloud-sync.md), [docs/features/feat-020-memory.md](../../docs/features/feat-020-memory.md), [docs/features/feat-021-proxy.md](../../docs/features/feat-021-proxy.md)
- Updated: 2026-09-21

## BACKEND-ASTRA-001 — Astra 研究助手实现

- Goal: 在已完成计划基础上实现 Astra 的产品能力，而非停留在规划
- Scope: 待 intent/spec 定义
- Acceptance: 补齐 intent/spec 与能力边界; 实现并接入 UI，含真实后端或明确 Prototype 标注; Web/Desktop 运行态验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: 待 spec 定义
- Verification: NOT_VERIFIED — NOT VERIFIED：仅有计划与 Git 同步，零实现。
- Evidence: [docs/features/feat-027-astra.md](../../docs/features/feat-027-astra.md)
- Updated: 2026-09-21

## UI-SKILL-POPOVER-001 — 窄屏首页弹层遮挡修复与 Skill 空态断言更新

- Goal: 内置 Skill 合入后，首页四类弹层在窄屏不再遮挡创作提示词与同级触发按钮，并让浏览器断言与内置 Skill 新契约一致
- Scope: src/styles/catalog-pages.css, tests/browser/creation-flow.spec.ts, tests/browser/composer-menu-audit.spec.ts（回归覆盖）
- Acceptance: ≤620px 弹层在底栏下方展开，不遮挡提示词与触发按钮; Skill 弹层断言改为内置 Skill 可见且浏览入口仍进入目录页; 390/768/900 三视口弹层用例与全量浏览器回归通过
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src/styles/catalog-pages.css, tests/browser/creation-flow.spec.ts
- Verification: PASS — 390px 几何实测弹层与提示词/按钮无重叠；两个定向用例文件 16/16 通过，全量浏览器回归 200/200 通过。
- Evidence: [docs/changes/2026-09-21-feature-system/verification.md](../../docs/changes/2026-09-21-feature-system/verification.md)
- Updated: 2026-09-21

## TASK-RULES-003 — 修复功能状态与运行证据门禁

- Goal: 拦截无证据REAL、卡片状态冲突、终态后续任务和畸形路径，校正卡片生成规则与路线依赖
- Scope: scripts/features/registry.mjs, tests/unit/featureRegistry.test.ts, docs/features, AGENTS.md
- Acceptance: 拦截无证据REAL、卡片状态冲突、终态后续任务和畸形路径，校正卡片生成规则与路线依赖; 验证与证据完整后更新功能卡和账本，不以源码存在代替运行验收
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: scripts/features/registry.mjs, tests/unit/featureRegistry.test.ts, docs/features, AGENTS.md
- Verification: PASS — 8项隔离fixture门禁测试；28功能/48任务0违规；完整verify 227单测/210浏览器；独立dirty-diff预检无未关闭blocker。未commit/push，非正式SHA绑定PR审批。
- Evidence: [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md), [docs/changes/2026-09-21-text-and-rule-audit/review.md](../../docs/changes/2026-09-21-text-and-rule-audit/review.md)
- Updated: 2026-09-22

## BACKEND-CONVERSATION — 对话面板文本多轮能力与实际状态收敛

- Goal: 默认 Codex 多轮会话 Web 已接入，补 Desktop 进程托管与同态运行验收
- Scope: src/components/ConversationPanel.tsx, src/App.tsx, docs/features/feat-009-conversation.md
- Acceptance: Web 默认 Codex 已有多轮与流式；补桌面进程托管和真实同态验收。; 验证与证据完整后更新功能卡和账本，不以源码存在代替运行验收
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/components/ConversationPanel.tsx, src/App.tsx, docs/features/feat-009-conversation.md
- Verification: PARTIAL — Web 已通过 TASK-AGENT-001 实现并留真实证据；Desktop 尚未验收。
- Evidence: [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md), [docs/changes/2026-09-22-codex-default-agent/verification.md](../../docs/changes/2026-09-22-codex-default-agent/verification.md)
- Updated: 2026-09-22

## TASK-DS-001 — Design System校正与公共UI对齐

- Goal: 校正用户设计系统的颜色与基础组件，统一规范和公共实现
- Scope: Design System, CSS tokens, settings accent, shared controls, UI docs
- Acceptance: PDF全页审计并记录可追溯勘误; 双主题8色及基础组件正确消费配对语义; 旧设置兼容和键盘/回焦/重载/窄屏回归; 规范统一且明确Ardot与Desktop证据边界
- Branch: `fix/TASK-DS-001-alignment`
- Worktree: `C:/Users/Administrator/.codex/worktrees/design-system-alignment/KK-Studio-2.0`
- Modules: src/styles, src/domain/settings.ts, src/components/settings, docs/DESIGN-SYSTEM.md, docs/UI_SPEC.md, tests
- Verification: PARTIAL — Design System 1.1与双主题8色已落实；TASK-DS-002补目录/设置、原工程完整verify309/229及新Tauri资源包/重启验证。在线Ardot写入与用户视觉验收仍未完成。
- Evidence: [docs/changes/2026-09-22-design-system/spec.md](../../docs/changes/2026-09-22-design-system/spec.md), [docs/changes/2026-09-22-design-system/audit.md](../../docs/changes/2026-09-22-design-system/audit.md), [docs/changes/2026-09-22-design-system/verification.md](../../docs/changes/2026-09-22-design-system/verification.md), [docs/changes/2026-09-22-design-system/review.md](../../docs/changes/2026-09-22-design-system/review.md), [docs/changes/2026-09-22-design-system/remaining.md](../../docs/changes/2026-09-22-design-system/remaining.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md)
- Updated: 2026-09-22

## TASK-DS-002 — Design System逐页迁移与桌面验收

- Goal: 按未完成清单推进目录页面和设置控件，并核验新Tauri运行
- Scope: catalog pages, shared inputs, Skill editor, settings, runtime verification
- Acceptance: 目录与设置组件遵循Design System1.1; 双主题8色及窄屏搜索/编辑/保存/取消保持; 新Tauri实际bundle与隔离数据身份验证; 回传保护并发改动并更新剩余事项
- Branch: `fix/TASK-DS-002-pages`
- Worktree: `C:/Users/Administrator/.codex/worktrees/design-system-pages/KK-Studio-2.0`
- Modules: src/styles/catalog-pages.css, src/styles/ui-tokens.css, src/components/SkillEditor.tsx, src/components/SkillCollection.tsx, src/components/settings, tests/browser, scripts/audit
- Verification: PASS — 当前工程完整verify通过：309 Node、229浏览器、0失败/0flaky；lint/typecheck/UI137/0/format/build均PASS。原工程重新Tauri no-bundle build与16组合、2次启动、偏好及Skill保留复验PASS；独立预检修正复核PASS。仅关闭本批工程契约；在线Ardot、页面Frame和用户视觉验收由原任务保留。
- Evidence: [docs/changes/2026-09-22-design-system-pages/spec.md](../../docs/changes/2026-09-22-design-system-pages/spec.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md), [docs/changes/2026-09-22-design-system-pages/review.md](../../docs/changes/2026-09-22-design-system-pages/review.md)
- Updated: 2026-09-22

## TASK-UI-005 — 新增功能 UI 入口与能力展示对齐

- Goal: 解决新功能无入口及展示/实际行为不匹配
- Scope: Agent conversation and conditional initialization, plugins, prompt library, text presets, platform copy
- Acceptance: Agent双通道和错误交互正确; 插件与提示词有真实入口; Design System及Web/Desktop验证; 保留原工程并发改动
- Branch: `fix/TASK-UI-005-feature-parity`
- Worktree: `C:/Users/Administrator/.codex/worktrees/ui-feature-parity/KK-Studio-2.0`
- Modules: src/components, src/features/agent, src/features/prompts, tests/browser, scripts/agent, package.json
- Verification: PASS — 原工程verify327 Node/241 browser、UI142/0、lint/typecheck/format/build通过；独立38文件预检PASS。新Tauri资源/16组合/2启动、草稿缓存保留及Token清空通过。仅关闭本批UI契约，真实服务/外部验收与追加交互专项继续。
- Evidence: [docs/changes/2026-09-22-ui-feature-parity/spec.md](../../docs/changes/2026-09-22-ui-feature-parity/spec.md), [docs/changes/2026-09-22-ui-feature-parity/audit.md](../../docs/changes/2026-09-22-ui-feature-parity/audit.md), [docs/changes/2026-09-22-ui-feature-parity/verification.md](../../docs/changes/2026-09-22-ui-feature-parity/verification.md), [docs/changes/2026-09-22-ui-feature-parity/review.md](../../docs/changes/2026-09-22-ui-feature-parity/review.md)
- Updated: 2026-09-22

## TASK-UI-006 — 折叠与弹层交互、画布重叠和缩放背景修复

- Goal: 让项目/画布折叠及所有受影响入口开关保持状态与视觉一致
- Scope: Sidebar and canvas disclosures, overlay layout, zoom patterns, popover/modal lifecycle
- Acceptance: 生成/保存状态和任务入口无重叠; 缩小后点阵与网格可辨识; 重复点击/Escape/外点/焦点回归正确; 折叠保留草稿和界面状态; Design System及Web/Desktop同态验收
- Branch: `fix/TASK-UI-006-interactions`
- Worktree: `C:/Users/Administrator/.codex/worktrees/ui-interactions/KK-Studio-2.0`
- Modules: src/components, src/styles, tests/browser
- Verification: PASS — 原工程verify327 Node/261 browser、UI144/0、lint/typecheck/format/build通过；独立23文件预检PASS，fresh Tauri实际JS/CSS、16组合和原生交互验收通过。12处缺陷已关闭；外部服务与视觉源边界仍开放。
- Evidence: [docs/changes/2026-09-22-ui-interactions/intent.md](../../docs/changes/2026-09-22-ui-interactions/intent.md), [docs/changes/2026-09-22-ui-interactions/spec.md](../../docs/changes/2026-09-22-ui-interactions/spec.md), [docs/changes/2026-09-22-ui-interactions/audit.md](../../docs/changes/2026-09-22-ui-interactions/audit.md), [docs/changes/2026-09-22-ui-interactions/verification.md](../../docs/changes/2026-09-22-ui-interactions/verification.md), [docs/changes/2026-09-22-ui-interactions/review.md](../../docs/changes/2026-09-22-ui-interactions/review.md)
- Updated: 2026-09-22

## TASK-AGENT-001 — 默认 Codex 主 Agent 与 KK 生成任务接入

- Goal: 第一阶段：已登录 Codex 驱动 KK 对话、画布与现有 OpenAI 兼容生成；统一账号模型入口与真实额度，保留外部/桌面验收边界
- Scope: src/features/agent, src/features/models, KK 共享模型菜单与设置, App, vendor canvas-agent 最小适配, tests
- Acceptance: KK 输入框真实 Codex 回复; 命名 SSE 和项目线程恢复; 画布增改连线持久化; 生成任务真实受理/状态回传; 全量门禁与独立审查; 真实 Codex 内置生图归档; 账号级模型目录、明确尺寸、分级/全部/记忆页/置顶; 工具回执未知阻断自动重试; 桌面托管/其他软件按后续待办记录，不虚构完成; 连续发送/换模型/重连沿用已有线程，显式新建才创建线程; 同账号模型前缀分组/后缀变体精确 ID、厂商/参数/比例搜索和非数字模糊匹配
- Branch: `feat/TASK-AGENT-001-codex`
- Worktree: `C:/Users/Administrator/.codex/worktrees/kk-agent-codex/KK-Studio-2.0`
- Modules: src/features/agent, src/App.tsx, src/components/ConversationPanel.tsx, tests, src/features/models, src/components/ModelPickerMenu.tsx, src/components/settings, vendor/canvas-agent
- Verification: PARTIAL — 原工程 Web 首批 PASS：351 Node /266 browser，UI153/0，Agent125通过/2跳过；真实 Codex 连续两轮同线程、刷新恢复、MCP/内置生图与额度证据齐全。整体保留PARTIAL：Desktop/其他登录软件/真实付费Provider逐厂商未完成。
- Evidence: [docs/changes/2026-09-22-codex-default-agent/spec.md](../../docs/changes/2026-09-22-codex-default-agent/spec.md), [docs/changes/2026-09-22-codex-default-agent/verification.md](../../docs/changes/2026-09-22-codex-default-agent/verification.md), [docs/changes/2026-09-22-codex-default-agent/review.md](../../docs/changes/2026-09-22-codex-default-agent/review.md), [docs/changes/2026-09-22-codex-default-agent/usage.md](../../docs/changes/2026-09-22-codex-default-agent/usage.md), [docs/changes/2026-09-22-codex-default-agent/remaining.md](../../docs/changes/2026-09-22-codex-default-agent/remaining.md), [docs/changes/2026-09-22-codex-default-agent/provider-research.md](../../docs/changes/2026-09-22-codex-default-agent/provider-research.md), [docs/changes/2026-09-22-codex-default-agent/port-audit-update.md](../../docs/changes/2026-09-22-codex-default-agent/port-audit-update.md), [docs/changes/2026-09-22-codex-default-agent/evidence/acceptance.json](../../docs/changes/2026-09-22-codex-default-agent/evidence/acceptance.json)
- Updated: 2026-09-22

## TASK-AGENT-002 — 桌面本地 Agent 托管与其他登录软件适配

- Goal: 把本轮已验证的 Codex 能力接入 Tauri 一键生命周期，再分别验证 Google/豆包/WorkBuddy 的官方或可用登录适配器
- Scope: src-tauri, src/features/agent, browser adapters, provider integrations
- Acceptance: Tauri 隐藏拉起、健康检测、停止和退出回收，只管理自己的子进程; 登录需要交互时在 KK 提示/打开登录页，不能绕过验证; Google/豆包/WorkBuddy 每个适配器均须真实请求及结果回传验证；无接口时明确不可用; 网页后台任务具有限并发、取消、登录失效和结果不确定处理; 非 OpenAI 兼容 API 逐协议扩展并真实验收
- Branch: `fix/TASK-AGENT-002-desktop`
- Worktree: `C:/Users/Administrator/.codex/worktrees/remaining-verification/KK-Studio-2.0`
- Modules: src-tauri, src/features/agent, src/features/models, src/integrations
- Verification: PARTIAL — Windows Agent 托管子项 PASS：356 Node/270 browser/78 Rust，真实Tauri8项与空会话7项、独立预检与干净npm ci/build通过。Proxy、其他软件/网页并发/非兼容协议及外部真实验收仍待完成；未commit/push。
- Evidence: [docs/changes/2026-09-22-codex-default-agent/remaining.md](../../docs/changes/2026-09-22-codex-default-agent/remaining.md), [docs/changes/2026-09-22-agent-desktop/verification.md](../../docs/changes/2026-09-22-agent-desktop/verification.md), [docs/changes/2026-09-22-agent-desktop/remaining.md](../../docs/changes/2026-09-22-agent-desktop/remaining.md), [docs/changes/2026-09-22-agent-desktop/review.md](../../docs/changes/2026-09-22-agent-desktop/review.md)
- Updated: 2026-09-22

## TASK-UI-007 — 手机平板电脑三档尺寸与图标对齐

- Goal: 先纠正规范，再修复手机空间、平板面板挤压、桌面整体缩小、图标与换行及切换交互
- Scope: Design System, shell, shared controls, page responsive layout
- Acceptance: 三档尺寸及实际截图检查; 图标居中、文本合理换行、控件可操作; 断点切换保留草稿/项目/桌面折叠偏好; verify、fresh Tauri和独立预检
- Branch: `fix/TASK-UI-007-responsive`
- Worktree: `C:/Users/Administrator/.codex/worktrees/ui-responsive/KK-Studio-2.0`
- Modules: src/components, src/styles, docs, tests/browser
- Verification: PASS — 原工程356 Node/286 browser、UI157/0、55任务/29功能0违规；独立R1–R3补审PASS；带Agent资源fresh Tauri实际JS/CSS匹配、16组合和原生交互通过。三档及短屏、图标/换行、跨档草稿/焦点/菜单已修复；实机与在线设计边界保留。
- Evidence: [docs/changes/2026-09-22-responsive-ui/spec.md](../../docs/changes/2026-09-22-responsive-ui/spec.md), [docs/changes/2026-09-22-responsive-ui/audit.md](../../docs/changes/2026-09-22-responsive-ui/audit.md), [docs/changes/2026-09-22-responsive-ui/verification.md](../../docs/changes/2026-09-22-responsive-ui/verification.md), [docs/changes/2026-09-22-responsive-ui/review.md](../../docs/changes/2026-09-22-responsive-ui/review.md), [docs/changes/2026-09-22-responsive-ui/evidence/desktop/runtime.json](../../docs/changes/2026-09-22-responsive-ui/evidence/desktop/runtime.json)
- Updated: 2026-09-23

## TASK-UI-008 — 重新制定创作输入框规范并统一三档实现

- Goal: 修正规范缺失与文字/图标/附件/型号参数和焦点不一致，输入增长不覆盖其他UI
- Scope: Design System, home/API/Agent composer, input flow and tests
- Acceptance: DS1.3输入契约先于实现; 三档多行/附件/参数及单一焦点边界; 图标20/16与32/44命中区域; Web、fresh Tauri与独立上下文审查
- Branch: `fix/TASK-UI-008-inputs`
- Worktree: `C:/Users/Administrator/.codex/worktrees/ui-input-contract/KK-Studio-2.0`
- Modules: src/components, src/styles, tests/browser, docs
- Verification: PASS — 原工程356 Node/295 browser、UI159/0、56任务/29功能0违规；独立R1–R3及断点补审PASS；fresh Tauri实际JS/CSS匹配、32组合与原生输入交互通过。DS1.3契约与三档输入流已落实，实机/在线设计及服务边界保留。
- Evidence: [docs/changes/2026-09-23-input-contract/spec.md](../../docs/changes/2026-09-23-input-contract/spec.md), [docs/changes/2026-09-23-input-contract/plan.md](../../docs/changes/2026-09-23-input-contract/plan.md), [docs/changes/2026-09-23-input-contract/verification.md](../../docs/changes/2026-09-23-input-contract/verification.md), [docs/changes/2026-09-23-input-contract/review.md](../../docs/changes/2026-09-23-input-contract/review.md), [docs/changes/2026-09-23-input-contract/evidence/desktop/runtime.json](../../docs/changes/2026-09-23-input-contract/evidence/desktop/runtime.json), [docs/changes/2026-09-23-input-contract/evidence/integration.json](../../docs/changes/2026-09-23-input-contract/evidence/integration.json)
- Updated: 2026-09-23

## TASK-AGENT-003 — Agent 图片附件、画布引用与视口选择操作

- Goal: 复用已有 Agent 附件链路，让 Codex 读取选定图片并控制真实画布选择和视口
- Scope: Agent composer, attachment preparation, canvas control bridge
- Acceptance: 图片原件发送、缺失/越限/取消拒绝且失败保留草稿; Agent/API 草稿隔离，选择/视口影响实际 UI 并回传; Web preview 与 Tauri release 实际交互和独立预检
- Branch: `feat/TASK-AGENT-003-attachments`
- Worktree: `C:/Users/Administrator/.codex/worktrees/agent-attachments/KK-Studio-2.0`
- Modules: src/features/agent, src/components, src/App.tsx
- Verification: PASS — 原工程完整 verify：363 Node/299 browser，UI159/0；fresh Tauri真实识图与原件哈希、随包MCP选择/视口、重开恢复通过；26文件独立dirty增量预检PASS，未commit/push。
- Evidence: [docs/changes/2026-09-23-agent-attachments/verification.md](../../docs/changes/2026-09-23-agent-attachments/verification.md), [docs/changes/2026-09-23-agent-attachments/review.md](../../docs/changes/2026-09-23-agent-attachments/review.md), [docs/changes/2026-09-23-agent-attachments/remaining.md](../../docs/changes/2026-09-23-agent-attachments/remaining.md)
- Updated: 2026-09-23

## PLUGIN-DESKTOP-001 — 修复桌面画布插件的 CSP 加载路径

- Goal: 让可信随包插件在保持严格 CSP 的前提下于 Tauri 桌面端加载并验证
- Scope: 同源插件模块加载、桌面 CSP、fresh Tauri 插件交互验证
- Acceptance: 随包插件从同源模块路径加载且不全局放宽脚本 CSP; fresh Tauri 中插件发现、添加、渲染和启停通过实际交互; 远程插件的权限与来源边界保持明确
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/plugins, src-tauri/tauri.conf.json, tests/browser
- Verification: NOT_VERIFIED — 当前 Tauri CSP 拒绝 blob 模块，独立审查的原样 CSP 探针复现；修复和 fresh Desktop 交互尚未验证。
- Evidence: [docs/changes/2026-09-23-release-2-1-0/review.md](../../docs/changes/2026-09-23-release-2-1-0/review.md)
- Updated: 2026-09-23

## REL-2.1.0 — 2.1.0 本地集成与源码上传

- Goal: 将当前已授权的工作区候选统一版本、完成本地检查并上传到可追溯的任务分支
- Scope: 版本元数据、当前工作区源码与交付包、Git 提交和远端回读
- Acceptance: 应用、npm、Tauri 和运行时报告 2.1.0; 完整本地门禁通过且保留历史验证边界; 任务分支提交、推送并回读远端 SHA; 正式 PR/CI/main/tag 与安装包状态如实记录
- Branch: `chore/TASK-CONSOLIDATE-200`
- Worktree: `D:/kk-studio/KK-Studio-2.0`
- Modules: src, src-tauri, tests, scripts, vendor, docs
- Verification: PARTIAL — 安全补审后本地 367 Node、299 项完整 browser 加 2 项定向 plugin browser、78 Rust、Agent 126 通过/2 跳过、UI159/0、功能29/0、治理59/0、类型/格式/Web build 均通过；受审源码 15f1f27 已上传，首次远端 SHA 一致。后续候选 head da811283 的 PR #9 当前 hosted verify/delivery 成功，已 squash 合入 main@b45c5bc7 且 tree 一致；合并后 main 工作流 35836597858 success。正式 tag、安装包、签名和发布验收仍未完成。各历史变更包保留其原始验证时点。
- Evidence: [docs/changes/2026-09-20-main-close-002/verification.md](../../docs/changes/2026-09-20-main-close-002/verification.md), [docs/changes/2026-09-21-consolidate-200/verification.md](../../docs/changes/2026-09-21-consolidate-200/verification.md), [docs/changes/2026-09-21-feature-system/verification.md](../../docs/changes/2026-09-21-feature-system/verification.md), [docs/changes/2026-09-21-local-capabilities/verification.md](../../docs/changes/2026-09-21-local-capabilities/verification.md), [docs/changes/2026-09-21-minimax-deep-audit/verification.md](../../docs/changes/2026-09-21-minimax-deep-audit/verification.md), [docs/changes/2026-09-21-security-audit-closeout/verification.md](../../docs/changes/2026-09-21-security-audit-closeout/verification.md), [docs/changes/2026-09-21-security-audit/verification.md](../../docs/changes/2026-09-21-security-audit/verification.md), [docs/changes/2026-09-21-text-and-rule-audit/verification.md](../../docs/changes/2026-09-21-text-and-rule-audit/verification.md), [docs/changes/2026-09-22-agent-desktop/verification.md](../../docs/changes/2026-09-22-agent-desktop/verification.md), [docs/changes/2026-09-22-codex-default-agent/verification.md](../../docs/changes/2026-09-22-codex-default-agent/verification.md), [docs/changes/2026-09-22-design-system/verification.md](../../docs/changes/2026-09-22-design-system/verification.md), [docs/changes/2026-09-22-design-system-pages/verification.md](../../docs/changes/2026-09-22-design-system-pages/verification.md), [docs/changes/2026-09-22-port-infinite-canvas/verification.md](../../docs/changes/2026-09-22-port-infinite-canvas/verification.md), [docs/changes/2026-09-22-responsive-ui/verification.md](../../docs/changes/2026-09-22-responsive-ui/verification.md), [docs/changes/2026-09-22-ui-feature-parity/verification.md](../../docs/changes/2026-09-22-ui-feature-parity/verification.md), [docs/changes/2026-09-22-ui-interactions/verification.md](../../docs/changes/2026-09-22-ui-interactions/verification.md), [docs/changes/2026-09-23-agent-attachments/verification.md](../../docs/changes/2026-09-23-agent-attachments/verification.md), [docs/changes/2026-09-23-input-contract/verification.md](../../docs/changes/2026-09-23-input-contract/verification.md), [docs/changes/2026-09-23-release-2-1-0/verification.md](../../docs/changes/2026-09-23-release-2-1-0/verification.md)
- Updated: 2026-09-23

## TASK-RULES-004 — 现行规则与 Markdown 一致性审计

- Goal: 核对规则文档与实际门禁及 2.1.0 候选状态，并让现行 Markdown 相对文件链接进入 lint
- Scope: 共同规则入口、工程与治理文档、现行 Markdown 链接检查及任务交付记录
- Acceptance: 当前设计、任务和发布状态的文档入口不与权威来源冲突; 依赖 PR 的分支同步与清理边界有明确可执行规则; 现行 Markdown 相对文件链接进入 lint 且有有效回归; 本地验证、独立复审和 hosted CI 限制分别如实记录
- Branch: `docs/TASK-RULES-004-closeout`
- Worktree: `D:/kk-studio/.worktrees/TASK-RULES-004-closeout`
- Modules: AGENTS.md, README.md, docs, scripts/governance, tests/unit, package.json
- Verification: PASS — 原堆叠 PR #10 两轮失败审查及第三轮 d8e12c0 PASS 保留；从 PR #9 后的 main 仅承接本任务四个提交，tree 与原 #10 head 相同。承接分支干净 npm ci 与完整 verify 通过：370 Node、300 browser、治理61/0、功能29/0、Markdown81/0、UI159/0、类型/格式/Web build；旧生成证据定向恢复。独立 AI 审查覆盖最终 dfed074，PR #11 当前 head 的 hosted verify/delivery 与 push verify 均成功，已 squash 合入 main@9f04bfce，合并树与候选树一致；旧 PR #10 已关联关闭未重复合并，本地根 main 已快进。合并后 main 工作流 35841965161 verify success；正式版本 tag、安装包和发布验收属于 REL-2.1.0，不由本任务关闭。
- Evidence: [docs/changes/2026-09-23-rules-audit/intent.md](../../docs/changes/2026-09-23-rules-audit/intent.md), [docs/changes/2026-09-23-rules-audit/spec.md](../../docs/changes/2026-09-23-rules-audit/spec.md), [docs/changes/2026-09-23-rules-audit/plan.md](../../docs/changes/2026-09-23-rules-audit/plan.md), [docs/changes/2026-09-23-rules-audit/verification.md](../../docs/changes/2026-09-23-rules-audit/verification.md), [docs/changes/2026-09-23-rules-audit/review.md](../../docs/changes/2026-09-23-rules-audit/review.md), [docs/changes/2026-09-23-rules-audit-main/intent.md](../../docs/changes/2026-09-23-rules-audit-main/intent.md), [docs/changes/2026-09-23-rules-audit-main/spec.md](../../docs/changes/2026-09-23-rules-audit-main/spec.md), [docs/changes/2026-09-23-rules-audit-main/plan.md](../../docs/changes/2026-09-23-rules-audit-main/plan.md), [docs/changes/2026-09-23-rules-audit-main/verification.md](../../docs/changes/2026-09-23-rules-audit-main/verification.md), [docs/changes/2026-09-23-rules-audit-main/review.md](../../docs/changes/2026-09-23-rules-audit-main/review.md), [docs/changes/2026-09-23-rules-audit-closeout/intent.md](../../docs/changes/2026-09-23-rules-audit-closeout/intent.md), [docs/changes/2026-09-23-rules-audit-closeout/spec.md](../../docs/changes/2026-09-23-rules-audit-closeout/spec.md), [docs/changes/2026-09-23-rules-audit-closeout/plan.md](../../docs/changes/2026-09-23-rules-audit-closeout/plan.md), [docs/changes/2026-09-23-rules-audit-closeout/verification.md](../../docs/changes/2026-09-23-rules-audit-closeout/verification.md), [docs/changes/2026-09-23-rules-audit-closeout/review.md](../../docs/changes/2026-09-23-rules-audit-closeout/review.md)
- Updated: 2026-09-23

## TASK-DOCS-HISTORY-001 — 历史 Markdown 链接与缺失日志勘误

- Goal: 逐项核对历史快照的 37 处链接问题并在有原始证据时添加可追溯勘误
- Scope: docs/archive、历史 docs/changes 和 docs/evidence 的链接及产物归属
- Acceptance: 归档搬迁和旧代码行号链接提供可用入口且不篡改当时结论; 缺失日志明确标注来源和可恢复性，不补造证据; 修正后的历史页面定向检查并经独立审阅
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: docs/archive, docs/changes, docs/evidence
- Verification: NOT_VERIFIED — 2026-09-23 扫描 365 个已跟踪 Markdown，历史范围共 37 处文件目标问题；原始日志来源和可恢复性待核对。
- Evidence: [docs/governance/MARKDOWN_AUDIT.md](../../docs/governance/MARKDOWN_AUDIT.md)
- Updated: 2026-09-23

## TASK-PROV-002 — 多供应商接入与多目标配置（Provider Connectivity）

- Goal: 让 KK Studio 接入足够多的供应商/工具/MCP：统一 Provider 多目标渲染、配置导入导出、模型上下文窗口 catalog、MCP stdio 配置契约
- Scope: src/features/providers、src/features/models/modelCatalogWindow.ts、src/features/mcp/mcpConfig.ts、tests/unit、docs/changes/2026-09-24-provider-connectivity、docs/features(FEAT-030)
- Acceptance: 一个 ProviderConnection 可渲染 Codex/Claude/OpenAI 三份目标配置且无密钥; 便携 v1 配置可 round-trip 导入导出，密钥不出现; model[1M] 后缀解析并生成 cc-switch 兼容 catalog; MCP stdio 契约仅接受白名单命令; typecheck/unit/lint/ui:check/format/governance/features/markdown 通过
- Branch: `feat/TASK-PROV-002-provider-connectivity`
- Worktree: `D:/kk-studio/.worktrees/TASK-PROV-002-provider-connectivity`
- Modules: src/features/providers, src/features/models, src/features/mcp, tests/unit, docs/changes, docs/features, docs/governance
- Verification: NOT_VERIFIED — 本地 lint/typecheck/394 单测/ui:check/format/governance/features/markdown 全绿；浏览器 test:ui 与独立上下文 review 待推送后 CI 完成
- Evidence: [docs/changes/2026-09-24-provider-connectivity/intent.md](../../docs/changes/2026-09-24-provider-connectivity/intent.md), [docs/changes/2026-09-24-provider-connectivity/spec.md](../../docs/changes/2026-09-24-provider-connectivity/spec.md), [docs/changes/2026-09-24-provider-connectivity/plan.md](../../docs/changes/2026-09-24-provider-connectivity/plan.md), [docs/changes/2026-09-24-provider-connectivity/verification.md](../../docs/changes/2026-09-24-provider-connectivity/verification.md), [docs/changes/2026-09-24-provider-connectivity/remaining.md](../../docs/changes/2026-09-24-provider-connectivity/remaining.md)
- Updated: 2026-09-24

## TASK-PROV-003 — Codex Provider 配置注入与 model catalog 落盘（agent 侧接线）

- Goal: 把 TASK-PROV-002 渲染产物落进 Codex 真实配置：config.toml 保守合并（只管理 kk_* 表与显式顶层键）、model-catalogs/<id>.json 落盘与相对指针、providers CLI（apply/check）；密钥只写 env_key
- Scope: vendor/canvas-agent/src/agent/codex-provider-config.ts、provider-cli.ts、index.ts 分派、vendor/canvas-agent/package.json 测试清单、docs/changes/2026-09-24-provider-wiring
- Acceptance: 空文件/含注释/含自定义 provider/含历史 kk_* 表四类合并可预期且幂等; 输出绝不含密钥形态文本，写盘权限 0600/0700; model[1M] 后缀进入 catalog 且无后缀不生成窗口字段; providers apply/check 在本机真实 CODEX_HOME 可跑通; test:agent 与根门禁全绿
- Branch: `feat/TASK-PROV-003-provider-wiring`
- Worktree: `D:/kk-studio/.worktrees/TASK-PROV-003-provider-wiring`
- Modules: vendor/canvas-agent/src/agent, vendor/canvas-agent/src/index.ts, vendor/canvas-agent/package.json, docs/changes, docs/governance, docs/features
- Verification: NOT_VERIFIED — test:agent 142/142（含新模块全部用例）、根门禁全绿（typecheck/lint/test 394/ui:check/format/governance/features/markdown）、真实 CODEX_HOME 落盘与幂等验证、check 探测链路实测（401 被正确识别）；浏览器 test:ui 与独立 review 待推送后 CI 完成
- Evidence: [docs/changes/2026-09-24-provider-wiring/intent.md](../../docs/changes/2026-09-24-provider-wiring/intent.md), [docs/changes/2026-09-24-provider-wiring/spec.md](../../docs/changes/2026-09-24-provider-wiring/spec.md), [docs/changes/2026-09-24-provider-wiring/plan.md](../../docs/changes/2026-09-24-provider-wiring/plan.md), [docs/changes/2026-09-24-provider-wiring/verification.md](../../docs/changes/2026-09-24-provider-wiring/verification.md), [docs/changes/2026-09-24-provider-wiring/remaining.md](../../docs/changes/2026-09-24-provider-wiring/remaining.md), [docs/changes/2026-09-24-provider-wiring/review.md](../../docs/changes/2026-09-24-provider-wiring/review.md)
- Updated: 2026-09-24
