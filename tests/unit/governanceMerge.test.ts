import assert from "node:assert/strict";
import test from "node:test";
import {
  REQUIRED_CHECKS,
  activationReadbackPass,
  disablePullRequestAutoMerge,
  evaluateMergeEligibility,
  enablePullRequestAutoMerge,
  readRulesetConfig,
  rulesetReadbackPass,
} from "../../scripts/governance/merge-auto.mjs";
import {
  evaluateMainHealth,
  incidentBody,
  pauseAfterMainFailure,
} from "../../scripts/governance/merge-main-guard.mjs";
import { validateMergeGroup } from "../../scripts/governance/merge-group-gate.mjs";

const ruleSet = {
  enforcement: "active",
  conditions: { ref_name: { include: ["refs/heads/main"] } },
  rules: [
    { type: "merge_queue", parameters: { merge_method: "SQUASH" } },
    {
      type: "required_status_checks",
      parameters: {
        strict_required_status_checks_policy: true,
        required_status_checks: REQUIRED_CHECKS.map((context) => ({ context })),
      },
    },
    {
      type: "pull_request",
      parameters: {
        required_approving_review_count: 1,
        dismiss_stale_reviews_on_push: true,
        require_last_push_approval: true,
      },
    },
  ],
};

function fixture(overrides = {}) {
  const head = "a".repeat(40);
  const config = readRulesetConfig({ ruleset: ruleSet });
  return {
    pullRequest: {
      state: "open",
      draft: false,
      base: { ref: "main" },
      head: { sha: head },
      user: { login: "author" },
    },
    rulesetConfig: config,
    checks: REQUIRED_CHECKS.map((name) => ({
      name,
      status: "completed",
      conclusion: "success",
      head_sha: head,
    })),
    reviews: [
      {
        user: { login: "independent" },
        state: "APPROVED",
        commit_id: head,
        submitted_at: "2026-10-09T00:00:00Z",
      },
    ],
    threads: [{ isResolved: true }],
    mainHealthy: true,
    baseMatchesMain: true,
    activation: true,
    ...overrides,
  };
}

test("ruleset readback requires active main merge queue, squash, strict checks and stale independent review policy", () => {
  const config = readRulesetConfig({ ruleset: ruleSet });
  assert.equal(rulesetReadbackPass(config), true);
  assert.equal(rulesetReadbackPass({ ...config, squash: false }), false);
  assert.equal(
    rulesetReadbackPass({ ...config, staleReviewDismissal: false }),
    false,
  );
  assert.equal(
    rulesetReadbackPass({ ...config, requiredChecks: false }),
    false,
  );
});

test("ruleset readback does not treat an unknown default branch as main", () => {
  const config = readRulesetConfig({
    ruleset: {
      ...ruleSet,
      conditions: { ref_name: { include: ["~DEFAULT_BRANCH"] } },
    },
  });
  assert.equal(config.targetMain, false);
  assert.equal(rulesetReadbackPass(config), false);
});

test("auto-merge gate fails closed for missing, stale or unresolved evidence", () => {
  assert.equal(evaluateMergeEligibility(fixture()).ok, true);
  assert.match(
    evaluateMergeEligibility(fixture({ activation: false })).reasons.join(),
    /activation/,
  );
  assert.match(
    evaluateMergeEligibility(
      fixture({ threads: [{ isResolved: false }] }),
    ).reasons.join(),
    /threads/,
  );
  assert.match(
    evaluateMergeEligibility(fixture({ reviews: [] })).reasons.join(),
    /independent review/,
  );
  assert.match(
    evaluateMergeEligibility(
      fixture({
        checks: [
          { name: "verify", status: "completed", conclusion: "success" },
        ],
      }),
    ).reasons.join(),
    /required checks/,
  );
  assert.match(
    evaluateMergeEligibility(
      fixture({
        checks: REQUIRED_CHECKS.map((name) => ({
          name,
          status: "completed",
          conclusion: "success",
        })),
      }),
    ).reasons.join(),
    /required checks/,
  );
  assert.match(
    evaluateMergeEligibility(fixture({ mainHealthy: false })).reasons.join(),
    /main health/,
  );
  assert.match(
    evaluateMergeEligibility(
      fixture({ baseMatchesMain: false }),
    ).reasons.join(),
    /base SHA/,
  );
});

test("activation requires explicit successful readback of both variables", () => {
  assert.equal(
    activationReadbackPass({
      activation: { value: "enabled" },
      paused: { value: "false" },
    }),
    true,
  );
  assert.equal(
    activationReadbackPass({ activation: { value: "enabled" }, paused: null }),
    false,
  );
  assert.equal(
    activationReadbackPass({
      activation: { value: "enabled" },
      paused: { value: "true" },
    }),
    false,
  );
});

