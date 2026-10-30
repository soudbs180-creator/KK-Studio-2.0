# Review：本地安全边界与任务事实

- Task：TASK-LOCAL-GUARDS-20261018；[Spec](spec.md)、[Verification](verification.md)。
- base `e11b87a579a92f89d7d60f9c2f1be15bfb033065`；冻结source `92643d6729caa667a89779cdba7b37eee614f938` / tree `f0509c5220408714c857df666ef86e75f24759a7`。

## 独立源码结论

25ffcf1e的Spec范围PASS并不覆盖Standards独立发现的P1 **ENV-001**：Windows混合大小写环境变量绕过删除、合成旧报告实际被覆盖。该head **CHANGES REQUIRED** 的原收据和真实反例保留，未用首轮完整verify掩盖。

修复92643d67仅增改tests/unit/testEvidence.test.ts环境过滤和混合大小写场景；原policy/credentials产品blob未变。当前独立结论：

| Reviewer | 固定范围/结论 | 原始收据及SHA |
| --- | --- | --- |
| Standards，非实施者 | e11→926总体源码+25ff→926修复delta，PASS；外层小写污染真实runner两项及旧6文件/外层旧报告hash保持，ENV-001关闭 | `.tmp/task-remaining-20261018/review-standards-cd60b0b1-d4be-42b4-9d38-85d7154bce4f.json`；10f4e249b59bf1ee55228d19fb851403503ec25bdb4d86854f621706e6c230e7 |
| Spec，非实施者 | e11→25ff原范围+926 delta PASS；独立实跑mixed-case真实runner、旧3文件和原失败报告hash保持，父任务/能力边界一致 | `.tmp/task-remaining-20261018/review-spec-delta-80725e4d-b305-491b-b3e4-8606ec8b0a9c.json`；f0a115ebc933fec4285cc6b662fff234926123c9ffb28610a6488d6f54ca6c77 |
| 原Spec依据 | policy真实CLI/8规则及凭据15/15，5场景15旧文件/20原始日志与源码LF规范化hash核对PASS | `.tmp/task-remaining-20261018/review-spec-ced9d2ba-8aed-4c13-934e-170b2efaad4f.json`；e3e15f37a44527f9317a16e92935be6624a918dd544b4f4e50f27f00d9ee222d |

Native只读harness先经Standards静态复核，归属由本次私有CDP端口和WebView父链证明后才允许正常关闭；失败路径仍检查数据/记录未知进程为FAIL。静态审查不冒充运行验收，root后续实际两次Native/保全已通过，精确收据见Verification。

## 最终文档与边界

源码验证后只同步规则、5历史路由、任务事实、Unreleased及本轮五件套；宽图局部3/3/六状态production复证推进PARTIAL，连线/Native未验，不结案。没有把父任务、本地mock、额度或Hosted标为完成。最终文档head需提交后固定SHA独立补审和Delivery，收据保存在工程外；其结果不能由本文件预先代替。

全部旧失败/原始数据/并行改动保留，没有文件删除/移动、push/merge或发布。未做真实Provider、OS Ctrl+C、Hosted或签名验收。
