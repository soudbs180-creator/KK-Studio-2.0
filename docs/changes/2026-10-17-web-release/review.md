# Review：Web 发布与正式 Release 自动同步

- Task ID：TASK-WEB-RELEASE-20261017；状态 IN_PROGRESS。
- [Intent](intent.md) / [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md)。

产品聚合独立审查固定 d95e4c44→bbc8a766：无本次静态 Web 发布阻断，140/140 定向测试通过；不代表真实后端或全仓安全证明。index.html 限制页面缩放列为后续可访问性问题，本次保持客户端验收产品字节一致。

发布器冻结文件独立预检 PASS：前轮 gzip 隐藏元数据预算、首次切换异常、previous 时序、正式 released 事件和 secrets 分页防覆盖问题均关闭；额外 GNU/PAX 长路径、超大隐藏头和 shell 语法复核通过。Linux 31/31 测试通过。最终提交 SHA、实际服务器权限、HTTPS、托管 Release 和生产手机仍须验证，预检不替代上线验收。

Hosted PR64 暴露 Windows TEMP 8.3 别名与规范路径比较问题。本轮只修 Rust 测试：canonicalize 已存在根目录后比较预期路径，保留未创建配置文件断言，产品实现完全不变；真实 Windows 8.3 RED/GREEN 和 rustfmt 通过，完整 cargo 待新 PR 托管确认。

后续发布测试夹具也以realpath规范化临时目录，保留生产canonical_directory拒绝规则；同一真实Windows8.3环境RED/GREEN通过。手机菜单既有裁切为明确未通过项，不能将核心布局通过写成全手机验收通过；本次未修改已验收产品CSS。

以上为用户补充授权前的阶段记录。用户随后要求本次修菜单并重新验收，新增phone视口定位及仅打开菜单时topbar语义层级修复；旧裁切/新workspace遮挡两轮RED保留，最终四browser回归首过、四尺寸40/40本地通过。新packager固定tar时间/owner/排序、stage权限和gzip流；独立权限/umask扰动重复归档逐字节一致，Linux32/32。最终提交SHA绑定复核、Hosted/main门禁和生产域名仍待执行，不把本地/dirty预审当上线验收。
