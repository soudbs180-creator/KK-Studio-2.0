# Plan

- ID: TASK-AUDIT-SEC-001
- 变更文件: provider URL/state recovery, Gateway repository/authentication/startup, native TaskHost journal/download, unit regressions and governance evidence.
- 实施顺序:
  1. Inspect current dirty state, specifications, ledger and source/runtime boundaries.
  2. Reproduce high-confidence issues in isolated worktrees.
  3. Apply narrow fixes for request uncertainty, insecure provider URLs, stale Gateway registration, token collisions, bounded native downloads and journal replacement.
  4. Run Node, TypeScript, lint, format, build and Rust checks; restore generated evidence unrelated to the change.
  5. Record unresolved concurrency/configuration/SSRF risks as PARTIAL.
- 风险与回滚: Changes are on `fix/TASK-AUDIT-SEC-001-boundaries`; revert the task commits or remove the isolated worktree. No user data or credentials were touched.
- 验证命令: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml --quiet`, `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`.
