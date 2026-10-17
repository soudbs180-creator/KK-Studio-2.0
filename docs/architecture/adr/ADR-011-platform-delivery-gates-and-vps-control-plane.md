# ADR-011：平台交付顺序、最小 AI 链路与 Web VPS 控制面

- 状态：ACCEPTED（用户规则更新，产品实现按阶段验收）
- 部分替代：2026-10-15 [ADR-019](ADR-019-unified-local-repository-and-optional-account.md) 依据用户批准方案开放 BYOK、可选 Web 账号和手动同步的实施；原文保留历史语义，平台交付顺序和真实链路双门继续有效。
- 日期 / Owner：2026-10-09 / root
- 关联规划：[项目建设目标与验收标准](../../governance/PROJECT_GOALS.md)；仓库外工作区规划不作为本 ADR 的可移植来源。

## 背景

项目同时包含 Tauri Desktop、Vite Web 和未来 Mobile。现有代码已经让 Desktop/Web 共用 `src/`，Desktop 使用 `src-tauri/` 原生边界，Web 本机伴随服务仍处于 PARTIAL，账号、积分、会员和 Mobile 尚未完成真实验收。若先扩展平台功能或性能优化，容易出现 UI 有入口但 AI 链路未通、Web/Desktop 逻辑漂移、Mobile 代码混入共享目录，以及把演示账号或本机 smoke 当成 VPS 服务的情况。

## 决定

1. **平台顺序与 Web 对齐**：按 Desktop → Web → Mobile 交付。Desktop 的最小链路和稳定性证据是 Web 同等能力的前置；Web 从共享核心蒸馏为轻量版本，只能裁剪平台专属能力，核心生成链、任务/结果语义和基本交互必须与 Desktop 保持一致，并以双端切换同态证据验收；Web 的共享协议和基本链路稳定是 Mobile 实现的前置。Mobile 的触控、弱网、包体和性能优化排在最小链路与核心能力对齐之后。
2. **双重 P0 门禁**：每个平台必须同时通过 UI/交互门和功能链路门。功能链路固定为“Provider/账号或 API Key 健康检查 → 一次文本生成 → 一次图片生成 → 结果/原件回写 → 保存或重载恢复”，并覆盖 loading、success、error、cancel、offline、unknown 等适用状态。只有 UI、mock、fixture 或单一平台证据不能升级为完成。
3. **共享与隔离**：Desktop/Web 继续共用 `src/` 的领域、Provider、任务、组件和样式；`src-tauri/` 只放 Desktop 原生能力。Mobile 未来使用独立顶层 `mobile/` 工程，不得直接导入共享 Web/Desktop 页面、CSS、feature 或 Tauri runtime；若需要跨端复用，必须先抽出与平台无关、可版本化的契约或核心包。
4. **Web VPS 控制面**：Web 的静态应用和账号、会话、积分、会员、用量与权限审计目标部署在 VPS。VPS 控制面不自动改变项目/素材的本地优先存储，也不由“已登录”推断云同步；云端项目、素材和同步另行以数据契约、备份、恢复和真实部署证据验收。
5. **Desktop 本地优先**：P0 先支持用户自带 AI 账号登录或本机使用自己的 API Key，不让 VPS 账号成为 Desktop 基础创作前置。产品化的“用户自有 API 接入”登记为高优先级 TODO；在 Desktop 最小链路和 Web VPS 身份/会话契约完成前，不实现新的跨端 onboarding、服务端代理或账号复用。

## 取舍

| 方案 | 结果 |
|---|---|
| 三端同时开发、先做高级功能或性能 | 容易掩盖基础链路未通、平台证据混淆；不采用 |
| Web 复制 Desktop 业务代码 | 长期漂移，任务态和交互不一致；不采用 |
| Mobile 放入 `src/` 或 `src-tauri/` | 原生依赖污染共享核心，无法独立构建和验收；不采用 |
| VPS 只部署静态 Web，不承载账号/积分/会员控制面 | 无法形成可验证的 Web 身份和用量边界；不采用 |
| 单主线共享 Desktop/Web 核心、独立 Mobile 工程、VPS 控制面 | 复用现有架构，能按平台保留真实证据；采用 |

## 影响与迁移边界

- 当前 Web IndexedDB 与本机伴随服务保持现状，不做静默迁移；VPS 账号/积分/会员先作为控制面任务建设，云端项目/素材按独立任务推进。
- 现有 `src/features/generation-server/`、Provider/TaskHost 和本地凭据边界继续作为实现基础，不新建第二套任务状态、队列或凭据库。
- Mobile 尚无实现；创建工程时必须在独立 `mobile/` 目录登记自己的构建、存储、网络和真机验收边界。
- “用户自有 API 接入”当前只登记任务与验收契约，不能把 Desktop 的本机 API Key 直连描述成跨端产品化能力。
- 任一平台缺少真实 Provider、VPS、设备或账号条件时，状态保持 `PARTIAL`、`TODO` 或 `BLOCKED`，不得以 mock、旧截图或静态构建替代。

## 回滚

该决定是交付顺序和边界规则，不迁移现有用户数据。若后续要改变 VPS 控制面、Mobile 隔离或平台顺序，必须新增 ADR，说明兼容、迁移、备份、回滚和对现有任务/功能状态的影响；在新 ADR 生效前继续遵循本决定。
