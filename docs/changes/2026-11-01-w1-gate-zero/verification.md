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

- 主线全量：913 项，685 passed / 1 skipped / 227 unexpected / 0 flaky；原始结果在 `test-results/browser/047761f8-fb07-4504-8d28-15c3090ca4f9/browser-results.json`。
- 逐项分类已写入 `D:/kk-studio/output/w1-gate-zero-2026-11-01/browser-failure-classification.json`：95 `product_defect`、35 `obsolete_assertion`、97 `environment_issue`。
- 串行定向（1 worker、retries=0）：44 项中 36 通过、8 失败。390px 短屏视频编辑器 light/dark 两项为真实可复现产品缺陷；任务列表关闭热区 390/1920 通过；429 保存时序两项通过。其余失败是当前设置/连接 fixture 路径的未解决合同或环境阻断，原始上下文保留。
- 分类判定和六个任务的逐项说明见 [browser-classification.md](./browser-classification.md)。

## W1 结论

- 包 A、B 已形成独立提交并通过各自定向门禁。
- 包 C 已完成主线全量运行和逐项分类，但 227 项仍阻断完整交付；未进行批量测试改写或合流。
- 当前 W1 工作树仍是有界候选，未声称 Hosted、Desktop、真实 provider 或 release 已通过。
