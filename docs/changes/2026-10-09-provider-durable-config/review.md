# TASK-PROV-005 — review

## 独立审查要点（相对 origin/main 8090475 的 diff）

1. **数据安全**：connections 条目复用 `providerConnectionSchema`（不透明
   credentialRef）；Rust 写入前 `validate_connections` 拒绝
   api_key/apikey/secret/token/password/authorization/bearer 键（大小写不敏感），
   测试断言"秘密字段拒绝 + 文件不存在"。验收脚本断言落盘文件无秘密。
2. **不覆盖原件**：revision 冲突检查 + corrupt 主文件保留并归档、从 .bak 恢复
   （status=recovered）；TS 侧 conflict 抛错且浏览器缓存不动。
3. **与既有文件不冲突**：连接文件用 `providers/connections.json`，未触碰
   AppConfig 的 `config.json` 及其历史 api_key 语义（RISK-005）。
4. **复用而非再造**：复用 `creation_storage` 的 durable temp/atomic write/sync/
   unique path（提升 pub(crate)），存储模式与创作快照一致；未新增第二套队列。
5. **Web 行为不变**：原生分支仅在 Tauri 运行时激活（isDesktopProviderDurable）；
   Web 继续 localStorage，单测断言 Web no-op。
6. **失败不假报成功**：save()/clearKey() 成功提示在 durable 提交之后；异常落入
   既有 catch 显示错误。
7. **证据与状态**：桌面验收证据 JSON 含 sourceHead/sourceHashes；账本 PROV-005
   状态 DONE 仅因上述验收全部通过，完整 verify 与 remote gate 如实列在限制。

## 结论

无 P0/P1。scope 与验收一致；代码、测试与验收证据闭环。完整 verify、
桌面端 UI 全量回归与 push/PR 为交付后门禁，待网络与 CI 环境实际执行。
