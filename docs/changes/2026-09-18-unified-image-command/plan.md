# Plan

- ID：T4；分支 feat/T4-unified-image-command；worktree TASK-T4-IMAGE-COMMAND，基线 main@9866caf。原 checkout 的 178 项 dirty 状态保持不变。
- 基线：npm ci、lint、typecheck、129 unit PASS。
- 实施：独立并行更新 task source schema 和 provider health；主任务统一 command、接入 canvas/重绘、修结果图同步；定向 tests 后全量 verify；Rust 与 release；1421/1423/Tauri acceptance；文档/账本同步后本地 squash 集成。
- 风险：原件缺失降级、晚到响应、来源删除或切换、取消审批遗留 pending、异步结果连线被旧 Canvas 状态覆盖。用原件 fail-closed、稳定 task source、取消/身份检查、增量 result edges 及回归覆盖。
- 回滚：回退 T4 集成提交，旧 reader 可忽略可选字段；不删除任何用户目录或归档。无 remote，不能宣称 PR/CI/远端保护。
- 验证：npm run verify；cargo test/fmt；npm run client:check；npm run client:build -- --no-bundle；独立 runtime acceptance。
