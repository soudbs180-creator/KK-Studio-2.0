# Governance source of truth

This directory is the durable index for project governance. It complements the existing
feature change records under `docs/changes/` and does not replace their evidence.

- `PROJECT_STATE.md` records current facts and verification boundaries.
- `SPEC_BASELINE.md` points to the current architecture, UI, platform, and engineering rules.
- `task-ledger.json` is the canonical task state, ownership, dependencies, acceptance and evidence source. Run `npm run governance:write` after editing it; `TASK_LEDGER.md` is the generated reading view.
- `KNOWN_ISSUES.md` records reproducible defects and external blockers.
- `MARKDOWN_AUDIT.md` separates current Markdown link checks from historical link errata and missing artifacts.
- `AI_HANDOFF.md` is the shortest safe restart point for the next engineering session.

When a feature changes behavior, update the relevant change package and `docs/PROGRESS.md`.
Update these files when the project-level state, task ownership, or next safe step changes.
Do not copy full historical reports into this directory; link to the existing source instead.
