# Plan：旧聊天迁移与恢复

- Task ID：TASK-CHAT-MIGRATION-20261017；IN PROGRESS；owner root。
- [Intent](intent.md)、[Spec](spec.md)、[ADR-022](../../architecture/adr/ADR-022-project-chats-and-v3-migration.md)。
- base bbc8a766；branch `fix/TASK-CHAT-MIGRATION-20261017`；复用既有审计实体worktree，不移动目录。原main63dirty/index/旧审计ref保护。
- 基线：前次产品469完整verify/Native与最终bbc8文档独审通过；本轮已重读适用规则、规范及实际迁移/Host/Native链。现有Map模拟迁移与v3测试有已证实的错误契约，不作为生产成功证据。

## 执行顺序和单写入者

| 步骤 | 负责范围 | 目的与验证 |
| --- | --- | --- |
| 1 root | 原库与Git基线、保全、任务文档 | 正常关闭已知Native，独立逐文件重哈希；主备raw不变 |
| 2 TS存储实施者 | creation模型/codec/迁移/存储/素材、TS项目包和对应unit | 从原始Value无损迁移、IDB事务、canonical投影；真实反例先RED |
| 3 Native实施者 | Rust identity/authority/迁移/快照/项目包与Rust测试 | 四锁内不可降级事务、故障续作、旧reader拒绝 |
| 4 聊天实施者 | App、Agent/Google runtime、HTTP协议服务及对应tests | canonical chat读写、HTTP7冻结scope、线程与历史持久 |
| 5 root | Node standalone根隔离、版本、文档及整合 | 跨运行时边界；与上述源文件不重叠 |
| 6 root/独立reviewer | 集成与验收 | 完整verify/Rust/真实隔离Native/资料副本迁移/主库迁移、关闭重开、独审与Delivery |

三实施者共享同一任务树但逐文件独占，不改他人文件、不提交、不构建/争用端口或Cargo。模型接口及golden迁移向量由TS实施者先明确，Native按同一语义校对。root独占所有构建/1421/1423/Cargo/版本/任务文档/默认资料及最终Git操作。

## 失败与恢复

工程外不可变原始副本、迁移manifest和SHA保留。只在副本验证完成、当前源码/产物通过并独审后迁移默认库；任何阶段失败保留原件、候选和实际错误，不降格式/丢聊天/恢复空库。允许恢复到新目录验证，不覆盖恢复原件。没有删除/移动任何原文件的授权；历史运行目录和测试证据继续保留。

## 当前开工证据

原库9项目、v2/revision2226、一个项目两普通chat，5个旧root线程。运行中的已知Native50136已正常关闭，未强制终止。新工程外保全根 `D:/KK-Studio-recovery-20260921/chat-migration-20261017-aec487d8-2c50-4669-b5d1-7f369b670c41`，完整runtime-userdata-0e398bd4-2260-4a0a-9269-013bbefdc84a为2491文件/259972032B；独立重新枚举与重哈希2491/0 mismatch，receipt SHA `071cc099e2d14594d3f4bc8d896a9dbb49e40bc1c3d1bb47e35f9ddd98e4f834`。正文和密钥不进仓库或日志。
