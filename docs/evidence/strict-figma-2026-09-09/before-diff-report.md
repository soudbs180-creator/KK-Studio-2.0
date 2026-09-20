# Strict Figma runtime audit (2026-09-09)

## Runtime provenance

`127.0.0.1:1422` is served by `D:\kk-studio-next\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 1422` (PID 65748). A cache-busted navigation returns current `src/App.tsx` content: `Sidebar` imports `AccountPopup`, and active state initializes to `landing`.

## Reproducible behavior

From the default page, click `项目库`, then click `开始创作`: active navigation remains `项目库`; a modal opens with `modal=landing` (modal title resolves to `使用说明`). Cause: `App.open()` handles `workspace/projects/skills/comfyui/...` but omits `landing`; unknown views call `setModal(view)`. This violates the requested default landing route.

## Geometry baseline

See [before-geometry.json](before-geometry.json) for machine-readable rectangles at 1920x1080 and 1115x698. Key 1920 discrepancies against Figma references:

- Canvas HUD task button is `(310,82,103,30)`; Figma source is `(310,67,93,30)`: +15px Y and +10px width.
- Canvas top-right navigation is `(1146,84,235,26)`; Figma source starts around y=67 and spans ~281px. Current zoom pill is 63px while reference is approximately 75px; navigation tool group is 164px while reference is approximately 188px.
- Expanded conversation panel is `(1418,63,470,985)`; reference is approximately `(1429,56,470,1004)`, leaving current left/top/right/bottom offsets of -11/+7/-12/-12.
- Toolbar size is exact `(294,50)`, but expanded-chat toolbar x=697.5 is ~21.5px left of Figma `(719,998,294,50)` due to an undersized usable-canvas calculation. In collapsed+chat-closed state current x=838 versus reference ~844; adding the reference 8px collapsed canvas gutter would resolve most of this.
- Sidebar functional/nav content aligns: primary nav `(12,120,263,204)`, account row `(12,1015,259,41)`, project heading around y=399. Sidebar shell itself is 287px wide; reference visual gutter leaves canvas shell at x=287, so the internal 12px right gutter is intentional.
- Primary add icon renders 22x22, while Figma source frame `4:2` is 26x26. Archive current 21x19, Skill 20x20, workflow 18x18.

## Menu/icon cascade

`canvas-tools.css` currently has final rules forcing `.canvas-tool-menu` to 90x50, `.canvas-help-menu` to 103px wide, 18px rows and 8px text. These override any larger values in `workspace.css`, explaining menus that remain unreadably small. Navigation SVGs are forced to 10x10 despite intrinsic sizes around 11–12px; the lines icon is 11x12.1 and should not be squashed.

## Captures

- [before-1920x1080-fresh.png](before-1920x1080-fresh.png)
- [before-1115x698-fresh.png](before-1115x698-fresh.png)
- [before-collapsed-closed-1920.png](before-collapsed-closed-1920.png)
- [before-geometry.json](before-geometry.json)
