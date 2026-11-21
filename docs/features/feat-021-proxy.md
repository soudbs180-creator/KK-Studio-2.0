# 应用内代理（FEAT-021）

- 状态：PARTIAL
- 领域：platform
- 最近更新：2026-11-21
- 关联任务：TASK-UI-005、BACKEND-PLATFORM、TASK-KKD-DESKTOP-PROXY-20261121

## 用户可见入口

- 设置 › 网络 › 本地服务：展示本地转发代理启动命令 `npm run proxy` 与地址 `http://127.0.0.1:23210`。
- 设置 › 网络 › 模型请求线路：桌面候选支持跟随系统、直连和手动代理，显示三类模型请求最近采用的线路。验证状态见[当前变更](../changes/2026-11-21-desktop-provider-proxy/verification.md)。

## 代码位置

- 本地转发代理（已移植，零依赖）：`vendor/canvas-proxy/index.js`（CORS 转发、OPTIONS、SSE 透传、`import.meta.main` 守卫）
- 模型出站：`src-tauri/src/task_host_network.rs`（线路选择与设置）及 `src/components/settings/ProviderNetworkSettings.tsx`（桌面入口）
- 服务层：`src/features/sync/webdav.ts` 支持 `localProxyUrl` 走该代理

## 测试与证据

- `tests/unit/proxyForward.test.ts`（5 项：路由探测、OPTIONS CORS、GET 转发、POST 透传、404 兜底）
- 冒烟：`npm run proxy` 后经代理地址 + 完整目标地址转发

## 当前能力

- 代理进程可独立启动并真实转发（含 SSE 流式透传）；设置中心提供启动指引。
- 桌面模型 API 的出站设置覆盖检测、文字、生图与其同源图片取回。

## 差距与后端化

- 各类浏览器、外部 CLI 和传统本地转发进程各自管理网络。
- Tauri 一键启停（拉起/停止 Node 子进程）。

## TASK-UI-005 更新

网络页更正为独立服务，未提供全局代理配置，不声称所有模型请求已代理。 见 [核对与验证](../changes/2026-09-22-ui-feature-parity/verification.md)。
