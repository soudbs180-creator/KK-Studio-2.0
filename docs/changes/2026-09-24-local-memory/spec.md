# Spec：本地长期记忆服务接入对话（TASK-MEMORY-001）

## 2026-09-24 复核修订（覆盖下方旧候选表述）

- 当前生效范围：KK Studio 的 Codex 对话可从**用户原话**采集、检索并注入记忆；豆包、WorkBuddy 原生客户端以及 Codex 独立桌面应用尚未接入。共享路径和格式是后续适配器契约，不能用登录状态代替实现证据。
- 完整文件仅在本机存储，不进同步、日志或导出；用户开启记忆后，最多 3 条、总长 ≤400 字的相关片段随当前请求发送给所选模型用于推理。自动采集排除常见凭据句子，模型回复不自动入库。
- Web 私有记忆和目录句柄存于独立 IndexedDB `kk-studio-memory`（两个对象仓库），避免与创作快照 `kk-studio-next` v1 冲突。授权失效时暂停共享记忆读写；损坏或零字节已有文件拒绝读取/覆盖。Desktop 首写创建目录，重置前必须成功备份。
- 删除/清空/重置需二次确认。Web 重置暂不提供文件级备份，界面须明示。真实 FSA 授权、Desktop release、模型引用和跨应用读写仍是验收缺口。

## 共享版更新（TASK-MEMORY-002，覆盖本文件隔离语义）

用户拍板：**本机默认共享 + 公共共享目录（~/.kk-memory/memory.json）+ 先打通 Codex 与豆包（WorkBuddy 预留）**。覆盖项：

- §存储契约：`namespace` 隔离语义废弃。共享文件 `~/.kk-memory/memory.json`（Windows `%USERPROFILE%\.kk-memory\memory.json`）；Desktop 由 Tauri `memory_read/memory_write/memory_reset_identity` 读写（Rust 侧指向共享路径，首次启用把旧 `<app-data>/memory/memory.json` 作为种子迁移）；Web 优先 File System Access（用户授权目录后持久读写），未授权/不支持降级 IndexedDB 并标记"仅本应用"。
- §格式：`MemoryStoreFile.namespace` 变为可选遗留字段（共享模式恒空）；`MemoryRecord` 移除 namespace；旧文件（含 namespace 字段）读取兼容（serde/normalize 忽略）。
- §身份与隔离：无身份键；换账号/换人时用户手动"清空全部记忆"或"重置共享文件"（旧文件 `.previous-<ts>.json` 保留）。
- §跨产品共享（新增）：Agent 契约见 `docs/MEMORY-CONTRACT.md`——Codex/豆包/WorkBuddy 读写同一共享文件；读取最多 3 条/总长 ≤400 字参考、低置信度跳过、与输入冲突时以输入为准；写入仅记录稳定偏好、指纹去重、不编造；隐私同密钥级（不上云/不同步/不进日志与导出）。
- §验收映射：AC-1 文案改"本机共享、仅存本地、不上云"；AC-4 改"各产品读写同一共享文件，清空/重置对本机所有产品生效"。
- §边界：豆包侧共享通过 Doubao Work 环境中的 Agent（遵循契约）读取同一文件实现；若豆包产品自身不运行本仓库代码，则豆包 App 原生对话不自动获得记忆（需 Agent 侧注入）。

---

- Task ID：TASK-MEMORY-001
- 状态：READY
- 日期：2026-09-24
- Intent / 账本：docs/changes/2026-09-24-local-memory/intent.md；task-ledger.json TASK-MEMORY-001
- 当前规范与实现基线：feat-009-conversation.md（Codex 对话 PARTIAL）、feat-020-memory.md（记忆 PROTOTYPE）、DATA-STORAGE.md（memory/ 目录规划）、AGENTS.md / AI_RULES.md / BRANCH-POLICY.md
- Source of truth：本包 spec.md 为行为契约；数据目录以 DATA-STORAGE.md 为总纲；功能状态以 features.registry.json 为权威。

## 用户行为与入口

### 主流程

1. 用户进入 设置 › 连接 › 记忆，看到"记忆服务"开关（默认关闭）、本地存储说明、当前记忆身份、记忆列表（空态提示）、"让 Codex 提炼记忆"按钮（需 Codex 已连接）。
2. 开启开关后：对话消息落库后自动规则抽取；发送对话前自动注入相关记忆块。
3. 用户发送偏好类消息（如"以后请用日系插画风格"）→ 规则抽取入库。
4. 后续对话发送相关问题时 → 词法检索相关记忆 → 注入 prompt → Codex 可引用。
5. 用户可在设置页查看/删除单条/清空全部记忆；可"重置记忆身份"（旧身份记忆保留但不可见，可重新开始）。

