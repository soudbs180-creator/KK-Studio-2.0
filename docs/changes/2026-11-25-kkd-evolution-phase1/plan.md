parent: TASK-KKD-EVOLUTION-PHASE1-20261125

# 实施与集成

1. 官方主线、并行开发、Pen、测试和技术链路并行取证。结果指向现有台账任务及原始 SHA。
2. 治理模块正式释放并认领后，以 `origin/main` 建立门禁分支。复用 `git:guards`、交付路径分类与 quality 发布前门禁。
3. 在隔离 Git 夹具运行真实 hook。对候选执行定向测试、交付检查和完整 verify，随后以相同 SHA 独审。
4. 经批准从受保护主线的 PR 集成。触发回滚时对该 PR 创建 revert，保留候选、收据及原主线历史。
