# Figma source context: account popup

- File: `0nU0A7pq6eyjwfwm1TtWkO`
- Node: `312:2436` (`弹出的个人信息`)
- Source frame: `260 × 205px`, dark surface `#1f1f1f`, `1px #3c3c3c` border, `10px` radius.
- Identity: 30px visual logo at x15/y12; Inter Bold 12px account name; Inter Regular 8px UID.
- Action row: two 116×30 buttons at x12/y48 and x132/y48, 4px gap, `#252525` surfaces, 10px radius. Logout uses the red `account-logout.svg` asset.
- Credits panel: x12/y85, 236×59, `#0d0d0d` surface, 1px border, 10px radius; two compact rows, 8px labels, italic 12px balance, green subscription badge.
- Theme control: source `account-theme.svg`, 62×22px.
- Version/update row: y174, 8px label, 42×22px check button, source `account-refresh.svg`; cloud upload glyph uses `account-update.svg`.
- Local product boundary: the displayed `1000` remains a visual prototype fixture and has a title/ARIA description stating it is not a real account balance. Account switching and logout remain disabled with explicit reasons.

Implementation notes: `AccountPopup.tsx` now imports the dedicated `account-popup.css`; the stylesheet scopes the Figma geometry and overrides legacy workspace rules without editing `workspace.css` or shared tokens.
