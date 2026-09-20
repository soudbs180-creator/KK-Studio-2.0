# Verification — TASK-GOV-002

状态：规则候选验证完成，等待 PR 远端检查和合并。当前记录只覆盖治理规则、执行脚本、模板和规则场景；后续 head 变化后本记录需重新判断。

- 初始基线 origin/main@8aca3abdd6386b6d6cee7fd9836e27e5aec38eab；远端随后前进到 `fb57529c719924330ec0154f5374df8f5d508e00`，已通过普通 merge 纳入当前任务分支，未修改或审查该上游任务；当前为独立任务分支/worktree。
- 当前读取 GitHub：private、默认main、protected=false；protection/rulesets API403要求Pro或公开仓库。未改变可见性/套餐，EXT-GIT仍BLOCKED。证据：docs/evidence/ai-sdlc-2026-09-20/remote-audit.json。
- main现有CI run35492697622 failure；167 browser passed、1 failed sidebar motion、1 flaky creation-flow。这里只保留该失败的审计记录，不修复、不接管产品测试或证据；PR #4 的 hosted CI 以最终规则 head 单独回读。
- 未调用付费模型、未部署生产、未删除分支/tag、未重写主线；模型eval尚未live执行。
- 本轮UI设计、产品代码、产品测试、旧截图/报告、Rust/Tauri与既有证据均只读，不宣称其完成或重新验证；Desktop原生TaskHost真实运行验收仍属T5。
- 本次规则候选验证：`governance:check` 30 tasks/0 violations；push policy 临时仓库 9/9；delivery policy 12/12；AI 场景结构 12/12；规则文件 lint、typecheck、Prettier、Markdown links 与 `git diff --check` PASS。
- 未把此前候选的 browser、Rust、UI 或 storage contract 数字当作本次规则结果；这些结果仍归属于原提交/原任务，旧证据不被改写。
- PR 状态：draft PR #4 已创建并在规则范围收窄后正常推送；hosted checks 必须以 PR 当前 head 回读，不能沿用旧候选结果。
