# Plan：实施与验收

- Task ID：`TASK-UI-CLASSIFY-20261013`
- 交付包角色：`current`
- 日期：2026-10-13

1. 记录 dirty 哈希，隔离当前 canonical；已有麦克风与窗口控件作为基线保留。
2. 独立并行：模型菜单；扩展页面与角色；根任务模型接入、路由与集成。
3. 更新相关断言与文档；typecheck、lint、UI/format、完整 verify。
4. 哈希前置条件逐文件回写 canonical；递增 Desktop/Web patch 版本。
5. 官方 Agent 包构建 Desktop，隔离数据实际启动验收；分别验证 Web 和 preview，保留证据。
6. 独立复核后关闭同地址账号身份、Google 配置草稿保留和角色路由问题；修复后重新构建并复验三端，不复用先前包的通过结论。
7. 按用户补充移除模型弹层的批量/数据项；复验模型选择和节点数量、旧草稿批次执行/归档，再重建并验证三端。
