# Plan：Agent/Provider 首页入口修正

1. 提取首页模型弹层的纯状态文案函数，并先以失败测试锁定三种状态。
2. 将 Agent 连接状态从 App 传入首页组件，增加 Agent 面板入口。
3. 更新弹层标题和空状态样式，保留现有 Provider 配置入口与生成门禁。
4. 运行单元测试、TypeScript、UI 检查、Vite production build 和浏览器预览交互验证。
5. 重新构建 Desktop 时使用已生成的 `dist`，并记录 `npm` 不在当前 shell PATH 的限制。
