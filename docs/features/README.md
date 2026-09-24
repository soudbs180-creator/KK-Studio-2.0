# 功能总览与状态看板

> 本文件由 `docs/features/features.registry.json` 经 `npm run features:write` 生成，请勿手改。
> 每个功能的人类可读入口是同目录 `feat-*.md` 卡片；任务进度以 [`../governance/task-ledger.json`](../governance/task-ledger.json) 为权威。
> 演示功能后端化的分批顺序见 [`BACKEND-ROADMAP.md`](BACKEND-ROADMAP.md)。

## 状态定义（任何 AI 必须按此口径汇报）

| 状态 | 含义 |
| --- | --- |
| REAL | 声明范围内真实可用；各适用平台均有同态运行证据和 DONE/PASS 任务；未覆盖的外部服务能力不得据此宣称完成 |
| PARTIAL | 部分子能力真实可用、部分未接或未验证；卡片必须逐条列清已 REAL 部分与差距 |
| PROTOTYPE | 只有 UI、本地 fixture 或固定演示素材，无真实后端；界面必须显式标注 Prototype |
| PLANNED | 只有计划/设计，无实现或无 UI |

当前共 **29** 个功能：REAL（真实可用）2、PARTIAL（部分可用）20、PROTOTYPE（仅演示/UI）5、PLANNED（仅计划）2。

## 如何新增一个功能（任何 AI 照此执行）

1. 复制 [`_feature-template.md`](_feature-template.md) 为 `docs/features/feat-<name>.md`，填全入口、代码位置、测试、当前能力与差距。
2. 在 `features.registry.json` 增加一条记录，状态从 PROTOTYPE/PLANNED 起步，并关联账本任务（新工作先在 task-ledger.json 建任务）。
3. 运行 `npm run features:write` 重新生成本看板，再运行 `npm run features:check`（已并入 `npm run lint`/`verify`）。
4. 功能做到 REAL 必须有同态运行证据（Web 与 Desktop 分别验证），并更新卡片、账本与 `docs/PROGRESS.md`；证据不足只能标 PARTIAL/PROTOTYPE。

## 画布

| ID | 功能 | 状态 | 卡片 | 关联任务 |
| --- | --- | --- | --- | --- |
| FEAT-001 | 创作画布（节点/连线/编辑） | REAL（真实可用） | [卡片](feat-001-canvas-workbench.md) | T2, UI-004, TASK-UI-006 |

## 创作生成

| ID | 功能 | 状态 | 卡片 | 关联任务 |
| --- | --- | --- | --- | --- |
| FEAT-002 | BYOK 图片生成与持久任务宿主 | PARTIAL（部分可用） | [卡片](feat-002-image-generation.md) | T5, TASK-PROV-001, EXT-PROVIDER, TASK-AGENT-001, TASK-AGENT-004 |
| FEAT-003 | 图片比例与清晰度参数 | PARTIAL（部分可用） | [卡片](feat-003-image-parameters.md) | BACKEND-IMAGE-PARAMS, TASK-AGENT-001 |
| FEAT-004 | ComfyUI 本地出图链 | PARTIAL（部分可用） | [卡片](feat-004-comfyui.md) | T6, EXT-COMFY |
| FEAT-005 | ComfyUI 工作流库（本地管理） | PARTIAL（部分可用） | [卡片](feat-005-comfyui-workflows.md) | T6, TASK-CAP-001, TASK-DS-002 |
| FEAT-006 | 视频生成节点 | PROTOTYPE（仅演示/UI） | [卡片](feat-006-video-generation.md) | BACKEND-MEDIA-001, TASK-MINIMAX-001, EXT-PROVIDER |
| FEAT-007 | 音频生成节点 | PARTIAL（部分可用） | [卡片](feat-007-audio-generation.md) | BACKEND-MEDIA-001, EXT-PROVIDER, TASK-UI-005 |
| FEAT-008 | 文本创作节点 | PARTIAL（部分可用） | [卡片](feat-008-text-node.md) | BACKEND-TEXT-NODE, TASK-UI-005 |
| FEAT-009 | 对话与模型聊天 | PARTIAL（部分可用） | [卡片](feat-009-conversation.md) | T4, BACKEND-CONVERSATION, TASK-UI-005, TASK-AGENT-001, TASK-AGENT-002, TASK-AGENT-003, TASK-AGENT-004, TASK-AGENT-005 |
| FEAT-010 | 语音输入 | PARTIAL（部分可用） | [卡片](feat-010-voice-input.md) | TASK-CAP-001 |
| FEAT-029 | 提示词库 | PARTIAL（部分可用） | [卡片](feat-029-prompt-library.md) | TASK-UI-005, BACKEND-PLATFORM |

## 智能能力

