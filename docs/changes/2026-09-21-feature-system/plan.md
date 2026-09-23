# Plan：功能体系与图片参数后端化样板

- Task ID：FEATURE-SYSTEM / BACKEND-IMAGE-PARAMS
- 状态：IMPLEMENTED
- 日期：2026-09-21
- Owner / branch / worktree：root / `chore/TASK-CONSOLIDATE-200` / `D:/kk-studio/KK-Studio-2.0`
- 说明：用户要求不提交、不推送；改动全部留在工作区，未建独立分支/worktree。

## 开工证据

- 已读：AI_RULES、AGENTS、SPEC_BASELINE、check-governance、ledger.mjs、GENERATION-PLATFORM、模板、图片生成全链路（imageGeneration/imageTaskCommand/model/nativeTaskHost/task_host.rs）。
- 基线：删孤儿组件后 typecheck 通过、201 单测通过、build 通过。

## 实施顺序

| 步骤 | 文件/模块 | 目的 | 验证 |
| ---- | --------- | ---- | ---- |
| 1 | docs/features（模板/registry/卡片/看板/路线图） | 功能体系 | features:check |
| 2 | scripts/features/registry.mjs、scripts/check-features.mjs、package.json | 门禁并入 lint | npm run features:check |
| 3 | task-ledger.json | 新增 7 任务 | governance:write 后 governance:check |
| 4 | AGENTS/AI_RULES/SPEC_BASELINE | AI 入口打通 | 内容核对 |
| 5 | src/domain/imageParameters.ts + 单测 | 映射唯一事实源 | node:test |
| 6 | model.ts/imageTaskCommand.ts/App.tsx | 接线 imageSize | typecheck/单测 |
| 7 | imageGeneration.ts/nativeTaskHost.ts/task_host.rs | 双链路透传 | 单测 + cargo check |
| 8 | CreationParameters.tsx | 去除图片草稿误导文案 | 构建 |
| 9 | verification.md | 记录证据 | 全量验证 |

## 风险与恢复

- 改动均为新增文件或可选字段透传，默认 undefined 时行为与现状一致，可安全回退。
- Rust 仅新增 `Option<String>` 字段与条件透传，不改变鉴权/状态机。
- 不触碰用户数据 `%APPDATA%/kk-studio`。

## 验证和交付

- npm run typecheck / test / build / features:check / governance:write；cargo check。
- 浏览器 UI 文案变化若需截图证据，纳入后续 Wave 1 任务统一补；本轮以逻辑与单测证明透传。
- 不提交；交付为工作区改动 + 本变更目录。
