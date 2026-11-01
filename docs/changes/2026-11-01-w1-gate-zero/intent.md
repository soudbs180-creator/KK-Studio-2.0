# W1 Gate Zero 意图

## 目标

在 W0 合流后的 `main` 基线上，按三个有界包推进 Gate Zero：

1. 清除 `agentCanvas.ts` 的唯一阻塞 code-health 复杂度告警。
2. 让 Windows Agent runtime 发布在文件句柄短暂占用时使用有界、可诊断的原子替换重试。
3. 对主线 Edge 全量浏览器失败逐项分类，保留 RED，只有有产品或合同证据时才修复或标记过时。

## 边界

- 不创建平行 W0 工作树；W1 仅使用 `TASK-W1-GATE-ZERO-20261101`。
- 不删除、跳过或批量改写浏览器断言。
- 不把本地静态或浏览器结果升级为 Hosted、Desktop、真实 provider 或发布验收。
