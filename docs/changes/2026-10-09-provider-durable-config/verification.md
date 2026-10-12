# TASK-PROV-005 — verification

## 实现

- Rust：`src-tauri/src/provider_config.rs`（`ProviderConfigRepository`：
  文件锁 + revision 冲突 + atomic temp write + sync + bak 备份 + 损坏归档 +
  秘密字段拒绝）；`creation_storage.rs` 四个 durable 辅助函数提升
  `pub(crate)`；`main.rs` 注册 `read_provider_config` /
  `write_provider_config`（spawn_blocking），文件
  `%APPDATA%\kk-studio\providers\connections.json`（与历史 AppConfig 的
  config.json 分离）。
- TS：`providerRegistry.ts` 新增 `isDesktopProviderDurable` /
  `loadProviderConnectionsDurable` / `persistProviderConnectionsDurable`；
  `ModelProviderSettings.tsx` save()/clearKey() 成功提示前 await durable 提交；
  `App.tsx` 挂载时原生加载 + localStorage 旧元数据无损迁移。

## 验证结果

| 层 | 结果 |
| --- | --- |
| Rust 单测 `cargo test provider_config` | 6/6 PASS（missing/roundtrip/revision 递增、conflict 不覆盖、corrupt→bak recovered、秘密字段拒绝、非秘密透传） |
| TS 单测 `providerRegistryDurable.test.ts` | 6/6 PASS（loaded/missing/recovered、persist 携带 expectedRevision、conflict 抛错缓存不动、Web no-op、秘密不序列化） |
| 相关单测回归（provider*/assets*） | 47/47 PASS |
| `tsc -b` / `npm run build` | PASS（dist 生成，Rust generate_context 通过） |
| 桌面强杀重启验收 `tests/desktop/provider-durable-config.mjs` | 8/8 PASS（见下） |

桌面验收证据（保存→强杀进程树→重启→恢复）：

```
PASS start-first
PASS durable-write-command        (write_provider_config → revision 1)
PASS file-exists-with-connection  (providers/connections.json 含连接)
PASS file-has-no-secrets          (无 sk-/apiKey/secret)
PASS file-revision
PASS start-second
PASS restart-restores-connection  (强杀重启后 read 返回 loaded + 原连接)
PASS restart-keeps-credential-ref
```

证据 JSON：`test-results/desktop/provider-durable-config/<runId>/provider-durable-config.json`
（含 sourceHead、sourceHashes、checks）。

## 验收对照

1. 非秘密配置及目录在成功提示前有原生 durable 落盘 — PASS（save 链路先 await
   `persistProviderConnectionsDurable`，durable 失败抛错不显示成功）。
2. 立即异常终止并重启保留账号/模型/ref — PASS（桌面验收强杀后恢复；
   `credentialRef` 不透明引用保留，秘密仍在 OS vault）。
3. 系统凭据仅 OS vault，文件/localStorage/日志无秘密 — PASS（schema 无秘密
   字段 + Rust 写入前拒绝秘密键名 + 验收断言文件无秘密）。
4. 失败/冲突不假报成功或覆盖原件 — PASS（Rust conflict 测试 + TS conflict
   缓存不动测试 + corrupt→bak 恢复）。

## 限制

- 未跑完整 `npm run verify`（lint/typecheck 通过、相关单测通过；全量浏览器
  `test:ui`、development 插件与 Rust 全量未在本轮执行）。
- 网络受限：分支 push / PR 创建留 remote gate，网络恢复后执行。
- 历史 AppConfig `config.json` 的 api_key 语义未动（RISK-005 保留）。
