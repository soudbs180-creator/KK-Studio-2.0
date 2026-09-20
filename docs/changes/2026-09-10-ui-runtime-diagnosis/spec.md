# Runtime and UI specification

## Source ownership

- Project: D:/kk-studio-next; one Vite app, not a packages-based monorepo.
- Web entry: index.html -> src/main.tsx -> src/App.tsx.
- URL / uses App state, not path-based React Router routes.
- landing -> StartPage; workspace -> Canvas and ConversationPanel.
- Shared shell -> TopBar and Sidebar; Sidebar -> SidebarIcon, SidebarProjectGroup -> SidebarProjectEntry, AccountPopup.
- projects / skills / comfyui -> LibraryPage. Search / favorites / likes -> CatalogPanel modal.
- CollectionPage and SearchPage are not referenced by the active App navigation.
- Desktop: Tauri 2, devUrl http://127.0.0.1:1421, frontendDist ../dist. The production executable embeds built assets rather than reading live src files.

## Latest measured contracts

At 1920 x 1080: expanded sidebar 291; collapsed sidebar 70; workspace (291,45,1619,1025), or (70,45,1840,1025). Panel (1430,61,470,998), solid #161616, 1px #3c3c3c border, 20px radius. Header (1450.5,78,426,24). Composer (1450,844,426,170), #1f1f1f, radius20. Textarea (1463,857,400,64), type10/12. Action row (1463,977,400,24); pills22 high; add/send24; microphone22. Toolbar (719,998,294,50), retained when sidebar collapses. Task trigger (310,72,93,30).

Sidebar motion: 300ms linear width, Figma text easing cubic-bezier(.5,0,.5,1), reduced-motion override. User-triggered expansion replaces the design demonstration's repeating timeline; this trigger adaptation is an engineering decision, not copied Figma behavior.

The user explicitly requested preservation of search and keyboard interactions. A search control remains in the collapsed rail at (25,919,20,20). This is an intentional functional supplement absent from Frame 410:67357. Narrow layouts retain larger interactive controls rather than scaling 10px text into phone widths.

## CSS ownership

Load global.css and ui-tokens.css from main, and shell/page overrides once from App after legacy workspace/responsive styles. ConversationPanel, Sidebar and AccountPopup must not import these page-level styles again. ES module deduplication does not move a stylesheet to the later import position.

Follow Figma -> Design Tokens -> Shared Components -> Actual Source -> Browser Verification. See docs/UI_SPEC.md for token and component ownership. Do not invent semantic hover/active states from unnamed Figma Variant1/Variant2 labels.
