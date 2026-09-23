# Generation Gateway/Worker 持久后端（FEAT-024）

- 状态：PARTIAL
- 领域：backend
- 最近更新：2026-09-21
- 关联任务：T5、T8

## 用户可见入口

- 无直接 UI；`npm run gateway -- <config.json>` 启动独立服务，暴露 `/health`、`/v1/jobs`、`/v1/assets`、管理员接口与 webhook。

## 代码位置

- `src/features/generation-server/`：main/http/repository/worker/provider/assets/webhook/types/schema.sql
- 示例配置：`config/generation-gateway.example.json`
- 架构契约：`docs/architecture/GENERATION-PLATFORM.md`
- 数据：SQLite（WAL），规划数据目录 `%APPDATA%/kk-studio/gateway`

## 测试与证据

- 真实 HTTP 单测：`generationServer`、`generationServerAssets`、`generationServerProvider`、`generationServerRestart`、`generationServerRuntime`、`generationServerWebhook`

## 当前能力

- 持久任务、租约/恢复/取消、额度预留结算、连接 ACL、熔断、webhook 验签、私有素材归档，代码完整且测试通过。

## 差距与后端化（Wave 2）

- Desktop 当前走 Rust TaskHost，不 spawn 该服务；未公网部署、未接真实计费、未做宿主 resolver 注入凭据。
- T8 决定 Core 职责边界：Gateway 与 Rust TaskHost 的统一/分工（避免两套队列），桌面是否内置 Gateway。

## 变更记录

- 2026-09-21：创建卡片，状态 PARTIAL（建成并测过，未搭载/未部署）。
