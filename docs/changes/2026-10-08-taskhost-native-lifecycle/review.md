# Review：T5 原生生命周期

- Task ID：T5；2026-10-08。
- [Intent](intent.md) · [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md)
- Base：`5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3`。
- Self-review：PASS。本机实际十组原生验收、当前 product/harness 源文件 hash 与收据相同，完整 verify、Rust/native 构建和静态门禁通过；取消保留 unknown/已有资产，可选元数据不放宽资产 schema，测试只触及 owned 进程/合成凭据并完整清理。
- Independent review 第一轮：CHANGES REQUIRED，独立上下文 `/root/continuation_review`，2026-10-08；固定范围 `5b0eb6a341335c6bcdefcadf59be3ae4c2e4cdb3 → b58854c0f004206900c4e6dc929e5b1306da8463`。reviewer 以固定 git show/diff、组件 SSR 和凭据内存复现独立审查；抽查收据，不冒充自行重跑全部 native/full verify。
- 用户已授权完成待办与合并完成分支；GitHub 人类 approval、独立 AI review、Hosted CI 和用户授权分别记录，不互相代填。

重点抽查真实任务提交/取消/恢复、原件保留、幂等身份、fixture/native 边界和秘密隔离。无真实付费 Provider、生产部署、Mobile 或安装器发布结论。

| Finding       | 严重度 / 门禁    | 处理与当前复验                                                                                                                          | Owner / 状态                     |
| ------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| T5-REVIEW-001 | P2，安全验收阻断 | 两处凭据预存在检查改为布尔断言；真实 native 合成凭据冲突原值保留、异常/JSON 无秘密；十一组收据 PASS                                     | root；已修复，待精确提交补审关闭 |
| T5-REVIEW-002 | P2，AC-4 阻断    | BatchMatrix 与实际命令复用 retryableOutputIndices，unknown/failed 混合不提供普通重试；native 与 Web 实际 RED 保留，fresh native UI PASS | root；已修复，待精确提交补审关闭 |
| 文档格式建议  | P3，非阻断       | 本轮新增 Markdown 定向 Prettier，不重排历史证据                                                                                         | root；实施，定向检查随后记录     |

承接主线为 main@5dd6e6dddaf00cf2d5c14ae02ef5974c72238232，合并候选 fa9da16202a41cff9a1dbc993cf9410b65d21d88。返修 source hashes 与真实 native 收据绑定；必须提交后补审最新 HEAD，旧 b58854c0 的结论与 SHA 保留。当前托管 CI、GitHub 人类审批和合并结果尚不预填成功。

## 正式补审：PASS

独立上下文 `/root/continuation_review`，2026-10-08 07:24:24 UTC；精确范围 `5dd6e6dddaf00cf2d5c14ae02ef5974c72238232 → 0251cf797a60ead936849c185999dc3fe6a005c0`，49 文件；[完整独立收据](evidence/review-0251cf7.md)。T5-REVIEW-001/002 均 CLOSED，无新 P1/P2；P3 文档格式检查通过。原 b58854c0 的 CHANGES REQUIRED 保留，不替换旧 SHA。

reviewer 独立运行 53/53 定向单测、原/新凭据 helper 合成复现、实际组件/selector SSR 的 unknown/混合/安全 partial/运行/成功场景，以及版本、账本、功能、Markdown、格式和交付检查；9/9 source hashes 按 checkout 换行核对精确 Git 内容，实际 EXE/bundle/PNG 与收据一致。完整 verify、Rust 和十一组 native 为执行者证据抽查，不称为 reviewer 全量重跑。

源码与本机验收审查 PASS；当前提交 Hosted verify/delivery 与最终合并仍待真实门禁。这份审查记录进入新文档提交后需要对文档差异补审，不让源代码审查冒充最终 HEAD。

## 提升权限包装器 d521 补审：CHANGES REQUIRED

/root/continuation_review 固定 base1af0357b088df79dc51e9b309ef310a500722cf8 → headd52142d62fd2b19fcbdfbbde750338016bfd53c0：T5-ENV-REVIEW-003，P2/merge blocker，Registry New-Item -Force 会删除共享key及子键，原mock未模拟该行为。实际内存反例 wrapperFailed=false/foreignPolicyPreserved=false/writes2/removes2/children1。既有001/002与signer/runner001/002保持CLOSED；独立82纯单测、19策略/15Runtime mocks、types/lint/version/governance/features/markdown/UI/delivery均PASS，不替代Hosted。root已用无Force逐级创建、写入前冲突复核和23边界回归返修，新head待独立关闭。
