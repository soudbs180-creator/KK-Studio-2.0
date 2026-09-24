# KK Studio 数据与文件存储约定

本文定义 KK Studio 客户端的文件边界。实现以 `D:/kk-studio/KK-Studio-2.0` 为唯一工程来源；`D:/kk-studio` 仅为父容器，用户数据不存放在代码仓库。

## 运行时数据根目录

桌面版本通过 Tauri `dirs::data_dir()` 取得应用数据根目录：

- Windows：`%APPDATA%\kk-studio\`
- macOS：`~/Library/Application Support/kk-studio/`
- Linux：`$XDG_DATA_HOME/kk-studio/`（默认 `~/.local/share/kk-studio/`）

默认根目录仍为 `dirs::data_dir()/kk-studio`，没有 `KK_DATA_DIR` 环境变量覆盖。`AppPaths::initialize()` 现在接受显式 `--data-dir <绝对路径>`，用于用户指定目录或隔离 release 验收；缺值、相对路径和重复参数会报错。它不迁移原目录，也不改变 WebView 浏览器 profile；验收需另设独立 `WEBVIEW2_USER_DATA_FOLDER`。正常启动不把用户数据写进仓库，测试仅向 `src-tauri/target/` 下专用合成目录写入。

启动只创建规范目录并保留旧文件，旧数据不会自动迁移。创作快照使用下方安全仓库契约；聊天与配置文件仍按各自命令的现有边界写入，不能把创作仓库的保证推广到所有文件。

客户端目标根目录形态（其中项目 SQLite 尚未全部接线；记忆已接线，见下文"本地长期记忆"节）：

```text
kk-studio/
├─ app/                 # 可迁移的非敏感应用偏好和版本信息
│  ├─ settings.json     # 主题、语言、布局等；Zod settings schema
│  └─ recent.json       # 最近项目 ID 等导航偏好
├─ providers/           # 供应商非敏感元数据；不放 API Key
│  └─ config.json       # name/baseUrl/defaultModel/providerId；不含密钥
├─ projects/            # 每个项目一个目录或由 repository 管理
│  ├─ index.sqlite3     # 项目索引、revision、checksum、更新时间
│  ├─ <project-id>/graph.json
│  └─ <project-id>/revisions/…
├─ conversations/       # 会话消息
│  └─ index.json        # 会话索引；正文后续按会话拆分
├─ memory/              # 用户记忆；仅显式开启时写入（version=1）
│  └─ memory.json       # 含 namespace（本地记忆身份键）与 records
├─ assets/              # 已接线的原生素材仓库，不把原件写入 JSON
│  ├─ records/<assetId>.json # version=1及非敏感metadata
│  ├─ blobs/<sha256>    # 无扩展名的原始字节，内容寻址
│  └─ repository.lock  # 进程间互斥
├─ cache/               # 可删除缓存（缩略图、模型列表、临时响应）
├─ backups/             # 自动/手动快照，受保留策略管理
└─ logs/                # 脱敏诊断日志，不写请求头、API Key 或完整提示词
```

模型权重不属于应用数据：ComfyUI checkpoints、VAE、LoRA 等保留在用户选择的 ComfyUI 安装/模型目录中。客户端只保存路径和扫描结果摘要；路径不可直接当作可执行命令。

## 当前代码中的实际形状

当前 KK Studio 2.1.0 的浏览器端保存主题偏好、供应商元数据和创作快照恢复副本；完整创作快照在 Web 使用 IndexedDB，在 Tauri 使用 `projects/creation-v2.json` IPC 命令。历史 `kk-studio-next:*` 存储 key 继续保留以兼容已有数据。浏览器端 API Key 只在当前会话内存中，Windows 桌面端通过 `com.kkstudio.provider` 凭据命令读写系统凭据库：

| Key                                | Schema                                      | 用途                                                 | 风险/边界                                                  |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `kk-studio-next:settings:v1`       | `src/domain/settings.ts`，version=1         | 主题、语言、浮动布局、水印偏好                       | 只允许非敏感偏好                                           |
| `kk-studio-next:model-provider:v1` | `src/domain/modelProvider.ts`，version=1    | 供应商名称、Base URL、默认模型                       | API Key 只在当前 React state                               |
| `kk-studio-next:creation:v1`       | `src/features/creation/model.ts`，version=2 | 小型恢复副本；项目、任务、消息、附件草稿不含 API Key | 大附件优先以 IndexedDB 为耐久源，localStorage 仅作恢复副本 |

## 创作快照与画布契约（2026-09-16）

2026-09-18 T4：CreationTask 新增可选 `sourceItemId`（非空、最多 160 字符），绑定触发图片生成/编辑的节点。历史任务可不含此字段；来源节点后来被删除不使任务和归档失效。浏览器 normalizer、原生 snapshot validator 与 `.kkproject` 严格快照 schema 保留此字段；result edge 指向生成时的来源。中断恢复和取消仅修改该来源的状态。

- 共享模型：`src/domain/projectCanvas.ts` 定义 `project.canvas.version=1`，保存节点 positions、edges 和 viewport；节点 parameters 与 prompt/model 随 items 保存。总快照仍为 version=2。首次读取缺 canvas 的既有 2.0 快照使用确定性默认布局；历史版本从未保存的位置不能凭空恢复。未知版本、重复身份或不完整引用进入读取保护。
- 读取：`snapshotCodec.ts` 先验证，再补默认值；可检测的字符串截断或集合丢项会拒绝读取并保留原件。Desktop新归档媒体在耐久快照中使用下方asset引用，校验后水合为内存预览；已有超长内嵌data URL仍进入读取保护，不静默截断或自动迁移。
- Desktop：`read_creation_snapshot` 返回 `{status: missing|loaded|recovered, snapshot}`；错误用 `corrupt/unsupported/io/conflict` 分类。`write_creation_snapshot` 必须带 `expectedRevision`，在进程锁和操作系统文件锁内重新校验，拒绝过期或不递增的不同快照。Desktop 创作快照不回退到 localStorage。
- 文件：当前主文件是 `projects/creation-v2.json`，有效备份是 `.json.bak`；原始损坏文件以 `.json.corrupt.*` 留存，旧 canvas 升级前字节以 `.json.pre-canvas-v1.*` 留存。先写独立临时文件并 `sync_all`，再替换；损坏主文件不能轮转覆盖有效备份。Windows 已执行真实文件故障测试，但未宣称验证突然断电或所有文件系统的耐久保证。
- Web：IndexedDB `kk-studio-next / creation / snapshot` 是耐久源；同一事务内校验 revision，保存 backup 与首次 pre-canvas-v1。localStorage 只在 IDB 提交后保存有界恢复副本；sessionStorage 的 `kk-studio-next:creation:v1:pending` 是每标签页的未提交草稿，包含 baseRevision。重新读取时保留 recovery 副本；冲突不合并覆盖另一窗口。
- 状态：`useCreationStorage.ts` 串行保存、180ms 防抖，只在真实提交回执后确认已保存；读失败与 revision 冲突冻结自动写入。重新读取、写失败重试和下载未保存草稿是独立动作；重试成功清除过期错误。草稿下载为 JSON 恢复副本，尚不是含资产的可移植项目包。
- 验证范围：本轮验证的是本地创作快照、图与参数的正常保存/重启和恢复保护。强制终止前尚未提交的编辑、物理断电、完整资产备份/导入、后台任务继续执行仍需后续专门验收；当前关闭时有 beforeunload 未保存提示，不把它描述为原生持久 TaskHost。

对应实现和证据见 `docs/changes/2026-09-16-desktop-data-stability/verification.md`。

`src-tauri/src/storage_paths.rs` 已将桌面端文件固定为 `providers/config.json`、`conversations/index.json` 和 `projects/creation-v2.json`，启动时只保留旧根目录文件作为只读迁移来源，不会自动解析、复制或删除它们。创作页通过 `read_creation_snapshot` / `write_creation_snapshot` 使用项目快照边界；设置元数据仍由 provider schema 管理。目录常量与浏览器 key 集中在 `src/runtime/storage-contract.ts`。

账号目前没有真实 schema 或持久化：`AccountPopup` 和账号页仍是界面占位，任何 UID、积分和更新版本显示都不能当作服务数据。记忆已实现真实本地持久化（仅用户级），见下文"本地长期记忆"节。

## 本地长期记忆（2026-09-24，本机共享版）

- 范围：仅用户级记忆（偏好/习惯/约束/画像），**本机共享**：Codex（KK Studio 桌面/Web）、豆包（Doubao Work Agent）、WorkBuddy 读写同一份共享文件 `~/.kk-memory/memory.json`（Windows `%USERPROFILE%\.kk-memory\memory.json`）；仅存本地、绝不上云；与密钥/账号同级的本地私有数据处理。
- Schema（`src/features/memory/types.ts`）：`MemoryStoreFile { version: 1; namespace?: ""; records: MemoryRecord[] }`（namespace 为隔离版遗留字段，共享模式恒空）；单条记录含 `content（≤200字）/memoryType/confidence/fingerprint（sha256 归一化内容）/source/createdAt/updatedAt/active`，上限 10000 条。
- Desktop：`~/.kk-memory/memory.json`（跨产品约定，`src-tauri` 内 `shared_memory_path()`）；Tauri 命令 `memory_read / memory_write / memory_reset_identity`；写入为临时文件 + rename 原子写；重置时旧文件重命名 `.previous-<ts>.json` 保留；首次启用把旧 `<app-data>/memory/memory.json` 一次性种子迁移（不覆盖已有共享文件）。
- Web：优先 File System Access（用户授权共享目录后，handle 存 IndexedDB `kk-studio-next/memory-fs-handle` 持久复用）；不支持/未授权时降级 IndexedDB 私有存储（`kk-studio-next/memory/store`）并在 UI 明示"仅本应用"。
- localStorage 只存 `kk.memory.settings`（`{enabled: boolean}`）；记忆内容与目录句柄之外的数据绝不进 localStorage、WebDAV 同步（FEAT-019 scope 不含 memory）、日志（console 仅打印条数）、导出包/项目包。
- 跨产品契约：`docs/MEMORY-CONTRACT.md`（读取最多 3 条/总长 ≤400 字参考、低置信度跳过、与输入冲突以输入为准；写入仅稳定偏好、指纹去重、不编造；隐私同密钥级）。
- 隔离边界：无身份键（用户决策"本机默认共享"）；换账号/换人时用户手动清空或重置；真实账号 id 派生依赖 FEAT-017（见 feat-020-memory.md）。
- 采集：本地规则自动抽取（用户/assistant 消息）+ 手动"让 Codex 提炼"（解析 `记忆：` 行，消耗用户 Codex 账号额度，仅用户点击触发）。
- 注入：发送对话前词法检索（最多 3 条、总长 ≤400 字、confidence ≥0.55、active），在 KK_INSTRUCTIONS 与"用户指令："之间插入 `[长期记忆]` 块；默认开关关闭，关闭时零采集零注入。

## 原生素材仓库与项目引用（2026-09-16 T3a）

- 公共入口仍为 `src/features/creation/assetRepository.ts`；`nativeAssetAdapter.ts`集中选择Desktop IPC，Web继续IndexedDB `kk-studio-assets / blobs`。UI调用方不自行判断平台。共享`StoredGeneratedAsset`含assetId、完整SHA-256、mime、tags和非敏感来源；前端内存preview是data URL，不是永久存储地址。
- Desktop通过`asset_store / asset_read / asset_list`使用`src-tauri/src/asset_storage.rs`。原件为`assets/blobs/<64位sha256>`，记录为`assets/records/asset-<前24位sha256>.json`，记录`{version:1,metadata}`不包含媒体字节或preview。不依赖WebView IDB，不依赖VPS。
- Rust复算原件hash并校验ID；验证声明MIME白名单、1至100MiB边界、来源字段和日期，拒绝未知/秘密字段与符号链接/重解析点。MIME检查不是完整图像/视频解码或内容审核。UI聊天8MiB、图片10MiB上传限制仍单独保留。
- 写入持有进程Mutex和OS文件锁，先提交已校验的不可变原件，再以临时文件、sync、写后校验、rename提交记录。重复内容复用一个blob，合并有界来源，保留既有AI来源。不自动删孤立blob；写入失败/未知版本保留原文件。Windows突然断电保证未验收。
- Desktop快照由`snapshotAssets.ts`在字段白名单内编码：homeDraft/project/composerDraft/task附件、图片preview与item.result.src；仅已存在且内容对应的归档替换为`kk-asset:<assetId>`。读取先验证快照再读原件恢复UI；缺原件、hash不符、引用身份冲突进入保护。独立poster、用户文字和demo相对路径不改写。
- 旧内嵌媒体找不到native归档时保留原样，不自动从旧IDB、历史目录迁移。Desktop 现已支持独立的 .kkproject 导出/恢复；草稿 JSON 本身仍不能替代含原件的项目包。
- 图片生成前`resolveAttachments.ts`恢复引用媒体；缺原件或引用身份冲突直接报错，禁止丢弃参考图后退化成文生图。素材库读取失败由`useAssetArchive.ts`显示错误/重试；不会把读取失败解释成真实空库。
- 2026-09-21 更新：素材库列表使用元数据分页（IPC/共享接口最多100项，UI每页40项），可见卡片串行加载最长边320px的WebP预览，内存缓存最多24项。筛选/搜索会补读剩余元数据页；详情、重绘、项目包继续校验并读取完整原件。Native列表仍检查原件路径/类型/大小，hash在实际读取及全量完整性检查时验证。Web新记录只保存Blob与无preview元数据，兼容已有含preview记录。
- 本轮125项约280MiB的回归证明有界读取和原件一致性；新生成会话/画布快照仍可保留完整预览，持久缩略图、同步大快照和更大容量验收继续由PERF-001跟踪。不能用Desktop验收替代Web MUR验收。

代码与运行证据见 `docs/changes/2026-09-16-native-assets/verification.md`。T3b Desktop 项目包和全新 WebView 恢复已通过，见 docs/changes/2026-09-18-project-package/verification.md。

## 历史数据参考

历史备份中出现过以下数据，迁移工具可读取但不可默认恢复或删除：

- `projects.sqlite3`：`projects(id, revision, checksum, payload, updated_at)`。
- 项目 JSON v2：`schemaVersion=2`、`id/title/timestamps/revision/settings/nodes/connections/viewport/chatSessions/activeChatId`。
- canonical `ProjectGraph`：`workspace/project/revision/checksum/nodes/connections/groups/layers/assets/providerTasks/chatSessions/extensions`，见恢复归档中 legacy 的 `src/core/contracts/projectGraph.ts`；归档位置与恢复说明见本轮 consolidation change package。
- `project-backups/` 和 `legacy-canvas-backups/`：只读恢复副本，保留来源和校验值。

## 密钥与用户信息

API Key、OAuth refresh token、代理凭据等只进入系统凭据库（Windows Credential Manager；Tauri service `com.kkstudio.provider`）或当前请求的内存。它们不得出现在 localStorage、SQLite、项目文件、导出包、URL query、错误消息或日志。供应商记录只保存 `providerId/name/baseUrl/defaultModel` 和 `credentialRef`。读取外部数据先用 Zod schema 校验并限制字符串长度、URL 协议和路径范围。

用户/品牌记忆与项目内容是不同的数据域：项目只引用 `brandProfileId` 或 memory 版本，不复制全部记忆。记忆删除、导出和关闭加载应有明确状态；未接后端时控件必须禁用并说明原因，不能把前端 state 当作已保存。

## 迁移原则

1. 目标行为是启动时只读当前 schema；当前 Rust 启动逻辑对配置使用 serde 默认值、对会话使用空数组回退，尚未提供统一版本错误状态，因此接线前不能宣称完成 schema 迁移。
2. 旧 localStorage（`kk-studio:canvas`、`kk-studio:last-workspace`、`kkstudio_settings`）和旧 `data/` 备份只通过一次性、用户触发的迁移导入；当前 `storage_paths.rs` 仅创建目录并保留同一 AppData 根目录下的旧 config/conversations 文件，不执行迁移。
3. 导入项目先验证 Zod schema、引用完整性和 checksum，再原子写入新 repository。Desktop 的 .kkproject 已校验 schema/checksum/引用并在独立新目录 staging/回读/发布；既有目标（包括空目录）拒绝。Web 文件 adapter 与旧数据迁移仍未完成。
4. 迁移成功前不删除旧数据；失败时保留诊断和恢复路径。
5. 数据目录位置、schema 版本、备份保留策略在 `docs/architecture/` 维护，功能变更同步 `docs/PROGRESS.md`。
