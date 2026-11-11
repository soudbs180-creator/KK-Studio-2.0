# KK Studio 接管与基线收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在独立任务 worktree 中完成 KK Studio 当前主线的接管快照、live ComfyUI 测试门控、临时 harness 清理、账本校正和可复现基线验证。

**Architecture:** 以现有治理脚本、ComfyUI `ComfyRuntimePort` 和 Playwright evidence 机制为边界，不新增状态源或依赖。live 浏览器测试继续挂载真实 `Canvas`，但通过显式环境变量连接已经运行的外部 ComfyUI；进程生命周期与安装验收留给 Desktop 阶段。

**Tech Stack:** React 18, TypeScript, Playwright, Node test runner, PowerShell/Git, 现有治理脚本。

**Spec:** `docs/superpowers/specs/2026-11-01-handoff-takeover-design.md`

## Global Constraints

- 正式仓库是 `D:/kk-studio/KK-Studio-2.0`；实现只在 `D:/kk-studio/.worktrees/TASK-HANDOFF-TAKEOVER-20261101`。
- 本地 `main@b93b4e7f` 是本次基线；`origin/main@9b1038a` 只作为分叉事实记录，不在本阶段强行重写历史。
- live test 默认跳过；只有 `KK_RUN_LIVE_COMFY=1` 才允许执行，并且必须提供可访问的 `KK_COMFY_CHECKPOINT`。
- 不启动、停止、修改或清理用户的 ComfyUI 安装、模型、工作流或输出目录。
- 不新增依赖；不降低断言；REAL/DONE 只在当前证据满足既有治理定义时使用。
- 生成证据写入 `D:/kk-studio/output/<topic>-<date>/`；临时中间产物写入 `.tmp/`。

## Review Focus

- 未设置 live 环境变量时，测试必须稳定跳过且不触发网络、构建或外部进程。
- 设置 live 环境但 endpoint 不可用或 checkpoint 不在 `CheckpointLoaderSimple` 列表时，测试必须失败并说明缺少的外部条件。
- live 运行必须使用真实 `/prompt`、轮询 `/history`、读取 `/view`，并把结果节点和 result edge 写入隔离浏览器状态。
- Figma worktree 的 dirty/untracked 文件不能被覆盖或丢失；快照必须能从证据目录重建差异和 per-file SHA。
- 账本更新不能伪造 DONE、覆盖历史 verification 或把不存在的 worktree 留作当前归属。

### Task 1: 建立接管快照与差异证据

**Files:**
- Create: `D:/kk-studio/output/figma-pages-takeover-2026-11-01/manifest.json`
- Create: `D:/kk-studio/output/figma-pages-takeover-2026-11-01/main-status.txt`
- Create: `D:/kk-studio/output/figma-pages-takeover-2026-11-01/figma-main.diff`
- Create: `D:/kk-studio/output/figma-pages-takeover-2026-11-01/figma-files.json`

**Interfaces:**
- Consumes: current local `main` SHA, `origin/main` SHA, registered Figma worktree path, its committed diff and dirty/untracked file contents.
- Produces: immutable snapshot metadata used by `verification.md` and existing ledger evidence fields.

- [ ] **Step 1: Capture current facts**

Run from the canonical checkout and task worktree: `git rev-parse HEAD`, `git rev-parse origin/main`, `git worktree list --porcelain`, and Figma worktree `git status --short --branch`.

- [ ] **Step 2: Write the committed diff and per-file SHA manifest**

Use `git diff --binary main...HEAD` for the committed branch delta and a Node/PowerShell script that hashes every path returned by `git status --short` plus every path in `git diff --name-only main...HEAD` from the Figma worktree. Save only the manifest and patch; do not copy the whole worktree.

- [ ] **Step 3: Verify snapshot immutability**

Hash the manifest and patch and record those hashes in `main-status.txt`. Expected: all paths resolve under the Figma worktree and no external path is followed.

### Task 2: Formalize the opt-in live ComfyUI browser test

