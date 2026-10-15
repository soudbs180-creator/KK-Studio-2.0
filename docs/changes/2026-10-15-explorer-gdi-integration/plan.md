# GDI保护统一承接 Implementation Plan

- Task ID：TASK-EXPLORER-GDI-20261015；状态：REVIEW；[Spec](spec.md)。
- 依赖图：治理PR61 → 输出保护6374/9aa（本机独审通过）→ af8独有7文件 → 完整受保护验证 → 精确SHA独审 → 正常PR/main → HOME三P2。当前分支仅临时堆叠，不用最大候选版本覆盖daily。
- [x] 核验af8父tree与main235e相同，保留旧候选dirty现场；新任务包/原账本同ID领取。
- [x] cherry-pick唯一af8，手工保留配置两个保护边界；逐文件核对来源与合并交点。
- [x] 定向无浏览器输出回归、真实Windows参数回归/100自有页面、PNG同run及旧字节保持；再冻结源码运行完整verify。
- [x] PR61当前门禁满足后正常squash并fetch核main；在复用clean树从实际main只承接独有安全提交，保留所有旧分支。
- [ ] 独立精确SHA审查、正常测试安全PR、当前Hosted通过后普通squash，复验实际main；再串行HOME恢复，不代填用户UI/客户端验收。

- [x] 9aa源码完整verify exit0、Windows/PNG/100页及47文件独立组合审查PASS；454旧文件及备份hash保持。
- [ ] 记录文档冻结与源码零差异，再提交正式测试安全PR；Hosted/main/合后验证继续，产品验收单列。
