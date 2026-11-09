# 当前版本与数据保护实施计划

> **For agentic workers:** 使用 superpowers:executing-plans 顺序实现；独立安全任务在自己的工作树执行。用户已明确指定五阶段顺序，无需逐阶段形式确认。

**Goal:** 用当前候选证据推进验收，并关闭已复现的恢复数据覆盖漏洞。

**Architecture:** 保持模块化单体。复用 Companion 现有资产格式准入和回滚实现；跨端只共享纯契约。

**Tech Stack:** 仓库锁定 Node 24、TypeScript 5.6.3、React 18.3.1、Tauri 2.11.1；npm 与现有 lockfile。

**Spec:** [spec.md](spec.md)。

## 任务

- [x] 绑定当前 checkout、HEAD、dirty 文件指纹，重跑完整本地门禁；保留失败日志和环境跳过，阻塞不得冒充通过。
- [x] 在 `tests/unit/companionRestoreTargetProtection.test.ts` 覆盖 Native v1、未来 v9、未知记录、坏 JSON。断言预期错误及主/备/记录/Blob 字节不变，先观察失败；补 Windows 大小写及实际回滚回归。
- [x] 在恢复首写前复用 `parseCompanionDiskRecord`，保留迁移合法 origins；92 项本机服务测试通过。
- [x] 当前源码安全锁升级仅处理 body-parser 及必要 qs 修复，真实插件隔离和未知上游身份分别保留；不触碰其他依赖和生产门。
- [x] 独立审查实际 diff 和文件指纹；当前产品快照、本地组合验证、新安装包收据、TaskHost 11 项及官方 BAT 38 项检查已有证据。
- [ ] 后续按原边界完成跨格式显式导入、剩余安全/来源、Hosted/main、安装生命周期/签名/干净机、六态/像素及有权限后的真实生成验收；性能阶段先取基准。

## Review Focus

目标记录与备份来源使用不同格式；未来版本不可降级覆盖；坏 JSON/未知记录不得被空数据替代；失败不先轮转 `.bak`；正常同格式恢复与既有回滚故障路径保持通过。
