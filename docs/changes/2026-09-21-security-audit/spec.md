# Spec

- ID: TASK-AUDIT-SEC-001
- Source of truth: AGENTS.md, docs/architecture/DATA-STORAGE.md, docs/architecture/GENERATION-PLATFORM.md, current source/tests, and current task ledger.
- 入口与状态: Web image submission, model/provider URL schemas, Node Gateway startup registration/authentication, and Desktop TaskHost journal/result download.
- 数据契约与权限:
  - API keys remain in the credential vault/request memory and must never be sent to a remote plaintext HTTP endpoint.
  - A provider request that may have been accepted remains `unknown` after abort; it cannot enter ordinary retry.
  - Gateway configuration reload must reconcile connection metadata and ACLs without destroying durable runtime health or spent accounting.
  - Native result downloads are bounded before storage; durable task journals are replaced without a delete-first window.
- 验收标准:
  - Targeted regression tests reproduce each fixed issue and pass.
  - TypeScript, lint, format, production build and Rust tests pass.
  - Remaining cross-window lease, account configuration, and result-origin risks are explicit and are not described as solved.
- 错误、取消、离线: Preserve existing unknown/manual-review, cancellation, offline and fail-closed semantics; do not turn uncertainty into success.
