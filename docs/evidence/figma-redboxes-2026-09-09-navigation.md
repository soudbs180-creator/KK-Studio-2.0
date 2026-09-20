# Figma navigation redbox evidence — 2026-09-09

Source: `0nU0A7pq6eyjwfwm1TtWkO`, nodes `100:16335` (navigation parent), `100:16337` (zoom), `100:16334` (tool group).

The source frame is 1920×1080. The desktop navigation contract is independent of device pixel ratio: the redbox screenshot may be a 1440 CSS px viewport rendered at 1.5x, so CSS must retain these source dimensions rather than applying a viewport scale.

- Zoom capsule (`21:119301`): x=1138, y=67, w=75.38, h=31.109, radius=15.555, border=1.197.
- Tool capsule (`89:15929`): x=1222.77, y=67, w=196.227, h=31.109, radius=15.555, border=1.197.
- Gap between capsules: 9.393.
- Arrange button: x=1232.34, y=71.79, w=56.236, h=21.537; label 13.162px Medium; icon asset 11.496×11.496.
- Background button: x=1295.76, y=71.79, w=21.537, h=21.537; icon 11×11.
- Lines button: x=1319.69, y=71.79, w=21.537, h=21.537; icon 11×12.111.
- Minimap button: x=1343.62, y=71.79, w=65.808, h=21.537; label 13.162px Medium; icon 11×11.
- Divider: x=1292.17, y=75.38, h=14.358.

Implementation mapping:

- `src/components/canvas/CanvasNavigation.tsx` now marks parent/group/zoom nodes with the source IDs for same-state DOM inspection.
- `src/styles/canvas-navigation.css` uses source dimensions as the desktop baseline at all widths above 800 CSS px; the former `min-width:1701px` override and 801–1200px `transform:scale(.84)` hack were removed. Desktop children use fixed source offsets inside the 196.227px capsule; the <=800px rule restores a compact grid.
