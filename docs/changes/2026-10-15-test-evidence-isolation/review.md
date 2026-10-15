# Review：测试输出隔离

- Task ID：TASK-VERIFY-EVIDENCE-20261015；当前NOT VERIFIED；[Verification](verification.md)。
- 自查范围：全部输出调用点、隐式清理范围、显式路径拒绝覆盖、失败/取消、源码身份、fixture隔离与旧原件hash。
- 提交后由独立只读上下文审查精确base/head及真实源码/回归；不以治理PR61的批准覆盖本任务。
- Hosted/独立审查/合规PR/main复验未完成前保持PARTIAL；产品UI/真实Provider/日常客户端不属于本测试设施结论。

## e5d5dc31 独审与修正

- 独立只读evidence_review审查base89fba→e5d5dc31，结论CHANGES REQUIRED；EVID-01/P1：48处固定截图覆盖旧路径；EVID-02/P2：worker重载分配第二run。两项阻断本任务输出保护验收，初始7/7不覆盖这些路径。
- EVID-02真实无浏览器probe加入outputPath产物后，成功/失败均2目录而RED；runner独占分配并通过KK_BROWSER_EVIDENCE_RUN传给worker后，两项GREEN、同run报告/产物。worker缺运行身份时失败关闭。
- EVID-01独立AST清单123文件/122截图，48调用点分布17文件需迁移；6个既有安全helper调用不改。新增守卫先针对48处RED，迁移到test.info().outputPath后GREEN；不改用户交互断言/夹具/重试。全量受保护Edge补实际PNG/旧字节证据后再正式复验，当前不提前关闭最终验收。
