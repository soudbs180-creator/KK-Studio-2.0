# Project: KK-Studio-2.0 Settings & Model Access Overhaul

## Architecture
- **Layer 1: Design Tokens & Visual Baseline (R1, R5)**:
  - Strict radius scales: 8px controls (`var(--kk-radius-control)`), 16-20px cards (`var(--kk-radius-card)`), 10px popovers. Elimination of 999px buttons.
  - Inset Grouped Card component pattern: outer rounded surface, label/helper/action grid, subtle 1px dividers.
  - Motion: Spring physical curves (`cubic-bezier(0.34, 1.56, 0.64, 1)`), sliding pill indicators, `scale(0.98)` active micro-scale.
  - Static Design Token Linting gate blocking hardcoded 999px radius and inline style radius.
- **Layer 2: Settings Reorganization & Specialized Pages (R2)**:
  - 4 quadrants: 软件系统 (通用, 快捷键, 软件更新), 账号与用量 (个人主页, 套餐与积分), 核心功能 (模型接入, 记忆, 扩展, 网络), 安全与数据 (数据管理, 安全中心).
  - Independent Software Update page (`AppUpdatePage.tsx`) with 7-state machine, version indicator (`2.1.37`), changelog viewer, auto-update switches.
  - Profile Token Usage Dashboard (`ProfileUsagePage.tsx`) with SVG daily consumption trends, model breakdown, 4 KPI cards, backed by `tokenUsageStore`.
  - Global Shortcuts Management (`ShortcutsManagementPage.tsx`) with keystroke recorder, 3-barrier conflict detection, standard defaults (`Ctrl+K`, `Ctrl+N`, `Ctrl+,`, `Ctrl+Enter`).
- **Layer 3: ccswitch Model Access Architecture (R3)**:
  - 5 major channels: 官方 API 直连 (`official`), API 供应商中转 (`relay`), 账号授权 (`oauth`), CLI 直连 (`cli`), 本地模型 (`local`).
  - Provider presets auto-fill (Base URL, protocol, docs link; adding 12ai, llama-cpp, fixing SiliconFlow).
  - API Key field with eye toggle, clipboard paste, and credential encryption security notice.
  - Sub-3s lightweight latency probe with millisecond display and HTTP status.
  - Independent `/v1/models` catalog fetch with enable/disable checkboxes, set as default, and manual model ID additions.
- **Layer 4: Unified Capability Aggregation in Composer (R4)**:
  - Composer `ModelPickerMenu` presents Capability-First choices (Chat & Reasoning vs Image Generation).
  - Eliminates manual channel switching; auto-routing delegates to `ai-gateway/scheduler.ts` with health scoring and priority failover.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Radius Scale & Token Normalization | Fix `--kk-button-radius` to 8px; eliminate 999px buttons in settings & composer | M1 | R1, Survey E1 |
| F2 | Inset Grouped Cards & Fold Elimination | Replace `<details>` fold arrows (`▶`) with `SettingsCardGroup` (16-20px radius) | M1 | R1, Survey E1 |
| F3 | Sliding Pill Indicator & Spring Motion | Single-element absolute sliding pill with spring curve (`cubic-bezier(0.34, 1.56, 0.64, 1)`) | M1 | R1, Survey E1 |
| F4 | Friendly Status & Empty State Copy | Replace 40+ mechanical phrases ("尚未接入", "尚未测试") with warm, actionable copy | M1 | R1, Survey E1 |
| F5 | 4-Quadrant Settings Architecture | Reorganize navigation into 4 quadrants (软件系统, 账号与用量, 核心功能, 安全与数据) | M2 | R2, Survey E2 |
| F6 | Independent Software Update Page | Dedicated page with version, 7-state check machine, changelog viewer, auto-update | M2 | R2, Survey E2 |
| F7 | Profile & Token Usage Dashboard | Local `tokenUsageStore` + SVG trend visualization, model breakdown, 4 KPI cards | M2 | R2, Survey E2 |
| F8 | Shortcuts Management & Conflict Detection | `shortcutsRegistry`, `KeystrokeRecorder`, 3-barrier collision detection, standard defaults | M2 | R2, Survey E2 |
| F9 | ccswitch 5-Channel Model Access UI | 5 channels (`official`, `relay`, `oauth`, `cli`, `local`) in `modelChannels.ts` & presets | M3 | R3, Survey E3 |
| F10 | Provider Presets, API Key & Latency Probe | Preset auto-fill, API Key eye/paste/encryption, <3s ms latency probe, catalog management | M3 | R3, Survey E3 |
| F11 | Unified Capability Aggregation in Composer | Capability-first model selection (Chat/Reasoning vs Image Gen) with auto-routing | M4 | R4, Survey E3 |
| F12 | Anti-Regression & Design Token Linting Gate | Static check in `check-ui-standards.mjs` against 999px / inline styles; Triple Gates | M1 | R5, Survey E1 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design Tokens, Aesthetics Baseline & Lint Gate | F1, F2, F3, F4, F12 (Tokens, Inset Cards, Spring, Copy, UI Lint) | none | IN_PROGRESS (ebd53593) |
| M2 | Settings Architecture & Specialized Modules | F5, F6, F7, F8 (4 Quadrants, AppUpdate, Profile/Usage, Shortcuts) | M1 interfaces | IN_PROGRESS (074f1292) |
| M3 | Model Access UI & Probing Architecture | F9, F10 (ccswitch 5 Channels, Presets, Key paste, <3s probe, Catalog) | M1 interfaces | IN_PROGRESS (bd2173ec) |
| M4 | Unified Capability Aggregation in Composer | F11 (Capability-first picker, Auto-routing, Scheduler integration) | M3 channels | IN_PROGRESS (a7004e52) |
| M-E2E | E2E Testing Suite Track | Tiers 1-4 opaque-box test suite covering R1-R5 & AC1-AC4 | none | IN_PROGRESS (0d89bb52) |
| M-FINAL | Final Milestone: 100% E2E Pass + Tier 5 Hardening | Pass all E2E tests + adversarial coverage hardening | M1-M4, M-E2E | PLANNED |

