# Spec：当前主线剩余回归验证与修复

- Task ID：TASK-AGENT-001
- 状态：IMPLEMENTED
- 日期：2026-10-10
- 关联 Intent：`intent.md`

## 行为契约

1. `submitImageCommand` 在画布来源项属于 Codex 内置生图时，允许请求进入 `agentConnection.generateFromCanvas`；仍由该 Agent 链路负责实际连接和错误回执。
2. 普通 API 画布请求继续要求首页模型服务和具体模型配置。
3. 设置输入框和下拉框共享公共宽度、高度、颜色、禁用状态；窄屏命中区至少 40px。
4. 浏览器测试使用当前可观察的模型、扩展入口和插件空态文案，不降低真实行为断言。

## 数据与平台边界

- 不新增存储键、凭据字段、Provider、队列或路由。
- Codex 判定只读取当前画布快照中已有的 `generationSource` 和请求来源。
- 仅验证 Web production preview 与 Vite development；Desktop、Hosted、真实 Provider 和 Mobile 仍需各自证据。

## 失败与恢复

- 缺少来源项、来源不是 Codex、请求未配置 API 模型时沿用现有配置门禁。
- Agent 生图失败继续显示实际 Agent 错误，不回退到本地 API 或伪造成功。
- 测试环境依赖必须位于工作树内；共享依赖 junction 会触发 Vite 文件系统边界错误。
