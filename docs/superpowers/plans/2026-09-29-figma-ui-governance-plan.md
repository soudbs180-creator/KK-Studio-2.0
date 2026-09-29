# Figma UI Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the application follow the approved Figma governance baseline for business states, tokens, shared controls and five page templates, then verify the affected flows at the required viewports.

**Architecture:** A typed domain contract owns generation states and allowed actions. A single semantic token layer feeds shared control primitives; page styles consume those primitives instead of defining local dimensions. A typed template registry describes the five Figma page types and provides the work-display default. Existing route and persistence behavior stays intact unless the state contract explicitly changes it.

**Tech Stack:** React 18, TypeScript, Vite, CSS custom properties, Node test runner, Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-09-29-figma-ui-governance.md`

## Global Constraints

- Figma nodes `505:13071`, `505:13430`, `505:13731`, and `505:14180` are the sole design authority.
- Canonical states are `idle`, `editing`, `validation-error`, `ready`, `queued`, `running`, `success`, `failure`, `cancelled`, `offline`, and `service-unconfigured`.
- Product text is never smaller than `12px`; text styles are `12/16`, `14/20`, `14/20/600`, `16/24/600`, `20/28/700`, and `26/32/700`.
- Controls use integer `4px` grid values, heights `24/32/40`, glyphs `16/20/24`, and registered radii `4/8/10/999px`.
- Components consume semantic tokens and use only the four button families with complete interaction states.
- Exactly five page templates are registered: `list`, `grid`, `detail`, `timeline`, `gallery`; work display defaults to `grid`.
- Preserve unrelated dirty-worktree changes; do not reset or clean the repository.

## Review Focus

- An unconfigured model must be blocked before credit reservation or task creation; the failing test belongs to Task 1.
- A running task must reject duplicate submit and parameter edits while preserving cancel/view actions; the failing test belongs to Task 1.
- A failed or cancelled task must preserve draft and expose recovery feedback; the failing test belongs to Task 1.
- A viewport change must not create a second token or component geometry source; browser assertions belong to Tasks 2 and 4.
- A work-display page must resolve to the grid template and not create a peer-level mixed layout; registry tests belong to Task 3.

---

### Task 1: Typed business-state contract and submit gate

**Files:**
- Create: `src/domain/uiGovernance.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/StartComposer.tsx`
- Modify: `src/components/ConversationPanel.tsx`
- Test: `tests/unit/uiGovernance.test.ts`
- Test: `tests/browser/ui-governance-state.spec.ts`

**Interfaces:**
- Produces `GenerationUiState`, `GenerationContext`, `getGenerationUiState(context)`, `getAllowedActions(state)`, and `getDisabledReason(state)` for all generation entry points.
- Consumes existing model/provider configuration, draft, task and connection status without changing persistence schemas.

- [ ] Step 1: Write unit tests for all eleven states, including the unconfigured-model gate, running-task duplicate-submit rejection, failure recovery, cancellation credit feedback, and independent favorite/liked flags.
- [ ] Step 2: Run `node --test tests/unit/uiGovernance.test.ts` and verify the tests fail because the contract is absent.
- [ ] Step 3: Implement the typed state predicates in `src/domain/uiGovernance.ts`; keep the predicate pure and make disabled reasons explicit.
- [ ] Step 4: Route home, canvas and chat submit handlers through the predicate; remove the UI-only default-model escape that bypasses `service-unconfigured`.
- [ ] Step 5: Run the unit test and the focused browser state test; verify submit, keyboard submit and menu submit agree on the same disabled state.

### Task 2: Single token source and shared control primitives

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/ui-tokens.css`
- Modify: `src/styles/global.css`
- Create: `src/styles/ui-governance.css`
- Modify: `scripts/check-ui-standards.mjs`
- Test: `tests/unit/uiGovernanceTokens.test.ts`
- Test: `tests/browser/ui-governance-visual.spec.ts`

**Interfaces:**
- Consumes the Figma metrics and semantic color names from the spec.
- Produces CSS variables for the five text styles, four button families, three control heights, three glyph sizes, registered radii, focus/disabled/loading/success/failure states, and truncation utilities.

- [ ] Step 1: Write token tests that assert the runtime entry imports the authoritative token file, the five text styles exist, no product token is below `12px`, and the allowed metric sets are present.
- [ ] Step 2: Run the token test and record the expected failure from the missing import and legacy values.
- [ ] Step 3: Make `tokens.css` the authoritative semantic layer, convert `ui-tokens.css` to compatibility aliases, and import the token layer before component styles.
- [ ] Step 4: Add shared button, icon-slot, text-style and truncation primitives; migrate direct Lucide imports in settings to the existing `UiIcon`/Figma asset path.
- [ ] Step 5: Run unit tests, `node scripts/check-ui-standards.mjs`, and a focused browser check for control heights, glyph sizes, focus visibility and text overflow.

