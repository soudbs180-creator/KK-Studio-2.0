import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import {
  importIndexedData,
  MigrationError,
  preflightIndexedData,
  type CompanionMigrationClient,
} from "../../src/features/local-service/migration.ts";
import { CompanionStore } from "../../src/features/local-service/store.ts";

const origins = ["first", "second"].map((name, index) => ({
  sourceJobId: `${name}-job`,
  promptHash: String(index).repeat(64),
  provenance: {
    provider: "fixture",
    model: "fixture-image",
    providerRequestId: `${name}-request`,
    generatedAt: "2026-11-09T00:00:00.000Z",
  },
}));

function fixture(assetOrigins = origins) {
  const bytes = new Uint8Array([1, 2, 3]);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    snapshot: emptySnapshot(),
    assets: [
      {
        metadata: {
          assetId: `asset-${sha256.slice(0, 24)}`,
          sha256,
          mime: "image/png",
          size: bytes.byteLength,
          tags: [],
          preview: "data:image/png;base64,AQID",
          origins: assetOrigins,
        },
        bytes,
      },
    ],
  };
}

test("browser migration preserves valid origins through preflight and disk import", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "kk-migration-origins-"));
  const store = new CompanionStore(root);
  t.after(() => {
    store.close();
    rmSync(root, { recursive: true, force: true });
  });
  const source = fixture();
  const before = structuredClone(source);
  const report = await preflightIndexedData(async () => source);
  let approved: ReturnType<CompanionStore["preflightImport"]> | undefined;
  const client: CompanionMigrationClient = {
    async loadCompanionSnapshot() {
      return store.readSnapshot();
    },
    async preflightCompanionMigration(input) {
      approved = store.preflightImport(
        input.snapshot,
        input.assets,
        input.manifestSha256,
      );
      return {
        status: "ready",
        reportId: "11111111-1111-4111-8111-111111111111",
        manifestSha256: input.manifestSha256,
        snapshotRevision: 0,
        assetCount: 1,
        assetBytes: 3,
      };
    },
    async putCompanionAsset(metadata, bytes) {
      return store.publishStagedAsset(
        store.stageAsset(metadata, bytes).stageId,
      );
    },
    async importCompanionMigration(input) {
      assert.ok(approved);
      store.publishImportedSnapshot(approved, input.expectedRevision);
      return {
        status: "imported",
        manifestSha256: input.manifestSha256,
        snapshotRevision: input.snapshot.revision,
        revision: input.snapshot.revision,
      };
    },
  };

  const receipt = await importIndexedData(report, { client });
  assert.equal(receipt.status, "imported");
  assert.deepEqual(report.assets[0].metadata.origins, origins);
  assert.deepEqual(
    store.readAsset(source.assets[0].metadata.assetId)?.metadata.origins,
    origins,
  );
  assert.equal("preview" in report.assets[0].metadata, false);
  assert.deepEqual(source, before);
});

for (const [name, invalidOrigins] of [
  ["invalid hash", [{ ...origins[0], promptHash: "invalid" }]],
  [
    "overlong request ID",
    [
      {
        ...origins[0],
        provenance: {
          ...origins[0].provenance,
          providerRequestId: "x".repeat(201),
        },
      },
    ],
  ],
  [
    "secret field",
    [
      {
        ...origins[0],
        provenance: {
          ...origins[0].provenance,
          apiKey: "fixture-not-a-real-secret",
        },
      },
    ],
  ],
] as const) {
  test(`browser migration rejects ${name} origins without changing the source`, async () => {
    const source = fixture([...invalidOrigins]);
    const before = structuredClone(source);
    await assert.rejects(
      () => preflightIndexedData(async () => source),
      (error: unknown) =>
        error instanceof MigrationError && error.code === "import-rollback",
    );
    assert.deepEqual(source, before);
  });
}
