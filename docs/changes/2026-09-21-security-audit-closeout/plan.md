# Plan

- ID: TASK-AUDIT-SEC-001-CLOSEOUT
- Base: `fix/TASK-AUDIT-SEC-001-boundaries` at `502ca1b` before this closeout.
- Implementation:
  1. Add Web Locks based registry/slot coordination and reconcile persisted metadata from live locks; keep synchronous helper only for existing non-UI callers/tests.
  2. Add account provisioning history and explicit conflict/update semantics without changing spent balance.
  3. Enforce TaskHost same-origin result URLs, HTTPS/loopback policy, DNS/IP filtering and pinning; close the cancel-to-send gap and IPv6 literal edge.
  4. Add focused regression tests, update project evidence, then run Node, TypeScript, Rust, lint, format and build checks.
- Rollback: revert this task's commits on the isolated branch; no external data or credentials are touched.
- Out of scope: real Provider billing, public deployment, and CDN allowlist product design.
