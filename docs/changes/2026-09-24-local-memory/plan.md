# Plan：本地长期记忆服务接入对话（TASK-MEMORY-001）

- Task ID：TASK-MEMORY-001
- 状态：READY
- 日期：2026-09-24
- Intent / Spec / ADR：docs/changes/2026-09-24-local-memory/{intent,spec}.md；无新 ADR
- Owner / branch / worktree：root / feat/TASK-MEMORY-001-local-memory / D:/kk-studio/.worktrees/TASK-MEMORY-001
- Base / HEAD SHA 与远端目标：base=origin/main@76339c9；目标 PR → origin/main
- Git dirty/index 状态、并行任务与文件归属：当前 checkout（D:/kk-studio/KK-Studio-2.0）在 feat/TASK-AGENT-006-workbuddy-gateway 且含并发未提交改动，本任务在独立 worktree 进行，不触碰原 checkout；记忆模块文件全部新归属本任务。

## 开工证据

- 已读取的规则、账本、规范和实现：AGENTS.md、AI_RULES.md、SDLC.md、BRANCH-POLICY.md、PROJECT_STATE.md、DATA-STORAGE.md、feat-009/020 卡、task-ledger.json 结构、features.registry.json 结构；ai_group_chat（外部参考）memory 模块全部源码。
- 依赖/工具版本与安装：Node 24、npm、Tauri 2；无需新依赖（词法相似度手写，无 lodash 等）。
- 基线 lint/typecheck/相关测试：进入 worktree 后先 `npm ci`（如 node_modules 未就绪）并记录基线。
- PRE-EXISTING FAILURE 与关联任务：以 worktree 内 `npm run typecheck` 等基线为准；原 checkout 状态不回写。
- 计划中 AI 自主事项：Schema、规则、注入格式等按 spec 自主执行。
- 必需外部条件与已存在的用户授权：无外部条件；用户已授权整合接入。

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| ---- | --------- | ---------- | ---- | ---- |
| 1 | src/features/memory/types.ts | 定义 MemoryRecord/MemoryStoreFile/MemorySettings | 无 | typecheck |
| 2 | src/features/memory/extractor.ts | 本地规则抽取纯函数 + 指纹 | 1 | 单测 |
| 3 | src/features/memory/injector.ts | 词法检索 + 注入块格式化纯函数 | 1 | 单测 |
| 4 | src/features/memory/storage.ts | 平台适配：Web IndexedDB / Desktop IPC（memory_read/write） | 1 | 单测（fake platform） |
| 5 | src-tauri/src/storage_paths.rs | 新增 memory 路径 memory/memory.json | 4 | Rust 测试 |
| 6 | src-tauri/src/main.rs | memory_read/memory_write 命令（临时文件+rename） | 5 | Rust 测试 |
| 7 | src/features/memory/memoryService.ts | 编排：开关状态、采集调度、注入查询、手动提炼解析 | 2,3,4 | 单测 |
| 8 | src/features/agent/agentConnection.ts | sendMessage 注入记忆块（经 memoryService 门控） | 7 | 单测 + browser |
| 9 | src/features/memory/useMemory.ts + MemorySettingsSection.tsx | 设置页记忆分区 UI | 7 | browser 测试 |
| 10 | src/components/settings/ConnectionSettings.tsx | 挂载记忆分区，替换占位 | 9 | browser 测试 |
| 11 | 文档与治理 | feat-020 卡、registry、task-ledger、PROJECT_STATE、PROGRESS、DATA-STORAGE 说明 | 全部 | governance/features/markdown check |
| 12 | 完整验证 | npm run verify + Rust + 必要时 1421/Tauri 运行证据 | 全部 | verification.md |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：本任务独占 worktree；原 checkout 的 TASK-AGENT-006 等并行任务不回写本 worktree。
- 同文件写入的串行顺序：agentConnection.ts 是共享文件，本任务改动集中注入点（sendMessage），提交前检查是否有并发分支已改该文件（fetch 后 diff）。
- 整合负责人、目标 branch/base 和同步策略：本任务 branch → PR → main；交付前 fetch 最新 main 并 merge。
- 冲突后重新验证的范围：agentConnection.ts 相关单测与 browser 对话测试。

## 风险与恢复

- 最危险的失败场景与预防：IndexedDB 写失败导致对话阻塞 → 采集/注入全部 try/catch 且不阻塞主链路；记忆文件损坏 → 读失败拒绝覆盖保留原件。
- 数据备份/原件保护/回滚或补偿：重置身份时旧文件以 .previous-<ts>.json 保留；代码回滚即移除注入点。
- 触发恢复的条件及 runbook：存储读失败显示错误并可重试；极端情况清除 IndexedDB key 或 memory.json 恢复出厂（文档说明）。
- 高风险外部动作的授权、权限和费用边界：手动 Codex 提炼消耗用户 Codex 额度，仅用户主动点击触发。
- 不选择的方案及理由：不引入 SQLite/向量库（记忆量小，词法足够，避免 Desktop 复杂度）；不做 LLM 自动抽取（隐私约束，记忆内容不主动外发）。

## 验证和交付

- 定向回归：extractor/injector/storage/service 单测；browser 记忆设置页流程；对话注入断言。
- 完整验证：npm run verify（lint/typecheck/test/ui:check/format:check/test:ui）+ Rust cargo check/test；记录基线失败。
- UI 的 Figma/DOM/截图：记忆设置分区无独立 Figma Frame，按 Design System 组件规范实现并记录 DOM/截图证据。
- 独立 reviewer 与当前 SHA 审查：review.md 记录。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：步骤 11。
- PR、用户产品验收、发布和回滚记录：PR 描述含验收/风险/base-head SHA；用户最终验收。
- 暂不可验证项及准确状态：真实多账号切换防串号（执行器无账号 id，已标注）；记忆在真实 Tauri release 的运行证据视环境而定，未达成则标 NOT VERIFIED。

## 计划变更记录

- 无（初始计划）。
