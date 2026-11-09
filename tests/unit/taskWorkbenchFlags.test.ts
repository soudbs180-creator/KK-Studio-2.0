import assert from "node:assert/strict";
import test from "node:test";
import { featureFlagEnvKey } from "../../src/app/featureFlags.ts";
import {
  resolveWorkbenchTab,
  visibleReviewAgents,
  visibleWorkbenchTabs,
} from "../../src/components/TaskWorkbenchVisibility.ts";

test("workbench tabs hide Planner/Export by default", () => {
  assert.deepEqual(visibleWorkbenchTabs({}), [
    "queue",
    "prompt",
    "generate",
    "review",
  ]);
  assert.equal(resolveWorkbenchTab("plan", {}), "queue");
  assert.equal(resolveWorkbenchTab("export", {}), "queue");
  assert.equal(resolveWorkbenchTab("review", {}), "review");
});

test("KK_FF can restore Planner and Export tabs", () => {
  const env = {
    [featureFlagEnvKey("taskWorkbenchExport")]: "1",
    [featureFlagEnvKey("taskWorkbenchPlanner")]: "1",
  };
  assert.deepEqual(visibleWorkbenchTabs(env), [
    "queue",
    "prompt",
    "generate",
    "review",
    "export",
    "plan",
  ]);
  assert.equal(resolveWorkbenchTab("plan", env), "plan");
  assert.equal(resolveWorkbenchTab("export", env), "export");
});

test("review agents hide Planner/Compositor by default", () => {
  const labels = visibleReviewAgents({}).map(([label]) => label);
  assert.ok(!labels.includes("Planner"));
  assert.ok(!labels.includes("Compositor / Exporter"));
  assert.ok(labels.includes("Generation Worker"));
  assert.ok(labels.includes("Reviewer"));
});

test("KK_FF can restore Planner/Compositor agent cards", () => {
  const env = {
    [featureFlagEnvKey("taskWorkbenchPlanner")]: "true",
    [featureFlagEnvKey("taskWorkbenchExport")]: "on",
  };
  const labels = visibleReviewAgents(env).map(([label]) => label);
  assert.equal(labels[0], "Planner");
  assert.equal(labels.at(-1), "Compositor / Exporter");
});
