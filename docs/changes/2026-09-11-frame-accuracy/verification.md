# Verification

- ID: frame-accuracy-2026-09-11
- Status: the expanded-chat navigation regression is verified in the live Web source and the rebuilt Desktop snapshot with same-state DOM and screenshot evidence. The shared worktree continues to receive independent node edits, so the final release freshness is recorded separately below; no full-file or same-content Figma parity claim.
- Actual development process: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421`, current process PID 60368, `http://127.0.0.1:1421/`, `D:/kk-studio-next`; `strictPort: true` is enforced by `vite.config.ts`. No fallback port was used. Production browser checks use the isolated Vite preview at `http://127.0.0.1:1423/`.
- Route: / with active=workspace via 项目库 → 新建项目. Import: src/main.tsx → App.tsx → Sidebar and Canvas/ConversationPanel; Canvas → CanvasHud/CanvasToolbar/CanvasNavigation.
- Before: task x310 instead of321; after left collapse task still x310 instead of100; search 20px at(25,919) instead of26px at(22,942); toolkit recentered after chat close. Sidebar width and panel/composer rectangles were already correct.
- New source regression failed before fix: task 11px error; transition task-to-frame error210px.
- Source screenshots: docs/evidence/frame-accuracy-2026-09-11/figma-expanded.png and figma-collapsed.png. Export includes outer 1px stroke bounds (1922×1082) resampled by tool; numerical comparisons use Plugin API design coordinates, not raster estimates.

## Current source geometry and behavior

| Region         | Expanded (x,y,w,h)                     | Both rails collapsed (x,y,w,h) |
| -------------- | -------------------------------------- | ------------------------------ |
| Inner frame    | 291,45,1619,1025                       | 70,45,1840,1025                |
| Task button    | 321,72,93,30                           | 100,72,93,30                   |
| Bottom toolbar | 719,998,294,50                         | 719,998,294,50                 |
| Chat panel     | 1430,61,470,998                        | hidden                         |
| Composer       | 1450,844,426,170                       | hidden                         |
| Navigation     | 1138,72,281,31.109 (11px before panel) | 1562,72,281,31.109             |
| Search         | 204,75,26,26                           | 22,942,26,26                   |
| Settings       | 233.5,1007,26,26                       | 22,982,26,26                   |
| Account glyph  | 27.5,1007,26,26                        | 22,1022,26,26                  |

- The 17 anchor comparisons in comparison.html use production DOM; maximum error is below 0.1 design px (expanded 0.01525; collapsed 0.015625 from browser subpixel layout). This claim applies to these measured anchors, not every pixel or glyph in the application.
- Sidebar source motion comes from recursive 406:28820: 263→38 over 300ms and cubic-bezier(.5,0,.5,1) label alpha. Click triggering, fixed outer anchors, staggered brand reveal and reduced-motion handling are engineering supplements.
- Four-way state checks cover both open, left closed, both closed and right closed. During source-width interpolation, task remains frame-left+30, toolbar x719, and the open-chat navigation stays outside the panel hit area. The expanded map trigger remains clickable; its popup ends at x=1419 while the panel starts at x=1430. Project rows remain 263/231/263 wide and 29 high during reopening instead of wrapping.
- Two original regressions were reproduced before the anchor fix: task 11px error, and collapsed task-to-frame error210px. Full regression also found asynchronous focus restoration stealing canvas-card focus; guarded restoration plus a dedicated regression fixes it.
- Sidebar complete exports include source search/settings containers and project open/add/pin/more slots. Project names are 10px regular and thumbnails use #d98a00. Dropdowns keep vertical overflow; group context menus support initial focus, ArrowUp/Down, Home/End, Escape and trigger restoration.

## Verification performed

