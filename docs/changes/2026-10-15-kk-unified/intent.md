# KK Studio 统一修复与重构

用户于 2026-10-15 明确批准《KK Studio 统一修复与重构方案》并要求实施。目标是让现有本地项目与配置可继续使用，修复配置、模型选择、Agent、项目管理和界面链路，再交付 Web 共仓库、统一登录及手动加密备份。

本任务承接本次全部补充，不能用静态控件、模拟请求或旧候选的测试数字代替交付。Desktop → Web；独立 Mobile App 由既有任务承接。真实账号、模型包、云配额、域名及部署权限不足时，保留可审查实现并逐项标记未验收。

实施基线：origin/main d95e4c446d3b4ae5419ce0f58c68057ebabc286a，Desktop/Web 2.1.34。隔离分支 codex/TASK-KK-UNIFIED-20261015，不覆盖其他候选或用户数据。

2026-10-15 主线对齐与统一入口确立：本地 main 与主仓检出点均已对齐 origin/main（0 落后 0 领先，工作区干净）；对齐前的本地 main `1d8ae2a0` 由 `backup/pre-main-align-20261015` 保全，在途改动导出至 `D:/kk-studio/.verification/2026-10-15-main-align-preserve/`。旧成果只去重承接，不并行重复开发。沿用 `TASK-VERIFY-DEPS-20261015` 与 `TASK-HOME-LOAD-DRAFT-20261015` 承接未完成缺口，均保持 PARTIAL，不因测试转绿或数字好看而标记通过。详见 [baseline-alignment.md](baseline-alignment.md)。
