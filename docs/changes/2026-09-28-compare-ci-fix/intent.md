# Intent：对比操作合并后命中区回归

- Task ID：TASK-COMPARE-002
- 状态：IMPLEMENTED
- 日期与提出者：2026-09-28，用户要求合并后核验交互；本轮主线 CI 暴露问题
- 用户授权范围与依据：检查、修复并验收已合并图片对比交互
- 关联账本：`docs/governance/task-ledger.json`

## 用户原意

合并图片对比分支后，实际检查 Web/Desktop 交互和主线门禁，不能只看 PR 合并状态。

## AI 工程转译

主线 `7bc7c67` 的 Windows Hosted `verify` 中，390px 对比控件实际高度为 `43.99999237060547px`，未满足至少 44px 的浏览器断言。保持原交互、布局和断言，给触控控件 1px 的布局余量，并重跑受影响检查。

## 目标与非目标

- 预期结果：窄屏触控控件在实际浏览器测量中稳定达到至少 44px，主线 CI 恢复通过。
- 包含范围：对比控件窄屏 CSS、同态浏览器与桌面回归、主线 CI 复核。
- 明确不包含：新的对比功能、真实 Provider、原生 Mobile 或 VPS 发布。
- 已有实现：`src/styles/canvas-compare.css`、`tests/browser/image-compare.spec.ts`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 平台 |
| --- | --- | --- | --- |
| AC-1 | 390px 对比入口、选择条和弹窗按钮可触摸 | 原断言不放宽，实际 `boundingBox` ≥44px | Web |
| AC-2 | 图片对比其余交互不回归 | 完整 `verify`、隔离 Desktop release GUI | Web/Desktop |
| AC-3 | 合并后主线可交付 | 新 PR 当前 SHA 与主线 push CI | GitHub |

## 假设、风险和决策

- FACT：Hosted run `36369533105` 的 301/302 浏览器用例通过，唯一失败为 44px 阈值差 `0.000007629px`；PR #21 候选此前本地及托管通过。
- 决策：保持有效的 44px 测试，CSS 最小高度从 44px 改为 45px，给跨平台子像素取整留余量。
- UNKNOWN：物理触屏与用户最终视觉确认仍无证据，由 TASK-COMPARE-001 保持 REVIEW。
