import assert from "node:assert/strict";
import test from "node:test";
import {
  admitBrowserFormatMarker,
  admitCompanionProtocolVersion,
  admitCompanionRoot,
  admitCrossFormatImport,
  admitNativeRoot,
  admitSnapshotEnvelope,
  detectAssetRecordFamily,
  parseRepositoryIdentity,
  unwrapNativeEnvelope,
  wrapCompanionMetadataAsNativeEnvelope,
  COMPANION_PROTOCOL_VERSION,
  REPOSITORY_IDENTITY_RELATIVE_PATH,
} from "../../packages/creation-contracts/index.ts";

const identity = {
  version: 1 as const,
  repositoryId: "0123456789abcdef0123456789abcdef",
  formatVersion: 2,
  minimumWriterVersion: 2,
};

const bareMetadata = {
  assetId: "asset-aaaaaaaaaaaaaaaaaaaaaaaa",
  sha256: "b".repeat(64),
  mime: "image/png",
  size: 3,
  tags: [] as string[],
};

test("repository identity accepts current Native handshake pairs only", () => {
  assert.deepEqual(parseRepositoryIdentity(identity), {
    ok: true,
    identity,
  });
  assert.deepEqual(
    parseRepositoryIdentity({
      ...identity,
      formatVersion: 1,
      minimumWriterVersion: 1,
    }).ok,
    true,
  );
  const future = parseRepositoryIdentity({
    ...identity,
    formatVersion: 3,
    minimumWriterVersion: 3,
  });
  assert.equal(future.ok, false);
  if (!future.ok) {
    assert.equal(future.code, "SNAPSHOT_UNSUPPORTED");
    assert.equal(future.reason, "format-version-unsupported");
  }
  const version = parseRepositoryIdentity({ ...identity, version: 2 });
  assert.equal(version.ok, false);
  if (!version.ok) assert.equal(version.code, "SNAPSHOT_UNSUPPORTED");
  const extra = parseRepositoryIdentity({ ...identity, extra: true });
  assert.equal(extra.ok, false);
  if (!extra.ok) assert.equal(extra.code, "IO");
});

test("asset record detection distinguishes companion bare metadata from Native envelopes", () => {
  assert.equal(
    detectAssetRecordFamily(bareMetadata).family,
    "companion-bare-metadata",
  );
  assert.equal(
    detectAssetRecordFamily({ assetId: "asset-x" }).family,
    "companion-bare-metadata",
  );
  const envelope = wrapCompanionMetadataAsNativeEnvelope(bareMetadata);
  assert.deepEqual(detectAssetRecordFamily(envelope), {
    family: "native-envelope",
    nativeEnvelopeVersion: 1,
  });
  assert.deepEqual(unwrapNativeEnvelope(envelope), {
    ok: true,
    metadata: bareMetadata,
  });
  const future = detectAssetRecordFamily({
    version: 9,
    metadata: bareMetadata,
  });
  assert.equal(future.family, "unsupported-future");
  assert.equal(future.nativeEnvelopeVersion, 9);
  assert.equal(detectAssetRecordFamily({ foo: 1 }).family, "unknown");
});

test("companion admits a missing identity and refuses any repository.json marker", () => {
  assert.deepEqual(admitCompanionRoot({ identityDocumentPresent: false }), {
    action: "admit",
    family: "companion",
  });
  const refused = admitCompanionRoot({ identityDocumentPresent: true });
  assert.equal(refused.action, "refuse-write");
  if (refused.action === "refuse-write") {
    assert.equal(refused.code, "SNAPSHOT_UNSUPPORTED");
    assert.equal(refused.preserveOriginals, true);
    assert.match(refused.message, /原件已保留/);
  }
  assert.equal(REPOSITORY_IDENTITY_RELATIVE_PATH, "app/repository.json");
});

