# Plan：审查 P1/P2 修复

- 交付包角色：`current`

1. 记录当前 branch、HEAD、origin/main 和 dirty 文件；不覆盖已有并发改动。
2. 先补生命周期、脱敏和插件失败路径的回归测试，再实现最小修复。
3. 更新治理模板、历史勘误和账本，明确 dated change package 的 current/historical 边界。
4. 按文件 allowlist 创建独立的治理、运行时、版本校验提交；保留 `WindowControls.tsx` 等无关脏改动不混入。
5. 运行针对性单测、snapshot/governance/doc/index/format/lint/typecheck、完整 `npm test`、构建与适用的浏览器/桌面检查；记录真实退出码和限制。
6. 按最终 base/head 对变更做第二次只读复核，未完成的 Hosted/Tauri/用户验收保持 NOT VERIFIED。
