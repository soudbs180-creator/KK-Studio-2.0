# Review：公开下载名

- Task ID：TASK-CANVAS-RELEASE-20261018；状态：NOT_VERIFIED。
- base：`0cc3b4ed116d71062244e3097285a2b532de8f97`；branch：`fix/TASK-CANVAS-RELEASE-20261019-download-asset`；实际精确 HEAD、独审及 Hosted 以本 PR 外部回执为准。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。

自审：共享常量的全部调用方仅设置页和现有平台测试；public filename/href/download共同对齐dot名，本地NSIS/receipt无引用/无修改。真实规则和匿名现存资产观察支持该修法；旧build的href断言RED、新build同用例GREEN保留全部下载、导航、端别和Agent说明断言，未加retry/timeout。没有新增依赖、CSS、组件或存储/凭据写入。typecheck及三个代码文件格式检查通过。

独立精确提交审查仍待；dirty预检不能冒充最终review。提交后完整verify、Hosted质量/Delivery/Windows candidate及正式来源仍须各自实证。

三端候选维持同次未发布 2.1.42；42 标签创建前的来源修复不移动任何不可变标签。源审、Hosted、GitHub审批、正式包、安装、生产和用户接受分别记录，不自我批准或使用 bypass。
