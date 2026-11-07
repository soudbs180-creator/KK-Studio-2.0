# 实际验证

两个代表用例在原入口均失败（red.log）：Agent设置卡片不存在、等待登录账号tab超时。只更新入口后两个均通过（green.log）。扩展为9项，workers=2、retries=0，全部通过（regression.log）：首页就绪不建会话、拥有线程恢复/暂停、旧线程拒绝接管与显式替换边界、审批锁定、Web Token不持久化、三类卡片原件保护。所有原业务断言保留。

本次对四份任务的额外只读核查：165份仓内reference/superpowers与容器9文件进行原字节和LF规范化hash对照，均无证明等价副本；全部保留，不能认定为重复后删除。脚本output/scripts/reference-content-audit-20261028.cjs，结果output/repo-layout-2026-10-28/reference-content-audit.json。只补齐这一项比对，不据此宣称整个ORG-0或ORG-4完成。

快速门禁结果及提交指纹另在本包收尾记录；完整verify、当前增量独审、Hosted/原生和main整合未完成。

快速typecheck/lint/npm test均exit0，2333项中2313 pass/0 fail/20 skip；回执绑定2e473afa及本次working-tree候选。两份测试原文件指纹另存容器candidate-fingerprint.json。文档及账本收尾检查另执行，不把提交前回执冒称提交后精确SHA重跑。
