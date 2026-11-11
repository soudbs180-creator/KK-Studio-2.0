# Dual-Track E2E Test Infrastructure: KK Studio 2.0

## 1. Test Architecture & Methodology

The KK Studio 2.0 E2E Test Suite adheres strictly to the **Dual-Track E2E Testing Methodology** (Requirement-driven, Opaque-box):
- **Opaque-Box Contract Verification**: Tests validate observable behaviors, state transitions, mathematical formulas, and interface contracts specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`.
- **Zero Dummy / Zero Facade Policy**: Every test exercises genuine contracts, domain state machines, validation schemas, or algorithmic models.
- **4-Tier Structured Test Hierarchy**:
  - **Tier 1 — Feature Coverage (≥5 tests per feature)**: Happy-path baseline tests for each of the 23 inventoried features in isolation.
  - **Tier 2 — Boundary & Corner Cases (≥5 tests per feature)**: Limits, empty inputs, max payloads, negative/error inputs, and graceful error handling.
  - **Tier 3 — Cross-Feature Interactions (Pairwise Combinations)**: Multi-pillar integration scenarios (Gateway + Agent, Canvas + Storyboard, Memory + Governance, etc.).
  - **Tier 4 — Real-World Application Scenarios (≥5 full end-to-end workflows)**: Complex multi-step user creation workflows.

---

## 2. Feature Inventory & Coverage Matrix (23 Features)

| # | Feature | Pillar / Milestone | Tier 1 (Happy) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenarios) | Status |
|---|---------|-------------------|:--------------:|:-----------------:|:-----------------:|:------------------:|:------:|
| 1 | Figma Surface & Token Parity | M1 (UI Grounding) | 5 | 5 | ✓ | ✓ | Active |
| 2 | Foundational UI Primitive Layer | M1 (UI Grounding) | 5 | 5 | ✓ | ✓ | Active |
| 3 | 124 Atomic Lucide Iconography | M1 (UI Grounding) | 5 | 5 | ✓ | ✓ | Active |
| 4 | 15 Standardized Aspect Ratios | M1 (UI Grounding) | 5 | 5 | ✓ | ✓ | Active |
| 5 | Mobile Chat-Only Viewport Parity | M1 (UI Grounding) | 5 | 5 | ✓ | ✓ | Active |
| 6 | Automated Aesthetic Governance | M1 (UI Grounding) | 5 | 5 | ✓ | ✓ | Active |
| 7 | Provider Gateway Cooldown Queue | M2 (Gateway) | 5 | 5 | ✓ | ✓ | Active |
| 8 | Dual-Stickiness TTL | M2 (Gateway) | 5 | 5 | ✓ | ✓ | Active |
| 9 | Extension Runtime Bridge | M2 (Extensions) | 5 | 5 | ✓ | ✓ | Active |
| 10 | Router + Worker Multi-Agent Engine | M3 (Agent) | 5 | 5 | ✓ | ✓ | Active |
| 11 | Scoped Mandates & Lifecycle Tickets | M3 (Agent) | 5 | 5 | ✓ | ✓ | Active |
| 12 | PreInvocation Security Hooks & Statusline | M3 (Agent) | 5 | 5 | ✓ | ✓ | Active |
| 13 | Semantic Ontology Knowledge Graph | M3 (Memory) | 5 | 5 | ✓ | ✓ | Active |
| 14 | Pre-Flight Answerability Pre-Validation | M3 (Memory) | 5 | 5 | ✓ | ✓ | Active |
| 15 | Autonomous Canvas Agent Ops | M4 (Canvas) | 5 | 5 | ✓ | ✓ | Active |
| 16 | Canvas 34 Zod Operations & MCP Server | M4 (Canvas) | 5 | 5 | ✓ | ✓ | Active |
| 17 | Hierarchical Blueprint Canvas Mapping | M4 (Canvas) | 5 | 5 | ✓ | ✓ | Active |
| 18 | Pure-Client Video Shot Breakdown (逐帧拉片) | M5 (Production) | 5 | 5 | ✓ | ✓ | Active |
| 19 | Storyboard Multi-Agent Pipeline & Continuity | M5 (Production) | 5 | 5 | ✓ | ✓ | Active |
| 20 | In-Prompt Reference Mention Parsing | M5 (Production) | 5 | 5 | ✓ | ✓ | Active |
| 21 | 3D Director Desk & Physical Camera Optics | M5 (Production) | 5 | 5 | ✓ | ✓ | Active |
| 22 | Full E2E Test Suite Validation | M6 (Hardening) | 5 | 5 | ✓ | ✓ | Active |
| 23 | Adversarial Coverage Hardening | M6 (Hardening) | 5 | 5 | ✓ | ✓ | Active |
| **Total** | **All 23 Features** | **Full Scope** | **115** | **115** | **16** | **6** | **252 Tests** |

---

## 3. Test Suite Directory Layout

```
D:/kk-studio/KK-Studio-2.0/tests/e2e/
├── harness.ts                         # Unified contracts, validators, state machines & models
├── tier1_features_m1_m2.test.ts       # Tier 1 Happy Path: Features 1 - 9
├── tier1_features_m3_m4.test.ts       # Tier 1 Happy Path: Features 10 - 17
├── tier1_features_m5_m6.test.ts       # Tier 1 Happy Path: Features 18 - 23
├── tier2_boundaries_m1_m2.test.ts     # Tier 2 Boundary / Error: Features 1 - 9
├── tier2_boundaries_m3_m4.test.ts     # Tier 2 Boundary / Error: Features 10 - 17
├── tier2_boundaries_m5_m6.test.ts     # Tier 2 Boundary / Error: Features 18 - 23
├── tier3_cross_feature.test.ts        # Tier 3 Pairwise Cross-Feature Interactions
└── tier4_scenarios.test.ts            # Tier 4 Real-World End-to-End Scenarios
```

---

## 4. Test Runner Commands

```bash
# 1. Run full E2E Test Suite (All 4 Tiers, 252 tests)
node --import ./tests/support/public-entry-loader.mjs --test tests/e2e/*.test.ts

# 2. Run Tier 1 Feature Coverage
node --import ./tests/support/public-entry-loader.mjs --test tests/e2e/tier1_*.test.ts

# 3. Run Tier 2 Boundary Cases
node --import ./tests/support/public-entry-loader.mjs --test tests/e2e/tier2_*.test.ts

# 4. Run Tier 3 & Tier 4 Scenarios
node --import ./tests/support/public-entry-loader.mjs --test tests/e2e/tier3_*.test.ts tests/e2e/tier4_*.test.ts

# 5. Full repository verification gate
npm run typecheck
npm run lint
npm test
```

---

## 5. Tier 4 Real-World Scenarios Specification

1. **Scenario 1 (Novel Script to Production Pipeline)**:
   Novel synopsis -> multi-agent storyboard breakdown (Writer/Director/Reviewer) -> continuity enforcement -> shot detection keyframes -> 34 Zod canvas node placement -> physical optics prompt generation.
2. **Scenario 2 (Resilient Gateway Failover Under Extreme Load)**:
   High-concurrency requests -> primary provider rate limit (429) -> `WaitingCandidate` cooldown queuing -> automatic failover to fallback key -> prompt cache TTL stickiness isolation.
3. **Scenario 3 (Autonomous Agent Mandate & Memory Execution)**:
   Router session gate pre-eval -> immutable `Mandate` issuance -> `Ticket` lifecycle tracking -> `OntologyGraph` term verification -> PreInvocation security hook filtering.
4. **Scenario 4 (Multi-Modal Canvas & Blueprint Architecture)**:
   Import `architecture.json` -> `FloorplanCanvasAdapter` hierarchical layout -> autonomous `set_viewport` / `select_nodes` -> ComfyUI node link generation.
5. **Scenario 5 (Mobile Chat Viewport Strict Isolation)**:
   Mobile viewport detection (≤767px) -> canvas screen strictly disabled -> single-column conversation composer -> responsive token styling.
6. **Scenario 6 (Adversarial Security & Aesthetic Governance Audit)**:
   Prompt injection defense -> circular graph traversal trap defense -> 9-pass unslop redline rules check -> 4px grid rhythm enforcement.
