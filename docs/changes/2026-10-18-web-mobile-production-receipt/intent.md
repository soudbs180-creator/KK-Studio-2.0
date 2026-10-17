# Intent：独立手机 Web 正式发布收据

- Task ID：TASK-WEB-RELEASE-20261017；日期：2026-10-18，Asia/Shanghai。
- 状态：IMPLEMENTED；生产技术交付及用户手机UI验收PASS，最终文档门禁另记。
- 交付包角色：current，承接[实现与发布前证据](../2026-10-17-web-release-receipt/intent.md)。
- Owner：root；分支：`docs/TASK-WEB-RELEASE-20261017-production-receipt`。
- 工作树：已登记的TASK-WEB-RELEASE-20261017隔离树；开工base/HEAD：`f730f1dc32fb2e568dda6d4a52c58b05802d6b6b`，开工时clean。
- [Spec](spec.md) / [Plan](plan.md) / [Verification](verification.md) / [Review](review.md) / [Release](release.md) / [权威账本](../../governance/task-ledger.json)。

## 用户原意与授权

用户要求kkai.plus与已验收客户端对齐，手机浏览器显示此前完成的独立Cherry参考UI，并保护现有数据及本地未提交改动。用户已拒绝2.1.37的桌面响应式布局作为手机版；旧40项响应式检查不代替独立手机UI验收。

更新规则明确为“只跟随正式Release；普通提交和预发布不同步”。服务器保留当前版本和一个回滚版本；已授权临时root公钥在完成后删除。授权不扩大为删除业务数据、恢复归档或Git历史。

## 本包结果与范围

PR66正常squash合入main后，Web2.1.38已将Desktop Web与`/mobile/`独立入口组合发布。生产九项首试通过，38/37单份回滚及临时授权清理完成；用户随后直接确认：“已显示独立手机 UI，正常”。

Mobile2.1.3为源码版本，Desktop源码2.1.37不变。本轮不交付新APK/iOS包，不代填Safari专项、实体手机真实Provider/账号完整生成链，也不宣称用户本地Desktop安装器已更新。

## 验收条件

| ID   | 可观察结果                                 | 实际证据                                                  |
| ---- | ------------------------------------------ | --------------------------------------------------------- |
| AC-1 | 手机默认独立聊天UI，宽屏及显式桌面入口正常 | 生产九项、入口DOM/截图、用户实体手机UI确认                |
| AC-2 | 本机草稿重载保留，可选登录往返不丢资料     | 持久化/realm回归及生产九项，无假session或自发账号请求     |
| AC-3 | 仅正式Release更新，来源和线上资源对应      | main五Hosted、正式tag、发布run、archive/manifest/入口hash |
| AC-4 | 一个回滚版本，临时root授权已撤             | current38/previous37、隔离回滚及上版全hash、撤钥收据      |

上述生产技术与用户UI结果见[verification](verification.md)。最终文档head、独立复核、Hosted及Delivery须提交后记录真实结果。
