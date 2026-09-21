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
| UI-001 | UI tokens和共享组件契约 | TODO | TASK-GOV-001 | root |
| UI-002 | 窄屏composer和动态文案溢出 | DONE | UI-001 | root |
| UI-003 | 示例任务/账号与真实服务边界 | PARTIAL | UI-001 | root |
| UI-004 | 逐页对齐、IA和最终视觉运行态 | PARTIAL | UI-002, UI-003 | root |
| PERF-001 | 原生素材缩略图/分页及内存IO | TODO | T3a | root |
| EXT-GIT | 远端PR与main保护规则 | BLOCKED | TASK-GOV-001, T0 | root |
| TEST-PROV-001 | Provider真实入口浏览器回归 | DONE | TASK-GOV-001 | root |
| TASK-ASTRA-001 | Astra 迁移计划与 Git 分支规则同步 | DONE | T0, TASK-GOV-001 | root |
| TASK-KK2-MAIN-SYNC | KK Studio 2.0 本地与云端 main 树同步 | DONE | T0, TASK-GOV-001 | root |
| TASK-UI-UNMERGED-001 | dirty checkout 未合并 UI 回归候选 | DONE | TASK-GOV-001 | root |
| TASK-UI-MAIN-001 | 现行Figma页面校正与交互修复主线整合 | DONE | TASK-GOV-001, TASK-KK2-MAIN-SYNC | root |
| TASK-UI-DISMISS-002 | 窄屏侧栏关闭与大图重绘稳定性 | DONE | TASK-UI-MAIN-001 | root |
| TASK-AUDIT-SEC-001 | 安全边界与异常任务状态审计 | REVIEW | TASK-GOV-001 | root |
| TASK-GOV-002 | 跨AI自主开发与分支质量门禁 | PARTIAL | TASK-GOV-001, TASK-KK2-MAIN-SYNC | root |


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
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-16-ui-system-audit/plan.md](../../docs/changes/2026-09-16-ui-system-audit/plan.md)
- Updated: 2026-09-17

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
- Acceptance: 最新Figma同状态视觉对比; 六态及异步/键盘/离线; dev1421/preview1423/Tauri最终source分别确认
- Branch: `codex/TASK-UI-MAIN-001-alignment`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-UI-MAIN-001`
- Modules: Landing, Workspace, Assets, Settings, Tasks, Account
- Verification: PARTIAL — 已覆盖34运行页面状态，修复现行设置/搜索/资产几何；Landing现行节点及其他缺失Frame仍不能完成Figma视觉验收。
- Evidence: [docs/changes/2026-09-16-ui-system-audit/plan.md](../../docs/changes/2026-09-16-ui-system-audit/plan.md), [docs/changes/2026-09-20-ui-main-alignment/verification.md](../../docs/changes/2026-09-20-ui-main-alignment/verification.md)
- Updated: 2026-09-20

## PERF-001 — 原生素材缩略图/分页及内存IO

- Goal: 原生素材缩略图/分页及内存IO
- Scope: src/features/creation/assetRepository.ts, src/features/creation/useAssetArchive.ts, src-tauri
- Acceptance: 原件与预览分离; 可见素材按需加载; 大型库有测量证据; 原图校验/来源不回归
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: src/features/creation/assetRepository.ts, src/features/creation/useAssetArchive.ts, src-tauri
- Verification: NOT_VERIFIED — 当前全量原件data URL加载，性能整改仍待执行
- Evidence: [docs/architecture/DATA-STORAGE.md](../../docs/architecture/DATA-STORAGE.md)
- Updated: 2026-09-17

## EXT-GIT — 远端PR与main保护规则

- Goal: 远端PR与main保护规则
- Scope: Git hosting
- Acceptance: remote明确并可访问; PR/required checks/block force/delete有效; 实际CI运行证据
- Branch: `unallocated`
- Worktree: `unallocated`
- Modules: Git hosting
- Verification: NOT_VERIFIED — NOT VERIFIED
- Evidence: [docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md](../../docs/changes/2026-09-20-gpt-6-astra/branch-rules-audit.md), [docs/changes/2026-09-20-gpt-6-astra/verification.md](../../docs/changes/2026-09-20-gpt-6-astra/verification.md)
- External condition: 目标仓库 authenticated API 已确认 private、默认分支 main 与写权限；main protected=false，required checks 为空，rulesets/protection API 因当前 GitHub 计划返回 403。需完成最终候选 PR、CI、合并和 main tree 回读；托管保护能力仍未启用。
- Updated: 2026-09-20

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

<<<<<<< HEAD
## TASK-AUDIT-SEC-001 — 安全边界与异常任务状态审计

- Goal: 修复已复现的凭据泄露、重复提交、Gateway配置陈旧、账户额度漂移、跨窗口租约竞态、原生响应内存和结果URL SSRF风险
- Scope: Web provider URL/state recovery, Gateway registration/authentication, native TaskHost journal/download limits
- Acceptance: Provider请求发出后取消或暂停进入unknown并禁止普通重试; 远程Provider只允许HTTPS，HTTP仅限本机回环地址; Gateway重启显式更新连接配置并撤销旧ACL，token冲突失败关闭; Gateway初始额度只在首次 provisioning 生效，额度配置漂移 fail closed，并发策略可安全更新; Web提交租约以Web Locks跨窗口串行协调，崩溃/旧元数据按live locks回收，不支持时拒绝提交; 原生Provider结果下载按同origin和DNS/IP策略收口并按流式总字节上限读取，任务journal替换不先删除原件
- Branch: `fix/TASK-AUDIT-SEC-001-boundaries`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-AUDIT-SEC-001`
- Modules: src/App.tsx, src/domain/modelProvider.ts, src/domain/providerConnections.ts, src/features/creation/taskRecovery.ts, src/features/generation-server/repository.ts, src/features/generation-server/http.ts, src/features/generation-server/main.ts, src-tauri/src/task_host.rs, tests/unit
- Verification: NOT_VERIFIED — 针对性验证157/157 Node单测、TypeScript和Rust TaskHost 7/7通过；closeout已完成三项原PARTIAL风险的实现。完整lint、format、build、ui:check、browser preview、Tauri release与独立审查绑定最终head后执行。
- Evidence: [docs/changes/2026-09-21-security-audit/audit.md](../../docs/changes/2026-09-21-security-audit/audit.md), [docs/changes/2026-09-21-security-audit/verification.md](../../docs/changes/2026-09-21-security-audit/verification.md), [docs/changes/2026-09-21-security-audit-closeout/intent.md](../../docs/changes/2026-09-21-security-audit-closeout/intent.md), [docs/changes/2026-09-21-security-audit-closeout/spec.md](../../docs/changes/2026-09-21-security-audit-closeout/spec.md), [docs/changes/2026-09-21-security-audit-closeout/plan.md](../../docs/changes/2026-09-21-security-audit-closeout/plan.md), [docs/changes/2026-09-21-security-audit-closeout/verification.md](../../docs/changes/2026-09-21-security-audit-closeout/verification.md), [docs/changes/2026-09-21-security-audit-closeout/review.md](../../docs/changes/2026-09-21-security-audit-closeout/review.md)
=======
## TASK-GOV-002 — 跨AI自主开发与分支质量门禁

