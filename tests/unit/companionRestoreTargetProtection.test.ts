import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import { createManifest } from "../../src/features/local-service/manifest.ts";
import { CompanionProtocolError } from "../../src/features/local-service/protocol.ts";
import {
  CompanionStore,
  canonicalBackupPath,
} from "../../src/features/local-service/store.ts";

const cases = [
  { name: "Native v1", version: 1, code: "SNAPSHOT_UNSUPPORTED" },
  { name: "future v9", version: 9, code: "SNAPSHOT_UNSUPPORTED" },
  {
    name: "case-variant Native v1",
    version: 1,
    uppercase: true,
    code: "SNAPSHOT_UNSUPPORTED",
  },
  { name: "unknown metadata", raw: '{"unknown":"preserve"}', code: "IO" },
  { name: "malformed JSON", raw: '{"preserve":', code: "IO" },
] as const;

for (const target of cases) {
  test(
    `backup restore preserves ${target.name} target and all originals`,
    {
      skip:
        "uppercase" in target && process.platform !== "win32"
          ? "Windows case-insensitive paths"
          : false,
    },
    (t) => {
      const root = mkdtempSync(join(tmpdir(), "kk-restore-target-"));
      const store = new CompanionStore(root);
      t.after(() => {
        store.close();
        rmSync(root, { recursive: true, force: true });
      });
      const bytes = new Uint8Array([1, 2, 3]);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const metadata = {
        assetId: `asset-${sha256.slice(0, 24)}`,
        sha256,
        mime: "image/png",
        size: bytes.byteLength,
        tags: [] as string[],
      };
      store.publishStagedAsset(store.stageAsset(metadata, bytes).stageId);
      store.writeSnapshot(emptySnapshot(), null);
      store.writeSnapshot({ ...emptySnapshot(), revision: 1 }, 0);
      const backup = store.createBackup();
      if ("uppercase" in target) {
        const entries = backup.manifest.files.map(({ path }) => ({
          path: path.replace("assets/records/", "ASSETS/RECORDS/"),
          bytes: readFileSync(join(backup.directory, path)),
        }));
        writeFileSync(
          join(backup.directory, "manifest.json"),
          JSON.stringify(
            createManifest(backup.manifest.snapshotRevision, entries),
          ),
        );
      }
      const recordPath = join(
        store.assetRecordsRoot,
        `${metadata.assetId}.json`,
      );
      writeFileSync(
        recordPath,
        "version" in target
          ? JSON.stringify({
              version: target.version,
              metadata: { ...metadata, tags: ["original-must-survive"] },
            })
          : target.raw,
      );
      const blobPath = join(store.assetBlobsRoot, metadata.sha256);
      const originals = [
        store.snapshotPath,
        store.backupPath,
        recordPath,
        blobPath,
      ];
      const before = originals.map((file) => readFileSync(file));

      assert.throws(
        () => store.restoreBackup(basename(backup.directory)),
        (error: unknown) =>
          error instanceof CompanionProtocolError && error.code === target.code,
      );
      originals.forEach((file, index) => {
        assert.deepEqual(readFileSync(file), before[index], file);
      });
    },
  );
}