### 入口与组件

- `src/components/settings/ConnectionSettings.tsx`：现有记忆分区占位 → 挂载真实 `MemorySettingsSection`。
- `src/features/memory/`：新模块（见架构）。
- `src/features/agent/agentConnection.ts`：`sendMessage` 的 `postTurn` 组装处插入记忆注入。

### 状态覆盖

- 开关：off（默认，不采集不注入）/ on。
- 采集：异步，不阻塞发送；失败静默（不影响对话）。
- 注入：检索为空则不注入；Codex 未连接时开关禁用并说明原因。
- 手动提炼：点击后显示进行中；Codex 失败显示错误；成功显示新增条数。
- 删除/清空/重置：二次确认弹层；删除失败显示错误并可重试。
- 离线/恢复：记忆随本地存储恢复；不依赖网络。

## 架构、数据与权限

### 模块职责

```
src/features/memory/
├── types.ts                 # MemoryRecord / MemoryNamespace / MemorySettings
├── storage.ts               # 平台适配：Web IndexedDB / Desktop Tauri IPC
├── extractor.ts             # 本地规则抽取（纯函数，可单测）
├── injector.ts              # 词法检索 + [长期记忆] 块格式化（纯函数，可单测）
├── memoryService.ts         # 业务编排：开关、采集调度、注入查询、手动提炼解析
└── useMemory.ts             # React hook：设置页状态
```

依赖方向：UI → memoryService → storage/extractor/injector；agentConnection 仅依赖 injector 的检索结果（经 memoryService 门控）；**memory 模块不得 import sync/localStorage**（隐私硬边界）。

### Schema

```ts
type MemoryType =
  "user_profile" | "user_preference" | "user_habit" | "user_constraint";
type MemorySource = "auto_rule" | "manual_codex" | "manual_user";

interface MemoryRecord {
  id: string; // uuid v4
  namespace: string; // 本地记忆身份键（uuid，首次开启时生成）
  content: string; // ≤200 字
  memoryType: MemoryType;
  confidence: number; // 0~1
  fingerprint: string; // sha256(归一化 content)，去重
  source: MemorySource;
  sourceThreadId?: string;
  createdAt: string; // ISO-8601
  updatedAt: string;
  lastUsedAt?: string;
  active: boolean;
}

interface MemoryStoreFile {
  version: 1;
  namespace: string;
  records: MemoryRecord[];
}
```

- Web 存储：IndexedDB `kk-studio-next / memory / store`，key = "default"，值为 `MemoryStoreFile`；同一事务内校验 version，损坏拒绝读取并保留原件。
- Desktop 存储：`memory/memory.json`（固定路径，仿 conversations/index.json）；`memory_read` / `memory_write` Tauri 命令；写前临时文件 + rename，读失败返回错误不落空。
- localStorage：**禁止**存放记忆内容与 namespace（防浏览器扩展/同步读取）。

### 检索注入

- 打分：query 与记忆 content 的词法相似度（分词重叠率 0.4 + 序列相似度 0.6，参考 ai_group_chat `_lexical_score`）。
- 预算：最多 3 条，总长 ≤ 400 字符；仅 `active` 且 confidence ≥ 0.55。
- 注入格式（插入 KK_INSTRUCTIONS 与"用户指令："之间）：

```
[长期记忆]
- 1. [2026-09-20] 用户偏好：用户偏好日系插画风格。
注意：以上为本地记忆背景，与用户本轮明确输入冲突时以本轮输入为准。
```

- 开关关闭或检索为空时不注入。

### 规则采集

- 输入：对话消息（用户消息 + assistant 回复）。
- 触发词（用户消息）："喜欢/偏好/习惯/请用/尽量/以后/平时/希望/不要/别/务必/记住/记得/每次/常用"。
- 触发词（assistant 回复，仅当包含用户偏好结论）："你的偏好/用户偏好/已记住/以后会"。
- 抽取规则：命中后取该句（≤200 字）为记忆候选，剔除问候/寒暄/单字；confidence 按命中词强度 0.6~0.9；fingerprint 去重（同 namespace 下同 fingerprint 只更新时间戳）。
- 异步执行，不阻塞对话主链路。

### 手动 Codex 提炼

- 设置页按钮 → 调 `agentConnection` 发送特殊指令（复用现有对话通道）：
  "请从本次对话中提炼关于用户稳定偏好的 3~5 条事实，每行一条，以「记忆：」开头，不要输出其他内容。"
