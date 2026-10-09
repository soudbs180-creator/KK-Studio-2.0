# Intent：Windows入口失败可诊断

TASK-WINDOWS-ENTRY-DIAG-002承接用户继续失败任务要求。PR43 exact fa36推送37851173715入口单测status null失败，另一同head PR全流程成功；原因UNKNOWN。独立IRV-DIAG-002确认诊断信息丢失。本任务仅补安全子进程取证，不改变BAT/产品、timeout、成功与拒绝/旧exe不回退断言。原失败继续保存，实际CI推广另验。
