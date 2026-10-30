# Review：公开下载名

- Task ID：TASK-CANVAS-RELEASE-20261018；状态：NOT_VERIFIED。
- base：`0cc3b4ed116d71062244e3097285a2b532de8f97`；branch：`fix/TASK-CANVAS-RELEASE-20261019-download-asset`；实际精确 HEAD、独审及 Hosted 以本 PR 外部回执为准。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。

自审：共享常量的全部调用方仅设置页和现有平台测试；public filename/href/download共同对齐dot名，本地NSIS/receipt无引用/无修改。真实规则和匿名现存资产观察支持该修法；旧build的href断言RED、新build同用例GREEN保留全部下载、导航、端别和Agent说明断言，未加retry/timeout。没有新增依赖、CSS、组件或存储/凭据写入。typecheck及三个代码文件格式检查通过。

独立精确提交审查仍待；dirty预检不能冒充最终review。提交后完整verify、Hosted质量/Delivery/Windows candidate及正式来源仍须各自实证。

三端候选维持同次未发布 2.1.42；42 标签创建前的来源修复不移动任何不可变标签。源审、Hosted、GitHub审批、正式包、安装、生产和用户接受分别记录，不自我批准或使用 bypass。

后续4c精确源审6bcf3760及本机完整审计be1a915a已通过；push quality39167031850实际FAIL，不能据旧PASS合并。独立artifact与受控机制证明侧栏物理点击测试未等按钮enabled；云端点击当时状态仍UNKNOWN，两个首试缺按钮无snapshot/trace，不归因DOM或产品。最小维护仅一行额外可用状态断言，现有7项workers1/retries0通过；不减少原断言、不触产品/guard/timeout/retry。当前新提交需另做精确源码审查与门禁，历史独审不能批准新head。

独立失败诊断收据SHA256 `bd1ca8e6d5cac0e41789318a0f0a91a7fa8adfafd101374f1aa57a6e447eac76`：P2测试前提缺口已受控复现，4c Hosted终局FAIL仍阻断其合并/发布；云端具体原因UNKNOWN。诊断结束时4c工作树clean，封存期间root新dirty修正没有被冒充为该提交内容。
