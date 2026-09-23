# Spec

- ID: TASK-AUDIT-SEC-001-CLOSEOUT
- Source of truth: `AI_RULES.md`, `AGENTS.md`, `docs/architecture/DATA-STORAGE.md`, `docs/architecture/GENERATION-PLATFORM.md`, current source, and `TASK-AUDIT-SEC-001` audit evidence.
- Web lease contract:
  - `navigator.locks` holds a connection slot lock for the lifetime of the submission.
  - A registry lock serializes localStorage reconciliation and capacity checks.
  - On each coordinated reservation, persisted lease IDs are rebuilt from currently held slot locks; a crashed/legacy lease is removed.
  - A browser without Web Locks fails closed before a Provider request.
- Gateway account contract:
  - `credit_account_provisioning.initial_credits` records the first configured amount.
  - A restart never rewrites `credit_accounts.balance`.
  - A changed configured initial amount raises `ACCOUNT_CONFIG_CONFLICT` (409); concurrency policy is updated only when the initial amount matches.
  - Existing databases are backfilled from balance plus settled usage and are not silently replenished.
- TaskHost network contract:
  - Result URLs must match the configured Provider network origin, have no credentials/query/fragment, and use HTTPS or loopback HTTP.
  - DNS names are resolved once per request and pinned; any restricted answer rejects the request. IPv4/IPv6 literals are handled without DNS.
  - Provider submission checks cancellation again after DNS/client construction and before send.
- Failure boundaries: failed localStorage writes, unsupported Web Locks, config conflicts, restricted DNS answers, invalid origins, cancellation, and oversized responses remain errors/unknown and never become success or an ordinary retry.
