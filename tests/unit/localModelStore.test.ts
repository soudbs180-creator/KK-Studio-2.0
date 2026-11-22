import assert from "node:assert/strict";
import test from "node:test";
import {
  fitTierFromRecommendation,
  listLocalStorePresets,
  planPackageReplacement,
} from "../../src/domain/localModelStore.ts";

test("first-launch presets never force download and mark Inkling non-installable", () => {
  const presets = listLocalStorePresets();
  assert.ok(presets.some((item) => item.packageId === "qwen3.5-9b-q4-k-m"));
  const inkling = presets.find(
    (item) => item.packageId === "inkling-2-mini-iq4-nl",
  );
  assert.ok(inkling);
  assert.equal(inkling?.installable, false);
  assert.equal(inkling?.sourceKind, "community");
  assert.ok(
    presets.some(
      (item) =>
        item.packageId === "fastvideo-runtime" &&
        item.sourceKind === "external-runtime",
    ),
  );
});

test("replacement defaults to in-place replace and delete-old confirmation", () => {
  const plan = planPackageReplacement({
    packageId: "qwen3.5-9b-q4-k-m",
    installedRevision: "oldrevisionoldrevisionoldrevisionoldrev",
    catalogRevision: "3885219b6810b007914f3a7950a8d1b469d598a5",
    installedBytes: 6_000_000_000,
  });
  assert.equal(plan.replaceInPlace, true);
  assert.equal(plan.deleteOldDefault, true);
  assert.equal(plan.requireDeleteConfirmation, true);
  assert.equal(plan.installable, true);
  assert.equal(plan.blockedReason, null);
  assert.equal(plan.bytesFreedIfDelete, 6_000_000_000);
});

test("same revision and unpinned community packages are blocked", () => {
  const same = planPackageReplacement({
    packageId: "qwen3.5-4b-q4-k-m",
    installedRevision: "e87f176479d0855a907a41277aca2f8ee7a09523",
    catalogRevision: "e87f176479d0855a907a41277aca2f8ee7a09523",
  });
  assert.match(same.blockedReason ?? "", /同一 revision/);

  const community = planPackageReplacement({
    packageId: "inkling-2-mini-iq4-nl",
    installedRevision: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  });
  assert.equal(community.installable, false);
  assert.match(community.blockedReason ?? "", /尚未 pin/);
});

test("fit tier maps 16GB-class headroom for recommended vs tight", () => {
  const GiB = 1024 ** 3;
  assert.equal(
    fitTierFromRecommendation({
      status: "recommended",
      requiredFreeVramBytes: 8 * GiB,
      freeVramBytes: 12 * GiB,
    }),
    "recommended",
  );
  assert.equal(
    fitTierFromRecommendation({
      status: "alternative",
      requiredFreeVramBytes: 10 * GiB,
      freeVramBytes: 11 * GiB,
    }),
    "tight",
  );
  assert.equal(
    fitTierFromRecommendation({
      status: "insufficient",
      requiredFreeVramBytes: 20 * GiB,
      freeVramBytes: 8 * GiB,
    }),
    "unsuitable",
  );
});
