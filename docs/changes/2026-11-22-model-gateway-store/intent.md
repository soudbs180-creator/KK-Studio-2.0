# Intent：统一模型网关与本地模型商店

- Task ID：TASK-MODEL-GW-20261122
- 状态：READY
- 日期与提出者：2026-11-22 / root
- 请求来源：用户要求本地模型按硬件推荐、可管理更新替换；云端/本地/API/登录 CLI 统一路由；参考 Codex++ 与 FastVideo，但需完整覆盖文本/图片/视频/音频创作链路。
- 用户授权范围与依据：用户确认落地路线并要求按 attached plan 实施全部 to-do。
- 关联账本、spec、plan：本目录；ADR-027；TASK-AI-GATEWAY-001；ADR-019/023；FEAT-038/040
- 交付包角色：`current`

## 领取与开工确认

- Owner / branch / worktree：root / `feat/TASK-MODEL-GW-20261122-gateway-store` / 根 checkout（worktree 配额已满，未新建隔离树）
- Base SHA / 当前 HEAD：`origin/main` @ `e4383a1e323c895286d9f08fe901a27e341a10da`（开工时）
- 依赖任务、共享文件和并行写入者：TASK-AI-GATEWAY-001、ADR-023 本地安装、FEAT-004/005 Comfy；根目录已有无关 dirty，本任务只写入本任务路径
- 基线检查与预存失败：worktree 预算 22/4 超限（PRE-EXISTING）；Gateway/本地安装运行时此前为 PARTIAL/未验收
- 需求和验收标准确认时间/依据：2026-11-22 用户确认 plan
- 当前状态：IN_PROGRESS

## 用户原意

软件支持本地，但首次安装不该强下大模型。设置里要有优秀预设，按最新版本与用户电脑匹配；能纳管魔改/社区优化包；模型更新默认替换旧包省空间。文本/图片/视频/音频都要能配上。用户可全本地、全 API、或登录 CLI；要有完整网关与路由，云端与本地分开，多 API 可自动轮换或自选。Codex++ 与 FastVideo 看起来不错，希望能覆盖软件。

## AI 工程转译

- Outcome：Desktop 用户在设置中浏览按硬件分级的本地精选包、管理安装/替换；创作任务经统一路由在本地与云端/多 Key 间选择或故障转移；视频可选 FastVideo 适配声明。
- Scope：规格与 ADR；本地商店领域契约与设置 UI；供应商池路由策略；FastVideo 适配器与单测。
- Non-goals：嵌入 Codex++（AGPL）；安装包内置大权重；Web 宣称同等本地引擎；本轮真实 GPU 长视频出片终验；音频 REAL。
- Acceptance：见下表；真实大文件下载与 FastVideo 实机出片标 PARTIAL/NOT VERIFIED。

## 目标与非目标

- 预期结果：可审阅的网关/商店契约落地；设置页展示推荐与管理；路由可测；FastVideo 适配可注入。
- 包含范围：Phase 0–3 计划项。
- 明确不包含：拷贝 Codex++ 源码；把 Inkling 官方 20GB 整包标为 16GB 机推荐可装；Mobile。
- 受影响平台/模块：Desktop 优先；`src/domain`、`src/features/ai-gateway`、`src/integrations/generation`、设置 UI、docs。
- 已有实现和规范来源：ADR-019/023/026、FEAT-038、`localModel*`、`TaskHost`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| ---- | -------------- | ------------- | -------- |
| AC-1 | 首次打开设置可见本地推荐且无自动下载 | 设置文案 + 推荐函数无副作用单测 | Desktop |
| AC-2 | 16GB 档机器推荐指向可跑量化档而非官方整包 | `localModelRecommendations` / fitTier 单测（5080 fixture） | Desktop |
| AC-3 | 更新到最新时默认替换并询问是否删旧 | `planPackageReplacement` 单测 + UI confirm 路径 | Desktop |
| AC-4 | 模型名可按裸名/`provider/model`/`group/*` 路由，多 Key 可轮换冷却 | `providerPoolRouting` + scheduler 相关单测 | Desktop/共享 |
| AC-5 | FastVideo 作为可选视频后端声明，未配置时明确禁用原因 | adapter 单测；实机出片另记 NOT VERIFIED | Desktop |

## 假设、风险和决策

- FACT：Codex++ 为 AGPL-3.0；FastVideo 为 Apache-2.0；仓库已有四渠道与 TaskHost。
- INFERENCE：用户要的是产品级网关，不是再装一个 Codex++。
- UNKNOWN：Inkling GGUF mmproj 完整 pin 摘要未写入本仓前不可标为可安装精选。
- AI 自主决定：TaskHost 为执行核；Codex++ 仅参考；FastVideo 可选适配。
- 必须由用户决定的产品语义：无（已确认 plan）。
- 外部条件：真实下载与 GPU 视频出片需本机资源与网络。
- 不在本次范围：TASK-WHOLE-V1 旁路解冻之外的全量 provider 终验。