test("backup restore rolls back every original after a partial asset publication", (t) => {
  const root = mkdtempSync(join(tmpdir(), "kk-restore-publish-failure-"));
  const store = new CompanionStore(root);
  t.after(() => {
    store.close();
    rmSync(root, { recursive: true, force: true });
  });
  const bytes = new Uint8Array([1, 2, 3]);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const metadata = {
    assetId: `asset-${sha256.slice(0, 24)}`,
    sha256,
    mime: "image/png",
    size: bytes.byteLength,
    tags: [] as string[],
  };
  store.publishStagedAsset(store.stageAsset(metadata, bytes).stageId);
  store.writeSnapshot(emptySnapshot(), null);
  store.writeSnapshot({ ...emptySnapshot(), revision: 1 }, 0);
  const backup = store.createBackup();
  const recordPath = join(store.assetRecordsRoot, `${metadata.assetId}.json`);
  const blobPath = join(store.assetBlobsRoot, sha256);
  writeFileSync(recordPath, JSON.stringify({ ...metadata, tags: ["current"] }));
  writeFileSync(blobPath, new Uint8Array([9, 8, 7]));
  const originals = [
    store.snapshotPath,
    store.backupPath,
    recordPath,
    blobPath,
  ];
  const before = originals.map((file) => readFileSync(file));
  const write = Reflect.get(store, "writeAtomic");
  let failedAfterBlobPublication = false;
  Reflect.set(
    store,
    "writeAtomic",
    function (path: string, value: Uint8Array | string) {
      if (path === recordPath && !failedAfterBlobPublication) {
        assert.deepEqual(readFileSync(blobPath), Buffer.from(bytes));
        failedAfterBlobPublication = true;
        throw new Error("synthetic asset-record publication failure");
      }
      write.call(store, path, value);
    },
  );

  assert.throws(
    () => store.restoreBackup(basename(backup.directory)),
    (error: unknown) =>
      error instanceof CompanionProtocolError && error.code === "IO",
  );
  assert.equal(failedAfterBlobPublication, true);
  originals.forEach((file, index) => {
    assert.deepEqual(readFileSync(file), before[index], file);
  });
});

test("case-variant backup paths canonicalize to the on-disk layout", () => {
  const sha256 = createHash("sha256").update("case-probe").digest("hex");
  const assetId = `asset-${sha256.slice(0, 24)}`;
  assert.equal(
    canonicalBackupPath(`ASSETS/RECORDS/${assetId.toUpperCase()}.JSON`),
    `assets/records/${assetId}.json`,
  );
  assert.equal(
    canonicalBackupPath(`Assets/Blobs/${sha256.toUpperCase()}`),
    `assets/blobs/${sha256}`,
  );
  assert.equal(
    canonicalBackupPath("projects/creation-v2.json"),
    "projects/creation-v2.json",
  );
});

test(
  "restore writes a case-variant record entry into the canonical directory",
  {
    skip:
      process.platform !== "win32" ? "Windows case-insensitive paths" : false,
  },
  (t) => {
    const root = mkdtempSync(join(tmpdir(), "kk-restore-canonical-"));
    const store = new CompanionStore(root);
    t.after(() => {
      store.close();
      rmSync(root, { recursive: true, force: true });
    });
    const bytes = new Uint8Array([1, 2, 3]);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const metadata = {
      assetId: `asset-${sha256.slice(0, 24)}`,
      sha256,
      mime: "image/png",
      size: bytes.byteLength,
      tags: [] as string[],
    };
    store.publishStagedAsset(store.stageAsset(metadata, bytes).stageId);
    store.writeSnapshot(emptySnapshot(), null);
    store.writeSnapshot({ ...emptySnapshot(), revision: 1 }, 0);
    const backup = store.createBackup();
    const entries = backup.manifest.files.map(({ path }) => ({
      path: path.replace("assets/records/", "ASSETS/RECORDS/"),
      bytes: readFileSync(join(backup.directory, path)),
    }));
    writeFileSync(
      join(backup.directory, "manifest.json"),
      JSON.stringify(createManifest(backup.manifest.snapshotRevision, entries)),
    );
    rmSync(join(store.assetRecordsRoot, `${metadata.assetId}.json`));
    const restored = store.restoreBackup(basename(backup.directory));
    assert.equal(restored.revision, 1);
    assert.equal(
      readdirSync(root).some((name) => name === "ASSETS"),
      false,
      "no shadow ASSETS/ directory may be created",
    );
    assert.equal(
      existsSync(join(store.assetRecordsRoot, `${metadata.assetId}.json`)),
      true,
    );
  },
);