test("native mutation is impossible when a gate is incomplete and uses exact head SHA", async () => {
  let variables;
  const api = {
    graphql: async (_query: string, input: Record<string, string>) => {
      variables = input;
      return { enablePullRequestAutoMerge: { pullRequest: { number: 7 } } };
    },
  };
  const state = fixture();
  const result = await enablePullRequestAutoMerge({
    api,
    pullRequest: { ...state.pullRequest, node_id: "PR_node" },
    gate: evaluateMergeEligibility(state),
  });
  assert.equal(result.number, 7);
  assert.deepEqual(variables, {
    id: "PR_node",
    expectedHeadOid: "a".repeat(40),
  });
  await assert.rejects(
    () =>
      enablePullRequestAutoMerge({
        api,
        pullRequest: state.pullRequest,
        gate: { ok: false, reasons: ["bad"] },
      }),
    /Refusing auto-merge/,
  );
});

test("native auto-merge denial disables an existing exact PR setting", async () => {
  const states = [
    { node: { autoMergeRequest: { enabledAt: "2026-10-09T00:00:00Z" } } },
    { node: { autoMergeRequest: null } },
  ];
  const mutations: string[] = [];
  const api = {
    graphql: async (query: string) => {
      if (query.includes("disablePullRequestAutoMerge")) {
        mutations.push(query);
        return { disablePullRequestAutoMerge: { pullRequest: { number: 7 } } };
      }
      return states.shift();
    },
  };
  const result = await disablePullRequestAutoMerge({
    api,
    pullRequest: { node_id: "PR_node" },
  });
  assert.deepEqual(result, { disabled: true });
  assert.equal(mutations.length, 1);
});

test("main guard identifies failed checks and records rollback evidence", async () => {
  const health = evaluateMainHealth({
    branch: { name: "main", commit: { sha: "b".repeat(40) } },
    checks: [{ name: "verify", conclusion: "success" }],
    expectedSha: "b".repeat(40),
  });
  assert.equal(health.ok, false);
  const body = incidentBody({
    source: "refs/heads/main",
    previousHead: "c".repeat(40),
    currentHead: "b".repeat(40),
    currentTree: "tree",
    checks: ["verify"],
    health,
  });
  assert.match(body, /Previous main head/);
  assert.match(body, /ROLLBACK.md/);
  const calls: string[] = [];
  const api = {
    repository: "o/r",
    request: async (route: string, options?: { method?: string }) => {
      calls.push(route);
      if (route.endsWith("AUTO_MERGE_PAUSED") && !options?.method)
        return { value: "true" };
      if (route.endsWith("AUTO_MERGE_PAUSED") && options?.method === "PATCH")
        return { value: "true" };
      if (route.includes("/pulls?")) return [];
      return { html_url: "https://github.com/o/r/issues/1" };
    },
  };
  const result = await pauseAfterMainFailure({ api, evidence: {}, health });
  assert.equal(result.paused, true);
  assert.deepEqual(calls, [
    "/repos/o/r/actions/variables/AUTO_MERGE_PAUSED",
    "/repos/o/r/actions/variables/AUTO_MERGE_PAUSED",
    "/repos/o/r/pulls?state=open&base=main&per_page=100",
    "/repos/o/r/issues",
  ]);
  assert.equal(result.pauseError, null);
});

test("main guard rejects successful checks without an exact head SHA", () => {
  const sha = "b".repeat(40);
  const health = evaluateMainHealth({
    branch: { name: "main", commit: { sha } },
    checks: REQUIRED_CHECKS.map((name) => ({
      name,
      status: "completed",
      conclusion: "success",
    })),
    expectedSha: sha,
  });
  assert.equal(health.ok, false);
  assert.match(health.reasons.join(), /required main checks/);
});

test("merge queue gate rejects base drift and ancestry failures", () => {
  const base = "a".repeat(40);
  const head = "b".repeat(40);
  const checkout = "c".repeat(40);
  assert.equal(
    validateMergeGroup({
      baseSha: base,
      headSha: head,
      checkoutSha: checkout,
      mainSha: base,
      isAncestor: true,
    }).ok,
    true,
  );
  assert.match(
    validateMergeGroup({
      baseSha: base,
      headSha: head,
      checkoutSha: checkout,
      mainSha: "d".repeat(40),
      isAncestor: true,
    }).reasons.join(),
    /origin\/main/,
  );
  assert.match(
    validateMergeGroup({
      baseSha: base,
      headSha: head,
      checkoutSha: checkout,
      mainSha: base,
      isAncestor: false,
    }).reasons.join(),
    /based on/,
  );
});
