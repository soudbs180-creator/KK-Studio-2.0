# KK Studio Remaining UI Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clear the current formatting gate, identify and fix the root cause of browser timeouts, then finish the remaining desktop/mobile resource, media-reference, redraw, and acceptance slices from the approved Figma plan.

**Architecture:** Preserve the existing React/domain boundaries and Figma-first tokens. Reuse the current asset library, canvas reference model, image-edit region logic, and Playwright server contract; add only the smallest state adapters needed for filter and frame-swap interactions.

**Tech Stack:** React 18, TypeScript, Vite, Playwright/Edge, Node test runner, Prettier, existing Figma MCP session.

**Spec:** `docs/changes/2026-10-24-figma-ui-governance/spec.md`

## Global Constraints

- Preserve unrelated staged/unstaged work; do not reset, clean, overwrite, or publish.
- Figma remains the visual authority; local changes must reuse existing tokens and components.
- Fixed Vite development port is 1421 and Playwright preview port is 1423.
- Do not increase timeout or retry counts to hide a real failure.
- Image editing continues to use the existing `image-edit` region/mask domain logic.

## Review Focus

- Formatting must become reproducible without changing product behavior or ignoring files.
- Browser failures must be attributed to server, port, fixture, or product state before any fix.
- Resource filters must preserve resource-pack → tag → type ordering and deterministic date sorting.
- Video frame swap must preserve first/last semantics through persistence and reload.
- Redraw actions must serialize/recover their region state and keep the capsule composer usable on narrow screens.

### Task 1: Formatting baseline

**Files:** all files reported by `npm run format:check`, only if formatting-only; verification record in `docs/changes/2026-10-24-figma-ui-governance/verification.md`.

- [ ] Reproduce the full warning list and compare representative files with `HEAD`.
- [ ] Apply Prettier only to files that are already part of the current working tree; do not add ignore rules.
- [ ] Run `npm run format:check` and record remaining unrelated blockers, if any.

### Task 2: Browser timeout root cause

**Files:** `playwright.config.ts`, test harness/server scripts only when the reproduced failure identifies them.

- [ ] Run one failing test with verbose reporter and capture port, route, loaded bundle, and console/network evidence.
- [ ] Reproduce the same failure against the current build without changing timeout/retry values.
- [ ] Fix the single identified root cause and run the focused test twice plus the relevant browser shard.

### Task 3: Resource filters and media references

**Files:** existing library/filter components, `src/domain/canvasItems.ts`, reference UI and focused tests.

- [ ] Add or complete resource-pack → tag → type filters and time sort/date ranges using existing asset metadata.
- [ ] Add a first/last video reference swap action that updates the persisted frame semantics.
- [ ] Verify image/video/audio reference rendering and reload behavior with focused unit/browser tests.

### Task 4: Redraw and responsive acceptance

**Files:** existing `src/features/image-edit` components/styles and desktop/mobile responsive styles.

- [ ] Verify toolbar labels, floating placement, comment point, crop/rectangle mode, selection-only switch, and capsule input order against Figma.
- [ ] Run focused desktop and 390×844/320×640 browser checks for redraw and lightbox behavior.
- [ ] Update the change verification record with route, port, bundle, screenshots, and exact failures.

### Task 5: Final gates

- [ ] Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run ui:check`, `npm run build`, focused browser tests, and then `npm run verify`.
- [ ] Do not claim full completion while browser or Code Connect gates remain blocked.
