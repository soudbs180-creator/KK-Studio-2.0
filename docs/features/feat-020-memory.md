# 长期记忆服务（FEAT-020）

- 状态：PARTIAL
- 领域：platform
- 最近更新：2026-09-24
- 关联任务：TASK-MEMORY-001、BACKEND-PLATFORM、T10、FEAT-017

## 用户可见入口

- 设置 › 连接 › 记忆：真实开关（默认关闭）、本地存储说明、当前记忆身份、记忆列表（查看/删除/清空）、"让 Codex 提炼记忆"（需 Codex 已连接）。

## 代码位置

- `src/features/memory/`：types/extractor/injector/storage/memoryService/useMemory。
- `src/components/settings/ConnectionSettings.tsx`、`src/components/settings/MemorySettingsSection.tsx`。
- `src/features/agent/agentConnection.ts`：sendMessage 注入 [长期记忆] 块。
- `src-tauri/src/storage_paths.rs`、`src-tauri/src/main.rs`：memory_read/memory_write 命令。

## 测试与证据

- 单测：tests/unit/memoryExtractor.test.ts、memoryInjector.test.ts、memoryStorage.test.ts、memoryService.test.ts。
- 浏览器：tests/browser/memory-settings.spec.ts（开关/列表/删除/提炼/注入）。
- 本轮验证：docs/changes/2026-09-24-local-memory/verification.md。

## 当前能力

- 本地长期记忆（用户级）：对话消息规则采集 + 手动 Codex 提炼，IndexedDB（Web）/ memory/memory.json（Desktop）持久化。
- 对话发送前词法检索相关记忆并注入 [长期记忆] 块（执行器零修改）。
- 账号隔离：记忆按本地身份键（namespace）分区，默认关闭、显式开启；不同身份互不可见。
- 隐私：记忆仅存本地，不进 WebDAV 同步、localStorage、日志、导出包。

## 差距与后端化（Wave 3）

- 真实账号 id 绑定（当前为本地记忆身份键，随 FEAT-017 身份体系升级）。
- 品牌级/项目级记忆；记忆导出/导入；云同步明确不做（用户约束：记忆不上云）。
- 多模型群聊编排不属于本功能范围（ai_group_chat 仅吸收记忆能力）。

## 变更记录

- 2026-09-21：创建卡片，状态 PROTOTYPE。
- 2026-09-24：TASK-MEMORY-001 接入本地长期记忆（用户级），状态推进 PARTIAL；真实账号绑定仍待 FEAT-017。
