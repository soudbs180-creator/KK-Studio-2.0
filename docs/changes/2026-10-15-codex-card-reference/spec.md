# Spec：Codex 卡片使用连线参考图

- Task ID：TASK-CODEX-REF-20261015；状态：IMPLEMENTED（验收 PARTIAL）；日期：2026-10-15。
- [Intent](intent.md)、[plan](plan.md)、[verification](verification.md)、[review](review.md)。
- 当前规则：根 AGENTS/AI_RULES、[SDLC](../../engineering/SDLC.md)、[UI_INDEX](../../UI_INDEX.md)；任务状态以[账本](../../governance/task-ledger.json)为准。

## 行为与数据

1. 用户从 `generationSource=codex` 图片卡片生成时，App 使用 `canvasImageAttachments` 收集卡片自身及入边的归档图片，排除 result 边和文本；保留现有去重、格式和原件校验。
2. `generateFromCanvas` 将这些图片转换为现有 Agent draft attachment 形态，传给 `sendMessage`；真正字节读取和附件限制沿用 `prepareAgentAttachments`。内置 `imagegen/image_generation` 提示和 1–4 数量限制沿用现有实现。
3. 参考附件异步准备后、turn 提交前，确认项目仍相同、source/参考节点与连线签名仍有效，并服从调用方 AbortSignal。取消、图变化或切项目须停止提交，不能把图生图静默变为文生图。
4. `canvasSource` 的来源卡片 metadata 保持，供既有图片事件归档生成结果边；可同时保留 canvas reference metadata，不能用附件 metadata 覆盖来源卡片。

无需新增持久化 schema、凭据、Provider、依赖或 ADR。参考原件仅走用户明确选择的 Codex 请求通道，日志不记录图像字节或秘密；不切换 API。

## 状态与恢复

复用当前连接、发送、错误、停止和 unknown 受理状态；附件缺失、格式/大小不支持、额度不足或离线显示现有明确错误。已发 turn 的中断遵守原会话语义，不能将未确认写成成功。已归档图片/项目数据和存储 identity 保持；保存/重载由现有归档与项目仓库负责。

Desktop 是本次真实验收目标；Web 只验证共享代码/交互，不以浏览器 fixture 冒称账号生图或 Tauri；Native Mobile 无实现改动。没有视觉改版，仍须证明实际桌面入口和所加载产物。

## 验收映射

| Intent AC | 检查                                           | 必需证据                                    |
| --------- | ---------------------------------------------- | ------------------------------------------- |
| AC-1      | 带参考 Codex 卡片 → 已准备附件 → 内置工具      | 传输回归、桌面截图/turn 回执、参考原件身份  |
| AC-2      | 来源 metadata/结果边及归档恢复                 | 节点/边读回、原件 hash、正常重载读回        |
| AC-3      | 缺原件、准备期间取消、source/edge/project 变化 | 定向失败/取消回归；确认无 postTurn/API 请求 |
| AC-4      | 无参考 Codex、API 和聊天附件邻域               | 定向与项目规定检查、当前源码独立 review     |

实现补充：文本卡片连接图片时仍明确拒绝并保留草稿，不把图片输入静默丢弃；异步图校验覆盖真正 postTurn 前的竞态，相关 RED/GREEN 见 verification。当前 Desktop/Web 2.1.33，Mobile 2.1.1。

本规格不承诺所有 Provider、部署/安装器/发布、首页候选全范围或 Native Mobile 已通过。
