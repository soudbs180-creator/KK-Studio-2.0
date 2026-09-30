# KK Studio Figma UI Governance Baseline

## Authority

This specification is derived from the approved Figma governance pages in file
`0nU0A7pq6eyjwfwm1TtWkO`:

- `505:13071` — 01 业务规则与状态矩阵
- `505:13430` — 02 审查问题与修复记录
- `505:13731` — 03 UI 基础规范
- `505:14180` — 04 页面类型模板配置

These pages are the sole baseline for this change. Existing CSS, prior notes and
previously generated tokens are implementation evidence only; they cannot
override this document.

## Business entities and data flow

The product vocabulary is canonical and must not be replaced by synonyms:

`项目 → 画布 → 资产 → 会话 → 任务 → 模型 → 账户`

Every generation entry point follows one flow:

`输入/上传 → 模型与参数 → 预校验 → 冻结积分 → 创建任务 → 生成结果 → 写入资产 → 收藏/喜欢`

Transaction rules:

1. Credit freezing is allowed only after preflight validation succeeds.
2. A task-creation failure releases the freeze immediately.
3. A successful result is written to assets before `favorite` or `liked` changes.
4. `favorite` and `liked` are independent booleans and may be toggled, filtered,
   and synchronized independently.
5. Local-only session import must visibly state that it has not synchronized to
   the account.

## Generation states

The UI state is one of these values at a time:

| State | Entry condition | Allowed operations | Disabled operations | Required feedback |
| --- | --- | --- | --- | --- |
| `idle` | No input and no active execution | Input, upload, model selection | Submit | Low-emphasis placeholder |
| `editing` | Draft content changed | Edit, upload, clear | Submit until valid | Local draft save |
| `validation-error` | Parameters or service invalid | Edit, open settings | Submit | Field errors plus summary |
| `ready` | Input, model and quota valid | Submit, save draft | — | One purple primary action |
| `queued` | Task created, not running | View task, cancel | Duplicate submit | Queue position and ETA |
| `running` | Model executing | View progress, cancel | Duplicate submit, task parameter edits | Persistent progress |
| `success` | Complete result returned | View, download, recreate, favorite | Cancel | Non-blocking success |
| `failure` | Provider or generation failure | Retry, inspect reason, feedback | Download empty result | Reason, impact, recovery path |
| `cancelled` | User or system cancelled | Resubmit, view record | Continue the old task | Credit release/return result |
| `offline` | Network unavailable | Edit local content, view cache | Submit, cloud sync | Persistent status bar; no alert loop |
| `service-unconfigured` | Provider/account missing | Open settings, read setup guide | Submit, test generation | Explain missing capability and entry point |

Every submit button, keyboard shortcut and menu command must call the same
state predicate. Disabled controls expose their reason; opacity alone is not a
valid explanation.

## Visual foundations

### Metrics

- Grid: `4px`; all dimensions are integer values.
- Control heights: `24px`, `32px`, `40px`.
- Glyph sizes: `16px`, `20px`, `24px` only.
- Hit areas: minimum `24px`; key tools `32px`; primary actions `40px`.
- Button variants: Primary, Secondary, Tertiary, Danger; each is `32px` high
  with `8px` radius and complete default/hover/pressed/focus/loading/success/
  failure/disabled states.
- Radius set: `4px`, `8px`, `10px`, `999px` only. Component-specific larger
  shells must be explicitly registered instead of invented inline.

### Typography

Only these five product text styles are allowed:

| Style | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Caption | `12 / 16` | 400 | Metadata and helper text |
| Body | `14 / 20` | 400 | Forms, rows and body copy |
| Body Strong | `14 / 20` | 600 | Labels and emphasized body copy |
| Subtitle | `16 / 24` | 600 | Section headings |
| Title | `20 / 28` | 700 | Page headings |
| Display | `26 / 32` | 700 | Governance and large headings |

No product interface text may be smaller than `12px`. Truncate one-line text
with an ellipsis; constrain multi-line copy to 2–3 lines and expose full text
through the detail view or tooltip.

### Semantic color and feedback

Components consume semantic tokens only. Purple is reserved for the executable
primary action, focus ring and key status. A view keeps one primary action.
Async actions enter a visible state within 100ms. Failure copy includes cause,
impact and next step. Toasts cannot be the only record of a critical result.

## Page templates

The runtime registry has exactly five primary page types:

| Key | Structure | Interaction | Selection rule |
| --- | --- | --- | --- |
| `list` | Toolbar → Header → Row × N → Pagination | Sort, filter, select, batch actions; row actions on hover | Dense scanning, many fields, comparison |
| `grid` | Toolbar → Responsive Grid → Media / Title / Meta / Actions | Responsive columns, hover actions, multi-select | Default for work display and media results |
| `detail` | Header → Main Content + Property Rail → Fixed Primary Action | Edit, save, copy, return; property rail independent | One record needs complete understanding or editing |
| `timeline` | Filter → Stage/Time Axis → Status Node → Event Card | Filter, expand failure reason, inline retry | Version or task progression |
| `gallery` | Filmstrip/Grid → Stable Ratio Media → Immersive Preview | Preview, keyboard navigation, zoom, metadata toggle | Image-led immersive review |

Mixed pages choose one primary template. Other templates may only appear as
nested sections; list, grid and timeline may not be peer-level primary layouts.

## Acceptance requirements

The implementation must provide:

1. One runtime token source and one owner per shared component stylesheet.
2. A typed state predicate used by home, canvas and chat submission paths.
3. A typed page-template registry exposing all five keys and the work-display
   default of `grid`.
4. Browser verification at `390`, `1099` and `1920` for landing, chat and
   settings, plus collapsed/expanded canvas rail states.
5. Verification for default, hover, pressed, focus, loading, success, failure
   and disabled states of primary controls.
6. No UI standard violations for direct Lucide imports, sub-12px text,
   non-integer metrics, duplicate token owners or unregistered page templates.
