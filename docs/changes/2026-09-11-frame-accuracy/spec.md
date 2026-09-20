# Spec

- ID: frame-accuracy-2026-09-11
- Authority: fresh get_design_context on both target frames and shell/sidebar descendants, plus recursive motion on 406:28820.
- Expanded inner frame: (291,45,1619,1025), radius 20; collapsed: (70,45,1840,1025).
- Task: expanded (321,72,93,30); collapsed (100,72,93,30). It tracks left frame +30 throughout motion.
- Toolbar: (719,998,294,50) in both Figma states, including when chat closes. It is anchored to the fixed right edge, independent of usable node viewport and sidebar width.
- Chat: (1430,61,470,998); composer (1450,844,426,170). When the conversation is open, keep the 281×31.109 navigation capsule visible at (1138,72), immediately to the left of the panel with an 11px gap, so the map control remains directly usable.
- Chat closed: navigation (1562,72,281,31.109), reopen (1859,79,18,18). Reopen retains a 32px transparent pointer hit target. Closing returns focus to it and preserves input draft.
- Collapsed controls: search (22,942,26,26), settings (22,982,26,26), account (22,1022,26,26). Search now appears in fresh source node 448:472; previous cached source absence is superseded.
- Motion: source navigation width 263→38 over first 300ms of a 2s loop, text opacity cubic-bezier(.5,0,.5,1). Adapt once to user toggle; outer frame/header interpolation and reduced motion are engineering behavior. Do not run a repeating product timer.
- Both left and right toggles remain independent; no service/API work. No fabricated Figma sample account or assistant reply.
- Shell surface must be #161616 behind rounded corners and the 5/10px outer gaps; the fixed app must not reveal the black letterbox through a transparent root.
- Sidebar project region: row rectangles (14,409,263,29), (46,443,231,29), (14,511,263,29); header/action slots 20×21 with 2px gaps and 5px right inset. Use source complete action exports; remove extra inline external arrows. Source text is 10px regular #d3d3d3, thumbnail #d98a00.
- Project action behavior is an engineering supplement: arrow opens the existing project workspace/library; project-group management stays available via context menu / Shift+F10, Escape returns focus. Multi-page creation is unavailable and disabled with a Prototype reason. No fabricated creation or persistence.
- Focus restoration is conditional: if focus has already moved to a canvas card before the close frame completes, do not override it.
- Native transition review: project rows retain widths 263/231/263 and 29px heights while the rail opens; clip horizontal overflow without clipping vertically opening project menus. Delay brand reveal until the toggle has cleared the 111px brand area; the reveal ends with the 300ms width transition. This refinement is an engineering supplement, not a claimed extra Figma timeline.
