# KK Studio 浏览器后端设计

## 意图

KK Studio 保留现有内置浏览器（Tauri/WebView2），同时允许自动化任务选择外部 Edge、Chrome 或 ego lite。用户只需对当前任务授权；需要登录、验证码、权限、证书/安全警告、敏感提交或不可逆操作时，任务必须暂停并把控制权交给用户，恢复前再次确认状态。

## 目标

- 统一登记四个浏览器后端：`internal`、`edge`、`chrome`、`ego-lite`。
- 统一返回可展示的选择、可用性、运行状态、授权和安全接管信息。
- ego lite 通过本地 `ego-browser` 命令启动一个可复用的 Agent Space，不强行嵌入 KK 窗口。
- 外部 Edge/Chrome 可以被打开并显示状态，但在没有连接桥接/扩展时只承诺手动浏览，不能伪称可自动化。
- 授权只保存在本次适配器会话；不保存登录凭据、Cookie、验证码或页面内容。

## 非目标

- 不替换或重写 KK Studio 内置 WebView2。
- 不新增浏览器扩展、远程调试端口、凭据同步或后台绕过登录/验证码的逻辑。
- 不新增独立设置页面；复用现有 Codex CLI 设置卡、权限语义和 Agent 审批卡，在当前 Figma 目标 `47:2172` 的 Agent 卡片内展示选择器与安全提示。

## 方案取舍

1. **替换内置浏览器**：表面统一，但会破坏现有 WebView2 数据和桌面验证链路，不能接受。
2. **浏览器扩展/远程调试桥**：Edge/Chrome 自动化能力完整，但要引入扩展分发、端口权限和更大的攻击面，超出本次最小适配器。
3. **外部后端注册表 + ego lite sidecar（采用）**：保留内置浏览器，Edge/Chrome 先做安全打开，ego lite 复用官方本地 Agent Space；授权和接管信号统一，后续可在同一契约上增加扩展桥。

## 契约

`BrowserProviderId` 为 `internal | edge | chrome | ego-lite`。每个 provider 描述 `label`、`kind`、`automation`、`requiresAuthorization` 和 `status`。`createBrowserBackend` 只在 `authorize()` 后允许外部打开；`requestHandoff()` 进入 `handoff` 状态并产生 `AgentApprovalRequest` 兼容载荷，`resume()` 只能在用户确认后恢复。

ego lite 原生命令只接受 HTTPS URL、受限 Space 名称和显式 `authorized=true`，调用固定的 `ego-browser nodejs` 启动脚本；不接受任意脚本、命令、凭据或页面代码。Edge/Chrome 通过 Tauri 中固定的可执行文件白名单打开 URL，状态标记为 `manual-only`；不通过默认浏览器猜测，也不暴露任意命令执行。

## 设置呈现

浏览器选择器位于设置 › 模型接入 › CLI 直连 › Codex CLI 的现有 Agent 卡片内，沿用 Figma `47:2172` 的 612px 内容列、32px 下拉控件、状态点和 12px 说明文字。选择器显示四个后端、当前可用性、外部任务授权语义和固定安全接管提示；授权本身仍只在任务会话内生效，不写入偏好。

## 验收

- 单元测试证明四个后端均登记、默认选择内置浏览器、未授权调用被拒绝、敏感状态只能进入接管态、拒绝或取消会回到安全状态。
- Rust 测试证明 ego lite 命令拒绝未授权和非 HTTPS 输入，并且启动参数不包含任意用户脚本。
- Windows 主机实测 `ego-browser` 可用，调用官方 `ego-browser nodejs` smoke 脚本成功；KK 现有内置浏览器代码路径未改动。
