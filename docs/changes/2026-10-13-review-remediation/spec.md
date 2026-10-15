# Spec：审查 P1/P2 修复

- Task ID：`TASK-REVIEW-REMEDIATION-001`
- 记录状态：READY
- 交付包角色：`current`

## 治理生命周期

1. 三个当前治理入口必须精确匹配登记的 `docId`、`source` 和 `status: current`。
2. 元数据只从头部独占字段读取；代码块、正文和重复字段不能伪造或覆盖头部身份。
3. `supersededBy` 为 `current` 时只能是 `null`；旧入口必须指向登记的 current 文档或稳定 ID。
4. 门禁扫描全部 `docs/governance/*.md` 的 current 元数据；日期交付包是历史证据，不参与当前路由。

## 日志与插件

1. details、Error、message、scope、sink、console、诊断文本和位置 URL 均不得暴露凭据、Bearer/API key/token/password/cookie/session 或 query/fragment 秘密。
2. 级别校验只接受自身可枚举的四个级别；代理对象、getter、循环/深层/超大对象和 sink/console 故障不能反噬业务调用。
3. 插件事件处理器的同步异常、异步拒绝和恶意 thrown object 必须只记录脱敏诊断，并继续通知后续订阅者。

## 交付边界

治理脚本、模板、账本和历史勘误进入治理提交；日志、插件接口及其测试进入独立运行时提交；版本一致性检查若保留则使用单独提交，避免把产品运行时改动伪装成治理变更。
