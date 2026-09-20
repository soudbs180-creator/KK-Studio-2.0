# 旧工程能力迁移边界

本文是 `D:\kk-studio-next` 的工程迁移清单。它只描述代码和格式的取舍，不会读取、导入或修改用户数据。旧工程的只读来源是 `D:\KK-Studio-legacy-archive-20260909`；用户数据备份 `D:\KK-Studio-user-data-backup-20260909` 不属于源码迁移范围。

## 当前工程边界

现在的产品是 Figma 优先的 React/Vite 工作台，桌面壳由 `src-tauri/` 承载。当前浏览器 UI 的状态模型仍以 `src/App.tsx` 和 `src/domain/` 为准，只有设置和供应商非敏感字段有浏览器 schema；账号、云端项目同步、服务端生成和记忆仍未接通。迁移旧能力时，先保留当前 Figma UI 和状态边界，再为后端能力建立经过校验的契约。

## 决策表

| 旧能力（只读来源） | 决策 | 当前目标路径 | 处理方式和理由 |
| --- | --- | --- | --- |
| `server/projectRepository.mjs` | **migrate** | `src-tauri/src/storage/project_repository.rs`（后续拆分） | 保留 schema migration、canonical checksum、revision 乐观并发、原子写入和 revision backup 的行为；用 Rust 存储层重写，不能在 Tauri 运行时依赖 Node `node:sqlite`。 |
| `src/core/contracts/projectGraph.ts` | **migrate** | `src/domain/project.ts` 与 `src/domain/schemas/` | 作为导入/持久化契约的参考，收紧为当前版本的 Zod schema。旧的 `passthrough` 字段不能未经审查进入产品格式。 |
| `server/legacyCanvasMigration.mjs`、`src/core/migrations/legacyCanvasMigration.ts` | **migrate** | `scripts/migrations/legacy-canvas/`；调用入口以后放 `src-tauri/src/commands/migration.rs` | 复用校验、备份、checksum 和失败可恢复的流程。它是一次性显式导入工具，不得在启动时静默改写旧数据。 |
| `src/modules/generation/TaskQueue.ts`、`src/modules/generation/taskProjection.ts` | **migrate** | `src/integrations/generation/` 或 `src-tauri/src/runtime/task_queue.rs` | 保留稳定 task id、优先级、最大并发、AbortSignal、取消后丢弃迟到结果和单次 settle 的语义；接入真实 provider 前不显示“已生成”。 |
| `src/modules/generation/BaseProvider.ts`、`OpenAICompatibleProvider.ts`、`GenerationService.ts` | **rebuild** | `src/integrations/providers/openai-compatible/` | 旧实现依赖旧 stores、旧节点类型和旧服务路由。只提取请求/响应 schema、取消和错误分类；重新绑定当前 `src/domain` 契约，并让密钥经过凭据适配器。 |
| `src/modules/credentials/CredentialService.ts` | **migrate** | `src/integrations/credentials/` | 保留 desktop keyring / web session-only 两种运行时模式和 provider id 校验；统一 service 名称为当前 `src/runtime/storage-contract.ts` 的 `com.kkstudio.provider`，绝不把 secret 写进 provider JSON、localStorage 或日志。 |
| `src/core/comfyui/*`、`src/modules/comfyui/ComfyUILocalService.ts` | **migrate** | `src/integrations/comfyui/`；Tauri 命令在 `src-tauri/src/commands/comfyui.rs` | 复用扫描结果的 schema、模型类别映射、取消/离线状态和路径边界检查。模型权重仍在用户选择的外部 ComfyUI 根目录；客户端保存实例路径和扫描摘要。 |
| `server/proxyPolicy.mjs`、`src/modules/api/ApiClient.ts` | **rebuild** | `src/integrations/api/` | 仅在明确实现受控后端代理时重写。保留私网地址、允许来源、hop-by-hop header 和 redirect 的安全规则；旧的自动同步不能直接恢复。 |
| `src/core/logging/diagnosticLogger.ts`、`server/diagnosticLogger.mjs` | **migrate** | `src/runtime/diagnostics/` 与 `src-tauri/src/diagnostics/` | 保留 secret、token、本地路径和请求头脱敏，导出 `schemaVersion` 诊断包；禁止记录完整提示词和 Authorization。 |
| `src/modules/asset/AssetService.ts`、`src/core/storage/StorageAdapter.ts` | **rebuild** | `src/domain/assets.ts`、`src/integrations/storage/` | 旧服务是内存 Map 和 Blob URL，刷新后会失效，不能当桌面持久化层。提取筛选、标签和类型规则；重新实现内容寻址 Blob、元数据索引和原子写入。 |
| `src/modules/api/projectSync.ts` | **reject for now** | 无 | 它把 local store 当源并自动向后端同步，且会在后端可用时恢复项目；当前后端尚未接通，启用会伪造持久化并覆盖状态。待项目 repository 和用户可见冲突 UI 完成后重新设计。 |
| 旧 `src/stores/*`、`src/views/*`、`src/components/workbench/*` | **reject** | 无（逐个按 Figma 重建） | 这些组件和 store 属于旧界面信息架构，与当前 Figma-first 画布和 `src/App.tsx` 状态不一致；整批迁移会重新引入错误偏移和无响应按钮。 |
| 旧 Agent/MCP、Director3D、CodeEditor、ClipStudio、Skill 执行器 | **reject for now** | 无 | 当前工作台尚未定义可用后端和权限边界；保留设计参考，不把占位入口变成假功能。 |

