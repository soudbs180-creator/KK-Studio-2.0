# Review：IRV-CONC-001 诊断入口

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：CHANGES REQUIRED（首次审查）；修正后的精确head待复审。
- Base：`7ebf143b291e344b243e1ef396d510bb91730bd3`。
- 本包 [intent](intent.md)、[spec](spec.md)、[plan](plan.md)、[verification](verification.md)。

Self-review：历史原件hash、步骤/资源边界、GB/GiB、参数化用例精确选择、已有目录拒绝、单轮失败不因后续通过被覆盖。产品source和原测试/config不变。Windows执行证据待真实CI，不能提前PASS。

独立审查者：`/root/concurrency_review`，独立上下文；base `7ebf143b291e344b243e1ef396d510bb91730bd3`，首次head `315cb9d999abc80519d401bf95baeedd8329ed10`。读取diff和规则，核验69份原件，运行5项回归和9项选择，并通过实际临时服务启动及故障注入复现以下阻断项：

| Finding | 首次结论 | 修正与复验 |
| --- | --- | --- |
| R1 P1：临时配置继承相对webServer命令，cwd落入证据目录 | MODULE_NOT_FOUND，不能启动服务 | 显式repo cwd；新回归和真实production服务smoke通过 |
| R2 P2：upload-artifact默认排除隐藏.tmp | 可能零原件仍通过 | 限定诊断路径include-hidden-files=true；缺文件error；待真实CI上传 |
| R3 P2：采样器错误/提前退出未参与结果 | 注入采样器exit1仍被判通过 | 记录退出码、signal、提前结束、强制kill；失败门禁及回归通过 |

IRV-CONC-001保持OPEN/P2并阻断根因已确认/DONE声明；本次交付是继续诊断，不声称历史缺陷已修复、合并或发布。修正后三项必须按最终head复审，不覆盖首次CHANGES REQUIRED记录。
