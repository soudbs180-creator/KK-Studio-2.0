# Shared Memory Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing shared-memory candidate safe to read, write, and describe accurately on Windows desktop and the Web before integration.

**Architecture:** Keep the version 1 shared file contract and the existing memory service. Validate persisted data at every reader; preserve corrupt data. Upgrade the browser database before persisting the directory handle, and report the actual storage mode. Keep optional model injection explicit in the UI and contract.

**Tech Stack:** React 18, TypeScript, IndexedDB, File System Access, Tauri 2/Rust, Node 24 tests, Playwright.

**Spec:** `docs/changes/2026-09-24-local-memory/spec.md` and `docs/MEMORY-CONTRACT.md`.

## Global Constraints

- User memory is local at rest, excluded from sync, logs, exports, and localStorage.
- Memory starts disabled; enabling Codex injection sends selected memory snippets for inference.
- Preserve the existing version 1 file and legacy namespace compatibility.
- No claim of native Doubao or WorkBuddy memory support until their adapters use the contract in a real session.
- Preserve unrelated user changes and the existing shared-memory task branch.

## Review Focus

- A version 1 file with missing or malformed `records` must fail closed without overwrite.
- A fresh Web database must gain both memory and directory-handle stores; an older version 1 database must upgrade.
- Losing a browser directory grant must show isolated mode and must not silently move existing shared records to another file.
- First desktop write must work when `~/.kk-memory` does not yet exist.
- Failed reset backup must leave the original file unchanged.

---

### Task 1: Reject malformed stores

**Files:** `src/features/memory/storage.ts`, `tests/unit/memoryStorage.test.ts`, `src-tauri/src/main.rs`.

**Interfaces:** `normalizeStore(value): MemoryStoreFile`; `read_memory_file(path): Result<MemoryStore, String>`.

- [ ] Add a unit test that passes `{version: 1, records: "bad"}` and expects a format error instead of `[]`.
- [ ] Run `node --test tests/unit/memoryStorage.test.ts` and confirm that this assertion fails.
- [ ] Validate the array, count, and each record's required shape before returning it; keep the legacy namespace field ignored.
- [ ] Run the targeted Node test to green.
- [ ] Add a Rust test for malformed record payload and confirm read rejects it without changing the bytes.
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml memory_tests` to green.

### Task 2: Repair Web shared storage

**Files:** `src/features/memory/storage.ts`, `src/features/memory/memoryService.ts`, `src/features/memory/useMemory.ts`, `tests/browser/memory-settings.spec.ts`.

**Interfaces:** `MemoryStorage.mode(): Promise<"shared" | "isolated">`; `authorizeSharedDirectory(): Promise<boolean>`.

- [ ] Add a browser test that first creates the memory store, then grants a shared directory and reads a record from its `memory.json`.
- [ ] Run the browser test and confirm it fails on the old database schema.
- [ ] Upgrade IndexedDB to version 2 with both object stores, report the actual authorization mode, and reject a directory whose name is not `.kk-memory`.
- [ ] Repeat the browser test after closing and reopening the settings panel, including a persisted handle read.
- [ ] Add a test for revoked permission showing isolated status and no claim of sharing.

### Task 3: Make desktop writes and reset safe

**Files:** `src-tauri/src/main.rs`.

**Interfaces:** `write_memory_file(path, store)` and `memory_reset_identity(state)`.

- [ ] Add a test for first write into a missing parent directory; confirm failure first.
- [ ] Create the parent directory before writing the temporary file; run the test to green.
- [ ] Add a test that a failed backup rename cannot proceed to overwrite the current file.
- [ ] Propagate backup rename errors, and test repeated writes and reset on Windows.

### Task 4: Correct the user-facing contract and integration evidence

**Files:** `docs/MEMORY-CONTRACT.md`, `src/components/settings/MemorySettingsSection.tsx`, `src/features/memory/useMemory.ts`, memory change packet, feature card and governance records.

**Interfaces:** No new runtime interface.

- [ ] Replace claims that native Doubao and WorkBuddy already consume the file with precise current capability.
- [ ] State that selected snippets are sent to the chosen model for inference after opt-in, while the full file is not synced or exported.
- [ ] Remove automatic assistant-reply extraction because it can store a model's unsupported claim as a user preference; test the user-only rule.
- [ ] Run targeted tests, typecheck, lint, full `npm run verify`, and Rust tests; record any real runtime gap.

## Self-Review

- Covers data integrity, Web sharing, desktop first write/reset, and product truthfulness.
- WorkBuddy/Doubao native memory adapters and real account runs remain separate feature tasks with external prerequisites.
- All modified readers retain version 1 compatibility and fail closed on invalid data.

## Execution Rulings (2026-09-24)

- `kk-studio-next` is already owned by the creation snapshot store at schema version 1. Upgrading it solely for memory would break that module's version 1 open calls. Memory now uses its own `kk-studio-memory` database with both stores created together.
- The headless browser crashed while persisting a synthetic OPFS directory handle. The stable browser regression covers real IndexedDB initialization, corrupt data, confirmation, and responsive layout. Real system directory authorization remains NOT VERIFIED.
- UI inspection showed wrapped action buttons; a scoped token-based style rule keeps them one line, and the 390 px test checks reachability and overflow.
- Concurrent message writes were shown to lose one record. Service mutations now run in order within one KK Studio instance; concurrent writes by separate apps remain a later shared-file coordination problem.
