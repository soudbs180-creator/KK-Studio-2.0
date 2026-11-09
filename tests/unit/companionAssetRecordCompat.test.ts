import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  detectAssetRecordFamily,
  wrapCompanionMetadataAsNativeEnvelope,
} from "../../packages/creation-contracts/index.ts";
import { CompanionProtocolError } from "../../src/features/local-service/protocol.ts";
import { CompanionStore } from "../../src/features/local-service/store.ts";

const freshRoot = () => mkdtempSync(join(tmpdir(), "kk-feat037-record-"));
const isUnsupported = (error: unknown) =>
  error instanceof CompanionProtocolError &&
  error.code === "SNAPSHOT_UNSUPPORTED";

function closeStore(store: CompanionStore): void {
  const close = Reflect.get(store, "close");
  if (typeof close === "function") close.call(store);
}

function sampleAsset() {
  const bytes = new Uint8Array([1, 2, 3]);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    bytes,
    sha256,
    metadata: {
      assetId: `asset-${sha256.slice(0, 24)}`,
      sha256,
      mime: "image/png",
      size: 3,
      tags: [] as string[],
    },
  };
}

test("companion still reads and writes its own bare metadata records", () => {
  const store = new CompanionStore(freshRoot());
  try {
    const { bytes, metadata } = sampleAsset();
    const staged = store.stageAsset(metadata, bytes);
    store.publishStagedAsset(staged.stageId);
    const listed = store.listAssets();
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.assetId, metadata.assetId);
    const read = store.readAsset(metadata.assetId);
    assert.ok(read);
    assert.equal(read.metadata.assetId, metadata.assetId);
    assert.equal(
      detectAssetRecordFamily(
        JSON.parse(
          readFileSync(
            join(store.assetRecordsRoot, `${metadata.assetId}.json`),
            "utf8",
          ),
        ),
      ).family,
      "companion-bare-metadata",
    );
  } finally {
    closeStore(store);
  }
});

test("companion list/read refuse a Native envelope without rewriting it", () => {
  const store = new CompanionStore(freshRoot());
  try {
    const { metadata } = sampleAsset();
    const envelope = wrapCompanionMetadataAsNativeEnvelope(metadata);
    const recordPath = join(store.assetRecordsRoot, `${metadata.assetId}.json`);
    writeFileSync(recordPath, JSON.stringify(envelope));
    const before = readFileSync(recordPath, "utf8");
    assert.throws(() => store.listAssets(), isUnsupported);
    assert.throws(() => store.readAsset(metadata.assetId), isUnsupported);
    assert.equal(readFileSync(recordPath, "utf8"), before);
  } finally {
    closeStore(store);
  }
});

test("companion does not overwrite an existing Native envelope while publishing", () => {
  const store = new CompanionStore(freshRoot());
  try {
    const { bytes, metadata } = sampleAsset();
    const envelope = wrapCompanionMetadataAsNativeEnvelope({
      ...metadata,
      tags: ["kept-original"],
    });
    const recordPath = join(store.assetRecordsRoot, `${metadata.assetId}.json`);
    writeFileSync(recordPath, JSON.stringify(envelope));
    const before = readFileSync(recordPath, "utf8");
    const staged = store.stageAsset(metadata, bytes);
    assert.throws(
      () => store.publishStagedAsset(staged.stageId),
      isUnsupported,
    );
    assert.equal(readFileSync(recordPath, "utf8"), before);
  } finally {
    closeStore(store);
  }
});

test("future Native envelope versions stay read-only on disk", () => {
  const store = new CompanionStore(freshRoot());
  try {
    const { metadata } = sampleAsset();
    const future = { version: 9, metadata };
    const recordPath = join(store.assetRecordsRoot, `${metadata.assetId}.json`);
    writeFileSync(recordPath, JSON.stringify(future));
    const before = readFileSync(recordPath, "utf8");
    assert.throws(() => store.readAsset(metadata.assetId), isUnsupported);
    assert.equal(readFileSync(recordPath, "utf8"), before);
  } finally {
    closeStore(store);
  }
});
