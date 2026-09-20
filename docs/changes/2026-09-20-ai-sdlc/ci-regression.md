# CI 回归记录：sidebar motion 跨进程采样

- 任务：TASK-GOV-002
- 日期：2026-09-20
- 受影响提交：8aca3abdd6386b6d6cee7fd9836e27e5aec38eab
- 失败运行：GitHub Actions run 35492697622
- 原始日志：worktree 中的 .tmp/main-ci-before.log
- 变更范围：仅 tests/browser/frame-accuracy.spec.ts 测试采样；未修改产品组件、CSS、动画时长或断言范围。

## 观察

该次 CI 共 169 项浏览器测试：167 passed、1 failed、1 flaky。frame-accuracy.spec.ts:85 的 sidebar motion 首次运行和 retry 都失败。creation-flow.spec.ts:60 首次 30 秒超时，retry 通过；本记录不修改该用例，也不把一次 flaky 重试写成稳定通过。

失败发生在 opening 采样的 opening.some(frame.width > 71 && frame.width < 290)。原测试在跨进程 click 返回后，直接用约 360ms 的 requestAnimationFrame 窗口采样。sidebar 的实际 width transition 只有有限时长；当 click、浏览器调度和测试进程恢复消耗掉该窗口时，所有采样都可能已经落在最终宽度，导致中间几何样本为空。原始 CI 堆栈明确显示该断言 Received: false，retry 同一位置重复失败。

## 修复策略

测试现在在每次 sidebar toggle 之前安装 MutationObserver，监听真实 class 变化；变化后获取真实 CSS transition，暂停 width/padding transitions 并将时间定位到 0。随后在固定时间位置 0/25/50/75/100% 采样，不依赖跨进程 click 返回与下一帧之间的墙钟时机。采样结束调用 transition 的 finish()，再继续后续状态。

保留的断言：

- collapse 中间几何存在；
- 每个采样点 task 为 frame-left + 30px；
- toolbar x=719 stationary；
- opening 中间 width 存在；
- 所有 project row 仍为 263/231/263 × 29；
- brand 在窄 width 阶段保持隐藏；
- reduced-motion 下无 animation/transition；
- 后续 workspace anchor 和交互流程保持原断言。

没有延长等待、删除断言、关闭动画、隐藏失败或改产品 CSS。creation-flow 的首次 timeout 只记录为 CI 的一次 flaky 观察，未盲目修改。

## 本轮验证边界

已执行：

- scoped Prettier：PASS
- node node_modules/typescript/bin/tsc --noEmit：PASS
- scoped ESLint：PASS
- git diff --check（测试文件）：PASS

上述是实现子任务的检查，当时未启动 browser、Vite preview、Tauri 或固定端口。随后整合代理已在本任务 worktree 运行 production preview 浏览器回归，169/169 通过；完整最终候选与独立 review 见同目录 verification.md / review.md。原始失败 CI 记录仍只对 8aca3ab 有效，不改写为本次成功结果。
