# Plan：当前主线剩余回归验证与修复

- Task ID：TASK-AGENT-001
- 状态：IMPLEMENTED
- 日期：2026-10-10
- Intent / Spec / ADR：本目录 `intent.md`、`spec.md`；无需新增 ADR。
- Owner / branch / worktree：root / `codex/TASK-AGENT-001-remaining-verification` / `D:/kk-studio/.worktrees/remaining-verification`
- Base SHA：`edda6157e47c644cd073f52a57e3c31a86e40397`

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 验证 |
| --- | --- | --- | --- |
| 1 | App 画布生图门禁 | 识别 Codex 来源项，放行已有 Agent 生图入口。 | Agent 定向场景与完整浏览器套件。 |
| 2 | 设置样式 | 让 `select` 与 `input` 共用控件几何和禁用状态。 | Design System 页面 390/1920、UI 标准检查。 |
| 3 | 浏览器/开发态断言 | 对齐当前 Codex 未报告型号、Gemini 图片模型、插件空态和“扩展”入口。 | 定向测试、生产 455 项、development receipt。 |
| 4 | 文档与账本 | 写入本次五件交付包、`PROGRESS.md` 和 `TASK-AGENT-001` 证据，保留未验证任务。 | governance、delivery、完整 `npm run verify`。 |

## 风险与恢复

- 若 Codex 例外扩大到普通 API 请求，定向 `ui-governance` 和未配置 API 场景会失败；回滚仅移除 `codexCanvas` 条件。
- 若依赖使用工作树外 junction，development gate 会被 Vite fs allow 拒绝；本次使用工作树内 `npm ci --ignore-scripts`，不修改产品依赖声明。
- 生成的 `dist`、插件产物、测试结果和 `node_modules` 均为忽略文件，不纳入交付。

## 验证和交付

- 完整 `npm run verify` 在最终源码工作树退出码 0。
- 生产浏览器运行 455 项，全部通过；Vite development 插件 receipt 为 PASS。
- 真实 Provider、Hosted CI、Tauri release、Mobile 和用户最终验收未发生，继续记录为未验证。
