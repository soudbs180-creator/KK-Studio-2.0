# TASK-PROV-005 — spec

## 数据契约

- 原生文件：`%APPDATA%\kk-studio\providers\connections.json`
  （`storage_paths::AppPaths.config` 的兄弟文件 `connections.json`，避免与历史
  AppConfig `config.json` 冲突）。
- 文件形状：`{ "schemaVersion": 1, "revision": u64, "connections": [...] }`。
- `connections` 条目复用 `providerConnectionSchema`（不透明 `credentialRef` 引用
  OS vault；文件/localStorage 不含秘密字段）。
- 备份：`connections.json.bak`（上次成功值）；损坏主文件归档保留原件，读取时
  从备份恢复（status=recovered）。

## Rust（src-tauri）

- 新增 `provider_config.rs`：`ProviderConfigRepository`（文件锁 + revision 冲突 +
  atomic temp write + sync + bak + 秘密字段拒绝）。`validate_connections` 拒绝
  `api_key/apikey/secret/token/password/authorization/bearer` 键（大小写不敏感）。
- `creation_storage.rs` 的 `unique_path/durable_temp/atomic_write/sync_parent`
  提升为 `pub(crate)` 复用。
- `main.rs`：`mod provider_config`、AppState 增加 `providers`，命令
  `read_provider_config`（loaded/missing/recovered + revision + connections）、
  `write_provider_config(connections, expected_revision) -> 新 revision`
  （spawn_blocking，conflict 抛错不覆盖）。

## TS（src）

- `providerRegistry.ts`：新增 `isDesktopProviderDurable`、
  `loadProviderConnectionsDurable()`（原生 loaded/recovered 覆盖 localStorage 缓存；
  missing 返回 null 供迁移）、`persistProviderConnectionsDurable()`（durable
  成功后刷新缓存；失败/conflict throw）。
- `ModelProviderSettings.tsx`：save()/clearKey() 在桌面端先 `await
  persistProviderConnectionsDurable(...)`，成功后才显示成功提示。
- `App.tsx`：挂载时加载原生配置；无原生记录且 localStorage 有旧元数据时迁移落盘；
  有原生记录时刷新 providerVersion 派生视图。

## 测试

- Rust 单测（provider_config_tests.rs）：missing/roundtrip/revision 递增、
  conflict 不覆盖、corrupt→bak recovered、秘密字段拒绝、非秘密透传。
- TS 单测（providerRegistryDurable.test.ts）：loaded/missing/recovered、
  persist 携带 expectedRevision、conflict 抛错缓存不动、Web no-op、秘密不序列化。
- 桌面验收（provider-durable-config.mjs）：保存→强杀→重启→恢复。