| ID | 功能 | 状态 | 卡片 | 关联任务 |
| --- | --- | --- | --- | --- |
| FEAT-011 | 本地技能 Skills | PARTIAL（部分可用） | [卡片](feat-011-skills.md) | TASK-CAP-001, TASK-DS-002 |
| FEAT-012 | MCP 客户端 | PARTIAL（部分可用） | [卡片](feat-012-mcp.md) | TASK-CAP-001, BACKEND-MCP-AUTO, TASK-AGENT-001, TASK-AGENT-003, TASK-AGENT-004, TASK-AGENT-005 |
| FEAT-013 | 连接器目录 | PARTIAL（部分可用） | [卡片](feat-013-connectors.md) | TASK-CAP-001, TASK-MINIMAX-001, TASK-UI-005, PLUGIN-DESKTOP-001 |

## 平台服务

| ID | 功能 | 状态 | 卡片 | 关联任务 |
| --- | --- | --- | --- | --- |
| FEAT-017 | 账号与登录 | PROTOTYPE（仅演示/UI） | [卡片](feat-017-account.md) | BACKEND-PLATFORM, T10 |
| FEAT-018 | 积分、订阅与平台额度 | PROTOTYPE（仅演示/UI） | [卡片](feat-018-credits.md) | BACKEND-PLATFORM, T10 |
| FEAT-019 | 云端保存与多端同步 | PARTIAL（部分可用） | [卡片](feat-019-cloud-sync.md) | BACKEND-PLATFORM, T10, T9 |
| FEAT-020 | 长期记忆服务 | PROTOTYPE（仅演示/UI） | [卡片](feat-020-memory.md) | BACKEND-PLATFORM, T10 |
| FEAT-021 | 应用内代理 | PARTIAL（部分可用） | [卡片](feat-021-proxy.md) | BACKEND-PLATFORM, TASK-UI-005 |

## 系统与数据

| ID | 功能 | 状态 | 卡片 | 关联任务 |
| --- | --- | --- | --- | --- |
| FEAT-014 | 素材库与资产管理 | REAL（真实可用） | [卡片](feat-014-assets.md) | T3a, TASK-PERF-ASSETS-001, PERF-001 |
| FEAT-015 | 项目与项目包 | PARTIAL（部分可用） | [卡片](feat-015-projects.md) | T3a, T3b, T9, TASK-DS-002 |
| FEAT-016 | 任务工作台与审批 | PARTIAL（部分可用） | [卡片](feat-016-task-workbench.md) | T4, T5, UI-003, TASK-UI-006 |
| FEAT-022 | 设置中心 | PARTIAL（部分可用） | [卡片](feat-022-settings.md) | TASK-PROV-001, UI-004, TASK-DS-001, TASK-DS-002, TASK-UI-005, TASK-AGENT-001 |
| FEAT-023 | 导航、侧栏与多创作页 | PARTIAL（部分可用） | [卡片](feat-023-navigation.md) | TASK-UI-DISMISS-002, UI-004, TASK-UI-006 |
| FEAT-025 | 本地演示素材管线（待替换 seam） | PROTOTYPE（仅演示/UI） | [卡片](feat-025-demo-media.md) | UI-003, BACKEND-MEDIA-001, BACKEND-TEXT-NODE |
| FEAT-026 | Windows 启动器与分享包 | PARTIAL（部分可用） | [卡片](feat-026-launcher.md) | T7 |

## 后端服务

| ID | 功能 | 状态 | 卡片 | 关联任务 |
| --- | --- | --- | --- | --- |
| FEAT-024 | Generation Gateway/Worker（持久后端） | PARTIAL（部分可用） | [卡片](feat-024-gateway.md) | T5, T8 |

## 未来规划

| ID | 功能 | 状态 | 卡片 | 关联任务 |
| --- | --- | --- | --- | --- |
| FEAT-027 | Astra 研究助手 | PLANNED（仅计划） | [卡片](feat-027-astra.md) | TASK-ASTRA-001, BACKEND-ASTRA-001 |
| FEAT-028 | Mobile 适配 | PLANNED（仅计划） | [卡片](feat-028-mobile.md) | T12 |

## 门禁

- `npm run features:check` 校验：卡片状态元数据和固定章节、路径在仓库内且类型正确、任务 ID、非 REAL 关联开放任务（排除 DONE/OBSOLETE）、REAL 非空入口/代码/测试与 DONE/PASS 任务、platforms 各平台的 runtimeEvidence 文件、全部卡片登记及看板一致。
- 门禁验证证据的结构与路径；证据内容、来源新鲜度和声明范围仍须独立审查，不能靠创建空文件证明真实能力。
- 该检查已并入 `npm run lint` 与 `npm run verify`；新增/改动功能却不更新登记册会直接失败。