- 解析 assistant 回复中 `记忆：` 开头的行 → `manual_codex` 来源入库（confidence 0.85）。
- 前置条件：Codex 已连接且会话就绪；失败给出错误信息。

### 账号隔离与隐私

- namespace：首次开启记忆时生成 uuid 并写入存储文件；设置页显示身份短标识（前 8 位）与说明。
- "重置记忆身份"：生成新 namespace（旧文件重命名为 `.previous-<ts>.json` 保留，不删除），新对话在新身份下采集。
- 边界如实标注：执行器不暴露账号 id，namespace 是"本地记忆身份"而非账号 id；FEAT-017 上线后升级为账号 id 派生（记录在 feat-020 卡与 PROJECT_STATE）。
- 隐私硬边界（代码审计项）：
  - memory 模块不 import `src/features/sync`；
  - 记忆内容不进 localStorage、不进日志（console 仅打印条数，不打印内容）；
  - 导出包/项目包/WebDAV manifest 不含记忆（本期不实现记忆导出）。

### 相关 ADR

- 不新增 ADR：存储方式沿用 DATA-STORAGE.md 已规划的 `memory/` 目录与 conversations 文件模式，无新架构决策；如 Desktop 引入 SQLite 则需 ADR（本期不引入）。

## 平台能力

| 能力            | Desktop                          | Web           | Mobile        | 降级/禁用理由                           |
| --------------- | -------------------------------- | ------------- | ------------- | --------------------------------------- |
| 记忆存储        | memory/memory.json（Tauri 命令） | IndexedDB     | 沿用 Web      | Mobile 是响应式 Web（FEAT-028），随 Web |
| 自动规则采集    | 是                               | 是            | 是            | 纯前端，无平台差异                      |
| 手动 Codex 提炼 | 需 Agent 连接                    | 需 Agent 连接 | 需 Agent 连接 | 未连接时禁用并说明                      |
| 检索注入        | 是                               | 是            | 是            | 无平台差异                              |
| 账号 id 绑定    | 否（仅本地身份键）               | 否            | 否            | 执行器无账号标识；FEAT-017 后升级       |

## 生命周期与恢复

- 初始化/安装：首次开启记忆时创建 namespace 与存储文件；不预创建。
- 正常使用：开关 → 采集 → 注入 → 管理。
- 升级和旧 schema：文件 version=1；读取校验 version，未知版本拒绝读取保留原件。
- 损坏/写失败/进程重启：Web 读失败显示错误不覆盖；Desktop 写临时文件 + rename；读失败返回错误。
- 备份、还原、回滚：本期无导出/导入；重置身份时旧文件以 `.previous-<ts>.json` 保留（不自动删除）。
- 导出/卸载/退役：本期不提供记忆导出；卸载时记忆随应用数据目录保留（与现有数据一致）；文档标注。
- 不适用的原因：记忆为纯本地数据，无云端版本冲突问题。

## 验收映射

| Intent AC | 预期状态/结果                  | 检查/运行环境                                | 证据要求                 |
| --------- | ------------------------------ | -------------------------------------------- | ------------------------ |
| AC-1      | 开关真实可用，说明文案正确     | Web 浏览器 + Desktop Tauri                   | 单测 + browser 截图/断言 |
| AC-2      | 偏好消息 → 记忆入库 → 后续注入 | 单测（extractor/injector）+ browser 注入断言 | 测试证据                 |
| AC-3      | 列表/删除/清空可用             | 单测 + browser                               | 测试证据                 |
| AC-4      | namespace 隔离                 | storage 单测（两个 namespace 互不可见）      | 测试证据                 |
| AC-5      | 手动提炼入库                   | 单测（解析函数）+ browser 流程               | 测试证据                 |
| AC-6      | 不上云/不进 localStorage       | 静态审计 + 单测断言                          | 测试证据                 |
| AC-7      | 开关门控采集与注入             | 单测                                         | 测试证据                 |

## 风险和决策

- 可自主解决的技术决定及依据：Schema、规则关键词、打分权重、注入格式均参考 ai_group_chat 简化；Desktop 复用 conversations 文件模式。
- 待用户决定的产品语义：无（已确认仅用户级 + 规则+可选 Codex 辅助）。
- 规范冲突、外部依赖与阻断范围：无阻断。账号 id 绑定依赖 FEAT-017，本期明确不承诺。
- 与 intent 的差异及授权依据：无。
- 明确未承诺的能力：品牌/项目记忆、云同步、记忆导出、真实账号 id 绑定、多模型群聊。
