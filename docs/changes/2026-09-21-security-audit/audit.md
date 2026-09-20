# Audit findings

审计基线为 `main@c3ff087`，使用独立 worktree `D:/kk-studio-next/.worktrees/TASK-AUDIT-SEC-001`，并行检查 Web 数据/任务状态、Gateway 和 Tauri TaskHost。根 checkout 的未跟踪 SkillCard、WorkflowCard 和 ComfyUI 内容未读取、覆盖或提交。

## 已确认并修复

1. **请求发出后取消可被重复提交（高危）**。`App.tsx` 在 durable intent 和 HTTP 请求启动后收到 Abort 时，原逻辑因为 `!signal.aborted` 排除了 uncertain 分支，随后写入 `cancelled + terminal`；恢复路径允许 cancelled/terminal 生成新幂等键，Provider 可能已受理而再次扣费或生成。现在请求已经开始时统一写 `unknown/unknown`，仅在请求开始前保留 queued/cancelled 语义。`taskRecovery` 单测覆盖 provider/native 与预提交分支。

2. **远程明文 HTTP 发送 API Key（高危）**。模型和连接 schema 原来接受任意 `http(s)`，因此 `Authorization: Bearer` 可被远程网络嗅探。新增 provider URL 策略：远程只允许 HTTPS，HTTP 仅允许 `localhost`、127.0.0.0/8 和 `::1`。回环 HTTP 本地模型仍可用；远程 HTTP 在进入请求前恢复为安全默认/被拒绝。

3. **Gateway 重启静默保留旧连接配置和 ACL（高危）**。`register` 原来对同 id、旧 owner、credentialRef、价格和 ACL 使用 `INSERT OR IGNORE`，配置轮换实际不生效，旧 owner 继续有权访问。现在同一事务内显式 upsert 元数据、owner、credentialRef、价格和上限，重建 ACL 并递增 revision；spent 与已有 cooldown/quarantine 保留，恢复必须走显式 controls。相同 token hash 映射到不同 principal 时启动失败；principal 的 tokenEnv 也必须唯一。

4. **TaskHost 下载响应先全量缓冲（高危）**。无 Content-Length 的 Provider URL 可持续发送超过 100 MiB，旧实现先 `response.bytes()` 再检查大小。现在先检查声明长度，再用 `bytes_stream` 分块累计，超过上限立即终止。

5. **TaskHost journal 替换存在 delete-first 丢失窗口（高危）**。原实现 Windows 下先 `remove_file` 再 `rename`；强杀窗口会丢失已受理任务记录，重启后可能盲目重试。移除删除步骤，保留临时文件写入/同步后直接替换目标，并用现有 Rust 回归覆盖更新/重开路径。

## 仍未闭环的风险

- **Web 跨窗口租约竞态和崩溃孤儿槽（P1，已有账本边界）**：`providerSubmission.ts` 对 `localStorage` 做同步 read-modify-write。两个窗口可同时看到同一空槽并都提交；一个窗口崩溃后 `activeJobs/activeLeaseIds` 没有 expiry/recovery，可能永久占满。安全修复需要 Web Locks/原子协调或把提交租约移到 TaskHost，不能用一次普通写入假装解决。
- **Gateway principal 初始额度配置陈旧（P1）**：`account()` 使用 `INSERT OR IGNORE`。重启时配置中的 `initialCredits` 或 concurrency 改变不会显式处理；直接覆盖余额会破坏已消费账本。需要单独的管理员额度调整/并发策略事务，当前保持 PARTIAL。
- **TaskHost Provider 结果 URL 来源限制（P1）**：`download_result` 仍允许 Provider 返回任意 `http(s)` URL（不跟随重定向但没有 origin allowlist/DNS pinning）。受攻击或恶意 Provider 可诱导桌面进程访问内网地址。下一步应按配置的 HTTPS allowlist、loopback 本地适配器和固定 DNS/IP 策略收口，不能把当前大小限制描述为 SSRF 已解决。

这些未闭环项已写入 `task-ledger.json` 的 TASK-AUDIT-SEC-001，状态为 PARTIAL。
