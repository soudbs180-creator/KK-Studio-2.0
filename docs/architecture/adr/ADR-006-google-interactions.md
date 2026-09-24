# ADR-006: Google Interactions in the existing project boundary

- Task ID: TASK-AGENT-004
- Date: 2026-09-23
- Status: ACCEPTED (AI technical decision within user-authorized scope)

The user accepted Gemini API Key access for conversation and image generation. KK uses the official HTTPS Interactions endpoint from its local UI, the existing credential service and asset repository, and an additive project conversation record. Google dialogue has its own provider adapter while sharing KK canvas operations and visual controls. No second application, server, task queue or credential store is introduced.

Alternatives: a Gemini CLI login adapter does not establish image API entitlement; a new local HTTP proxy would duplicate runtime deployment for an API that supports browser requests. Keep current Codex and image-task adapters unchanged. Additive optional state preserves existing snapshot version and storage identity. Never infer API capability from web login.

Failures: uncertain acceptance is recorded, no blind retry; project/connection generation guards reject stale results; final images are archived before completion and deduplicated by interaction identity. Raw credentials and provider bodies are not persisted/logged. Google stored conversation retention is external and expired IDs require a user-started new session. Rollback removes only the new additive integration; existing projects/assets remain readable.
