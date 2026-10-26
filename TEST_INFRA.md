# E2E Test Infra: KK-Studio-2.0 Settings & Model Access Overhaul

## Test Philosophy
- **Opaque-box, requirement-driven**: Derived directly from `ORIGINAL_REQUEST.md` (R1-R5, AC1-AC4), testing user-observable behaviors without depending on internal implementation details.
- **Methodology**: 4-Tier test suite structure (Category-Partition, Boundary Value Analysis, Pairwise Combinatorial, Real-World Workloads).
- **Zero Dummy / Zero Facade**: Tests must bind to real production components, stores, and DOM attributes.

## Feature Inventory & Test Mapping
| # | Feature | Requirement Source | Tier 1 (Equivalence) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workloads) |
|---|---------|-------------------|:--------------------:|:-----------------:|:-----------------:|:------------------:|
| F1 | Radius Scale & Control 8px | R1, AC1 | 5 | 5 | ✓ | ✓ |
| F2 | Inset Grouped Cards & Fold Elimination | R1, AC1 | 5 | 5 | ✓ | ✓ |
| F3 | Sliding Pill Indicator & Spring Motion | R1, AC1 | 5 | 5 | ✓ | ✓ |
| F4 | Friendly Empty & Status Copy | R1, AC1 | 5 | 5 | ✓ | ✓ |
| F5 | 4-Quadrant Settings Architecture | R2, AC2 | 5 | 5 | ✓ | ✓ |
| F6 | Independent Software Update Page | R2, AC2 | 5 | 5 | ✓ | ✓ |
| F7 | Profile & Token Usage Dashboard | R2, AC2 | 5 | 5 | ✓ | ✓ |
| F8 | Shortcuts Management & Collision Guard | R2, AC2 | 5 | 5 | ✓ | ✓ |
| F9 | ccswitch 5-Channel Model Access UI | R3, AC3 | 5 | 5 | ✓ | ✓ |
| F10 | Provider Presets, Key & Sub-3s Probe | R3, AC3 | 5 | 5 | ✓ | ✓ |
| F11 | Unified Capability Aggregation | R4, AC3 | 5 | 5 | ✓ | ✓ |
| F12 | Anti-Regression & UI Token Lint Gate | R5, AC4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Location**: `tests/e2e-settings/`
  - `tests/e2e-settings/harness.ts` — Test runner harness and DOM/Store mock-free bindings
  - `tests/e2e-settings/tier1-feature-coverage.test.ts` — 60 Tier 1 tests (5 per feature)
  - `tests/e2e-settings/tier2-boundary-cases.test.ts` — 60 Tier 2 tests (5 per feature)
  - `tests/e2e-settings/tier3-cross-feature.test.ts` — 15 Tier 3 tests (Pairwise interactions)
  - `tests/e2e-settings/tier4-application-scenarios.test.ts` — 6 Tier 4 realistic workflow scenarios
- **Invocation**: `node --test tests/e2e-settings/*.test.ts`
- **Pass Semantics**: All test suites must complete with exit code 0.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Target Behavior |
|---|----------|--------------------|-----------------|
| S1 | Greenfield Setup & Provider Onboarding | F1, F5, F9, F10 | User opens settings -> navigates to 模型接入 -> selects Relay -> picks SiliconFlow preset -> inputs key -> tests latency in <3s -> fetches models -> enables Qwen & DeepSeek |
| S2 | Daily Token Quota & Profile Inspection | F2, F5, F7 | User navigates to 账号与用量 -> 个人主页 -> views 7-day stacked bar consumption -> inspects model distribution -> verifies quota indicators |
| S3 | Shortcut Customization & Collision Shield | F5, F8 | User opens 快捷键管理 -> attempts to bind reserved key (Ctrl+C) -> warned -> binds custom search key -> tests conflict with existing navigation -> conflict resolved |
| S4 | Software Update Check & Changelog View | F5, F6 | User opens 软件更新 page -> clicks 检查更新 -> observes 7-state progression -> views changelog notes -> toggles auto-update switch |
| S5 | Composer Capability-First Creation | F3, F11 | User in Composer opens model picker -> selects "对话 / 推理" -> chooses "自动调配" -> sends prompt -> verifies route to healthy provider without manual channel selection |
| S6 | Design Token Compliance & Gate Enforcement | F1, F2, F12 | Linter runs across codebase -> verifies no 999px buttons or inline radius; `check-ui-standards.mjs` exits cleanly |

## Coverage Thresholds
- Tier 1: ≥ 60 test cases (≥5 per feature across 12 features)
- Tier 2: ≥ 60 test cases (boundary and corner conditions)
- Tier 3: ≥ 12 test cases (pairwise cross-feature interactions)
- Tier 4: ≥ 6 realistic workflow scenarios
- **Total Minimum**: ≥ 138 test cases
