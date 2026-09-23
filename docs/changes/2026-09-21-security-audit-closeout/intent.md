# Intent

- ID: TASK-AUDIT-SEC-001-CLOSEOUT
- 原意: 继续修复审计发现的安全问题、Bug 和不合理逻辑。
- Outcome: 让 Web 提交租约、Gateway 账户启动配置和 Desktop TaskHost 结果下载在并发、重启、取消及恶意 URL 条件下 fail closed，并保留可复核证据。
- Scope: `src/features/creation`、Generation Gateway SQLite provisioning、Tauri TaskHost 网络边界、针对性单测与治理记录。
- Non-goals: 不连接真实付费 Provider，不修改用户数据，不部署外部服务，不放宽 Provider CDN 来源。
- 约束: API key 仍只进系统凭据库/请求内存；Web 无 Web Locks 时拒绝提交；账户初始额度只在首次创建生效，不能以启动配置覆盖已消费余额。
- 验收: 同一连接的跨窗口预留串行且只成功至并发上限；窗口崩溃后下一次预留由 live Web Lock 状态回收旧元数据；账户额度漂移 fail closed、并发策略可更新；TaskHost 只访问同 origin、受限 DNS 解析后的 HTTPS 或 loopback HTTP，取消在 DNS 后、发送前仍不发请求。
