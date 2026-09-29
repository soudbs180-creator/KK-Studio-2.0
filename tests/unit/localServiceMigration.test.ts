import assert from "node:assert/strict";
import test from "node:test";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import {
  importIndexedData,
  MigrationError,
  preflightIndexedData,
  type CompanionMigrationClient,
  type LegacyIndexedData,
} from "../../src/features/local-service/migration.ts";

const bytes = new Uint8Array([1, 2, 3]);
const sha256 =
  "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81";
const metadata = {
  assetId: `asset-${sha256.slice(0, 24)}`,
  sha256,
  mime: "image/png",
  size: bytes.byteLength,
  tags: ["AI生成"],
  provenance: { generatedAt: "2026-09-29T00:00:00.000Z" },
};

function legacyData(
  overrides: Partial<LegacyIndexedData> = {},
): LegacyIndexedData {
  const snapshot = emptySnapshot();
  snapshot.homeDraft.attachments = [
    {
      id: "attachment-1",
      assetId: metadata.assetId,
      name: "source.png",
      mime: metadata.mime,
      size: bytes.byteLength,
      dataUrl: `kk-asset:${metadata.assetId}`,
    },
  ];
  return {
    snapshot,
    assets: [{ metadata, bytes }],
    ...overrides,
  };
}

test("preflight returns an exact manifest and does not mutate legacy data", async () => {
  const source = legacyData();
  const before = structuredClone(source);
  const report = await preflightIndexedData(async () => source);
  assert.equal(
    report.snapshot.homeDraft.attachments[0].dataUrl,
    `kk-asset:${metadata.assetId}`,
  );
  assert.equal(report.assets[0].metadata.sha256, metadata.sha256);
  assert.equal(report.assets[0].bytes[0], 1);
  assert.equal(report.totalBytes, 3);
  assert.match(report.manifestSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(source, before);
});

test("preflight refuses a missing referenced asset and leaves the source unchanged", async () => {
  const source = legacyData({ assets: [] });
  const before = structuredClone(source);
  await assert.rejects(
    () => preflightIndexedData(async () => source),
    (error: unknown) =>
      error instanceof MigrationError && error.code === "missing-asset",
  );
  assert.deepEqual(source, before);
});

test("preflight detects a changed blob hash before any upload", async () => {
  const source = legacyData({
    assets: [{ metadata, bytes: new Uint8Array([9, 9, 9]) }],
  });
  await assert.rejects(
    () => preflightIndexedData(async () => source),
    (error: unknown) =>
      error instanceof MigrationError && error.code === "asset-hash-mismatch",
  );
});

class FakeMigrationClient implements CompanionMigrationClient {
  readonly uploaded: string[] = [];
  imported = false;
  failAfter = Number.POSITIVE_INFINITY;
  async loadCompanionSnapshot() {
    return { status: "missing" as const, snapshot: null, revision: null };
  }
  async preflightCompanionMigration(input: {
    snapshot: unknown;
    assets: (typeof metadata)[];
    manifestSha256: string;
  }) {
    assert.ok(input.snapshot);
    assert.equal(input.assets.length, 1);
    return {
      status: "ready" as const,
      reportId: "11111111-1111-4111-8111-111111111111",
      manifestSha256: input.manifestSha256,
      snapshotRevision: 0,
      assetCount: 1,
      assetBytes: 3,
    };
  }
  async putCompanionAsset(asset: typeof metadata, _bytes: Uint8Array) {
    if (this.uploaded.length >= this.failAfter)
      throw new Error("synthetic upload interruption");
    this.uploaded.push(asset.assetId);
    return asset;
  }
  async importCompanionMigration(input: {
    reportId: string;
    manifestSha256: string;
    expectedRevision: number | null;
    snapshot: ReturnType<typeof emptySnapshot>;
  }) {
    assert.equal(input.expectedRevision, null);
    this.imported = true;
    return {
      status: "imported" as const,
      manifestSha256: input.manifestSha256,
      snapshotRevision: input.snapshot.revision,
      revision: input.snapshot.revision,
    };
  }
}

test("interrupted import does not delete the legacy source or publish a snapshot", async () => {
  const source = legacyData();
  const report = await preflightIndexedData(async () => source);
  const client = new FakeMigrationClient();
  client.failAfter = 0;
  await assert.rejects(
    () => importIndexedData(report, { client }),
    (error: unknown) =>
      error instanceof MigrationError && error.code === "import-rollback",
  );
  assert.equal(client.imported, false);
  assert.equal(source.assets[0].bytes[0], 1);
  assert.equal(source.snapshot !== null, true);
});

test("a complete import uploads checked assets before publishing the service snapshot", async () => {
  const source = legacyData();
  const report = await preflightIndexedData(async () => source);
  const client = new FakeMigrationClient();
  const progress: number[] = [];
  const receipt = await importIndexedData(report, {
    client,
    onProgress: (completed) => progress.push(completed),
  });
  assert.deepEqual(client.uploaded, [metadata.assetId]);
  assert.equal(client.imported, true);
  assert.deepEqual(progress, [1]);
  assert.equal(receipt.status, "imported");
});
