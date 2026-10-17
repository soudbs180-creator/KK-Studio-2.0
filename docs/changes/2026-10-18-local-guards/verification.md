# Verification：本地剩余项与规则核对

- Task ID：TASK-LOCAL-GUARDS-20261018；IN_PROGRESS / NOT_VERIFIED。
- [Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Review](review.md)。
- 当前base e11b87a5，原Desktop/Web2.1.37，7登记工作树/12本地分支。预算计入approved root内5/4；超限阻止新增，不代表允许删除现有树。原main 8c36a6b1/69dirty；Image POC有并发变化，不将一次采样写成静态全局事实。
- 写入前工程外保全 `D:/KK-Studio-recovery-20260921/remaining-local-20261018-c7960435-8faa-4397-8009-1dbafcdeece3`：7树105项dirty的源文件/删除标记/链接元数据、精确index/diff/status、全部引用Git bundle及当前raw3主备/身份检查点；全部复制逐字节核验，refsStable=true；receipt SHA `5b4c7b828e2a16adaa9e7598da9c4757a55a67eab7f18504e37f28310c35b49e`。不覆盖前轮v2/v3不可变备份。
- 基线只读复现：容器根非Git查询报错但检查器仍CREATE_WORKTREE/exit0；CLI未接目标路径；缺失登记/空分支可误复用。凭据store持久写拒绝后read返回未保存值。正式回归待实施者保存RED/GREEN。
- 取消与reporter写失败仅有方案，尚无新增PASS；旧失败不改写。外部额度、Hosted、Provider和发布边界保持开放。

## 实现者局部回归（尚非最终冻结验收）

- 工作树策略真实RED为8项中5个预期FAIL；空branch、缺失登记、显式越界复用、非法cwd查询与CLI目标路径均有反例。最终定向8/8 PASS，ESLint/Prettier/diff-check通过；证据`.tmp/task-remaining-20261018/worktree-policy-45534a0f86b34e16b9b855eeb9f4b0e8/summary.json`。没有增加预算或删除工作树。
- 凭据14项首次6个预期FAIL，覆盖持久失败、提交前提前可见、轮换和撤销后的迟到read、双层delete部分失败；修复后及逆序双写的五文件邻域59/59 PASS，ESLint/Prettier通过。generation仅在持久提交完成或每层delete结算失效，不引入队列。收据`.tmp/task-remaining-20261018/credentials-receipt.json`；仅合成凭据，目前Layered/Protected构造点均在单测，不宣称真实DPAPI或Provider能力。
- 证据10/10 PASS：真实runner SIGINT事件取消exit130/interrupted；真实JSON报告同名目录导致write失败exit1且测试自身PASS；子环境剥离污染后exit0，旧15份合成receipt/PNG/report字节/SHA全部保持。有效RED为未剥离环境时污染端口被正式config拒绝；前一环境比较harness错误和工程内fixture模块边界失败均原样保留，不算产品RED。源码/原始输出/退出码见`.tmp/task-remaining-20261018/evidence-negative-7xOZKL/final-summary.json`。旧错误日志含环境元数据，仅本地私有留存；取消不证明操作系统Ctrl+C投递。
- root typecheck通过；完整verify、Rust、当前官方Native和精确HEAD独审仍待执行。
