parent: TASK-KKD-OSS-ADMISSION-EVIDENCE-20261125

# 开源接入准入

官方基线 `e4383a1e323c895286d9f08fe901a27e341a10da` 已包含三个 Infinite Canvas 组件，但其 `governance:check` 未执行历史 `TASK-OSS-GOVERNANCE-RULE-20261111` 的归因校验。

恢复已有归因格式与许可政策，在同一检查入口增加新接入的版本、来源、依赖、真实输入与运行对照要求。历史组件保留原运行路径，并明确记录已验证范围。
