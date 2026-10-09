# 项目建设目标与验收标准

Updated: 2026-10-09（Asia/Shanghai）

本文件是项目级建设目标入口。它把用户主路径、实现边界和交付验收串成一份可执行基线；架构、数据、UI 和任务细节仍以各自的权威文件为准。它不把本地 fixture、Prototype、静态构建或单一平台证据升级为真实服务能力。

## 建设目标

KK Studio 是以无限画布为中心的本地优先多模态 Agent 工作台。建设目标是让用户从创建项目开始，经过对话或生成任务，得到可追踪、可恢复并能回到画布继续编辑的结果；设置、技能和 MCP 入口必须给出真实状态与安全边界；Desktop、Web、Mobile 的能力差异必须被明确表达。

平台交付顺序固定为 **Desktop → Web → Mobile**。Desktop 先完成 UI/交互和最小 AI 链路，Web 再从稳定的共享核心蒸馏为轻量版本；Web 只能裁剪平台专属能力，核心生成链、任务/结果语义和基本交互必须与 Desktop 保持一致，并提供双端切换的同态证据；Mobile 最后以独立工程落地，性能、触控和弱网优化排在最小链路与核心功能对齐之后。

核心结果包括以下五类：

1. **创作闭环**：项目创建/打开 → Composer 输入 → 任务受理 → 结果归档 → 画布节点/连线 → 保存与重载。
2. **Agent 闭环**：连接/鉴权 → 对话流 → 工具或审批 → 文本/图片结果 → 会话和画布状态一致。
3. **能力配置闭环**：Provider、Skill、MCP 的查看/配置/发现/调用入口真实可操作；不能执行的操作显示原因和恢复路径。
4. **恢复闭环**：失败、取消、离线、超时、未知受理、存储损坏、并发冲突和重启都有可观察状态；能安全重试或导出，不静默清空或覆盖数据。
5. **最小 AI 生成链**：Provider/账号或 API Key 健康检查 → 一次文本生成 → 一次图片生成 → 结果/原件回写 → 保存或重载恢复；每个平台必须分别提供真实运行证据。

## 范围与非目标

本基线覆盖现有 React/Vite Web、Tauri Desktop、共享领域契约、浏览器运行态和本地治理门禁。Desktop/Web 共用根 `src/`；`src-tauri/` 只承载 Desktop 原生能力；未来 Mobile 必须位于独立顶层 `mobile/` 工程，不得直接混入平台页面或宿主 runtime；跨端共享需经过明确抽出的、与平台无关且可版本化的契约或核心包。Mobile 仅在有独立原生包和同态证据时计入完成；390px 浏览器布局不能代替 Mobile 验收。

真实 Provider/GPU、ComfyUI 模型、VPS 账号/积分/会员/用量、云同步、DNS/TLS、第三方 MCP、用户最终视觉确认和正式发布需要各自的外部条件与任务证据。Web 的账号、会话、积分、会员和用量控制面目标部署在 VPS；项目/素材是否云端保存仍需独立数据契约。条件缺失时任务保持 `PARTIAL`、`TODO` 或 `BLOCKED`，不得用 mock、旧截图或静态代码替代。

## 核心用户路径与完成标准

| 路径         | 必须贯通的行为                                                                                                                          | 完成证据                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 项目创作     | Landing 创建或打开项目，输入提示词/附件/参数，提交任务，看到 loading 与任务状态，结果带资产身份回到画布，刷新后项目仍可打开             | Web 同态浏览器证据；受影响时补 fresh Tauri 证据；项目/任务/资产存储回归 |
| 对话与 Agent | 连接状态可见，消息流、审批、工具错误/取消、会话恢复正确；图片结果只在真实回执和资产注册后进入画布                                       | Agent 单测和浏览器回归；Desktop 仅以真实托管运行证据计入 Desktop 完成   |
| 最小 AI 生成链 | 连接健康检查、一次文本生成、一次图片生成、结果/原件回写、保存/重载恢复；loading/success/error/cancel/offline/unknown 状态可见 | Desktop、Web、Mobile 分别具备真实调用和同态 UI 证据；Web 与 Desktop 还需证明核心任务/结果语义和双端切换一致；fixture/mock 不计入 |
| 设置与能力   | Provider/Skill/MCP 设置可保存、读取、失败提示和恢复；凭据不进入 localStorage、项目、导出、URL 或日志；MCP 发现与调用遵循协议和授权边界  | 定向单测、UI 状态回归、治理/安全检查；真实第三方能力另有外部验收        |
| 故障与恢复   | 失败、partial、cancelled、offline、unknown、timeout、损坏和容量冲突均有明确状态；重试只重试安全子项，重排不重复成功项，导出保留原始数据 | 故障/并发/重启/导出回归；禁止“异常变空项目”或静默覆盖                   |

一项功能只有在声明范围内的实现、用户可观察验收、相关回归、文档和独立审查全部具备时，任务才可标 `DONE`；功能卡只有在适用平台同态运行证据和 `DONE/PASS` 任务同时满足时，才可标 `REAL`。

## 代码与数据规范

