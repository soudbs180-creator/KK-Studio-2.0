/**
 * Unit tests for Budget Gate (Task 1.13).
 * Covers: budget 0 → always confirm; sufficient remaining → allow;
 * free pass; over-budget confirmation; confirmed unlock.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  COST_TIER_ESTIMATE,
  estimateCostFromTier,
  evaluateBudgetGate,
  requireBudgetConfirm,
  resolveRemaining,
  shouldAllow,
  type BudgetGateInput,
} from "../../src/features/agent-dispatch/budgetGate.ts";

function paid(overrides: Partial<BudgetGateInput> = {}): BudgetGateInput {
  return {
    budgetClass: "paid",
    budget: { remaining: 10 },
    estimatedCost: 3,
    ...overrides,
  };
}

test("budget 0 → requireBudgetConfirm true and shouldAllow false", () => {
  const input = paid({
    budget: { remaining: 0 },
    estimatedCost: 1,
  });

  assert.equal(requireBudgetConfirm(input), true);
  assert.equal(shouldAllow(input), false);

  const decision = evaluateBudgetGate(input);
  assert.equal(decision.needsConfirmation, true);
  assert.equal(decision.allow, false);
  assert.equal(decision.reason, "zero_budget");
  assert.equal(decision.remaining, 0);
});

test("budget 0 always confirms even when estimatedCost is 0", () => {
  const input = paid({
    budget: { remaining: 0 },
    estimatedCost: 0,
  });

  assert.equal(requireBudgetConfirm(input), true);
  assert.equal(shouldAllow(input), false);
  assert.equal(evaluateBudgetGate(input).reason, "zero_budget");
});

test("sufficient remaining → shouldAllow true and no confirmation", () => {
  const input = paid({
    budget: { remaining: 100 },
    estimatedCost: 12,
  });

  assert.equal(shouldAllow(input), true);
  assert.equal(requireBudgetConfirm(input), false);

  const decision = evaluateBudgetGate(input);
  assert.equal(decision.allow, true);
  assert.equal(decision.needsConfirmation, false);
  assert.equal(decision.reason, "within_budget");
  assert.equal(decision.effectiveCost, 12);
  assert.equal(decision.remaining, 100);
});

test("remaining exactly equals cost → allow (within tolerance)", () => {
  const input = paid({
    budget: { remaining: 5 },
    estimatedCost: 5,
  });

  assert.equal(shouldAllow(input), true);
  assert.equal(requireBudgetConfirm(input), false);
  assert.equal(evaluateBudgetGate(input).reason, "within_budget");
});

test("insufficient remaining → needs confirmation", () => {
  const input = paid({
    budget: { remaining: 2 },
    estimatedCost: 10,
  });

  assert.equal(requireBudgetConfirm(input), true);
  assert.equal(shouldAllow(input), false);
  assert.equal(evaluateBudgetGate(input).reason, "insufficient_budget");
});

test("free budgetClass always allows regardless of remaining", () => {
  const input: BudgetGateInput = {
    budgetClass: "free",
    budget: { remaining: 0 },
    estimatedCost: 99,
  };

  assert.equal(shouldAllow(input), true);
  assert.equal(requireBudgetConfirm(input), false);
  assert.equal(evaluateBudgetGate(input).reason, "free_pass");
});

test("confirmed paid unlocks zero or insufficient budget", () => {
  const zero = paid({
    budget: { remaining: 0 },
    estimatedCost: 5,
    confirmed: true,
  });
  assert.equal(shouldAllow(zero), true);
  assert.equal(requireBudgetConfirm(zero), false);
  assert.equal(evaluateBudgetGate(zero).reason, "user_confirmed");

  const over = paid({
    budget: { remaining: 1 },
    estimatedCost: 50,
    confirmed: true,
  });
  assert.equal(shouldAllow(over), true);
  assert.equal(requireBudgetConfirm(over), false);
});

test("resolveRemaining derives from limit - spent when remaining omitted", () => {
  assert.equal(resolveRemaining({ limit: 20, spent: 7 }), 13);
  assert.equal(resolveRemaining({ limit: 0, spent: 0 }), 0);
  assert.equal(resolveRemaining({ limit: 10 }), 10);
  assert.equal(resolveRemaining({}), 0);
});

test("limit/spent form: depleted limit asks confirmation; room allows", () => {
  const depleted = paid({
    budget: { limit: 0, spent: 0 },
    estimatedCost: 1,
  });
  assert.equal(requireBudgetConfirm(depleted), true);
  assert.equal(shouldAllow(depleted), false);

  const room = paid({
    budget: { limit: 50, spent: 10 },
    estimatedCost: 5,
  });
  assert.equal(shouldAllow(room), true);
  assert.equal(requireBudgetConfirm(room), false);
  assert.equal(evaluateBudgetGate(room).remaining, 40);
});

test("costTier coarse estimate used when estimatedCost omitted", () => {
  assert.equal(estimateCostFromTier("cheap"), COST_TIER_ESTIMATE.cheap);
  assert.equal(estimateCostFromTier("premium"), COST_TIER_ESTIMATE.premium);
  assert.equal(estimateCostFromTier(), COST_TIER_ESTIMATE.standard);

  const allowCheap = paid({
    budget: { remaining: COST_TIER_ESTIMATE.cheap },
    estimatedCost: undefined,
    costTier: "cheap",
  });
  assert.equal(shouldAllow(allowCheap), true);

  const blockPremium = paid({
    budget: { remaining: COST_TIER_ESTIMATE.cheap },
    estimatedCost: undefined,
    costTier: "premium",
  });
  assert.equal(requireBudgetConfirm(blockPremium), true);
  assert.equal(evaluateBudgetGate(blockPremium).effectiveCost, COST_TIER_ESTIMATE.premium);
});
