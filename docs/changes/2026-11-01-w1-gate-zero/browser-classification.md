# Edge 全量失败分类

2026-11-02 更正：本轮按四个微批次修复并逐项复验，原始 RED 不覆盖。后续清单 `D:/kk-studio/output/w1-gate-zero-2026-11-02/browser-failure-classification-followup.json` 保留 228 项原错误与编号：109 项取得定向 PASS，119 项未重跑继续开放。明确合同更正 29 项 obsolete、其余 199 项保留产品修复/待复验，0 项认定环境。具体编号、Figma 和合同依据见 [本轮 review](review.md#2026-11-02-contract-corrections)。下文“全量 228 产品缺陷”是初始保守分类，不能作为单凭串行超时的最终归因；当前仍未声称完整浏览器全绿。

## 运行身份

- 主线：`main`，`56e8b9f26d3312464e61b0a4f481dbf9f6e414c0`
- 并行基线：`npx playwright test`，12 workers，配置 retries=1；`D:/kk-studio/KK-Studio-2.0/test-results/browser/047761f8-fb07-4504-8d28-15c3090ca4f9/browser-results.json`，913 项，685 passed，1 skipped，227 unexpected，0 flaky。
- 分类复核：同一主线使用 `npx playwright test --workers=1 --retries=0` 串行复现；`D:/kk-studio/KK-Studio-2.0/test-results/browser/58509346-5b24-4ba6-9ce6-8d81cda12063/browser-results.json`，913 项，684 passed，1 skipped，228 unexpected，0 flaky，约 72.5 分钟。
- 逐项 manifest：`D:/kk-studio/output/w1-gate-zero-2026-11-01/browser-failure-classification.json`，以串行 228 项为最终分类输入，并保留并行回执路径。

manifest 为 227 个最终失败测试各保留 file/title/error，并写入唯一类别：

| 类别                 | 数量 | 判定规则                                                                                                                                  |
| -------------------- | ---: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `product_defect`     |  228 | 串行 Edge 仍复现的状态、几何、命中、可见性或契约失败；保持为修复队列                                                                      |
| `obsolete_assertion` |    0 | 本次串行结果没有一项能在不引用当前 Figma 与项目合同的情况下安全归为过时断言；已修改的局部断言仅在定向回归中验证，不从全量失败清单批量豁免 |
| `environment_issue`  |    0 | 并行中的超时在串行运行仍失败，证据不足以归因环境；不再使用“超时即环境”规则                                                                |

“过时断言”使用当前 Figma 快照 `D:/kk-studio/output/figma-pages-takeover-2026-11-01/manifest.json`，以及 [UI_RULES](../../UI_RULES.md) 的当前 Figma 优先级（第 3 行）、尺寸和触控角色（第 61–70 行）、不四舍五入计算几何（第 105 行）。实现侧的当前 Figma 几何记录在 `src/styles/sidebar.css:1`（72px rail）和 `src/styles/global.css:48`（292px shell）。当前规则明确：72px 收起 rail、292px 展开壳、紧凑 12px 字/图标角色、44px 触控命中区和 full-radius token 取代旧的 70/291、14px、32px、999px 等历史字面量。聊天选择失败使用 `src/App.tsx:612` 的当前合同：未唯一绑定时要求当前聊天明确选择连接并保留草稿；因此 `provider-scheduling.spec.ts` 中“自动选择”及“连接已禁用”两项属于旧路径断言。

## 六个 Gate Zero 任务的结论

- **TASK-MOD-GATE-BROWSER**：227 项仍是主线完整门禁阻断，不能称全绿。
- **TASK-MOD-GATE-ADJACENT**：串行 1 worker 定向回归仍在 390 light/dark 的“上传视频编辑器不挡背景与缩放”失败；844px 与菜单滚动通过。该项保留为 `product_defect`，不得改成环境豁免。
- **TASK-UI-HUD-CANCEL-CLIP**：历史 probe 已证实旧 HUD 取消按钮落在父容器裁切区外（[provider-browser-contract verification](../2026-10-28-provider-browser-contract/verification.md)）；本轮没有证据关闭它，继续保持开放产品缺陷。
- **TASK-UI-HUD-CONTAINER-WIDTH**：本轮 HUD/折叠坐标失败保留 `product_defect`；当前 CSS 已有容器宽度修复，但仍需逐项重现并补精确回归。
- **TASK-UI-TASK-PANEL-HITBOX**：串行 390/1920 定向回归 2/2 通过；没有将其从完整交付阻断中批量删除，主线全量仍为 PARTIAL。
- **TASK-PROV-HEALTH-BEFORE-SAVE**：串行 429 冷却先于保存阻塞、部分结果保存冲突后仍保留冷却两项通过；本轮无该合同的最终失败，仍需完整门禁与合流前复验。

所有失败均保留串行与并行证据路径；没有删测试、加 skip、降低重试或批量 dismiss。后续每个失败只有在取得明确的当前 Figma/合同证据或独立环境复现证据后，才可迁移到其他类别。
