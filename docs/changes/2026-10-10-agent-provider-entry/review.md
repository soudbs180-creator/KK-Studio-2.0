# Review：Agent/Provider 首页入口修正

## 结论

改动只增加入口状态说明和 Agent 面板导航，没有改变 Provider 任务提交、凭据存储或 Codex 会话协议。现有 Provider 选择仍由 `readProviderConnections()` 驱动，Codex 连接不会被伪装成供应商。

## 风险

- 用户仍需在 Agent 面板明确发起 Codex 内置生图；首页“生成”仍要求供应商图片模型，这是当前任务管线的真实边界。
- 进入 Agent 面板复用 `open("chat")`，因此仍受当前项目/会话连接状态影响。
