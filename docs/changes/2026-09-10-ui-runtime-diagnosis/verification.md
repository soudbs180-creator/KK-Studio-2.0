# UI runtime diagnosis and verification

Date: 2026-09-10, Asia/Shanghai.

**Status: Web runtime delivery and regression gates passed. Full Figma-file and native Desktop visual acceptance are NOT complete.**

## 1. Why old UI could remain visible

Confirmed in the actual browser: conversation-panel.css was injected before workspace.css. The legacy workspace rule won the cascade and made the panel 36% transparent. Repeating the same import later in App did not reorder it because ES modules are deduplicated. Sidebar had the same residual ownership issue through AccountPopup. The imports now have one owner and the live order is workspace -> responsive -> sidebar -> catalog-pages -> conversation-panel.

A separate confirmed desktop launch defect existed in the timestamped .bat backup: an existing EXE was launched without rebuilding even if source was newer. The current launcher already calls desktop-release.mjs, which detects stale/missing releases and fails closed on build failure. Its five tests pass. The old EXE was dated 2026-09-09 21:53:03; the newly built EXE is dated 2026-09-10 23:10:01.

The user's original browser tab/window was not identified. Browser inventory failed and the user did not provide that URL; do not assert that their original window was definitely the old EXE or another port. The evidence below applies to the actual 1421 page opened and inspected during this run.

## 2. Actual app, command and mode

Project D:/kk-studio-next, Vite development, URL http://127.0.0.1:1421/.

Initial observed PID50724 ran bundled Node with node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421. A stop/restart command was initially rejected by policy and was not bypassed. Later 1421 returned ERR_CONNECTION_REFUSED; both PID50724 and the listener were confirmed absent. Their exit cause is unknown. A new server was then started without stopping any process:

```powershell
& 'D:\\tools\\node-v24.20.0-win-x64\\node.exe' 'D:\\kk-studio-next\\node_modules\\vite\\bin\\vite.js' --host 127.0.0.1 --port 1421 --strictPort
```

New listener PID16112. Vite re-optimized dependencies on startup. No user data/cache directory was deleted. Browser scripts include /@vite/client and /src/main.tsx; runtime dataset is development. All observed Vite styles resolve to D:/kk-studio-next. A clean verification browser has no controlling service worker.

Production browser tests use an isolated fresh Vite preview on 1423; those results are not mislabeled as development or native Desktop evidence.

## 3. Source rendering chain

index.html -> src/main.tsx -> src/App.tsx. URL / initially selects landing -> src/components/StartPage.tsx. The real Create Project action selects workspace -> src/components/Canvas.tsx and src/components/ConversationPanel.tsx. Shared shell is src/components/TopBar.tsx and src/components/Sidebar.tsx. Sidebar composes SidebarProjectGroup, existing SidebarProjectEntry, SidebarIcon and AccountPopup. App's other active states use LibraryPage; search/favorites use CatalogPanel rather than the unused CollectionPage/SearchPage.

## 4. Earlier modifications and why they did not all show

The dirty worktree already included changes in App/main, Sidebar, Canvas, ConversationPanel, LibraryPage, TopBar, settings and styles, and newly added StartPage/CatalogPanel/token/runtime files. Latest committed UI baseline was 9e20941 (2026-09-06, model selection UI); later work was largely uncommitted. Do not attribute this whole dirty diff to this continuation.

Active imported components were not all unused: their styles could lose in the cascade. Changes to unused CollectionPage/SearchPage cannot change the current CatalogPanel route. Source edits also cannot refresh an existing Tauri release EXE. No evidence established a second currently running app/package. No evidence established browser cache as the primary CSS cause.

## 5. Files changed in this continuation

- src/main.tsx and src/App.tsx: explicit base/token/override import order.
- src/components/Sidebar.tsx, SidebarProjectEntry.tsx, AccountPopup.tsx, ConversationPanel.tsx: reuse existing interactions, current frame IDs and consolidated style ownership.
- src/components/SidebarProjectGroup.tsx and SidebarIcon.tsx: extract existing composition/artwork responsibilities; no second page or alternate UI implementation.
- src/styles/global.css, ui-tokens.css, design-surface.css, sidebar.css, conversation-panel.css, catalog-pages.css, canvas-actions.css: source-measured shell, composer, spacing/type/control tiers, correct viewport scaling and constant logical node-action gap.
- public/design/figma/composer-plus.svg and sidebar-expand.svg: current Figma artwork.
- tests/browser/runtime-ui.spec.ts plus existing canvas-layout, connection-drag, sidebar, composer-fidelity, interaction-state, frontend and ui-motion tests.
- AGENTS.md, docs/UI_SPEC.md, docs/PROGRESS.md and this change record.

