# 统一任务态契约（FEAT-031）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-10-08
- 关联任务：TASK-TASKSTATE-001, TASK-TASKSTATE-002, BACKEND-MEDIA-001

## 用户可见入口

- 能力：图片/文本（未来视频/音频）共用同一任务模型：9 态状态机（queued/running/unknown/partial/succeeded/failed/cancelled/offline/interrupted）、幂等、安全可重试的失败输出选择、成本估算（估算标注，非实际扣费）。
- 当前 UI 入口：任务工作台队列与批量矩阵（TaskWorkbench）；成本估算在任务审批与结果区显示。
- Desktop / Web 差异：两端同一领域模型。

## 代码位置

- 前端：`src/features/creation/taskState.ts`（任务态与失败输出选择）、`src/features/creation/taskRecovery.ts`（唯一普通重试门禁）、`src/features/creation/model.ts`（CreationTask 承载）、`src/features/creation/imageTaskCommand.ts`（提交路径）
- 桌面 Rust：无（任务宿主为 Web 侧任务模型；Rust TaskHost 见 T6）
- 服务端：无（云端任务态属平台波次）
- 数据/存储：`CreationProject.tasks`（`kk-studio-next:creation:v1` 快照）

## 测试与证据

- 单测：`tests/unit/taskState.test.ts`、`tests/unit/taskRecovery.test.ts`；重试子任务的不确定状态传播有专门回归。
- 浏览器回归：全量 388/388 通过，任务工作台覆盖未知状态、批量重试与审批流程。
- Rust 测试 / 实机验收：无
- 变更与验证证据：`docs/changes/2026-10-03-incomplete-tasks/verification.md`

## 当前能力

- 已实现的领域层能力（跨模态运行验收仍待补）：
  - 统一任务态契约枚举与排序（unifiedTaskStatuses / taskStateRank）；
  - 普通重试统一沿用 `taskRecovery.canRetryTask`：`unknown` 或已提交的任务不可普通重试；
  - `retryFailedOutputIndices` 仅在任务安全可重试时选取确定失败的输出，不包含 `unknown` 输出；
  - 成本估算函数与展示文案（estimateTaskCostUsd / formatCostUsd，估算口径标注）；新建和重试任务在没有供应商报价时保持未知，不写入示例单价；
  - 画布交付失败或供应商受理不明时，重试子任务的 unknown 状态会传播到父任务并关闭普通重试入口。
- 明确标注未接：
  - 供应商实际报价/账单回执尚未接入（TASK-TASKSTATE-002），因此没有报价时 UI 只显示未知；
  - 视频/音频尚未有提交路径消费该任务模型（BACKEND-MEDIA-001）。

## 差距与后端化

- “UI 已显示但后端未接”的点：实际成本仍等待供应商报价回执；批量矩阵状态语义与 9 态契约一致但视频/音频提交路径尚未接入。
- “已实现但未验证”的点：`unknown` 拒绝普通重试已有领域单测；真实 Provider 回执丢失与重启恢复仍需实机验证。
- 变成 REAL 还缺什么：视频/音频真实生成链路接入统一任务模型（BACKEND-MEDIA-001）；成本从估算升级为供应商报价/积分（平台波次）；每平台运行证据。
- 外部依赖与阻断条件：媒体真实链路依赖供应商 Key（EXT-PROVIDER）。

## 变更记录

- 2026-09-23：创建卡片；新增统一任务态契约模块（TASK-TASKSTATE-001，见 `docs/changes/2026-09-23-agent-orchestration/`）。
- 2026-10-03：`937b050` 收口任务成本未知语义，`085b083` 补重试不确定状态向父任务传播，`db84558` 补重启恢复时父子任务对账与重复提交防线，`760b3e0` 补终态回执解除父任务不确定状态；新增 `TASK-TASKSTATE-002` 跟踪供应商成本报价回执。
- 2026-10-03：`f344563`/`a68fd10` 补齐终态缺回执、旧格式错误传播、排队 intent 源状态和 unknown 回执证据保护；`768326a`/`c4cac9c`/`e5644eb` 补归档失败、原生提交不确定、缺失文案正文、完整归档证据优先与恢复错误文案清理；新增重启/稀疏/嵌套重试回归。
- 2026-09-23 补充：候选审查发现新辅助函数将 `unknown` 选入普通重试，已改为复用既有恢复门禁，并用确定失败/受理不明场景回归。

- 2026-10-08：`5cbfe99`/`dc05556` 完成原生回执双重身份、索引一致性和非法类型校验，实时与恢复共用围栏；既有归档、合法子集及缺失 outputs 的旧 assetIds 格式保留。定向原生/恢复53项与完整浏览器388项通过，独立源码复验PASS；真实Provider/Desktop运行与外部门禁仍未完成。
