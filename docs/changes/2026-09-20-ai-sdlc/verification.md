# Verification — TASK-GOV-002

状态：规则候选验证完成，等待 PR 远端检查和合并。当前记录只覆盖治理规则、执行脚本、模板和规则场景；后续 head 变化后本记录需重新判断。

- 基线 origin/main@8aca3abdd6386b6d6cee7fd9836e27e5aec38eab；独立任务分支/worktree。
- 当前读取 GitHub：private、默认main、protected=false；protection/rulesets API403要求Pro或公开仓库。未改变可见性/套餐，EXT-GIT仍BLOCKED。证据：docs/evidence/ai-sdlc-2026-09-20/remote-audit.json。
- main现有CI run35492697622 failure；167 browser passed、1 failed sidebar motion、1 flaky creation-flow。这里只保留该失败的审计记录，不修复、不接管产品测试或证据；PR #4 的 hosted CI 以最终规则 head 单独回读。
- 未调用付费模型、未部署生产、未删除分支/tag、未重写主线；模型eval尚未live执行。
- 本轮UI设计、产品代码、产品测试、旧截图/报告、Rust/Tauri与既有证据均只读，不宣称其完成或重新验证；Desktop原生TaskHost真实运行验收仍属T5。
- 本次规则候选验证：`governance:check` 30 tasks/0 violations；push policy 临时仓库 9/9；delivery policy 12/12；AI 场景结构 12/12；规则文件 lint、typecheck、Prettier、Markdown links 与 `git diff --check` PASS。
- 未把此前候选的 browser、Rust、UI 或 storage contract 数字当作本次规则结果；这些结果仍归属于原提交/原任务，旧证据不被改写。
- PR 状态：draft PR #4 已创建，首次 head `2420a02d21e258ed43367bde37fa2ef350c16fc5`；补充本状态记录后会产生新的最终 PR head，需以该 head 的 hosted checks 为准。