- TypeScript build and UI standards gate pass (`86` files, `0` violations); the three frame/session/layout production specs pass `11/11`, including the open-chat navigation and map interaction. The broader four-file focused run is `24/25`: the only failure is the pre-existing frontend image-preview assertion receiving `x=468` where that test still expects `x=470`; it does not involve the navigation or conversation rail. The full `test:ui` evidence remains `95/101` with six unrelated canvas/local-demo failures, so this change is not reported as a blanket `npm run verify` pass. Unit tests are currently `19/20` because `tests/unit/canvasGraph.test.ts` has an unrelated anchor expectation mismatch.
- Production regression uses an isolated Vite preview process at http://127.0.0.1:1423 with reuseExistingServer=false. The test server is stopped when the run ends.
- Development/preview screenshots and DOM cover 1920×1080 in four rail states, 1600×900, 1440×900 and 390×844. Actual scale at 1440×900 remains 0.75 with vertical letterbox y45; narrow layouts are engineering supplements. Each capture reports no page errors and all sidebar images loaded.
- after-dev-dom.json records `/src/main.tsx`, development mode, source stylesheet order and computed styles. after-preview-dom.json records production mode, actual asset entry and stylesheet. App.tsx loads workspace/responsive before sidebar/conversation, followed by design-surface; CSS computed values are captured for the real elements.
- `open-chat-navigation.json` records the live expanded-chat hit test: navigation `[1138.015625,72,280.984375,31.09375]`, panel `[1430,61,470,998]`, gap `11`, map popup ending at `x=1419`, and the center hit resolving to the `小地图` button. The matching screenshot is `after-dev-expanded-map-open.png`.
- collapse-interaction.webm is an actual browser recording. motion-samples.json contains 100 observed animation frames across four toggles; no simulated animation is used in the deliverable.
- Native build: `npm run tauri build -- --no-bundle`, frontendDist `../dist`; the navigation-fix rebuild completed at 2026-09-11 20:16:02, executable `src-tauri/target/release/kk-studio.exe`, SHA-256 `7c40956e5f77324ef726fdb56e922c8ae3013cfa3a9ce4b505a066575c05e9a2`. The build output is saved in `tauri-nav-fix-final6.log`; `navigation-focused-final.log` records the `11/11` production regression against that build. It was current immediately after rebuilding, but the independent active task `优化节点连接与模块尺寸` subsequently modified `CanvasNodeLayer.tsx`; `release-identity.json` therefore honestly reports `stale` for the latest shared worktree. The tested desktop snapshot contains this navigation fix; later node changes are not claimed as covered by that snapshot.
- Current native WebView2 verification: launched that release with a temporary local CDP argument, following [Microsoft's WebView2 debugging documentation](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/debug-visual-studio-code). The real `http://tauri.localhost/` page loaded `assets/index-peaOiUkj.js` in production mode at a 1920×1080 CSS viewport and devicePixelRatio 1.5. Navigation/panel gap is `10.99993896484375px` before and after collapse/reopen; map-button center hit is `小地图`, the map opens successfully, and page errors are empty. `tauri-navigation.json`, `after-tauri-expanded.png`, `after-tauri-expanded-map-open.png` and `after-tauri-chat-collapsed.png` are captures of the current release WebView content, excluding the OS titlebar. WebView2 device-pixel rounding produces subpixel DOM differences from the DPR=1 browser reference; no all-pixel native parity claim is made. The temporary verification process and local CDP listener were stopped after capture.

## Evidence and acceptance boundary

- Interactive comparison: docs/evidence/frame-accuracy-2026-09-11/comparison.html, embedded source/current images plus a blend slider, two states and the numeric table. It explicitly distinguishes source sample content from application content.
- Source account/conversation fixtures, empty canvas and 200% zoom label differ from the application's Prototype account, initial image/video cards, empty chat and actual 100% view. No assistant response, account, service success or empty-workspace fixture was fabricated to force pixel equality.
- Multi-creation-page controls are shown in source slots with disabled Prototype reasons. Existing project workspace/library navigation is real; local project management retains existing session-only behavior. No persistence/provider/API expansion was introduced.
- The two specified Frames and child data were successfully read and saved earlier in this run. A later supplemental Figma read returned “requires reauthentication”; it was not treated as fresh additional design evidence. Current source records are figma-shell-expanded.txt, figma-shell-collapsed.txt, figma-sidebar.txt, figma-geometry.txt and figma-motion.txt.
- Native Windows titlebar, OS cursor effect and user-selected project state are separate from web/default Figma content. Native screenshots validate the built shell and actual toggles; subpixel geometry claims come from browser DOM.
