# 计划：规则与治理入口收敛

1. 读取当前 branch、HEAD、账本、治理入口和既有门禁，保留 B1+B2 提交。
2. 在 `doc-index.mjs` 增加生命周期头和重复 current 检查，接入 `snapshot:check` 并补单测。
3. 更新 `TASK_STATUS`、`PROJECT_STATE`、`AI_HANDOFF`，同步 `docs/README.md`、统一规则、权威地图、编码规范和 PROGRESS。
4. 原位更新 `TASK-GOV-003` 的当前状态并运行 `governance:write` 生成 `TASK_LEDGER.md`。
5. 运行 targeted tests、snapshot、governance、markdown、index、doc commands、format 和 typecheck；记录未执行范围。
