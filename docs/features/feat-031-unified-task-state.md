# 统一任务态契约（FEAT-031）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-23
- 关联任务：TASK-TASKSTATE-001, BACKEND-MEDIA-001

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

- 单测：`tests/unit/taskState.test.ts`、`tests/unit/taskRecovery.test.ts`
- 浏览器回归：无
- Rust 测试 / 实机验收：无
- 变更与验证证据：`docs/changes/2026-09-23-agent-orchestration/verification.md`

## 当前能力

- 已实现的领域层能力（跨模态运行验收仍待补）：
  - 统一任务态契约枚举与排序（unifiedTaskStatuses / taskStateRank）；
  - 普通重试统一沿用 `taskRecovery.canRetryTask`：`unknown` 或已提交的任务不可普通重试；
  - `retryFailedOutputIndices` 仅在任务安全可重试时选取确定失败的输出，不包含 `unknown` 输出；
  - 成本估算函数与展示文案（estimateTaskCostUsd / formatCostUsd，估算口径标注）。
- 明确标注未接：
  - UI 成本显示仍含硬编码示例单价（$0.04/张）未全部收口到 estimateTaskCostUsd（后续 UI 任务）；
  - 视频/音频尚未有提交路径消费该任务模型（BACKEND-MEDIA-001）。

## 差距与后端化

- “UI 已显示但后端未接”的点：任务审批窗成本行仍为示例单价文案；批量矩阵状态语义与 9 态契约一致但展示细节未逐项对齐。
- “已实现但未验证”的点：`unknown` 拒绝普通重试已有领域单测；真实 Provider 回执丢失与重启恢复仍需实机验证。
- 变成 REAL 还缺什么：视频/音频真实生成链路接入统一任务模型（BACKEND-MEDIA-001）；成本从估算升级为供应商报价/积分（平台波次）；每平台运行证据。
- 外部依赖与阻断条件：媒体真实链路依赖供应商 Key（EXT-PROVIDER）。

## 变更记录

- 2026-09-23：创建卡片；新增统一任务态契约模块（TASK-TASKSTATE-001，见 `docs/changes/2026-09-23-agent-orchestration/`）。
- 2026-09-23 补充：候选审查发现新辅助函数将 `unknown` 选入普通重试，已改为复用既有恢复门禁，并用确定失败/受理不明场景回归。
