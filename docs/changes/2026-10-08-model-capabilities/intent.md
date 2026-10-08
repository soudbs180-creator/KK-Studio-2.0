# Intent：按账号和精确模型声明图片能力

- Task ID：TASK-MODEL-001；状态：READY；日期：2026-10-08。
- 请求来源：用户提供 ArtCraft 仓库并要求学习，在第一阶段落地建议后说“开始”。
- 授权：本轮实施第一阶段的模型能力目录、参数与提交校验；普通工程决策由 AI 自主执行。
- 后续授权：用户要求继续，并明确“始终允许你来操作，但是你需要评估不要盲目的”；在已授权目标内完成隔离候选、验证、审查和 draft PR，按真实证据决定下一步。
- [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md) · [Review](review.md) · [账本](../../governance/TASK_LEDGER.md)。

## 用户原意与工程转译

把研究中可用的通用方法落到 KK 现有模型目录：用户切换账号或模型时，参数和图片编辑能力跟随精确模型；已知限制在请求发出前解释清楚。独立实现，不复制 ArtCraft 的产品源码或模型列表。

本轮包含服务报告/手动填写、持久化恢复、账号隔离、图片生成/编辑三态、参考图与一次任务生成数量限制，以及现有 Web/Desktop 提交入口。蒙版和扩图只记录能力声明；实际素材、协议和编辑界面属于后续阶段。不会新增付费调用、部署、模型认证或新的队列。

共享前端影响 Desktop 和 Web，按现行规则各递增 patch；Mobile 没有原生产物，不递增。

## 验收

| ID | 可观察结果 | 验证 |
| --- | --- | --- |
| AC-1 | 服务报告和手动能力保存后重新打开不丢失；非法字段不会进入目录 | 真实解析/存储单测和浏览器重载 |
| AC-2 | 同名模型在不同账号独立；地址、凭据身份变化后旧声明失效 | 账号/精确 ID 单测和切换浏览器回归 |
| AC-3 | 明确不支持编辑或超出参考图/生成数量时，不创建受理任务、不发送请求，显示原因；旧模型保持兼容 | 提交门禁、UI 操作及 HTTP 边界回归 |
| AC-4 | 参数菜单、数量/参考图入口消费同一目录；蒙版声明不冒充已接通 | 三档 Web 和 fresh Tauri production 的同状态 DOM/截图 |
| AC-5 | 全量工程检查和独立上下文审查通过，原 checkout 不受影响 | verify/client:check、独立 review、Git 状态 |

## 依据与边界

FACT：main/origin/main@21d121d；现有目录只有用途、尺寸和显示元数据；连接级 operations/maxReferences 与模型声明没有贯通。规则来自 AGENTS、AI_RULES、UI_INDEX、GENERATION-PLATFORM 和 VERSIONING。

INFERENCE：服务可能没有能力扩展字段，所以缺失表示未知，并提供手动声明。声明不是实际生图验证，不改变连接 verified 状态。

技术决策：沿用 `kk-studio:model-catalog:v1`，增加可选字段；未知的旧生成/编辑沿用连接允许范围；新蒙版/扩图仍须显式声明且本轮不开放执行。`maxGenerationCount` 是一次 KK 任务的数量限制，与连接的每次 HTTP `maxOutputs` 分开。

待用户决定的产品语义：无。真实供应商、Mobile、发布验收不由本轮 fixture 证明，相关既有任务保持开放。

## 后续受控修正

首轮Hosted原始日志含本任务1flaky；继续调查复现真实草稿通知覆盖bug并按预审补齐显示字段依赖。当前本地408/408零flaky、fresh native及head71ddb625独立技术补审通过，最终文档HEAD和新SHA Hosted仍待完成。历史证据保留，本轮准确运行、SHA与状态见[verification](verification.md)和[review](review.md)，不把已发现问题掩盖为完成。
