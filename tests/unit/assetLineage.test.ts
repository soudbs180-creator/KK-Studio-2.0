import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CompanionStore } from "../../src/features/local-service/store.ts";
import type { CompanionAssetMetadata } from "../../src/features/local-service/protocol.ts";
import * as contracts from "../../packages/creation-contracts/index.ts";
import { hashPrompt } from "../../src/features/creation/assetRepository.ts";

const provenance = {
  provider: "fixture",
  model: "model-a",
  generatedAt: "2026-10-29T00:00:00.000Z",
};
test("same bytes/job/prompt retain different parents and imported origins in the actual companion store", () => {
  const store = new CompanionStore(
    mkdtempSync(join(tmpdir(), "kk-p7-lineage-")),
  );
  const bytes = new Uint8Array([1, 2, 3]);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const base: CompanionAssetMetadata = {
    assetId: `asset-${sha256.slice(0, 24)}`,
    sha256,
    mime: "image/png",
    size: 3,
    tags: [],
    sourceJobId: "job",
    promptHash: "a".repeat(64),
    isAiGenerated: true,
    provenance,
  };
  const first = { ...base, parentId: "asset-" + "1".repeat(24) };
  const second = {
    ...base,
    parentId: "asset-" + "2".repeat(24),
    origins: [
      {
        sourceJobId: "imported-job",
        parentId: "asset-" + "3".repeat(24),
        provenance,
      },
    ],
  };
  store.publishStagedAsset(store.stageAsset(first, bytes).stageId);
  const merged = store.publishStagedAsset(
    store.stageAsset(second, bytes).stageId,
  );
  assert.deepEqual(
    new Set(merged.origins!.map((o) => o.parentId)),
    new Set([first.parentId, second.parentId, second.origins[0].parentId]),
  );
  assert.equal(merged.parentId, first.parentId);
  const repeated = store.publishStagedAsset(
    store.stageAsset(second, bytes).stageId,
  );
  assert.equal(repeated.origins!.length, 3);
});

test("lineage merge is nonmutating, bounded, and retains provider identity without duplicating a timestamp retry", () => {
  const merge = (contracts as Record<string, unknown>).mergeAssetOrigins as (
    a: unknown,
    b: unknown,
  ) => unknown[];
  assert.equal(typeof merge, "function", "P7 shared origin merger must exist");
  const first = {
    promptHash: "b".repeat(64),
    parentId: "asset-" + "1".repeat(24),
    provenance,
  };
  const next = {
    ...first,
    provenance: { ...provenance, connectionId: "another" },
  };
  const before = structuredClone(first);
  assert.equal(merge(first, next).length, 2);
  assert.equal(
    merge(first, {
      ...first,
      provenance: { ...provenance, generatedAt: "2026-10-29T00:00:01.000Z" },
    }).length,
    1,
  );
  assert.deepEqual(first, before);
  const many = {
    ...first,
    origins: Array.from({ length: 200 }, (_, i) => ({
      ...first,
      sourceJobId: String(i),
    })),
  };
  assert.equal(merge(many, next).length, 200);
});

test("PromptHash is SHA256 of the exact UTF8 prompt without trimming or Unicode rewriting", async () => {
  for (const prompt of ["  修复\n保留原图  ", "e\u0301", "é"]) {
    assert.equal(
      await hashPrompt(prompt),
      createHash("sha256").update(prompt, "utf8").digest("hex"),
    );
  }
});
