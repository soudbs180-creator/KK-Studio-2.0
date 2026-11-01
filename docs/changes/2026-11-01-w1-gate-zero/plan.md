# W1 Gate Zero 计划

1. 在 W1 工作树复核 callers、既有测试和 runtime 发布契约。
2. 先提交包 A，运行 code-health、agentCanvas 定向单测和类型检查。
3. 再提交包 B，运行 runtime package 定向测试并保留失败时的 staging/rollback 断言。
4. 在干净主线构建产物上完成 Edge 全量运行；从最终报告逐项建立分类清单。
5. 仅对证据充分的产品缺陷开后续最小修复包；分类证据和未解决边界写入 verification/review。
