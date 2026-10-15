# Agent 画布同步修复

用户授权：复现并最小修复 Agent 与画布的同步问题，保留现有数据和其他未提交修改，验证节点位置、连线和重载恢复。

范围：当前画布 hooks 的外部图同步与对应回归；共享 Desktop/Web 前端。不改变存储身份、schema、Agent 协议、Provider 或其他 UI。

基线：主 checkout `51fccfc7` 的 200 个未提交文件已作为未验收候选复制到独立工作树；原 index 字节保持一致。清单位于 `D:/kk-studio/.tmp/agent-canvas-sync-20261014/baseline.json`。

工作树默认额度拒绝创建（64/4）；在约 755 GiB 空闲磁盘的受控环境仅为本轮临时允许第 65 个工作树及最多额外 1 GiB 生成内容，保留旧工作树、复用现有依赖，不改变全局配置。
