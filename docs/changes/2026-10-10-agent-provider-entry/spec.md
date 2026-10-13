# Spec：首页生成入口的 Agent/Provider 边界

## 行为

1. Provider 图片模型存在时，首页继续显示供应商模型列表和“配置供应商与模型”入口。
2. Provider 图片模型不存在且 Codex 已连接时，显示“首页生成使用供应商图片模型”，并提供“打开 Agent 面板”。
3. Provider 图片模型不存在且 Codex 未连接时，显示需要供应商模型的原因，同时仍提供 Agent 面板入口和供应商配置入口。
4. 点击 Agent 入口只打开已有聊天/Agent 面板，不修改 Provider 草稿，不绕过任务预检。

## 数据流

`agentState.status` → `StartPage` → `StartComposer` → `StartModelPicker` → 纯函数状态文案。

Provider 模型选择和 `CreationDraft.providerConnectionId` 保持原有来源；Codex 入口只触发 `open("chat")`。

## 验收

- 单元测试覆盖已连接、未连接和已有 Provider 三种状态。
- 浏览器预览中弹层显示边界文案，点击 Agent 入口显示聊天面板。
- TypeScript、UI 标准和现有 Provider/Agent 回归通过。