- Goal: 落实共同规则、代码文档一致性、Git/CI防线和真实保护边界
- Scope: AI规则/SDLC/PR/Git防线/交付门禁/规则场景
- Acceptance: 入口统一、中文自然语言转工程任务; 真实push拒绝回归与delivery门禁通过; 规则、模板、脚本入口和账本绑定一致; 独立review和实际规则验证证据; 产品代码、产品测试、既有证据和其他人的提交保持只读
- Branch: `codex/TASK-GOV-002-closeout`
- Worktree: `D:/kk-studio-next/.worktrees/TASK-GOV-002-CLOSEOUT`
- Modules: docs, scripts/governance, .github, .githooks, config, tests/unit/deliveryPolicy.test.ts, tests/unit/gitPushPolicy.test.ts, tests/evals
- Verification: PARTIAL — PR #4 已 squash 合入 main，merge 92c1ef1；hosted delivery/verify、Rust fmt/test、client check、Tauri no-bundle build 全部成功；治理32tasks/0、push9/9、delivery12/12、AI场景12/12、基线正反例2/2。服务器 protection/rulesets API403仍BLOCKED，本地hook不能替代远端强制保护；产品代码、既有测试、旧证据和其他任务提交未由本任务写入。
- Evidence: [docs/changes/2026-09-20-ai-sdlc/verification.md](../../docs/changes/2026-09-20-ai-sdlc/verification.md), [docs/changes/2026-09-21-ai-sdlc-closeout/verification.md](../../docs/changes/2026-09-21-ai-sdlc-closeout/verification.md), [docs/evidence/ai-sdlc-2026-09-20/remote-audit.json](../../docs/evidence/ai-sdlc-2026-09-20/remote-audit.json)
>>>>>>> origin/main
- Updated: 2026-09-21
