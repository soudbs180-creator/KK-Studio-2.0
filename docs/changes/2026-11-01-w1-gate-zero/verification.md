# W1 Gate Zero 验证记录

## 2026-11-02 收尾增量（当前）

- 代码提交：`fdd0eaa9` 吸收 `1e63b722`；`65bf62d4` 几何；`42b0daa2` 模型与草稿；`81f16b12` 设置导航；`e765fd4c` 主题/短屏/HUD；`45e75b23` 独审修复。`0f317916` 已吸收本地 main 的 `15ad1617`，源树解决整合后再交付。
- 指定十个已合并分支：九个复核 `main..branch == 0` 后删除，W0 分支此前已删除。安全提交以第二父提交保留于 `fdd0eaa9`，随后 `fix/TASK-SEC-ZOD-20261028` 使用普通 `git branch -d` 删除；未改 origin/main。
- 根与随包 Agent 实际安装/lock 均为 Zod 4.6.7，ADR 改为 034，根索引、ADR 索引和安全 spec 链接同步。`index:check` 35 ADR/0 violations；集合边界 4/4 通过；Agent build 通过，Agent tests 206 项中 204 pass/2 skip/0 fail。
- 本轮新定向覆盖 138 项，连同 `477e274f` 前一批 53 项，证据集合共 191 个唯一测试。每次所选 green run 为 2.85–43.28 秒，`workers=1/retries=0`；没有重跑完整 913 项。证据集合包含各微批次的不同 sourceHead，不能冒称 191 项均在最后 SHA 一次运行。
- 微批次：unified-image-command 13/13（40.59s）；四份模型 spec 29/29（37.62s）；模型能力/草稿 16/16（29.33s）；CLI/本地预设/Google 草稿/原生取消 20/20（21.44s）；Desktop/Google 8/8（14.04s）；三份主题设置 spec 27/27（23.74s）；短屏视频/背景/缩放 8/8；卡片操作/归档状态 16/16（29.12s）。独审修复后模型选择/归档取消三份 spec 17/17（32.70s）。
- 新回归：真实 1099px HUD 取消、等待迟到路由处理完成后确认无结果且不重发；旧聚合置顶 ID 迁移；拒绝 `toString/constructor/__proto__` 未知操作。相关纯逻辑 22/22 通过。
- 最终代码 `45e75b23` 的门禁日志在 `D:/kk-studio/output/logs/w1-gate-zero-2026-11-02/`：ui:check 0 errors（25 条既有 token advisory）；typecheck 通过；lint 通过、health 0 blocking/2 allowed；npm test 2491 项、2471 pass/20 skip/0 fail；format:check 通过；Agent build/test 通过。收尾文档更新后重新复核 lint、格式和索引。
- 原始报告与截图已复制到 `D:/kk-studio/output/w1-gate-zero-2026-11-02/browser/`，迁移路径报告使用 `browser-results-relocated.json`；汇总 `targeted-evidence.json`。原始 run/sourceHead/时间全部保留，W1 树回收不删除证据。
- 228 项历史 RED 的逐项后续表为 `D:/kk-studio/output/w1-gate-zero-2026-11-02/browser-failure-classification-followup.json`：109 项取得定向 PASS，119 项没有本轮全量复验，继续开放；199 product_defect / 29 有明确合同依据的 obsolete_assertion / 0 environment_issue。旧文件和旧结论保留为历史，不能把“串行超时”单独当成产品归因证据。分类更正逐项编号与依据见 review。
- 本地 main 合并和回收回执在最终独审通过后补记；完整浏览器、Tauri/默认安装器、Hosted、真实 provider/GPU 和正式发布不在本轮验收范围。

以下为前阶段历史证据，日期和结论不覆盖上述增量。

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
