# Spec：依赖恢复边界

- Task ID：TASK-VERIFY-DEPS-20261015；[Intent](intent.md)。
- 原生官方启动器原有guard正确拒绝linked node_modules。root手动切换前的PowerShell guard把Target字符串按[0]读取而失败，编排未检验exit_code仍继续npm ci；这是执行方错误，不能归因于官方guard失效。
- bare npm ci会先清node_modules内容，不能对共享junction直接运行。修复仅在已核对为普通物理目录的主仓node_modules内，使用主仓现有锁文件、ignore-scripts/no-audit/no-fund；不改源码、package、lock、index或用户资料。
- 逐个读取两树锁定依赖版本并独立核验主仓三项hash；历史依赖无before字节清单，完整原字节UNKNOWN。保留失败日志、修复日志和回执。
- 后续依赖准备必须在前置命令exit0后才执行下一步；linked树沿现有官方guard拒绝，不绕过，不用批量命令把失败前置与安装并列。需要转换时先完成可审查的单独安全流程。
