# Verification

## Static checks

All checks below ran in `D:\kk-studio-next` on branch `codex/feat/minimax-deep-replica-root`:

- `node node_modules/typescript/bin/tsc --noEmit` — PASS.
- `node node_modules/eslint/bin/eslint.js src tests scripts eslint.config.mjs playwright.config.ts vite.config.ts --max-warnings 0` — PASS.
- `node scripts/check-ui-standards.mjs` — PASS, 128 files / 0 violations.
- `node node_modules/prettier/bin/prettier.cjs --check ...` — PASS.
- `node --test tests/unit/*.test.ts` — PASS, 186 tests / 0 failures.
- `node node_modules/typescript/bin/tsc -b; node node_modules/vite/bin/vite.js build` — PASS. Vite emitted `dist/assets/index-BiZ99hFN.js` and `dist/assets/index-AXhXH-RD.css`; only the existing zod annotation and chunk-size warnings remained.
- `node scripts/check-governance.mjs` — PASS after writing the current task view.
- `cargo check --manifest-path src-tauri/Cargo.toml` — PASS, with the repository's existing three dead-code warnings; this is a compile check only, not a Tauri release/runtime acceptance.

## Web runtime

The candidate was served with `node node_modules/vite/bin/vite.js --host 127.0.0.1` at `http://127.0.0.1:1421/` in Vite development mode. The source chain is `src/main.tsx -> src/App.tsx -> SkillsPage`, with `SkillPageControls` and `ConnectorCatalog`; the MCP settings chain is `ConnectionSettings -> McpSettings -> McpServerCard`.

Playwright/Edge exercised the real page without triggering generation:

1. Sidebar `Skill` → `连接器` → `添加连接器` opened one dialog. Pressing Escape closed it (`before=1`, `after=0`) and returned focus to `添加连接器`.
2. `自定义连接器` opened MCP settings. Saving `http://remote.example.test/mcp` returned the visible HTTPS validation error `远程 MCP 必须使用 HTTPS；HTTP 仅允许本机地址。`; pressing Escape closed the settings overlay.
3. `新建本地 Skill` opened one editor dialog. Pressing Escape closed it (`before=1`, `after=0`).
4. Evidence screenshots are [connector-detail.png](../../evidence/minimax-deep-audit-2026-09-21/connector-detail.png) and [skills-after-escape.png](../../evidence/minimax-deep-audit-2026-09-21/skills-after-escape.png). Machine-readable route and result data are in [runtime.json](../../evidence/minimax-deep-audit-2026-09-21/runtime.json).

## MiniMax audit evidence

The installed app at `C:\Users\Administrator\AppData\Local\Programs\MiniMax Design\current` was opened and inspected read-only. The audit covered the project library, start composer, Skill import/create/detail flows, connector catalog and not-installed state, ComfyUI workflow import/detail/download warning, File/Window/Help menus, settings/provider/network/memory/IM/Comfy sections, and bundled gateway/MCP/plugin manifests. No membership generation, login, external upload, connector installation, or 40GB download was triggered.

## Scope limits

This is a Web development verification. Tauri `tauri.localhost` release was not rebuilt or launched for this candidate, and no real cloud provider, paid MiniMax generation, third-party connector install, OAuth, or external service authorization was performed. The task therefore remains `PARTIAL` in the ledger. The current screenshots are behavior evidence from the real Web candidate; they do not establish full Figma parity for newly added Skill/Connector frames.
