# 测试证据隔离 Implementation Plan

> For agentic workers: use superpowers:executing-plans. 用户已授权自主技术实施，任务状态只维护原task-ledger。

- Task ID：TASK-VERIFY-EVIDENCE-20261015；状态：IN PROGRESS；[Spec](spec.md)。
- 文件：scripts/testing/test-evidence.mjs分配独占run目录；playwright.config.ts使用独立artifacts/report并记录源码；development/plugins.mjs和desktop/plugin-recovery.mjs在启动前分配目录；unit/testEvidence.test.ts运行真实无浏览器CLI；TESTING与治理文档同步。
- [x] 先用真实Playwright默认配置和合成旧证据复现RED，保留失败日志。
- [x] 最小实现独立目录/已存在拒绝，验证成功和失败均不损旧原件。
- [x] 测试唯一目录、文件/目录/链接拒绝、源码metadata和独立report。
- [ ] 定向、全量Node、lint/typecheck/format及独立审查；受保护浏览器全量等待GDI承接后执行，不运行裸Edge批次。
- [ ] PR61实际CI满足门禁后正常合入；从当前main承接本任务独有提交，重核branch/ledger/diff及精确SHA。

治理PR61尚未合入时本分支基于已推送冻结head；不在main开发，不rebase/force。后续从新main挑选独有提交，保留原分支。风险重点：Playwright隐式清理、路径复用、错误/取消、旧历史原件与新报告身份。

- 独审补项：worker共享run与48处固定截图迁移均先RED再GREEN；在安全Edge运行验证真实PNG位于同run、旧合成截图不变，随后精确SHA独审。