## 6. Actual browser differences

Fresh 1920x1080 development measurements after the new server started:

| Item | Before | Current / latest source contract |
| --- | --- | --- |
| Expanded sidebar | 291px, #0a0a0a | 291px, #161616 |
| Collapsed rail / content X | 61px / 69px | 70px / 70px |
| Panel background | #161616 at 36% alpha | opaque #161616 |
| Composer | (1448,854),430x170 | (1450,844),426x170 |
| Textarea | 402x117,14/17 | 400x64,10/12 |
| Composer action row | old24px pills | 400x24,22px pills |
| Collapsed toolbar X | 608 | 719 |
| Toolbar size | 294x50 | 294x50 retained |

The browser additionally confirmed panel (1430,61,470,998), header (1450.5,78,426,24), action row (1463,977,400,24), border1/radius20, task (310,72,93,30), and correct 1440x900 letterboxing. Empty send and unavailable microphone are disabled. Search click / Ctrl+K / Escape / focus restoration and local message / selected mode interactions passed. Hover changes toolbar filter to brightness(1.18). No pageerror events were captured in the live probe.

Evidence directory: docs/evidence/ui-runtime-2026-09-10/.

- before-landing.png, before-workspace.png, before-collapsed.png and before.json.
- figma-landing.png, figma-workspace.png, figma-collapsed.png and figma-context.json. Figma raster exports include outer strokes; geometry comparisons use node coordinates, not estimated screenshot pixels.
- live-landing.png, live-workspace.png, live-collapsed.png, live-interaction.png, live-1440.png and live-browser.json from the restarted 1421 development page.
- validation-accepted.json: full production browser suite.

## 7. Validation results

| Gate | Result |
| --- | --- |
| pnpm run typecheck | PASS |
| pnpm run build | PASS |
| pnpm run test | PASS,20/20 |
| pnpm run ui:check | PASS,82 files,0 violations |
| pnpm run format:check | PASS |
| Full Playwright browser suite | PASS,96/96,0 skipped,0 retries,0 flaky |
| Live 1421 browser probe | PASS,DOM + screenshots + interactions,0 pageerrors |
| npm run tauri -- build --no-bundle | PASS |
| desktop-release freshness inspection | current,needsBuild=false |
| Native Tauri window screenshot/interaction verification | NOT PERFORMED |

Full UI command: node node_modules/@playwright/test/cli.js test --workers=6 --retries=0 --reporter=json. The normal pnpm run test:ui was also executed earlier; its initial failures were investigated rather than ignored. pnpm exec playwright selected a different root Playwright installation and failed test registration; use the project's @playwright/test CLI, not that alternate entry.

Test corrections preserve meaningful assertions: latest Figma geometry replaces old287/61 values; world-coordinate checks subtract automatic viewport pan; demo tests explicitly select quantity1 and await persistent data-source=demo results rather than racing an unmounted source editor; middle-pan waits for the React DOM commit instead of reading immediately. No skipped tests or broad error tolerances were introduced.

Build warnings: Zod PURE annotation comments removed by Rollup; Tauri advises against the com.kkstudio.app bundle-id suffix on macOS. Neither blocked the Windows build.

## 8. Remaining differences / acceptance boundaries

- Figma Workspace shows an empty canvas and sample conversation content. The running app keeps its existing editable demo cards and honest empty/local-message state; no fake AI answer or destructive data reset was added. Therefore screenshots are same before/after application state, but not full same-content Figma state.
- The browser keeps its frontend-preview label rather than faking native minimize/maximize/close buttons.
- Collapsed search is an explicitly user-approved functional supplement absent from the collapsed Frame.
- The canvas navigation stays usable to the left of the open conversation panel; complete motion/state correspondence to the Figma navigation timeline is not visually signed off.
- Shared variants and the broader page0:1 were freshly inventoried, but every Settings/Assets/Search/modal/tooltip variant has not been visually compared against its latest Frame in this continuation. Passing functional tests does not close that gap.
- Native APIs were unavailable, so the rebuilt Tauri EXE has freshness/build evidence but no native-window screenshot/interaction acceptance.
- Exact provenance of the user's originally reported old window remains unknown.

Do not label the whole Figma synchronization complete. The confirmed result is that current source is now visibly loaded by the restarted Web runtime and all automated regression gates pass.
