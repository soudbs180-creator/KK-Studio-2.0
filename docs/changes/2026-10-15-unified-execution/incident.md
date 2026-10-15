# Incident：测试默认输出清理遗漏备份

- Task ID：TASK-GOV-006；后续保护任务：TASK-VERIFY-EVIDENCE-20261015；2026-10-15 UTC；责任：本轮root。
- 动作：在原GDI候选af8执行完整 `npm run verify`。执行前只备份了 `test-results/browser-results.json`，未完整备份整个 `test-results`。
- 根因：Playwright会清理项目默认outputDir，即test-results；开发态历史receipt/截图也放在该目录。root未在运行前验证清理边界，备份不完整。
- 已确认损失：旧 `test-results/development-plugins/1792051751248/receipt.json` 不再存在（原SHA256 `89ac03b34001067108fa2fc27107c252b863c67d1113da05c42af29bdfb3388a`），相邻旧 `plugins.png` 路径同样不可用；未做完整运行前目录清单，其他旧输出损失范围UNKNOWN。
- 恢复核对：此前独立GDI核验者未保留完整旧JSON或截图副本，只有原hash/统计；本轮没有可校验原件副本，不能用摘要或新结果重建旧文件。原独立审查只证明其当时实际存在/匹配，不再证明旧路径目前可读。
- 保留：旧browser报告已备份，实测SHA256仍为 `f8950990217abdcd04c7a1f2e9aa32750c05f85eeaf1c21e836a3cfd374a8ba5`；原.tmp失败/成功日志、源码审查、两轮旧压力JSON、交接包及所有tracked/dirty源码与治理资料保留。用户数据和日常客户端未作为测试目标。
- 新证据：本轮af8完整verify确实exit0，Node1327/Agent199/Edge784首试、development4步骤通过；新输出已整体复制到工程外 `D:/kk-studio/.verification/2026-10-15-unified-execution-0908/gdi-exact-af8-test-results`，新结果不冒充旧结果。
- 立即限制：不再在含历史证据的默认outputDir上执行清理型测试；下次运行前必须独立run目录或完整备份+清单/hash校验，缺失时停止测试。
- 后续自动保护：TASK-VERIFY-EVIDENCE-20261015需先复现“旧开发态receipt和截图与Playwright共享目录被清理”，在独立合成fixture上证明旧原件保留、新结果独立及失败不丢证据，再整合正式测试入口。不得借此删除/迁移其他历史目录。
- 状态：历史原件恢复NOT VERIFIED/不可校验；当前测试PASS；保护实现TODO。没有把证据缺口写成已恢复，不将此事件扩为用户数据损坏。
