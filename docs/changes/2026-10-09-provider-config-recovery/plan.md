# Plan：TASK-PROV-CONFIG-004

1. 在当前main独立worktree登记任务，读取原实现、CLI、Agent打包规则与健康原证据；记录基线25/25。原审计是旧main的事实，当前源码仍保留相同缺陷。
2. 新增有注释/引号/多行值、悬空选择、显式切换、无效输入及config/catalog原件保护回归，先捕获真实RED。
3. 最小修复语义解析与section识别、拒绝失效active、所有验证前置到写入前；保留非受管原文与现有目录/密钥纪律。
4. PR42普通落地后合并最新main至本源分支，解决真实组合冲突，自动递增Desktop版本、同步功能卡及账本。
5. 相关与全量检查、fresh Agent打包、独立精确head审查；只在当前verify/delivery及实际保护要求通过后普通PR squash，再回读真实main。

TOML规范依据：[TOML 1.0](https://toml.io/en/v1.0.0)；解析器依据：[smol-toml官方源码](https://github.com/squirrelchat/smol-toml)。此为既有故障修复，不改变产品默认模型决策。

6. 独立408审查发现inline作用域P1后，先真实35/36 RED，最小lexer修复并用36/36、完整verify/fresh包及a3正式复审关闭。继续独立处理主线区域重试和Windows CI失败；有失败门禁时先诊断，不抢合。最终docs与本地任务审查随后，精确最终head Hosted及post-main仍需实际回读。
