# Plan：KK 集成豆包（Doubao）能力

- Task ID：TASK-AI-GATEWAY-001（内部接入底座候选；产品化接入仍由 TASK-PROV-BYOK-001 跟踪）
- 状态：DRAFT（当前候选实现未验收）
- 日期：2026-10-09
- Intent / Spec：本目录 `intent.md`、`spec.md`
- 分支/工作区策略：遵循 `docs/engineering/BRANCH-POLICY.md`；每阶段一个 task branch + worktree

当前工作区已有内部通道、凭证、调度与可选 chat surface 候选实现，但未接真实豆包上游，`generation-server/main.ts` 未注入 chat 依赖，也没有真实 HTTP 或 Desktop 运行证据；在完成对应验收前，任务和功能卡保持 TODO/PROTOTYPE/NOT_VERIFIED。

## 阶段划分

| 阶段 | 内容 | 交付物 | 验收标准 |
| --- | --- | --- | --- |
| P0 准备 | 用户注册火山引擎并实名；开通语言/文生图模型拿免费额度；准备豆包测试账号；实测 Seedream 当前免费额度政策 | 账号与 Key | 控制台确认免费额度到账 |
| P1 官方通道（零开发为主） | ① 设置页新增「豆包（火山方舟）」预置（baseUrl + 模型清单）；② 修 `src/features/creation/model.ts` 文本判定加入 `doubao`；③ 测试连接 | KK 内可用豆包官方通道 | AC-1：文本/文生图各跑通；`npm run verify` 通过 |
| P2 本地网关 MVP | Tauri sidecar 起本地 HTTP 服务；转发官方通道；实现 `/v1/chat/completions`、`/v1/images/generations`、`/v1/models`；绑定 127.0.0.1 | 网关 v0.1（仅官方通道） | KK 现有 provider 指向 `http://127.0.0.1:<port>/v1` 可用；SSE 正常 |
| P3 网页会话通道 | 「豆包登录」入口；浏览器授权 → 会话凭证采集（存系统凭据库）；session 直连通道 + OpenAI 格式转换；失败降级官方 | 网关 v0.2（双通道） | AC-2：登录后对话/生图；401/429 触发轮换与降级 |
| P4 账号池与调度 | 多账号管理 UI；权重/粘性调度；双层并发限流；额度估算与告警；探活与冷却 | 网关 v0.3（多账号） | AC-3：2+ 账号自动轮换；断号自动移出；Dashboard 展示健康度/用量 |
| P5 加固与收口 | 自动重登（浏览器托管通道）；用量统计日报；合规风险弹窗；功能卡登记与文档索引同步 | 正式版 | AC-4；7×24 稳定性回归；日志脱敏核查；`npm run verify` 全绿 |

## 门禁与文档同步

- 每阶段完成后按 `docs/README.md`「文档与代码同步」表更新：实现落地后在 `docs/features/features.registry.json` 登记功能卡（`feat-038-doubao-integration.md`，状态 PLANNED→PARTIAL→REAL 递进），跑 `npm run features:write`。
- 在 `docs/governance/task-ledger.json` 登记任务（走 `npm run governance:write`），卡片关联任务 ID。
- 实现阶段若引入影响数据流的架构决策，在 `docs/architecture/adr/` 补 ADR。
- 交付包补齐 `verification.md`、`review.md`（沿用本目录结构与 `docs/templates/` 模板）。

## 依赖与阻断

- 外部依赖：火山引擎实名与 Key（用户）；豆包网页接口（外部，可能随时变更）。
- 阻断条件：P0 未完成则 P1 无法验收；用户未确认启用网页会话通道则 P3 暂停。
- 风险预案：网页通道失效一律降级官方，不阻塞官方通道使用。
