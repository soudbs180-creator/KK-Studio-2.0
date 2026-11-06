# Plan：DPAPI 保护器受控契约

- Task ID：TASK-AI-GATEWAY-001
- 工作树：`D:/kk-studio/.worktrees/TASK-AI-GATEWAY-001-dpapi-protector`
- 顺序：先写纯契约和注入式 runner，再补单测，再跑该单测与类型检查。
- 合流：只合并本任务文件。主仓账本和其他 agent 的未提交改动保持不动。
- 停止条件：单测失败、或发现必须改脏文件才能接线时停止，不扩大范围。
