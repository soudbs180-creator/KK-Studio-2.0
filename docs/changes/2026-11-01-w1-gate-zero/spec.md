# W1 Gate Zero 规格

## 包 A：agentCanvas 复杂度

- `src/features/agent/agentCanvas.ts` 的新代码 cyclomatic complexity 必须 `<=20`。
- `applyAgentOpsToItems` 既有 add/update/delete/connect 行为、拒绝原因和纯函数契约保持不变。

## 包 B：Windows runtime 发布

- `EPERM`/`EBUSY` 仍走同一份原子目录替换和回滚逻辑。
- 重试窗口固定且有界，不得无限等待；最终错误保留尝试次数和窗口信息。
- 永久错误仍立即失败；候选 staging 和旧 runtime 的回滚保护保持有效。

## 包 C：Edge 失败分类

- 以主线 `main` 的一次完整 Edge 运行作为证据源。
- 每个最终失败测试记录：测试名、类别（产品缺陷 / 有证据的过时断言 / 环境问题）、证据路径、后续动作。
- “过时断言”必须引用当前 Figma 与项目合同；不因失败数量或历史状态批量归类。