## 旧文件到当前文件的明确映射

当前已经存在的目标文件优先复用：

- 旧 `src/core/assets.ts` → 当前 `src/domain/assets.ts`。只迁移 Zod 资源格式和过滤规则；`initialAssets` 是演示 fixture，不是用户资产库。
- 旧 `src/core/canvasGraph.ts`、`canvasItems.ts`、`canvasViewport.ts` → 当前 `src/domain/canvasGraph.ts`、`canvasItems.ts`、`canvasViewport.ts`。保留纯几何函数和连接规则；不把旧节点 JSON 当作当前 React 状态直接赋值。
- 旧 `src/core/settings.ts`、`modelProvider.ts` → 当前 `src/domain/settings.ts`、`src/domain/modelProvider.ts`，存储 key 集中在 `src/runtime/storage-contract.ts`。
- 旧 `src/modules/modelProvider.ts` → 当前 `src/integrations/modelProvider.ts`，仅保留模型列表 URL/响应校验；请求凭据由凭据适配器注入。
- 旧 Figma/演示资源 → 当前 `public/design/figma/`、`public/fixtures/demo/`；不能将截图、录像或过期导出放进运行时资源。

## 为什么 SQLite 和旧 ProjectGraph 不能直接复制到 React state

旧数据库 `data/projects.sqlite3` 的 `projects` 表保存 `id`、`revision`、`checksum`、`payload` 和 `updated_at`；`payload` 是 `schemaVersion=2` 的完整 ProjectGraph。它包含 workspace/project 元数据、节点位置和尺寸、connections、groups、layers、assets、providerTasks、chatSessions 等集合。

当前 React 状态使用的是面向当前原型的 `CanvasCollectionItem[]`：节点字段是 `id/title/description/kind/prompt/preview/result`，连接使用 `source/target`，收藏和喜欢则在 `App.tsx` 的内存 `Set` 中维护。两者存在结构和语义差异：旧 `fromNodeId/toNodeId` 不能无损赋给 `source/target`，旧节点的 `type/position/width/height/metadata` 也没有当前字段的对应存储；任务、会话、资产引用和 revision/checksum 会在直接赋值时丢失。反过来，当前 demo 节点也没有合法的 ProjectGraph workspace、checksum 和 revision，直接写 SQLite 会生成不可验证的图。

SQLite 还可能带有 `-wal`/`-shm` 文件。没有一致性快照、只读事务和 checksum 验证就复制主文件，会得到不完整数据库。Tauri 端也不应把 Node 的 `node:sqlite` API 当作运行时依赖。

正确路径是：

1. 在显式迁移流程中，以只读方式取得旧数据库或项目 JSON 的一致快照，并记录来源绝对路径、字节数和 SHA-256。
2. 解析旧 ProjectGraph schema，检查唯一 ID、连接引用、时间戳、路径和 checksum；失败时只生成报告，不写目标。
3. 通过版本化转换器生成当前 `src/domain` 的项目契约。转换器必须明确处理节点类型、连线方向、视口、资产引用、聊天和不支持的字段，并把无法转换的内容列为 warning。
4. 在新 repository 中写入新项目目录和 revision backup，回读后再次验证 checksum；导入成功前保留旧源和备份。
5. UI 只从新 repository 的读取接口恢复；不能把 SQLite payload、localStorage 或导入对象直接塞进 `App.tsx` state。

## 迁移执行顺序（不触碰用户数据）

1. 先完成 `src/domain` 的当前项目/资产/会话 schema 和测试。
2. 在临时 fixture 中复制旧项目 JSON 的代表性样本，测试 legacy converter、引用完整性、checksum 和错误报告。
3. 实现 Tauri storage repository 与原子写入；先使用空的新数据根目录运行，不指向 `D:\KK-Studio-user-data-backup-20260909`。
4. 加入用户可见的“检查 → 预览 → 导入 → 回读验证”流程，并显示取消、离线、失败和恢复路径。
5. 通过 `npm run typecheck`、`npm run build`、核心迁移测试、`npm run ui:check` 和真实浏览器回归后，才考虑接入真实用户数据导入。

本文件不授权任何删除、覆盖或自动迁移操作。旧工程归档和用户数据备份必须继续保留，直到新 repository 的导入报告和回读校验均通过。
