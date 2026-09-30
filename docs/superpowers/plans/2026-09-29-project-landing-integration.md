# Project Landing and Branch Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将当前 UI/画布候选与最新主线收敛为可运行、可审阅、状态诚实的项目版本。

**Architecture:** 先以 Git 快照保护现有工作，再把 `origin/main` 合并到任务分支。合并后沿着实际入口链检查 Canvas、首页/对话 composer、设置和 local companion；修复冲突时保留主线服务契约和现行语义 token，竞品能力只落地为本地可验证的画布基础交互。

**Tech Stack:** React 18, TypeScript strict, Vite, Tauri 2, Node 24, Playwright, Node test runner.

**Spec:** `docs/changes/2026-09-29-project-landing/spec.md`

## Global Constraints

- 基线是 fetch 后的 `origin/main`，不重写远端历史。
- 不删除或覆盖当前用户改动；scratch/生成缓存移出候选或保持忽略。
- UI 必须消费现行 `tokens.css`/Design System；真实服务缺失时保持 PARTIAL/BLOCKED。
- Web 与 Desktop 的能力状态不能混用；development固定1421，production preview沿用仓库固定1423，截图必须来自当前源码bundle并记录模式。

## Review Focus

- 主线 Canvas 与候选历史/偏好 hook 的状态顺序、节点持久化和 image compare 兼容性。
- 空项目/无模型/离线时 composer 的禁用原因、焦点与可达设置入口。
- 390、1099、1920 下固定宽度、空白间距、横向溢出、遮挡和触摸命中区。
- settings/local companion 的 import/export 和凭据边界不能被 UI 合并冲突破坏。
- 证据、任务账本、功能卡与最终 head/运行 bundle 是否一致。

### Task 1: Snapshot and converge branches

**Files:** Git history, `docs/changes/2026-09-29-project-landing/*`

- [x] Create the task branch from the dirty workspace and record the baseline checks.
- [x] Commit a clearly marked candidate snapshot, excluding scratch output and credentials.
- [x] Merge `origin/main`; resolve conflicts in the source branch, retaining the newest storage/provider contracts.
- [x] Inspect branch heads and classify already-merged, stale, WIP and blocked branches. Carry the task commits of open PRs into this integration branch, verify the combined tree, and retain PARTIAL for external acceptance gaps.

### Task 2: Restore the actual UI path

**Files:** `src/App.tsx`, `src/components/{StartComposer,ConversationPanel,Canvas,SettingsPanel}.tsx`, `src/styles/*.css`

- [x] Verify route → import → loaded bundle for home, chat, settings and canvas on port 1421.
- [x] Remove regressions introduced by fixed gaps, stale duplicate controls, or inaccessible disabled actions.
- [x] Keep current local model/service gating and meaningful empty/error/offline feedback.
- [x] Carry UI-010 and real project sidebar fixes forward without replacing the newer four-page Figma rules with historical layout rules.
- [x] Run focused Playwright geometry and interaction checks at 390, 1099 and 1920.

### Task 3: Land local competitor-derived canvas capabilities

**Files:** `src/components/canvas/*`, `src/domain/canvasHistory.ts`, `src/domain/canvasPreferences.ts`, `tests/*canvas*`, feature/governance docs

- [x] Verify undo/redo, snap preference and layers panel against real project nodes and mainline Canvas state.
- [x] Fix any stale fixture assumptions or state races without adding fake remote groups or paid actions.
- [x] Record remaining Desktop/reference-site limits as PARTIAL with direct evidence.

### Task 4: Full verification and delivery state

**Files:** `docs/PROGRESS.md`, `docs/governance/{PROJECT_STATE,TASK_LEDGER,task-ledger}.md/json`, affected feature cards, verification/review docs

- [x] Run typecheck, unit, lint/governance/features/markdown, UI check, format, build, and affected browser tests.
- [x] Rebuild actual Vite production bundle and verify preview/desktop-facing entry paths.
- [ ] Bind the final evidence to the final head and update only statuses proven by that evidence.
- [x] Finish with a local merge/PR decision after the merged tree is green; leave unresolved external gates explicit.
- [ ] Merge the integration PR after exact-head independent review and hosted checks; fetch and fast-forward local main, then verify the merged tree and current Web/Desktop artifacts.
