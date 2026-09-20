# Specification

- Persist `intent` before any provider request. Persist `submitted` immediately before the request and retain the existing task idempotency identity.
- Recover a queued intent as `interrupted`; an in-flight submitted task whose acceptance cannot be confirmed recovers as `unknown`.
- Do not expose ordinary retry for `unknown` or already submitted tasks. A queued intent retry reuses its original idempotency key and records the relationship to the prior task.
- Treat known provider response errors as terminal failures and transport loss after request start as unknown, so the client never claims a provider result it did not receive.
- Validate the new state fields in Web normalization, project snapshots, and native Rust persistence. Reject malformed enum, timestamp, and status values fail-closed.
- Deployment helpers package only the static Web Prototype, include a manifest and hashes, default to dry-run, and activate an immutable remote release atomically when explicitly applied. They do not start a provider, gateway, or ComfyUI service.
