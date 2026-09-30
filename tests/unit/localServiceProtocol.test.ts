import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPANION_PROTOCOL_VERSION,
  assetMetadataSchema,
  backupManifestSchema,
  companionErrorCodeSchema,
  pairRequestSchema,
  snapshotPutSchema,
  isAllowedCompanionOrigin,
  rejectCompanionSecrets,
} from "../../src/features/local-service/protocol.ts";

const sha256 = "a".repeat(64);
const assetId = `asset-${sha256.slice(0, 24)}`;

test("protocol exposes a stable version and rejects unknown error codes", () => {
  assert.equal(COMPANION_PROTOCOL_VERSION, 1);
  assert.equal(companionErrorCodeSchema.parse("CONFLICT"), "CONFLICT");
  assert.throws(() => companionErrorCodeSchema.parse("not-a-code"));
});

test("pairing payload is bounded and strict", () => {
  assert.deepEqual(pairRequestSchema.parse({ code: "pair-code-123" }), {
    code: "pair-code-123",
  });
  assert.throws(() =>
    pairRequestSchema.parse({ code: "pair-code-123", token: "secret" }),
  );
  assert.throws(() => pairRequestSchema.parse({ code: "x" }));
});

test("asset metadata requires content-addressed identity and supported media", () => {
  const metadata = assetMetadataSchema.parse({
    assetId,
    sha256,
    mime: "image/png",
    size: 3,
    tags: ["AI生成"],
  });
  assert.equal(metadata.assetId, assetId);
  assert.throws(() =>
    assetMetadataSchema.parse({ ...metadata, assetId: "asset-bad" }),
  );
  assert.throws(() =>
    assetMetadataSchema.parse({ ...metadata, mime: "application/javascript" }),
  );
  assert.throws(() =>
    assetMetadataSchema.parse({ ...metadata, sha256: "b".repeat(64) }),
  );
  assert.throws(() =>
    assetMetadataSchema.parse({ ...metadata, size: 100 * 1024 * 1024 + 1 }),
  );
});

test("snapshot writes require a version two snapshot and expected revision", () => {
  const snapshot = {
    version: 2,
    revision: 4,
    activeProjectId: null,
    projects: [],
    homeDraft: {},
  };
  assert.equal(
    snapshotPutSchema.parse({ expectedRevision: 3, snapshot }).expectedRevision,
    3,
  );
  assert.equal(
    snapshotPutSchema.parse({ expectedRevision: null, snapshot })
      .expectedRevision,
    null,
  );
  assert.throws(() =>
    snapshotPutSchema.parse({ expectedRevision: -1, snapshot }),
  );
  assert.throws(() =>
    snapshotPutSchema.parse({
      expectedRevision: 3,
      snapshot: { ...snapshot, version: 1 },
    }),
  );
});

test("origins are exact allowlist matches", () => {
  const allowed = ["http://127.0.0.1:1421", "http://127.0.0.1:1423"];
  assert.equal(isAllowedCompanionOrigin(allowed[0], allowed), true);
  assert.equal(
    isAllowedCompanionOrigin("http://localhost:1421", allowed),
    false,
  );
  assert.equal(isAllowedCompanionOrigin(undefined, allowed), false);
  assert.equal(
    isAllowedCompanionOrigin("http://127.0.0.1:1421/", allowed),
    false,
  );
});

test("secret-like fields are rejected before persistence", () => {
  assert.doesNotThrow(() => rejectCompanionSecrets({ tags: ["safe"] }));
  assert.doesNotThrow(() =>
    rejectCompanionSecrets({
      providerCredentialRef: "credential-ref",
      chatSessions: [],
    }),
  );
  assert.throws(() => rejectCompanionSecrets({ apiKey: "sk-secret" }));
  assert.throws(() => rejectCompanionSecrets({ nested: { token: "secret" } }));
  assert.throws(() =>
    rejectCompanionSecrets({ provenance: { providerSecret: "x" } }),
  );
  assert.throws(() =>
    assetMetadataSchema.parse({
      assetId,
      sha256,
      mime: "image/png",
      size: 3,
      provenance: { providerSecret: "x" },
    }),
  );
});

test("backup manifests are strict and content-addressed", () => {
  const value = backupManifestSchema.parse({
    protocolVersion: COMPANION_PROTOCOL_VERSION,
    snapshotRevision: 4,
    createdAt: "2026-09-29T00:00:00.000Z",
    files: [
      { path: "projects/creation-v2.json", sha256, size: 20 },
      { path: `assets/blobs/${sha256}`, sha256, size: 3 },
    ],
    manifestSha256: sha256,
  });
  assert.equal(value.files.length, 2);
  assert.throws(() =>
    backupManifestSchema.parse({
      ...value,
      files: [{ ...value.files[0], path: "../secrets" }],
    }),
  );
});
