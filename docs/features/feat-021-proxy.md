# 应用内代理（FEAT-021）

- 状态：PARTIAL
- 领域：platform
- 最近更新：2026-09-22
- 关联任务：TASK-UI-005、BACKEND-PLATFORM

## 用户可见入口

- 设置 › 网络 › 本地服务：展示本地转发代理启动命令 `npm run proxy` 与地址 `http://127.0.0.1:23210`。
- 设置 › 连接 › 网络代理：应用级代理开关仍标注未接入（请求使用运行环境网络设置）。

## 代码位置

- 本地转发代理（已移植，零依赖）：`vendor/canvas-proxy/index.js`（CORS 转发、OPTIONS、SSE 透传、`import.meta.main` 守卫）
- UI：`src/components/settings/ConnectionSettings.tsx`（本地服务信息卡）
- 服务层：`src/features/sync/webdav.ts` 支持 `localProxyUrl` 走该代理

## 测试与证据

- `tests/unit/proxyForward.test.ts`（5 项：路由探测、OPTIONS CORS、GET 转发、POST 透传、404 兜底）
- 冒烟：`npm run proxy` 后经代理地址 + 完整目标地址转发

## 当前能力

- 代理进程可独立启动并真实转发（含 SSE 流式透传）；设置中心提供启动指引。
- 应用级代理设置（在设置内填代理地址并全局生效）与一键启停待接。

## 差距与后端化

- 设置 › 连接 › 网络代理接入代理地址配置并全局生效。
- Tauri 一键启停（拉起/停止 Node 子进程）。

## TASK-UI-005 更新

网络页更正为独立服务，未提供全局代理配置，不声称所有模型请求已代理。 见 [核对与验证](../changes/2026-09-22-ui-feature-parity/verification.md)。
