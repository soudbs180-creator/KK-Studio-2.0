# ADR-002 — 经验证候选进入本地主线

- Status: Accepted，2026-09-17。用户明确要求继续修复，成功后必须合并主线。
- Context: 原 checkout 的178项dirty和原索引必须保留；历史master在609f524，无本地main、无remote。29d0d9b为限定源码快照，治理源987c908已有干净安装/verify/Rust/Tauri运行证据，86c40d0仅增加验收文档。独立审阅确认425个运行/构建输入与原实现一致；缺失的verify-kk-studio.cmd已由治理提交补入，schema差异仅行尾。
- Decision: 在同仓库独立TASK-INTEGRATION-001 worktree建立main，由609f524 fast-forward到已验收86c40d0，作为一次明确记录的初始基线接入；TASK-PROV-001在源分支通过自审、独立复核及验证后，按默认squash合入main。合入后执行主线verify及桌面构建/隔离运行检查。
- Reason: 真正完成本地集成，同时避免切换或清理原dirty目录。远端未配置只阻塞托管PR/保护/CI，不阻塞用户已授权的本地合并。
- Alternatives: 在原目录直接切换main会与未提交源码冲突；只保留任务分支不满足本次要求；把候选全部squash为Provider修复会混淆历史范围。
- Consequences: 历史master保留；原有指向D:/kk-studio-next的快捷方式仍是旧checkout，必须明确最新main运行目录。主线可构建并不代表T3a/T3b/T4–T12全部产品验收，真实Provider/ComfyUI及部署证据继续独立记录。托管PR和保护规则尚未实施，不伪造远端审批。
