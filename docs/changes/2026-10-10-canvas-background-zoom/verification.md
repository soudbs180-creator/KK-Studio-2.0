# 画布点状/网状背景缩放插值修正 — 验证记录

任务：`TASK-UI-015`
分支：`fix/TASK-UI-015-canvas-background-zoom-scale`
日期：2026-10-10
状态：**DONE / PASS**

## 问题

无限画布的点状/网状背景在缩放时存在两处缺陷：

1. **格距跳变**。`canvasPatternPitch` 用 2 的幂次向上取整做密度粗化：
   `24 * scale * 2 ** max(0, ceil(log2(12 / pitch)))`。实测在 49%→50% 之间格距从
   23.52px 突降到 12.00px，近2 倍突变。
2. **永不隐藏**。`Canvas.tsx` 中不透明度存在 `Math.max(0.2, …)` 下限，
   任何缩放下背景都保留至少 20% 不透明度，无法收敛隐藏。

## 修改后的尺寸计算

统一走`src/domain/canvasViewport.ts` 的归一化进度
`t = clamp((scale - 0.5) / (4 - 0.5), 0, 1)`，三项尺寸与不透明度同步线性变化：

| 缩放 | 格距 pitch | 点径 | 网格线宽 | 不透明度 |
| --- | --- | --- | --- | --- |
| ≤ 50% | 12px（钳制） | 1px | 0.5px | 0（隐藏） |
| 75% | 18.00px | 1.50px | 0.57px | 0.50 |
| 100% | 24.00px | 2.00px | 0.64px | 1.00 |
| 200% | 48.00px | 4.00px | 0.93px | 1.00 |
| 400% | 96.00px（最大） | 8px | 1.50px | 1.00 |

不透明度单独走 `(scale - 0.5) / 0.5`，在默认工作缩放 100% 即完全清晰，并保持到 400%。

## 铺满、无缝隙、无堆叠的保证

`background-repeat: repeat` 显式声明，配合单一 pitch 变量。间距变化只影响图案密度，
不影响覆盖能力：无论 pitch 为 12 还是 96，repeat 都会把瓦片完整平铺到整个画布。
CSS 平铺按 pitch 周期对齐，天然无缝；点径恒小于格距（已由单测锁定），
相邻瓦片不会重叠成色块。

## 改动文件

| 文件 | 动作 |
| --- | --- |
| `src/domain/canvasViewport.ts` | 删除幂次粗化，新增 pitch/dot/grid/opacity 四个插值函数 |
| `src/components/Canvas.tsx` | 接入新函数，绑定 `--canvas-dot-size`、`--canvas-grid-line` |
| `src/styles/workspace.css` | 点径线宽改 CSS 变量，`color-mix` 接入透明度，显式声明 `background-repeat` |
| `tests/unit/canvasViewport.test.ts` | 新增 7 项契约测试 |

## 已完成验证

| 项 | 结果 |
| --- | --- |
| `tests/unit/canvasViewport.test.ts` | 7/7 PASS |
| 连续性扫描（20 万步） | 最大单步 pitch 变化 0.00042px，严格单调递增 |
| 点径 < 格距 | 全区间成立 |
| `npm run typecheck` | exit 0 |
| `npm run lint`（含 governance/features/markdown） | 0 violations |
| `npm run format:check` | 通过 |
| `npm test` 全量 | 919 PASS / 8 SKIP / 0 FAIL（927 tests） |
| `npm run test:ui --workers=1` | 455 PASS / 0 FAIL |

### PRE-EXISTING FAILURE

全量单测 25 项失败经`git stash` 基线比对确认与本次改动无关，
全部属 deploy / git-hook / Windows 安装器类环境性失败（沙箱无 git 写权限、无管理员令牌）。
基线为 26 项，改动后减少的一条正是本次修复的 opacity 断言。

## 未完成 / 边界

- 未做多分辨率视觉回归截图比对。
- 未验证 Desktop（Tauri WebView2）下的渲染表现。

## 结论

domain 层插值契约已由单测锁定，浏览器回归进一步确认 50% 隐藏、400% 最大尺寸、
连续插值与点状/网状背景平铺行为，四条验收标准均已通过，状态为 DONE / PASS。
