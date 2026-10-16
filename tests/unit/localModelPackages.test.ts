import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  localChatModelPackages,
  localVideoModelPackages,
  planLocalModelDownloads,
} from "../../src/domain/localModelPackages.ts";

test("each Qwen vision plan contains its matching model and projector, never all quants", () => {
  for (const [index, bytes] of [
    6_598_688_544, 3_413_361_504, 17_392_047_712,
  ].entries()) {
    const entry = localChatModelPackages[index];
    const plan = planLocalModelDownloads([entry.id]);
    assert.equal(plan.files.length, 2);
    assert.equal(plan.downloadBytes, bytes);
    assert.deepEqual(
      plan.files.map((file) => file.role),
      ["model", "projector"],
    );
    assert.equal(plan.files[1].path, "mmproj-F16.gguf");
    assert.ok(
      plan.files.every((file) =>
        file.sourceUrl.includes(`/resolve/${entry.revision}/`),
      ),
    );
  }
});

test("shared catalog migration preserves every existing public package and download-plan value", () => {
  const value = {
    chat: localChatModelPackages,
    video: localVideoModelPackages,
    plans: [
      [],
      ...localChatModelPackages.map((v) => [v.id]),
      localVideoModelPackages.map((v) => v.id),
    ].map((v) => planLocalModelDownloads(v)),
  };
  const sorted = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sorted)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [
                key,
                sorted((value as Record<string, unknown>)[key]),
              ]),
          )
        : value;
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(sorted(value)))
      .digest("hex"),
    "2ae56d92876626ae5f3b4947caa4f24b392d60d35d93bf1de76720fa718b07bd",
  );
});

test("H3 16G means a runtime target; selected modes share encoder/VAEs only once", () => {
  const ids = localVideoModelPackages.map((entry) => entry.id);
  const one = planLocalModelDownloads([ids[0]]);
  const both = planLocalModelDownloads(ids);
  assert.equal(one.downloadBytes, 64_730_399_025);
  assert.equal(planLocalModelDownloads([ids[1]]).downloadBytes, 64_768_911_425);
  assert.equal(both.downloadBytes, 93_133_757_881);
  assert.equal(both.files.length, 5);
  assert.equal(both.files.filter((file) => file.role === "model").length, 2);
  assert.deepEqual(planLocalModelDownloads([...ids, ids[0]]), both);
  assert.ok(
    localVideoModelPackages.every(
      (entry) =>
        entry.runtimeAcceptance === "unverified" &&
        entry.workflowConversionRequired,
    ),
  );
});

test("unknown package identities cannot become arbitrary download sources", () => {
  for (const id of ["https://host/model", "../package", "qwen3.5-9b", ""]) {
    assert.throws(() => planLocalModelDownloads([id]), /未知本地模型包/);
  }
  assert.deepEqual(planLocalModelDownloads([]), {
    files: [],
    downloadBytes: 0,
  });
  for (const entry of [...localChatModelPackages, ...localVideoModelPackages]) {
    assert.match(entry.revision, /^[a-f0-9]{40}$/);
    for (const file of entry.artifacts) {
      assert.match(file.sha256, /^[a-f0-9]{64}$/);
      assert.ok(Number.isSafeInteger(file.bytes) && file.bytes > 0);
      assert.ok(!file.path.includes("..") && !file.path.startsWith("/"));
    }
  }
});
