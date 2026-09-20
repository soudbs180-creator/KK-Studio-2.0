# 工作台架构

KK Studio 是一个 Figma-first 的 React/Vite 工作台，桌面发布由 Tauri 承载。浏览器开发模式用于快速验证 UI；桌面数据和凭据只有在 IPC 接线后才成为真实数据源。

```text
src/App.tsx
  ├─ components/          页面、画布、侧栏、设置和节点 UI
  ├─ domain/               schema、领域类型、demo fixture 和纯函数
  ├─ integrations/         provider、模型和外部服务适配器
  ├─ runtime/              存储 key、平台能力和运行时契约
  └─ styles/               设计令牌与页面样式
src-tauri/
  ├─ src/main.rs           Tauri 命令入口
  └─ src/storage_paths.rs  数据目录初始化与旧文件保留
```

Figma 文件是界面和动效的设计权威，代码是可运行行为的权威，测试和浏览器截图是交付证据。Figma 资源放在 `public/design/figma`，固定演示素材放在 `public/fixtures/demo`，插件源放在 `design/figma-plugin`。

模型适配器只描述 provider、模型 ID、能力和请求转换；模型权重属于外部 ComfyUI 根目录。API 凭据由系统凭据库管理。用户资料、记忆、项目、会话、资产和缓存按数据分级隔离，具体路径见 `DATA-STORAGE.md` 与 `config/storage-layout.json`。

新增功能先放入 `src/features/<feature>`，同时在 domain、integrations、storage 和 UI 之间建立明确边界；不要在页面组件中直接拼接 API 请求、写密钥或写任意文件。
