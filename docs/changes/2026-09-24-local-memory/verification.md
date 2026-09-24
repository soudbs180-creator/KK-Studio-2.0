# Verification：本地长期记忆服务接入对话（TASK-MEMORY-001 + TASK-MEMORY-002 共享版）

- Task ID：TASK-MEMORY-001 / TASK-MEMORY-002
- 状态：PASS
- 日期：2026-09-24
- 基线：origin/main@76339c9；分支 feat/TASK-MEMORY-001-local-memory（worktree：D:\kk-studio\.worktrees\TASK-MEMORY-001）
- 验证环境：Windows 11 + Node v22.23.2 + Rust（cargo test 84/84）+ Playwright（Chromium）

## 验证命令与结果

| 步骤 | 命令 | 结果 |
| ---- | ---- | ---- |
| 单元测试（全量） | `npm test` | 404/404 通过（记忆模块 34 例） |
| 类型检查 | `npm run typecheck` | 通过（0 错误） |
| ESLint | `npm run lint`（eslint 段） | 通过（0 warnings） |
| 治理检查 | `npm run governance:check` | 63 tasks，0 violations |
| 功能卡检查 | `npm run features:check` | 29 features，0 violations |
| UI 标准检查 | `npm run ui:check` | 160 文件，0 违规 |
| 格式检查 | `npm run format:check` | 通过（新文件已 prettier 格式化） |
| Rust 编译检查 | `npm run client:check`（cargo check） | 通过（需先 build dist） |
| Rust 测试 | `cargo test --manifest-path src-tauri/Cargo.toml` | 84/84 通过（含共享路径/种子迁移 2 个新增用例） |
| 浏览器测试 | `npm run test:ui`（Playwright） | 303 passed + 1 flaky（已知 responsive-layout，无失败） |

## AC 映射与证据（共享版语义）

| ID | 验收条件 | 证据 |
| -- | -------- | ---- |
| AC-1 | 设置 › 连接 › 记忆 可开关，说明"本机共享、仅存本地、不上云" | `tests/unit/memoryService.test.ts`（开关状态机）；`tests/browser/memory-settings.spec.ts`（开关渲染、共享状态、授权按钮） |
| AC-2 | 偏好消息自动入库，后续对话注入 `[长期记忆]` 块 | `tests/unit/memoryExtractor.test.ts`；`tests/unit/memoryService.test.ts`（ingestMessage/buildInjection） |
| AC-3 | 记忆列表/删除单条/清空 | `tests/unit/memoryService.test.ts`（deleteRecord/clearAll）；browser 测试 |
| AC-4 | 本机共享生效：各产品读写同一共享文件，清空/重置对本机所有产品生效 | `tests/unit/memoryService.test.ts`（无 namespace、storageMode/Status）；`tests/unit/memoryStorage.test.ts`（共享文件契约名）；Rust `seed_shared_memory` 测试（旧文件一次性迁移、不覆盖已有共享文件） |
| AC-5 | 手动 Codex 提炼入库 | `tests/unit/memoryService.test.ts`（saveCodexExtraction） |
| AC-6 | 记忆不上云：不进同步/localStorage/日志/导出 | 静态审计：`src/features/memory/**` 无 sync import；localStorage 仅 `kk.memory.settings`；WebDAV manifest 不含记忆；Agent 契约 `docs/MEMORY-CONTRACT.md` §5 |
| AC-7 | 开关关闭时不采集不注入 | `tests/unit/memoryService.test.ts`（disabled 门控） |

## 关键风险核对

- 共享文件只出现在 `~/.kk-memory/memory.json`（Desktop 原子写 + Web FSA 授权读写）；未授权 Web 降级 IndexedDB 并在 UI 明示"仅本应用"。
- 旧隔离文件仅一次性种子迁移：共享文件已存在时不覆盖（Rust 测试覆盖）。
- 损坏/版本不匹配拒绝读取并保留原件（normalizeStore/Rust 测试覆盖）。
- 采集/注入 try/catch 静默失败，不阻塞 Codex 对话主链路。
- 边界如实标注：三个产品账号体系不同，无法自动识别"同一账号"→ 用户拍板本机默认共享 + 手动清空；真实账号 id 绑定依赖 FEAT-017；豆包 App 原生对话（不运行本仓库代码的端）不自动获得记忆，需 Agent 遵循契约注入。

## 验证缺口（如实披露）

1. **豆包侧实际注入**：契约（MEMORY-CONTRACT.md）已建立，Doubao Work 环境中的 Agent 可按契约读取共享文件；本会话即作为豆包侧 Agent 遵循该契约（读取/参考在对话中生效），但"豆包 App 原生对话自动注入"不在本仓库代码可控制范围。
2. **Web FSA 授权流**：浏览器测试覆盖 UI 渲染与降级逻辑；`showDirectoryPicker` 用户手势授权需人工在真实浏览器中体验一次。
3. **真实 Codex 会话记忆引用**：注入块格式与检索已由单测覆盖，模型实际引用需用户开启记忆后体验确认。

