# Spec：正式执行接管检查点

- Task ID：TASK-GOV-006；状态：IMPLEMENTED；[Intent](intent.md)。
- 唯一任务权威仍为 `docs/governance/task-ledger.json`；本轮仅更新其 GOV-006，原141任务不改状态，不复制第二账本。
- 原始交接文件/收据/zip和失败证据只读保留；12个目标游标耗尽只表示这些目标返回末尾，6接口错误、原主控 UNKNOWN 和全局枚举缺口不能省略。
- 新恢复需求只作为历史线索关联原来源，不据旧成功/失败批量裁决当前实现。
- GDI 使用已提交 af8a3258 的保护配置；测试临时 profile、本地合成标题、自有 CDP PID；不启动未保护批量测试，不运行危险默认对照，不关闭日常客户端。
- 产品代码、UI、schema、存储、凭据和依赖没有变更，无需新增 ADR/版本。Desktop/Web2.1.33、Mobile2.1.1保持；三端产品验收不由治理结论替代。
- 托管 required verify/delivery、严格基线及独立技术审查保持；本轮 PR 准备不表示已经合入 main。
- 恢复：用 Git 历史与原交接收据复核；不撤销或覆盖原始用户数据。
