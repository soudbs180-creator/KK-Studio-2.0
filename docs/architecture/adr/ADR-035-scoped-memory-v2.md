# ADR-035：确定性作用域记忆 V2

- 状态：ACCEPTED（技术决定，尚非产品验收）
- 日期：2026-11-04；Task：TASK-E2E-WIRING-20261104；Owner：root。
- 授权：用户 P0 指令明确要求 global/project/session、V1→V2、原子写和可插拔驱动。
- [Spec](../../changes/2026-11-04-e2e-wiring/spec.md)；[验证](../../changes/2026-11-04-e2e-wiring/verification.md)。

## 决定与方案

复用既有 MemoryService 管理、采集、关闭/提炼保护与宿主文件锁；增加 kkMemoryStore schema/driver/service。保持 global 原路径，项目/会话 ID 用 SHA256 文件名，命名空间仍在 V2 envelope 内校验。领域图谱与可解答性保持纯 TypeScript。

保留平面 V1 无法表达作用域；新建第二套全局存储会遗失旧用户可见数据，因此采用原路径兼容投影。Desktop 新写 V2；旧命令投影 V1 并保留 V2 未知字段。Web 保留原有全局私有库及授权句柄，作用域单独 IDB 事务，授权共享文件仍只读。

## 迁移与恢复

读取时确定性迁移，不写磁盘；提交在锁内对比读取时原始字节，首次不存在也比较。迁移前生成原字节 previous 备份，临时文件同目录写入/flush/原子替换。未知版本、损坏、权限失效及冲突均拒绝覆盖。不会把实际驱动错误伪装成内存持久化成功。

旧原件和备份保留；回退旧应用只能读取 V1 备份，禁止直接拿旧 V1-only 客户端写 V2。新旧 API 共存须通过单测/原生测试，Web/Desktop 当前运行仍分别验收。默认关闭、临时聊天隔离、相关片段预算和不上云约束由 [记忆契约](../../MEMORY-CONTRACT.md) 定义。
