# Review：旧聊天迁移与恢复

- Task ID：TASK-CHAT-MIGRATION-20261017；NOT_VERIFIED；base bbc8a766，最终head待冻结。
- [Intent](intent.md)、[Spec](spec.md)、[Plan](plan.md)、[Verification](verification.md)。
- 三只读诊断已确认root/chat双权威、未接生产迁移、无损缺口与protocol6可变canvas风险。实现者自检和诊断不算独立验收。
- 最终由独立上下文reviewer核对真实base/head、原件与候选对账、Native/IDB每步失败、线程所有权/scope、真实产物及实际资料迁移。未知/未来格式仍须失败关闭；不能仅审schema或给Map模拟器PASS。
- 原审计source469/C/d356失败与最终bbc8文档收据全部保留原阶段，不改变历史结论。

## e2482a21正式独立审查：CHANGES REQUIRED

固定base bbc8a766、head e2482a21a86df6e86ff7f0de42aa8eb4d5bae222、tree83b7601afeafa462b90d15230fd1e1c5fd2efa48，103文件。Standards与Spec两个独立上下文分别从规则/需求与提交diff开始；开始时clean，后来browser fixture修改独立记录，不冒充该提交内容。

| 轴/ID | 严重度与阻断 | 已复现条件、影响 | 修复与复验 |
| --- | --- | --- | --- |
| Standards / STD-CHAT-01 | P1 / 阻断资料迁移交付 | connect读取较瘦远端history，同clientMessageId的已有user记录被整体替换，attachments/assetIds/未知元数据与稳定ID丢失并落盘 | runtime作者修复中，须真实连接与canonical保存RED/GREEN |
| Standards / STD-CHAT-02 | P1 / 阻断资料迁移交付 | 同chat运行中断线重连，前端新epoch与服务旧boundScope不一致；审批/中断/工具拒绝，旧scope SSE被丢弃 | runtime作者修复中，须受控恢复同chat+确证thread+runningturn并保留旧回执拒绝 |
| Spec / SPEC-CHAT-01 | P1 / 阻断资料迁移交付 | 直接聊天A发送await时切同项目B，迟到成功通过旧draft callback清空B正文并把A附件写到B | App/direct composer独立作者修复中，须原作用域+未改草稿验证 |

Standards收据`.tmp/chat-migration-20261017/standards-review-bb0d4e61-aba6-4a03-8bdf-b783867867eb.json` SHA998a33d1fae3224a90ee6a881b4787fd5147a434c9885c6f7983cd7ca127ed70；Spec收据`spec-review-f2a5e69d-9f6f-463a-8d3e-db99d8384510.json` SHAa71eed66b77691b466f02fbeb3fc12c64490908b3f0c662d97839b0e85d3948c。两者均使用真实生产函数的无服务内存反例；未启动服务/Native或访问用户资料。三项关闭、新head复审及实际迁移验收前不得标PASS。

## 修复候选（新head待提交/复核）

STD01现同时保留远端历史及SSE重发的原稳定ID、附件/assetIds/未知字段；STD02受控恢复相同client/chat与已确证旧thread的running turn新transport epoch，原canvas/turn不改、已受理工具不重放、旧回执拒绝，待审批恢复可见并可操作，中断受理。另修首次连接应先postState后activate的真实HTTP7握手顺序。真实客户端/Session内存路由及邻域158/158、Session34/34、类型/lint/格式通过，浏览器共享夹具改canonical3。

SPEC01移除保存成功前的草稿清空；回调绑定原project/chat且只清未修改的发送草稿，迟到UI状态/输入/审批与内部busy隔离，原queued任务保留originChatId。root相连审查又发现合法Node v2无chat项目的兼容分支被新回调拒绝，追加真实RED3项后保留严格legacy身份与原root草稿CAS，未扩大Node迁移。新34项包含在最终146/146邻域通过，类型/lint/格式通过；2个真实UI延迟回执用例尚待root运行。以上是实现者回归结果，须新提交上的独立双轴复核与运行验收，不回填e248批准。

## 22352acc源码双轴复审：PASS（运行交付仍未验收）

固定head22352accda1c29bbcf7b7aac4408429a4069ef8e、tree e805c2a14cb5a9ef34cdcb40e49a5695be9c6deb；两独立上下文复核增量与base全diff。STD01/STD02/SPEC01源码问题关闭，Spec87+34、Standards69项独立验证通过，收据摘要见[验证记录](verification.md)。此批准仅绑定该提交源码，不包含后续首页连接修复、测试夹具调整、完整浏览器、Native或实际资料迁移；后续新head仍须复审。原e248的CHANGES REQUIRED收据保持原结论。

## 751c7d1a双轴独审：CHANGES REQUIRED

固定head751c7d1aaafcf1c18d13bf0c29e97777a6542978、tree653aa09f；109文件中95项与此前正式收据hash相同、14项增量及调用链完整审查。两位独立reviewer分别从固定提交提取真实首次handleCreateProject生产函数，延迟成功时编辑新A/切B，均复现正文与附件被无条件清空，新增STD-CHAT-03 / SPEC-CHAT-02，P1验收阻断。独立94单位及112+34+35检查通过不能覆盖该缺口；3browser夹具按ADR修改未发现弱化有效保护。新收据路径/摘要见[验证记录](verification.md)，后续修复须新SHA复审，不改写751结论。
