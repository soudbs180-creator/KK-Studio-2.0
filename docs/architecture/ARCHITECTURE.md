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

## 平台边界与交付顺序

平台交付固定为 **Desktop → Web → Mobile**。Desktop 先验证 UI/交互与最小 AI 链路（连接健康检查、一次文本生成、一次图片生成、结果/原件回写、保存或重载恢复）；Web 在该链路稳定后复用根 `src/` 蒸馏轻量入口，只裁剪平台专属能力，核心生成链、任务/结果语义和基本交互必须与 Desktop 保持一致，并通过双端切换同态证据验收；Mobile 最后使用独立顶层 `mobile/` 工程落地，同样先完成最小文本/图片链路，再做设备优化。静态页面、fixture 或响应式 Web 视图不能替代真实 API 或 Mobile 证据。

Desktop 与 Web 共用 `src/` 的领域、功能、Provider、任务、组件和样式逻辑。`src-tauri/` 只承载 Desktop 原生窗口、IPC、凭据库、文件和 TaskHost。Mobile 不得把页面、平台 runtime 或原生依赖混入 `src/` 或 `src-tauri/`；跨端共享需经过明确抽出的、与平台无关且可版本化的契约或核心包。

Web 的静态应用和账号、会话、积分、会员、用量控制面目标部署在 VPS；项目/素材是否云端保存或同步不由部署位置推断，继续遵循 `DATA-STORAGE.md` 的本地优先与独立云端验收边界。Desktop 当前以用户自带 AI 账号登录或本机 API Key 的本地直接使用为先；产品化的用户自有 API 接入保持高优先级 TODO，暂不实现。

Figma 文件是界面和动效的设计权威，代码是可运行行为的权威，测试和浏览器截图是交付证据。Figma 资源放在 `public/design/figma`，固定演示素材放在 `public/fixtures/demo`，插件源放在 `design/figma-plugin`。

模型适配器只描述 provider、模型 ID、能力和请求转换；模型权重属于外部 ComfyUI 根目录。API 凭据由系统凭据库管理。用户资料、记忆、项目、会话、资产和缓存按数据分级隔离，具体路径见 `DATA-STORAGE.md` 与 `config/storage-layout.json`。

新增功能先放入 `src/features/<feature>`，同时在 domain、integrations、storage 和 UI 之间建立明确边界；不要在页面组件中直接拼接 API 请求、写密钥或写任意文件。
