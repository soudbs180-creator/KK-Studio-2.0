# Design System Alignment Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for implementation, followed by an independent read-only reviewer. This is authorized technical work; no further stage approval is required by AGENTS.md / AI_RULES.md.

**Goal:** 校正用户 Design System，并让规范、公共实现和可验证的颜色契约一致。

**Architecture:** 延续现有 CSS token/React 原生控件结构；明确基本色、强调色、文字与填充语义。通过设置的现有事件和存储添加8色偏好，不新增全局状态系统。

**Tech Stack:** React18 / strict TypeScript / Vite / Node24 / Playwright。

**Spec:** [spec.md](spec.md)

## Global Constraints

- 工作分支 `fix/TASK-DS-001-alignment`；基于当前 `cf344ddcdf039c6e62aeb9c65106e2a2339c0bb4` 的未验收 dirty 候选快照。原 checkout/index 和并发工作保留。
- 不提交、不推送、不更改用户数据身份；只回传本任务增量。
- Web 使用固定1423 production preview，禁止复用其他任务服务或自动改端口。
- 遵循 spec 中明确的字号、间距、圆角和语义/对比度阈值。

## Review Focus

- 8色在浅色主题、hover 和 soft 背景上的文字：单测矩阵和浏览器 computed style。
- 旧 v1 设置加载以及 reload/system theme：设置单测与浏览器重载。
- 全局 hover 或组件局部 CSS 覆盖语义颜色：真实按钮 default/hover/active 检查。
- 开关、选择、模态焦点和窄屏长标签：既有交互测试与设置页实际点击。
- 当前并发 dirty 文件：回传前与初始快照逐文件比较，冲突时三方合并并补测。

## Task 1 · 审计与基础契约

- [x] 渲染并检查 PDF 全7页，记录文件SHA和页码。
- [x] 建立登记 worktree，复制不含凭据/运行数据/生成证据的候选快照，确认初始 typecheck/lint。
- [x] 新建 `tests/unit/designSystem.test.ts`，读取真实 CSS 并断言双主题文字、8色 hover/soft、状态填充和焦点对比度；先运行失败结果。
- [x] 校正 `src/styles/global.css` 与 `src/styles/ui-tokens.css`，保持旧 token alias 和页面专项几何；再执行 `node --test tests/unit/designSystem.test.ts`。
- [x] 写 `docs/DESIGN-SYSTEM.md` 与 `audit.md`，记录保留值、修正值及设计/工程补充边界。

## Task 2 · 接入公共控件与8色偏好

- [x] 在 `settings.test.ts` 先测试 v1 缺 accent 兼容、8预设序列化与非法预设。
- [x] 修改 `domain/settings.ts`、`GeneralSettings.tsx`、`App.tsx` 现有设置 apply；原生 select 的值仅允许8个标识。
- [x] 对齐 settings 字段/按钮、primary-button；修正把 selected 文本色当填充却沿用浅色字的现有调用点。状态徽标用独立前景。保留行为。
- [x] 更新既有设置功能卡/registry、任务账本、PROGRESS、治理入口与 UI Markdown；不把新能力的Web验证外推为Desktop。

## Task 3 · 验证与可审阅交付

- [x] 执行 `npm run verify`；完整记录通过/失败和与初始候选的关系，不修改无关失败以掩饰结果。
- [x] 新增 `tests/browser/design-system.spec.ts`：8色×双主题实际 computed style、原生选择键盘、重载、Escape回焦、390/768/1920宽度以及实际页面按钮状态。
- [x] 构建全新dist并用固定1423运行；截图与运行链路写 verification，不覆写历史证据。
- [x] 输出校正版PDF参考文件并逐页渲染核验；保留原PDF，明确在线Ardot同步状态。
- [x] 独立 reviewer 审本任务实际增量；修复并复验。仅回传本任务文件/补丁到用户当前checkout，核对并发变化，最终记录完成与剩余验收边界。

最终范围：上述本轮实施/验证动作已执行；整体仍为PARTIAL。在线Ardot、Tauri与历史逐页验收不因计划步骤勾选而被关闭，见verification/remaining。
