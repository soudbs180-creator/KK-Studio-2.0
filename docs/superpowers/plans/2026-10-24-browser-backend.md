# Browser Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep KK Studio's internal browser and add a minimal, secure provider adapter for Edge, Chrome, and ego lite.

**Architecture:** A pure `src/features/browser` registry/state machine owns provider selection, authorization, status, and security handoff. A thin `src/integrations/browser` runtime calls fixed Tauri commands for external Edge/Chrome and ego lite; existing Agent approval types carry the user-facing handoff payload.

**Tech Stack:** TypeScript strict, Zod, Tauri 2 Rust commands, Node test runner, Cargo tests.

**Spec:** `docs/superpowers/specs/2026-10-24-browser-backend-design.md`

## Global Constraints

- Keep `internal` (Tauri/WebView2) as the default and do not replace or embed ego lite.
- External automation requires explicit task authorization; login, verification, CAPTCHA, permissions, certificate warnings, sensitive actions, and irreversible actions pause for user takeover.
- Do not persist or log credentials, cookies, verification codes, page content, or arbitrary scripts.
- Use no new dependency and do not modify unrelated dirty work.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and `cargo test --manifest-path src-tauri/Cargo.toml` as far as the current dirty baseline allows; report pre-existing failures separately.

## Review Focus

- A caller tries to open an external provider before authorization: the adapter rejects without invoking a runtime.
- A security-sensitive handoff is requested twice or resumed without user approval: state remains paused until one explicit resume.
- A malformed or non-HTTPS ego URL/Space name reaches Rust: the command rejects before spawning.
- Edge/Chrome are selected as if they were automated: status says manual-only and does not claim an automation bridge.
- Runtime errors or unavailable ego lite: the adapter exposes an actionable error and leaves the internal provider selectable.

---

### Task 1: Browser provider registry and security state machine

**Files:**

- Create: `src/features/browser/browserTypes.ts`
- Create: `src/features/browser/browserProviders.ts`
- Create: `src/features/browser/browserBackend.ts`
- Create: `src/features/browser/index.ts`
- Test: `tests/unit/browserBackend.test.ts`

**Interfaces:**

- `listBrowserProviders(): readonly BrowserProvider[]`
- `createBrowserBackend(runtime, options?): BrowserBackend`
- `BrowserBackend.open(url): Promise<BrowserStatus>`
- `BrowserBackend.authorize(): void`
- `BrowserBackend.requestHandoff(kind, reason): AgentApprovalRequest`
- `BrowserBackend.resume(): void`

- [x] **Step 1: Write failing tests** for provider registration, default internal selection, authorization gate, manual-only Edge/Chrome state, unavailable providers, and handoff/resume transitions.
- [x] **Step 2: Run `node --test tests/unit/browserBackend.test.ts` and confirm the missing-module failure.**
- [x] **Step 3: Implement the smallest pure registry/state machine; map handoffs to the existing `AgentApprovalRequest` shape without adding a second approval queue.**
- [x] **Step 4: Run the focused test and confirm it passes.**

### Task 2: External runtime adapters and ego lite Tauri command

**Files:**

- Create: `src/integrations/browser/browserRuntime.ts`
- Create: `src/integrations/browser/egoLiteRuntime.ts`
- Create: `src-tauri/src/ego_browser.rs`
- Modify: `src-tauri/src/main.rs` (module, managed command registration, exit cleanup only if needed)
- Test: `src-tauri/src/ego_browser.rs` unit tests

**Interfaces:**

- `BrowserRuntime.open(provider, url, authorized): Promise<BrowserOpenResult>`
- `BrowserRuntime.inspect(provider): Promise<BrowserInspection>`
- Tauri commands `ego_browser_status` and `ego_browser_open`.

- [x] **Step 1: Add Rust tests first** for URL/Space validation and explicit authorization.
- [x] **Step 2: Run `cargo test --manifest-path src-tauri/Cargo.toml ego_browser` and confirm the new tests fail because the module is absent.**
- [x] **Step 3: Implement validation and a fixed `ego-browser nodejs -e` launch script; keep Edge/Chrome on a fixed executable allowlist through the native runtime.**
- [x] **Step 4: Add Tauri registration and run the focused Cargo tests.**

### Task 3: Integration verification and durable documentation

**Files:**

- Modify: `docs/05-references/api-specs/` only if an API note is needed
- Add: `output/logs/browser-backend-20261024/` verification evidence (generated, untracked)

- [x] **Step 1: Run the focused TypeScript and Rust tests plus `npm run typecheck`.**
- [x] **Step 2: Run `npm test`, `npm run lint`, and `npm run build`; record unrelated dirty-baseline warnings without rewriting them.**
- [x] **Step 3: Run the installed ego lite smoke command and verify the explicit-authority launch path at the adapter boundary; record exact command/version and limitations.**
- [x] **Step 4: Review the diff for secrets, arbitrary command/script inputs, and accidental internal-browser changes.**

### Task 4: Settings selector and user-facing safety state

**Files:**

- Create: `src/components/settings/BrowserBackendSettings.tsx`
- Create: `src/features/browser/browserPreferences.ts`
- Modify: `src/components/settings/AgentConnectionSettings.tsx`
- Modify: `src/components/settings/settings.css`
- Test: `tests/unit/browserPreferences.test.ts`
- Test: `tests/browser/capability-model-access.spec.ts`

- [x] **Step 1: Add a small preference helper that defaults to the internal browser and rejects unknown provider ids.**
- [x] **Step 2: Add the provider selector to the existing Codex CLI settings card, reusing its Figma spacing, status dot, field, and action styles.**
- [x] **Step 3: Show provider availability, authorization requirement, and the security takeover notice; keep external checks desktop-only in the browser build.**
- [x] **Step 4: Run focused preference/backend tests, the settings browser smoke, typecheck, lint, format check, UI standards, and production build.**
