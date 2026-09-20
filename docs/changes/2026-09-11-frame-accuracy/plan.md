# Plan

- ID: frame-accuracy-2026-09-11
- Files: semantic tokens, SidebarIcon and sidebar CSS, CanvasHud CSS, App focus callback; canvas background origin if measured mismatch confirmed; targeted frame browser regression and evidence.
- Sequence: fresh source read → before DOM/screens → failing source geometry/animation regression → fix shared shell styles/assets → interaction and scaled viewport verification → npm run verify → rebuild actual Tauri dist/release → record evidence.
- Risk: old HUD tests encode historical 1:2 usable-area centering. Replace only expectations disproved by the current frames; keep actual interaction assertions.
- Preserve pre-existing dirty worktree and user data. No git reset/clean or commit.
- Addendum from same-state screenshots: fix transparent shell gutters; include source project-row exports, heading spacing and action positions in the shared sidebar. Preserve local project actions in the context menu; unavailable multi-page creation remains explicitly disabled.
- Addendum from full regression: closing-chat requestAnimationFrame could steal newly moved canvas focus. Guard focus ownership and add a regression before final verification.
