# Figma redbox evidence: ConversationPanel

Source: Figma file `0nU0A7pq6eyjwfwm1TtWkO`, node `1:8090` (`右边侧边栏`).

Read with `figma_get_design_context` using `figma-design-to-code` on 2026-09-09. Relevant child nodes:

- `71:15667` top information: header title at x=1451, y=73, 16px Inter Bold; first icon button x=1859, y=74, 18x18; right panel control x=1887, y=74.
- `71:15665` input frame: x=1451, y=855, 430x170; placeholder x=1465, y=871, Inter Regular 14px; bottom controls begin x=1465, y=987 and use 24px controls, 58px pills, 12px icon leaves.
- `71:15664` input footer: add/send controls are 24x24; model/Skill/plugin pills are 58x24; voice icon is 16px.

Exported Figma SVGs used by the implementation were downloaded from the asset URLs returned by those contexts and committed under `public/design/figma/`:
`chat-header-history.svg`, `chat-header-collapse.svg`, `composer-send.svg`, `composer-bg.svg`, `composer-plus.svg`, `composer-chevron.svg`, `composer-mic.svg`, `composer-package.svg`, `composer-puzzle.svg`, `composer-unplug.svg`.

Implementation: `src/components/ConversationPanel.tsx` and scoped overrides in `src/styles/conversation-panel.css`.
