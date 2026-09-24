# 长期记忆服务（FEAT-020）

- 状态：PARTIAL
- 领域：platform
- 最近更新：2026-09-24
- 关联任务：TASK-MEMORY-001、TASK-MEMORY-002、BACKEND-PLATFORM、T10、FEAT-017

## 用户可见入口

- 设置 › 连接 › 记忆：真实开关（默认关闭）、本机共享说明与共享目录授权、记忆列表（查看/删除/清空）、"让 Codex 提炼记忆"（需 Codex 已连接）、重置共享文件。

## 代码位置

- `src/features/memory/`：types/extractor/injector/storage/memoryService/reply/useMemory。
- `src/components/settings/ConnectionSettings.tsx`、`src/components/settings/MemorySettingsSection.tsx`。
- `src/features/agent/agentConnection.ts`：sendMessage 注入 [长期记忆] 块。
- `src-tauri/src/storage_paths.rs`、`src-tauri/src/main.rs`：memory_read/memory_write/memory_reset_identity 命令（共享路径 + 旧文件种子迁移）。
- `docs/MEMORY-CONTRACT.md`：跨产品 Agent 读写契约（Codex/豆包/WorkBuddy）。

## 测试与证据

- 单测：tests/unit/memoryExtractor.test.ts、memoryInjector.test.ts、memoryStorage.test.ts、memoryService.test.ts、memoryReply.test.ts。
- 浏览器：tests/browser/memory-settings.spec.ts（开关、共享状态、空态、损坏数据、清空确认、390 px 可达性与存储库初始化）；提炼/注入由单测覆盖，真实会话仍待联调。
- 本轮验证：docs/changes/2026-09-24-local-memory/verification.md。

## 当前能力

- 本地长期记忆（用户级，本机共享）：对话消息规则采集 + 手动 Codex 提炼，共享文件 `~/.kk-memory/memory.json` 持久化（Web 授权目录后读写，未授权降级 IndexedDB 并明示；Desktop 走 Tauri 命令）。
- 跨产品共享文件格式与路径已定义；当前自动采集和注入只接入 KK Studio 的 Codex 对话。豆包、WorkBuddy 原生客户端尚未实现该契约；换账号/换人时用户需手动清空或重置。
- 对话发送前词法检索相关记忆并注入 [长期记忆] 块（执行器零修改）。
- 隐私：完整记忆文件仅存本机，不进 WebDAV 同步、localStorage、日志、导出包；开启后相关片段会发送给当前模型用于回答。

## 差距与后端化（Wave 3）

- 真实账号 id 绑定（当前无身份键、本机共享，随 FEAT-017 身份体系升级后可按登录账号自动隔离/共享）。
- 品牌级/项目级记忆；记忆导出/导入；云同步明确不做（用户约束：记忆不上云）。
- 多模型群聊编排不属于本功能范围（ai_group_chat 仅吸收记忆能力）。
- 豆包、WorkBuddy 原生对话及 Codex 独立桌面应用不会因登录或本仓库存在记忆文件而自动获得记忆；需要各自受支持的适配器和真实联调。
- Web 系统目录授权、Desktop 打包运行态、真实 Codex 对话记忆引用仍需真实环境验证；Web 当前重置尚无文件级备份。
- Desktop 写锁、Web 独占写流及版本冲突重试已有回归；Web 与 Desktop 同时写共享目录仍未经过真实联调，外部客户端需先实现同一并发契约。

## 变更记录

- 2026-09-21：创建卡片，状态 PROTOTYPE。
- 2026-09-24：TASK-MEMORY-001 接入本地长期记忆（用户级），状态推进 PARTIAL；真实账号绑定仍待 FEAT-017。
- 2026-09-24：TASK-MEMORY-002 改为本机共享（公共目录 ~/.kk-memory/memory.json，覆盖原隔离语义）；新增 MEMORY-CONTRACT.md 作为后续适配器契约。复核纠正了跨应用已打通的过早表述。
