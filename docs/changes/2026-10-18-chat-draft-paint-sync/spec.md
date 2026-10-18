# Spec：切换聊天后的可编辑草稿同帧归属

- Task ID：TASK-CANVAS-RELEASE-20261018；状态：READY；日期：2026-10-18。
- [Intent](intent.md) / [Plan](plan.md) / [原完整发布规格](../2026-10-18-unified-toolbar-release/spec.md)。
- 基线：main87c；本包补充AC-2，不替代完整统一发布验收。

聊天切换后，输入框可编辑的每一绘制帧都必须属于当前所选聊天，不能在A标签下短暂暴露B草稿后再靠被动effect回填。保持原异步提交的originChatId、草稿、附件、消息和归档持久化语义，不靠等待、重试或测试清空文本掩盖问题。

复用ConversationPanel现有draftKey/prompt/approvalMode同步块，将该同步从useEffect改为useLayoutEffect，使父层输入状态在浏览器绘制前回填；其状态字段、依赖和其余effect不重构。回归在现有两种真实tab点击/异步提交场景增加4倍CPU下requestAnimationFrame归属断言，原请求数、回执、消息与草稿持久化断言保留。

Desktop/Web共享该组件；独立Mobile工程源码、数据schema、provider/凭据、应用identifier、origin和平台版本均不改变。此局部回归不是本轮Mobile或正式Native安装验收。

现有完整发布契约继续有效：工具栏画布定位，三端2.1.41及单Windows Agent包，真实原件/配置保护，最终main门禁后不可变tag、Hosted工件/实际安装和线上来源/页面/资料回读。87c已有flaky，不能直接视为最终发布来源；最终source待新修复正常合入及门禁后确定。
