import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import {
  CompanionProtocolError,
  type CompanionAssetMetadata,
} from "../../src/features/local-service/protocol.ts";
import { CompanionStore } from "../../src/features/local-service/store.ts";
import { verifyManifestHash } from "../../src/features/local-service/manifest.ts";

const bytes = new Uint8Array([1, 2, 3]);
const sha256 =
  "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81";
const metadata: CompanionAssetMetadata = {
  assetId: `asset-${sha256.slice(0, 24)}`,
  sha256,
  mime: "image/png",
  size: bytes.byteLength,
  tags: ["AI生成"],
};

function root(): string {
  return mkdtempSync(join(tmpdir(), "kk-companion-store-"));
}

test("store initializes with a missing snapshot and enforces revisions", () => {
  const store = new CompanionStore(root());
  assert.deepEqual(store.readSnapshot(), {
    status: "missing",
    snapshot: null,
    revision: null,
  });
  const initial = emptySnapshot();
  store.writeSnapshot(initial, null);
  assert.equal(store.readSnapshot().revision, 0);
  const next = { ...initial, revision: 1 };
  store.writeSnapshot(next, 0);
  assert.equal(store.readSnapshot().revision, 1);
  assert.throws(
    () => store.writeSnapshot({ ...next, revision: 2 }, 0),
    (error: unknown) =>
      error instanceof CompanionProtocolError && error.code === "CONFLICT",
  );
});

test("store recovers the previous valid snapshot from its backup", () => {
  const store = new CompanionStore(root());
  const initial = emptySnapshot();
  store.writeSnapshot(initial, null);
  store.writeSnapshot({ ...initial, revision: 1 }, 0);
  writeFileSync(store.snapshotPath, "{broken", "utf8");
  const recovered = store.readSnapshot();
  assert.equal(recovered.status, "recovered");
  assert.equal(recovered.revision, 0);
  assert.equal(recovered.snapshot?.revision, 0);
});

test("snapshot writes reject missing asset references and accept hydrated service assets", () => {
  const store = new CompanionStore(root());
  const initial = emptySnapshot();
  const referenced = {
    ...initial,
    homeDraft: {
      ...initial.homeDraft,
      attachments: [
        {
          id: "attachment-1",
          assetId: metadata.assetId,
          name: "image.png",
          mime: metadata.mime,
          size: metadata.size,
          dataUrl: `kk-asset:${metadata.assetId}`,
        },
      ],
    },
  };
  assert.throws(
    () => store.writeSnapshot(referenced, null),
    (error: unknown) =>
      error instanceof CompanionProtocolError &&
      error.code === "INVALID_SNAPSHOT",
  );
  store.publishStagedAsset(store.stageAsset(metadata, bytes).stageId);
  store.writeSnapshot(referenced, null);
  assert.equal(
    store.readSnapshot().snapshot?.homeDraft.attachments[0]?.dataUrl,
    `kk-asset:${metadata.assetId}`,
  );
});

test("store refuses to create an empty project when both snapshot copies are corrupt", () => {
  const store = new CompanionStore(root());
  store.writeSnapshot(emptySnapshot(), null);
  writeFileSync(store.snapshotPath, "{broken", "utf8");
  writeFileSync(store.backupPath, "{also-broken", "utf8");
  assert.throws(
    () => store.readSnapshot(),
    (error: unknown) =>
      error instanceof CompanionProtocolError && error.code === "CORRUPT",
  );
});

test("staged asset validates hash and publishes content-addressed bytes", () => {
  const store = new CompanionStore(root());
  const staged = store.stageAsset(metadata, bytes);
  assert.match(staged.stageId, /^[a-f0-9-]+$/);
  store.publishStagedAsset(staged.stageId);
  const loaded = store.readAsset(metadata.assetId);
  assert.deepEqual(loaded?.bytes, bytes);
  assert.equal(loaded?.metadata.sha256, sha256);
  assert.throws(
    () => store.stageAsset({ ...metadata, sha256: "a".repeat(64) }, bytes),
    (error: unknown) =>
      error instanceof CompanionProtocolError && error.code === "INVALID_ASSET",
  );
  assert.throws(
    () => store.stageAsset({ ...metadata, mime: "text/html" }, bytes),
    (error: unknown) =>
      error instanceof CompanionProtocolError && error.code === "INVALID_ASSET",
  );
});

test("duplicate asset content merges tags without replacing the original blob", () => {
  const store = new CompanionStore(root());
  store.publishStagedAsset(store.stageAsset(metadata, bytes).stageId);
  const second = store.stageAsset({ ...metadata, tags: ["用户上传"] }, bytes);
  store.publishStagedAsset(second.stageId);
  const loaded = store.readAsset(metadata.assetId);
  assert.deepEqual(loaded?.bytes, bytes);
  assert.deepEqual(loaded?.metadata.tags.sort(), ["AI生成", "用户上传"]);
});

test("a failed staged publish leaves the current asset untouched", () => {
  const store = new CompanionStore(root());
  store.publishStagedAsset(store.stageAsset(metadata, bytes).stageId);
  assert.throws(
    () => store.publishStagedAsset("missing-stage"),
    (error: unknown) =>
      error instanceof CompanionProtocolError && error.code === "IO",
  );
  assert.deepEqual(store.readAsset(metadata.assetId)?.bytes, bytes);
  assert.equal(readFileSync(store.assetBlobPath(metadata.assetId)).length, 3);
});

test("backup contains a verified manifest for the snapshot and assets", () => {
  const store = new CompanionStore(root());
  store.writeSnapshot(emptySnapshot(), null);
  store.publishStagedAsset(store.stageAsset(metadata, bytes).stageId);
  const backup = store.createBackup();
  assert.equal(verifyManifestHash(backup.manifest), true);
  assert.ok(existsSync(join(backup.directory, "manifest.json")));
  assert.ok(
    existsSync(join(backup.directory, "assets", "blobs", metadata.sha256)),
  );
});

test("backup restore rolls back earlier files when a later publish fails", () => {
  const store = new CompanionStore(root());
  store.writeSnapshot(emptySnapshot(), null);
  store.publishStagedAsset(store.stageAsset(metadata, bytes).stageId);
  const backup = store.createBackup();
  const recordPath = join(store.assetRecordsRoot, `${metadata.assetId}.json`);
  const record = readFileSync(recordPath);
  rmSync(recordPath);
  mkdirSync(recordPath);
  assert.throws(
    () => store.restoreBackup(backup.directory.split(/[\\/]/).pop()!),
    (error: unknown) =>
      error instanceof CompanionProtocolError && error.code === "IO",
  );
  assert.deepEqual(
    new Uint8Array(readFileSync(join(store.assetBlobsRoot, metadata.sha256))),
    bytes,
  );
  rmSync(recordPath, { recursive: true, force: true });
  writeFileSync(recordPath, record);
});
