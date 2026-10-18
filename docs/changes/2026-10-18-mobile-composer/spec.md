# Spec：稳定的手机创作控件生命周期

- Task ID：TASK-MOBILE-COMPOSER-001；READY；2026-10-18；交付包角色：current。
- [Intent](intent.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。设计沿根 DESIGN、独立Mobile聊天UI及现有 Composer/Toolbar/Sheet，数据边界沿 ADR-011/019/025。

## 状态与交互

现有空text的active只由输入focused等条件决定；失焦会卸载Toolbar，而RN Web onPress在click才交付。主代理已在真实本地浏览器复现聚焦→按钮出现→点击后工具栏消失、未打开面板。

将组件内focused状态改为interacting锁存：首次onFocus置true，不在onBlur复位。进入后工具栏在同一Composer生命周期内保持挂载，切项目/账户的既有组件key重挂载自然重置。初始空文字仍紧凑；已有prompt、附件、image/video的active规则保持。模型继续使用完成后的onPress，保留键盘与触摸取消语义，不用onPressIn提前执行或任意延时抢事件。

ModelPicker/Sheet沿现有连接选择、搜索/手工模型与关闭流程。无Key/连接不能禁用模型查看入口；生成门禁不变。不主动发现模型、重新生成或改变Key保存策略。

## 数据、平台与恢复

- 不改变任务/原件/草稿schema、namespace、credentialRef、Provider、账户或服务器业务数据库，不迁移或删除数据；仅局部临时UI状态，无需新ADR。
- 影响独立Mobile Web的Composer；Android/iOS原生源码共用该组件，但本次不宣称原生包或实体设备通过。Desktop不改。
- 以隔离浏览器测试草稿/原件，实际用户浏览器仅核对既有资料；四视口/触摸、鼠标、Enter、取消和短屏面板为必要运行证据。
- Web2.1.40/Mobile2.1.5为候选；当前正式39/previous38是既有观察。新正式Release成功后才将39作为唯一previous，健康异常沿既有受限控制器回滚，不实际演练降版以免触碰业务。
- 原始JPEG全字节/像素取证已纠正“文件全黑”；浏览器长停留刷新可恢复原件不等于实体安卓后台/内存驱逐/Safari/PWA通过。网络截断的时段不声称完整零请求。
