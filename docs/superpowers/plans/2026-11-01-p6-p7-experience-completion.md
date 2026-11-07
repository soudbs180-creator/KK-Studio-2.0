# P6/P7 Experience Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the ComfyUI install guidance, image-capability actions, and workflow-source inspection path, then verify and merge the branch without losing main's Figma audit files.

**Architecture:** Reuse the existing ComfyUI runtime, `CanvasImageCommandContext`, `CapabilityRegistry`, and canvas controls. The toolbar only emits a capability action; the existing submission path remains responsible for preparing the task, validating the archived source asset, and invoking `CapabilityRegistry.run`. Lineage uses the persisted `comfyWorkflowSourceId` and existing selection/locate controls.

**Tech Stack:** React 18, strict TypeScript, existing Zod creation contracts, Playwright browser fixtures, Node test runner, local ComfyUI HTTP API.

**Spec:** `docs/changes/2026-11-01-p6-p7-delivery/design.md`

## Global Constraints

- Do not add a second queue, image algorithm, provider API, or asset store.
- Preserve existing Figma audit files and unrelated dirty changes on main.
- Keep unsupported adapters/platforms explicitly unavailable.
- Store runtime evidence only under `D:/kk-studio/output/p6-p7-2026-11-01/`.
- Run `npm run typecheck`, `npm run lint`, and `npm test` before merge.

## Review Focus

- Directory guide must not start or stop ComfyUI and must use an official link.
- Capability actions must reject missing or unarchived source assets before any provider request.
- Capability dispatch must retain task identity and existing no-retry/unknown semantics.
- Workflow source must preserve stable lineage when descriptions change and show a clear missing-source message.
- Merge must preserve all pre-existing dirty Figma audit files and leave no orphan worktree.

### Task 1: ComfyUI install guide

**Files:**
- Modify: `src/components/canvas/ComfyWorkflowNode.tsx`
- Modify: `src/styles/comfy-workflow.css`
- Test: `tests/browser/comfy-workflow.spec.ts`

**Interfaces:**
- Consumes: existing `state.status`, `state.chooseDirectory`, and desktop gating.
- Produces: local guide popover with accessible title, official link, and setup instructions.

- [ ] **Step 1: Write the failing browser assertions** for hidden-by-default, adjacent guide button, official link, and setup text.
- [ ] **Step 2: Run the focused test** and confirm it fails because the guide is absent.
- [ ] **Step 3: Add the smallest local guide state and markup** beside `选择目录`; do not alter startup behavior.
- [ ] **Step 4: Run the focused browser test** and confirm it passes.
- [ ] **Step 5: Commit** as `feat(comfyui): add local install guidance`.

### Task 2: Capability action wiring

**Files:**
- Modify: `src/runtime/canvasCommandRuntime.tsx`
- Modify: `src/features/creation/CanvasImageCommand.tsx`
- Modify: `src/features/creation/useImageCommandSubmission.ts`
- Modify: `src/features/image-edit/EditToolbar.tsx`
- Modify: `src/features/image-edit/ImageEditor.tsx`
- Modify: `src/features/image-edit/imageCapabilityActions.ts` (create)
- Test: `tests/unit/imageCapabilityActions.test.ts` (create)
- Test: `tests/browser/image-edit.spec.ts`

**Interfaces:**
- Consumes: `ImageCapabilitySpec`, `dispatchImageCapability`, `CanvasImageCommandContext.submit`, and the archived source item.
- Produces: `onCapabilityRun(capabilityId)` action callback and optional `imageCapability` on canvas requests, passed through `resolveCommandInput` into the existing registry path.

- [ ] **Step 1: Write the failing unit test** for action metadata: labels `扩图`, `高清修复`, `图层拆分`, output count, and rejection when no explicit capability workflow is available.
- [ ] **Step 2: Run the unit test** and confirm it fails because the action builder and toolbar callbacks do not exist.
- [ ] **Step 3: Implement `imageCapabilityActions.ts`** as a small validated builder around the current source asset and configured workflow metadata; do not implement image algorithms.
- [ ] **Step 4: Extend `CanvasImageRequest` and `resolveCommandInput`** to carry the validated spec through `prepareImageCapabilityInput` and the current `dispatchImageCapability` call.
- [ ] **Step 5: Add the three toolbar buttons and bind them to the editor callback**, preserving loading/cancel/error states and the existing generic edit flow.
- [ ] **Step 6: Run the unit and focused browser tests** and confirm each button reaches the existing capability dispatch seam without duplicate submission.
- [ ] **Step 7: Commit** as `feat(image-edit): dispatch image capabilities from toolbar`.

### Task 3: Workflow source inspector

**Files:**
- Modify: `src/components/Canvas.tsx`
- Create: `src/components/canvas/CanvasPropertyPanel.tsx`
- Modify: `src/styles/canvas-layers.css`
- Modify: `src/domain/canvasItems.ts` only if a shared source resolver is needed
- Test: `tests/unit/canvasWorkflowSource.test.ts` (create)
- Test: `tests/browser/comfy-workflow.spec.ts`

**Interfaces:**
- Consumes: `controls.selectedNode`, `controls.setSelectedNode`, `locateNode`, `comfyOutputSourceId`, and `items`.
- Produces: accessible right-side inspector with `[Workflow Source]` control that selects and locates the source workflow card.

- [ ] **Step 1: Write the failing unit test** for stable source resolution and missing-source handling.
- [ ] **Step 2: Run the unit test** and confirm it fails because no inspector exists.
- [ ] **Step 3: Add the focused property panel** and render it only for a selected ComfyUI output image; the click handler selects and locates the source card.
- [ ] **Step 4: Add browser assertions** for visible label, source-card selection, and a clear unavailable message when the source card is absent.
- [ ] **Step 5: Run focused tests** and commit as `feat(canvas): show ComfyUI workflow source`.

### Task 4: Local image evidence and delivery

**Files:**
- Create: `output/p6-p7-2026-11-01/` evidence files
- Modify: `docs/changes/2026-11-01-p6-p7-delivery/verification.md`
- Modify: `docs/PROGRESS.md` and the relevant feature ledger/card entries

- [ ] **Step 1: Confirm the local ComfyUI endpoint and available checkpoint models.**
- [ ] **Step 2: Run a standard SD/SDXL API workflow through the existing adapter and capture prompt, job, output, asset, canvas node, and result-edge evidence.**
- [ ] **Step 3: If no SD/SDXL checkpoint is installed, record the exact provider/model blocker and keep the evidence status PARTIAL; do not label the existing H3 run as image acceptance.**
- [ ] **Step 4: Run `npm run typecheck`, `npm run lint`, `npm test`, the focused browser tests, and the required UI/build checks; save logs under the evidence directory.**
- [ ] **Step 5: Review the diff and commit the verification documents.**

### Task 5: Merge and reclaim

- [ ] **Step 1: Verify branch status, base/head SHAs, and a manifest of main's 21 Figma audit files.**
- [ ] **Step 2: Merge the verified branch into `main` without resetting or cleaning unrelated dirty files.**
- [ ] **Step 3: Re-run the merge gate from the main checkout.**
- [ ] **Step 4: Confirm the Figma audit manifest and all new files are present, then remove only the temporary worktree and its branch if policy permits.**
- [ ] **Step 5: Record the final SHA and remaining verification boundary.**
