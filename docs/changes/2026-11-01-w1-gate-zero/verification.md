# W1 Gate Zero 验证记录

## 包 A：agentCanvas 复杂度

- 提交：`8173b96e`，`refactor(agent): 收敛画布操作复杂度`
- `npm run health:check`：通过，`0 blocking / 2 allowed advisory`；阻塞的 `agentCanvas.ts:258` 已消失。
- `node --import ./tests/support/public-entry-loader.mjs --test tests/unit/agentCanvas.test.ts`：18/18 通过。
- `npm run typecheck`：通过。
- W1 快速复验：`npm run health:check` 通过（0 blocking / 2 allowed advisory）、`npm run typecheck` 通过、`npm run lint` 通过、`npm run format:check` 通过。
- `npm test`：2485 tests，2465 pass / 20 skip / 0 fail。

## 包 B：Windows runtime 发布

- 当前改动：`scripts/agent/runtime-package.mjs` 将目录替换重试固定为 `[0,150,300,600,1200,2400,4800]ms`，最终错误带 `attempts` 与 `retryWindowMs`；测试同步收紧为最多 7 次、少于 12 秒。
- `node --import ./tests/support/public-entry-loader.mjs --test tests/unit/agentPackage.test.ts`：11/11 通过。
- `npm run agent:package`：本机 Windows 打包通过（4282 files, win32/x64）。
- 既有 Hosted 证据仍记录一次 `rename EPERM`；本机未复现，不能据此宣称 Hosted 已通过。

## 包 C：Edge 分类

- 主线并行基线：913 项，685 passed / 1 skipped / 227 unexpected / 0 flaky；原始结果在 `D:/kk-studio/KK-Studio-2.0/test-results/browser/047761f8-fb07-4504-8d28-15c3090ca4f9/browser-results.json`。
- 串行复核：913 项，684 passed / 1 skipped / 228 unexpected / 0 flaky；结果在 `D:/kk-studio/KK-Studio-2.0/test-results/browser/58509346-5b24-4ba6-9ce6-8d81cda12063/browser-results.json`。
- 逐项分类已写入 `D:/kk-studio/output/w1-gate-zero-2026-11-01/browser-failure-classification.json`：228 `product_defect`、0 `obsolete_assertion`、0 `environment_issue`。并行中的超时在串行运行仍复现，因此没有把超时批量归为环境问题。
- 当前 W1 工作树定向复验（1 worker、retries=0）：53/53 通过；侧栏首屏等待、ComfyUI 本地模型入口与字号契约已按当前实现固定。
- 分类判定和六个任务的逐项说明见 [browser-classification.md](./browser-classification.md)。

## W1 结论

- 包 A、B 已形成独立提交并通过各自定向门禁。
- 包 C 已完成主线全量运行和逐项分类，但 228 项仍阻断完整交付；没有删除测试、加入 skip、降低重试或批量 dismiss。
- 当前 W1 工作树仍是有界候选，未声称 Hosted、Desktop、真实 provider 或 release 已通过。