### Task 3: Five-template runtime registry

**Files:**
- Create: `src/domain/pageTemplates.ts`
- Modify: `src/styles/archetypes.json`
- Modify: `src/styles/archetypes.css`
- Create: `src/styles/page-templates.css`
- Modify: `src/components/LibraryPage.tsx`
- Modify: `src/components/CatalogPageBody.tsx`
- Test: `tests/unit/pageTemplates.test.ts`

**Interfaces:**
- Produces `PageTemplateKey`, `PageTemplateDefinition`, `PAGE_TEMPLATES`, and `selectPageTemplate(contentProfile)`.
- Consumers can query structure, density, interaction policy and the primary visual parameters without creating page-local styles.

- [ ] Step 1: Write registry tests for all five keys, the grid default for work display, nested-template restrictions, and deterministic selection from content profile.
- [ ] Step 2: Run the registry test and verify it fails because the runtime registry does not exist.
- [ ] Step 3: Implement the registry and migrate the old nine-type configuration to the five Figma types; retain canvas as a product shell, not a sixth page-template peer.
- [ ] Step 4: Make library/work-display views consume the registry and shared template classes; remove local duplicate card/list geometry.
- [ ] Step 5: Run the unit suite and inspect the affected page DOM for the selected template key and primary-action placement.

### Task 4: Component ownership and Figma geometry alignment

**Files:**
- Modify: `src/styles/composer.css`
- Modify: `src/styles/conversation-panel.css`
- Modify: `src/styles/workspace.css`
- Modify: `src/styles/responsive-content.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/components/ConversationPanel.tsx`
- Create: `src/components/ConversationComposer.tsx`
- Create: `src/components/ConversationStatus.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/Sidebar.tsx`
- Test: `tests/browser/figma-governance-layout.spec.ts`

**Interfaces:**
- Consumes the token primitives and typed state contract from Tasks 1–2.
- Produces one stylesheet owner per shared component and explicit variants for desktop/mobile composer, chat panel, settings rail, and collapsed/expanded workspace rail.

- [ ] Step 1: Add browser assertions for the approved composer, chat, settings and rail geometry at `390`, `1099` and `1920`, plus disabled/loading/error states.
- [ ] Step 2: Run the focused browser test against the current app and record the mismatched dimensions and duplicate-owner failures.
- [ ] Step 3: Refactor the conversation panel into state container, message/status region and composer; consolidate repeated CSS so each component has one owner.
- [ ] Step 4: Align Figma geometry and responsive behavior: preserve the mobile `299×170` composer, the desktop `652×170` composer, chat input `426×170`, settings desktop `920×700`, and the approved workspace rail behavior.
- [ ] Step 5: Fix settings bottom navigation overflow, sidebar toggle icon states, chat open/reopen positioning, typography alignment and control feedback without changing persistence behavior.
- [ ] Step 6: Run the focused browser test, existing composer/sidebar/settings suites, typecheck and build; inspect screenshots for clipped text, inconsistent control sizes and unexpected workspace gaps.

### Task 5: Documentation, issue closure and verification evidence

**Files:**
- Create: `docs/changes/2026-09-29-figma-ui-governance/spec.md`
- Create: `docs/changes/2026-09-29-figma-ui-governance/verification.md`
- Modify: `docs/UI_INDEX.md`
- Modify: `docs/UI_RULES.md`
- Modify: `docs/UI_ARCHETYPES.md`
- Modify: `docs/governance/TASK_LEDGER.md`
- Modify: `docs/governance/task-ledger.json`

- [ ] Step 1: Write the issue matrix mapping the eleven Figma audit items to code locations, current status and closure evidence.
- [ ] Step 2: Run `node scripts/check-governance.mjs --write` and `node scripts/check-markdown.mjs`; resolve only findings introduced by this work.
- [ ] Step 3: Run the full relevant verification set: `node --test tests/unit/*.test.ts`, `node node_modules/typescript/bin/tsc --noEmit --pretty false`, `node node_modules/vite/bin/vite.js build`, `node scripts/check-ui-standards.mjs`, and the focused Playwright suites.
- [ ] Step 4: Capture browser evidence for the required viewports and states, record known external-provider limitations, and update the Figma issue statuses only when the evidence meets the closure criteria.

## Plan self-review

- Business rules map to Task 1; no page may submit outside the shared predicate.
- Tokens, typography, control metrics and icon limits map to Task 2.
- The five page types and work-display rule map to Task 3.
- Layout, alignment, overflow, responsive behavior and component ownership map to Task 4.
- The requested issue list, reusable specification and verification record map to Task 5.
- Existing provider, persistence and Tauri boundaries remain outside this UI change unless Task 1 exposes a current UI contradiction; such a ruling must be recorded before implementation continues.
