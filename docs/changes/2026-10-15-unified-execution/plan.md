# 正式执行接管 Implementation Plan

> For agentic workers: use superpowers:executing-plans; repository task-ledger is the sole task authority.

- Task ID：TASK-GOV-006；状态：IN PROGRESS；[Spec](spec.md)。
- Goal：把新正式会话的实际接管和首项安全验证写成可恢复证据，再推进 GDI 正常承接。
- Architecture：复用当前隔离治理工作树；只读代理并行核验包/历史/GDI候选，root唯一写入治理资料。
- Tech Stack：Node24、现有 Git/治理脚本、Playwright1.63；不新增依赖/工作树。

- [x] 核对规则、remote/base/head/status和既有分支，校验原交接全部文件与zip。
- [x] 有界补读18个历史目标，接口明确限制保留，不绕读会话存储。
- [x] 重新执行 lint/typecheck、46项治理回归、交付/链接/快照/显式格式检查。
- [x] 只使用已保护 GDI 候选执行 Windows真实argv及100页合成测试，保护原dirty与日常进程。
- [x] 推送已独审的1b895ecb并建立草稿PR61；不直接推main/force。
- [x] 同步唯一账本、当前事实、恢复入口与进展；当前增量的提交后精确SHA独审由工程外review收据绑定。
- [ ] 当前PR Hosted verify/delivery全绿后正常squash，重核main；再从实际main承接af8独有7文件，重跑验证并独审。

Review focus：原包字节不变、原141任务不变、历史范围不夸大、隔离测试不触用户数据、PR/客户端状态不混写。无新增产品行为，本轮无需新产品测试。
