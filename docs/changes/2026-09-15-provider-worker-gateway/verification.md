# Verification

## Automated checks

Executed in `D:\kk-studio-next` with Node `D:\tools\node-v24.20.0-win-x64\node.exe` / npm PATH:

- `npm run verify` — **passed**: typecheck; 90/90 Node unit tests; UI standards 115 files / 0 violations; Prettier all matched; production Playwright **130/130 passed**.
- `npm run build` — **passed**; Vite production artifact `dist/assets/index-Dcy-FoCE.js` generated. Vite prints the existing Zod annotation warning and bundle-size advisory; neither changes exit status.
- `npm run client:check` — **passed** (`cargo check`, `kk-studio v2.0.0`).
- `npm run test:gateway` — **passed**: 56/56 generation-server tests (SQLite, assets, adapters, restart, HTTP runtime, Webhook); included by the 90 test total.
- Real provider/server suite — **30/30 passed**: OpenAI-compatible and Gemini host adapters, local ComfyUI, 401/403/invalid_scope/project_disabled, 429 seconds/date Retry-After, bounded 503, network uncertainty, provider temporary URL, cancellation, 1/4/20/100 output HTTP Gateway runs, private asset ownership, restart and secret canaries.

Tests use fake local HTTP providers and a valid 1×1 PNG. No paid API, managed account, personal subscription, or real credential is used.

## Browser and desktop runtime evidence

- Dev server: started with `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --strictPort`; `http://127.0.0.1:1421/` reported `data-runtime-mode=development`, `data-runtime-entry=src/main.tsx`, route `landing`, scripts `/@vite/client` and `/src/main.tsx`, no page errors.
- Production preview: started with `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`; `http://127.0.0.1:1423/` reported `data-runtime-mode=production`, `data-runtime-entry=src/main.tsx`, route `landing`, script `/assets/index-Dcy-FoCE.js`, no page errors. The 24 focused creation/frontend tests against 1423 passed; the final `npm run verify` ran 130/130 against its own fresh strict-port preview.
- Tauri: after `npm run client:build -- --no-bundle`, release executable `src-tauri/target/release/kk-studio.exe` was rebuilt at 2026-09-15 17:59:21 (+08). A fresh release process loaded `http://tauri.localhost/`; WebView2 CDP evidence reports `runtimeMode=production`, `runtimeEntry=src/main.tsx`, script `http://tauri.localhost/assets/index-Dcy-FoCE.js`, route `landing`, viewport 1920×1080 DPR 1.5. Evidence: `docs/evidence/provider-worker-2026-09-15/runtime.json`, `tauri-runtime.json`, `tauri-release.png`.

## Security evidence

- SQLite schema and provider request logs do not have credential, refresh-token, proxy-credential, request-body, signed-URL or URL-query columns.
- `main.ts` accepts only non-secret config metadata and environment-variable names; it reads secret values into process memory and deletes them from `process.env`; client routes only accept connection IDs and task input.
- Provider credentials are added to outbound headers in memory; Gemini uses `x-goog-api-key`, OpenAI-compatible uses Authorization, and ComfyUI receives no key. Errors are bounded codes; provider response bodies and URLs are not logged.
- Object storage verifies full SHA-256 on write/read, uses private hash paths, and HTTP asset access requires `asset_owners`. Browser clients receive `assetId` / `/v1/assets/:assetId`, never a provider URL.
- Session authenticator stores only SHA-256 token hashes in its in-memory map. Production deployment must put the service behind a trusted HTTPS identity proxy; example config contains environment variable names, not values.

## Deliberate limitations / boundaries

- The current frontend UI continues to label platform-backed and unconfigured provider flows as Prototype. The new backend is exposed through `GenerationJobClient`; wiring existing CreationTask UI to a deployment-specific Gateway URL is intentionally not inferred from an environment variable.
- Server asset integrity currently accepts PNG only. JPEG/WebP/GIF are rejected with a safe error until a complete decoder is added.
- Server credit units are an administrator-set internal per-output tariff. Actual provider token/GPU/currency billing is not fabricated; deployment supplies the billing adapter.
- Tauri release evidence verifies the production UI entry and artifact freshness. It does not claim that a Gateway process is bundled into the Tauri binary or that a paid provider is configured.
