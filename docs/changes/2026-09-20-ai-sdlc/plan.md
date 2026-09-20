# Plan — TASK-GOV-002

- 基线：origin/main@8aca3abdd6386b6d6cee7fd9836e27e5aec38eab；独立codex/TASK-GOV-002-ai-sdlc，D:/kk-studio-next/.worktrees/TASK-GOV-002。
- 起始审计误用了旧master草稿，已仅撤回本轮自有修改并迁入新基线；旧root用户并发实现与索引保留。
- 顺序：读取主线治理和原文 → 只读审计规则/源码/证据 → AI入口与SDLC模板 → push/delivery防线与反例测试 → 修正治理规则冲突 → 规则检查与独立review → 可审阅提交/PR。
- 并行职责：文档代理负责engineering三文件和templates；Git代理负责push-policy/installer/tests；主代理整合入口、CI、delivery、账本和规则审计证据。产品代码、既有测试、旧证据和其他人的提交不分配写入者。
- 涉及：根规则/兼容入口、docs/engineering/governance/templates、.github/.githooks、config/github-rulesets、scripts、规则场景/unit tests。
- 风险：本地hook共享整个仓库但不能覆盖现有hook；私有免费计划不可用远端保护；PR单用户不能自审批；历史main与origin同tree不同祖先；规则过严阻碍自主性；测试固定历史输出。
- 回滚：本任务规则/脚本提交可通过revert PR撤回，安装hook前确认无已有文件；若撤回安装仅移除确认属于本版本的两个文件，不动其他hooks。保留旧证据和历史分支，未执行任何清理。
- 验证：独立push真实repo测试、delivery失败用例、规则场景、lint/typecheck/格式与 governance check；不接管产品 UI/browser/Rust 运行结果或既有证据。main既有 CI 失败和 Desktop provider 差异只记录为其他任务 follow-up。
