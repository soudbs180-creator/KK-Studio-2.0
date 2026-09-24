# Verification：本地长期记忆服务接入对话（TASK-MEMORY-001）

- Task ID：TASK-MEMORY-001
- 状态：PASS
- 日期：2026-09-24
- 基线：origin/main@76339c9；分支 feat/TASK-MEMORY-001-local-memory（worktree：D:\kk-studio\.worktrees\TASK-MEMORY-001）
- 验证环境：Windows 11 + Node v22.23.2 + Rust（cargo test 82/82）+ Playwright（Chromium）

## 验证命令与结果

| 步骤 | 命令 | 结果 |
| ---- | ---- | ---- |
| 单元测试（全量） | `npm test` | 402/402 通过（其中记忆模块 32 例） |
| 类型检查 | `npm run typecheck` | 通过（0 错误） |
| ESLint | `npm run lint`（eslint 段） | 通过（0 warnings） |
| 治理检查 | `npm run governance:check` | 62 tasks，0 violations |
| 功能卡检查 | `npm run features:check` | 29 features，0 violations |
| UI 标准检查 | `npm run ui:check` | 160 文件，0 违规 |
| 格式检查 | `npm run format:check` | 通过（11 个新文件已 prettier 格式化） |
| Rust 编译检查 | `npm run client:check`（cargo check） | 通过（需先 build dist，Tauri generate_context 要求） |
| Rust 测试 | `cargo test --manifest-path src-tauri/Cargo.toml` | 82/82 通过（含 memory_tests 与 storage_paths 的 memory 用例） |
| 浏览器测试 | `npm run test:ui`（Playwright） | **304/304 通过**（含新增 memory-settings 4 例、更新 page-alignment 记忆断言；1 例并发 flaky 隔离重跑通过） |

## AC 映射与证据

| ID | 验收条件 | 证据 |
| -- | -------- | ---- |
| AC-1 | 设置 › 连接 › 记忆 可开启/关闭，说明"记忆仅存本地、随账号隔离" | `tests/unit/memoryService.test.ts`（开关状态机）；`tests/browser/memory-settings.spec.ts`（开关渲染、aria-checked、空态） |
| AC-2 | 偏好消息自动入库，后续对话注入 `[长期记忆]` 块 | `tests/unit/memoryExtractor.test.ts`（规则抽取）；`tests/unit/memoryService.test.ts`（ingestMessage 入库、buildInjection 返回 `[长期记忆]` 块）；注入格式见 spec.md §检索注入 |
| AC-3 | 记忆列表/删除单条/清空 | `tests/unit/memoryService.test.ts`（deleteRecord/clearAll）；`tests/browser/memory-settings.spec.ts`（列表与删除按钮渲染） |
| AC-4 | 身份隔离：重置后旧记忆不可见、不串号 | `tests/unit/memoryService.test.ts`（resetIdentity 清空、ensureNamespace 生成身份键）；`tests/unit/memoryStorage.test.ts`（store 契约）；结构保证：每个身份一个存储文件/key，互不可见 |
| AC-5 | 手动 Codex 提炼入库 | `tests/unit/memoryService.test.ts`（saveCodexExtraction 解析「记忆：」行、去重、计数） |
| AC-6 | 记忆不上云：不进同步/localStorage/日志/导出 | 静态审计：`src/features/memory/**` 无 `sync` import；localStorage 仅 `kk.memory.settings`（布尔开关）；日志仅打印条数不打印内容；WebDAV manifest 不含记忆（FEAT-019 scope 不含 memory） |
| AC-7 | 开关关闭时不再采集/注入 | `tests/unit/memoryService.test.ts`（disabled 时 ingestMessage 不写、buildInjection 返回空） |

## 关键风险核对

- 记忆内容只出现在 IndexedDB（Web）与 `memory/memory.json`（Desktop）两个本地通道；`kk.memory.settings` 仅存 `{enabled: boolean}`。
- Desktop 写入为临时文件 + rename 原子写；读损坏文件拒绝读取并保留原件（`normalizeStore` 版本校验，单测覆盖）。
- 采集/注入全程 try/catch 静默失败，不阻塞 Codex 对话主链路（memoryService 测试覆盖）。
- 边界如实标注：执行器不暴露账号 id，本期用"本地记忆身份"（namespace uuid）隔离，真实账号 id 绑定依赖 FEAT-017（见 intent/spec 与 feat-020 卡）。

## 验证缺口（如实披露）

1. **端到端注入**（AC-2 的"Codex 引用记忆"环节）：单元与 UI 层已验证（注入块格式、检索打分、开关门控），但"真实 Codex 会话中模型实际引用记忆"需要用户在有 Codex 账号的环境中开启记忆后人工体验确认；自动化无法覆盖真实模型行为。
2. **Desktop 运行态**：Rust 命令与路径已通过 cargo 测试（写入/损坏/版本/roundtrip），未做 Tauri 运行时手工冒烟；构建产物需用户本机 `tauri dev` 或打包后验证。
3. **记忆身份与账号切换联动**：FEAT-017 未上线，切换 Codex 账号不会自动切换记忆身份（用户可手动"重置身份"）；已在 UI 文案与 feat-020 卡中说明。
