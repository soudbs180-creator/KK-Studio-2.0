# 16:9 design surface audit (2026-09-09)

## Figma source

The fresh design context was read from file `0nU0A7pq6eyjwfwm1TtWkO`, main frame `1:2`, with `figma-design-to-code` loaded first. Card and video contexts were also read from nodes `312:3183`, `82:15767`, and `82:15753`. The card context reports a 590×705 image card, 400×400 preview at top 58px, a 590×237 composer, and video placeholders at 370×208. The video contexts report the first placeholder at `(997,166)` and the second at `(997,459)`, both 370×208.

## Finding

The prior “16:9” implementation sized `.app` to the browser viewport. At 1600×900 the ratio was correct, but the CSS media query at 1700px changed the chat rail to 360px. At 1280×720 the fixed inner values (287px sidebar, 590px card, 472px chat) also consumed a different fraction of the viewport than they do in the 1920×1080 Figma frame. This changed the apparent node spacing and HUD positions.

## Implemented surface rule

Desktop widths above 1200px now render a fixed 1920×1080 app coordinate space and apply one uniform scale, `min(viewportWidth / 1920, viewportHeight / 1080)`, about the center. The 1920px source geometry is therefore preserved at 1920×1080, 1600×900, and 1280×720. The `data-design-surface="desktop"` marker restores the 472px conversation rail and source sidebar width when legacy viewport breakpoints would otherwise alter them.

## Pointer and portal implications

The app transform changes the relationship between browser client pixels and its CSS coordinate space. `canvasSurface.ts` derives the visual-to-layout scale from `getBoundingClientRect().width / offsetWidth`; canvas pan, node drag, marquee, wheel zoom, and add-at-point conversion use that scale. Portaled add-node and context menus are outside `.app`, so their own visual boxes receive the same scale in `design-surface.css`. The full-screen connection preview remains in physical viewport coordinates and is intentionally not scaled.

Mobile and narrow layouts below 1200px retain the existing responsive behavior until dedicated Figma frames exist.
