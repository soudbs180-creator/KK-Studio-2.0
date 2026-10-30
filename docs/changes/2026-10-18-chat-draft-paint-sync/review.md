# Review：草稿同步修复当前提交门禁

- Task ID：TASK-CANVAS-RELEASE-20261018；[Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。
- 日期：2026-10-18；base：87c9cfbe0f19555f9998d6b7051760f22f26f67f；最终head待提交，当前独立预检不是新提交批准。

独立预检确认原rAF证据的可编辑跨聊天草稿属于真实P2，生产差异限ConversationPanel同步块useEffect→useLayoutEffect及import；原断言保留，旧RED/新10次GREEN有实际日志。main87c原拼接交错的完整选择区路径未直接重现，不能超出已证绘制竞态声称根因全部闭环。

| 门禁                               | 当前结果       | 范围                                                       |
| ---------------------------------- | -------------- | ---------------------------------------------------------- |
| dirty源码/RED-GREEN独立预检        | 有界预检已核对 | independent-draft-layout-precheck.json；不代替精确head审查 |
| 精确新head独立审查                 | NOT_VERIFIED   | 提交后绑定base/head/diff，确认无未关闭P0/P1或验收阻断      |
| 新head完整验证 / Hosted / Delivery | NOT_VERIFIED   | 当前lint/typecheck/格式和局部GREEN不代填                   |
| 正常PR/最终main/正式完整发布       | NOT_VERIFIED   | 承接完整统一发布任务，未tag/发包/部署                      |

用户已有正常提交合并、发包、网站/手机Web更新及资料保留授权，不虚构GitHub自批准或用户最终产品接受。实际ruleset和当前HEAD checks另回读。源码、测试或base变化后重新核对受影响范围；旧失败原件保持，审查最终结论以本PR当前HEAD和外部独立回执为准。
