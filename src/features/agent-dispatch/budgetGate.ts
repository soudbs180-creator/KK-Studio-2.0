/**
 * KK Studio Agent Dispatcher — Budget Gate (Task 1.13).
 *
 * Pure functions only: decide whether a paid dispatch may auto-run or needs
 * total (L2) confirmation. No UI wiring, no schemas/mcp side effects.
 *
 * Rules (plan-addendum H.4 / board ph1-1.13):
 * - budgetClass=free → always allow
 * - remaining budget is 0 → always require confirmation for paid work
 * - remaining covers estimated cost → allow
 * - otherwise → needsConfirmation (over / insufficient budget)
 */

import type { CostTier } from "./dispatchTypes.ts";

/** Work-item billing class from planner / dispatcher. */
export type BudgetClass = "free" | "paid";

/** Machine-readable gate outcome reason. */
export type BudgetGateReason =
  | "free_pass"
  | "within_budget"
  | "zero_budget"
  | "insufficient_budget"
  | "user_confirmed";

/** Snapshot of the user-configured spend budget. */
export interface BudgetSnapshot {
  /**
   * Remaining spendable units (>= 0).
   * Prefer this field. When omitted, derived as max(0, limit - spent).
   */
  remaining?: number;
  /** Optional hard limit (same unit as spent / estimatedCost). */
  limit?: number;
  /** Optional already-spent amount. */
  spent?: number;
}

/** Input to the budget gate. */
export interface BudgetGateInput {
  /** free skips the gate; paid is checked against remaining budget. */
  budgetClass: BudgetClass;
  /** Current budget numbers. */
  budget: BudgetSnapshot;
  /**
   * Estimated cost of this work item in the same unit as budget.
   * When omitted, falls back to a coarse costTier estimate.
   */
  estimatedCost?: number;
  /** Coarse estimate source when estimatedCost is absent. */
  costTier?: CostTier;
  /** User already gave total (L2) confirmation for this paid action. */
  confirmed?: boolean;
}

/** Full decision returned by evaluateBudgetGate. */
export interface BudgetGateDecision {
  /** Whether dispatch may proceed without further confirmation UI. */
  allow: boolean;
  /** Whether total confirmation is required before dispatch. */
  needsConfirmation: boolean;
  reason: BudgetGateReason;
  /** Effective cost used for the comparison. */
  effectiveCost: number;
  /** Normalized remaining budget used for the comparison. */
  remaining: number;
}

/**
 * Coarse unit estimates by costTier when no priced estimate exists.
 * Units are abstract and only used for relative gate decisions.
 */
export const COST_TIER_ESTIMATE: Readonly<Record<CostTier, number>> = {
  free: 0,
  cheap: 1,
  standard: 5,
  premium: 20,
};

const FLOAT_TOLERANCE_BASE = Number.EPSILON;

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Coarse cost from costTier; defaults to standard when unknown. */
export function estimateCostFromTier(costTier?: CostTier): number {
  if (!costTier) return COST_TIER_ESTIMATE.standard;
  return COST_TIER_ESTIMATE[costTier];
}

/**
 * Normalize remaining budget from explicit remaining or limit/spent.
 * Invalid / missing numbers collapse to 0 (treat as depleted).
 */
export function resolveRemaining(budget: BudgetSnapshot): number {
  if (isNonNegativeFinite(budget.remaining)) {
    return budget.remaining;
  }

  if (isNonNegativeFinite(budget.limit) && isNonNegativeFinite(budget.spent)) {
    return Math.max(0, budget.limit - budget.spent);
  }

  if (isNonNegativeFinite(budget.limit) && budget.spent === undefined) {
    return budget.limit;
  }

  return 0;
}

/** Resolve the effective cost used by the gate. */
export function resolveEffectiveCost(input: BudgetGateInput): number {
  if (isNonNegativeFinite(input.estimatedCost)) {
    return input.estimatedCost;
  }
  return estimateCostFromTier(input.costTier);
}

function withinBudget(remaining: number, cost: number): boolean {
  const tolerance =
    FLOAT_TOLERANCE_BASE * Math.max(1, remaining, cost);
  return cost <= remaining + tolerance;
}

/**
 * Full gate evaluation. Pure and side-effect free.
 */
export function evaluateBudgetGate(input: BudgetGateInput): BudgetGateDecision {
  const remaining = resolveRemaining(input.budget);
  const effectiveCost = resolveEffectiveCost(input);

  if (input.budgetClass === "free") {
    return {
      allow: true,
      needsConfirmation: false,
      reason: "free_pass",
      effectiveCost,
      remaining,
    };
  }

  // Paid path: prior total confirmation unlocks dispatch.
  if (input.confirmed === true) {
    return {
      allow: true,
      needsConfirmation: false,
      reason: "user_confirmed",
      effectiveCost,
      remaining,
    };
  }

  // Acceptance: budget 0 → always require confirmation for paid work.
  if (remaining <= 0) {
    return {
      allow: false,
      needsConfirmation: true,
      reason: "zero_budget",
      effectiveCost,
      remaining,
    };
  }

  if (withinBudget(remaining, effectiveCost)) {
    return {
      allow: true,
      needsConfirmation: false,
      reason: "within_budget",
      effectiveCost,
      remaining,
    };
  }

  return {
    allow: false,
    needsConfirmation: true,
    reason: "insufficient_budget",
    effectiveCost,
    remaining,
  };
}

/** True when paid dispatch needs total (L2) confirmation. */
export function requireBudgetConfirm(input: BudgetGateInput): boolean {
  return evaluateBudgetGate(input).needsConfirmation;
}

/** True when dispatch may proceed without further confirmation. */
export function shouldAllow(input: BudgetGateInput): boolean {
  return evaluateBudgetGate(input).allow;
}
