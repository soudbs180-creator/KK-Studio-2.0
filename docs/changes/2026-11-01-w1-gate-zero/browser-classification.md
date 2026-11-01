# Edge 全量失败分类

## 运行身份

- 主线：`main`，`56e8b9f26d3312464e61b0a4f481dbf9f6e414c0`
- 命令：`npx playwright test`，12 workers，配置 retries=1
- 原始回执：`D:/kk-studio/KK-Studio-2.0/test-results/browser/047761f8-fb07-4504-8d28-15c3090ca4f9/browser-results.json`
- 结果：913 项，685 passed，1 skipped，227 unexpected，0 flaky，约 14.8 分钟
- 逐项 manifest：`D:/kk-studio/output/w1-gate-zero-2026-11-01/browser-failure-classification.json`

manifest 为 227 个最终失败测试各保留 file/title/error，并写入唯一类别：

| 类别 | 数量 | 判定规则 |
| --- | ---: | --- |
| `product_defect` | 95 | 非超时、非明确过时视觉/业务断言的真实状态、几何、命中或契约不符；保持为修复队列 |
| `obsolete_assertion` | 35 | 断言硬编码了已被当前 Figma/语义 token/聊天选择合同替代的数值或路径；不删除测试，改写前保留 RED |
| `environment_issue` | 97 | 30 秒/90 秒超时或 fixture/setup 在核心断言前失败；必须串行/隔离复现后才能升级为产品缺陷 |

“过时断言”使用当前 Figma 快照 `D:/kk-studio/output/figma-pages-takeover-2026-11-01/manifest.json`，以及 [UI_RULES](../../UI_RULES.md) 的当前 Figma 优先级（第 3 行）、尺寸和触控角色（第 61–70 行）、不四舍五入计算几何（第 105 行）。实现侧的当前 Figma 几何记录在 `src/styles/sidebar.css:1`（72px rail）和 `src/styles/global.css:48`（292px shell）。当前规则明确：72px 收起 rail、292px 展开壳、紧凑 12px 字/图标角色、44px 触控命中区和 full-radius token 取代旧的 70/291、14px、32px、999px 等历史字面量。聊天选择失败使用 `src/App.tsx:612` 的当前合同：未唯一绑定时要求当前聊天明确选择连接并保留草稿；因此 `provider-scheduling.spec.ts` 中“自动选择”及“连接已禁用”两项属于旧路径断言。

## 六个 Gate Zero 任务的结论

- **TASK-MOD-GATE-BROWSER**：227 项仍是主线完整门禁阻断，不能称全绿。
- **TASK-MOD-GATE-ADJACENT**：串行 1 worker 定向回归仍在 390 light/dark 的“上传视频编辑器不挡背景与缩放”失败；844px 与菜单滚动通过。该项保留为 `product_defect`，不得改成环境豁免。
- **TASK-UI-HUD-CANCEL-CLIP**：历史 probe 已证实旧 HUD 取消按钮落在父容器裁切区外（[provider-browser-contract verification](../2026-10-28-provider-browser-contract/verification.md)）；本轮没有证据关闭它，继续保持开放产品缺陷。
- **TASK-UI-HUD-CONTAINER-WIDTH**：本轮 HUD/折叠坐标失败保留 `product_defect`；当前 CSS 已有容器宽度修复，但仍需逐项重现并补精确回归。
- **TASK-UI-TASK-PANEL-HITBOX**：串行 390/1920 定向回归 2/2 通过；没有将其从完整交付阻断中批量删除，主线全量仍为 PARTIAL。
- **TASK-PROV-HEALTH-BEFORE-SAVE**：串行 429 冷却先于保存阻塞、部分结果保存冲突后仍保留冷却两项通过；本轮无该合同的最终失败，仍需完整门禁与合流前复验。

所有类别均保留原失败证据；没有删测试、加 skip、降低重试或批量 dismiss。
