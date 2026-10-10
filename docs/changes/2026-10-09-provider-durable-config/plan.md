# TASK-PROV-005 — plan

1. 读 T5 强杀现场证据与现有存储模式（creation_storage/storage_paths/providerCredentials）。
2. 新建 worktree `TASK-PROV-005`，分支 `fix/TASK-PROV-005-provider-durable-config`（基于 8090475）。
3. Rust：`provider_config.rs` + 测试；`creation_storage.rs` 辅助函数 pub(crate)；`main.rs` 接入。
4. TS：`providerRegistry.ts` 原生接口；`ModelProviderSettings.tsx` 保存链路；
   `App.tsx` 启动迁移；单测。
5. 门禁：`tsc -b`、相关单测、Rust `cargo test provider_config`、前端 build。
6. 桌面验收：debug exe + playwright 保存→强杀→重启→恢复；文件无秘密断言。
7. 交付包五件 + 账本 PROV-005 更新（DONE/PARTIAL 按验收结果）+ 提交（push 受网络限制）。