**Files:**
- Modify: `tests/browser/p6-live-comfy.spec.ts`
- Rename: `tests/support/comfyCanvasLiveHarness.tmp.tsx` → `tests/support/comfyCanvasLiveHarness.tsx`

**Interfaces:**
- Consumes: `KK_RUN_LIVE_COMFY`, `KK_COMFY_URL` (default `http://127.0.0.1:18188`), `KK_COMFY_CHECKPOINT`, existing `ComfyRuntimePort` and Playwright evidence directory.
- Produces: a default-skipped live test; when enabled, a preflighted real ComfyUI archive test with an explicit external boundary.

- [ ] **Step 1: Add default skip and preflight**

At the beginning of the test, skip unless `KK_RUN_LIVE_COMFY === "1"`. When enabled, require `KK_COMFY_CHECKPOINT`, GET `/system_stats`, GET `/object_info/CheckpointLoaderSimple`, and assert the checkpoint is listed before mounting the page.

- [ ] **Step 2: Bind the harness to the preflighted endpoint**

Pass the normalized URL and checkpoint to esbuild `define`, update the formal harness to use those constants for workflow selection, `/prompt`, `/history`, and `/view`, and make its status report `ready: true, owned: false` after the external endpoint preflight. The harness must not call a process start/stop API.

- [ ] **Step 3: Assert live output and evidence**

Keep the result node, asset ID, source ID and result edge assertions; attach state JSON and a screenshot under Playwright's isolated evidence directory. State that this proves the external endpoint archive path only.

- [ ] **Step 4: Verify skip and compile**

Run `npx playwright test tests/browser/p6-live-comfy.spec.ts --list` and the focused test with the live flag absent. Expected: one skipped test and no ComfyUI requirement when the flag is absent.

### Task 3: Correct active ledger ownership and refresh generated views

**Files:**
- Modify: `docs/governance/task-ledger.json`
- Generated: `docs/governance/TASK_LEDGER.md`, `docs/governance/TASK_STATUS.md`
- Create: `docs/changes/2026-11-01-handoff-takeover/{intent,spec,plan,verification,review}.md`

**Interfaces:**
- Consumes: Task 1 snapshot and Task 2 result.
- Produces: a traceable delivery package and current ownership fields for the active takeover tasks.

- [ ] **Step 1: Update only active records**

Use existing `TASK-DELIVERY-MAIN-20261030` as the handoff evidence owner; update the current branch/worktree fields only for the active P6/P7 and gate records being handled in this phase. Preserve all prior verification history and statuses.

- [ ] **Step 2: Write the five delivery files**

Use project templates. `verification.md` must contain exact base/head, commands, exit codes, evidence paths, and the Figma OAuth and SD checkpoint blockers without marking them complete.

- [ ] **Step 3: Refresh and check views**

Run `npm run governance:write`, `npm run features:write`, `npm run delivery:check`, and `npm run governance:check`. Expected: deterministic generated views with no new violations.

### Task 4: Run baseline gates and record remaining blockers

**Files:**
- Modify: `docs/changes/2026-11-01-handoff-takeover/verification.md`
- Modify: `docs/changes/2026-11-01-handoff-takeover/review.md`

**Interfaces:**
- Consumes: current task worktree after Tasks 1–3.
- Produces: reproducible baseline receipt and honest status for the next implementation phase.

- [ ] **Step 1: Run fast gates**

Run sequentially: `npm run typecheck`, `npm run lint`, `npm test`, `npm run agent:build`, `npm run test:agent`, `npm run ui:check`, and `npm run format:check`.

- [ ] **Step 2: Run targeted governance and live-test listing**

Run `npm run delivery:check`, `npm run governance:check`, and the default-skipped P6 live test list. Preserve pre-existing failures with their full command and test names.

- [ ] **Step 3: Self-review and independent review**

Self-review the diff against this plan and design. Record exact base/head SHA, changed files, and remaining blockers. Request one independent read-only review before merge.

- [ ] **Step 4: Commit the focused change**

Stage only the focused task files and commit with `test(comfyui): 门控真实工作流接管测试`. Generated runtime artifacts and dependencies remain ignored.
