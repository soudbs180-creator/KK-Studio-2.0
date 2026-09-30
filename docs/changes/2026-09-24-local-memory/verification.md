# Verification：本地长期记忆服务接入对话（TASK-MEMORY-001 + TASK-MEMORY-002 共享版）

## 2026-09-24 第二轮安全修补与验证（当前）

- 独立复核发现 Web Locks/文件独占流与 Desktop `.json.lock` 不互斥；Web 授权共享文件已改只读，浏览器私有 IndexedDB 保持可写并可切回。模拟 FSA 句柄使无头 Chromium 会话关闭，故真实系统目录授权仍未验收，不能称 Web 共享视图已跑通。
- Desktop 重置先复制备份再原子写入，失败时 live 文件仍可读。手动 Codex 提炼绑定本次 `clientMessageId`、thread 与完成阶段，且内部提炼指令不参加自动学习或记忆注入。旧候选数据库迁移在 `indexedDB.databases` 不可用时仍有浏览器回归。
- `npm run verify`：退出码 0；lint / governance（63 tasks、0 violations）/ features（29、0）/ Markdown（82、0）/ typecheck / UI 标准（160、0）/ format / build 通过；Node **415/415**，Playwright **309/309**（production preview）。本机日志 `D:/kk-studio/.tmp/memory-verify-20260924-readonly.log`。
- `cargo test --manifest-path src-tauri/Cargo.toml`：**91/91**，含重置写入失败保留 live 文件与备份。页面路径和截图仍见下节；新截图对应只读共享文案。完整桌面 release、真实 Codex 对话引用、豆包/WorkBuddy 接入未验证，本任务保持 PARTIAL / NOT_VERIFIED。

## 2026-09-24 复核勘误（以本节和后续新证据为准）

- 旧 `PASS` 是先前候选的自动化快照，不能证明跨应用记忆、真实模型引用或系统目录授权。尤其原测试将 malformed `records` 当空数组接受，未覆盖 Web 数据库与创作仓库版本冲突。
- 当前分支修补范围：独立 `kk-studio-memory` 数据库与双对象仓库、旧候选数据库迁移、损坏记录拒绝读取、Desktop 首写建目录及备份失败保护、共享写入冲突检测与重试、提炼回复完成判定、用户原话采集与常见凭据过滤、界面和契约文案纠正。
- 本轮红绿测试：`memoryStorage.test.ts` 损坏记录先失败后通过；Rust malformed record、首次写入、备份冲突先失败后通过；浏览器真实 IndexedDB 双仓库初始化通过。无头浏览器对模拟的系统目录句柄发生会话关闭，不能把 FSA 授权流程记为通过。
- 最终自动化结果见下方；桌面运行态与独立评审仍未完成。旧表格保留为历史。

### 本轮最终自动化与界面证据

- 基线 `origin/main@76339c9`，复核前分支 `55e93a1`；本轮修补在该分支后续提交。Windows 11、Node 24.19.0。
- `npm run verify`：退出码 0；lint / governance（63 tasks、0 violations）/ features（29、0）/ Markdown（82、0）/ typecheck / UI 标准（160、0）/ format / build 均通过；Node 单测 **413/413**，Playwright **309/309**（Vite production preview）。完整日志在本机 `D:/kk-studio/.tmp/memory-verify-20260924-reviewfix.log`，不提交生成日志。
- `cargo test --manifest-path src-tauri/Cargo.toml`：**90/90**，包括首次写入、重复替换、损坏文件写保护、失败备份保护、过期版本写入拒绝和并发写入互斥。
- 实际页面：`npm run test:ui` 从新构建 `dist` 启动 `http://127.0.0.1:1423/`，route `/`，`src/main.tsx → App.tsx → SettingsPanel.tsx → SettingsSections.tsx → ConnectionSettings.tsx → MemorySettingsSection.tsx`。浏览器 DOM 验证了开关、共享状态、错误态、清空确认和 390 px 可达性。截图：[启用态](evidence/memory-enabled-web.png)、[列表空态](evidence/memory-list-web.png)、[390 px](evidence/memory-enabled-390.png)。这是 Web 预览证据，不代表 Tauri release。
- 未验证：用户真实 Codex 对话中的记忆引用、系统目录 File System Access 用户授权、Desktop 打包运行、豆包/WorkBuddy 原生客户端共享、Web 与 Desktop 同时写同一目录。完整文件只在本机存储；选中片段进入当前模型请求。

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
