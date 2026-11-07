# TASK-MOD-GATE-FORMAT：恢复完整格式门禁

用户于2026-10-28明确要求独立分支使用Prettier修复18个历史文件，再跑完整verify并推进P0合流。任务在既有任务树复用执行，不写主checkout或Figma。Owner：root。

分支`chore/TASK-MOD-GATE-FORMAT`，base `e35004a03a19b24d691082eade3dbf3e9a531cb5`（P0候选），最终目标`origin/main`。Zod补丁位于独立分支，不混入此格式提交。现有主线113/7分叉另按TASK-GOV-004处理。

验收：18个文件仅格式变化；转译后的JavaScript语法树相同；format和完整verify实际运行，任何继承失败据实记录；当前提交独立审核及Hosted门禁满足后才能正式合流。