test("Native admits its own envelope after a supported handshake and refuses companion records", () => {
  const admitted = admitNativeRoot({
    identity,
    sampleAssetRecord: wrapCompanionMetadataAsNativeEnvelope(bareMetadata),
  });
  assert.deepEqual(admitted, { action: "admit", family: "native" });

  const missing = admitNativeRoot({ identity: null });
  assert.equal(missing.action, "refuse-write");
  if (missing.action === "refuse-write") {
    assert.equal(missing.preserveOriginals, true);
    assert.equal(missing.code, "SNAPSHOT_UNSUPPORTED");
  }

  const companion = admitNativeRoot({
    identity,
    sampleAssetRecord: bareMetadata,
  });
  assert.equal(companion.action, "refuse-write");
  if (companion.action === "refuse-write") {
    assert.equal(companion.code, "SNAPSHOT_UNSUPPORTED");
    assert.equal(companion.family, "companion");
    assert.match(companion.message, /请显式导入/);
    assert.equal(companion.preserveOriginals, true);
  }

  const future = admitNativeRoot({
    identity,
    sampleAssetRecord: { version: 4, metadata: bareMetadata },
  });
  assert.equal(future.action, "refuse-write");
  if (future.action === "refuse-write") {
    assert.equal(future.code, "SNAPSHOT_UNSUPPORTED");
    assert.equal(future.preserveOriginals, true);
  }
});

test("snapshot envelope handshake accepts v2/v3 and preserves newer versions", () => {
  assert.deepEqual(admitSnapshotEnvelope({ version: 2, revision: 0 }), {
    ok: true,
    version: 2,
    revision: 0,
  });
  assert.deepEqual(admitSnapshotEnvelope({ version: 3, revision: 4 }), {
    ok: true,
    version: 3,
    revision: 4,
  });
  const future = admitSnapshotEnvelope({ version: 4, revision: 1 });
  assert.deepEqual(future, {
    ok: false,
    code: "SNAPSHOT_UNSUPPORTED",
    reason: "snapshot-version-future",
  });
});

test("browser format marker uses minWriterVersion and matching 1/1 or 2/2 pairs", () => {
  assert.deepEqual(
    admitBrowserFormatMarker({ formatVersion: 2, minWriterVersion: 2 }),
    {
      action: "admit",
      family: "browser",
    },
  );
  const mismatched = admitBrowserFormatMarker({
    formatVersion: 2,
    minWriterVersion: 1,
  });
  assert.equal(mismatched.action, "refuse-write");
  if (mismatched.action === "refuse-write") {
    assert.equal(mismatched.code, "SNAPSHOT_UNSUPPORTED");
    assert.equal(mismatched.preserveOriginals, true);
  }
});

test("companion HTTP protocol version stays at 1", () => {
  assert.deepEqual(admitCompanionProtocolVersion(COMPANION_PROTOCOL_VERSION), {
    action: "admit",
    family: "companion",
  });
  const refused = admitCompanionProtocolVersion(2);
  assert.equal(refused.action, "refuse-write");
  if (refused.action === "refuse-write") {
    assert.equal(refused.preserveOriginals, true);
  }
});

test("cross-format transfer is explicit import only and never deletes the source", () => {
  const allowed = admitCrossFormatImport({
    sourceFamily: "companion",
    targetFamily: "native",
    mode: "explicit-import",
  });
  assert.deepEqual(allowed, {
    allowed: true,
    deleteSource: false,
    preserveOriginals: true,
  });
  assert.equal(
    admitCrossFormatImport({
      sourceFamily: "companion",
      targetFamily: "native",
      mode: "explicit-import",
      deleteSource: true,
    }).allowed,
    false,
  );
  assert.equal(
    admitCrossFormatImport({
      sourceFamily: "companion",
      targetFamily: "native",
      mode: "in-place",
    }).allowed,
    false,
  );
  const unwrapped = unwrapNativeEnvelope(bareMetadata);
  assert.equal(unwrapped.ok, false);
  if (!unwrapped.ok) {
    assert.equal(unwrapped.family, "companion-bare-metadata");
    assert.equal(unwrapped.code, "SNAPSHOT_UNSUPPORTED");
  }
});