## Interface Contracts
### M1 ↔ M2, M3
- `SettingsCardGroup`: Exported from `src/components/settings/SettingsCardGroup.tsx`:
  - `SettingsCardGroup({ title?: string, description?: string, children: ReactNode })`
  - `SettingsCardRow({ label: string, description?: string, control: ReactNode, danger?: boolean })`
- `SlidingPillIndicator`: Exported from `src/components/ui/SlidingPillIndicator.tsx`:
  - `SlidingPillIndicator({ activeRect: DOMRect | null, containerRef: RefObject<HTMLElement> })`
- Design tokens: `--kk-radius-control: 8px`, `--kk-radius-card: 16px`, `--motion-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`

### M2 ↔ App & Navigation
- `SETTINGS_NAV_GROUPS`: Exported from `src/components/settings/SettingsSectionData.ts`:
  - 4 groups: `软件系统`, `账号与用量`, `核心功能`, `安全与数据`.
  - Sections: `["general", "shortcuts", "updates"]`, `["profile", "plans"]`, `["models", "memory", "extensions", "network"]`, `["data", "security"]`.
- `tokenUsageStore`:
  - `recordUsage({ provider: string, model: string, promptTokens: number, completionTokens: number, totalTokens: number, timestamp: number })`
  - `getDailySummaries(days: number): DailyUsageSummary[]`
  - `getModelBreakdown(): Record<string, number>`
- `shortcutsRegistry`:
  - `registerShortcut(shortcut: ShortcutDefinition): boolean`
  - `checkConflict(candidate: Keybinding, scope: string): ConflictResult`

### M3 ↔ M4
- `ProviderChannel`: Extended to `z.enum(["official", "relay", "oauth", "cli", "local"])`.
- `CatalogModel`:
  - `{ id: string, name: string, capability: "chat" | "reasoning" | "image" | "multimodal", enabled: boolean, isDefault?: boolean }`
- `modelCatalogStore`:
  - `getEnabledModels(capability?: ModelCapability): CatalogModel[]`
  - `getDefaultModel(capability: ModelCapability): CatalogModel | null`

## Code Layout
- `src/styles/tokens.css` — Global CSS custom properties (M1)
- `src/styles/motion.css` — Animation curves and transforms (M1)
- `src/components/settings/SettingsCardGroup.tsx` — Inset grouped card container & row (M1)
- `src/components/ui/SlidingPillIndicator.tsx` — Dynamic spring sliding capsule indicator (M1)
- `scripts/check-ui-standards.mjs` — Static UI governance & token gate (M1)
- `src/components/settings/SettingsSectionData.ts` — 4-quadrant settings navigation schema (M2)
- `src/components/settings/SettingsPanel.tsx` — Settings root view with sliding pill (M2)
- `src/components/settings/AppUpdatePage.tsx` — Dedicated update page (M2)
- `src/components/settings/ProfileUsagePage.tsx` — Token usage & quota dashboard (M2)
- `src/components/settings/ShortcutsManagementPage.tsx` — Keystroke recorder & conflict engine (M2)
- `src/features/usage/tokenUsageStore.ts` — Persisted token telemetry store (M2)
- `src/features/settings/shortcutsRegistry.ts` — Keyboard shortcut registry & collision detector (M2)
- `src/domain/modelChannels.ts` — 5-channel model access domain definitions (M3)
- `src/domain/providerPresets.ts` — Presets for official, relay, oauth, cli, local runtimes (M3)
- `src/components/settings/ModelAccessSettings.tsx` — ccswitch-inspired 5-channel settings (M3)
- `src/components/settings/ProviderApiKeyField.tsx` — Eye toggle, clipboard paste, credential hints (M3)
- `src/components/settings/testProviderConnection.ts` — Sub-3s real-time latency probe (M3)
- `src/components/settings/fetchProviderModels.ts` — Independent `/v1/models` catalog fetch (M3)
- `src/features/models/modelCatalogStore.ts` — Catalog state, model toggles, default flags (M3)
- `src/components/ModelPickerMenu.tsx` — Capability-first Composer picker (M4)
- `src/features/models/capabilityAggregation.ts` — Capability mapping and auto-routing (M4)
- `tests/e2e-settings/**` — Opaque-box E2E test suite (M-E2E)
