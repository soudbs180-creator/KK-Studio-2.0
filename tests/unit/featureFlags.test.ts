import assert from "node:assert/strict";
import test from "node:test";
import {
  FEATURE_FLAG_IDS,
  featureFlagEnvKey,
  isEnabled,
  listFeatureFlags,
  readFeatureFlagDefaults,
} from "../../src/app/featureFlags.ts";

test("feature flags default: local account/credits on, unfinished/cloud off", () => {
  const defaults = readFeatureFlagDefaults();
  assert.equal(defaults.accountLocal, true);
  assert.equal(defaults.creditsLocal, true);
  assert.equal(defaults.accountCloud, false);
  assert.equal(defaults.creditsCloud, false);
  assert.equal(defaults.cloudSyncCopy, false);
  assert.equal(defaults.skillsOnlineCatalog, false);
  assert.equal(defaults.connectorRemote, false);
  assert.equal(defaults.taskWorkbenchPlanner, false);
  assert.equal(defaults.taskWorkbenchExport, false);
  assert.equal(defaults.taskWorkbenchShare, false);
  assert.equal(defaults.platformQuotaMode, false);
  assert.equal(FEATURE_FLAG_IDS.length, 11);
});

test("isEnabled reads defaults when env is empty", () => {
  assert.equal(isEnabled("accountLocal", {}), true);
  assert.equal(isEnabled("accountCloud", {}), false);
  assert.equal(isEnabled("platformQuotaMode", {}), false);
});

test("KK_FF_*=1 can enable a default-off flag", () => {
  const env = { [featureFlagEnvKey("accountCloud")]: "1" };
  assert.equal(isEnabled("accountCloud", env), true);
  assert.equal(isEnabled("creditsCloud", env), false);
});

test("KK_FF_*=0 can disable a default-on flag", () => {
  const env = { [featureFlagEnvKey("accountLocal")]: "0" };
  assert.equal(isEnabled("accountLocal", env), false);
});

test("listFeatureFlags applies env overrides across the catalog", () => {
  const env = {
    [featureFlagEnvKey("skillsOnlineCatalog")]: "true",
    [featureFlagEnvKey("creditsLocal")]: "off",
  };
  const listed = listFeatureFlags(env);
  assert.equal(listed.skillsOnlineCatalog, true);
  assert.equal(listed.creditsLocal, false);
  assert.equal(listed.accountLocal, true);
});

test("featureFlagEnvKey maps camelCase to KK_FF_UPPER_SNAKE", () => {
  assert.equal(featureFlagEnvKey("accountCloud"), "KK_FF_ACCOUNT_CLOUD");
  assert.equal(
    featureFlagEnvKey("taskWorkbenchPlanner"),
    "KK_FF_TASK_WORKBENCH_PLANNER",
  );
});
