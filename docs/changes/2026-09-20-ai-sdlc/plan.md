# Plan — TASK-GOV-002

- 基线：origin/main@8aca3abdd6386b6d6cee7fd9836e27e5aec38eab；独立codex/TASK-GOV-002-ai-sdlc，D:/kk-studio-next/.worktrees/TASK-GOV-002。
- 起始审计误用了旧master草稿，已仅撤回本轮自有修改并迁入新基线；旧root用户并发实现与索引保留。
- 顺序：读取主线治理和原文 → 独立审计规则/源码 → AI入口与SDLC模板 → push/delivery防线与反例测试 → 修正有限契约/文档冲突 → 完整verify → 独立review → 可审阅提交/PR。
- 并行职责：文档代理负责engineering三文件和templates；契约代理负责DATA/GENERATION/UI文档和tasks目录；Git代理负责新push-policy/installer/tests；主代理整合入口、CI、delivery、账本和证据。共享文件串行。
- 涉及：根规则/兼容入口、docs/engineering/governance/templates、.github/.githooks、config/github-rulesets、scripts、tests、storage-contract。
- 风险：本地hook共享整个仓库但不能覆盖现有hook；私有免费计划不可用远端保护；PR单用户不能自审批；历史main与origin同tree不同祖先；规则过严阻碍自主性；测试固定历史输出。
- 回滚：本任务规则/脚本提交可通过revert PR撤回，安装hook前确认无已有文件；若撤回安装仅移除确认属于本版本的两个文件，不动其他hooks。保留旧证据和历史分支，未执行任何清理。
- 验证：独立push真实repo测试、delivery失败用例、storage目录契约、lint/typecheck/unit/UI标准/格式/build/production browser；CI Rust与desktop编译沿用现有工作流。
- 新发现：main最新CI失败来自sidebar动画跨进程取样丢中间帧，纳入本次质量门禁修复，保留所有原几何断言；Desktop原生provider门禁差异单独确认，不因文档说完成就关闭。
