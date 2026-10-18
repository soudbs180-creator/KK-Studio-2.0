# Spec：可观察验收

- Task ID：TASK-CANVAS-RELEASE-20261018；[Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md)。

1. 选中图片时工具栏中心跟随图片中心，属于画布；侧栏或画布边界可遮挡，不通过横向滚动、让位或自动平移改变定位。
2. 桌面客户端、网页版、手机网页版均标明平台，发布版本统一为 2.1.41；Windows 下载只有一个含 Agent 的 setup.exe。
3. 旧项目、原件、消息角色/内容、活动聊天与草稿、图片归档收据、设置与凭据引用升级和重开后保留。损坏、冲突或迁移失败应停止覆盖并保留恢复材料。
4. 当前提交通过独立审查、Hosted CI 和 Delivery 后按正常 PR squash 合并；main 当前 SHA 通过 CI 后创建不可变 v2.1.41 tag。
5. Windows 工件绑定 tag/SHA/receipt/hash，安装生命周期验证不触碰真实用户原件。组合 Web 正式发布后回读 kkai.plus 和 /mobile/ 版本、来源 SHA 与实际页面。
6. Web 数据仍在同源设备浏览器；手机网页版不等于原生安装包；无新 API 秘密持久化或真实付费生成请求。
