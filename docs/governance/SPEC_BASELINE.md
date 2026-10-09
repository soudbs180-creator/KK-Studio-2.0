# 规范基线

更新：2026-10-09。本文是现行规范的入口，不复制各模块的完整规则。冲突路由和领域事实归属见 [`AUTHORITY_MAP.md`](AUTHORITY_MAP.md)。项目级目标和平台交付门禁见 [`PROJECT_GOALS.md`](PROJECT_GOALS.md) 与 [`ADR-011`](../architecture/adr/ADR-011-platform-delivery-gates-and-vps-control-plane.md)。

## 规则解释顺序

规则冲突按固定顺序解释：用户意图 → [`AGENTS.md`](../../AGENTS.md) → [`AI_RULES.md`](../../AI_RULES.md) → [`PROMPTING.md`](../engineering/PROMPTING.md) → 本基线 → 当前源码/测试/运行证据 → 架构、数据和 UI 契约 → 带日期的 change package → 功能 registry。这里的“当前源码/证据”描述实际行为；它不自动批准与契约相矛盾的行为。功能 registry 只描述能力成熟度，不能覆盖任务账本或任何契约。

无法消解的差异保留 `CONFLICT`；没有直接证据写 `UNKNOWN`；推断必须标为 `INFERENCE`。旧验证记录的 PASS 只对其记录的提交、运行模式和范围有效。

## 当前规范入口

| 主题 | 唯一入口 | 约束 |
| --- | --- | --- |
| 工程流程与分支 | [`docs/engineering/SDLC.md`](../engineering/SDLC.md)、`BRANCH-POLICY.md`、`REVIEW.md`、`AI-EVALS.md` | 需求、证据、审查和交付顺序 |
| 架构与模块 | [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)、[`DATA-STORAGE.md`](../architecture/DATA-STORAGE.md)、`GENERATION-PLATFORM.md` | 模块边界、数据根、凭据和生成状态 |
| UI | [`docs/UI_INDEX.md`](../UI_INDEX.md) | 由索引路由到 `UI_RULES.md`、`UI_ARCHETYPES.md`、`DESIGN_TOKENS.md`、`DESIGN-SYSTEM.md`、`UI_SPEC.md`；历史 UI 文件只作证据 |
| 记忆 | [`docs/MEMORY-CONTRACT.md`](../MEMORY-CONTRACT.md) 与 [`docs/MEMORY-GOVERNANCE.md`](../MEMORY-GOVERNANCE.md) | 共享文件、注入、隐私、失败保护和同步门禁 |
| 产品目标 | [`PROJECT_GOALS.md`](PROJECT_GOALS.md) | 用户路径和项目级验收矩阵 |
| 功能能力 | [`docs/features/features.registry.json`](../features/features.registry.json) 与 `feat-*.md` | REAL/PARTIAL/PROTOTYPE/PLANNED；README 为生成文件 |
| 任务状态 | [`task-ledger.json`](task-ledger.json) | 任务、负责人、依赖、证据；TASK_LEDGER.md 为生成文件 |

## 不可降低的契约

- 密钥、OAuth token 和代理凭据只进入系统凭据库或请求内存；不得写入 localStorage、项目包、URL、日志、记忆文件或导出包。
- 读取、校验、写入或素材查找失败不能静默变成空项目或成功生成；未知受理、取消、迟到结果和冲突必须保留可区分状态。
- `Prototype`、`Mock`、`UI Only` 和 `NOT VERIFIED` 在缺少服务或证据时必须继续可见。Web 窄屏证据不能替代原生 Mobile 验收；Web 证据也不能替代 Tauri release 验收。
- 可见控件必须有真实行为或禁用原因；异步路径覆盖 loading、success、error、cancel、offline、focus、Escape 与过期响应边界。
- 生产能力声明必须能回到当前源码、构建入口、运行模式、route/import 链和同状态运行证据。静态对比、旧截图和构建通过不单独证明 REAL。
- FEAT-020 的共享记忆路径是 `~/.kk-memory/memory.json`（Windows 为 `%USERPROFILE%\\.kk-memory\\memory.json`）。豆包、WorkBuddy 原生客户端在有适配器和真实联调前不得标为共享消费者。
- 平台交付顺序为 Desktop → Web → Mobile。每个平台必须先通过 UI/交互门禁和最小 AI 链路（连接健康、一次文本生成、一次图片生成、结果持久化/重载），再扩展功能；Web 必须证明与 Desktop 的任务/结果语义一致，Mobile 保持独立顶层项目。
- Web 账号、会话、积分、会员、用量和权限控制属于 VPS 控制平面；VPS 发布本身不证明云端项目/素材同步，必须另有存储和恢复证据。

## 可执行检查与记忆同步门禁

日常检查包括 `npm run typecheck`、`npm run test`、`npm run ui:check`、`npm run format:check`、`npm run build`、`npm run client:check`、`npm run features:check`、`npm run governance:check` 和 `npm run markdown:check`；交付按项目脚本运行 `npm run verify`。

当 `MEMORY-CONTRACT.md` 相对 git base 发生变化，必须在同一 diff 中出现：

1. `docs/architecture/DATA-STORAGE.md`；
2. `docs/features/feat-020-memory.md` 和 `docs/features/features.registry.json`；
3. 与记忆契约对应的实现（`src/features/memory/` 或 `src-tauri/src/`）；
4. 对应单测/浏览器或 Tauri 测试；
5. `docs/MEMORY-GOVERNANCE.md`（必要时同步 `scripts/governance/check-policy-sync.mjs`）。

执行 `node scripts/governance/check-policy-sync.mjs --base <full-base-sha> [--head <full-head-sha>]`。它只验证同步文件集合与 base/head 关系；测试必须验证用户契约、故障、恢复和跨端边界，不能写只复述脚本实现的假测试。