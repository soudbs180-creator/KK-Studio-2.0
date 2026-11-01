# W1 Gate Zero 验证记录

## 包 A：agentCanvas 复杂度

- 提交：`8173b96e`，`refactor(agent): 收敛画布操作复杂度`
- `npm run health:check`：通过，`0 blocking / 2 allowed advisory`；阻塞的 `agentCanvas.ts:258` 已消失。
- `node --import ./tests/support/public-entry-loader.mjs --test tests/unit/agentCanvas.test.ts`：18/18 通过。
- `npm run typecheck`：通过。

## 包 B：Windows runtime 发布

- 当前改动：`scripts/agent/runtime-package.mjs` 将目录替换重试固定为 `[0,150,300,600,1200,2400,4800]ms`，最终错误带 `attempts` 与 `retryWindowMs`；测试同步收紧为最多 7 次、少于 12 秒。
- `node --import ./tests/support/public-entry-loader.mjs --test tests/unit/agentPackage.test.ts`：11/11 通过。
- `npm run agent:package`：本机 Windows 打包通过（4282 files, win32/x64）。
- 既有 Hosted 证据仍记录一次 `rename EPERM`；本机未复现，不能据此宣称 Hosted 已通过。

## 包 C：Edge 分类

完整运行仍在进行；最终退出码、失败清单和逐项分类将在运行结束后追加。当前不把中途输出计作最终数量。
