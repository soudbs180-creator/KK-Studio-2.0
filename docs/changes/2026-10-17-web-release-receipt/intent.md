# Intent：独立手机 UI 与正式 Web 发布

- Task ID：TASK-WEB-RELEASE-20261017；承接[原交付包](../2026-10-17-web-release/intent.md)。
- 用户要求 kkai.plus 与已验收客户端对齐、仅正式 Release 自动同步、保留一个回滚版本，保护数据与本地未提交改动。
- 用户随后拒绝 2.1.37 的桌面响应式布局，明确要求已做好的独立 Cherry 参考手机版在手机尺寸或手机浏览器进入；本包修正验收对象，不把旧 40 项桌面响应式检查称为手机 UI 接受。
- 恢复 Mobile 原创实现 `267f04f2` / 文档提交 `58df6791` 中的独立 mobile 与纯 contracts 包，不合入旧 Desktop 2.1.13。保持已确认视觉和当前 Web 免登录本地创作、可选账号规则。
- 受影响产物：Web 2.1.37→2.1.38；Mobile 候选源码 2.1.2→2.1.3（独立手机 Web 入口）；Desktop 2.1.37 不变。原生 APK/iOS 与生产身份服务不在本次交付范围。
- [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md) / [Release](release.md)。
