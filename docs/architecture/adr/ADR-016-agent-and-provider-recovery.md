# ADR-016：Agent 会话归属与凭据保存恢复

- 状态：ACCEPTED（技术决定；实现与最终验收以任务证据为准）
- 日期：2026-10-13
- 任务：TASK-AGENT-RECOVERY-20261013
- 授权：用户已批准自动恢复、单一连接入口与安全持久化方案，并要求自主完成必要关联修复。

## 背景与术语

服务就绪表示本应用托管的本机服务已通过健康检查；项目会话已连接表示已验证当前项目的线程归属并恢复历史。两者不能共用一个虚假的成功标记。权限模式控制任务与工具操作，不控制启动恢复。API 已保存表示系统凭据库和连接元数据的实际提交结果，输入框为空不表示密钥不存在。

首次准备会话后，历史或模型读取失败会在服务已有线程、页面尚未保存归属之间形成自锁。仅在 localStorage 保存归属还会与原生项目恢复分离。Google 单独保存又可能被原生旧 metadata 覆盖。跨窗口在 metadata CAS 之后分别写共享 vault，仍可能覆盖较新的密钥。

## 决定与替代方案

项目增加可选非敏感 agentThreadId，格式为 1 至 160 个 ASCII 字母、数字、下划线或连字符；TypeScript normalization 与原生项目包均验证并保留。正常恢复优先读原生项目归属；已有 kk-agent-thread:<projectId> 作为兼容缓存，成功恢复会将旧记录迁入项目并 flush。仅取消后不把迟到的线程写入其他项目。

空首页仅启动服务。相同项目重连恢复原线程；首次初始化另一个已知项目保持旧项目归属。未知、冲突的归属及其他运行任务/审批阻止自动初始化。自己的无线程 failed 准备允许条件重试：页面保留非敏感发起 clientId 记录，服务在 mutation 锁下验证 sourceClientId、当前 conversationId/revision 与无 thread。准备成功立即清理该尝试记录；未知 failed 状态不被当作 idle。

全部普通与 Google API 保存采用共同原生提交边界。Windows 共享锁将 revision 核对、metadata 与 vault 操作和失败补偿串行化；同 profile 的 Web Locks 覆盖提交前读取至页面缓存发布，避免较早回执覆写较晚缓存。普通裸写入口必须遵守同一锁。凭据仍使用原 service 和 opaque credentialRef，不创建明文备份、不将密钥放入 metadata、快照或返回值。失败按实际提交阶段报告；native 空集合是权威空配置，不能保留旧缓存冒充已配置。

拒绝仅删掉归属保护或自动接管 remote.threadId。拒绝仅靠模块内 singleflight 或事后 revision 检查保护 vault。不可变版本化 credentialRef 会改动既有身份与 TaskHost lookup，本轮选择原生串行提交与精确补偿。

## 平台、失败、兼容与回滚

Desktop 自动连接只使用本实例得到的 loopback 地址与内存 Token；断开或停止持久暂停，手动重连恢复。Web 的密钥仍仅在当前页面内存，不因本 ADR 改为浏览器持久秘密。锁或凭据库不可用时明确错误并拒绝不安全提交，不制造保存成功。

API 读取区分 loading/saved/missing/error，失败支持重试并保留旧引用。Google 恢复只填确实缺失的原生记录；原生存在时保留模型、健康版本与凭据身份，身份不匹配不能猜测。cache 发布失败须呈现已提交的 saved/missing 状态和可重读结果。

保持数据根目录、schema version、既有存储 key、凭据 service 与引用不变；项目包 round-trip 覆盖新增归属。回滚撤回代码与产物，不删用户项目、线程、密钥或配置；旧版本对新增字段的导出支持有限，不应在未确认兼容时降级写入。

Windows 锁保护本版本所有协作入口；旧版本进程、用户直接编辑凭据库或外部工具不遵守该协议，不能被描述为已串行化。metadata 与 Windows 凭据库是两个存储，进程被强制终止仍可能发生中途提交；异常遗弃锁和未知提交阶段必须报错并重新读取，不能保证跨存储崩溃原子性，也不能凭报错主动覆盖其他密钥。

## 验证

对应 RED/GREEN 单元、Rust 项目包与事务回归、浏览器故障注入、真实 Tauri 重启/系统凭据/秘密隔离及 SHA 绑定独立审查，统一记录于 [验证](../../changes/2026-10-13-agent-recovery/verification.md) 与 [审查](../../changes/2026-10-13-agent-recovery/review.md)。本决定不宣称真实 Provider、收费生成、Hosted CI、签名或发布完成。
