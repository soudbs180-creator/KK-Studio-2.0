# Plan：TASK-WINDOWS-ENTRY-DIAG-002

1. 保存fa36 push原FAIL与独立只读诊断、一次未复现PASS和两个null分类原件。
2. 最小补tests/unit/desktopRelease.test.ts三段安全诊断及隔离checker实际runtime receipt；产品BAT不改。
3. 独立受控ENOENT/ETIMEDOUT证明真实失败输出分类，定向正常unit/完整verify、独立精确SHA review。
4. 当前push与PR须全部通过，真实旧失败/原因UNKNOWN不覆盖；仍失败按新实证修复。普通merge/main另回读。
