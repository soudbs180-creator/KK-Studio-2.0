# Plan：TASK-VERIFY-ORIGIN-003 治理与交付收口

- Task ID：TASK-VERIFY-ORIGIN-003
- 状态：PARTIAL
- 日期：2026-10-10
- Owner / branch：root / `fix/TASK-VERIFY-ORIGIN-003-main-7ebf143`
- Base / candidate source HEAD：`7ebf143b291e344b243e1ef396d510bb91730bd3` / `4949b3db9471113c7e70b7f78a0a35c457e30cca`
- 远端目标：PR #51（draft）；不执行 merge、auto-merge 或 release

## 实施步骤

1. 重新读取 PR #51 head、现有治理文件和 renderer，避免覆盖并行更新。
2. 固定 Playwright origin，并将四个目标 spec 升级为完整 origin 检查。
3. 记录真实配置矩阵（1431/1421 拒绝；1423/未设置固定 origin）。
4. 记录 build、typecheck 和四个目标 browser specs（`--retries=0`，16/16）。
5. 新增 dated package，更新 PROGRESS 与 JSON ledger，并生成 `TASK_LEDGER.md`。
6. 推送后等待 Hosted CI；独立 review、完整 browser suite/npm verify 不得预填成功。

## 完成标准

文档/ledger/生成视图绑定精确分支；任务保持 `PARTIAL/PARTIAL`，直到 full suite/npm、Hosted 和 independent review 有真实收据。