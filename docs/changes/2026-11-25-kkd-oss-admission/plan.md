parent: TASK-KKD-OSS-ADMISSION-EVIDENCE-20261125

# 改动范围与顺序

1. 继承历史归因校验及唯一 `config/oss-attributions.json`，将门禁接入现有 `scripts/check-governance.mjs`。
2. 通过 `scripts/governance/oss-attributions.mjs` 读取本地锁定证据，按组件检查文件范围并绑定运行对照。
3. 使用 `tests/unit/ossAttributions.test.ts` 检验通过路径及失败路径，另用隔离 Git 副本验证历史基准变化会被拒绝。
4. 通过协调 CLI 绑定本验证文件并生成任务快照。独立审查和正式集成由主 Agent 协调。