- 目录边界遵循 `src/components`（页面与组件）、`src/domain`（schema/领域模型）、`src/features`（功能编排）、`src/integrations`（外部适配）、`src/runtime`（存储/运行时契约）和 `src-tauri`（原生边界）。Desktop/Web 继续共用这些根目录；Mobile 代码不得混入其中，未来使用独立 `mobile/` 工程。组件超过 300 行按职责拆分。
- UI 不直接拼接 Provider 请求或写任意文件；共享契约先于页面实例，跨模块 schema、存储、协议、权限或回滚语义变化必须有 ADR 或对应 change spec。
- 凭据只进系统凭据库或请求内存；项目快照、localStorage、导出包、URL 和日志只保存不透明引用或非敏感元数据。
- 所有读、校验、写入、资产查找和远程调用失败都必须显式返回错误；不得把失败降级为空项目、成功结果或隐式重试。
- TODO、FIXME、Prototype、Mock 和占位 UI 必须能在任务账本或功能卡中找到对应边界；可见控件必须有行为，或给出禁用原因。

## UI 规范

UI 的唯一入口是 [`docs/UI_INDEX.md`](../UI_INDEX.md)，运行时语义 token 是 [`src/styles/tokens.css`](../../src/styles/tokens.css)。实现顺序固定为“业务状态 → 页面模板 → tokens/共享组件 → 实际页面 → 浏览器证据”。

每个异步操作至少覆盖 loading、success、error、cancel 和 offline；适用时补 timeout、unknown、stale async、focus、Escape 和键盘路径。默认、hover、active、selected、disabled、focus 使用同一套语义 token。提交前检查 390、1099、1920 宽度，并记录 route、import chain、运行模式、端口和同状态 DOM/截图证据。

## 链路与状态规范

入口到最终结果必须使用同一份领域状态和持久化契约：

`入口 → 输入校验 → 任务/会话创建 → 持久化意图 → 执行/流式回执 → 状态归档 → 资产注册 → 画布交付 → 保存/重载`。

状态改变必须有唯一 owner 和可观测的 revision/identity；并发写入采用明确的 CAS 或锁语义，迟到回执不能覆盖更新状态。Provider 无法确认受理时进入 `unknown`，不能把它当作失败自动重发。重试和计划重排必须保持幂等，并保留原计划与成功结果。

## 质量与交付门禁

本地可运行门禁为：`npm run typecheck`、`npm run test`、`npm run test:agent`、`npm run ui:check`、`npm run lint`、`npm run format:check`、`npm run build`、`npm run test:ui`、`npm run client:check` 及 `npm run verify`。当前环境若缺少 npm CLI，必须运行已安装依赖对应的 Node/Cargo 等价命令，并在 verification 明确记录，不能把未执行的命令写成通过。

任务交付必须带 `docs/changes/<date>-<task>/intent.md`、`spec.md`、`plan.md`、`verification.md`、`review.md`；同步 `task-ledger.json`、生成的 `TASK_LEDGER.md`、功能卡/注册表、`PROJECT_STATE.md`、`AI_HANDOFF.md` 和 `docs/PROGRESS.md`。代码变化后重新生成实际 Web bundle；Desktop 改动补 fresh release 或明确记录未验收边界。独立 reviewer 绑定当前 base/head SHA，head 变化后旧结论失效。

## 当前优先级与状态口径

当前台账的真实规模和状态以 [`task-ledger.json`](task-ledger.json) 为准；功能真实程度以 [`features.registry.json`](../features/features.registry.json) 为准。数据安全和凭据边界贯穿全部阶段；平台排序遵循：

1. **P0 Desktop UI/交互与最小 AI 链路**：连接健康、文本生成、图片生成、结果回写、失败/取消/离线/恢复。
2. **P1 Desktop 稳定化与发布**：统一任务态、素材/项目恢复、ComfyUI/Agent 扩展和安装回滚。
3. **P1 Web 蒸馏与 VPS 控制面**：复用共享核心，落地账号、会话、积分、会员和用量，再验收 Web 文本/图片链路与双端切换。
4. **P1 Mobile 独立工程与最小链路**：独立目录、协议、真实文本/图片链路、核心能力对齐和真机恢复。
5. **P2 全平台优化与高级能力**：性能、吞吐、复杂工作流、生态连接器，以及 Mobile 触控/弱网优化。

“用户自有 API 产品化接入”保持 **TODO / 高优先级**，在 Desktop 最小链路和 Web VPS 身份/会话契约完成前不实现；Desktop 当前允许用户自带 AI 账号登录或本机使用自己的 API Key。

`DONE`、`PARTIAL`、`TODO`、`BLOCKED` 分别表示已满足验收、部分能力或证据不足、尚未开始、依赖外部必要条件。状态不因代码存在、构建成功、旧证据或 mock 结果自动升级。

## 假设与未决项

- FACT：本地 Web/Agent/桌面编译和浏览器回归以当前 change verification 的实际命令为证；当前审计工作树不是稳定 `main`。
- INFERENCE：没有用户提供的 Provider/GPU、ComfyUI、VPS、Mobile 设备或真实第三方 MCP 条件时，只能完成本地代码和 fixture 边界。
- UNKNOWN：外部部署、真实账号、生产数据和用户最终视觉满意度必须在对应任务中重新取证。
- 本文件不替代 `AGENTS.md`、`AI_RULES.md`、`SPEC_BASELINE.md`、`UI_INDEX.md`、`DATA-STORAGE.md` 或功能卡；冲突按这些权威文件的优先级裁决。
