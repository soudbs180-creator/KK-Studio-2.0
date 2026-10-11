# Spec：开发协作流程

- Task ID：`TASK-DOCS-STRUCT-001`
- 状态：IMPLEMENTED
- 设计来源：[`2026-10-10-development-workflow-design.md`](../../superpowers/specs/2026-10-10-development-workflow-design.md)

## 实现边界

本次将设计说明落在以下权威边界内：

- `task-ledger.json` 继续承载任务状态、负责人和依赖；`TASK_LEDGER.md` 继续由脚本生成。
- `docs/engineering/DEVELOPMENT-WORKFLOW.md` 承载日常操作顺序，不替换 SDLC、分支、测试、评审和竞品专项规范。
- `intent/plan/verification/review/incident` 模板补充领取确认、状态笔记、边界自查、成果说明、复核交接和防复发字段。
- `docs/README.md`、`SDLC.md`、竞品目录和 `PROGRESS.md` 提供入口与变更留痕。

## 状态和完成条件

`TODO`、`IN_PROGRESS`、`REVIEW`、`DONE`、`BLOCKED`、`PARTIAL`、`REGRESSION` 的含义、进入条件和证据要求以流程入口为准；任务只有在实现、适用回归、用户可观察验收、文档/账本同步和独立复核均有当前 SHA 证据时才可标记 `DONE`。

交付包文件的 `DRAFT` / `READY` / `IMPLEMENTED` / `FINAL` / `NOT VERIFIED` 是 artifact 生命周期，账本的任务状态仍是唯一完成判定；本次交付包已落地；独立复核、治理门禁和账本同步均已通过，`TASK-DOCS-STRUCT-001` 已标记 `DONE` / `PASS`。

## 竞品边界

外部对象、观察日期、模式、来源和证据必须进入竞品目录或研究包；静态比较、截图、fixture 和未运行竞品不能证明 KK 的 live、发布或用户验收。候选差距必须映射现有 feature/task，并写 AC、依赖、成本、放弃条件和验证方式。

